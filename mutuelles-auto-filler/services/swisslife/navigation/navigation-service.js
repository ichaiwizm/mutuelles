/**
 * Service de navigation et bouton "Suivant"
 * Gère la progression dans le formulaire
 */

import { q, qa, isVisible, bringIntoView, clickHuman } from '../utils/dom-utils.js';
import { overlayPresent, wait, waitStable, waitOverlayGone } from '../utils/async-utils.js';

/**
 * Trouve les candidats pour le bouton "Suivant" - LOGIQUE DU SCRIPT MANUEL QUI FONCTIONNE
 */
function findCandidates() {
  const texts = /^(suivant|suite|continuer|page\s*suivante)$/i;
  const ids   = /(bt-)?suite|suivant|next/i;
  
  const cand = new Set();
  
  // 1) IDs connus SwissLife vus dans les captures
  const knownIds = ['#bt-suite-projet', '#bt-suite-confortHospitalisation', '#bt-souscription-suite'];
  knownIds.forEach(sel => {
    const el = q(sel);
    if (el) cand.add(el);
  });
  
  // 2) Boutons/inputs/links avec texte "Suivant"/"Suite"/"Continuer"
  qa('button, a, [role="button"], input[type="button"], input[type="submit"]')
    .forEach(n => {
      const label = (n.innerText || n.value || n.getAttribute('aria-label') || '').replace(/\s+/g,' ').trim();
      if (texts.test(label)) cand.add(n);
    });
  
  // 3) IDs/classes évoquant "suite/suivant"
  qa('*[id], *[class]').forEach(n => {
    const id = n.id || '', cls = n.className || '';
    if (ids.test(id) || ids.test(cls)) cand.add(n);
  });
  
  // Filtre: visibles seulement
  return [...cand].filter(isVisible);
}

/**
 * Sélectionne le meilleur candidat - LOGIQUE DU SCRIPT MANUEL
 */
function bestCandidate() {
  const list = findCandidates();
  if (!list.length) return null;
  
  // Fonction utilitaire pour vérifier si désactivé (comme script manuel)
  function isDisabled(el) {
    if (!el) return true;
    const st = getComputedStyle(el);
    return !!(
      el.disabled || 
      el.getAttribute('aria-disabled') === 'true' || 
      /\b(disable|desactive|disabled)\b/i.test(el.className || '') || 
      st.pointerEvents === 'none'
    );
  }
  
  // Filtre: non désactivés
  const viable = list.filter(el => !isDisabled(el));
  if (!viable.length) return null;
  
  // Heuristique: privilégier <button> puis <a> puis <input> (comme script manuel)
  const rank = el => el.tagName === 'BUTTON' ? 0 : (el.tagName === 'A' ? 1 : 2);
  viable.sort((a, b) => rank(a) - rank(b));
  
  return viable[0];
}

/**
 * Liste les erreurs de validation visibles - LOGIQUE DU SCRIPT MANUEL SWISSLIFE
 */
function listVisibleErrors() {
  const sel = 'label.error, .error, .has-error, .field-error, .text-danger, .help-block, .message-erreur, .error-block, [aria-invalid="true"]';
  const out = [];
  
  qa(sel).forEach(n => {
    if (!isVisible(n)) return;
    
    // Remonter à la zone (comme script manuel)
    let p = n, label = null, input = null;
    for (let i = 0; i < 4 && p; i++, p = p.parentElement) {
      label = label || p.querySelector?.('label');
      input = input || p.querySelector?.('input,select,textarea');
    }
    
    const msg = (n.innerText || n.getAttribute('title') || n.getAttribute('data-original-title') || '').replace(/\s+/g, ' ').trim();
    if (msg) {
      out.push({
        msg,
        nearLabel: (label?.innerText || '').replace(/\s+/g, ' ').trim(),
        inputId: input?.id || null,
        inputName: input?.name || null
      });
    }
  });
  
  // Attributs errormessagelbl (site SwissLife spécifique)
  qa('input[errormessagelbl], select[errormessagelbl], textarea[errormessagelbl]').forEach(el => {
    const invalid = el.classList.contains('error') || el.getAttribute('aria-invalid') === 'true';
    if (invalid && isVisible(el)) {
      out.push({ 
        msg: (el.getAttribute('errormessagelbl') || '').replace(/\s+/g, ' ').trim(), 
        nearLabel: '', 
        inputId: el.id || null, 
        inputName: el.name || null 
      });
    }
  });
  
  return out;
}

/**
 * Lit l'état du bouton "Suivant"
 */
export function read() {
  const el = bestCandidate();
  
  if (!el) {
    return {
      found: false,
      visible: false,
      disabled: null,
      text: null
    };
  }
  
  // Fonction isDisabled locale (comme script manuel)
  function isDisabled(element) {
    if (!element) return true;
    const st = getComputedStyle(element);
    return !!(
      element.disabled || 
      element.getAttribute('aria-disabled') === 'true' || 
      /\b(disable|desactive|disabled)\b/i.test(element.className || '') || 
      st.pointerEvents === 'none'
    );
  }
  
  return {
    found: true,
    id: el.id || null,
    tag: el.tagName.toLowerCase(),
    text: (el.innerText || el.value || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim(),
    visible: isVisible(el),
    disabled: isDisabled(el),
    className: el.className || ''
  };
}

/**
 * Clique sur le bouton "Suivant"
 */
export async function click() {
  await waitOverlayGone();
  
  const el = bestCandidate();
  
  if (!el) {
    return { ok: false, reason: 'button_not_found' };
  }
  
  if (!isVisible(el)) {
    return { ok: false, reason: 'button_hidden' };
  }
  
  // Vérification d'état simple comme le script manuel
  if (el.disabled) {
    return { ok: false, reason: 'button_disabled' };
  }

  // Clic avec logique exacte du script manuel
  bringIntoView(el);
  clickHuman(el);
  await wait(100);
  await waitOverlayGone();
  await waitStable();
  
  const errors = listVisibleErrors();
  return { 
    ok: errors.length === 0, 
    after: read(), 
    errors 
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