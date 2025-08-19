/**
 * Service de gestion des options (Madelin, Résiliation, Reprise)
 * Gère les checkboxes et options spéciales
 */

import { q, isVisible, labelFor, clickHuman } from '../utils/dom-utils.js';
import { readSelect } from '../utils/form-utils.js';
import { wait, waitStable, waitOverlayGone, overlayPresent } from '../utils/async-utils.js';

// ======================
// LOI MADELIN
// ======================

/**
 * Trouve la checkbox Madelin
 */
function findMadelinBox() {
  const selectors = [
    '#madelin', '#loi-madelin', '[name="madelin"]',
    '[name="loiMadelin"]', 'input[id*="madelin"]'
  ];
  
  for (const sel of selectors) {
    const el = q(sel);
    if (el && el.type === 'checkbox') return el;
  }
  
  return null;
}

/**
 * Lit l'état Madelin
 */
function readMadelin() {
  const checkbox = findMadelinBox();
  if (!checkbox) return { found: false };
  
  return {
    found: true,
    checked: checkbox.checked,
    visible: isVisible(checkbox),
    disabled: checkbox.disabled
  };
}

/**
 * Définit Madelin
 */
async function setMadelin(value) {
  const targetChecked = /^(true|1|oui|yes)$/i.test(String(value));
  const checkbox = findMadelinBox();
  
  if (!checkbox) {
    return { ok: false, reason: 'checkbox_not_found' };
  }
  
  if (!isVisible(checkbox)) {
    return { ok: false, reason: 'checkbox_hidden' };
  }
  
  if (checkbox.checked === targetChecked) {
    return { ok: true, already: true };
  }
  
  const label = labelFor(checkbox);
  const clickable = (label && isVisible(label)) ? label : checkbox;
  
  clickHuman(clickable);
  await wait(50);
  
  if (checkbox.checked !== targetChecked) {
    checkbox.checked = targetChecked;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
  }
  
  await waitStable();
  
  return { 
    ok: true, 
    nowChecked: checkbox.checked,
    clicked: clickable === label ? 'label' : 'checkbox'
  };
}

// ======================
// RÉSILIATION
// ======================

const ID_RESILIATION_OUI = '#resiliation-oui';
const ID_RESILIATION_NON = '#resiliation-non';

/**
 * Trouve le groupe résiliation
 */
function getResiliationGroup() {
  const oui = q(ID_RESILIATION_OUI);
  const non = q(ID_RESILIATION_NON);
  
  if (oui && non) return { oui, non };
  
  // Recherche alternative
  const radios = document.querySelectorAll('input[type="radio"][name*="resiliation"]');
  if (radios.length >= 2) {
    return {
      oui: [...radios].find(r => /oui|yes|1/i.test(r.value)),
      non: [...radios].find(r => /non|no|0/i.test(r.value))
    };
  }
  
  return null;
}

/**
 * Lit la résiliation
 */
function readResiliation() {
  const group = getResiliationGroup();
  if (!group) return { found: false };
  
  return {
    found: true,
    value: group.oui?.checked ? 'oui' : (group.non?.checked ? 'non' : null),
    ouiVisible: isVisible(group.oui),
    nonVisible: isVisible(group.non)
  };
}

/**
 * Définit la résiliation
 */
async function setResiliation(value) {
  const targetId = /^oui$/i.test(value) ? ID_RESILIATION_OUI : ID_RESILIATION_NON;
  const group = getResiliationGroup();
  
  if (!group) {
    return { ok: false, reason: 'group_not_found' };
  }
  
  const target = /^oui$/i.test(value) ? group.oui : group.non;
  if (!target) {
    return { ok: false, reason: 'target_radio_not_found' };
  }
  
  if (!isVisible(target)) {
    return { ok: false, reason: 'target_hidden' };
  }
  
  if (target.checked) {
    return { ok: true, already: true };
  }
  
  const label = labelFor(target);
  const clickable = (label && isVisible(label)) ? label : target;
  
  clickHuman(clickable);
  await wait(50);
  
  if (!target.checked) {
    target.checked = true;
    target.dispatchEvent(new Event('change', { bubbles: true }));
  }
  
  await waitStable();
  
  return { 
    ok: true, 
    value,
    clicked: clickable === label ? 'label' : 'radio'
  };
}

// ======================
// REPRISE DE CONCURRENCE
// ======================

const ID_REPRISE_OUI = '#reprise-concurrence-oui';
const ID_REPRISE_NON = '#reprise-concurrence-non';

/**
 * Trouve le groupe reprise
 */
function getRepriseGroup() {
  const oui = q(ID_REPRISE_OUI);
  const non = q(ID_REPRISE_NON);
  
  if (oui && non) return { oui, non };
  
  // Recherche alternative
  const radios = document.querySelectorAll('input[type="radio"][name*="reprise"], input[type="radio"][name*="concurrence"]');
  if (radios.length >= 2) {
    return {
      oui: [...radios].find(r => /oui|yes|1/i.test(r.value)),
      non: [...radios].find(r => /non|no|0/i.test(r.value))
    };
  }
  
  return null;
}

/**
 * Lit la reprise
 */
function readReprise() {
  const group = getRepriseGroup();
  if (!group) return { found: false };
  
  return {
    found: true,
    value: group.oui?.checked ? 'oui' : (group.non?.checked ? 'non' : null),
    ouiVisible: isVisible(group.oui),
    nonVisible: isVisible(group.non)
  };
}

/**
 * Définit la reprise
 */
async function setReprise(value) {
  const group = getRepriseGroup();
  
  if (!group) {
    return { ok: false, reason: 'group_not_found' };
  }
  
  const target = /^oui$/i.test(value) ? group.oui : group.non;
  if (!target) {
    return { ok: false, reason: 'target_radio_not_found' };
  }
  
  if (!isVisible(target)) {
    return { ok: false, reason: 'target_hidden' };
  }
  
  if (target.checked) {
    return { ok: true, already: true };
  }
  
  const label = labelFor(target);
  const clickable = (label && isVisible(label)) ? label : target;
  
  clickHuman(clickable);
  await wait(50);
  
  if (!target.checked) {
    target.checked = true;
    target.dispatchEvent(new Event('change', { bubbles: true }));
  }
  
  await waitStable();
  
  return { 
    ok: true, 
    value,
    clicked: clickable === label ? 'label' : 'radio'
  };
}

// ======================
// API UNIFIÉE
// ======================

/**
 * Définit toutes les options en une fois
 */
export async function setAll(options = {}) {
  await waitOverlayGone();
  
  const results = {};
  
  if (options.madelin !== undefined) {
    results.madelin = await setMadelin(options.madelin);
  }
  
  if (options.resiliation !== undefined) {
    results.resiliation = await setResiliation(options.resiliation);
  }
  
  if (options.reprise !== undefined) {
    results.reprise = await setReprise(options.reprise);
  }
  
  // Gestion combinée résiliation + reprise
  if (options.reprise !== undefined && options.resiliation !== undefined) {
    // Si reprise = oui, alors résiliation = oui aussi (logique métier)
    if (/^oui$/i.test(options.reprise) && /^non$/i.test(options.resiliation)) {
      console.log("⚠️ Correction automatique: reprise=oui implique résiliation=oui");
      results.resiliation = await setResiliation('oui');
    }
  }
  
  return results;
}

/**
 * Lit toutes les options
 */
export function readAll() {
  return {
    madelin: readMadelin(),
    resiliation: readResiliation(),
    reprise: readReprise()
  };
}

/**
 * Vérifie toutes les options
 */
export function checkAll(expected = {}) {
  const got = readAll();
  const results = [];
  
  if (expected.madelin !== undefined) {
    const expectedBool = /^(true|1|oui|yes)$/i.test(String(expected.madelin));
    results.push({
      option: 'madelin',
      ok: got.madelin.found && got.madelin.checked === expectedBool,
      got: got.madelin.checked,
      expected: expectedBool
    });
  }
  
  if (expected.resiliation !== undefined) {
    results.push({
      option: 'resiliation',
      ok: got.resiliation.found && got.resiliation.value === expected.resiliation,
      got: got.resiliation.value,
      expected: expected.resiliation
    });
  }
  
  if (expected.reprise !== undefined) {
    results.push({
      option: 'reprise',
      ok: got.reprise.found && got.reprise.value === expected.reprise,
      got: got.reprise.value,
      expected: expected.reprise
    });
  }
  
  console.table(results);
  return results;
}

/**
 * Diagnostique détaillé
 */
export function diagnoseAll(expected = {}) {
  const state = readAll();
  const issues = [];
  
  // Madelin
  if (expected.madelin !== undefined && !state.madelin.found) {
    issues.push({ option: 'madelin', issue: 'not_found' });
  } else if (state.madelin.found && !state.madelin.visible) {
    issues.push({ option: 'madelin', issue: 'hidden' });
  }
  
  // Résiliation
  if (expected.resiliation !== undefined && !state.resiliation.found) {
    issues.push({ option: 'resiliation', issue: 'not_found' });
  }
  
  // Reprise
  if (expected.reprise !== undefined && !state.reprise.found) {
    issues.push({ option: 'reprise', issue: 'not_found' });
  }
  
  if (overlayPresent()) {
    issues.push({ issue: 'overlay_present' });
  }
  
  return { state, issues };
}

// Export de l'API complète
export default {
  // API unifiée
  setAll,
  readAll,
  checkAll,
  diagnoseAll,
  
  // APIs spécifiques
  madelin: {
    read: readMadelin,
    set: setMadelin
  },
  resiliation: {
    read: readResiliation,
    set: setResiliation
  },
  reprise: {
    read: readReprise,
    set: setReprise
  }
};