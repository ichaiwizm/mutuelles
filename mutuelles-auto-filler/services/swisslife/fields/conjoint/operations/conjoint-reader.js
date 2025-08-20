/**
 * Lecteur de conjoint - Lecture des valeurs actuelles
 * Responsable de lire les valeurs actuelles du formulaire conjoint
 */

import { readSelect } from '../../../utils/form-utils.js';
import { 
  findDateElement, 
  findRegimeSelect, 
  findStatutSelect, 
  findProfessionSelect,
  hasEssentialElements
} from '../core/conjoint-detector.js';

/**
 * Lit toutes les informations conjoint actuelles
 */
export function readAllConjointValues() {
  return {
    dateNaissance: findDateElement()?.value || "",
    regimeSocial: readSelect(findRegimeSelect()),
    statut: readSelect(findStatutSelect()),
    profession: readSelect(findProfessionSelect())
  };
}

/**
 * Vérifie si les éléments conjoint sont prêts
 */
export function checkConjointReadiness() {
  return hasEssentialElements();
}