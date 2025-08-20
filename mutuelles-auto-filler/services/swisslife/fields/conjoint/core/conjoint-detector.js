/**
 * Détecteur de conjoint - Navigation onglet et détection éléments DOM
 * Responsable de trouver l'onglet conjoint et les éléments du formulaire
 */

import { q, isVisible, bringIntoView, clickHuman } from '../../../utils/dom-utils.js';
import { wait, waitStable } from '../../../utils/async-utils.js';

/**
 * Trouve l'onglet conjoint
 */
export function findConjointTab() {
  const selectors = [
    '#tab-conjoint', '#nav-conjoint', '[href*="conjoint"]',
    '[role="tab"][aria-controls*="conjoint"]'
  ];
  
  for (const sel of selectors) {
    const tab = q(sel);
    if (tab && isVisible(tab)) return tab;
  }
  
  return null;
}

/**
 * Ouvre l'onglet conjoint
 */
export async function openConjointTab() {
  const tab = findConjointTab();
  if (!tab) return { ok: false, reason: 'tab_not_found' };
  
  if (tab.classList.contains('active') || tab.getAttribute('aria-selected') === 'true') {
    return { ok: true, already: true };
  }
  
  bringIntoView(tab);
  await wait(100);
  
  clickHuman(tab);
  await waitStable();
  
  return { ok: true, opened: true };
}

/**
 * Trouve l'élément date de naissance conjoint
 */
export function findDateElement() {
  return q('#date-naissance-assure-conjoint') || 
         q('[name="conjoint.dateNaissance"]') || 
         q('input[id*="conjoint"][id*="naiss"]');
}

/**
 * Trouve le sélecteur régime social conjoint
 */
export function findRegimeSelect() {
  return q('#regime-social-assure-conjoint') || 
         q('[name="conjoint.regimeSocial"]') || 
         q('select[id*="conjoint"][id*="regime"]');
}

/**
 * Trouve le sélecteur statut conjoint
 */
export function findStatutSelect() {
  return q('#statut-assure-conjoint') || 
         q('[name="conjoint.statut"]') || 
         q('select[id*="conjoint"][id*="statut"]');
}

/**
 * Trouve le sélecteur profession conjoint
 */
export function findProfessionSelect() {
  return q('#profession-assure-conjoint') || 
         q('[name="conjoint.profession"]') || 
         q('select[id*="conjoint"][id*="profes"]');
}

/**
 * Vérifie si tous les éléments essentiels sont présents
 */
export function hasEssentialElements() {
  const elements = {
    date: findDateElement(),
    regime: findRegimeSelect(),
    statut: findStatutSelect()
  };
  
  const missing = Object.entries(elements)
    .filter(([_, el]) => !el)
    .map(([key]) => key);
  
  const hidden = Object.entries(elements)
    .filter(([_, el]) => el && !isVisible(el))
    .map(([key]) => key);
  
  return { 
    ready: missing.length === 0 && hidden.length === 0,
    missing,
    hidden,
    elements
  };
}