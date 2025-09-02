// Module de validation des leads formatés

import type { TestDataFormat, ValidationResult } from '../types';

// Fonction pour valider un lead formaté
export function validateFormattedLead(testData: TestDataFormat): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validation de la structure lead
  if (!testData.lead?.nom || testData.lead.nom.trim() === '') {
    warnings.push('Nom du lead manquant');
  }
  
  if (!testData.lead?.souscripteur?.dateNaissance) {
    errors.push('Date de naissance du souscripteur manquante');
  }
  
  // Validation du workflow
  if (!testData.workflow?.etapes || testData.workflow.etapes.length === 0) {
    errors.push('Workflow manquant ou vide');
  }
  
  // Vérifier la cohérence entre lead et workflow
  const simulationType = testData.lead.conjoint ? 'couple' : 'individuel';
  const simulationTypeEtape = testData.workflow.etapes.find(e => e.name === 'simulationType');
  
  if (simulationTypeEtape && simulationTypeEtape.data.value !== simulationType) {
    warnings.push('Incohérence entre lead et type de simulation dans le workflow');
  }
  
  // Validation conjoint
  if (testData.lead.conjoint && !testData.lead.conjoint.dateNaissance) {
    errors.push('Date de naissance du conjoint manquante pour une simulation couple');
  }
  
  // Validation enfants
  if (testData.lead.souscripteur.nombreEnfants > 0) {
    if (!testData.lead.enfants || testData.lead.enfants.length === 0) {
      errors.push('Enfants déclarés mais aucune donnée d\'enfant présente');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}