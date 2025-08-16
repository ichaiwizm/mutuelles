import type { Lead } from '@/types/lead';
import type { SwissLifeLead, SwissLifeData, ConversionResult } from '@/types/automation';

// Mapping des régimes sociaux vers les statuts SwissLife
const REGIME_TO_STATUT_MAP: Record<string, string> = {
  'TNS': 'Travailleur Non Salarié',
  'Indépendant': 'Travailleur Non Salarié',
  'Salarié': 'Salarié',
  'Retraité': 'Retraité',
  'Fonctionnaire': 'Fonctionnaire',
  'Libéral': 'Profession Libérale',
  'Profession libérale': 'Profession Libérale',
  'Sans emploi': 'Sans emploi',
  'En recherche d\'emploi': 'Sans emploi',
  'Étudiant': 'Étudiant',
};

// Professions médicales et paramédicales
const MEDICAL_PROFESSIONS = [
  'médecin', 'docteur', 'chirurgien', 'généraliste', 'spécialiste',
  'infirmier', 'infirmière', 'ide',
  'dentiste', 'orthodontiste', 'stomatologue',
  'pharmacien', 'pharmacienne',
  'kinésithérapeute', 'kiné', 'masseur',
  'sage-femme', 'maïeuticien',
  'podologue', 'pédicure',
  'orthophoniste', 'orthoptiste',
  'psychologue', 'psychiatre', 'psychothérapeute',
  'ostéopathe', 'chiropracteur',
  'vétérinaire',
  'auxiliaire médical', 'aide-soignant',
  'manipulateur radio', 'radiologue',
  'biologiste', 'laborantin',
  'anesthésiste', 'réanimateur'
];

/**
 * Convertit une date du format YYYY-MM-DD vers DD/MM/YYYY
 */
function convertDateToSwissFormat(dateStr: string | undefined): string {
  if (!dateStr) return '';
  
  // Si la date est déjà au format DD/MM/YYYY, la retourner
  if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    return dateStr;
  }
  
  // Convertir depuis YYYY-MM-DD
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return '';
  
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
}

/**
 * Détermine le statut SwissLife basé sur le régime social
 */
function mapRegimeToStatut(regime: string | undefined): string {
  if (!regime) return 'Travailleur Non Salarié'; // Défaut
  
  // Recherche exacte d'abord
  if (REGIME_TO_STATUT_MAP[regime]) {
    return REGIME_TO_STATUT_MAP[regime];
  }
  
  // Recherche partielle
  const regimeLower = regime.toLowerCase();
  for (const [key, value] of Object.entries(REGIME_TO_STATUT_MAP)) {
    if (regimeLower.includes(key.toLowerCase())) {
      return value;
    }
  }
  
  return 'Travailleur Non Salarié'; // Défaut
}

/**
 * Détermine si une profession est médicale ou non
 */
function isProfessionMedicale(profession: string | undefined): boolean {
  if (!profession) return false;
  
  const professionLower = profession.toLowerCase();
  return MEDICAL_PROFESSIONS.some(medical => professionLower.includes(medical));
}

/**
 * Génère une description pour le lead
 */
function generateDescription(lead: Lead): string {
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

/**
 * Valide les données requises pour la conversion
 */
function validateLead(lead: Lead): { isValid: boolean; errors: string[]; warnings: string[] } {
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
      simulationType: lead.conjoint ? 'couple' : 'individuelle'
    }
  };
  
  return {
    success: true,
    lead: swissLifeLead,
    warnings: validation.warnings
  };
}

/**
 * Convertit plusieurs leads en batch
 */
export function convertLeadsToSwissLife(leads: Lead[]): {
  successful: SwissLifeLead[];
  failed: { lead: Lead; errors: string[] }[];
  totalWarnings: string[];
} {
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