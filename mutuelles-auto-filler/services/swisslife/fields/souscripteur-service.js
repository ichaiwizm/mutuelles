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
import { success, error, ERROR_CODES } from '../utils/response-format.js';

/**
 * Lit toutes les informations souscripteur actuelles
 */
export function read() {
  try {
    const data = readAllSouscripteurValues();
    return success(data);
  } catch (err) {
    console.error('❌ Erreur lecture souscripteur:', err);
    return error(ERROR_CODES.READ_ERROR, 'Erreur lors de la lecture des données souscripteur', err);
  }
}

/**
 * Vérifie si les éléments souscripteur sont prêts
 */
export function ready() {
  try {
    const isReady = checkSouscripteurReadiness();
    return success({ ready: isReady });
  } catch (err) {
    console.error('❌ Erreur vérification readiness souscripteur:', err);
    return error(ERROR_CODES.VALIDATION_ERROR, 'Erreur lors de la vérification de disponibilité', err);
  }
}

/**
 * Remplit tous les champs souscripteur
 */
export async function fill(cfg = DEFAULT_CONFIG) {
  try {
    const result = await fillAllSouscripteurFields(cfg);
    
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
    console.error('❌ Erreur remplissage souscripteur:', err);
    return error(ERROR_CODES.FILL_ERROR, 'Erreur lors du remplissage des champs souscripteur', err);
  }
}

/**
 * Vérifie les valeurs par rapport aux attentes
 */
export function check(cfg = DEFAULT_CONFIG) {
  try {
    const currentValuesResult = read();
    if (!currentValuesResult.ok) {
      return currentValuesResult; // Propagate l'erreur de lecture
    }
    
    const checkResult = checkSouscripteurValues(currentValuesResult.data, cfg);
    
    // Analyser les résultats de vérification
    const allOk = Array.isArray(checkResult) ? checkResult.every(r => r.ok) : checkResult.ok;
    
    if (allOk) {
      return success({ valid: true, checks: checkResult });
    } else {
      return error(ERROR_CODES.VALIDATION_ERROR, 'Validation échouée', { checks: checkResult });
    }
  } catch (err) {
    console.error('❌ Erreur vérification souscripteur:', err);
    return error(ERROR_CODES.VALIDATION_ERROR, 'Erreur lors de la vérification', err);
  }
}

/**
 * Diagnostique détaillé des problèmes souscripteur
 */
export function diagnose(cfg = DEFAULT_CONFIG) {
  try {
    const currentStateResult = read();
    if (!currentStateResult.ok) {
      return currentStateResult; // Propagate l'erreur de lecture
    }
    
    const diagnosis = diagnoseSouscripteurIssues(currentStateResult.data, cfg);
    return success({ diagnosis });
  } catch (err) {
    console.error('❌ Erreur diagnostic souscripteur:', err);
    return error(ERROR_CODES.DIAGNOSTIC_ERROR, 'Erreur lors du diagnostic', err);
  }
}

/**
 * Workflow complet - Remplit et vérifie
 */
export async function runAll(cfg = DEFAULT_CONFIG) {
  try {
    console.log("🔄 Début remplissage souscripteur...");
    
    const fillResult = await fill(cfg);
    if (!fillResult.ok) {
      console.error("❌ Échec remplissage:", fillResult);
      return fillResult;
    }
    
    console.log("✅ Remplissage OK:", fillResult.data?.actions || fillResult.data);
    
    const checkResult = check(cfg);
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
    console.error('❌ Erreur workflow souscripteur:', err);
    return error(ERROR_CODES.WORKFLOW_ERROR, 'Erreur lors du workflow complet', err);
  }
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