import logger from '../../../logger.js';
import { RAW_KEYS } from '../constants/AssurleadConstants.js';

const strip = (s='') => s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();

export function splitKV(line) {
  // Gestion des deux points (format AssurProspect)
  const mColon = line.match(/^(.+?)\s*:\s*(.+)$/);
  if (mColon) return [mColon[1], mColon[2]];

  // Gestion du format Assurlead avec espaces/tabs multiples ou un seul TAB
  const mSpaces = line.match(/^(.+?)\s*\t\s*(.+)$/) || line.match(/^(.+?)\s{2,}(.+)$/);
  if (mSpaces) {
    const key = mSpaces[1].trim();
    const value = mSpaces[2].trim();
    
    logger.debug('AssurleadParser parsing with tabs/spaces', { 
      original_key: key, 
      value: value
    });
    
    if (value && value !== 'NON RENSEIGNE') {
      return [key, value];
    }
  }

  // Méthode de fallback avec analyse par mots - PRIORITÉ AUX CLÉS SPÉCIFIQUES
  // Éviter le fallback sur des lignes spécifiques problématiques
  if (line.trim() === 'Telephone domicile' || line.trim() === 'Telephone portable') {
    return [null, null];
  }
  
  const words = line.split(/\s+/);
  
  // D'abord chercher les clés spécifiques les plus longues (enfants, conjoint)
  // Aller de la plus longue à la plus courte pour éviter les conflits
  for (let keyLength = Math.min(words.length - 1, 6); keyLength >= 1; keyLength--) {
    const potentialKey = words.slice(0, keyLength).join(' ');
    const normalizedKey = strip(potentialKey).replace(/\s+/g,' ').trim();
    
    logger.debug('AssurleadParser testing fallback key', {
      potential_key: potentialKey,
      normalized_key: normalizedKey,
      key_length: keyLength,
      exists: RAW_KEYS.hasOwnProperty(normalizedKey)
    });
    
    if (RAW_KEYS.hasOwnProperty(normalizedKey)) {
      const value = words.slice(keyLength).join(' ');
      if (value && value !== 'NON RENSEIGNE') {
        logger.debug('AssurleadParser fallback key matched', {
          original_key: potentialKey,
          normalized_key: normalizedKey,
          value: value,
          key_length: keyLength
        });
        return [potentialKey, value];
      }
    }
  }

  return [null, null];
}