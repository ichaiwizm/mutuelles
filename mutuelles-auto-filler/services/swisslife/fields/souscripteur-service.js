/**
 * Service principal du souscripteur - Orchestrateur
 * Point d'entrée principal qui coordonne tous les modules souscripteur
 */

import { 
  readAllSouscripteurValues,
  checkSouscripteurReadiness
} from './souscripteur/operations/souscripteur-reader.js';
import { fillAllSouscripteurFields } from './souscripteur/operations/souscripteur-filler.js';
import { 
  normalizeSouscripteurConfig,
  checkSouscripteurValues,
  diagnoseSouscripteurIssues,
  DEFAULT_CONFIG 
} from './souscripteur/core/souscripteur-mapper.js';

/**
 * Lit toutes les informations souscripteur actuelles
 */
export function read() {
  return readAllSouscripteurValues();
}

/**
 * Vérifie si les éléments souscripteur sont prêts
 */
export function ready() {
  return checkSouscripteurReadiness();
}

/**
 * Remplit tous les champs souscripteur
 */
export async function fill(cfg = DEFAULT_CONFIG) {
  return await fillAllSouscripteurFields(cfg);
}

/**
 * Vérifie les valeurs par rapport aux attentes
 */
export function check(cfg = DEFAULT_CONFIG) {
  const currentValues = read();
  return checkSouscripteurValues(currentValues, cfg);
}

/**
 * Diagnostique détaillé des problèmes souscripteur
 */
export function diagnose(cfg = DEFAULT_CONFIG) {
  const currentState = read();
  return diagnoseSouscripteurIssues(currentState, cfg);
}

/**
 * Workflow complet - Remplit et vérifie
 */
export async function runAll(cfg = DEFAULT_CONFIG) {
  console.log("🔄 Début remplissage souscripteur...");
  
  const fillResult = await fill(cfg);
  if (!fillResult.ok) {
    console.error("❌ Échec remplissage:", fillResult);
    return fillResult;
  }
  
  console.log("✅ Remplissage OK:", fillResult.actions);
  
  const checkResult = check(cfg);
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
  fill,
  read,
  check,
  diagnose,
  ready,
  runAll
};