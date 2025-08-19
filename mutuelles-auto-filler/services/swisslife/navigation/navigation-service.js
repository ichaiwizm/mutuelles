/**
 * Service de navigation et bouton "Suivant"
 * Gère la progression dans le formulaire
 */

import { q, qa, isVisible, bringIntoView, clickHuman } from '../utils/dom-utils.js';
import { overlayPresent, wait, waitStable, waitOverlayGone } from '../utils/async-utils.js';

/**
 * Trouve les candidats pour le bouton "Suivant"
 */
function findCandidates() {
  const patterns = [
    // Sélecteurs directs
    'button[type="submit"]',
    '#btn-suivant', '#bouton-suivant', 
    '.btn-suivant', '.button-suivant',
    '[data-action="next"]', '[data-step="next"]',
    
    // Boutons avec texte
    'button', 'input[type="submit"]', 'input[type="button"]',
    'a[role="button"]', '[role="button"]'
  ];
  
  const candidates = [];
  
  for (const pattern of patterns) {
    qa(pattern).forEach(el => {
      const text = (el.innerText || el.value || el.textContent || '').toLowerCase().trim();
      const hasNext = /suivant|next|continuer|continue|valider|validate/.test(text);
      
      if (hasNext || pattern.includes('submit') || pattern.includes('suivant')) {
        candidates.push({
          element: el,
          text,
          priority: hasNext ? 1 : (pattern.includes('submit') ? 2 : 3),
          selector: pattern
        });
      }
    });
  }
  
  return candidates.sort((a, b) => a.priority - b.priority);
}

/**
 * Sélectionne le meilleur candidat
 */
function bestCandidate() {
  const candidates = findCandidates();
  
  // Priorité aux boutons visibles et non désactivés
  const viable = candidates.filter(c => 
    isVisible(c.element) && 
    !c.element.disabled &&
    !c.element.classList.contains('disabled')
  );
  
  if (viable.length === 0) return null;
  
  // Le premier viable avec la meilleure priorité
  return viable[0];
}

/**
 * Liste les erreurs de validation visibles
 */
function listVisibleErrors() {
  const errorSelectors = [
    '.error', '.has-error', '.is-invalid', '.field-error',
    '.alert-danger', '.alert-error', '.text-danger', '.text-error',
    '[class*="error"]', '[class*="invalid"]'
  ];
  
  const errors = [];
  
  errorSelectors.forEach(sel => {
    qa(sel).forEach(el => {
      if (isVisible(el)) {
        const text = (el.innerText || '').trim();
        if (text) {
          errors.push({
            element: el,
            text,
            selector: sel
          });
        }
      }
    });
  });
  
  return errors;
}

/**
 * Lit l'état du bouton "Suivant"
 */
export function read() {
  const candidate = bestCandidate();
  
  if (!candidate) {
    return {
      found: false,
      visible: false,
      disabled: null,
      text: null
    };
  }
  
  return {
    found: true,
    visible: isVisible(candidate.element),
    disabled: candidate.element.disabled || candidate.element.classList.contains('disabled'),
    text: candidate.text,
    element: candidate.element
  };
}

/**
 * Clique sur le bouton "Suivant"
 */
export async function click() {
  await waitOverlayGone();
  
  const candidate = bestCandidate();
  
  if (!candidate) {
    return { ok: false, reason: 'button_not_found' };
  }
  
  const { element } = candidate;
  
  if (!isVisible(element)) {
    return { ok: false, reason: 'button_hidden' };
  }
  
  if (element.disabled || element.classList.contains('disabled')) {
    return { ok: false, reason: 'button_disabled' };
  }
  
  // Vérifier les erreurs avant de cliquer
  const errors = listVisibleErrors();
  if (errors.length > 0) {
    return {
      ok: false,
      reason: 'validation_errors',
      errors: errors.map(e => e.text)
    };
  }
  
  bringIntoView(element);
  await wait(200);
  
  clickHuman(element);
  await wait(300);
  
  // Attendre la fin du chargement
  await waitStable();
  
  return { 
    ok: true, 
    clicked: candidate.text,
    waited: true
  };
}

/**
 * Vérification avancée avec synthèse
 */
export function checkAdvanced() {
  const r = read();
  const errors = listVisibleErrors();
  
  console.table([{
    present: r.found,
    visible: !!r.visible,
    disabled: !!r.disabled,
    text: r.text || '(?)',
    errors: errors.length
  }]);
  
  return { bouton: r, errors };
}

/**
 * Diagnostique détaillé
 */
export function diagnose() {
  const r = read();
  const issues = [];
  
  if (!r.found) {
    issues.push({
      what: 'button',
      why: 'introuvable',
      hint: 'Assure-toi d\'être dans la bonne iFrame/étape.'
    });
  } else {
    if (!r.visible) {
      issues.push({
        what: 'button',
        why: 'masqué',
        hint: 'Déplie la section ou scrolle dans la page.'
      });
    }
    
    if (r.disabled) {
      issues.push({
        what: 'button',
        why: 'désactivé',
        hint: 'Champ requis manquant ou étape non prête.'
      });
    }
  }
  
  const errors = listVisibleErrors();
  if (errors.length > 0) {
    issues.push({
      what: 'validation',
      why: 'erreurs_visibles',
      errors: errors.map(e => e.text)
    });
  }
  
  if (overlayPresent()) {
    issues.push({
      what: 'ui',
      why: 'overlay_en_cours'
    });
  }
  
  return { read: r, issues };
}

/**
 * Attendre que le bouton soit prêt
 */
export async function waitReady(timeout = 10000) {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    const state = read();
    
    if (state.found && state.visible && !state.disabled) {
      const errors = listVisibleErrors();
      if (errors.length === 0 && !overlayPresent()) {
        return { ready: true, waited: Date.now() - start };
      }
    }
    
    await wait(200);
  }
  
  return { ready: false, timeout: true };
}

/**
 * Navigation intelligente avec retry
 */
export async function smartClick(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🔄 Tentative ${attempt}/${maxRetries} de navigation...`);
    
    // Attendre que le bouton soit prêt
    const readyState = await waitReady(5000);
    if (!readyState.ready) {
      console.log(`⏳ Bouton non prêt après attente`);
      if (attempt === maxRetries) {
        return { ok: false, reason: 'button_not_ready', attempts: attempt };
      }
      continue;
    }
    
    // Tenter le clic
    const clickResult = await click();
    if (clickResult.ok) {
      console.log(`✅ Navigation réussie`);
      return { ok: true, attempts: attempt, ...clickResult };
    }
    
    console.log(`❌ Échec tentative ${attempt}:`, clickResult.reason);
    
    if (attempt < maxRetries) {
      await wait(1000);
    }
  }
  
  return { ok: false, reason: 'max_retries_exceeded', attempts: maxRetries };
}

// Export de l'API complète
export default {
  read,
  click,
  checkAdvanced,
  diagnose,
  waitReady,
  smartClick,
  listVisibleErrors
};