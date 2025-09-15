export interface Lead {
  id: string;
  projectName?: string;
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
    civilite?: string;
    prenom?: string;
    nom?: string;
    dateNaissance?: string;
    profession?: string;
    regimeSocial?: string;
  };
  enfants: Array<{
    dateNaissance?: string;
    sexe?: string;
  }>;
  besoins: {
    dateEffet?: string;
    assureActuellement?: boolean;
    gammes?: string;
    madelin?: boolean;
    niveaux?: {
      soinsMedicaux?: number;
      hospitalisation?: number;
      optique?: number;
      dentaire?: number;
    };
  };
  signature?: {
    numeroOrias?: string;
    siren?: string;
    siteWeb?: string;
    instagram?: string;
    numeroRCP?: string;
    nomEntreprise?: string;
  };
  source: 'gmail' | 'calendar' | 'multiple' | 'manual';
  extractedAt: string;
  rawSnippet?: string;
  fullContent?: string;
  emailSubject?: string;
  emailDate?: string;
  processingStatus?: {
    status: 'pending' | 'processing' | 'success' | 'error';
    timestamp?: string;
    message?: string;
    errorMessage?: string;
    completedSteps?: number;
    currentStep?: number;
    totalSteps?: number;
  };
  score: number;
  isDuplicate?: boolean;
  notes?: Record<string, any>;
}
