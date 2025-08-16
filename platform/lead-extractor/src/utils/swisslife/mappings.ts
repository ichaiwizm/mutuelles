// Mapping des régimes sociaux vers les statuts SwissLife
export const REGIME_TO_STATUT_MAP: Record<string, string> = {
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
export const MEDICAL_PROFESSIONS = [
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
 * Détermine le statut SwissLife basé sur le régime social
 */
export function mapRegimeToStatut(regime: string | undefined): string {
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
export function isProfessionMedicale(profession: string | undefined): boolean {
  if (!profession) return false;
  
  const professionLower = profession.toLowerCase();
  return MEDICAL_PROFESSIONS.some(medical => professionLower.includes(medical));
}