import type { Lead } from '@/types/lead';

/**
 * Génère une description pour le lead
 */
export function generateDescription(lead: Lead): string {
  const parts: string[] = [];
  
  // Type de simulation
  if (lead.conjoint) {
    parts.push('Couple');
  } else {
    parts.push('Individuel');
  }
  
  // Nombre d'enfants
  const nbEnfants = lead.enfants.length || lead.souscripteur.nombreEnfants || 0;
  if (nbEnfants === 0) {
    parts.push('0 enfant');
  } else if (nbEnfants === 1) {
    parts.push('1 enfant');
  } else {
    parts.push(`${nbEnfants} enfants`);
  }
  
  return parts.join(', ');
}