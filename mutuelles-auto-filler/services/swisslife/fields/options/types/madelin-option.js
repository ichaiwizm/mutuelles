/**
 * Option Loi Madelin - Gestion de la checkbox Loi Madelin
 * Responsable de la détection, lecture et définition de l'option Madelin
 */

import { q, isVisible, labelFor, clickHuman } from '../../../utils/dom-utils.js';
import { wait, waitStable } from '../../../utils/async-utils.js';

/**
 * Trouve la checkbox Madelin
 */
export function findMadelinBox() {
  const selectors = [
    '#loi-madelin-checkbox',  // Le vrai sélecteur SwissLife
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
 * Lit l'état Madelin actuel
 */
export function readMadelin() {
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
 * Définit l'état de la Loi Madelin
 */
export async function setMadelin(value) {
  console.log('🔍 setMadelin - valeur reçue:', value);
  const targetChecked = /^(true|1|oui|yes)$/i.test(String(value));
  console.log('🔍 setMadelin - targetChecked:', targetChecked);
  const checkbox = findMadelinBox();
  console.log('🔍 setMadelin - checkbox trouvée:', checkbox);
  
  if (!checkbox) {
    console.log('❌ setMadelin - checkbox non trouvée');
    return { ok: false, reason: 'checkbox_not_found' };
  }
  
  if (!isVisible(checkbox)) {
    console.log('❌ setMadelin - checkbox masquée');
    return { ok: false, reason: 'checkbox_hidden' };
  }
  
  if (checkbox.checked === targetChecked) {
    console.log('✅ setMadelin - déjà dans le bon état');
    return { ok: true, already: true };
  }
  
  const label = labelFor(checkbox);
  const clickable = (label && isVisible(label)) ? label : checkbox;
  console.log('🔍 setMadelin - clickable:', clickable);
  
  clickHuman(clickable);
  await wait(50);
  
  if (checkbox.checked !== targetChecked) {
    checkbox.checked = targetChecked;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
  }
  
  await waitStable();
  
  console.log('✅ setMadelin - résultat final, checked:', checkbox.checked);
  return { 
    ok: true, 
    nowChecked: checkbox.checked,
    clicked: clickable === label ? 'label' : 'checkbox'
  };
}

/**
 * Valide la configuration Madelin
 */
export function validateMadelinConfig(value) {
  if (value === undefined || value === null) {
    return { valid: true, normalized: false };
  }
  
  const normalized = /^(true|1|oui|yes)$/i.test(String(value));
  return { valid: true, normalized };
}

/**
 * Diagnostique l'état de l'option Madelin
 */
export function diagnoseMadelin() {
  const checkbox = findMadelinBox();
  const issues = [];
  
  if (!checkbox) {
    issues.push({
      severity: 'error',
      type: 'missing_element',
      message: 'Checkbox Loi Madelin introuvable'
    });
    return { healthy: false, issues };
  }
  
  if (!isVisible(checkbox)) {
    const label = labelFor(checkbox);
    if (!label || !isVisible(label)) {
      issues.push({
        severity: 'warning',
        type: 'hidden_element',
        message: 'Checkbox et label Madelin non visibles'
      });
    }
  }
  
  if (checkbox.disabled) {
    issues.push({
      severity: 'warning',
      type: 'disabled_element',
      message: 'Checkbox Madelin désactivée'
    });
  }
  
  return { 
    healthy: issues.length === 0, 
    issues,
    element: checkbox
  };
}