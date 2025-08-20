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
import { success, error, ERROR_CODES } from '../../utils/response-format.js';

/**
 * Lit toutes les informations conjoint actuelles
 */
export function readAll() {
  try {
    const data = readAllConjointValues();
    return success(data);
  } catch (err) {
    console.error('❌ Erreur lecture conjoint:', err);
    return error(ERROR_CODES.READ_ERROR, 'Erreur lors de la lecture des données conjoint', err);
  }
}

/**
 * Vérifie si les éléments conjoint sont prêts
 */
export function readyCheck() {
  try {
    const isReady = checkConjointReadiness();
    return success({ ready: isReady });
  } catch (err) {
    console.error('❌ Erreur vérification readiness conjoint:', err);
    return error(ERROR_CODES.VALIDATION_ERROR, 'Erreur lors de la vérification de disponibilité', err);
  }
}

/**
 * Remplit tous les champs conjoint
 */
export async function fillAll(cfg = DEFAULT_CONFIG) {
  try {
    const result = await fillAllConjointFields(cfg);
    
    // Si le résultat a déjà le format uniforme, on le retourne tel quel
    if (result && typeof result === 'object' && ('success' in result || 'error' in result)) {
      return result;
    }
    
    // Sinon on l'encapsule dans success
    if (result && result.ok !== false) {
      return success({ actions: result.actions || [], data: result });
    } else {
      return error(ERROR_CODES.FILL_ERROR, 'Erreur lors du remplissage', result);
    }
  } catch (err) {
    console.error('❌ Erreur remplissage conjoint:', err);
    return error(ERROR_CODES.FILL_ERROR, 'Erreur lors du remplissage des champs conjoint', err);
  }
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
  try {
    const currentValuesResult = readAll();
    if (!currentValuesResult.ok) {
      return currentValuesResult; // Propagate l'erreur de lecture
    }
    
    const checkResult = checkConjointValues(currentValuesResult.data, cfg);
    
    // Analyser les résultats de vérification
    const allOk = Array.isArray(checkResult) ? checkResult.every(r => r.ok) : checkResult.ok;
    
    if (allOk) {
      return success({ valid: true, checks: checkResult });
    } else {
      return error(ERROR_CODES.VALIDATION_ERROR, 'Validation échouée', { checks: checkResult });
    }
  } catch (err) {
    console.error('❌ Erreur vérification conjoint:', err);
    return error(ERROR_CODES.VALIDATION_ERROR, 'Erreur lors de la vérification', err);
  }
}

/**
 * Diagnostique détaillé des problèmes conjoint
 */
export function diagnose(cfg = DEFAULT_CONFIG) {
  try {
    const tab = findConjointTab();
    const readinessResult = readyCheck();
    const currentStateResult = readAll();
    
    if (!readinessResult.ok) {
      return readinessResult; // Propagate l'erreur de readiness
    }
    
    if (!currentStateResult.ok) {
      return currentStateResult; // Propagate l'erreur de lecture
    }
    
    const diagnosis = diagnoseConjointIssues(
      !!tab, 
      tab ? isVisible(tab) : false, 
      readinessResult.data.ready, 
      currentStateResult.data
    );
    
    return success({ diagnosis });
  } catch (err) {
    console.error('❌ Erreur diagnostic conjoint:', err);
    return error(ERROR_CODES.DIAGNOSTIC_ERROR, 'Erreur lors du diagnostic', err);
  }
}

/**
 * Workflow complet - Remplit et vérifie
 */
export async function runAll(cfg = DEFAULT_CONFIG) {
  try {
    console.log("🔄 Début remplissage conjoint...");
    
    const fillResult = await fillAll(cfg);
    if (!fillResult.ok) {
      console.error("❌ Échec remplissage:", fillResult);
      return fillResult;
    }
    
    console.log("✅ Remplissage OK:", fillResult.data?.actions || fillResult.data);
    
    const checkResult = checkAll(cfg);
    if (!checkResult.ok) {
      console.log("⚠️ Erreurs de validation détectées");
      const diag = diagnose(cfg);
      if (diag.ok) {
        console.table(diag.data.diagnosis?.issues || diag.data.diagnosis);
      }
      return checkResult;
    }
    
    console.log("✅ Vérifications OK");
    
    return success({ 
      fillResult: fillResult.data, 
      checkResult: checkResult.data, 
      allOk: true 
    });
  } catch (err) {
    console.error('❌ Erreur workflow conjoint:', err);
    return error(ERROR_CODES.WORKFLOW_ERROR, 'Erreur lors du workflow complet', err);
  }
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