/**
 * Utilitaires asynchrones pour SwissLife
 * Gestion de l'attente et de la stabilité DOM
 */

import { q } from './dom-utils.js';

// Attente simple
export const wait = (ms) => new Promise(r => setTimeout(r, ms));

// Détection d'overlay
export const overlayPresent = () => {
  return !!(q('.blockUI.blockOverlay') || q('.blockUI.blockMsg') || 
            q('.loader') || q('.loading') || q('[class*="spinner"]'));
};

// Attente de disparition d'overlay
export const waitOverlayGone = async (timeout = 4000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (!overlayPresent()) return true;
    await wait(100);
  }
  return !overlayPresent();
};

// Attente de stabilité DOM
export const waitStable = async ({ minQuiet = 300, maxWait = 3000 } = {}) => {
  const t0 = Date.now();
  let lastMutation = Date.now();
  let observer = null;
  
  return new Promise((resolve) => {
    const check = () => {
      const elapsed = Date.now() - t0;
      const quiet = Date.now() - lastMutation;
      
      if (quiet >= minQuiet || elapsed >= maxWait) {
        if (observer) observer.disconnect();
        resolve(true);
      } else {
        setTimeout(check, 50);
      }
    };
    
    try {
      observer = new MutationObserver(() => {
        lastMutation = Date.now();
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class', 'disabled', 'readonly']
      });
    } catch (e) {
      console.warn('MutationObserver failed:', e);
    }
    
    check();
  });
};

// Attente combinée (overlay + stabilité)
export const waitReady = async () => {
  await waitOverlayGone();
  await waitStable();
  return true;
};

// Retry avec délai
export const retryWithDelay = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (e) {
      if (i === maxRetries - 1) throw e;
    }
    await wait(delay);
  }
  return null;
};

// Polling jusqu'à condition
export const pollUntil = async (condition, timeout = 5000, interval = 100) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (condition()) return true;
    await wait(interval);
  }
  return false;
};