/**
 * Service principal du conjoint - Orchestrateur
 * Point d'entrée principal qui coordonne tous les modules conjoint
 */

import { isVisible } from '../../utils/dom-utils.js';
import { 
  findConjointTab,
  openConjointTab
} from './core/conjoint-detector.js';
import { 
  normalizeConjointConfig,
  checkConjointValues,
  diagnoseConjointIssues,
  DEFAULT_CONFIG 
} from './core/conjoint-mapper.js';
import { 
  readAllConjointValues,
  checkConjointReadiness
} from './operations/conjoint-reader.js';
import { fillAllConjointFields } from './operations/conjoint-filler.js';

/**
 * Lit toutes les informations conjoint actuelles
 */
export function readAll() {
  return readAllConjointValues();
}

/**
 * Vérifie si les éléments conjoint sont prêts
 */
export function readyCheck() {
  return checkConjointReadiness();
}

/**
 * Remplit tous les champs conjoint
 */
export async function fillAll(cfg = DEFAULT_CONFIG) {
  return await fillAllConjointFields(cfg);
}

/**
 * Alias pour compatibilité avec le bridge orchestrateur
 */
export async function fill(cfg) {
  return await fillAll(cfg);
}

/**
 * Vérifie les valeurs par rapport aux attentes
 */
export function checkAll(cfg = DEFAULT_CONFIG) {
  const currentValues = readAll();
  return checkConjointValues(currentValues, cfg);
}

/**
 * Diagnostique détaillé des problèmes conjoint
 */
export function diagnose(cfg = DEFAULT_CONFIG) {
  const tab = findConjointTab();
  const readiness = readyCheck();
  const currentState = readAll();
  
  return diagnoseConjointIssues(!!tab, tab ? isVisible(tab) : false, readiness, currentState);
}

/**
 * Workflow complet - Remplit et vérifie
 */
export async function runAll(cfg = DEFAULT_CONFIG) {
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

// Export des fonctions individuelles pour compatibilité
export { openConjointTab } from './core/conjoint-detector.js';

// Export de l'API complète
export default {
  openConjointTab,
  fillAll,
  fill,  // Ajout pour compatibilité bridge
  readAll,
  checkAll,
  diagnose,
  runAll,
  readyCheck
};