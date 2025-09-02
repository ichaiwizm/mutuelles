// Mappings de conversion pour les leads SwissLife

// Mappings de régimes sociaux
export const REGIME_MAPPINGS: Record<string, string> = {
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

// Mappings de statuts
export const STATUT_MAPPINGS: Record<string, string> = {
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

// Mappings de professions
export const PROFESSION_MAPPINGS: Record<string, string> = {
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
export const REGIME_STATUT_RULES: Record<string, string[]> = {
  'SECURITE_SOCIALE': ['SALARIE', 'ETUDIANT', 'RETRAITE', 'TRAVAILLEUR_TRANSFRONTALIER'],
  'SECURITE_SOCIALE_ALSACE_MOSELLE': ['SALARIE', 'ETUDIANT', 'RETRAITE', 'TRAVAILLEUR_TRANSFRONTALIER'],
  'TNS': ['TNS'],
  'AMEXA': ['SALARIE_AGRICOLE', 'EXPLOITANT_AGRICOLE', 'RETRAITE_ANCIEN_SALARIE', 'RETRAITE_ANCIEN_EXPLOITANT'],
  'AUTRES_REGIME_SPECIAUX': ['FONCTIONNAIRE', 'SALARIE', 'ETUDIANT', 'RETRAITE']
};

// Statuts par défaut selon le régime
export const DEFAULT_STATUTS_BY_REGIME: Record<string, string> = {
  'SECURITE_SOCIALE': 'SALARIE',
  'SECURITE_SOCIALE_ALSACE_MOSELLE': 'SALARIE',
  'TNS': 'TNS',
  'AMEXA': 'SALARIE_AGRICOLE',
  'AUTRES_REGIME_SPECIAUX': 'FONCTIONNAIRE'
};