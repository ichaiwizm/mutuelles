/**
 * Service principal des enfants - Orchestrateur
 * Point d'entrée principal qui coordonne tous les modules enfants
 */

import { wait, waitStable, waitOverlayGone } from '../../utils/async-utils.js';
import { isCoupleSim } from './core/enfants-detector.js';
import { mapBridgeConfigToInternal, DEFAULT_CONFIG } from './core/enfants-mapper.js';
import { readChildren } from './operations/enfants-reader.js';
import { fillChildren } from './operations/enfants-writer.js';
import { checkChildren, diagnoseChildren, validateConfig } from './core/enfants-validator.js';
import { success, error, ERROR_CODES } from '../../utils/response-format.js';

/**
 * Fonction fill compatible avec le bridge orchestrateur
 * Interface principale pour l'orchestrateur
 */
export async function fill(cfg = {}) {
  try {
    console.log('🔍 enfants-service.fill - config reçu:', cfg);
    
    const nbEnfants = parseInt(cfg.nbEnfants) || 0;
    if (nbEnfants === 0) {
      console.log('⏭️ Aucun enfant, skip');
      return success({ actions: [], filled: [] });
    }
    
    // Validation de la configuration
    const validation = validateConfig(cfg);
    if (!validation.valid) {
      console.error('❌ Configuration invalide:', validation.errors);
      return error(ERROR_CODES.VALIDATION_ERROR, 'Configuration invalide', validation.errors);
    }
    
    if (validation.warnings.length > 0) {
      console.warn('⚠️ Avertissements:', validation.warnings);
    }
    
    // Détecter automatiquement s'il y a un conjoint (simulation couple)
    const hasConjoint = isCoupleSim();
    console.log('🔍 Détection simulation couple:', hasConjoint);
    
    // Convertir le format bridge vers le format interne
    const config = mapBridgeConfigToInternal(cfg, hasConjoint);
    // S'assurer que le mode loose est utilisé par défaut comme dans le script manuel
    if (!config.MODE) {
      config.MODE = 'loose';
    }
    console.log('🔍 enfants-service.fill - configuration finale:', config);
    
    // Remplir les enfants
    const fillResult = await fillChildren(config);
    console.log('🔍 enfants-service.fill - résultat fillChildren:', fillResult);
    
    if (!fillResult.ok) {
      return error(ERROR_CODES.FILL_ERROR, 'Erreur lors du remplissage des enfants', fillResult);
    }
    
    // Lecture de vérification
    await wait(200);
    await waitOverlayGone(8000);
    await waitStable();
    
    const readback = readChildren(config);
    
    // Attendre un peu pour s'assurer que tous les processus asynchrones sont terminés
    await wait(100);
    
    const result = success({ 
      actions: fillResult.filled || [], 
      readback,
      validation
    });
    
    console.log('🎯 enfants-service.fill - retour final:', result);
    return result;
  } catch (err) {
    console.error('❌ Erreur remplissage enfants:', err);
    return error(ERROR_CODES.FILL_ERROR, 'Erreur lors du remplissage des champs enfants', err);
  }
}

/**
 * Orchestrateur principal - Remplit et vérifie
 */
export async function runAll(cfg = DEFAULT_CONFIG) {
  try {
    console.log('🚀 enfants-service.runAll - début');
    
    // Validation préalable
    const validation = validateConfig(cfg);
    if (!validation.valid) {
      return error(ERROR_CODES.VALIDATION_ERROR, 'Configuration invalide', validation.errors);
    }
    
    // Remplissage
    const fillResult = await fillChildren(cfg);
    if (!fillResult.ok) {
      return error(ERROR_CODES.FILL_ERROR, 'Erreur lors du remplissage', fillResult);
    }
    
    // Vérification
    const checkResult = checkChildren(cfg);
    const allOk = checkResult.every(r => r.dateOk && r.ayantOk);
    
    if (!allOk) {
      console.log("⚠️ Erreurs détectées");
      const diag = diagnoseChildren(cfg);
      console.table(diag);
      return error(ERROR_CODES.VALIDATION_ERROR, 'Validation échouée', { 
        checks: checkResult, 
        diagnosis: diag 
      });
    }
    
    console.log("✅ Tous les enfants OK");
    
    return success({ 
      fillResult, 
      checkResult, 
      allOk: true,
      validation 
    });
  } catch (err) {
    console.error('❌ Erreur workflow enfants:', err);
    return error(ERROR_CODES.WORKFLOW_ERROR, 'Erreur lors du workflow complet', err);
  }
}

/**
 * Lit les informations des enfants actuels
 */
export function readAll(cfg = DEFAULT_CONFIG) {
  try {
    const data = readChildren(cfg);
    return success(data);
  } catch (err) {
    console.error('❌ Erreur lecture enfants:', err);
    return error(ERROR_CODES.READ_ERROR, 'Erreur lors de la lecture des données enfants', err);
  }
}

/**
 * Vérifie les valeurs par rapport aux attentes
 */
export function checkAll(cfg = DEFAULT_CONFIG) {
  try {
    const checkResult = checkChildren(cfg);
    const allOk = checkResult.every(r => r.dateOk && r.ayantOk);
    
    if (allOk) {
      return success({ valid: true, checks: checkResult });
    } else {
      return error(ERROR_CODES.VALIDATION_ERROR, 'Validation échouée', { checks: checkResult });
    }
  } catch (err) {
    console.error('❌ Erreur vérification enfants:', err);
    return error(ERROR_CODES.VALIDATION_ERROR, 'Erreur lors de la vérification', err);
  }
}

/**
 * Diagnostique détaillé des problèmes enfants
 */
export function diagnose(cfg = DEFAULT_CONFIG) {
  try {
    const diagnosis = diagnoseChildren(cfg);
    return success({ diagnosis });
  } catch (err) {
    console.error('❌ Erreur diagnostic enfants:', err);
    return error(ERROR_CODES.DIAGNOSTIC_ERROR, 'Erreur lors du diagnostic', err);
  }
}

/**
 * Interface de diagnostic rapide
 */
export function quickDiagnose(cfg = {}) {
  try {
    const issues = diagnoseChildren(cfg);
    const errors = issues.filter(i => i.severity === 'error');
    const warnings = issues.filter(i => i.severity === 'warning');
    
    return success({
      healthy: errors.length === 0,
      issues: {
        total: issues.length,
        errors: errors.length,
        warnings: warnings.length
      },
      details: issues
    });
  } catch (err) {
    console.error('❌ Erreur diagnostic rapide enfants:', err);
    return error(ERROR_CODES.DIAGNOSTIC_ERROR, 'Erreur lors du diagnostic rapide', err);
  }
}

// Exports pour compatibilité avec l'ancien code
export { fillChildren } from './operations/enfants-writer.js';
export { readChildren } from './operations/enfants-reader.js';
export { checkChildren, diagnoseChildren, validateConfig } from './core/enfants-validator.js';

// Export par défaut pour le bridge
export default {
  fill,
  runAll,
  readAll,
  checkAll,
  diagnose,
  quickDiagnose,
  // Méthodes avancées
  fillChildren,
  checkChildren,
  diagnoseChildren,
  readChildren,
  validateConfig
};