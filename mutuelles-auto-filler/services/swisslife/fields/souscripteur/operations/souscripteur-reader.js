/**
 * Lecteur de souscripteur - Lecture des valeurs actuelles
 * Responsable de lire les valeurs actuelles du formulaire souscripteur
 */

import { isVisible } from '../../../utils/dom-utils.js';
import { readSelect } from '../../../utils/form-utils.js';
import { 
  findDateElement,
  findRegimeSelect,
  findStatutSelect,
  findProfessionSelect,
  findDepartementSelect,
  hasEssentialElements
} from '../core/souscripteur-detector.js';

/**
 * Scan un élément pour diagnostic
 */
function scanOneElement(key, el) {
  if (!el) return { found: false };
  
  const visible = isVisible(el);
  const disabled = el.disabled || el.readOnly;
  
  if (el.tagName === 'SELECT') {
    const selected = readSelect(el);
    return { found: true, visible, disabled, value: selected?.text, rawValue: selected?.value };
  }
  
  return { found: true, visible, disabled, value: el.value || "" };
}

/**
 * Lit toutes les informations souscripteur actuelles
 */
export function readAllSouscripteurValues() {
  return {
    dateNaissance: scanOneElement('dateNaissance', findDateElement()),
    regimeSocial: scanOneElement('regimeSocial', findRegimeSelect()),
    statut: scanOneElement('statut', findStatutSelect()),
    profession: scanOneElement('profession', findProfessionSelect()),
    departement: scanOneElement('departement', findDepartementSelect())
  };
}

/**
 * Vérifie si les éléments souscripteur sont prêts
 */
export function checkSouscripteurReadiness() {
  return hasEssentialElements();
}