// Types pour le formulaire d'ajout manuel de leads SwissLife
export interface ManualLeadForm {
  // Configuration de base
  simulationType: 'individuel' | 'couple';
  projectName?: 'lead_name' | 'lead_source'; // Hérite de la config globale (format)
  projectNameValue?: string; // Valeur personnalisée (champ formulaire)
  dateEffet?: 'end_next_month' | 'start_next_month' | 'middle_next_month'; // Hérite de la config globale
  loiMadelin: 'oui' | 'non';
  
  // Assuré principal
  souscripteur: {
    nom?: string;
    prenom?: string;
    dateNaissance: string;
    regimeSocial: RegimeSocial;
    statut: string;
    profession?: string;
    codePostal: string;
    nombreEnfants: number;
  };
  
  // Conjoint (optionnel)
  conjoint?: {
    nom?: string;
    prenom?: string;
    dateNaissance: string;
    regimeSocial: RegimeSocial;
    statut: string;
    profession?: string;
  };
  
  // Enfants (optionnel)
  enfants: Array<{
    dateNaissance: string;
    ayantDroit: 'souscripteur' | 'conjoint';
  }>;
}

export type RegimeSocial = 
  | 'SECURITE_SOCIALE'
  | 'SECURITE_SOCIALE_ALSACE_MOSELLE'
  | 'TNS'
  | 'AMEXA'
  | 'AUTRES_REGIME_SPECIAUX';

export interface RegimeOption {
  value: RegimeSocial;
  label: string;
  statuts: StatutOption[];
}

export interface StatutOption {
  value: string;
  label: string;
  professions?: ProfessionOption[];
}

export interface ProfessionOption {
  value: string;
  label: string;
}

// Configuration des régimes et statuts disponibles
export const REGIME_OPTIONS: RegimeOption[] = [
  {
    value: 'SECURITE_SOCIALE',
    label: 'Régime Général (CPAM)',
    statuts: [
      { 
        value: 'SALARIE', 
        label: 'Salarié et autres statuts',
        professions: [
          { value: 'MEDECIN', label: 'Médecin' },
          { value: 'CHIRURGIEN', label: 'Chirurgien' },
          { value: 'CHIRURGIEN_DENTISTE', label: 'Chirurgien dentiste' },
          { value: 'PHARMACIEN', label: 'Pharmacien' },
          { value: 'AUXILIAIRE_MEDICAL', label: 'Auxiliaire médical' },
          { value: 'AUTRE', label: 'Non médicale' }
        ]
      },
      { value: 'ETUDIANT', label: 'Étudiant' },
      { value: 'TRAVAILLEUR_TRANSFRONTALIER', label: 'Travailleur transfrontalier' },
      { value: 'FONCTIONNAIRE', label: 'Fonctionnaire' }
    ]
  },
  {
    value: 'SECURITE_SOCIALE_ALSACE_MOSELLE',
    label: 'Régime Local (CPAM Alsace Moselle)',
    statuts: [
      { value: 'SALARIE', label: 'Salarié et autres statuts' },
      { value: 'ETUDIANT', label: 'Étudiant' },
      { value: 'TRAVAILLEUR_TRANSFRONTALIER', label: 'Travailleur transfrontalier' },
      { value: 'FONCTIONNAIRE', label: 'Fonctionnaire' }
    ]
  },
  {
    value: 'TNS',
    label: 'Régime Général pour TNS (CPAM)',
    statuts: [
      { 
        value: 'TNS', 
        label: 'Travailleur Non Salarié',
        professions: [
          { value: 'MEDECIN', label: 'Médecin' },
          { value: 'CHIRURGIEN', label: 'Chirurgien' },
          { value: 'CHIRURGIEN_DENTISTE', label: 'Chirurgien dentiste' },
          { value: 'PHARMACIEN', label: 'Pharmacien' },
          { value: 'AUXILIAIRE_MEDICAL', label: 'Auxiliaire médical' },
          { value: 'AUTRE', label: 'Non médicale' }
        ]
      },
      { value: 'RETRAITE', label: 'Retraité' }
    ]
  },
  {
    value: 'AMEXA',
    label: 'Mutualité Sociale Agricole (MSA-Amexa)',
    statuts: [
      { value: 'SALARIE_AGRICOLE', label: 'Salarié agricole' },
      { value: 'EXPLOITANT_AGRICOLE', label: 'Exploitant agricole' },
      { value: 'ETUDIANT', label: 'Étudiant' },
      { value: 'RETRAITE_ANCIEN_SALARIE', label: 'Retraité (ancien salarié)' },
      { value: 'RETRAITE_ANCIEN_EXPLOITANT', label: 'Retraité (ancien exploitant)' }
    ]
  },
  {
    value: 'AUTRES_REGIME_SPECIAUX',
    label: 'Autres régimes spéciaux',
    statuts: [
      { value: 'SALARIE', label: 'Salarié et autres statuts' },
      { value: 'RETRAITE', label: 'Retraité' }
    ]
  }
];

// Valeurs par défaut
export const DEFAULT_MANUAL_LEAD: ManualLeadForm = {
  simulationType: 'individuel',
  projectNameValue: '',
  loiMadelin: 'oui',
  souscripteur: {
    nom: '',
    prenom: '',
    dateNaissance: '',
    regimeSocial: 'TNS',
    statut: 'TNS',
    profession: 'AUTRE',
    codePostal: '',
    nombreEnfants: 0
  },
  enfants: []
};
