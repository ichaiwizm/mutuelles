/**
 * Rédacteur d'enfants - Opérations d'écriture/remplissage des données enfants
 * Responsable du remplissage des formulaires et de la définition du nombre d'enfants
 */

import { bringIntoView, dispatchHumanChange, isVisible } from '../../../utils/dom-utils.js';
import { setSelectByValueOrText, typeMasked } from '../../../utils/form-utils.js';
import { wait, waitStable, waitOverlayGone } from '../../../utils/async-utils.js';
import { 
  findNbEnfantsSelect, 
  expandChildrenSections, 
  findAddChildButtons 
} from '../core/enfants-detector.js';
import { 
  visibleChildPairs, 
  looseChildPairs, 
  getAyantSynonyms 
} from '../core/enfants-mapper.js';

/**
 * Définit le nombre d'enfants dans le select
 * Logique adaptée de SLS_ENFANTS3 pour une meilleure stabilité
 */
export async function setNbEnfants(n) {
  console.log(`🔍 setNbEnfants - tentative de définir ${n} enfants`);
  const sel = findNbEnfantsSelect();
  
  if (!sel) {
    console.log('❌ Select du nombre d\'enfants non trouvé');
    return { ok: false, reason: "nb_select_not_found" };
  }
  
  console.log('✅ Select trouvé:', sel);
  console.log('📋 Options disponibles:', [...sel.options].map(o => ({
    value: o.value,
    text: o.text
  })));
  
  bringIntoView(sel);
  
  // Chercher l'option - logique identique au script manuel
  const opts = [...sel.options];
  let idx = opts.findIndex(o => (o.value || '').toString().trim() === String(n));
  if (idx < 0) idx = opts.findIndex(o => (o.text || '').toString().trim() === String(n));
  if (idx < 0) {
    console.log(`❌ Aucune option trouvée pour ${n} enfants`);
    return { ok: false, reason: "nb_value_not_in_options", options: opts.map(o => o.text || o.value) };
  }
  
  console.log(`✅ Option trouvée à l'index ${idx}: value="${sel.options[idx].value}" text="${sel.options[idx].text}"`);
  sel.selectedIndex = idx;
  dispatchHumanChange(sel);
  
  // "Réveiller" la zone - comme dans le script manuel
  expandChildrenSections();
  
  // Focus/blur pour déclencher les événements - comme dans le script manuel
  const focusable = document.querySelector('#date-naissance-assure-principal') || 
                   document.querySelector('#contratSante-dateEffet') ||
                   document.querySelector('input,select,textarea,button');
  try { 
    focusable?.focus(); 
    focusable?.blur(); 
  } catch {}
  
  await wait(120);
  await waitOverlayGone(8000);
  
  // Attente stable avec MutationObserver - LOGIQUE DU SCRIPT MANUEL
  console.log('⏳ Attente stabilisation DOM avec MutationObserver...');
  await waitStable({ minQuiet: 350, maxWait: 7000 });
  
  // Si rien de visible → tente clics "Ajouter un enfant" - comme dans le script manuel
  let pairs = visibleChildPairs();
  if (pairs.length === 0) {
    console.log('🔍 Aucun champ visible, tentative clics boutons "Ajouter un enfant"...');
    const addBtns = findAddChildButtons();
    for (let i = 0; i < Math.min(n, addBtns.length); i++) {
      bringIntoView(addBtns[i]);
      addBtns[i].click();
      await wait(150);
      await waitOverlayGone(8000);
    }
    await waitStable({ minQuiet: 350, maxWait: 7000 });
    pairs = visibleChildPairs();
  }
  
  // Retour en mode loose par défaut comme le script manuel
  return { 
    ok: pairs.length >= 1 || true, // Mode loose accepte même si pas visible
    pairs: pairs.length, 
    after: { value: sel.value, text: sel.options[sel.selectedIndex]?.text || "" }
  };
}

/**
 * Remplit les informations des enfants
 * Logique adaptée de SLS_ENFANTS3 avec mode loose par défaut
 */
export async function fillChildren(cfg) {
  console.log('🔍 fillChildren - config:', cfg);
  const n = cfg.nbEnfants || cfg.enfants?.length || 0;
  console.log(`🔍 fillChildren - nombre d'enfants à remplir: ${n}`);
  
  if (n === 0) return { ok: true, filled: [] };
  
  const setResult = await setNbEnfants(n);
  console.log('🔍 fillChildren - résultat setNbEnfants:', setResult);
  
  // Mode loose par défaut comme dans le script manuel
  const pairs = (cfg.MODE === "visible") 
    ? visibleChildPairs() 
    : looseChildPairs(n);
  
  const filled = [];
  
  for (let i = 0; i < n; i++) {
    const spec = cfg.enfants[i] || {};
    const pair = pairs[i];
    
    if (!pair || (!pair.date && !pair.ayant)) {
      filled.push({ index: i + 1, ok: false, reason: "missing_slot" });
      continue;
    }
    
    let okDate = false, rSel = { ok: false };
    
    // Date de naissance
    if (pair.date && spec.dateNaissance) {
      bringIntoView(pair.date);
      okDate = await typeMasked(pair.date, spec.dateNaissance);
      filled.push({ 
        index: i + 1, 
        field: 'date', 
        ok: okDate,
        got: pair.date?.value ?? "",
        expected: spec.dateNaissance
      });
    }
    
    // Ayant droit
    if (pair.ayant && spec.ayantDroit !== undefined) {
      const synonymes = getAyantSynonyms(spec.ayantDroit);
      rSel = setSelectByValueOrText(pair.ayant, spec.ayantDroit, synonymes);
      filled.push({ 
        index: i + 1, 
        field: 'ayant', 
        ok: !!rSel.ok,
        got: pair.ayant ? { value: pair.ayant.value, text: pair.ayant.options[pair.ayant.selectedIndex]?.text } : null,
        expected: spec.ayantDroit,
        reason: rSel.ok ? null : rSel.reason
      });
    }
    
    await wait(50); // Petit délai entre chaque enfant
  }
  
  await wait(120);
  await waitOverlayGone(8000);
  await waitStable({ minQuiet: 350, maxWait: 7000 });
  
  return { ok: true, filled };
}

/**
 * Remplit un enfant spécifique par index
 */
export async function fillChildByIndex(index, childData) {
  const pairs = looseChildPairs(index + 1);
  const pair = pairs[index];
  
  if (!pair) {
    return { ok: false, reason: 'child_not_found', index };
  }
  
  const filled = [];
  
  // Date de naissance
  if (pair.date && childData.dateNaissance) {
    await typeMasked(pair.date, childData.dateNaissance);
    filled.push({ field: 'date', value: childData.dateNaissance });
  }
  
  // Ayant droit
  if (pair.ayant && childData.ayantDroit) {
    const synonymes = getAyantSynonyms(childData.ayantDroit);
    const result = setSelectByValueOrText(pair.ayant, synonymes[0], synonymes);
    if (result) {
      filled.push({ field: 'ayant', value: synonymes[0] });
    }
  }
  
  await wait(100);
  
  return { ok: true, index, filled };
}