/**
 * Service de gestion des informations du conjoint
 * Gère l'onglet et les champs du conjoint/partenaire
 */

import { q, isVisible, bringIntoView, clickHuman, dispatchHumanChange } from '../utils/dom-utils.js';
import { readSelect, setSelectByValueOrText, aliasResolve } from '../utils/form-utils.js';
import { wait, waitStable, waitOverlayGone } from '../utils/async-utils.js';

// Configuration par défaut
const DEFAULT_CFG = {
  dateNaissance: "01/01/1985",
  regimeSocial: "general",
  statut: "actif",
  profession: null
};

/**
 * Trouve l'onglet conjoint
 */
function findConjointTab() {
  const selectors = [
    '#tab-conjoint', '#nav-conjoint', '[href*="conjoint"]',
    '[role="tab"][aria-controls*="conjoint"]'
  ];
  
  for (const sel of selectors) {
    const tab = q(sel);
    if (tab && isVisible(tab)) return tab;
  }
  
  return null;
}

/**
 * Ouvre l'onglet conjoint
 */
export async function openConjointTab() {
  const tab = findConjointTab();
  if (!tab) return { ok: false, reason: 'tab_not_found' };
  
  if (tab.classList.contains('active') || tab.getAttribute('aria-selected') === 'true') {
    return { ok: true, already: true };
  }
  
  bringIntoView(tab);
  await wait(100);
  
  clickHuman(tab);
  await waitStable();
  
  return { ok: true, opened: true };
}

/**
 * Éléments du formulaire conjoint
 */
function elDate() {
  return q('#date-naissance-assure-conjoint') || 
         q('[name="conjoint.dateNaissance"]') || 
         q('input[id*="conjoint"][id*="naiss"]');
}

function selRegime() {
  return q('#regime-social-assure-conjoint') || 
         q('[name="conjoint.regimeSocial"]') || 
         q('select[id*="conjoint"][id*="regime"]');
}

function selStatut() {
  return q('#statut-assure-conjoint') || 
         q('[name="conjoint.statut"]') || 
         q('select[id*="conjoint"][id*="statut"]');
}

function selProfession() {
  return q('#profession-assure-conjoint') || 
         q('[name="conjoint.profession"]') || 
         q('select[id*="conjoint"][id*="profes"]');
}

/**
 * Lit toutes les informations
 */
export function readAll() {
  return {
    dateNaissance: elDate()?.value || "",
    regimeSocial: readSelect(selRegime()),
    statut: readSelect(selStatut()),
    profession: readSelect(selProfession())
  };
}

/**
 * Vérifie si les éléments sont prêts
 */
export function readyCheck() {
  const els = {
    date: elDate(),
    regime: selRegime(),
    statut: selStatut()
  };
  
  const missing = Object.entries(els)
    .filter(([_, el]) => !el)
    .map(([key]) => key);
  
  const hidden = Object.entries(els)
    .filter(([_, el]) => el && !isVisible(el))
    .map(([key]) => key);
  
  return { 
    ready: missing.length === 0 && hidden.length === 0,
    missing,
    hidden
  };
}

/**
 * Remplit tous les champs
 */
export async function fillAll(cfg = DEFAULT_CFG) {
  await waitOverlayGone();
  
  // S'assurer que l'onglet est ouvert
  const tabResult = await openConjointTab();
  if (!tabResult.ok) return tabResult;
  
  await wait(200);
  
  const actions = [];
  
  // Date de naissance
  const dateEl = elDate();
  if (dateEl && cfg.dateNaissance) {
    if (!isVisible(dateEl)) {
      bringIntoView(dateEl);
      await wait(200);
    }
    
    dateEl.focus();
    dateEl.value = cfg.dateNaissance;
    dispatchHumanChange(dateEl);
    actions.push({ field: 'dateNaissance', value: cfg.dateNaissance });
  }
  
  // Régime social
  const regimeEl = selRegime();
  if (regimeEl && cfg.regimeSocial) {
    const resolved = aliasResolve('regimeSocial', cfg.regimeSocial);
    const ok = setSelectByValueOrText(regimeEl, resolved);
    if (ok) actions.push({ field: 'regimeSocial', value: resolved });
  }
  
  // Statut
  const statutEl = selStatut();
  if (statutEl && cfg.statut) {
    const resolved = aliasResolve('statut', cfg.statut);
    const ok = setSelectByValueOrText(statutEl, resolved);
    if (ok) actions.push({ field: 'statut', value: resolved });
  }
  
  // Profession (optionnel)
  const profEl = selProfession();
  if (profEl && cfg.profession) {
    const ok = setSelectByValueOrText(profEl, cfg.profession);
    if (ok) actions.push({ field: 'profession', value: cfg.profession });
  }
  
  await waitStable();
  
  return { ok: true, actions };
}

/**
 * Vérifie les valeurs
 */
export function checkAll(cfg = DEFAULT_CFG) {
  const got = readAll();
  const results = [];
  
  // Date
  if (cfg.dateNaissance) {
    const ok = got.dateNaissance === cfg.dateNaissance;
    results.push({
      field: 'dateNaissance',
      ok,
      got: got.dateNaissance,
      expected: cfg.dateNaissance
    });
  }
  
  // Régime
  if (cfg.regimeSocial) {
    const resolved = aliasResolve('regimeSocial', cfg.regimeSocial);
    const ok = got.regimeSocial?.text?.toLowerCase().includes(resolved.toLowerCase());
    results.push({
      field: 'regimeSocial',
      ok,
      got: got.regimeSocial?.text,
      expected: resolved
    });
  }
  
  // Statut
  if (cfg.statut) {
    const resolved = aliasResolve('statut', cfg.statut);
    const ok = got.statut?.text?.toLowerCase().includes(resolved.toLowerCase());
    results.push({
      field: 'statut',
      ok,
      got: got.statut?.text,
      expected: resolved
    });
  }
  
  console.table(results);
  return results;
}

/**
 * Diagnostique détaillé
 */
export function diagnose(cfg = DEFAULT_CFG) {
  const tab = findConjointTab();
  const ready = readyCheck();
  const state = readAll();
  
  const issues = [];
  
  if (!tab) {
    issues.push({ issue: 'tab_not_found' });
  } else if (!isVisible(tab)) {
    issues.push({ issue: 'tab_hidden' });
  }
  
  if (ready.missing.length > 0) {
    issues.push({ issue: 'fields_missing', fields: ready.missing });
  }
  
  if (ready.hidden.length > 0) {
    issues.push({ issue: 'fields_hidden', fields: ready.hidden });
  }
  
  return { state, issues, ready };
}

/**
 * Workflow complet
 */
export async function runAll(cfg = DEFAULT_CFG) {
  console.log("🔄 Début remplissage conjoint...");
  
  const fillResult = await fillAll(cfg);
  if (!fillResult.ok) {
    console.error("❌ Échec remplissage:", fillResult);
    return fillResult;
  }
  
  console.log("✅ Remplissage OK:", fillResult.actions);
  
  const checkResult = checkAll(cfg);
  const allOk = checkResult.every(r => r.ok);
  
  if (allOk) {
    console.log("✅ Vérifications OK");
  } else {
    console.log("⚠️ Erreurs détectées");
    const diag = diagnose(cfg);
    console.table(diag.issues);
  }
  
  return { fillResult, checkResult, allOk };
}

// Export de l'API complète
export default {
  openConjointTab,
  fillAll,
  readAll,
  checkAll,
  diagnose,
  runAll,
  readyCheck
};