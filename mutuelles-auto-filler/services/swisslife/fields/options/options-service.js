/**
 * Service principal des options - Orchestrateur
 * Point d'entrée principal qui coordonne tous les modules d'options
 */

import { waitOverlayGone, overlayPresent } from '../../utils/async-utils.js';
import { 
  readMadelin, 
  setMadelin, 
  validateMadelinConfig 
} from './types/madelin-option.js';
import { 
  readResiliation, 
  setResiliation, 
  validateResiliationConfig 
} from './types/resiliation-option.js';
import { 
  readReprise, 
  setReprise, 
  validateRepriseConfig 
} from './types/reprise-option.js';
import { 
  detectAvailableOptions, 
  detectVisibleOptions, 
  healthCheckAllOptions 
} from './core/options-detector.js';

/**
 * Définit toutes les options en une fois
 * Interface principale pour l'orchestrateur
 */
export async function setAll(options = {}) {
  console.log('🔍 options-service.setAll - config reçu:', options);
  
  await waitOverlayGone();
  
  // Validation préalable
  const validation = validateAllOptions(options);
  if (!validation.valid) {
    console.error('❌ Configuration options invalide:', validation.errors);
    return { ok: false, errors: validation.errors };
  }
  
  const results = {};
  
  // Traitement séquentiel des options
  if (options.madelin !== undefined) {
    console.log('🔧 Traitement option Madelin:', options.madelin);
    results.madelin = await setMadelin(options.madelin);
  }
  
  if (options.resiliation !== undefined) {
    console.log('🔧 Traitement option Résiliation:', options.resiliation);
    results.resiliation = await setResiliation(options.resiliation);
  }
  
  if (options.reprise !== undefined) {
    console.log('🔧 Traitement option Reprise:', options.reprise);
    results.reprise = await setReprise(options.reprise);
  }
  
  // Logique métier : gestion combinée résiliation + reprise
  if (options.reprise !== undefined && options.resiliation !== undefined) {
    // Si reprise = oui, alors résiliation = oui aussi (logique métier SwissLife)
    if (/^oui$/i.test(options.reprise) && /^non$/i.test(options.resiliation)) {
      console.log("⚠️ Correction automatique: reprise=oui implique résiliation=oui");
      results.resiliation = await setResiliation('oui');
    }
  }
  
  // Vérification finale
  const allSuccess = Object.values(results).every(r => r?.ok !== false);
  
  return { 
    ok: allSuccess, 
    results,
    summary: {
      processed: Object.keys(results).length,
      successful: Object.values(results).filter(r => r?.ok === true).length
    }
  };
}

/**
 * Lit toutes les options disponibles
 */
export function readAll() {
  return {
    madelin: readMadelin(),
    resiliation: readResiliation(),
    reprise: readReprise()
  };
}

/**
 * Vérifie la cohérence des options par rapport aux attentes
 */
export function checkAll(expected = {}) {
  const got = readAll();
  const results = [];
  
  if (expected.madelin !== undefined) {
    const expectedBool = /^(true|1|oui|yes)$/i.test(String(expected.madelin));
    results.push({
      option: 'madelin',
      ok: got.madelin.found && got.madelin.checked === expectedBool,
      got: got.madelin.checked,
      expected: expectedBool
    });
  }
  
  if (expected.resiliation !== undefined) {
    results.push({
      option: 'resiliation',
      ok: got.resiliation.found && got.resiliation.value === expected.resiliation,
      got: got.resiliation.value,
      expected: expected.resiliation
    });
  }
  
  if (expected.reprise !== undefined) {
    results.push({
      option: 'reprise',
      ok: got.reprise.found && got.reprise.value === expected.reprise,
      got: got.reprise.value,
      expected: expected.reprise
    });
  }
  
  console.table(results);
  return results;
}

/**
 * Diagnostique détaillé de tous les problèmes
 */
export function diagnoseAll(expected = {}) {
  const state = readAll();
  const health = healthCheckAllOptions();
  const issues = [];
  
  // Vérifications par option
  if (expected.madelin !== undefined && !state.madelin.found) {
    issues.push({ option: 'madelin', severity: 'error', issue: 'not_found' });
  } else if (state.madelin.found && !state.madelin.visible) {
    issues.push({ option: 'madelin', severity: 'warning', issue: 'hidden' });
  }
  
  if (expected.resiliation !== undefined && !state.resiliation.found) {
    issues.push({ option: 'resiliation', severity: 'error', issue: 'not_found' });
  }
  
  if (expected.reprise !== undefined && !state.reprise.found) {
    issues.push({ option: 'reprise', severity: 'error', issue: 'not_found' });
  }
  
  if (overlayPresent()) {
    issues.push({ severity: 'warning', issue: 'overlay_present' });
  }
  
  return { 
    state, 
    issues,
    health,
    available: detectAvailableOptions(),
    visible: detectVisibleOptions()
  };
}

/**
 * Valide la configuration de toutes les options
 */
export function validateAllOptions(options) {
  const errors = [];
  const warnings = [];
  
  if (options.madelin !== undefined) {
    const madelinValidation = validateMadelinConfig(options.madelin);
    if (!madelinValidation.valid) {
      errors.push('Configuration Madelin invalide');
    }
  }
  
  if (options.resiliation !== undefined) {
    const resiliationValidation = validateResiliationConfig(options.resiliation);
    if (!resiliationValidation.valid) {
      errors.push('Configuration Résiliation invalide');
    }
  }
  
  if (options.reprise !== undefined) {
    const repriseValidation = validateRepriseConfig(options.reprise);
    if (!repriseValidation.valid) {
      errors.push('Configuration Reprise invalide');
    }
  }
  
  // Validation logique métier
  if (options.reprise && options.resiliation) {
    if (/^oui$/i.test(options.reprise) && /^non$/i.test(options.resiliation)) {
      warnings.push('Incohérence détectée: reprise=oui devrait impliquer résiliation=oui');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Interface de diagnostic rapide
 */
export function quickDiagnose() {
  const health = healthCheckAllOptions();
  return {
    healthy: health.status === 'healthy',
    score: health.score,
    status: health.status,
    summary: health.summary
  };
}

// Exports pour compatibilité avec l'ancien code
export { setMadelin, readMadelin } from './types/madelin-option.js';
export { setResiliation, readResiliation } from './types/resiliation-option.js';
export { setReprise, readReprise } from './types/reprise-option.js';
export { detectAvailableOptions, detectVisibleOptions } from './core/options-detector.js';

// Export par défaut pour le bridge
export default {
  set: setAll,  // Alias pour le bridge
  setAll,
  readAll,
  checkAll,
  diagnoseAll,
  validateAllOptions,
  quickDiagnose,
  // Méthodes spécialisées
  setMadelin,
  setResiliation,
  setReprise,
  readMadelin,
  readResiliation,
  readReprise
};