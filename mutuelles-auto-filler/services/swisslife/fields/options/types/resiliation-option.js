/**
 * Option Résiliation - Gestion des radio buttons de résiliation
 * Responsable de la détection, lecture et définition de l'option résiliation
 */

import { q, isVisible, labelFor, clickHuman } from '../../../utils/dom-utils.js';
import { wait, waitStable } from '../../../utils/async-utils.js';

// IDs spécifiques SwissLife - VRAIS SÉLECTEURS
const ID_RESILIATION_OUI = 'resiliation-contrat-oui';
const ID_RESILIATION_NON = 'resiliation-contrat-non';
const NAME_RESILIATION = 'contratSante.resiliationContrat';

/**
 * Trouve le groupe résiliation (radio buttons) - LOGIQUE EXACTE DU SCRIPT MANUEL
 */
export function getResiliationGroup() {
  const oui = document.getElementById(ID_RESILIATION_OUI);
  const non = document.getElementById(ID_RESILIATION_NON);
  
  // Vérification stricte du name
  const okName = el => el && el.name === NAME_RESILIATION;
  const valid = okName(oui) && okName(non);
  
  if (valid) {
    return { oui, non, valid: true };
  }
  
  console.log('❌ Résiliation - IDs ou names incorrects:', {
    oui: oui ? `${oui.id} (name: ${oui.name})` : 'non trouvé',
    non: non ? `${non.id} (name: ${non.name})` : 'non trouvé',
    expectedName: NAME_RESILIATION
  });
  
  return { oui: null, non: null, valid: false };
}

/**
 * Lit l'état de résiliation actuel
 */
export function readResiliation() {
  const group = getResiliationGroup();
  if (!group?.valid) return { found: false };
  
  return {
    found: true,
    value: group.oui?.checked ? 'oui' : (group.non?.checked ? 'non' : null),
    ouiVisible: isVisible(group.oui),
    nonVisible: isVisible(group.non)
  };
}

/**
 * Définit l'option de résiliation - LOGIQUE DU SCRIPT MANUEL QUI FONCTIONNE
 */
export async function setResiliation(value) {
  console.log('🔍 setResiliation - valeur reçue:', value);
  const group = getResiliationGroup();
  
  if (!group?.valid) {
    console.log('❌ setResiliation - groupe non trouvé ou invalide');
    return { ok: false, reason: 'group_not_found' };
  }
  
  const targetId = /^oui$/i.test(value) ? ID_RESILIATION_OUI : ID_RESILIATION_NON;
  const target = document.getElementById(targetId);
  console.log('🔍 setResiliation - target:', target);
  
  if (!target) {
    console.log('❌ setResiliation - target radio non trouvé');
    return { ok: false, reason: 'target_radio_not_found' };
  }
  
  const label = labelFor(target);
  const clickable = (label && isVisible(label)) ? label : target;
  console.log('🔍 setResiliation - clickable:', clickable);
  
  if (!isVisible(clickable)) {
    console.log('❌ setResiliation - clickable masqué');
    return { ok: false, reason: 'target_hidden' };
  }
  
  if (target.disabled) {
    console.log('❌ setResiliation - target désactivé');
    return { ok: false, reason: 'disabled' };
  }
  
  if (target.checked) {
    console.log('✅ setResiliation - déjà dans le bon état');
    return { ok: true, already: true };
  }
  
  // Clic réaliste comme dans le script manuel
  console.log('🔧 setResiliation - déclenchement des événements...');
  clickable.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  clickable.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
  clickable.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
  clickable.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  
  target.dispatchEvent(new Event('input', { bubbles: true }));
  target.dispatchEvent(new Event('change', { bubbles: true }));
  
  await wait(60);
  await waitStable();
  
  console.log('✅ setResiliation - résultat final, checked:', target.checked);
  return { 
    ok: target.checked, 
    value,
    clicked: clickable === label ? 'label' : 'radio'
  };
}

/**
 * Valide la configuration de résiliation
 */
export function validateResiliationConfig(value) {
  if (value === undefined || value === null) {
    return { valid: true, normalized: null };
  }
  
  const normalized = /^oui$/i.test(String(value)) ? 'oui' : 'non';
  return { valid: true, normalized };
}

/**
 * Diagnostique l'état de l'option résiliation
 */
export function diagnoseResiliation() {
  const group = getResiliationGroup();
  const issues = [];
  
  if (!group) {
    issues.push({
      severity: 'error',
      type: 'missing_group',
      message: 'Groupe radio résiliation introuvable'
    });
    return { healthy: false, issues };
  }
  
  if (!group.oui) {
    issues.push({
      severity: 'error',
      type: 'missing_oui',
      message: 'Radio "Oui" résiliation introuvable'
    });
  }
  
  if (!group.non) {
    issues.push({
      severity: 'error',
      type: 'missing_non',
      message: 'Radio "Non" résiliation introuvable'
    });
  }
  
  if (group.oui && !isVisible(group.oui)) {
    issues.push({
      severity: 'warning',
      type: 'hidden_oui',
      message: 'Radio "Oui" résiliation non visible'
    });
  }
  
  if (group.non && !isVisible(group.non)) {
    issues.push({
      severity: 'warning',
      type: 'hidden_non',
      message: 'Radio "Non" résiliation non visible'
    });
  }
  
  return { 
    healthy: issues.length === 0, 
    issues,
    group
  };
}