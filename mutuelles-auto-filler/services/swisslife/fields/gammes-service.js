/**
 * Service de gestion des gammes d'assurance
 * Gère la sélection de gamme via select ou radios/tiles
 */

import { q, qa, isVisible, clickHuman, fireMultiple } from '../utils/dom-utils.js';
import { readSelect } from '../utils/form-utils.js';
import { wait, waitStable, waitOverlayGone } from '../utils/async-utils.js';
import { success, error, ERROR_CODES } from '../utils/response-format.js';

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
  console.log('Gammes disponibles après refresh', newList);
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
    const availableOptions = opts.map(o=>({value:o.value, text:T(o.text||"")}));
    console.error('Option non trouvée dans select', { target, availableOptions });
    return error('OPTION_NOT_FOUND', `Option "${target}" non trouvée dans le select gamme`);
  }
  
  const selectedOption = {value: opts[idx].value, text: opts[idx].text};
  console.log('Option trouvée et sélectionnée', { index: idx, option: selectedOption });
  sel.selectedIndex = idx; 
  fireMultiple(sel);
  return success(readSelect(sel));
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
      return success({ method: grp.type, element: el.tagName, text: el.innerText || el.value });
    }
  }
  
  return error('NO_MATCHING_ELEMENT', 'Aucun élément correspondant à "SwissLife Santé" trouvé');
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
  
  return error(ERROR_CODES.NOT_FOUND, 'Aucun contrôle de gamme trouvé');
}

/**
 * Lit la gamme sélectionnée
 */
export function read() {
  const select = findGammeSelect();
  if (select) {
    const selected = readSelect(select);
    return success(selected?.text || null);
  }
  
  const group = findGammeRadiosOrTiles();
  if (group && group.type === 'radios') {
    const checked = group.elements.find(r => r.checked);
    return success(checked ? (checked.innerText || checked.value) : null);
  }
  
  if (group && group.type === 'tiles') {
    const active = group.elements.find(el => 
      el.classList.contains('active') || 
      el.classList.contains('selected') ||
      el.getAttribute('aria-selected') === 'true'
    );
    return success(active ? active.innerText : null);
  }
  
  return error(ERROR_CODES.NOT_FOUND, 'Aucun contrôle de gamme trouvé pour lecture');
}

/**
 * Vérifie la gamme
 */
export function check(expected = DEFAULT_CFG.want) {
  const readResult = read();
  if (!readResult.ok) {
    return readResult;
  }
  
  const got = readResult.data;
  const ok = got && got.toLowerCase().includes(expected.toLowerCase());
  
  if (ok) {
    return success({ field: 'gamme', current: got, expected });
  } else {
    return error(ERROR_CODES.VALUE_MISMATCH, `Gamme attendue: "${expected}", trouvée: "${got || 'aucune'}"`);
  }
}

/**
 * Diagnostique
 */
export function diagnose(expected = DEFAULT_CFG.want) {
  const select = findGammeSelect();
  const group = findGammeRadiosOrTiles();
  const readResult = read();
  const got = readResult.ok ? readResult.data : null;
  
  const diagnosis = {
    field: 'gamme',
    controls: {
      select: { found: !!select, visible: select ? isVisible(select) : false },
      group: { found: !!group, visible: group ? group.elements.some(isVisible) : false }
    },
    value: {
      current: got,
      expected,
      matches: got && got.toLowerCase().includes(expected.toLowerCase())
    }
  };
  
  if (!select && !group) {
    return error(ERROR_CODES.NOT_FOUND, 'Aucun contrôle de gamme trouvé');
  }
  
  if (select && !isVisible(select)) {
    return error(ERROR_CODES.HIDDEN, 'Select de gamme masqué');
  }
  
  if (group && !group.elements.some(isVisible)) {
    return error(ERROR_CODES.HIDDEN, 'Tous les éléments de gamme sont masqués');
  }
  
  if (!got) {
    return error('NO_SELECTION', 'Aucune gamme sélectionnée');
  }
  
  const match = got.toLowerCase().includes(expected.toLowerCase());
  if (!match) {
    return error(ERROR_CODES.VALUE_MISMATCH, 'Gamme différente de celle attendue');
  }
  
  return success(diagnosis);
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