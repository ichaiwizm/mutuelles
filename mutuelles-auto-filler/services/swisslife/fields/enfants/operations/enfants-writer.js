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
 */
export async function setNbEnfants(n) {
  console.log(`🔍 setNbEnfants - tentative de définir ${n} enfants`);
  const sel = findNbEnfantsSelect();
  
  if (sel) {
    console.log('✅ Select trouvé:', sel);
    console.log('📋 Options disponibles:', [...sel.options].map(o => ({
      value: o.value,
      text: o.text
    })));
    
    // Via select - chercher d'abord par value, puis par text
    let optIdx = [...sel.options].findIndex(o => {
      // D'abord chercher par value exacte
      return (o.value || '').toString() === String(n);
    });
    
    if (optIdx < 0) {
      // Ensuite chercher par text exact
      optIdx = [...sel.options].findIndex(o => {
        return (o.text || '').toString().trim() === String(n);
      });
    }
    
    if (optIdx < 0) {
      // Enfin chercher si le text contient le nombre avec "enfant"
      optIdx = [...sel.options].findIndex(o => {
        const txt = (o.text || '').toLowerCase();
        return txt.includes(`${n} enfant`);
      });
    }
    
    if (optIdx >= 0) {
      console.log(`✅ Option trouvée à l'index ${optIdx}: value="${sel.options[optIdx].value}" text="${sel.options[optIdx].text}"`);
      sel.selectedIndex = optIdx;
      dispatchHumanChange(sel);
      await waitStable();
      return { ok: true, method: 'select' };
    } else {
      console.log(`❌ Aucune option trouvée pour ${n} enfants`);
    }
  } else {
    console.log('❌ Select du nombre d\'enfants non trouvé');
  }
  
  // Via boutons d'ajout
  expandChildrenSections();
  await wait(200);
  
  const currentPairs = visibleChildPairs();
  const current = currentPairs.length;
  
  if (current === n) {
    return { ok: true, already: true };
  }
  
  if (current < n) {
    // Ajouter des enfants
    const addBtns = findAddChildButtons();
    const toAdd = n - current;
    
    for (let i = 0; i < toAdd; i++) {
      const btn = addBtns[0];
      if (btn && isVisible(btn)) {
        btn.click();
        await wait(300);
      }
    }
  }
  
  await waitStable();
  const finalPairs = visibleChildPairs();
  
  return { 
    ok: finalPairs.length === n, 
    got: finalPairs.length, 
    expected: n 
  };
}

/**
 * Remplit les informations des enfants
 */
export async function fillChildren(cfg) {
  console.log('🔍 fillChildren - config:', cfg);
  const n = cfg.nbEnfants || cfg.enfants?.length || 0;
  console.log(`🔍 fillChildren - nombre d'enfants à remplir: ${n}`);
  
  if (n === 0) return { ok: true, filled: [] };
  
  const setResult = await setNbEnfants(n);
  console.log('🔍 fillChildren - résultat setNbEnfants:', setResult);
  
  const pairs = (cfg.MODE === "visible") 
    ? visibleChildPairs() 
    : looseChildPairs(n);
  
  const filled = [];
  
  for (let i = 0; i < Math.min(n, pairs.length); i++) {
    const spec = cfg.enfants[i] || {};
    const pair = pairs[i];
    
    // Date de naissance
    if (pair.date && spec.dateNaissance) {
      if (!isVisible(pair.date)) {
        bringIntoView(pair.date);
        await wait(200);
      }
      
      await typeMasked(pair.date, spec.dateNaissance);
      filled.push({ index: i, field: 'date', value: spec.dateNaissance });
    }
    
    // Ayant droit
    if (pair.ayant && spec.ayantDroit !== undefined) {
      const synonymes = getAyantSynonyms(spec.ayantDroit);
      const wanted = synonymes[0];  // Utiliser la première valeur comme valeur principale
      
      // Essayer de définir la valeur
      const result = setSelectByValueOrText(pair.ayant, wanted, synonymes);
      if (result) {
        filled.push({ index: i, field: 'ayant', value: wanted });
      }
    }
    
    await wait(100);
  }
  
  await waitStable();
  
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