// Module de mapping des professions

import { PROFESSION_MAPPINGS } from '../constants/mappings';

// Fonction pour mapper la profession
export function mapProfession(profession?: string, statut?: string): string {
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