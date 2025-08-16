import type { Lead } from '@/types/lead';
import type { SwissLifeLead } from '@/types/automation';
import { convertLeadToSwissLife } from './lead-converter';

export interface BatchConversionResult {
  successful: SwissLifeLead[];
  failed: { lead: Lead; errors: string[] }[];
  totalWarnings: string[];
}

/**
 * Convertit plusieurs leads en batch
 */
export function convertLeadsToSwissLife(leads: Lead[]): BatchConversionResult {
  const successful: SwissLifeLead[] = [];
  const failed: { lead: Lead; errors: string[] }[] = [];
  const totalWarnings: string[] = [];
  
  for (const lead of leads) {
    const result = convertLeadToSwissLife(lead);
    
    if (result.success && result.lead) {
      successful.push(result.lead);
      if (result.warnings) {
        totalWarnings.push(...result.warnings.map(w => `${lead.contact.nom || 'Lead'}: ${w}`));
      }
    } else {
      failed.push({
        lead,
        errors: result.errors || ['Erreur inconnue']
      });
    }
  }
  
  return {
    successful,
    failed,
    totalWarnings
  };
}