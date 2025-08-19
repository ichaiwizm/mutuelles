/**
 * Service de gestion du confort hospitalisation
 * Gère les indemnités journalières et la navigation santé
 */

import { q, qa, isVisible, labelFor, clickHuman } from '../utils/dom-utils.js';
import { T } from '../utils/form-utils.js';
import { wait, waitStable } from '../utils/async-utils.js';

/**
 * Trouve le nœud de navigation santé
 */
function nodeNavSante() {
  return q('#link-nav-sante');
}

/**
 * Vérifie si la navigation santé est activée
 */
function navSanteEnabled() {
  const node = nodeNavSante();
  return !!(node && !node.classList.contains('disabled'));
}

/**
 * Trouve le CTA "Proposez Swiss Life Santé"
 */
function ctaSante() {
  const buttons = qa('button, a, .cta, [role="button"]');
  return buttons.find(b => {
    const txt = T(b.innerText || "");
    return /proposez.*swiss.*life.*sant[eé]/i.test(txt) || /swiss.*life.*sant[eé]/i.test(txt);
  });
}

/**
 * Lit la valeur des IJ (corrigée pour lire oui ET non)
 */
export function readIJ() {
  const inNon = q('#confort-hospitalisation-non, #ij-non, [name*="confort"][value="non"], [name*="ij"][value="non"]');
  const inOui = q('#confort-hospitalisation-oui, #ij-oui, [name*="confort"][value="oui"], [name*="ij"][value="oui"]');
  
  if (!inNon && !inOui) {
    return { found: false, value: null };
  }
  
  const value = inOui?.checked ? 'oui' : (inNon?.checked ? 'non' : null);
  
  return {
    found: true,
    value,
    checkedOui: !!inOui?.checked,
    checkedNon: !!inNon?.checked,
    elements: { oui: inOui, non: inNon }
  };
}

/**
 * Lit la valeur exacte des IJ (legacy, utilise readIJ)
 * @deprecated Utiliser readIJ() à la place
 */
export function readIJExact() {
  console.warn('readIJExact() est deprecated, utilisez readIJ()');
  const result = readIJ();
  
  if (!result.found) return { found: false, checked: null };
  
  return {
    found: true,
    checked: result.checkedNon,
    value: result.value || "unknown",
    labelText: "",
    inputId: result.elements.non?.id || null,
    inputName: result.elements.non?.name || null
  };
}

/**
 * Installe des sondes pour surveiller les changements
 */
export function installProbes() {
  const data = { changes: [], lastChange: null };
  
  const handler = (e) => {
    const info = {
      time: new Date().toISOString(),
      type: e.type,
      target: e.target?.tagName,
      id: e.target?.id,
      name: e.target?.name,
      value: e.target?.value,
      checked: e.target?.checked
    };
    data.changes.push(info);
    data.lastChange = info;
    console.log('[PROBE]', info);
  };
  
  // Surveiller tous les inputs radio
  qa('input[type="radio"]').forEach(r => {
    r.addEventListener('change', handler);
    r.addEventListener('click', handler);
  });
  
  // Surveiller la navigation
  const nav = nodeNavSante();
  if (nav) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(m => {
        if (m.attributeName === 'class') {
          const wasDisabled = m.oldValue?.includes('disabled');
          const isDisabled = nav.classList.contains('disabled');
          if (wasDisabled !== isDisabled) {
            console.log('[PROBE] Nav santé:', isDisabled ? 'DISABLED' : 'ENABLED');
            data.lastChange = { navEnabled: !isDisabled };
          }
        }
      });
    });
    observer.observe(nav, { attributes: true, attributeOldValue: true });
  }
  
  return data;
}

/**
 * Essaie de cliquer sur "Non" pour les IJ
 */
export async function tryClickNon() {
  const inNon = q('#confort-hospitalisation-non, #ij-non, [name*="confort"][value="non"], [name*="ij"][value="non"]');
  if (!inNon) return { ok: false, reason: "input_non_not_found" };
  
  const labNon = labelFor(inNon);
  const target = (labNon && isVisible(labNon)) ? labNon : inNon;
  
  if (!isVisible(target)) {
    return { ok: false, reason: "target_not_visible" };
  }
  
  // Click humain complet
  target.focus?.();
  clickHuman(target);
  
  await wait(100);
  
  // Vérifier si coché
  if (!inNon.checked) {
    inNon.checked = true;
    inNon.dispatchEvent(new Event('change', { bubbles: true }));
  }
  
  await waitStable();
  
  return {
    ok: true,
    clicked: target === labNon ? "label" : "input",
    nowChecked: inNon.checked,
    navEnabled: navSanteEnabled()
  };
}

/**
 * Définit la valeur des IJ
 */
export async function setConfortHospitalisation(value) {
  if (value === 'non') {
    return await tryClickNon();
  }
  
  // Pour "oui", chercher l'input correspondant
  const inOui = q('#confort-hospitalisation-oui, #ij-oui, [name*="confort"][value="oui"], [name*="ij"][value="oui"]');
  if (!inOui) return { ok: false, reason: "input_oui_not_found" };
  
  const labOui = labelFor(inOui);
  const target = (labOui && isVisible(labOui)) ? labOui : inOui;
  
  if (!isVisible(target)) {
    return { ok: false, reason: "target_not_visible" };
  }
  
  target.focus?.();
  clickHuman(target);
  
  await wait(100);
  
  if (!inOui.checked) {
    inOui.checked = true;
    inOui.dispatchEvent(new Event('change', { bubbles: true }));
  }
  
  await waitStable();
  
  return {
    ok: true,
    clicked: target === labOui ? "label" : "input",
    nowChecked: inOui.checked
  };
}

/**
 * Vérifie la valeur des IJ
 */
export function checkConfortHospitalisation(expected) {
  const state = readIJ();
  const ok = state.found && state.value === expected;
  return { champ: "confort.hospitalisation", ok, got: state.value, expected };
}

/**
 * Diagnostique les IJ
 */
export function diagnoseConfortHospitalisation(expected) {
  const state = readIJ();
  
  if (!state.found) {
    return {
      champ: "confort.hospitalisation",
      why: "Aucun contrôle trouvé"
    };
  }
  
  const inNon = q('#confort-hospitalisation-non, #ij-non');
  const inOui = q('#confort-hospitalisation-oui, #ij-oui');
  
  if (!isVisible(inNon) && !isVisible(inOui)) {
    return {
      champ: "confort.hospitalisation",
      why: "Contrôles masqués"
    };
  }
  
  return {
    champ: "confort.hospitalisation",
    got: state.value,
    expected,
    ok: state.value === expected,
    navEnabled: navSanteEnabled()
  };
}

// Export de l'API complète
export default {
  read: readIJ,
  readLegacy: readIJExact, // pour compatibilité
  set: setConfortHospitalisation,
  check: checkConfortHospitalisation,
  diagnose: diagnoseConfortHospitalisation,
  tryClickNon,
  installProbes,
  navSanteEnabled,
  ctaSante
};