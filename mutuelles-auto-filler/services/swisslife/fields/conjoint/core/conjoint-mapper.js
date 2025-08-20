/**
 * Mappeur de conjoint - Configuration et validation des données
 * Responsable de la normalisation et validation des configs conjoint
 */

import { aliasResolveSync } from '../../../utils/form-utils.js';

/**
 * Configuration par défaut - codes SwissLife exacts
 */
export const DEFAULT_CONFIG = {
  dateNaissance: "01/01/1985",
  regimeSocial: "SECURITE_SOCIALE",  // Code SwissLife exact
  statut: "SALARIE",                 // Code SwissLife exact  
  profession: null
};

/**
 * Normalise la configuration conjoint (mapping des clés)
 */
export function normalizeConjointConfig(cfg = {}) {
  const mappedCfg = { ...cfg };
  
  // Mapping des clés : resolver → service (même logique que souscripteur)
  if (cfg.regime && !cfg.regimeSocial) {
    mappedCfg.regimeSocial = cfg.regime;
    delete mappedCfg.regime;
  }
  
  const config = { ...DEFAULT_CONFIG, ...mappedCfg };
  
  return config;
}

/**
 * Vérifie les valeurs par rapport à une configuration attendue
 */
export function checkConjointValues(currentValues, expectedConfig = DEFAULT_CONFIG) {
  const results = [];
  
  // Date
  if (expectedConfig.dateNaissance) {
    const ok = currentValues.dateNaissance === expectedConfig.dateNaissance;
    results.push({
      field: 'dateNaissance',
      ok,
      got: currentValues.dateNaissance,
      expected: expectedConfig.dateNaissance
    });
  }
  
  // Régime
  if (expectedConfig.regimeSocial) {
    const resolved = aliasResolveSync('regimeSocial', expectedConfig.regimeSocial);
    const ok = currentValues.regimeSocial?.text?.toLowerCase().includes(resolved.toLowerCase());
    results.push({
      field: 'regimeSocial',
      ok,
      got: currentValues.regimeSocial?.text,
      expected: resolved
    });
  }
  
  // Statut
  if (expectedConfig.statut) {
    const resolved = aliasResolveSync('statut', expectedConfig.statut);
    const ok = currentValues.statut?.text?.toLowerCase().includes(resolved.toLowerCase());
    results.push({
      field: 'statut',
      ok,
      got: currentValues.statut?.text,
      expected: resolved
    });
  }
  
  console.table(results);
  return results;
}

/**
 * Génère un diagnostic des problèmes conjoint
 */
export function diagnoseConjointIssues(tabFound, tabVisible, readiness, currentState) {
  const issues = [];
  
  if (!tabFound) {
    issues.push({ issue: 'tab_not_found' });
  } else if (!tabVisible) {
    issues.push({ issue: 'tab_hidden' });
  }
  
  if (readiness.missing.length > 0) {
    issues.push({ issue: 'fields_missing', fields: readiness.missing });
  }
  
  if (readiness.hidden.length > 0) {
    issues.push({ issue: 'fields_hidden', fields: readiness.hidden });
  }
  
  return { state: currentState, issues, ready: readiness };
}