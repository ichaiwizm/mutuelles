/**
 * Service de gestion des informations du souscripteur
 * Gère les champs de l'assuré principal
 */

import { q, qa, isVisible, fireMultiple, highlight, hiddenReason, bringIntoView } from '../utils/dom-utils.js';
import { T, findByLabelLike, findFirstExisting, aliasResolve, setSelectByValueOrText, readSelect } from '../utils/form-utils.js';
import { wait, waitStable, waitOverlayGone } from '../utils/async-utils.js';

// Configuration par défaut - MISE À JOUR avec codes SwissLife exacts
const DEFAULT_CONFIG = {
  dateNaissance: "01/01/1980",
  regimeSocial: "SECURITE_SOCIALE",  // Code SwissLife exact au lieu de 'general'
  statut: "SALARIE",                 // Code SwissLife exact au lieu de 'actif'
  profession: null,
  departement: "75"
};

/**
 * Trouve les éléments de formulaire
 */
function find_dateNaissance() {
  return findFirstExisting(['#date-naissance-assure-principal', '[name="client.dateNaissance"]', 'input[id*="date-naiss"]']);
}

function find_regimeSocial() {
  return findFirstExisting(['#regime-social-assure-principal', '[name="client.regimeSocial"]']);
}

function find_statut() {
  return findFirstExisting(['#statut-assure-principal', '[name="client.statut"]']);
}

function find_profession() {
  return findFirstExisting(['#profession-assure-principal', '[name="client.profession"]']);
}

function find_departement() {
  const direct = findFirstExisting(['#departement-assure-principal', '[name="client.departement"]']);
  if (direct) return direct;
  
  // Recherche alternative par label
  const byLabel = findByLabelLike(/d[ée]partement/i);
  if (byLabel && byLabel.tagName === 'SELECT') return byLabel;
  
  // Recherche dans les selects visibles
  const selects = qa('select').filter(isVisible);
  return selects.find(sel => {
    const opts = [...sel.options].map(o => T(o.text)).join(' ');
    return /\b(75|77|78|91|92|93|94|95)\b/.test(opts);
  });
}

/**
 * Définit une valeur de select avec résolution d'alias
 */
function pickSelect(sel, wantedRaw) {
  if (!sel || !wantedRaw) return false;
  
  const domain = sel.name?.includes('regime') ? 'regimeSocial' :
                 sel.name?.includes('statut') ? 'statut' :
                 sel.name?.includes('profession') ? 'profession' : null;
  
  console.log('🔍 pickSelect - element:', sel.name, 'domain:', domain, 'wantedRaw:', wantedRaw);
  
  const wanted = domain ? aliasResolve(domain, wantedRaw) : wantedRaw;
  console.log('🔍 pickSelect - après aliasResolve:', wanted);
  
  const result = setSelectByValueOrText(sel, wanted);
  console.log('🔍 pickSelect - résultat:', result, 'selectedIndex:', sel.selectedIndex);
  
  return result;
}

/**
 * Scan un élément pour diagnostic
 */
function scanOne(key, el) {
  if (!el) return { found: false };
  
  const visible = isVisible(el);
  const disabled = el.disabled || el.readOnly;
  
  if (el.tagName === 'SELECT') {
    const selected = readSelect(el);
    return { found: true, visible, disabled, value: selected?.text, rawValue: selected?.value };
  }
  
  return { found: true, visible, disabled, value: el.value || "" };
}

/**
 * Vérifie que tous les éléments sont prêts
 */
export function ready() {
  const els = {
    dateNaissance: find_dateNaissance(),
    regimeSocial: find_regimeSocial(),
    statut: find_statut(),
    departement: find_departement()
  };
  
  const missing = Object.entries(els)
    .filter(([_, el]) => !el)
    .map(([key]) => key);
  
  if (missing.length > 0) {
    return { ready: false, missing };
  }
  
  const hidden = Object.entries(els)
    .filter(([_, el]) => !isVisible(el))
    .map(([key]) => key);
  
  if (hidden.length > 0) {
    return { ready: false, hidden };
  }
  
  return { ready: true };
}

/**
 * Remplit tous les champs
 */
export async function fill(cfg = {}) {
  // Mapping des clés : resolver → service  
  const mappedCfg = { ...cfg };
  if (cfg.regime && !cfg.regimeSocial) {
    mappedCfg.regimeSocial = cfg.regime;
    delete mappedCfg.regime;
  }
  
  const config = { ...DEFAULT_CONFIG, ...mappedCfg };
  
  console.log('🔍 souscripteur-service.fill - config reçu:', cfg);
  console.log('🔍 souscripteur-service.fill - config mappé:', mappedCfg);
  console.log('🔍 souscripteur-service.fill - config final:', config);
  
  await waitOverlayGone();
  
  const actions = [];
  
  // Date de naissance
  const elDate = find_dateNaissance();
  if (elDate && config.dateNaissance) {
    if (!isVisible(elDate)) {
      bringIntoView(elDate);
      await wait(200);
    }
    
    elDate.focus();
    elDate.value = config.dateNaissance;
    fireMultiple(elDate);
    actions.push({ field: 'dateNaissance', value: config.dateNaissance });
  }
  
  // Régime social
  const selRegime = find_regimeSocial();
  console.log('🔍 Régime social - element trouvé:', selRegime, 'config:', config.regimeSocial);
  if (selRegime && config.regimeSocial) {
    const ok = pickSelect(selRegime, config.regimeSocial);
    if (ok) actions.push({ field: 'regimeSocial', value: config.regimeSocial });
  }
  
  // Statut
  const selStatut = find_statut();
  console.log('🔍 Statut - element trouvé:', selStatut, 'config:', config.statut);
  if (selStatut && config.statut) {
    const ok = pickSelect(selStatut, config.statut);
    if (ok) actions.push({ field: 'statut', value: config.statut });
  }
  
  // Profession (optionnel)
  const selProfession = find_profession();
  console.log('🔍 Profession - element trouvé:', selProfession, 'config:', config.profession);
  if (selProfession && config.profession) {
    const ok = pickSelect(selProfession, config.profession);
    if (ok) actions.push({ field: 'profession', value: config.profession });
  }
  
  // Département
  const selDept = find_departement();
  if (selDept && config.departement) {
    const ok = pickSelect(selDept, config.departement);
    if (ok) actions.push({ field: 'departement', value: config.departement });
  }
  
  await waitStable();
  
  return { ok: true, actions };
}

/**
 * Lit les valeurs actuelles
 */
export function read() {
  return {
    dateNaissance: scanOne('dateNaissance', find_dateNaissance()),
    regimeSocial: scanOne('regimeSocial', find_regimeSocial()),
    statut: scanOne('statut', find_statut()),
    profession: scanOne('profession', find_profession()),
    departement: scanOne('departement', find_departement())
  };
}

/**
 * Vérifie les valeurs
 */
export function check(cfg = {}) {
  const config = { ...DEFAULT_CONFIG, ...cfg };
  const state = read();
  const results = [];
  
  for (const [key, expected] of Object.entries(config)) {
    if (!expected) continue;
    
    const field = state[key];
    if (!field || !field.found) {
      results.push({ field: key, ok: false, reason: 'not_found' });
      continue;
    }
    
    const got = field.value || "";
    const ok = T(got).toLowerCase().includes(T(expected).toLowerCase());
    results.push({ field: key, ok, got, expected });
  }
  
  console.table(results);
  return results;
}

/**
 * Diagnostique détaillé
 */
export function diagnose(cfg = {}) {
  const config = { ...DEFAULT_CONFIG, ...cfg };
  const state = read();
  const issues = [];
  
  for (const [key, data] of Object.entries(state)) {
    if (!data.found) {
      issues.push({ field: key, issue: 'not_found' });
      continue;
    }
    
    if (!data.visible) {
      const el = {
        dateNaissance: find_dateNaissance(),
        regimeSocial: find_regimeSocial(),
        statut: find_statut(),
        profession: find_profession(),
        departement: find_departement()
      }[key];
      
      const reason = hiddenReason(el);
      issues.push({ field: key, issue: 'hidden', reason });
      
      // Highlight pour debug
      if (el) highlight(el);
      continue;
    }
    
    if (data.disabled) {
      issues.push({ field: key, issue: 'disabled' });
      continue;
    }
    
    const expected = config[key];
    if (expected && data.value) {
      const match = T(data.value).toLowerCase().includes(T(expected).toLowerCase());
      if (!match) {
        issues.push({ field: key, issue: 'mismatch', got: data.value, expected });
      }
    }
  }
  
  return { state, issues };
}

// Export de l'API complète
export default {
  fill,
  read,
  check,
  diagnose,
  ready,
  // Exports individuels pour usage avancé
  find: {
    dateNaissance: find_dateNaissance,
    regimeSocial: find_regimeSocial,
    statut: find_statut,
    profession: find_profession,
    departement: find_departement
  }
};