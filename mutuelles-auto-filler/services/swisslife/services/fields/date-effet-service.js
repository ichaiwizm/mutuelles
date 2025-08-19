/**
 * Service de gestion de la date d'effet
 * Gère la sélection de date via input et bouton calendrier
 */

import { q, qa, isVisible, bringIntoView, clickHuman } from '../utils/dom-utils.js';
import { overlayPresent, wait, waitStable, waitOverlayGone } from '../utils/async-utils.js';

/**
 * Trouve l'input de date d'effet
 */
function findInput() {
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
  
  // Recherche par proximité avec label
  const labels = qa('label').filter(l => 
    /date.*effet/i.test(l.innerText) || /effet/i.test(l.innerText)
  );
  
  for (const label of labels) {
    const input = label.querySelector('input') ||
                  label.nextElementSibling?.querySelector?.('input') ||
                  q(`#${label.getAttribute('for')}`);
    if (input) return input;
  }
  
  return null;
}

/**
 * Trouve le bouton calendrier associé
 */
function findButtonNear(input) {
  if (!input) return null;
  
  // Bouton immédiatement après
  let sibling = input.nextElementSibling;
  while (sibling && sibling.nodeType === 1) {
    if (sibling.tagName === 'BUTTON' || 
        sibling.classList.contains('btn') ||
        sibling.querySelector('button, .btn')) {
      return sibling.tagName === 'BUTTON' ? sibling : sibling.querySelector('button, .btn');
    }
    sibling = sibling.nextElementSibling;
  }
  
  // Dans le parent
  const parent = input.parentElement;
  const btn = parent?.querySelector('button, .btn, [role="button"]');
  if (btn) return btn;
  
  // Recherche par icône calendrier
  return qa('button, .btn, [role="button"]').find(b => {
    const txt = b.innerText || b.innerHTML || '';
    return /📅|calendar|date/.test(txt.toLowerCase());
  });
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
 * Définit la date d'effet
 */
export async function set(value) {
  const input = findInput();
  
  if (!input) {
    return { ok: false, reason: 'input_not_found' };
  }
  
  if (!isVisible(input)) {
    return { ok: false, reason: 'input_hidden' };
  }
  
  const formatted = toDDMMYYYY(value);
  
  bringIntoView(input);
  await wait(100);
  
  input.focus();
  input.value = formatted;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.blur();
  
  await waitStable();
  
  return { 
    ok: true, 
    value: formatted,
    actual: input.value 
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