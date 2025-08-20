// Re-export des fonctions principales depuis le formatter unifié
export { formatLeadForSwissLife as convertLeadToSwissLife, formatMultipleLeads, saveFormattedLeadsToStorage, validateFormattedLead } from './lead-formatter';

// Import des fonctions pour usage interne
import { formatLeadForSwissLife, validateFormattedLead } from './lead-formatter';

// Types simplifiés pour l'export
export interface BatchConversionResult {
  successful: any[];
  failed: { lead: any; errors: string[] }[];
  totalWarnings: string[];
}

// Fonction de conversion en batch utilisant le formatter unifié
export function convertLeadsToSwissLife(leads: any[]): BatchConversionResult {
  const successful: any[] = [];
  const failed: { lead: any; errors: string[] }[] = [];
  const totalWarnings: string[] = [];
  
  for (const lead of leads) {
    try {
      // Utiliser directement formatLeadForSwissLife pour chaque lead
      const formatted = formatLeadForSwissLife(lead);
      
      if (formatted) {
        // Validation du lead formaté
        const validation = validateFormattedLead(formatted);
        
        if (validation.isValid) {
          successful.push(formatted);
          if (validation.warnings.length > 0) {
            totalWarnings.push(...validation.warnings.map(w => `${lead.contact?.nom || 'Lead'}: ${w}`));
          }
        } else {
          failed.push({
            lead,
            errors: validation.errors
          });
        }
      } else {
        failed.push({
          lead,
          errors: ['Échec du formatage - résultat vide']
        });
      }
    } catch (error) {
      failed.push({
        lead,
        errors: [error instanceof Error ? error.message : 'Erreur inconnue']
      });
    }
  }
  
  return {
    successful,
    failed,
    totalWarnings
  };
}