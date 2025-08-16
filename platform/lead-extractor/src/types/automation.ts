export interface AutomationFilters {
  scoreMin: number;
  sources: ('gmail' | 'calendar' | 'multiple')[];
  hasConjoint: 'all' | 'yes' | 'no';
  hasEnfants: 'all' | 'yes' | 'no';
  dateRange: 'today' | '7days' | '30days' | 'all';
}

export interface SwissLifeLead {
  id: string;
  nom: string;
  description: string;
  data: SwissLifeData;
}

export interface SwissLifeData {
  projetNom: string;
  cp: string;
  principalDOB: string;
  conjointDOB: string | null;
  enfantsDOB: string[];
  gammeTexte: string;
  statutTexte: string;
  profTexte: string;
  simulationType: 'individuelle' | 'couple';
}

export interface ConversionResult {
  success: boolean;
  lead?: SwissLifeLead;
  errors?: string[];
  warnings?: string[];
}