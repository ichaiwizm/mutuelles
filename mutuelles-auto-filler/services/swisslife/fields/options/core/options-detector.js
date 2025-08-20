/**
 * Détecteur d'options - Logique de détection générale des options
 * Responsable de détecter la disponibilité et la visibilité des différentes options
 */

import { isVisible } from '../../../utils/dom-utils.js';
import { findMadelinBox, diagnoseMadelin } from '../types/madelin-option.js';
import { getResiliationGroup, diagnoseResiliation } from '../types/resiliation-option.js';
import { getRepriseGroup, diagnoseReprise } from '../types/reprise-option.js';

/**
 * Détecte quelles options sont disponibles sur la page
 */
export function detectAvailableOptions() {
  const available = {
    madelin: false,
    resiliation: false,
    reprise: false
  };
  
  // Détection Madelin
  const madelinBox = findMadelinBox();
  available.madelin = !!madelinBox;
  
  // Détection Résiliation
  const resiliationGroup = getResiliationGroup();
  available.resiliation = !!resiliationGroup;
  
  // Détection Reprise
  const repriseGroup = getRepriseGroup();
  available.reprise = !!repriseGroup;
  
  return available;
}

/**
 * Détecte quelles options sont visibles et interactives
 */
export function detectVisibleOptions() {
  const visible = {
    madelin: false,
    resiliation: false,
    reprise: false
  };
  
  // Visibilité Madelin
  const madelinBox = findMadelinBox();
  visible.madelin = madelinBox && isVisible(madelinBox);
  
  // Visibilité Résiliation
  const resiliationGroup = getResiliationGroup();
  visible.resiliation = resiliationGroup && 
    (isVisible(resiliationGroup.oui) || isVisible(resiliationGroup.non));
  
  // Visibilité Reprise
  const repriseGroup = getRepriseGroup();
  visible.reprise = repriseGroup && 
    (isVisible(repriseGroup.oui) || isVisible(repriseGroup.non));
  
  return visible;
}

/**
 * Analyse de santé globale de toutes les options
 */
export function healthCheckAllOptions() {
  const available = detectAvailableOptions();
  const visible = detectVisibleOptions();
  
  const health = {
    score: 100,
    status: 'healthy',
    options: {}
  };
  
  // Santé individuelle par option
  if (available.madelin) {
    health.options.madelin = diagnoseMadelin();
    if (!health.options.madelin.healthy) {
      health.score -= 20;
    }
  }
  
  if (available.resiliation) {
    health.options.resiliation = diagnoseResiliation();
    if (!health.options.resiliation.healthy) {
      health.score -= 20;
    }
  }
  
  if (available.reprise) {
    health.options.reprise = diagnoseReprise();
    if (!health.options.reprise.healthy) {
      health.score -= 20;
    }
  }
  
  // Score global
  if (health.score <= 60) {
    health.status = 'degraded';
  }
  if (health.score <= 40) {
    health.status = 'critical';
  }
  
  return {
    ...health,
    available,
    visible,
    summary: {
      totalAvailable: Object.values(available).filter(Boolean).length,
      totalVisible: Object.values(visible).filter(Boolean).length
    }
  };
}

/**
 * Vérifie si toutes les options requises sont présentes
 */
export function validateRequiredOptions(requiredOptions = []) {
  const available = detectAvailableOptions();
  const missing = [];
  
  for (const option of requiredOptions) {
    if (!available[option]) {
      missing.push(option);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
    available
  };
}

/**
 * Détecte automatiquement le contexte des options selon la page
 */
export function detectOptionsContext() {
  const available = detectAvailableOptions();
  const visible = detectVisibleOptions();
  
  let context = 'unknown';
  
  // Logique de détection du contexte
  if (available.madelin && available.resiliation && available.reprise) {
    context = 'full_options_page';
  } else if (available.madelin && !available.resiliation && !available.reprise) {
    context = 'madelin_only_page';
  } else if (!available.madelin && (available.resiliation || available.reprise)) {
    context = 'contract_options_page';
  }
  
  return {
    context,
    available,
    visible,
    totalOptions: Object.values(available).filter(Boolean).length
  };
}