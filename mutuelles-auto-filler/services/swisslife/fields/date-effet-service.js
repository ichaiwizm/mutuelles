/**
 * Service de gestion de la date d'effet
 * Gère la sélection de date via input et bouton calendrier
 */

import { q, qa, isVisible, bringIntoView, clickHuman, fireMultiple } from '../utils/dom-utils.js';
import { overlayPresent, wait, waitStable, waitOverlayGone } from '../utils/async-utils.js';
import { success, error, ERROR_CODES } from '../utils/response-format.js';

/**
 * Trouve l'input de date d'effet - LOGIQUE DU SCRIPT MANUEL QUI FONCTIONNE
 */
function findInput() {
  // Sélecteur principal SwissLife exact
  const direct = q('#contratSante-dateEffet,[name="contratSante.dateEffet"]');
  if (direct) return direct;
  
  // Fallback sur anciens sélecteurs
  const selectors = [
    '#date-effet',
    '#date-effet-contrat', 
    '[name="dateEffet"]',
    '[name="date-effet"]',
    'input[id*="effet"]'
  ];
  
  for (const sel of selectors) {
    const el = q(sel);
    if (el) return el;
  }
  
  // Recherche par libellé "Date d'effet"
  const nodes = qa("label, legend, .label, .form-group, section, fieldset, .panel, .card, div, span");
  for (const n of nodes) {
    const txt = (n.innerText || "").replace(/\s+/g," ").trim();
    if (!txt) continue;
    if (/date\s*d['']effet/i.test(txt)) {
      const inp = n.querySelector?.('input[type="text"], input, [type="date"]') ||
                  n.nextElementSibling?.querySelector?.('input[type="text"], input, [type="date"]');
      if (inp) return inp;
    }
  }
  
  // Fallback: input avec placeholder/aria-label contenant "effet"
  const maybe = qa('input[type="text"], input').find(x => 
    /effet/i.test(`${x.placeholder||''} ${x.getAttribute?.('aria-label')||''}`)
  );
  return maybe || null;
}

/**
 * Trouve le bouton calendrier associé - LOGIQUE DU SCRIPT MANUEL QUI FONCTIONNE
 */
function findButtonNear(input) {
  if (!input) return null;
  
  // 1) Cherche dans les conteneurs input-group et form-group (like manual script)
  const group = input.closest('.input-group, .form-group, .row, .col, div');
  if (group) {
    const btn = group.querySelector('button, .input-group-addon, .icon-calendar, .fa-calendar, .glyphicon-calendar, .ui-datepicker-trigger, [role="button"]');
    if (btn) return btn.tagName ? btn : btn.closest('button,[role="button"],.input-group-addon');
  }
  
  // 2) label for + bouton suivant (like manual script)
  const lab = input.id ? q(`label[for="${CSS.escape(input.id)}"]`) : null;
  if (lab) {
    const sibBtn = lab.nextElementSibling?.querySelector?.('button,[role="button"],.input-group-addon');
    if (sibBtn) return sibBtn;
  }
  
  // 3) Ancienne logique en fallback
  let sibling = input.nextElementSibling;
  while (sibling && sibling.nodeType === 1) {
    if (sibling.tagName === 'BUTTON' || 
        sibling.classList.contains('btn') ||
        sibling.querySelector('button, .btn')) {
      return sibling.tagName === 'BUTTON' ? sibling : sibling.querySelector('button, .btn');
    }
    sibling = sibling.nextElementSibling;
  }
  
  return null;
}

/**
 * Lit la valeur actuelle
 */
export function read() {
  const input = findInput();
  if (!input) {
    return error(ERROR_CODES.NOT_FOUND, 'Input de date d\'effet non trouvé');
  }
  
  return success(input.value || "");
}

/**
 * Clique sur le bouton calendrier
 */
export async function clickButton() {
  const input = findInput();
  const button = findButtonNear(input);
  
  if (!button) {
    return error(ERROR_CODES.NOT_FOUND, 'Bouton calendrier non trouvé');
  }
  
  if (!isVisible(button)) {
    return error(ERROR_CODES.HIDDEN, 'Bouton calendrier masqué');
  }
  
  bringIntoView(button);
  await wait(100);
  
  clickHuman(button);
  await wait(200);
  
  return success({ clicked: true });
}

/**
 * Formate une date en DD/MM/YYYY
 */
function toDDMMYYYY(v) {
  if (!v) return "";
  
  if (v === "today" || v === "aujourd'hui") {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  
  // Si déjà au bon format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return v;
  
  // Conversion depuis d'autres formats
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split('-');
    return `${d}/${m}/${y}`;
  }
  
  return v; // Retourner tel quel si format inconnu
}

/**
 * Définit la date d'effet - LOGIQUE DU SCRIPT MANUEL QUI FONCTIONNE
 */
export async function set(value) {
  console.log('🔍 date-effet set - valeur reçue:', value, typeof value);
  
  // Extraire la vraie valeur si c'est un objet 
  let dateValue = value;
  if (typeof value === 'object' && value !== null) {
    dateValue = value.value || value.valeur || value;
    console.log('🔍 date-effet set - valeur extraite de l\'objet:', dateValue);
  }
  
  const input = findInput();
  console.log('🔍 date-effet set - input trouvé:', input);
  
  if (!input) {
    console.log('❌ date-effet set - input non trouvé');
    return error(ERROR_CODES.NOT_FOUND, 'Input de date d\'effet non trouvé');
  }
  
  if (!isVisible(input)) {
    console.log('❌ date-effet set - input masqué');
    return error(ERROR_CODES.HIDDEN, 'Input de date d\'effet masqué');
  }
  
  if (input.disabled) {
    return error(ERROR_CODES.DISABLED, 'Input de date d\'effet désactivé');
  }
  
  const formatted = toDDMMYYYY(dateValue);
  console.log('🔍 date-effet set - date formatée:', formatted);
  
  // Logique du script manuel qui fonctionne
  input.focus();
  input.value = formatted || '';
  fireMultiple(input); // Déclenche input + change + blur
  
  await wait(60);
  await waitOverlayGone();
  await waitStable();
  
  const finalValue = input.value || '';
  const ok = finalValue === formatted;
  console.log('✅ date-effet set - résultat final:', { ok, got: finalValue, expected: formatted });
  
  if (!ok) {
    return error(ERROR_CODES.VALUE_MISMATCH, `Date non définie correctement. Attendu: ${formatted}, obtenu: ${finalValue}`);
  }
  
  return success({ 
    value: formatted,
    actual: finalValue
  });
}

/**
 * Vérifie la date d'effet
 */
export function check(expected) {
  const readResult = read();
  if (!readResult.ok) {
    return error(readResult.error.code, `Impossible de lire la date d'effet: ${readResult.error.message}`);
  }
  
  const got = readResult.data;
  const expectedFormatted = toDDMMYYYY(expected);
  const match = got === expectedFormatted;
  
  if (match) {
    return success({ champ: "date.effet", got, expected: expectedFormatted });
  } else {
    return error(ERROR_CODES.VALUE_MISMATCH, `Date d'effet incorrecte. Attendu: ${expectedFormatted}, obtenu: ${got}`);
  }
}

/**
 * Diagnostique la date d'effet
 */
export function diagnose(expected) {
  const input = findInput();
  const button = findButtonNear(input);
  const readResult = read();
  const got = readResult.ok ? readResult.data : null;
  const expectedFormatted = toDDMMYYYY(expected);
  
  const diagnosis = {
    champ: "date.effet",
    got,
    expected: expectedFormatted,
    hasInput: !!input,
    hasButton: !!button
  };
  
  if (!input) {
    diagnosis.why = "Input de date d'effet introuvable";
    return success(diagnosis);
  }
  
  diagnosis.inputVisible = isVisible(input);
  diagnosis.inputDisabled = input.disabled;
  diagnosis.inputReadOnly = input.readOnly;
  
  if (!isVisible(input)) {
    diagnosis.why = "Input de date masqué";
    return success(diagnosis);
  }
  
  if (input.disabled || input.readOnly) {
    diagnosis.why = "Input désactivé ou en lecture seule";
    return success(diagnosis);
  }
  
  if (overlayPresent()) {
    diagnosis.why = "Overlay présent, attendre la fin du chargement";
    diagnosis.overlayPresent = true;
    return success(diagnosis);
  }
  
  if (!readResult.ok) {
    diagnosis.why = `Erreur de lecture: ${readResult.error.message}`;
    return success(diagnosis);
  }
  
  if (got !== expectedFormatted) {
    diagnosis.why = "Date différente de celle attendue";
    return success(diagnosis);
  }
  
  diagnosis.why = null;
  diagnosis.ok = true;
  return success(diagnosis);
}

// Export de l'API complète
export default {
  read,
  set,
  check,
  diagnose,
  clickButton,
  findInput,
  findButtonNear
};