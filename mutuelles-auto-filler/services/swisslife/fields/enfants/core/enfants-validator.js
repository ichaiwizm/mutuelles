/**
 * Validateur d'enfants - Logique de validation et diagnostic
 * Responsable de vérifier la cohérence des données et diagnostiquer les problèmes
 */

import { norm } from '../../../utils/form-utils.js';
import { overlayPresent } from '../../../utils/async-utils.js';
import { findNbEnfantsSelect } from './enfants-detector.js';
import { visibleChildPairs } from './enfants-mapper.js';
import { readChildren } from '../operations/enfants-reader.js';

/**
 * Vérifie la cohérence des données enfants
 */
export function checkChildren(cfg) {
  const n = cfg.nbEnfants || cfg.enfants?.length || 0;
  const got = readChildren(cfg);
  
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
 * Diagnostique détaillé des problèmes
 */
export function diagnoseChildren(cfg) {
  const n = cfg.nbEnfants || cfg.enfants?.length || 0;
  const pairs = visibleChildPairs();
  const issues = [];
  
  // Vérifications générales
  if (!findNbEnfantsSelect()) {
    issues.push({
      issue: 'nb_select_not_found',
      severity: 'error',
      message: 'Select du nombre d\'enfants introuvable'
    });
  }
  
  if (pairs.length !== n) {
    issues.push({
      issue: 'count_mismatch',
      severity: 'warning',
      got: pairs.length,
      expected: n,
      message: `Nombre de slots enfants incorrect: ${pairs.length}/${n}`
    });
  }
  
  if (overlayPresent()) {
    issues.push({
      issue: 'overlay_present',
      severity: 'warning',
      message: 'Overlay/BlockUI présent, attendre la fin des appels réseau'
    });
  }
  
  // Vérifications par enfant
  pairs.forEach((pair, i) => {
    const spec = cfg.enfants?.[i];
    if (!spec) return;
    
    if (!pair.date) {
      issues.push({ 
        index: i, 
        field: 'date', 
        issue: 'element_not_found',
        severity: 'error',
        message: `Champ date enfant ${i + 1} introuvable`
      });
    } else if (pair.date && !pair.date.isConnected) {
      issues.push({ 
        index: i, 
        field: 'date', 
        issue: 'element_disconnected',
        severity: 'warning',
        message: `Champ date enfant ${i + 1} déconnecté du DOM`
      });
    }
    
    if (!pair.ayant) {
      issues.push({ 
        index: i, 
        field: 'ayant', 
        issue: 'element_not_found',
        severity: 'error',
        message: `Select ayant droit enfant ${i + 1} introuvable`
      });
    } else if (pair.ayant && !pair.ayant.isConnected) {
      issues.push({ 
        index: i, 
        field: 'ayant', 
        issue: 'element_disconnected',
        severity: 'warning',
        message: `Select ayant droit enfant ${i + 1} déconnecté du DOM`
      });
    }
  });
  
  return issues;
}

/**
 * Valide la configuration avant traitement
 */
export function validateConfig(cfg) {
  const errors = [];
  const warnings = [];
  
  // Vérifications obligatoires
  if (!cfg) {
    errors.push('Configuration manquante');
    return { valid: false, errors, warnings };
  }
  
  const nbEnfants = parseInt(cfg.nbEnfants);
  if (isNaN(nbEnfants) || nbEnfants < 0) {
    errors.push('Nombre d\'enfants invalide');
  }
  
  if (nbEnfants > 10) {
    warnings.push('Nombre d\'enfants élevé (> 10), vérifier la configuration');
  }
  
  // Vérifications des enfants
  if (cfg.enfants && Array.isArray(cfg.enfants)) {
    cfg.enfants.forEach((enfant, i) => {
      if (!enfant.dateNaissance) {
        warnings.push(`Enfant ${i + 1}: date de naissance manquante`);
      } else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(enfant.dateNaissance)) {
        warnings.push(`Enfant ${i + 1}: format de date invalide (attendu: DD/MM/YYYY)`);
      }
      
      if (!enfant.ayantDroit) {
        warnings.push(`Enfant ${i + 1}: ayant droit manquant`);
      }
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Analyse de santé globale du module enfants
 */
export function healthCheck() {
  const nbSelect = findNbEnfantsSelect();
  const visiblePairs = visibleChildPairs();
  
  const health = {
    score: 100,
    status: 'healthy',
    checks: []
  };
  
  // Vérification du select principal
  if (!nbSelect) {
    health.score -= 50;
    health.status = 'degraded';
    health.checks.push({
      name: 'nb_select',
      status: 'failed',
      message: 'Select du nombre d\'enfants introuvable'
    });
  } else {
    health.checks.push({
      name: 'nb_select',
      status: 'passed',
      message: 'Select du nombre d\'enfants trouvé'
    });
  }
  
  // Vérification de la disponibilité des slots
  if (visiblePairs.length === 0) {
    health.score -= 30;
    if (health.status === 'healthy') health.status = 'degraded';
    health.checks.push({
      name: 'child_slots',
      status: 'warning',
      message: 'Aucun slot enfant visible'
    });
  } else {
    health.checks.push({
      name: 'child_slots',
      status: 'passed',
      message: `${visiblePairs.length} slot(s) enfant disponible(s)`
    });
  }
  
  // Vérification overlay
  if (overlayPresent()) {
    health.score -= 20;
    if (health.status === 'healthy') health.status = 'degraded';
    health.checks.push({
      name: 'overlay',
      status: 'warning',
      message: 'Overlay présent, interface peut être bloquée'
    });
  } else {
    health.checks.push({
      name: 'overlay',
      status: 'passed',
      message: 'Interface libre'
    });
  }
  
  if (health.score <= 50) health.status = 'critical';
  
  return health;
}