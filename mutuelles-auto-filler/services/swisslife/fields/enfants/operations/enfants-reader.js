/**
 * Lecteur d'enfants - Opérations de lecture des données enfants
 * Responsable de lire les valeurs actuelles des champs enfants
 */

import { readSelect } from '../../../utils/form-utils.js';
import { visibleChildPairs, looseChildPairs } from '../core/enfants-mapper.js';
import { getChildDateEl, getChildAyantSel } from '../core/enfants-detector.js';

/**
 * Lit les enfants visibles dans l'interface
 */
export function readChildrenVisible() {
  return visibleChildPairs().map(pair => ({
    dateNaissance: pair.date?.value || "",
    ayantDroit: readSelect(pair.ayant)?.value || ""
  }));
}

/**
 * Lit les enfants en mode loose (par index)
 */
export function readChildrenLoose(n) {
  return looseChildPairs(n).map(pair => ({
    dateNaissance: pair.date?.value || "",
    ayantDroit: readSelect(pair.ayant)?.value || ""
  }));
}

/**
 * Lit les données d'un enfant spécifique par index
 */
export function readChildByIndex(index) {
  const dateEl = getChildDateEl(index);
  const ayantSel = getChildAyantSel(index);
  
  return {
    index,
    dateNaissance: dateEl?.value || "",
    ayantDroit: readSelect(ayantSel)?.value || "",
    elements: {
      dateEl,
      ayantSel
    }
  };
}

/**
 * Lit toutes les données enfants selon le mode spécifié
 */
export function readChildren(cfg) {
  const mode = cfg.MODE || 'visible';
  const nbEnfants = cfg.nbEnfants || cfg.enfants?.length || 0;
  
  if (mode === 'visible') {
    return readChildrenVisible();
  } else {
    return readChildrenLoose(nbEnfants);
  }
}

/**
 * Compte le nombre d'enfants actuellement visibles
 */
export function countVisibleChildren() {
  return visibleChildPairs().length;
}

/**
 * Vérifie si des champs enfants sont présents
 */
export function hasChildrenFields() {
  return visibleChildPairs().length > 0 || 
         looseChildPairs(5).some(pair => pair.date || pair.ayant);
}