import type { Lead } from '@/types/lead';
import type { SwissLifeLead, ConversionResult } from '@/types/automation';
import { validateLead } from './validator';
import { convertDateToSwissFormat } from './date-utils';
import { mapRegimeToStatut, isProfessionMedicale } from './mappings';
import { generateDescription } from './description-generator';

/**
 * Convertit un lead au format SwissLife
 */
export function convertLeadToSwissLife(lead: Lead): ConversionResult {
  // Validation
  const validation = validateLead(lead);
  if (!validation.isValid) {
    return {
      success: false,
      errors: validation.errors,
      warnings: validation.warnings
    };
  }
  
  // Construction du nom complet
  const nomComplet = [lead.contact.prenom, lead.contact.nom]
    .filter(Boolean)
    .join(' ') || 'Lead sans nom';
  
  // Détermination du type de profession
  const profTexte = isProfessionMedicale(lead.souscripteur.profession) 
    ? 'Médicale' 
    : 'Non médicale';
  
  // Conversion des dates des enfants
  const enfantsDOB = lead.enfants
    .filter(e => e.dateNaissance)
    .map(e => convertDateToSwissFormat(e.dateNaissance));
  
  // Construction de l'objet SwissLife
  const swissLifeLead: SwissLifeLead = {
    id: `lead_${lead.id}`,
    nom: nomComplet,
    description: generateDescription(lead),
    data: {
      projetNom: `Projet ${nomComplet}`,
      cp: lead.contact.codePostal || '',
      principalDOB: convertDateToSwissFormat(lead.souscripteur.dateNaissance),
      conjointDOB: lead.conjoint?.dateNaissance 
        ? convertDateToSwissFormat(lead.conjoint.dateNaissance) 
        : null,
      enfantsDOB,
      gammeTexte: 'SwissLife Santé',
      statutTexte: mapRegimeToStatut(lead.souscripteur.regimeSocial),
      profTexte,
      simulationType: (lead.conjoint && lead.conjoint.dateNaissance) ? 'couple' : 'individuelle'
    }
  };
  
  return {
    success: true,
    lead: swissLifeLead,
    warnings: validation.warnings
  };
}