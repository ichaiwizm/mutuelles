/**
 * Service de gestion du type de simulation
 * Gère la sélection individuel/couple dans le formulaire SwissLife
 */

import { q, qa, isVisible, clickHuman } from '../utils/dom-utils.js';
import { norm, readSelect } from '../utils/form-utils.js';
import { wait, waitStable } from '../utils/async-utils.js';

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
  if (grp) return readFromRadio(grp);
  
  const sel = findSelectVariant();
  if (sel) return readFromSelect(sel);
  
  return null;
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
      return { ok: false, reason: 'radio_not_found', value: targetValue };
    }
    
    if (!isVisible(target)) {
      return { ok: false, reason: 'radio_hidden', value: targetValue };
    }
    
    if (target.checked) {
      return { ok: true, already: true };
    }
    
    target.focus();
    clickHuman(target);
    await wait(50);
    
    if (!target.checked) {
      target.checked = true;
      target.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    await waitStable();
    return { ok: true, method: 'radio' };
  }
  
  // Essayer le select
  const sel = findSelectVariant();
  if (sel) {
    const optIndex = [...sel.options].findIndex(o => {
      const t = norm(o.text);
      return isIndividuel ? t.includes('individuel') : t.includes('couple');
    });
    
    if (optIndex === -1) {
      return { ok: false, reason: 'option_not_found', value: targetValue };
    }
    
    sel.selectedIndex = optIndex;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    await waitStable();
    return { ok: true, method: 'select' };
  }
  
  return { ok: false, reason: 'no_control_found' };
}

/**
 * Vérifie le type de simulation
 */
export function checkSimulation(expected) {
  const got = readSimulation();
  const ok = norm(got || '') === norm(expected || '');
  const res = { champ: "simulation.type", ok, got, expected };
  console.table([res]);
  return res;
}

/**
 * Diagnostique le type de simulation
 */
export function diagnoseSimulation(expected) {
  const grp = findRadioGroup();
  const sel = findSelectVariant();
  const got = readSimulation();
  
  if (!grp && !sel) {
    return {
      champ: "simulation.type",
      got,
      expected,
      why: "Aucun contrôle trouvé (ni radios ni select)"
    };
  }
  
  if (grp) {
    if (!grp.individuel || !grp.couple) {
      return {
        champ: "simulation.type",
        got,
        expected,
        why: "Groupe de radios incomplet"
      };
    }
    
    if (!isVisible(grp.individuel) || !isVisible(grp.couple)) {
      return {
        champ: "simulation.type",
        got,
        expected,
        why: "Radios masqués"
      };
    }
  }
  
  if (sel && !isVisible(sel)) {
    return {
      champ: "simulation.type",
      got,
      expected,
      why: "Select masqué"
    };
  }
  
  if (norm(got || '') !== norm(expected || '')) {
    return {
      champ: "simulation.type",
      got,
      expected,
      why: "Valeur différente de celle attendue"
    };
  }
  
  return {
    champ: "simulation.type",
    got,
    expected,
    why: null,
    ok: true
  };
}

// Export de l'API complète
export default {
  read: readSimulation,
  set: setSimulation,
  check: checkSimulation,
  diagnose: diagnoseSimulation
};