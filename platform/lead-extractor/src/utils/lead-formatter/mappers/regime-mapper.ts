// Module de mapping des régimes sociaux

import { REGIME_MAPPINGS } from '../constants/mappings';

// Fonction pour mapper le régime social
export function mapRegimeSocial(regimeSocial?: string): string {
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
export function mapRegimeSocialForTestData(regimeSocial?: string): string {
  if (!regimeSocial) return 'Salarié (ou retraité)';
  
  // Normaliser vers le format test-data
  if (regimeSocial.toLowerCase().includes('tns') || 
      regimeSocial.toLowerCase().includes('indépendant') ||
      regimeSocial.toLowerCase().includes('non salarié')) {
    return 'TNS : régime des indépendants';
  }
  
  return 'Salarié (ou retraité)';
}