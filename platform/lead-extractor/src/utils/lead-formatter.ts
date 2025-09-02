import type { Lead } from '@/types/lead';
import { ServiceConfigManager } from './service-config';

// Import des types
export type { TestDataLead, WorkflowEtape, TestDataWorkflow, TestDataFormat, ValidationResult, ContractOptions, SimulationType } from './lead-formatter/types';

// Import des modules de mapping
import { mapRegimeSocialForTestData } from './lead-formatter/mappers/regime-mapper';

// Import des modules de formatage
import { formatDate } from './lead-formatter/formatters/date-formatter';
// import { getDepartementFromCodePostal } from './lead-formatter/formatters/code-postal-formatter';

// Import du module de validation
export { validateFormattedLead } from './lead-formatter/validators/lead-validator';
import { validateFormattedLead } from './lead-formatter/validators/lead-validator';

// Import du workflow builder
import { generateWorkflow } from './lead-formatter/workflow/workflow-builder';

// Import du storage legacy
export { getFormattedLeadsFromStorage } from './lead-formatter/storage/legacy-storage';
import { saveFormattedLeadsToStorage as saveFormattedLeadsToStorageImpl, formatMultipleLeadsForStorage } from './lead-formatter/storage/legacy-storage';

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

// Fonction pour formater plusieurs leads
export function formatMultipleLeads(leads: Lead[]): Record<string, TestDataFormat> {
  return formatMultipleLeadsForStorage(leads, formatLeadForSwissLife);
}

// Fonction pour sauvegarder dans localStorage
// DEPRECATED: Cette fonction est maintenant remplacée par ExtensionBridge.sendLeadsToExtension()
// Conservée temporairement pour compatibilité
export function saveFormattedLeadsToStorage(leads: Lead[]): void {
  saveFormattedLeadsToStorageImpl(leads, formatMultipleLeads);
}

// Fonction de test avec un lead d'exemple
export function testLeadConversion(): void {
  // Lead d'exemple basé sur les données fournies (DESCHAMPS)
  const sampleLead = {
    id: "1b326cd5-5919-4233-a611-74e8113ce013",
    contact: {
      civilite: "M.",
      nom: "Deschamps",
      prenom: "Baptiste",
      adresse: "2 RUE DEBRAY",
      codePostal: "44300",
      ville: "NANTES",
      telephone: "06.99.79.67.14",
      email: "baptiste.deschamps@hotmail.fr"
    },
    souscripteur: {
      dateNaissance: "1991-06-02",
      profession: "Chef d'entreprise",
      regimeSocial: "TNS",
      nombreEnfants: 3
    },
    conjoint: {
      dateNaissance: "1992-09-11",
      profession: "En recherche d'emploi",
      regimeSocial: "Salarié"
    },
    enfants: [
      { dateNaissance: "2019-03-14" },
      { dateNaissance: "2021-05-05" },
      { dateNaissance: "2024-08-08" }
    ],
    besoins: {
      dateEffet: "2025-04-07",
      assureActuellement: false,
      niveaux: {
        soinsMedicaux: 3,
        hospitalisation: 3,
        optique: 3,
        dentaire: 3
      }
    }
  };
  
  try {
    console.log('🧪 Test de conversion lead → test-data.json');
    const converted = formatLeadForSwissLife(sampleLead as any);
    const validation = validateFormattedLead(converted);
    
    console.log('📊 Lead converti:', JSON.stringify(converted, null, 2));
    console.log('✅ Validation:', validation);
    
    if (validation.isValid) {
      console.log('✅ Conversion réussie !');
    } else {
      console.log('❌ Erreurs de validation:', validation.errors);
    }
    
    if (validation.warnings.length > 0) {
      console.log('⚠️ Avertissements:', validation.warnings);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la conversion:', error);
  }
}

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