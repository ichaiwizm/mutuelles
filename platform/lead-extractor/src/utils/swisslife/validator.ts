import type { Lead } from '@/types/lead';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Valide les données requises pour la conversion
 */
export function validateLead(lead: Lead): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Vérifications critiques
  if (!lead.contact.nom && !lead.contact.prenom) {
    errors.push('Nom et prénom manquants');
  }
  
  if (!lead.contact.codePostal) {
    errors.push('Code postal manquant');
  }
  
  if (!lead.souscripteur.dateNaissance) {
    errors.push('Date de naissance du souscripteur manquante');
  }
  
  // Vérifications non-critiques
  if (!lead.contact.telephone) {
    warnings.push('Téléphone manquant');
  }
  
  if (!lead.contact.email) {
    warnings.push('Email manquant');
  }
  
  if (lead.conjoint && !lead.conjoint.dateNaissance) {
    warnings.push('Date de naissance du conjoint manquante');
  }
  
  if (lead.enfants.length > 0) {
    const enfantsSansDate = lead.enfants.filter(e => !e.dateNaissance);
    if (enfantsSansDate.length > 0) {
      warnings.push(`${enfantsSansDate.length} enfant(s) sans date de naissance`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}