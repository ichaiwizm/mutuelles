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

// Résolution d'alias
export const aliasResolve = (domain, wanted) => {
  const aliases = {
    regimeSocial: {
      'general': ['Régime général', 'GENERAL', 'RG'],
      'alsace-moselle': ['Alsace-Moselle', 'ALSACE_MOSELLE', 'AM'],
      'agricole': ['MSA', 'Mutualité Sociale Agricole', 'AGRICOLE'],
      'tns': ['TNS', 'Travailleur non salarié', 'INDEPENDANT'],
      'autre': ['Autre', 'AUTRE']
    },
    statut: {
      'actif': ['Actif', 'ACTIF', 'Salarié'],
      'sans-emploi': ['Sans emploi', 'SANS_EMPLOI', 'Chômeur'],
      'retraite': ['Retraité', 'RETRAITE'],
      'etudiant': ['Étudiant', 'ETUDIANT'],
      'autre': ['Autre', 'AUTRE']
    }
  };
  
  const domainAliases = aliases[domain] || {};
  const wantedNorm = norm(wanted);
  
  for (const [key, vals] of Object.entries(domainAliases)) {
    if (vals.some(v => norm(v) === wantedNorm)) {
      return vals[0]; // Retourner la valeur canonique
    }
  }
  
  return wanted; // Pas d'alias trouvé
};

// Saisie avec masque
export const typeMasked = async (el, text) => {
  if (!el || !text) return;
  
  el.focus();
  el.value = '';
  
  for (const char of text) {
    el.value += char;
    fire(el, 'input');
    await new Promise(r => setTimeout(r, 30));
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