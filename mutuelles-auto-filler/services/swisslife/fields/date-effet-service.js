/**
 * Service de gestion de la date d'effet
 * Gère la sélection de date via input et bouton calendrier
 */

import { q, qa, isVisible, bringIntoView, clickHuman, fireMultiple } from '../utils/dom-utils.js';
import { overlayPresent, wait, waitStable, waitOverlayGone } from '../utils/async-utils.js';

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
  return input ? (input.value || "") : null;
}

/**
 * Clique sur le bouton calendrier
 */
export async function clickButton() {
  const input = findInput();
  const button = findButtonNear(input);
  
  if (!button) {
    return { ok: false, reason: 'button_not_found' };
  }
  
  if (!isVisible(button)) {
    return { ok: false, reason: 'button_hidden' };
  }
  
  bringIntoView(button);
  await wait(100);
  
  clickHuman(button);
  await wait(200);
  
  return { ok: true, clicked: true };
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
    return { ok: false, reason: 'input_not_found' };
  }
  
  if (!isVisible(input)) {
    console.log('❌ date-effet set - input masqué');
    return { ok: false, reason: 'input_hidden' };
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
  
  return { 
    ok,
    value: formatted,
    actual: finalValue
  };
}

/**
 * Vérifie la date d'effet
 */
export function check(expected) {
  const got = read();
  const expectedFormatted = toDDMMYYYY(expected);
  const ok = got === expectedFormatted;
  
  return { 
    champ: "date.effet", 
    ok, 
    got, 
    expected: expectedFormatted 
  };
}

/**
 * Diagnostique la date d'effet
 */
export function diagnose(expected) {
  const input = findInput();
  const button = findButtonNear(input);
  const got = read();
  const expectedFormatted = toDDMMYYYY(expected);
  
  if (!input) {
    return {
      champ: "date.effet",
      got,
      expected: expectedFormatted,
      why: "Input de date d'effet introuvable"
    };
  }
  
  if (!isVisible(input)) {
    return {
      champ: "date.effet",
      got,
      expected: expectedFormatted,
      why: "Input de date masqué"
    };
  }
  
  if (input.disabled || input.readOnly) {
    return {
      champ: "date.effet",
      got,
      expected: expectedFormatted,
      why: "Input désactivé ou en lecture seule"
    };
  }
  
  if (overlayPresent()) {
    return {
      champ: "date.effet",
      got,
      expected: expectedFormatted,
      why: "Overlay présent, attendre la fin du chargement"
    };
  }
  
  if (got !== expectedFormatted) {
    return {
      champ: "date.effet",
      got,
      expected: expectedFormatted,
      why: "Date différente de celle attendue"
    };
  }
  
  return {
    champ: "date.effet",
    got,
    expected: expectedFormatted,
    why: null,
    ok: true,
    hasButton: !!button
  };
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