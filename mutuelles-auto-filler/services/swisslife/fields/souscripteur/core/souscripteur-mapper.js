/**
 * Mappeur de souscripteur - Configuration et validation des données
 * Responsable de la normalisation et validation des configs souscripteur
 */

import { T } from '../../../utils/form-utils.js';
import { highlight, hiddenReason } from '../../../utils/dom-utils.js';
import { 
  findDateElement,
  findRegimeSelect,
  findStatutSelect,
  findProfessionSelect,
  findDepartementSelect 
} from './souscripteur-detector.js';

/**
 * Configuration par défaut - codes SwissLife exacts
 */
export const DEFAULT_CONFIG = {
  dateNaissance: "01/01/1980",
  regimeSocial: "SECURITE_SOCIALE",  // Code SwissLife exact
  statut: "SALARIE",                 // Code SwissLife exact
  profession: null,
  departement: "75"
};

/**
 * Normalise la configuration souscripteur (mapping des clés)
 */
export function normalizeSouscripteurConfig(cfg = {}) {
  const mappedCfg = { ...cfg };
  
  // Mapping des clés : resolver → service (même logique que conjoint)
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
export function checkSouscripteurValues(currentValues, expectedConfig = DEFAULT_CONFIG) {
  const results = [];
  
  for (const [key, expected] of Object.entries(expectedConfig)) {
    if (!expected) continue;
    
    const field = currentValues[key];
    if (!field || !field.found) {
      results.push({ field: key, ok: false, reason: 'not_found' });
      continue;
    }
    
    const got = field.value || "";
    const ok = T(got).toLowerCase().includes(T(expected).toLowerCase());
    results.push({ field: key, ok, got, expected });
  }
  
  console.table(results);
  return results;
}

/**
 * Génère un diagnostic détaillé des problèmes souscripteur
 */
export function diagnoseSouscripteurIssues(currentValues, expectedConfig = DEFAULT_CONFIG) {
  const issues = [];
  
  for (const [key, data] of Object.entries(currentValues)) {
    if (!data.found) {
      issues.push({ field: key, issue: 'not_found' });
      continue;
    }
    
    if (!data.visible) {
      const el = {
        dateNaissance: findDateElement(),
        regimeSocial: findRegimeSelect(),
        statut: findStatutSelect(),
        profession: findProfessionSelect(),
        departement: findDepartementSelect()
      }[key];
      
      const reason = hiddenReason(el);
      issues.push({ field: key, issue: 'hidden', reason });
      
      // Highlight pour debug
      if (el) highlight(el);
      continue;
    }
    
    if (data.disabled) {
      issues.push({ field: key, issue: 'disabled' });
      continue;
    }
    
    const expected = expectedConfig[key];
    if (expected && data.value) {
      const match = T(data.value).toLowerCase().includes(T(expected).toLowerCase());
      if (!match) {
        issues.push({ field: key, issue: 'mismatch', got: data.value, expected });
      }
    }
  }
  
  return { state: currentValues, issues };
}