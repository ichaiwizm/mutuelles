// Types et interfaces pour le formatage des leads SwissLife

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

// Interface pour les résultats de validation
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Interface pour les options du contrat
export interface ContractOptions {
  madelin: 'oui' | 'non';
  resiliation: 'oui' | 'non';
  reprise: 'oui' | 'non';
}

// Type pour le type de simulation
export type SimulationType = 'individuel' | 'couple';