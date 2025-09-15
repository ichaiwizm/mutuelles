import type { Lead } from '@/types/lead';
import { ServiceConfigManager } from './service-config';

// Import des types
export type { TestDataLead, WorkflowEtape, TestDataWorkflow, TestDataFormat, ValidationResult, ContractOptions, SimulationType } from './lead-formatter/types';

// Import des modules de mapping
import { mapRegimeSocialForTestData } from './lead-formatter/mappers/regime-mapper';

// Import des modules de formatage
import { formatDate } from './lead-formatter/formatters/date-formatter';
// import { getDepartementFromCodePostal } from './lead-formatter/formatters/code-postal-formatter';

// Validation utilities (no direct usage in app)

// Import du workflow builder
import { generateWorkflow } from './lead-formatter/workflow/workflow-builder';

// Legacy storage removed (unused)

// Import des types nécessaires
import type { TestDataLead, TestDataFormat } from './lead-formatter/types';

// Fonction principale de formatage
export function formatLeadForSwissLife(lead: Lead): TestDataFormat {
  // Charger la configuration SwissLife
  const config = ServiceConfigManager.getServiceConfig('swisslife');
  
  // Construire le lead formaté
  const formattedLead: TestDataLead = {
    id: lead.id,
    nom: lead.contact?.nom || '',
    prenom: lead.contact?.prenom || '',
    projectName: (lead.projectName || '').trim() || undefined,
    contact: {
      codePostal: lead.contact?.codePostal || ''
    },
    souscripteur: {
      dateNaissance: formatDate(lead.souscripteur?.dateNaissance) || '',
      profession: lead.souscripteur?.profession || '',
      regimeSocial: mapRegimeSocialForTestData(lead.souscripteur?.regimeSocial),
      nombreEnfants: lead.enfants?.length || 0
    }
  };
  
  // Ajouter le conjoint si présent
  if (lead.conjoint?.dateNaissance) {
    formattedLead.conjoint = {
      dateNaissance: formatDate(lead.conjoint.dateNaissance),
      profession: lead.conjoint.profession || '',
      regimeSocial: mapRegimeSocialForTestData(lead.conjoint.regimeSocial)
    };
  }
  
  // Ajouter les enfants si présents
  if (lead.enfants && lead.enfants.length > 0) {
    formattedLead.enfants = lead.enfants.map(enfant => ({
      dateNaissance: formatDate(enfant.dateNaissance) || ''
    }));
  }
  
  // Générer le workflow
  const workflow = generateWorkflow(formattedLead, config);
  
  return {
    lead: formattedLead,
    workflow
  };
}

// Test helper removed (unused)

// Nouvelle fonction compatible avec ExtensionBridge (utilise le bon format pour l'extension)
export function formatLeadsForExtension(leads: Lead[]) {
  return leads.map((lead, index) => {
    // Utiliser le formatage complet pour avoir le bon workflow
    const fullFormatted = formatLeadForSwissLife(lead);
    
    return {
      id: lead.id,
      nom: `Lead ${index + 1} - ${lead.contact.prenom} ${lead.contact.nom}`,
      description: `${lead.contact.email} - ${lead.contact.ville || 'Ville inconnue'}`,
      lead: fullFormatted.lead,
      workflow: fullFormatted.workflow
    };
  });
}
