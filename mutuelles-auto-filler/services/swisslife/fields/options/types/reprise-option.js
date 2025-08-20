/**
 * Option Reprise de Concurrence - Gestion des radio buttons de reprise de concurrence
 * Responsable de la détection, lecture et définition de l'option reprise de concurrence
 */

import { q, isVisible, labelFor, clickHuman } from '../../../utils/dom-utils.js';
import { wait, waitStable } from '../../../utils/async-utils.js';

// IDs spécifiques SwissLife
const ID_REPRISE_OUI = '#reprise-concurrence-oui';
const ID_REPRISE_NON = '#reprise-concurrence-non';

/**
 * Trouve le groupe reprise de concurrence (radio buttons)
 */
export function getRepriseGroup() {
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
 * Lit l'état de reprise de concurrence actuel
 */
export function readReprise() {
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
 * Définit l'option de reprise de concurrence
 */
export async function setReprise(value) {
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

/**
 * Valide la configuration de reprise de concurrence
 */
export function validateRepriseConfig(value) {
  if (value === undefined || value === null) {
    return { valid: true, normalized: null };
  }
  
  const normalized = /^oui$/i.test(String(value)) ? 'oui' : 'non';
  return { valid: true, normalized };
}

/**
 * Diagnostique l'état de l'option reprise de concurrence
 */
export function diagnoseReprise() {
  const group = getRepriseGroup();
  const issues = [];
  
  if (!group) {
    issues.push({
      severity: 'error',
      type: 'missing_group',
      message: 'Groupe radio reprise de concurrence introuvable'
    });
    return { healthy: false, issues };
  }
  
  if (!group.oui) {
    issues.push({
      severity: 'error',
      type: 'missing_oui',
      message: 'Radio "Oui" reprise de concurrence introuvable'
    });
  }
  
  if (!group.non) {
    issues.push({
      severity: 'error',
      type: 'missing_non',
      message: 'Radio "Non" reprise de concurrence introuvable'
    });
  }
  
  if (group.oui && !isVisible(group.oui)) {
    issues.push({
      severity: 'warning',
      type: 'hidden_oui',
      message: 'Radio "Oui" reprise de concurrence non visible'
    });
  }
  
  if (group.non && !isVisible(group.non)) {
    issues.push({
      severity: 'warning',
      type: 'hidden_non',
      message: 'Radio "Non" reprise de concurrence non visible'
    });
  }
  
  return { 
    healthy: issues.length === 0, 
    issues,
    group
  };
}