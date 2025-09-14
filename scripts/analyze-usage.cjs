#!/usr/bin/env node
/*
  Analyse précise des fichiers réellement utilisés.
  - Front (platform/lead-extractor): s'appuie sur les sourcemaps du build Vite.
  - Server: utilise madge pour lister les orphelins depuis server/index.js.
  - Extension (mutuelles-auto-filler): construit un graphe en suivant importScripts, import statiques et import(getURL('...')).
*/

const fs = require('fs');
const path = require('path');

function listFiles(dir, extSet) {
  const out = [];
  (function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      if (ent.name === '.git' || ent.name === 'node_modules' || ent.name === 'dist') continue;
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p);
      else {
        if (!extSet || extSet.has(path.extname(ent.name))) out.push(p);
      }
    }
  })(dir);
  return out;
}

function uniq(arr) { return [...new Set(arr)]; }

function normalize(p) { return p.split(path.sep).join('/'); }

// FRONT — derive used sources from sourcemaps
function analyzeFront(frontRoot) {
  const dist = path.join(frontRoot, 'dist');
  const srcRoot = path.join(frontRoot, 'src');
  const allSrc = listFiles(srcRoot, new Set(['.ts', '.tsx', '.js', '.css']));
  const used = new Set();
  if (!fs.existsSync(dist)) {
    return { used: [], unused: allSrc };
  }
  const mapFiles = listFiles(dist, new Set(['.map']));
  for (const mf of mapFiles) {
    try {
      const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
      const sources = m.sources || [];
      for (let s of sources) {
        if (!s) continue;
        // normalize paths such as ../../src/..., /@fs/..., or absolute file URLs
        s = s.replace(/^\/[A-Za-z]:/, ''); // strip windows drive in source map if any
        const srcIdx = s.lastIndexOf('/src/');
        if (srcIdx !== -1) {
          const rel = s.slice(srcIdx + 5); // after '/src/'
          const real = path.join(srcRoot, rel);
          if (fs.existsSync(real)) used.add(path.resolve(real));
        }
      }
    } catch (e) {}
  }
  const unused = allSrc.filter(f => !used.has(path.resolve(f)) && !f.endsWith('.css'));
  return { used: [...used], unused };
}

// EXTENSION — follow importScripts, static imports, and import(getURL('...'))
function analyzeExtension(extRoot) {
  const seedFiles = [
    path.join(extRoot, 'background.js'),
    path.join(extRoot, 'content.js'),
  ].filter(fs.existsSync);

  const queue = [...seedFiles];
  const visited = new Set(seedFiles.map(p => path.resolve(p)));
  const jsExts = new Set(['.js']);

  function addIfExists(p) {
    if (!p) return;
    const full = path.resolve(p);
    if (fs.existsSync(full) && !visited.has(full)) {
      visited.add(full);
      queue.push(full);
    }
  }

  function resolveFrom(base, spec) {
    if (!spec) return null;
    if (spec.startsWith('chrome://') || spec.startsWith('http')) return null;
    // spec like 'src/...' or './...' or '../...'
    const candidates = [];
    if (spec.startsWith('./') || spec.startsWith('../')) {
      candidates.push(path.resolve(path.dirname(base), spec));
    } else {
      candidates.push(path.join(extRoot, spec));
    }
    for (let c of candidates) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
      for (const ext of ['.js']) {
        if (fs.existsSync(c + ext)) return c + ext;
      }
    }
    return null;
  }

  // Supporte les imports multilignes: import { ...\n... } from 'x'
  const importStaticRe = /(?:^|\n)\s*import[\s\S]*?from\s+['"]([^'"\n]+)['"];?/g;
  const exportFromRe = /(?:^|\n)\s*export[\s\S]*?from\s+['"]([^'"\n]+)['"];?/g;
  const importGetURLRe = /import\(\s*chrome\.runtime\.getURL\(['"]([^'"\n]+)['"]\)\s*\)/g;
  const importScriptsRe = /importScripts\(([^\)]*)\)/g; // parse args separately
  const stringLitRe = /['"]([^'"]+)['"]/g;

  while (queue.length) {
    const f = queue.shift();
    let src = '';
    try { src = fs.readFileSync(f, 'utf8'); } catch {}

    // importScripts('a','b',...)
    let m;
    while ((m = importScriptsRe.exec(src))) {
      const args = m[1] || '';
      let s;
      while ((s = stringLitRe.exec(args))) {
        const spec = s[1];
        const resolved = resolveFrom(f, spec);
        addIfExists(resolved);
      }
    }

    // static imports
    for (const re of [importStaticRe, exportFromRe]) {
      re.lastIndex = 0;
      let mm;
      while ((mm = re.exec(src))) {
        const spec = mm[1];
        const resolved = resolveFrom(f, spec);
        addIfExists(resolved);
      }
    }

    // dynamic import(chrome.runtime.getURL('...'))
    importGetURLRe.lastIndex = 0;
    let md;
    while ((md = importGetURLRe.exec(src))) {
      const spec = md[1];
      const resolved = resolveFrom(f, spec);
      addIfExists(resolved);
    }
  }

  const allJs = listFiles(extRoot, jsExts);
  // Mark JSON resources used (simple heuristic)
  const allJson = listFiles(extRoot, new Set(['.json']));
  const usedJson = new Set();
  for (const v of visited) {
    const s = fs.readFileSync(v, 'utf8');
    const re = /chrome\.runtime\.getURL\(['"]([^'"]+\.json)['"]\)/g;
    let m; while ((m = re.exec(s))) {
      const p = path.join(extRoot, m[1]);
      if (fs.existsSync(p)) usedJson.add(path.resolve(p));
    }
  }

  const used = new Set([...visited, ...usedJson]);
  const unused = [...allJs, ...allJson].filter(f => !used.has(path.resolve(f)));
  return { used: [...used], unused };
}

function rel(p) { return normalize(path.relative(process.cwd(), p)); }

function main() {
  const frontRoot = path.join('platform', 'lead-extractor');
  const serverRoot = path.join('server');
  const extRoot = path.join('mutuelles-auto-filler');

  const out = {};

  if (fs.existsSync(frontRoot)) {
    out.front = analyzeFront(frontRoot);
    out.front.used = out.front.used.map(rel);
    out.front.unused = out.front.unused.map(rel);
  }

  if (fs.existsSync(extRoot)) {
    out.extension = analyzeExtension(extRoot);
    out.extension.used = out.extension.used.map(rel);
    out.extension.unused = out.extension.unused.map(rel);
  }

  console.log(JSON.stringify(out, null, 2));
}

main();
