/**
 * Service de gestion du type de simulation
 * Gère la sélection individuel/couple dans le formulaire SwissLife
 */

import { q, qa, isVisible, clickHuman } from '../utils/dom-utils.js';
import { norm, readSelect } from '../utils/form-utils.js';
import { wait, waitStable } from '../utils/async-utils.js';
import { success, error, ERROR_CODES } from '../utils/response-format.js';

/**
 * Trouve le groupe de radios pour le type de simulation
 */
function findRadioGroup() {
  // Chercher les radios avec les IDs connus
  const knownIds = [
    '#individuel', '#couple',
    '#radio-individuel', '#radio-couple',
    '[value="individuel"]', '[value="couple"]',
    '[value="INDIVIDUEL"]', '[value="COUPLE"]'
  ];
  
  for (const id of knownIds) {
    const radio = q(id);
    if (radio && radio.type === 'radio') {
      return { 
        individuel: q('[value="individuel"], [value="INDIVIDUEL"], #individuel'),
        couple: q('[value="couple"], [value="COUPLE"], #couple')
      };
    }
  }
  
  // Chercher par name
  const radios = qa('input[type="radio"]');
  const grouped = {};
  
  for (const r of radios) {
    if (!r.name) continue;
    grouped[r.name] = grouped[r.name] || [];
    grouped[r.name].push(r);
  }
  
  for (const [name, group] of Object.entries(grouped)) {
    if (group.length !== 2) continue;
    
    const vals = group.map(r => norm(r.value));
    if (vals.includes('individuel') && vals.includes('couple')) {
      return {
        individuel: group.find(r => norm(r.value) === 'individuel'),
        couple: group.find(r => norm(r.value) === 'couple')
      };
    }
  }
  
  return null;
}

/**
 * Trouve le select pour le type de simulation
 */
function findSelectVariant() {
  // IDs connus
  const selects = [
    q('#type-simulation'),
    q('#simulation-type'),
    q('[name="typeSimulation"]'),
    q('[name="simulationType"]')
  ].filter(Boolean);
  
  for (const sel of selects) {
    const options = [...sel.options].map(o => norm(o.text));
    if (options.some(t => t.includes('individuel')) && 
        options.some(t => t.includes('couple'))) {
      return sel;
    }
  }
  
  // Recherche générique
  const allSelects = qa('select');
  for (const sel of allSelects) {
    const texts = [...sel.options].map(o => norm(o.text)).join(' ');
    if (texts.includes('individuel') && texts.includes('couple')) {
      return sel;
    }
  }
  
  return null;
}

/**
 * Lit la valeur depuis les radios
 */
function readFromRadio(grp) {
  if (!grp) return null;
  if (grp.individuel?.checked) return 'individuel';
  if (grp.couple?.checked) return 'couple';
  return null;
}

/**
 * Lit la valeur depuis le select
 */
function readFromSelect(sel) {
  if (!sel) return null;
  const selected = readSelect(sel);
  if (!selected) return null;
  const normText = norm(selected.text);
  if (normText.includes('individuel')) return 'individuel';
  if (normText.includes('couple')) return 'couple';
  return null;
}

/**
 * Lit le type de simulation actuel
 */
export function readSimulation() {
  const grp = findRadioGroup();
  if (grp) {
    const value = readFromRadio(grp);
    return success(value);
  }
  
  const sel = findSelectVariant();
  if (sel) {
    const value = readFromSelect(sel);
    return success(value);
  }
  
  return error(ERROR_CODES.NOT_FOUND, 'Aucun contrôle de type de simulation trouvé');
}

/**
 * Définit le type de simulation
 */
export async function setSimulation(value) {
  const normalized = norm(value);
  const isIndividuel = normalized.includes('indiv');
  const targetValue = isIndividuel ? 'individuel' : 'couple';
  
  // Essayer les radios
  const grp = findRadioGroup();
  if (grp) {
    const target = isIndividuel ? grp.individuel : grp.couple;
    if (!target) {
      return error(ERROR_CODES.NOT_FOUND, `Radio ${targetValue} non trouvé`);
    }
    
    if (!isVisible(target)) {
      return error(ERROR_CODES.HIDDEN, `Radio ${targetValue} masqué`);
    }
    
    if (target.checked) {
      return error(ERROR_CODES.ALREADY_SET, `Radio ${targetValue} déjà sélectionné`);
    }
    
    target.focus();
    clickHuman(target);
    await wait(50);
    
    if (!target.checked) {
      target.checked = true;
      target.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    await waitStable();
    return success({ method: 'radio', value: targetValue });
  }
  
  // Essayer le select
  const sel = findSelectVariant();
  if (sel) {
    const optIndex = [...sel.options].findIndex(o => {
      const t = norm(o.text);
      return isIndividuel ? t.includes('individuel') : t.includes('couple');
    });
    
    if (optIndex === -1) {
      return error(ERROR_CODES.NOT_FOUND, `Option ${targetValue} non trouvée dans le select`);
    }
    
    sel.selectedIndex = optIndex;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    await waitStable();
    return success({ method: 'select', value: targetValue });
  }
  
  return error(ERROR_CODES.NOT_FOUND, 'Aucun contrôle de type de simulation trouvé');
}

/**
 * Vérifie le type de simulation
 */
export function checkSimulation(expected) {
  const readResult = readSimulation();
  if (!readResult.ok) {
    return error(readResult.error.code, `Impossible de lire le type de simulation: ${readResult.error.message}`);
  }
  
  const got = readResult.data;
  const match = norm(got || '') === norm(expected || '');
  
  if (match) {
    return success({ champ: "simulation.type", got, expected });
  } else {
    return error(ERROR_CODES.VALUE_MISMATCH, `Type de simulation incorrect. Attendu: ${expected}, obtenu: ${got}`);
  }
}

/**
 * Diagnostique le type de simulation
 */
export function diagnoseSimulation(expected) {
  const grp = findRadioGroup();
  const sel = findSelectVariant();
  const readResult = readSimulation();
  const got = readResult.ok ? readResult.data : null;
  
  const diagnosis = {
    champ: "simulation.type",
    got,
    expected,
    controls: {
      radios: !!grp,
      select: !!sel
    }
  };
  
  if (!grp && !sel) {
    diagnosis.why = "Aucun contrôle trouvé (ni radios ni select)";
    return success(diagnosis);
  }
  
  if (grp) {
    if (!grp.individuel || !grp.couple) {
      diagnosis.why = "Groupe de radios incomplet";
      return success(diagnosis);
    }
    
    if (!isVisible(grp.individuel) || !isVisible(grp.couple)) {
      diagnosis.why = "Radios masqués";
      return success(diagnosis);
    }
    
    diagnosis.radioStates = {
      individuel: { visible: isVisible(grp.individuel), checked: grp.individuel.checked },
      couple: { visible: isVisible(grp.couple), checked: grp.couple.checked }
    };
  }
  
  if (sel) {
    diagnosis.selectVisible = isVisible(sel);
    if (!isVisible(sel)) {
      diagnosis.why = "Select masqué";
      return success(diagnosis);
    }
  }
  
  if (!readResult.ok) {
    diagnosis.why = `Erreur de lecture: ${readResult.error.message}`;
    return success(diagnosis);
  }
  
  if (norm(got || '') !== norm(expected || '')) {
    diagnosis.why = "Valeur différente de celle attendue";
    return success(diagnosis);
  }
  
  diagnosis.why = null;
  diagnosis.ok = true;
  return success(diagnosis);
}

// Export de l'API complète
export default {
  read: readSimulation,
  set: setSimulation,
  check: checkSimulation,
  diagnose: diagnoseSimulation
};