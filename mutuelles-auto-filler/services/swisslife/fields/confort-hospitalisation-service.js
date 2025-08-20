/**
 * Service de gestion du confort hospitalisation
 * Gère les indemnités journalières et la navigation santé
 */

import { q, qa, isVisible, labelFor, clickHuman } from '../utils/dom-utils.js';
import { T } from '../utils/form-utils.js';
import { wait, waitStable } from '../utils/async-utils.js';
import { success, error, ERROR_CODES } from '../utils/response-format.js';

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
  const inNon = q('#projet-confort-hospitalisation-non, #confort-hospitalisation-non, #ij-non, [name*="confort"][value="non"], [name*="ij"][value="non"]');
  const inOui = q('#projet-confort-hospitalisation-oui, #confort-hospitalisation-oui, #ij-oui, [name*="confort"][value="oui"], [name*="ij"][value="oui"]');
  
  if (!inNon && !inOui) {
    return error(ERROR_CODES.NOT_FOUND, 'Aucun contrôle de confort hospitalisation trouvé');
  }
  
  const value = inOui?.checked ? 'oui' : (inNon?.checked ? 'non' : null);
  
  return success({
    value,
    checkedOui: !!inOui?.checked,
    checkedNon: !!inNon?.checked,
    elements: { oui: inOui, non: inNon }
  });
}

/**
 * Lit la valeur exacte des IJ (legacy, utilise readIJ)
 * @deprecated Utiliser readIJ() à la place
 */
export function readIJExact() {
  console.warn('readIJExact() est deprecated, utilisez readIJ()');
  const result = readIJ();
  
  if (!result.ok) {
    return error(result.error.code, result.error.message);
  }
  
  return success({
    found: true,
    checked: result.data.checkedNon,
    value: result.data.value || "unknown",
    labelText: "",
    inputId: result.data.elements.non?.id || null,
    inputName: result.data.elements.non?.name || null
  });
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
  const inNon = q('#projet-confort-hospitalisation-non, #confort-hospitalisation-non, #ij-non, [name*="confort"][value="non"], [name*="ij"][value="non"]');
  if (!inNon) {
    return error(ERROR_CODES.NOT_FOUND, 'Input "Non" pour confort hospitalisation non trouvé');
  }
  
  const labNon = labelFor(inNon);
  const target = (labNon && isVisible(labNon)) ? labNon : inNon;
  
  if (!isVisible(target)) {
    return error(ERROR_CODES.HIDDEN, 'Contrôle "Non" pour confort hospitalisation masqué');
  }
  
  if (inNon.disabled) {
    return error(ERROR_CODES.DISABLED, 'Input "Non" pour confort hospitalisation désactivé');
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
  
  return success({
    clicked: target === labNon ? "label" : "input",
    nowChecked: inNon.checked,
    navEnabled: navSanteEnabled()
  });
}

/**
 * Définit la valeur des IJ
 */
export async function setConfortHospitalisation(value) {
  // Support objet ou string
  const actualValue = typeof value === 'object' ? value.value : value;
  
  if (actualValue === 'non') {
    return await tryClickNon();
  }
  
  if (actualValue === 'oui') {
    // Pour "oui", chercher l'input correspondant
    const inOui = q('#projet-confort-hospitalisation-oui, #confort-hospitalisation-oui, #ij-oui, [name*="confort"][value="oui"], [name*="ij"][value="oui"]');
    if (!inOui) {
      return error(ERROR_CODES.NOT_FOUND, 'Input "Oui" pour confort hospitalisation non trouvé');
    }
    
    const labOui = labelFor(inOui);
    const target = (labOui && isVisible(labOui)) ? labOui : inOui;
    
    if (!isVisible(target)) {
      return error(ERROR_CODES.HIDDEN, 'Contrôle "Oui" pour confort hospitalisation masqué');
    }
    
    if (inOui.disabled) {
      return error(ERROR_CODES.DISABLED, 'Input "Oui" pour confort hospitalisation désactivé');
    }
    
    target.focus?.();
    clickHuman(target);
    
    await wait(100);
    
    if (!inOui.checked) {
      inOui.checked = true;
      inOui.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    await waitStable();
    
    return success({
      clicked: target === labOui ? "label" : "input",
      nowChecked: inOui.checked,
      value: 'oui'
    });
  }
  
  return error(ERROR_CODES.VALIDATION_ERROR, `Valeur invalide pour confort hospitalisation: ${actualValue}. Valeurs acceptées: "oui", "non"`);
}

/**
 * Vérifie la valeur des IJ
 */
export function checkConfortHospitalisation(expected) {
  const readResult = readIJ();
  if (!readResult.ok) {
    return error(readResult.error.code, `Impossible de lire le confort hospitalisation: ${readResult.error.message}`);
  }
  
  const got = readResult.data.value;
  const match = got === expected;
  
  if (match) {
    return success({ champ: "confort.hospitalisation", got, expected });
  } else {
    return error(ERROR_CODES.VALUE_MISMATCH, `Confort hospitalisation incorrect. Attendu: ${expected}, obtenu: ${got}`);
  }
}

/**
 * Diagnostique les IJ
 */
export function diagnoseConfortHospitalisation(expected) {
  const readResult = readIJ();
  const got = readResult.ok ? readResult.data.value : null;
  
  const diagnosis = {
    champ: "confort.hospitalisation",
    got,
    expected,
    navEnabled: navSanteEnabled()
  };
  
  if (!readResult.ok) {
    diagnosis.why = `Erreur de lecture: ${readResult.error.message}`;
    return success(diagnosis);
  }
  
  const inNon = q('#projet-confort-hospitalisation-non, #confort-hospitalisation-non, #ij-non');
  const inOui = q('#projet-confort-hospitalisation-oui, #confort-hospitalisation-oui, #ij-oui');
  
  diagnosis.controls = {
    hasNon: !!inNon,
    hasOui: !!inOui,
    nonVisible: inNon ? isVisible(inNon) : false,
    ouiVisible: inOui ? isVisible(inOui) : false,
    nonDisabled: inNon ? inNon.disabled : false,
    ouiDisabled: inOui ? inOui.disabled : false
  };
  
  if (!inNon && !inOui) {
    diagnosis.why = "Aucun contrôle trouvé";
    return success(diagnosis);
  }
  
  if (!isVisible(inNon) && !isVisible(inOui)) {
    diagnosis.why = "Contrôles masqués";
    return success(diagnosis);
  }
  
  if (got !== expected) {
    diagnosis.why = "Valeur différente de celle attendue";
    return success(diagnosis);
  }
  
  diagnosis.why = null;
  diagnosis.ok = true;
  return success(diagnosis);
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