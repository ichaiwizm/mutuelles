/**
 * Utilitaires de formulaire pour SwissLife
 * Fonctions pour manipulation des champs de formulaire
 */

import { q, qa, fire, fireMultiple } from './dom-utils.js';

// Normalisation de texte
export const T = s => (s||"").toString().replace(/\s+/g," ").trim();

export const norm = (v) => {
  const s = String(v||"").toLowerCase().trim();
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[''`]/g,"'")
    .replace(/œ/g,"oe").replace(/æ/g,"ae")
    .replace(/\s+/g," ");
};

// Recherche par libellé
export const findByLabelLike = (re) => {
  const candidates = qa("label, legend, h1, h2, h3, .label, [role='label']");
  for (const lab of candidates) {
    const txt = T(lab.innerText || "");
    if (re.test(txt)) {
      const inp = lab.querySelector("input, select, textarea") || 
                  lab.nextElementSibling?.querySelector?.("input, select, textarea");
      if (inp) return inp;
    }
  }
  return null;
};

// Recherche de zone par libellé
export const findZoneByLabel = (labelRegex) => {
  const nodes = qa("label, legend, h1, h2, h3, .label, [role='label'], .form-group, .row, .col, section, fieldset, .panel, .card, div, span");
  let best = null, bestScore = 1e9;
  
  for (const n of nodes) {
    const txt = T(n.innerText || "");
    if (!txt || !labelRegex.test(txt)) continue;
    const score = (n.matches("label,legend,h1,h2,h3") ? 0 : 3) + (txt.length > 120 ? 2 : 0);
    if (score < bestScore) { 
      best = n; 
      bestScore = score; 
    }
  }
  return best;
};

// Lecture de select
export const readSelect = (sel) => {
  if (!sel) return null;
  const opt = sel.options[sel.selectedIndex];
  return opt ? { value: opt.value, text: T(opt.text) } : null;
};

// Définir valeur de select
export const setSelectByValueOrText = (sel, wanted, synonyms = []) => {
  if (!sel || !wanted) return false;
  
  const wantNorm = norm(wanted);
  const allVariants = [wantNorm, ...synonyms.map(s => norm(s))];
  
  // Essayer par valeur exacte
  for (let i = 0; i < sel.options.length; i++) {
    if (sel.options[i].value === wanted) {
      sel.selectedIndex = i;
      fireMultiple(sel);
      return true;
    }
  }
  
  // Essayer par texte normalisé
  for (let i = 0; i < sel.options.length; i++) {
    const optNorm = norm(sel.options[i].text);
    if (allVariants.some(v => optNorm.includes(v) || v.includes(optNorm))) {
      sel.selectedIndex = i;
      fireMultiple(sel);
      return true;
    }
  }
  
  return false;
};

// Cache pour les mappings chargés
let mappingsCache = null;

// Charge les mappings depuis le fichier JSON centralisé
async function loadMappings() {
  if (mappingsCache) {
    return mappingsCache;
  }
  
  try {
    const response = await fetch(chrome.runtime.getURL('data/swisslife-mappings.json'));
    mappingsCache = await response.json();
    return mappingsCache;
  } catch (error) {
    console.error('❌ Erreur chargement mappings SwissLife:', error);
    // Fallback: mappings vides
    return { regimeSocial: {}, statut: {}, profession: {} };
  }
}

// Résolution d'alias - VERSION CENTRALISÉE
export const aliasResolve = async (domain, wanted) => {
  const mappings = await loadMappings();
  const domainMappings = mappings[domain] || {};
  const wantedNorm = norm(wanted);
  
  // 1. Chercher dans les alias directs
  const aliases = domainMappings._aliases || {};
  if (aliases[wanted]) {
    return aliases[wanted];
  }
  
  // 2. Chercher dans les valeurs des mappings principaux
  for (const [key, vals] of Object.entries(domainMappings)) {
    if (key.startsWith('_')) continue; // Ignorer les métadonnées
    
    if (Array.isArray(vals)) {
      if (vals.some(v => norm(v) === wantedNorm)) {
        return key; // Retourner le code SwissLife exact
      }
    }
  }
  
  return wanted; // Pas d'alias trouvé
};

// Version synchrone pour compatibilité (avec mappings en dur comme fallback)
export const aliasResolveSync = (domain, wanted) => {
  // Mappings minimaux en dur pour compatibilité
  const fallbackMappings = {
    regimeSocial: {
      'TNS': 'TNS',
      'SECURITE_SOCIALE': 'SECURITE_SOCIALE',
      'general': 'SECURITE_SOCIALE',
      'tns': 'TNS'
    },
    statut: {
      'SALARIE': 'SALARIE', 
      'TNS': 'TNS',
      'actif': 'SALARIE',
      'retraite': 'RETRAITE'
    },
    profession: {
      'AUTRE': 'AUTRE'
    }
  };
  
  const domainMappings = fallbackMappings[domain] || {};
  return domainMappings[wanted] || wanted;
};

// Saisie avec masque
export const typeMasked = async (el, text) => {
  if (!el || !text) return;
  
  el.focus();
  el.value = '';
  
  for (const char of text) {
    el.value += char;
    fire(el, 'input');
    try { if (!self.BG || !self.BG.wait) await import(chrome.runtime.getURL('src/shared/async.js')); } catch (_) {}
    await (self.BG && self.BG.wait ? self.BG.wait(30) : new Promise(r => setTimeout(r, 30)));
  }
  
  fireMultiple(el);
};

// Trouver le premier élément existant
export const findFirstExisting = (selectors) => {
  if (!Array.isArray(selectors)) return null;
  for (const sel of selectors) {
    const el = q(sel);
    if (el) return el;
  }
  return null;
};
