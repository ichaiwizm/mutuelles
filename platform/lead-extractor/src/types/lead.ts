export interface Lead {
  id: string;
  contact: {
    civilite?: string;
    nom?: string;
    prenom?: string;
    telephone?: string;
    email?: string;
    adresse?: string;
    codePostal?: string;
    ville?: string;
  };
  souscripteur: {
    dateNaissance?: string;
    profession?: string;
    regimeSocial?: string;
    nombreEnfants?: number;
  };
  conjoint?: {
    dateNaissance?: string;
    profession?: string;
    regimeSocial?: string;
  };
  enfants: Array<{
    dateNaissance?: string;
  }>;
  besoins: {
    dateEffet?: string;
    assureActuellement?: boolean;
    niveaux?: {
      soinsMedicaux?: number;
      hospitalisation?: number;
      optique?: number;
      dentaire?: number;
    };
  };
  source: 'gmail' | 'calendar';
  extractedAt: string;
  rawSnippet?: string;
  fullContent?: string;
  emailSubject?: string;
  emailDate?: string;
  score: number;
  isDuplicate?: boolean;
  notes?: Record<string, any>;
}