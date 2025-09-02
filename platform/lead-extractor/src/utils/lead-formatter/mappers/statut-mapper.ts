// Module de mapping des statuts

import { STATUT_MAPPINGS, REGIME_STATUT_RULES, DEFAULT_STATUTS_BY_REGIME } from '../constants/mappings';
import { mapRegimeSocial } from './regime-mapper';

// Fonction pour mapper le statut
export function mapStatut(profession?: string, regimeSocial?: string): string {
  const regime = mapRegimeSocial(regimeSocial);
  
  // Mapper d'abord par profession
  if (profession) {
    for (const [key, value] of Object.entries(STATUT_MAPPINGS)) {
      if (profession.toLowerCase().includes(key.toLowerCase())) {
        // Vérifier la compatibilité avec le régime
        if (REGIME_STATUT_RULES[regime]?.includes(value)) {
          return value;
        }
      }
    }
  }
  
  // Règles intelligentes basées sur le régime
  if (regime === 'TNS') return 'TNS';
  if (regime === 'AMEXA') {
    if (profession?.toLowerCase().includes('exploitant')) {
      return 'EXPLOITANT_AGRICOLE';
    }
    return 'SALARIE_AGRICOLE';
  }
  
  // Défaut par régime
  return DEFAULT_STATUTS_BY_REGIME[regime] || 'SALARIE';
}