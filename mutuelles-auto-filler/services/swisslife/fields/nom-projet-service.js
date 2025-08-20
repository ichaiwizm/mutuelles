/**
 * Service de gestion du nom du projet
 * Gère le champ "Nom du projet" dans le formulaire SwissLife
 */

import { q, qa, isVisible, fireMultiple } from '../utils/dom-utils.js';
import { T, findZoneByLabel } from '../utils/form-utils.js';
import { success, error, ERROR_CODES } from '../utils/response-format.js';

/**
 * Trouve le champ de nom du projet
 */
function findNomProjetInput() {
  // 1) ID connu
  const direct = q("#nom-projet");
  if (direct) return direct;

  // 2) Chercher une carte/section contenant "Votre nom de projet"
  const card = qa("section, fieldset, .panel, .card, .box, .bloc, div")
    .find(n => /votre\s+nom\s+de\s+projet/i.test(T(n.innerText || "")));
  if (card) {
    const inp = card.querySelector("input[type='text']") || card.querySelector("input");
    if (inp) return inp;
  }

  // 3) Libellé générique
  const zone = findZoneByLabel(/nom.*projet/i);
  if (zone) {
    const inp = zone.querySelector("input[type='text']") || zone.querySelector("input");
    if (inp) return inp;
    const sibling = zone.nextElementSibling?.querySelector?.("input, textarea");
    if (sibling) return sibling;
  }

  // 4) Fallback : premier input texte visible
  const fallback = qa("input[type='text']").find(el => isVisible(el));
  return fallback || null;
}

/**
 * Définit le nom du projet
 */
export function setNomProjet(value) {
  const el = findNomProjetInput();
  
  if (!el) {
    return error(ERROR_CODES.NOT_FOUND, "Champ nom du projet non trouvé");
  }
  
  if (!isVisible(el)) {
    return error(ERROR_CODES.HIDDEN, "Champ nom du projet masqué");
  }
  
  if (el.disabled || el.readOnly) {
    return error(ERROR_CODES.DISABLED, "Champ nom du projet désactivé ou en lecture seule");
  }

  try {
    el.focus();
    el.value = value;
    fireMultiple(el);
    return success({ value: el.value });
  } catch (e) {
    return error('EXCEPTION', `Erreur lors de la saisie: ${e.message}`);
  }
}

/**
 * Lit le nom du projet
 */
export function readNomProjet() {
  const el = findNomProjetInput();
  if (!el) {
    return error(ERROR_CODES.NOT_FOUND, "Champ nom du projet non trouvé");
  }
  return success(el.value ?? "");
}

/**
 * Vérifie le nom du projet
 */
export function checkNomProjet(expected) {
  const readResult = readNomProjet();
  if (!readResult.ok) {
    return readResult;
  }
  
  const got = readResult.data;
  const ok = T(got) === T(expected);
  
  if (ok) {
    return success({ field: "projet.nom", current: got, expected });
  } else {
    return error(ERROR_CODES.VALUE_MISMATCH, `Valeur attendue: "${expected}", trouvée: "${got}"`);
  }
}

/**
 * Diagnostique le nom du projet
 */
export function diagnoseNomProjet(expected) {
  const el = findNomProjetInput();
  const got = el ? (el.value ?? "") : null;

  const diagnosis = {
    field: "projet.nom",
    element: {
      found: !!el,
      visible: el ? isVisible(el) : false,
      disabled: el ? (el.disabled || el.readOnly) : false
    },
    value: {
      current: got,
      expected,
      matches: got !== null && T(got) === T(expected)
    }
  };

  if (!el) {
    return error(ERROR_CODES.NOT_FOUND, "Champ introuvable");
  }
  
  if (!isVisible(el)) {
    return error(ERROR_CODES.HIDDEN, "Champ présent mais masqué");
  }
  
  if (el.disabled || el.readOnly) {
    return error(ERROR_CODES.DISABLED, "Champ désactivé ou en lecture seule");
  }
  
  if (T(got) !== T(expected)) {
    return error(ERROR_CODES.VALUE_MISMATCH, "Valeur différente de celle attendue");
  }
  
  return success(diagnosis);
}

// Export de l'API complète
export default {
  set: setNomProjet,
  read: readNomProjet,
  check: checkNomProjet,
  diagnose: diagnoseNomProjet
};