/**
 * Service de gestion des gammes d'assurance
 * Gère la sélection de gamme via select ou radios/tiles
 */

import { q, qa, isVisible, clickHuman, fireMultiple } from '../utils/dom-utils.js';
import { readSelect } from '../utils/form-utils.js';
import { wait, waitStable, waitOverlayGone } from '../utils/async-utils.js';

// Fonctions de normalisation copiées du script manuel qui fonctionne
const T = s => (s||"").toString().replace(/\s+/g," ").trim();
const norm = s => T(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();

const DEFAULT_CFG = { want: "SwissLife Santé" };

/**
 * Trouve le select de gamme
 */
function findGammeSelect() {
  const selectors = [
    '#selection-produit-sante',  // Le vrai sélecteur SwissLife
    '[name="contratSante.produitId"]',  // Le vrai name d'après ton script
    '#gamme-assurance', '#select-gamme', '[name="gamme"]',
    '[name="produit"]', '#produit-selection'
  ];
  
  for (const sel of selectors) {
    const el = q(sel);
    if (el && el.tagName === 'SELECT') return el;
  }
  
  // Recherche générique
  return qa('select').find(sel => maybeLooksLikeGamme(sel));
}

/**
 * Test si un select ressemble à une sélection de gamme
 */
function maybeLooksLikeGamme(sel) {
  const texts = [...sel.options].map(o => o.text.toLowerCase()).join(' ');
  return texts.includes('santé') || texts.includes('sante') || 
         texts.includes('swiss') || texts.includes('gamme');
}

/**
 * Trouve les radios ou tiles de gamme
 */
function findGammeRadiosOrTiles() {
  // Pattern 1: Radios avec gamme dans le name
  const radios = qa('input[type="radio"][name*="gamme"], input[type="radio"][name*="produit"]');
  if (radios.length > 0) {
    return { type: 'radios', elements: radios };
  }
  
  // Pattern 2: Éléments cliquables avec gamme
  const clickables = qa('.gamme-option, .produit-option, .tile-gamme, [data-gamme]');
  if (clickables.length > 0) {
    return { type: 'tiles', elements: clickables };
  }
  
  // Pattern 3: Recherche par contenu textuel
  const candidates = qa('div, button, label, [role="button"]').filter(el => {
    const txt = (el.innerText || '').toLowerCase();
    return txt.includes('swiss') && txt.includes('santé');
  });
  
  if (candidates.length > 0) {
    return { type: 'text-based', elements: candidates };
  }
  
  return null;
}

/**
 * Liste toutes les gammes disponibles
 */
export function list() {
  const select = findGammeSelect();
  if (select) {
    return [...select.options].map(o => ({
      type: 'option',
      value: o.value,
      text: o.text
    }));
  }
  
  const group = findGammeRadiosOrTiles();
  if (group) {
    return group.elements.map(el => ({
      type: group.type,
      value: el.value || el.dataset.value || el.innerText,
      text: el.innerText || el.alt || el.title || ''
    }));
  }
  
  return [];
}

/**
 * Actualise la liste après changements
 */
export async function refresh() {
  await waitOverlayGone();
  await waitStable({ minQuiet: 500 });
  
  const newList = list();
  console.log("🔄 Gammes disponibles:", newList);
  return newList;
}

/**
 * Définit la gamme via select - LOGIQUE COPIÉE DU SCRIPT MANUEL QUI FONCTIONNE
 */
function setSelect(sel, target) {
  const w = norm(target);
  const opts = [...sel.options];
  let idx = opts.findIndex(o => norm(o.value||"")===w);
  if (idx<0) idx = opts.findIndex(o => norm(o.text||"")===w);
  if (idx<0) {
    console.log('❌ gammes-service.setSelect - option non trouvée:', target);
    console.log('Options disponibles:', opts.map(o=>({value:o.value, text:T(o.text||"")})));
    return {ok:false, reason:"option_not_found", options: opts.map(o=>({value:o.value, text:T(o.text||"")}))};
  }
  
  console.log(`✅ gammes-service.setSelect - option trouvée à l'index ${idx}:`, {value: opts[idx].value, text: opts[idx].text});
  sel.selectedIndex = idx; 
  fireMultiple(sel);
  return {ok:true, got: readSelect(sel)};
}

/**
 * Définit la gamme via radios ou tiles
 */
async function setRadiosOrTiles(grp, target) {
  const targetLower = target.toLowerCase();
  
  for (const el of grp.elements) {
    const text = (el.innerText || el.value || '').toLowerCase();
    
    if (text.includes('swiss') && text.includes('santé')) {
      if (!isVisible(el)) continue;
      
      if (el.type === 'radio') {
        el.checked = true;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        clickHuman(el);
      }
      
      await waitStable();
      return { ok: true, method: grp.type, element: el.tagName };
    }
  }
  
  return { ok: false, reason: 'no_matching_element' };
}

/**
 * Définit la gamme
 */
export async function set(target = DEFAULT_CFG.want) {
  await waitOverlayGone();
  
  const select = findGammeSelect();
  if (select && isVisible(select)) {
    return setSelect(select, target);
  }
  
  const group = findGammeRadiosOrTiles();
  if (group) {
    return await setRadiosOrTiles(group, target);
  }
  
  return { ok: false, reason: 'no_control_found' };
}

/**
 * Lit la gamme sélectionnée
 */
export function read() {
  const select = findGammeSelect();
  if (select) {
    const selected = readSelect(select);
    return selected?.text || null;
  }
  
  const group = findGammeRadiosOrTiles();
  if (group && group.type === 'radios') {
    const checked = group.elements.find(r => r.checked);
    return checked ? (checked.innerText || checked.value) : null;
  }
  
  if (group && group.type === 'tiles') {
    const active = group.elements.find(el => 
      el.classList.contains('active') || 
      el.classList.contains('selected') ||
      el.getAttribute('aria-selected') === 'true'
    );
    return active ? active.innerText : null;
  }
  
  return null;
}

/**
 * Vérifie la gamme
 */
export function check(expected = DEFAULT_CFG.want) {
  const got = read();
  const ok = got && got.toLowerCase().includes(expected.toLowerCase());
  
  console.table([{ 
    champ: 'gamme', 
    ok, 
    got, 
    expected 
  }]);
  
  return { champ: 'gamme', ok, got, expected };
}

/**
 * Diagnostique
 */
export function diagnose(expected = DEFAULT_CFG.want) {
  const select = findGammeSelect();
  const group = findGammeRadiosOrTiles();
  const got = read();
  
  if (!select && !group) {
    return {
      champ: 'gamme',
      got,
      expected,
      why: "Aucun contrôle de gamme trouvé"
    };
  }
  
  if (select && !isVisible(select)) {
    return {
      champ: 'gamme',
      got,
      expected,
      why: "Select de gamme masqué"
    };
  }
  
  if (group && !group.elements.some(isVisible)) {
    return {
      champ: 'gamme',
      got,
      expected,
      why: "Tous les éléments de gamme sont masqués"
    };
  }
  
  if (!got) {
    return {
      champ: 'gamme',
      got,
      expected,
      why: "Aucune gamme sélectionnée"
    };
  }
  
  const match = got.toLowerCase().includes(expected.toLowerCase());
  if (!match) {
    return {
      champ: 'gamme',
      got,
      expected,
      why: "Gamme différente de celle attendue"
    };
  }
  
  return {
    champ: 'gamme',
    got,
    expected,
    why: null,
    ok: true
  };
}

// Export de l'API complète
export default {
  list,
  refresh,
  set,
  read,
  check,
  diagnose
};