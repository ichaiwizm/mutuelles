/**
 * Utilitaires DOM pour SwissLife
 * Fonctions communes pour manipulation du DOM
 */

// Sélecteurs sécurisés (utilisent document du contexte actuel)
export const q = sel => { 
  try { 
    return document.querySelector(sel); 
  } 
  catch { return null; } 
};

export const qa = sel => { 
  try { 
    return [...document.querySelectorAll(sel)]; 
  } 
  catch { return []; } 
};

// Test de visibilité
export const isVisible = (el) => {
  if (!el) return false;
  const visible = !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  if (!visible) return false;
  
  const style = getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
  
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};

// Raison de non-visibilité
export const hiddenReason = (el) => {
  if (!el) return "element_null";
  if (!el.offsetParent && el.tagName !== 'BODY') return "no_offsetParent";
  const style = getComputedStyle(el);
  if (style.display === 'none') return "display_none";
  if (style.visibility === 'hidden') return "visibility_hidden";
  if (style.opacity === '0') return "opacity_0";
  const rect = el.getBoundingClientRect();
  if (!rect.width || !rect.height) return "zero_dimensions";
  return null;
};

// Mise en évidence visuelle
export const highlight = (el) => {
  if (!el) return;
  const old = el.style.cssText;
  el.style.cssText += '; outline: 3px solid red !important; outline-offset: 2px !important;';
  setTimeout(() => { el.style.cssText = old; }, 2000);
};

// Dispatch d'événements
export const fire = (el, type) => {
  if (!el) return;
  el.dispatchEvent(new Event(type, { bubbles: true }));
};

export const fireMultiple = (el, types = ['input', 'change', 'blur']) => {
  types.forEach(type => fire(el, type));
};

// Dispatch d'événements humains
export const dispatchHumanChange = (el) => {
  if (!el) return;
  const mkK = (type, key) => new KeyboardEvent(type, {bubbles:true, cancelable:true, key});
  el.dispatchEvent(mkK('keydown', 'Tab'));
  el.dispatchEvent(mkK('keyup', 'Tab'));
  fireMultiple(el);
};

// Click humain
export const clickHuman = (el) => {
  if (!el) return;
  const mk = (type) => new MouseEvent(type, {bubbles:true, cancelable:true, view:window});
  el.dispatchEvent(mk('mousedown'));
  el.dispatchEvent(mk('mouseup'));
  el.dispatchEvent(mk('click'));
};

// Scroll vers l'élément
export const bringIntoView = (el) => { 
  try { 
    el?.scrollIntoView?.({block:'center', behavior: 'smooth'}); 
  } catch {} 
};

// Recherche de label associé
export const labelFor = (input) => {
  if (!input) return null;
  if (input.id) {
    return document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
  }
  return input.closest?.('label') || null;
};