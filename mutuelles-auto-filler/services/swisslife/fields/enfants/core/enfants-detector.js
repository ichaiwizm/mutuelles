/**
 * Détecteur d'enfants - Logique de détection des éléments enfants
 * Responsable de trouver les sélecteurs, détecter les simulations couple, etc.
 */

import { q, qa, isVisible } from '../../../utils/dom-utils.js';

/**
 * Détecte si c'est une simulation couple
 */
export function isCoupleSim() {
  // Chercher des indices dans l'interface que c'est une simulation couple
  
  // 1. Radio bouton "couple" sélectionné
  const coupleRadio = q('input[type="radio"][value*="couple"]:checked');
  if (coupleRadio) return true;
  
  // 2. Présence de champs conjoint visibles
  const conjointFields = qa('[id*="conjoint"], [name*="conjoint"], [id*="spouse"], [name*="spouse"]');
  const visibleConjointFields = conjointFields.filter(isVisible);
  if (visibleConjointFields.length > 0) return true;
  
  // 3. Select type simulation avec "couple" sélectionné
  const simTypeSelect = q('#type-simulation, [name*="simulation"], [name*="type"]');
  if (simTypeSelect && simTypeSelect.value.toLowerCase().includes('couple')) return true;
  
  // 4. Présence de texte "conjoint" dans les labels ou sections visibles
  const labels = qa('label, h1, h2, h3, .section-title, .form-group');
  const hasConjointText = labels.some(el => {
    const text = (el.textContent || '').toLowerCase();
    return text.includes('conjoint') && isVisible(el);
  });
  
  return hasConjointText;
}

/**
 * Trouve le select du nombre d'enfants
 */
export function findNbEnfantsSelect() {
  // Priorité aux sélecteurs connus de SwissLife
  const candidates = [
    '#sante-nombre-enfant-assures',
    '#nb-enfant-moins-20-ans',
    '#nb-enfants',
    '[name="nbEnfants"]',
    '[name="contratSante.nbEnfants"]',
    'select[id*="enfant"][id*="nombre"]'
  ];
  
  for (const selector of candidates) {
    const el = q(selector);
    if (el) return el;
  }
  
  // Fallback : chercher un select avec options 0..N
  return qa('select').find(sel => {
    const opts = [...sel.options];
    // Vérifier si c'est un select avec des nombres (0, 1, 2, 3...)
    const hasNumbers = opts.filter(o => /^[0-9]+$/.test((o.value || o.text || '').trim())).length >= 3;
    // Ou avec "X enfant(s)"
    const hasEnfants = opts.some(o => /\d+\s*enfant/i.test(o.text || ''));
    return hasNumbers || hasEnfants;
  });
}

/**
 * Expand les sections enfants si nécessaire
 */
export function expandChildrenSections() {
  const sectionTitles = [/enfant/i, /ayants?\s*droit/i];
  const toggles = qa('button, a, .panel-heading, .card-header, [role="button"]')
    .filter(n => sectionTitles.some(rx => rx.test((n.innerText || n.textContent || '').trim())));
  
  toggles.forEach(n => {
    try { n.click(); } catch (e) { /* ignore errors */ }
  });
}

/**
 * Trouve les boutons d'ajout d'enfant
 */
export function findAddChildButtons() {
  return qa('button, a[role="button"], a, input[type="button"], input[type="submit"]')
    .filter(el => /ajouter.*enfant/i.test((el.innerText || el.value || '').trim()));
}

/**
 * Obtient l'élément date pour l'enfant i
 */
export function getChildDateEl(i) {
  // Sélecteurs SwissLife spécifiques
  return q(`#contrat-enfants-${i}-date-naissance`) ||
         q(`[name="contrat.enfants[${i}].dateNaissance"]`) ||
         q(`[name="contratSante.enfants[${i}].dateNaissance"]`) ||
         q(`#date-naissance-enfant-${i}`) ||
         q(`[name="enfant${i}.dateNaissance"]`) ||
         q(`[name="enfants[${i}].dateNaissance"]`) ||
         q(`input[id*="enfant"][id*="${i}"][id*="naiss"]`) ||
         qa('input[id*="date"][id*="enfant"]')[i];
}

/**
 * Obtient le select ayant droit pour l'enfant i
 */
export function getChildAyantSel(i) {
  // Sélecteurs SwissLife spécifiques
  return q(`#enfants-${i}-idAyantDroit`) ||
         q(`[name="contrat.enfants[${i}].idAyantDroit"]`) ||
         q(`[name="contratSante.enfants[${i}].idAyantDroit"]`) ||
         q(`#ayant-droit-enfant-${i}`) ||
         q(`[name="enfant${i}.ayantDroit"]`) ||
         q(`[name="enfants[${i}].ayantDroit"]`) ||
         q(`select[id*="ayant"][id*="${i}"]`) ||
         qa('select[id*="ayant"][id*="enfant"]')[i];
}