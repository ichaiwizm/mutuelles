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

// Résolution d'alias - MISE À JOUR pour les nouveaux codes SwissLife
export const aliasResolve = (domain, wanted) => {
  const aliases = {
    regimeSocial: {
      // Nouveaux codes SwissLife exacts
      'SECURITE_SOCIALE': ['SECURITE_SOCIALE', 'Régime Général (CPAM)'],
      'SECURITE_SOCIALE_ALSACE_MOSELLE': ['SECURITE_SOCIALE_ALSACE_MOSELLE', 'Régime Local (CPAM Alsace Moselle)'],
      'TNS': ['TNS', 'Régime Général pour TNS (CPAM)'],
      'AMEXA': ['AMEXA', 'Mutualité Sociale Agricole (MSA-Amexa)'],
      'AUTRES_REGIME_SPECIAUX': ['AUTRES_REGIME_SPECIAUX', 'Autres régimes spéciaux'],
      
      // Anciens alias pour compatibilité
      'general': ['SECURITE_SOCIALE'],
      'alsace-moselle': ['SECURITE_SOCIALE_ALSACE_MOSELLE'],
      'agricole': ['AMEXA'],
      'tns': ['TNS'],
      'autre': ['AUTRES_REGIME_SPECIAUX']
    },
    statut: {
      // Nouveaux codes SwissLife exacts
      'SALARIE': ['SALARIE', 'Salarié et autres statuts'],
      'SALARIE_AGRICOLE': ['SALARIE_AGRICOLE', 'Salarié agricole et autres statuts'],
      'EXPLOITANT_AGRICOLE': ['EXPLOITANT_AGRICOLE', 'Exploitant agricole'],
      'TNS': ['TNS', 'Travailleur Non Salarié'],
      'ETUDIANT': ['ETUDIANT', 'Etudiant'],
      'RETRAITE': ['RETRAITE', 'Retraité'],
      'RETRAITE_ANCIEN_SALARIE': ['RETRAITE_ANCIEN_SALARIE', 'Retraité (ancien salarié)'],
      'RETRAITE_ANCIEN_EXPLOITANT': ['RETRAITE_ANCIEN_EXPLOITANT', 'Retraité (ancien exploitant)'],
      'TRAVAILLEUR_TRANSFRONTALIER': ['TRAVAILLEUR_TRANSFRONTALIER', 'Travailleur transfrontalier'],
      'FONCTIONNAIRE': ['FONCTIONNAIRE', 'Fonctionnaire'],
      
      // Anciens alias pour compatibilité
      'actif': ['SALARIE'],
      'sans-emploi': ['SALARIE'],
      'retraite': ['RETRAITE'],
      'etudiant': ['ETUDIANT'],
      'autre': ['SALARIE']
    },
    profession: {
      // Nouveaux codes SwissLife exacts
      'MEDECIN': ['MEDECIN', 'Médecin'],
      'CHIRURGIEN': ['CHIRURGIEN', 'Chirurgien'],
      'CHIRURGIEN_DENTISTE': ['CHIRURGIEN_DENTISTE', 'Chirurgien dentiste'],
      'PHARMACIEN': ['PHARMACIEN', 'Pharmacien'],
      'AUXILIAIRE_MEDICAL': ['AUXILIAIRE_MEDICAL', 'Auxiliaire médical'],
      'AUTRE': ['AUTRE', 'Non médicale']
    }
  };
  
  const domainAliases = aliases[domain] || {};
  const wantedNorm = norm(wanted);
  
  for (const [key, vals] of Object.entries(domainAliases)) {
    if (vals.some(v => norm(v) === wantedNorm)) {
      return key; // Retourner le code SwissLife exact
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