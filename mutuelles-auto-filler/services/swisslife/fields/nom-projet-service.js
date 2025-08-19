/**
 * Service de gestion du nom du projet
 * Gère le champ "Nom du projet" dans le formulaire SwissLife
 */

import { q, qa, isVisible, fireMultiple } from '../utils/dom-utils.js';
import { T, findZoneByLabel } from '../utils/form-utils.js';

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
    return { 
      ok: false, 
      reason: "element_not_found", 
      hint: "Vérifie que tu es dans le bon frame et que la section 'Nom du projet' est visible." 
    };
  }
  
  if (!isVisible(el)) {
    return { 
      ok: false, 
      reason: "hidden", 
      hint: "Déplie/affiche la section contenant 'Nom du projet'." 
    };
  }
  
  if (el.disabled || el.readOnly) {
    return { 
      ok: false, 
      reason: "disabled_or_readonly", 
      hint: "Le champ semble verrouillé. Renseigne le reste puis réessaie." 
    };
  }

  try {
    el.focus();
    el.value = value;
    fireMultiple(el);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: "exception", detail: String(e) };
  }
}

/**
 * Lit le nom du projet
 */
export function readNomProjet() {
  const el = findNomProjetInput();
  if (!el) return null;
  return el.value ?? "";
}

/**
 * Vérifie le nom du projet
 */
export function checkNomProjet(expected) {
  const got = readNomProjet();
  const ok = (got !== null) && (T(got) === T(expected));
  const res = { champ: "projet.nom", ok, got, expected };
  console.table([res]);
  return res;
}

/**
 * Diagnostique le nom du projet
 */
export function diagnoseNomProjet(expected) {
  const el = findNomProjetInput();
  const got = el ? (el.value ?? "") : null;

  if (!el) {
    return {
      champ: "projet.nom",
      got,
      expected,
      why: "Champ introuvable. Vérifiez le frame et la visibilité de la section."
    };
  }
  
  if (!isVisible(el)) {
    return {
      champ: "projet.nom",
      got,
      expected,
      why: "Champ présent mais masqué. Ouvrez la section contenant le nom du projet."
    };
  }
  
  if (el.disabled || el.readOnly) {
    return {
      champ: "projet.nom",
      got,
      expected,
      why: "Champ désactivé ou en lecture seule."
    };
  }
  
  if (T(got) !== T(expected)) {
    return {
      champ: "projet.nom",
      got,
      expected,
      why: "Valeur différente de celle attendue."
    };
  }
  
  return {
    champ: "projet.nom",
    got,
    expected,
    why: null,
    ok: true
  };
}

// Export de l'API complète
export default {
  set: setNomProjet,
  read: readNomProjet,
  check: checkNomProjet,
  diagnose: diagnoseNomProjet
};