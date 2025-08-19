/**
 * Service de gestion des enfants
 * Gère l'ajout dynamique et les informations des enfants
 */

import { q, qa, isVisible, bringIntoView, dispatchHumanChange } from '../utils/dom-utils.js';
import { readSelect, setSelectByValueOrText, norm, typeMasked } from '../utils/form-utils.js';
import { wait, waitStable, waitOverlayGone, pollUntil } from '../utils/async-utils.js';

// Configuration par défaut
const DEFAULT_CONFIG = {
  nbEnfants: 0,
  enfants: [],
  MODE: "visible" // "visible" ou "loose"
};

/**
 * Trouve le select du nombre d'enfants
 */
function findNbEnfantsSelect() {
  return q('#nb-enfants, [name="nbEnfants"], select[id*="enfants"]') || 
         qa('select').find(sel => {
           const opts = [...sel.options].map(o => o.text.toLowerCase()).join(' ');
           return opts.includes('0 enfant') || opts.includes('1 enfant');
         });
}

/**
 * Expand les sections enfants si nécessaire
 */
function expandChildrenSections() {
  const toggles = qa('[data-toggle="collapse"][href*="enfant"], .toggle-enfants, .expand-enfants');
  toggles.forEach(t => {
    if (isVisible(t)) t.click();
  });
}

/**
 * Trouve les boutons d'ajout d'enfant
 */
function findAddChildButtons() {
  return qa('button, a, [role="button"]').filter(el => {
    const txt = (el.innerText || "").toLowerCase();
    return txt.includes('ajouter') && txt.includes('enfant');
  });
}

/**
 * Paires enfant visibles (date + ayant droit)
 */
function visibleChildPairs() {
  const pairs = [];
  
  // Pattern 1: IDs indexés
  for (let i = 0; i < 10; i++) {
    const dateEl = q(`#date-naissance-enfant-${i}, [name="enfant${i}.dateNaissance"]`);
    const ayantSel = q(`#ayant-droit-enfant-${i}, [name="enfant${i}.ayantDroit"]`);
    
    if (dateEl && isVisible(dateEl)) {
      pairs.push({ 
        index: i, 
        date: dateEl, 
        ayant: ayantSel,
        visible: true
      });
    }
  }
  
  // Pattern 2: Sections avec classe enfant
  qa('.enfant-item, .child-section, [class*="enfant-"]').forEach((section, i) => {
    const dateEl = section.querySelector('input[type="text"][id*="date"], input[type="date"]');
    const ayantSel = section.querySelector('select');
    
    if (dateEl && isVisible(dateEl)) {
      pairs.push({
        index: pairs.length,
        date: dateEl,
        ayant: ayantSel,
        visible: true
      });
    }
  });
  
  return pairs;
}

/**
 * Obtient l'élément date pour l'enfant i
 */
function getChildDateEl(i) {
  return q(`#date-naissance-enfant-${i}`) ||
         q(`[name="enfant${i}.dateNaissance"]`) ||
         q(`[name="enfants[${i}].dateNaissance"]`) ||
         qa('input[id*="date"][id*="enfant"]')[i];
}

/**
 * Obtient le select ayant droit pour l'enfant i
 */
function getChildAyantSel(i) {
  return q(`#ayant-droit-enfant-${i}`) ||
         q(`[name="enfant${i}.ayantDroit"]`) ||
         q(`[name="enfants[${i}].ayantDroit"]`) ||
         qa('select[id*="ayant"][id*="enfant"]')[i];
}

/**
 * Paires d'enfants en mode loose
 */
function looseChildPairs(n) {
  const pairs = [];
  for (let i = 0; i < n; i++) {
    pairs.push({
      index: i,
      date: getChildDateEl(i),
      ayant: getChildAyantSel(i)
    });
  }
  return pairs;
}

/**
 * Définit le nombre d'enfants
 */
export async function setNbEnfants(n) {
  const sel = findNbEnfantsSelect();
  
  if (sel) {
    // Via select
    const optIdx = [...sel.options].findIndex(o => {
      const txt = o.text.toLowerCase();
      return txt.includes(`${n} enfant`);
    });
    
    if (optIdx >= 0) {
      sel.selectedIndex = optIdx;
      dispatchHumanChange(sel);
      await waitStable();
      return { ok: true, method: 'select' };
    }
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
 * Lit les enfants visibles
 */
function readChildrenVisible() {
  return visibleChildPairs().map(p => ({
    dateNaissance: p.date?.value || "",
    ayantDroit: readSelect(p.ayant)?.value || ""
  }));
}

/**
 * Lit les enfants en mode loose
 */
function readChildrenLoose(n) {
  return looseChildPairs(n).map(p => ({
    dateNaissance: p.date?.value || "",
    ayantDroit: readSelect(p.ayant)?.value || ""
  }));
}

/**
 * Remplit les informations des enfants
 */
export async function fillChildren(cfg = DEFAULT_CONFIG) {
  const n = cfg.nbEnfants || cfg.enfants?.length || 0;
  if (n === 0) return { ok: true, filled: [] };
  
  await setNbEnfants(n);
  
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
      const wanted = spec.ayantDroit === "1" ? "Oui" : "Non";
      setSelectByValueOrText(pair.ayant, wanted, ["1", "0", "true", "false"]);
      filled.push({ index: i, field: 'ayant', value: wanted });
    }
    
    await wait(100);
  }
  
  await waitStable();
  
  const readback = (cfg.MODE === "visible") 
    ? readChildrenVisible() 
    : readChildrenLoose(n);
  
  return { ok: true, filled, readback };
}

/**
 * Vérifie les enfants
 */
export function checkChildren(cfg = DEFAULT_CONFIG) {
  const n = cfg.nbEnfants || cfg.enfants?.length || 0;
  const got = (cfg.MODE === "visible") ? readChildrenVisible() : readChildrenLoose(n);
  
  const rows = (cfg.enfants || []).map((spec, i) => {
    const g = got[i] || {};
    const okDate = norm(g.dateNaissance || "") === norm(spec.dateNaissance || "");
    const okAyant = (norm(g.ayantDroit || "") === norm(spec.ayantDroit || "")) ||
                    (g.ayantDroit === "1" && spec.ayantDroit === "Oui") ||
                    (g.ayantDroit === "0" && spec.ayantDroit === "Non");
    
    return {
      index: i,
      dateOk: okDate,
      ayantOk: okAyant,
      got: g,
      expected: spec
    };
  });
  
  console.table(rows);
  return rows;
}

/**
 * Diagnostique détaillé
 */
export function diagnoseChildren(cfg = DEFAULT_CONFIG) {
  const n = cfg.nbEnfants || cfg.enfants?.length || 0;
  const pairs = visibleChildPairs();
  const issues = [];
  
  if (pairs.length !== n) {
    issues.push({
      issue: 'count_mismatch',
      got: pairs.length,
      expected: n
    });
  }
  
  pairs.forEach((p, i) => {
    if (!p.date) {
      issues.push({ index: i, field: 'date', issue: 'not_found' });
    } else if (!isVisible(p.date)) {
      issues.push({ index: i, field: 'date', issue: 'hidden' });
    }
    
    if (!p.ayant) {
      issues.push({ index: i, field: 'ayant', issue: 'not_found' });
    } else if (!isVisible(p.ayant)) {
      issues.push({ index: i, field: 'ayant', issue: 'hidden' });
    }
  });
  
  return { pairs, issues };
}

/**
 * Workflow complet
 */
export async function runAll(cfg = DEFAULT_CONFIG) {
  console.log("🔄 Début remplissage enfants...");
  
  await waitOverlayGone();
  
  const fillResult = await fillChildren(cfg);
  console.log("✅ Remplissage:", fillResult);
  
  const checkResult = checkChildren(cfg);
  const allOk = checkResult.every(r => r.dateOk && r.ayantOk);
  
  if (allOk) {
    console.log("✅ Tous les enfants OK");
  } else {
    console.log("⚠️ Erreurs détectées");
    const diag = diagnoseChildren(cfg);
    console.table(diag.issues);
  }
  
  return { fillResult, checkResult, allOk };
}

// Export de l'API complète
export default {
  setNbEnfants,
  fillChildren,
  checkChildren,
  diagnoseChildren,
  runAll,
  read: readChildrenVisible,
  // Utilitaires
  visibleChildPairs,
  expandChildrenSections
};