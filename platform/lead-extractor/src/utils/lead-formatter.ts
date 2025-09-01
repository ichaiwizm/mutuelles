import type { Lead } from '@/types/lead';
import { ServiceConfigManager, ConfigValueHelper, type SwissLifeConfig } from './service-config';

// Structure du format test-data.json
export interface TestDataLead {
  id: string;
  nom: string;
  prenom: string;
  contact: {
    codePostal: string;
  };
  souscripteur: {
    dateNaissance: string;
    profession: string;
    regimeSocial: string;
    nombreEnfants: number;
  };
  conjoint?: {
    dateNaissance: string;
    profession: string;
    regimeSocial: string;
  };
  enfants?: Array<{
    dateNaissance: string;
  }>;
}

export interface WorkflowEtape {
  order: number;
  name: string;
  service: string;
  required: boolean;
  condition?: string;
  autoResolve?: boolean;
  validate?: boolean;
  data: Record<string, any>;
}

export interface TestDataWorkflow {
  etapes: WorkflowEtape[];
}

export interface TestDataFormat {
  lead: TestDataLead;
  workflow: TestDataWorkflow;
}

// Mappings de conversion
const REGIME_MAPPINGS: Record<string, string> = {
  'TNS : régime des indépendants': 'TNS',
  'Salarié (ou retraité)': 'SECURITE_SOCIALE',
  'TNS': 'TNS',
  'Salarié': 'SECURITE_SOCIALE',
  'Etudiant': 'SECURITE_SOCIALE',
  'Retraité': 'SECURITE_SOCIALE',
  'Fonctionnaire': 'AUTRES_REGIME_SPECIAUX',
  'Exploitant agricole': 'AMEXA',
  'Salarié agricole': 'AMEXA',
  'Régime Local Alsace-Moselle': 'SECURITE_SOCIALE_ALSACE_MOSELLE'
};

const STATUT_MAPPINGS: Record<string, string> = {
  'Chef d\'entreprise': 'TNS',
  'En recherche d\'emploi': 'SALARIE',
  'Salarié': 'SALARIE',
  'Retraité': 'RETRAITE',
  'Etudiant': 'ETUDIANT',
  'Fonctionnaire': 'FONCTIONNAIRE',
  'Travailleur transfrontalier': 'TRAVAILLEUR_TRANSFRONTALIER',
  'Exploitant agricole': 'EXPLOITANT_AGRICOLE',
  'Salarié agricole': 'SALARIE_AGRICOLE',
  'TNS': 'TNS'
};

const PROFESSION_MAPPINGS: Record<string, string> = {
  'Médecin': 'MEDECIN',
  'Chirurgien': 'CHIRURGIEN',
  'Chirurgien dentiste': 'CHIRURGIEN_DENTISTE',
  'Dentiste': 'CHIRURGIEN_DENTISTE',
  'Pharmacien': 'PHARMACIEN',
  'Infirmier': 'AUXILIAIRE_MEDICAL',
  'Kinésithérapeute': 'AUXILIAIRE_MEDICAL',
  'Autre': 'AUTRE',
  'Non médicale': 'AUTRE',
  'Chef d\'entreprise': 'AUTRE',
  'En recherche d\'emploi': 'AUTRE',
  'Salarié': 'AUTRE',
  'Retraité': 'AUTRE',
  'Etudiant': 'AUTRE'
};

// Règles de compatibilité régime/statut
const REGIME_STATUT_RULES: Record<string, string[]> = {
  'SECURITE_SOCIALE': ['SALARIE', 'ETUDIANT', 'RETRAITE', 'TRAVAILLEUR_TRANSFRONTALIER'],
  'SECURITE_SOCIALE_ALSACE_MOSELLE': ['SALARIE', 'ETUDIANT', 'RETRAITE', 'TRAVAILLEUR_TRANSFRONTALIER'],
  'TNS': ['TNS'],
  'AMEXA': ['SALARIE_AGRICOLE', 'EXPLOITANT_AGRICOLE', 'RETRAITE_ANCIEN_SALARIE', 'RETRAITE_ANCIEN_EXPLOITANT'],
  'AUTRES_REGIME_SPECIAUX': ['FONCTIONNAIRE', 'SALARIE', 'ETUDIANT', 'RETRAITE']
};

// Fonction pour extraire le département du code postal
function getDepartementFromCodePostal(codePostal?: string): string {
  if (!codePostal) return '75'; // Paris par défaut
  
  const cp = codePostal.replace(/\D/g, '');
  if (cp.length < 2) return '75';
  
  // Cas spéciaux
  if (cp.startsWith('97')) return cp.substring(0, 3); // DOM-TOM
  if (cp.startsWith('98')) return cp.substring(0, 3); // DOM-TOM
  if (cp.startsWith('20')) return '2A'; // Corse
  
  return cp.substring(0, 2);
}

// Fonction pour formater une date
function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  
  // Si déjà au bon format DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Convertir différents formats
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
}

// Fonction pour déterminer la date d'effet avec configuration
function getDateEffet(lead: Lead, config: SwissLifeConfig): string {
  // Utiliser la date forcée de la configuration si définie
  if (config.forceValues.dateEffet && config.forceValues.dateEffet !== 'auto') {
    return ConfigValueHelper.resolveDateEffet(config.forceValues.dateEffet);
  }
  
  // Utiliser la date d'effet du lead si disponible
  if (lead.besoins?.dateEffet) {
    const formatted = formatDate(lead.besoins.dateEffet);
    if (formatted) return formatted;
  }
  
  // Sinon, utiliser la valeur par défaut de la configuration
  return ConfigValueHelper.resolveDateEffet(config.forceValues.dateEffet);
}

// Fonction pour mapper le régime social
function mapRegimeSocial(regimeSocial?: string): string {
  if (!regimeSocial) return 'SECURITE_SOCIALE';
  
  // Chercher dans les mappings
  for (const [key, value] of Object.entries(REGIME_MAPPINGS)) {
    if (regimeSocial.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  
  // Règles de détection intelligentes
  if (regimeSocial.toLowerCase().includes('tns') || 
      regimeSocial.toLowerCase().includes('indépendant')) {
    return 'TNS';
  }
  
  if (regimeSocial.toLowerCase().includes('agricole') || 
      regimeSocial.toLowerCase().includes('msa')) {
    return 'AMEXA';
  }
  
  if (regimeSocial.toLowerCase().includes('alsace') || 
      regimeSocial.toLowerCase().includes('moselle')) {
    return 'SECURITE_SOCIALE_ALSACE_MOSELLE';
  }
  
  return 'SECURITE_SOCIALE';
}

// Fonction pour mapper le régime social pour test-data.json (format original)
function mapRegimeSocialForTestData(regimeSocial?: string): string {
  if (!regimeSocial) return 'Salarié (ou retraité)';
  
  // Normaliser vers le format test-data
  if (regimeSocial.toLowerCase().includes('tns') || 
      regimeSocial.toLowerCase().includes('indépendant') ||
      regimeSocial.toLowerCase().includes('non salarié')) {
    return 'TNS : régime des indépendants';
  }
  
  return 'Salarié (ou retraité)';
}

// Fonction pour mapper le statut
function mapStatut(profession?: string, regimeSocial?: string): string {
  const regime = mapRegimeSocial(regimeSocial);
  
  // Mapper d'abord par profession
  if (profession) {
    for (const [key, value] of Object.entries(STATUT_MAPPINGS)) {
      if (profession.toLowerCase().includes(key.toLowerCase())) {
        // Vérifier la compatibilité avec le régime
        if (REGIME_STATUT_RULES[regime]?.includes(value)) {
          return value;
        }
      }
    }
  }
  
  // Règles intelligentes basées sur le régime
  if (regime === 'TNS') return 'TNS';
  if (regime === 'AMEXA') {
    if (profession?.toLowerCase().includes('exploitant')) {
      return 'EXPLOITANT_AGRICOLE';
    }
    return 'SALARIE_AGRICOLE';
  }
  
  // Défaut par régime
  const defaultStatuts: Record<string, string> = {
    'SECURITE_SOCIALE': 'SALARIE',
    'SECURITE_SOCIALE_ALSACE_MOSELLE': 'SALARIE',
    'TNS': 'TNS',
    'AMEXA': 'SALARIE_AGRICOLE',
    'AUTRES_REGIME_SPECIAUX': 'FONCTIONNAIRE'
  };
  
  return defaultStatuts[regime] || 'SALARIE';
}

// Fonction pour mapper la profession
function mapProfession(profession?: string, statut?: string): string {
  // Pour les TNS, vérifier les professions médicales
  if (statut === 'TNS' && profession) {
    for (const [key, value] of Object.entries(PROFESSION_MAPPINGS)) {
      if (profession.toLowerCase().includes(key.toLowerCase()) && 
          value !== 'AUTRE') {
        return value;
      }
    }
  }
  
  return 'AUTRE';
}

// Fonction pour déterminer le type de simulation
function getSimulationType(lead: Lead): 'individuel' | 'couple' {
  // Si conjoint présent avec date de naissance
  if (lead.conjoint?.dateNaissance) {
    return 'couple';
  }
  
  return 'individuel';
}

// Fonction pour déterminer les options avec configuration
function getOptions(_lead: Lead, _statut: string, config: SwissLifeConfig): { madelin: 'oui' | 'non'; resiliation: 'oui' | 'non'; reprise: 'oui' | 'non' } {
  const options = {
    // Madelin pour tous selon la configuration
    madelin: config.options.madelin,
    resiliation: config.options.resiliation,
    reprise: config.options.reprise
  };
  
  // Logique métier: si reprise = oui, alors résiliation = oui
  if (options.reprise === 'oui' && options.resiliation === 'non') {
    options.resiliation = 'oui';
  }
  
  return options;
}

// Fonction pour générer le workflow dynamique
function generateWorkflow(lead: TestDataLead, config: SwissLifeConfig): TestDataWorkflow {
  const etapes: WorkflowEtape[] = [];
  let order = 1;

  // Étape 1: projectName (toujours)
  etapes.push({
    order: order++,
    name: 'projectName',
    service: 'nom-projet-service',
    required: true,
    data: {
      value: `Simulation {{lead.nom}} {{lead.prenom}}`
    }
  });

  // Étape 2: hospitalComfort (toujours)
  etapes.push({
    order: order++,
    name: 'hospitalComfort',
    service: 'confort-hospitalisation-service',
    required: true,
    data: {
      value: config.forceValues.hospitalComfort || 'non'
    }
  });

  // Étape 3: simulationType (seulement pour les couples)
  const simulationType = lead.conjoint ? 'couple' : 'individuel';
  if (simulationType === 'couple') {
    etapes.push({
      order: order++,
      name: 'simulationType',
      service: 'simulation-type-service',
      required: true,
      data: {
        value: 'couple'
      }
    });
  }

  // Étape 4: subscriberInfo (toujours)
  etapes.push({
    order: order++,
    name: 'subscriberInfo',
    service: 'souscripteur-service',
    required: true,
    autoResolve: true,
    validate: true,
    data: {
      regime: '{{resolver.regime}}',
      statut: '{{resolver.statut}}',
      profession: '{{resolver.profession}}',
      dateNaissance: '{{resolver.dateNaissance}}',
      departement: '{{resolver.departement}}'
    }
  });

  // Étape 5: spouseInfo (si conjoint)
  if (lead.conjoint) {
    etapes.push({
      order: order++,
      name: 'spouseInfo',
      service: 'conjoint-service',
      required: false,
      condition: '{{lead.conjoint}}',
      autoResolve: true,
      validate: true,
      data: {
        regime: '{{spouseResolver.regime}}',
        statut: '{{spouseResolver.statut}}',
        profession: '{{spouseResolver.profession}}',
        dateNaissance: '{{lead.conjoint.dateNaissance}}',
        departement: '{{spouseResolver.departement}}'
      }
    });
  }

  // Étape 6: childrenInfo (si enfants)
  if (lead.souscripteur.nombreEnfants > 0) {
    const childrenData: Record<string, any> = {
      nbEnfants: '{{lead.souscripteur.nombreEnfants}}'
    };
    
    // Ajouter jusqu'à 3 enfants
    for (let i = 0; i < Math.min(3, lead.souscripteur.nombreEnfants); i++) {
      childrenData[`enfant${i + 1}`] = `{{lead.enfants.${i}.dateNaissance}}`;
    }
    
    etapes.push({
      order: order++,
      name: 'childrenInfo',
      service: 'enfants-service',
      required: false,
      condition: '{{lead.souscripteur.nombreEnfants > 0}}',
      data: childrenData
    });
  }

  // Étape 7: gammes (toujours)
  etapes.push({
    order: order++,
    name: 'gammes',
    service: 'gammes-service',
    required: true,
    data: {
      value: config.forceValues.gammes || 'SwissLife Santé'
    }
  });

  // Étape 8: options (toujours)
  const options = getOptions({} as Lead, 'TNS', config);
  etapes.push({
    order: order++,
    name: 'options',
    service: 'options-service',
    required: true,
    data: {
      madelin: options.madelin,
      resiliation: options.resiliation
    }
  });

  // Étape 9: dateEffet (toujours)
  etapes.push({
    order: order++,
    name: 'dateEffet',
    service: 'date-effet-service',
    required: true,
    data: {
      value: ConfigValueHelper.resolveDateEffet(config.forceValues.dateEffet)
    }
  });

  // Étape 10: navigation (toujours)
  etapes.push({
    order: order++,
    name: 'navigation',
    service: 'navigation-service',
    required: true,
    data: {
      action: 'next'
    }
  });

  return { etapes };
}

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
  const formattedLeads: Record<string, TestDataFormat> = {};
  
  for (const lead of leads) {
    if (lead.id) {
      formattedLeads[lead.id] = formatLeadForSwissLife(lead);
    }
  }
  
  return formattedLeads;
}

// Fonction pour sauvegarder dans localStorage
// DEPRECATED: Cette fonction est maintenant remplacée par ExtensionBridge.sendLeadsToExtension()
// Conservée temporairement pour compatibilité
export function saveFormattedLeadsToStorage(leads: Lead[]): void {
  console.warn('saveFormattedLeadsToStorage is deprecated. Use ExtensionBridge.sendLeadsToExtension() instead.');
  
  const config = ServiceConfigManager.getServiceConfig('swisslife');
  const formattedLeads = formatMultipleLeads(leads);
  
  // Sauvegarder avec un timestamp dans l'ancien format pour compatibilité
  const storageData = {
    timestamp: new Date().toISOString(),
    count: Object.keys(formattedLeads).length,
    leads: formattedLeads,
    config: config
  };
  
  // Sauvegarder avec la clé par défaut
  localStorage.setItem('swisslife_formatted_leads', JSON.stringify(storageData));
  console.log(`📦 ${Object.keys(formattedLeads).length} leads formatés et sauvegardés dans localStorage (format legacy)`);
}

// Fonction pour récupérer les leads formatés du localStorage
export function getFormattedLeadsFromStorage(): Record<string, TestDataFormat> | null {
  const stored = localStorage.getItem('swisslife_formatted_leads');
  if (!stored) return null;
  
  try {
    const data = JSON.parse(stored);
    return data.leads;
  } catch {
    return null;
  }
}

// Fonction pour valider un lead formaté
export function validateFormattedLead(testData: TestDataFormat): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
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