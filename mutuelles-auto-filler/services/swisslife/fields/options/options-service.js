/**
 * Service principal des options - Orchestrateur
 * Point d'entrée principal qui coordonne tous les modules d'options
 */

import { waitOverlayGone, overlayPresent } from '../../utils/async-utils.js';
import { success, error, ERROR_CODES } from '../../utils/response-format.js';
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
import { isEligibleForMadelin } from '../../utils/age-utils.js';

/**
 * Vérifie si l'option Madelin doit être traitée selon l'âge du souscripteur
 * @param {any} madelinValue - Valeur demandée pour l'option Madelin
 * @returns {Promise<boolean>} - true si l'option doit être traitée, false sinon
 */
async function shouldProcessMadelinOption(madelinValue) {
  // Si on veut décocher Madelin (valeur falsy), toujours autoriser
  if (!/^(true|1|oui|yes)$/i.test(String(madelinValue))) {
    return true;
  }
  
  try {
    // Pour cocher Madelin, vérifier l'âge du souscripteur
    const { readAllSouscripteurValues } = await import('../souscripteur-service.js');
    const souscripteurData = readAllSouscripteurValues();
    
    if (souscripteurData.dateNaissance?.value) {
      const eligible = isEligibleForMadelin(souscripteurData.dateNaissance.value);
      
      if (eligible === false) {
        console.log('⚠️ Option Madelin ignorée - souscripteur trop âgé (> 70 ans)');
        return false;
      }
      
      if (eligible === null) {
        console.warn('⚠️ Impossible de vérifier l\'âge pour Madelin - date de naissance invalide');
      }
    } else {
      console.warn('⚠️ Date de naissance du souscripteur non trouvée - option Madelin autorisée par défaut');
    }
    
    return true; // Si pas de date ou date valide avec âge ≤ 70, on autorise
  } catch (error) {
    console.error('❌ Erreur lors de la vérification d\'âge pour Madelin:', error);
    return true; // En cas d'erreur, on autorise par défaut
  }
}

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
    return error(ERROR_CODES.VALIDATION_ERROR, `Configuration invalide: ${validation.errors.join(', ')}`);
  }
  
  const results = {};
  let hasErrors = false;
  
  // Traitement séquentiel des options
  if (options.madelin !== undefined) {
    // Vérifier l'éligibilité selon l'âge avant de traiter l'option
    const shouldProcess = await shouldProcessMadelinOption(options.madelin);
    if (shouldProcess) {
      console.log('🔧 Traitement option Madelin:', options.madelin);
      results.madelin = await setMadelin(options.madelin);
      if (results.madelin && !results.madelin.ok) hasErrors = true;
    } else {
      console.log('⏭️ Option Madelin ignorée (âge > 70 ans)');
      results.madelin = { 
        ok: true, 
        skipped: true, 
        reason: 'age_limit_exceeded',
        message: 'Option Loi Madelin non applicable pour les personnes de plus de 70 ans'
      };
    }
  }
  
  if (options.resiliation !== undefined) {
    console.log('🔧 Traitement option Résiliation:', options.resiliation);
    results.resiliation = await setResiliation(options.resiliation);
    if (results.resiliation && !results.resiliation.ok) hasErrors = true;
  }
  
  if (options.reprise !== undefined) {
    console.log('🔧 Traitement option Reprise:', options.reprise);
    results.reprise = await setReprise(options.reprise);
    if (results.reprise && !results.reprise.ok) hasErrors = true;
  }
  
  // Logique métier : gestion combinée résiliation + reprise
  if (options.reprise !== undefined && options.resiliation !== undefined) {
    // Si reprise = oui, alors résiliation = oui aussi (logique métier SwissLife)
    if (/^oui$/i.test(options.reprise) && /^non$/i.test(options.resiliation)) {
      console.log("⚠️ Correction automatique: reprise=oui implique résiliation=oui");
      results.resiliation = await setResiliation('oui');
      if (results.resiliation && !results.resiliation.ok) hasErrors = true;
    }
  }
  
  const summary = {
    processed: Object.keys(results).length,
    successful: Object.values(results).filter(r => r?.ok === true).length,
    failed: Object.values(results).filter(r => r?.ok === false).length
  };
  
  if (hasErrors) {
    return error(ERROR_CODES.VALIDATION_ERROR, 'Certaines options n\'ont pas pu être définies correctement', {
      results,
      summary
    });
  }
  
  return success({ 
    results,
    summary
  });
}

/**
 * Lit toutes les options disponibles
 */
export function readAll() {
  try {
    const data = {
      madelin: readMadelin(),
      resiliation: readResiliation(),
      reprise: readReprise()
    };
    
    return success(data);
  } catch (err) {
    return error(ERROR_CODES.NOT_FOUND, `Erreur lors de la lecture des options: ${err.message}`);
  }
}

/**
 * Vérifie la cohérence des options par rapport aux attentes
 */
export function checkAll(expected = {}) {
  const readResult = readAll();
  if (!readResult.ok) {
    return error(readResult.error.code, `Impossible de lire les options: ${readResult.error.message}`);
  }
  
  const got = readResult.data;
  const results = [];
  let allMatch = true;
  
  if (expected.madelin !== undefined) {
    const expectedBool = /^(true|1|oui|yes)$/i.test(String(expected.madelin));
    const match = got.madelin.found && got.madelin.checked === expectedBool;
    results.push({
      option: 'madelin',
      ok: match,
      got: got.madelin.checked,
      expected: expectedBool
    });
    if (!match) allMatch = false;
  }
  
  if (expected.resiliation !== undefined) {
    const match = got.resiliation.found && got.resiliation.value === expected.resiliation;
    results.push({
      option: 'resiliation',
      ok: match,
      got: got.resiliation.value,
      expected: expected.resiliation
    });
    if (!match) allMatch = false;
  }
  
  if (expected.reprise !== undefined) {
    const match = got.reprise.found && got.reprise.value === expected.reprise;
    results.push({
      option: 'reprise',
      ok: match,
      got: got.reprise.value,
      expected: expected.reprise
    });
    if (!match) allMatch = false;
  }
  
  console.table(results);
  
  if (!allMatch) {
    const mismatches = results.filter(r => !r.ok).map(r => `${r.option}: attendu ${r.expected}, obtenu ${r.got}`);
    return error(ERROR_CODES.VALUE_MISMATCH, `Options incorrectes: ${mismatches.join(', ')}`);
  }
  
  return success({ results, allMatch: true });
}

/**
 * Diagnostique détaillé de tous les problèmes
 */
export function diagnoseAll(expected = {}) {
  const readResult = readAll();
  const health = healthCheckAllOptions();
  const issues = [];
  
  let state = null;
  if (readResult.ok) {
    state = readResult.data;
    
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
  } else {
    issues.push({ 
      severity: 'error', 
      issue: 'read_failed', 
      message: readResult.error.message 
    });
  }
  
  if (overlayPresent()) {
    issues.push({ severity: 'warning', issue: 'overlay_present' });
  }
  
  const diagnosis = {
    state, 
    issues,
    health,
    available: detectAvailableOptions(),
    visible: detectVisibleOptions(),
    hasIssues: issues.length > 0
  };
  
  return success(diagnosis);
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
  try {
    const health = healthCheckAllOptions();
    const data = {
      healthy: health.status === 'healthy',
      score: health.score,
      status: health.status,
      summary: health.summary
    };
    
    return success(data);
  } catch (err) {
    return error(ERROR_CODES.NOT_FOUND, `Erreur lors du diagnostic rapide: ${err.message}`);
  }
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