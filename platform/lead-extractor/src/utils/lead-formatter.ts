import type { Lead } from '@/types/lead';
import { ServiceConfigManager, ConfigValueHelper, type SwissLifeConfig } from './service-config';

// Structure du schéma SwissLife
interface SwissLifeSchema {
  projectName: string;
  hospitalComfort: 'oui' | 'non';
  simulationType: 'individuel' | 'couple';
  souscripteur: {
    dateNaissance: string;
    regimeSocial: string;
    statut: string;
    profession: string;
    departement: string;
  };
  conjoint?: {
    dateNaissance: string;
    regimeSocial: string;
    statut: string;
    profession: string;
    departement: string;
  };
  enfants?: Array<{
    dateNaissance: string;
    ayantDroit?: 'souscripteur' | 'conjoint';
  }>;
  gammes: string;
  options: {
    madelin: 'oui' | 'non';
    resiliation: 'oui' | 'non';
    reprise: 'oui' | 'non';
  };
  dateEffet: string;
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
function getOptions(_lead: Lead, _statut: string, config: SwissLifeConfig): SwissLifeSchema['options'] {
  const options: SwissLifeSchema['options'] = {
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

// Fonction principale de formatage
export function formatLeadForSwissLife(lead: Lead): SwissLifeSchema {
  // Charger la configuration SwissLife
  const config = ServiceConfigManager.getServiceConfig('swisslife');
  
  // Déterminer le régime social
  const regimeSocial = mapRegimeSocial(lead.souscripteur?.regimeSocial);
  const statut = mapStatut(lead.souscripteur?.profession, lead.souscripteur?.regimeSocial);
  const profession = mapProfession(lead.souscripteur?.profession, statut);
  const departement = getDepartementFromCodePostal(lead.contact?.codePostal);
  
  // Type de simulation
  const simulationType = getSimulationType(lead);
  
  // Construire le schéma formaté
  const formatted: SwissLifeSchema = {
    projectName: `Simulation ${lead.contact?.nom || ''} ${lead.contact?.prenom || ''}`.trim(),
    hospitalComfort: config.forceValues.hospitalComfort || 'non',
    simulationType,
    souscripteur: {
      dateNaissance: formatDate(lead.souscripteur?.dateNaissance) || '',
      regimeSocial,
      statut,
      profession,
      departement
    },
    gammes: config.forceValues.gammes || 'SwissLife Santé',
    options: getOptions(lead, statut, config),
    dateEffet: getDateEffet(lead, config)
  };
  
  // Ajouter le conjoint si simulation couple
  if (simulationType === 'couple' && lead.conjoint) {
    const conjointRegime = mapRegimeSocial(lead.conjoint.regimeSocial);
    const conjointStatut = mapStatut(lead.conjoint.profession, lead.conjoint.regimeSocial);
    const conjointProfession = mapProfession(lead.conjoint.profession, conjointStatut);
    
    formatted.conjoint = {
      dateNaissance: formatDate(lead.conjoint.dateNaissance) || '',
      regimeSocial: conjointRegime,
      statut: conjointStatut,
      profession: conjointProfession,
      departement // Même département que le souscripteur
    };
  }
  
  // Ajouter les enfants si présents
  if (lead.enfants && lead.enfants.length > 0) {
    formatted.enfants = lead.enfants
      .slice(0, 4) // Maximum 4 enfants
      .map(enfant => {
        const enfantFormatted: any = {
          dateNaissance: formatDate(enfant.dateNaissance) || ''
        };
        
        // Ajouter ayantDroit seulement pour les couples
        if (simulationType === 'couple') {
          enfantFormatted.ayantDroit = 'souscripteur';
        }
        
        return enfantFormatted;
      });
  }
  
  return formatted;
}

// Fonction pour formater plusieurs leads
export function formatMultipleLeads(leads: Lead[]): Record<string, SwissLifeSchema> {
  const formattedLeads: Record<string, SwissLifeSchema> = {};
  
  for (const lead of leads) {
    if (lead.id) {
      formattedLeads[lead.id] = formatLeadForSwissLife(lead);
    }
  }
  
  return formattedLeads;
}

// Fonction pour sauvegarder dans localStorage
export function saveFormattedLeadsToStorage(leads: Lead[]): void {
  const config = ServiceConfigManager.getServiceConfig('swisslife');
  const formattedLeads = formatMultipleLeads(leads);
  
  // Sauvegarder avec un timestamp
  const storageData = {
    timestamp: new Date().toISOString(),
    count: Object.keys(formattedLeads).length,
    leads: formattedLeads,
    config: config
  };
  
  // Sauvegarder avec la clé par défaut
  localStorage.setItem('swisslife_formatted_leads', JSON.stringify(storageData));
}

// Fonction pour récupérer les leads formatés du localStorage
export function getFormattedLeadsFromStorage(): Record<string, SwissLifeSchema> | null {
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
export function validateFormattedLead(lead: SwissLifeSchema): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validation basique du schéma formaté
  if (!lead.projectName || lead.projectName.trim() === '') {
    warnings.push('Nom du projet manquant');
  }
  
  if (!lead.souscripteur?.dateNaissance) {
    errors.push('Date de naissance du souscripteur manquante');
  }
  
  if (!lead.dateEffet) {
    errors.push('Date d\'effet manquante');
  }
  
  if (lead.simulationType === 'couple' && !lead.conjoint?.dateNaissance) {
    errors.push('Date de naissance du conjoint manquante pour une simulation couple');
  }
  
  // Validation logique métier
  if (lead.options?.reprise === 'oui' && lead.options?.resiliation === 'non') {
    errors.push('Incohérence: reprise d\'ancienneté sans résiliation');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}