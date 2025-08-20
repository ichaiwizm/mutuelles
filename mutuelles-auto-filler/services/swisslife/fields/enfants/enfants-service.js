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

/**
 * Fonction fill compatible avec le bridge orchestrateur
 * Interface principale pour l'orchestrateur
 */
export async function fill(cfg = {}) {
  console.log('🔍 enfants-service.fill - config reçu:', cfg);
  
  const nbEnfants = parseInt(cfg.nbEnfants) || 0;
  if (nbEnfants === 0) {
    console.log('⏭️ Aucun enfant, skip');
    return { ok: true, filled: [] };
  }
  
  // Validation de la configuration
  const validation = validateConfig(cfg);
  if (!validation.valid) {
    console.error('❌ Configuration invalide:', validation.errors);
    return { ok: false, errors: validation.errors };
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Avertissements:', validation.warnings);
  }
  
  // Détecter automatiquement s'il y a un conjoint (simulation couple)
  const hasConjoint = isCoupleSim();
  console.log('🔍 Détection simulation couple:', hasConjoint);
  
  // Convertir le format bridge vers le format interne
  const config = mapBridgeConfigToInternal(cfg, hasConjoint);
  console.log('🔍 enfants-service.fill - configuration finale:', config);
  
  // Remplir les enfants
  const fillResult = await fillChildren(config);
  console.log('🔍 enfants-service.fill - résultat fillChildren:', fillResult);
  
  // Lecture de vérification
  await wait(200);
  await waitOverlayGone(8000);
  await waitStable();
  
  const readback = readChildren(config);
  
  return { 
    ok: fillResult.ok, 
    filled: fillResult.filled, 
    readback 
  };
}

/**
 * Orchestrateur principal - Remplit et vérifie
 */
export async function runAll(cfg = DEFAULT_CONFIG) {
  console.log('🚀 enfants-service.runAll - début');
  
  // Validation préalable
  const validation = validateConfig(cfg);
  if (!validation.valid) {
    return { ok: false, errors: validation.errors };
  }
  
  // Remplissage
  const fillResult = await fillChildren(cfg);
  
  // Vérification
  const checkResult = checkChildren(cfg);
  const allOk = checkResult.every(r => r.dateOk && r.ayantOk);
  
  if (allOk) {
    console.log("✅ Tous les enfants OK");
  } else {
    console.log("⚠️ Erreurs détectées");
    const diag = diagnoseChildren(cfg);
    console.table(diag);
  }
  
  return { 
    fillResult, 
    checkResult, 
    allOk,
    validation 
  };
}

/**
 * Interface de diagnostic rapide
 */
export function quickDiagnose(cfg = {}) {
  const issues = diagnoseChildren(cfg);
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  
  return {
    healthy: errors.length === 0,
    issues: {
      total: issues.length,
      errors: errors.length,
      warnings: warnings.length
    },
    details: issues
  };
}

// Exports pour compatibilité avec l'ancien code
export { fillChildren } from './operations/enfants-writer.js';
export { readChildren } from './operations/enfants-reader.js';
export { checkChildren, diagnoseChildren, validateConfig } from './core/enfants-validator.js';

// Export par défaut pour le bridge
export default {
  fill,
  runAll,
  quickDiagnose,
  // Méthodes avancées
  fillChildren,
  checkChildren,
  diagnoseChildren,
  readChildren,
  validateConfig
};