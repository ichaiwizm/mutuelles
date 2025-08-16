import logger from '../../../logger.js';
import { RAW_KEYS } from '../constants/AssurleadConstants.js';

const strip = (s='') => s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();

export function splitKV(line) {
  // Gestion des deux points (format AssurProspect)
  const mColon = line.match(/^(.+?)\s*:\s*(.+)$/);
  if (mColon) return [mColon[1], mColon[2]];

  // Gestion du format Assurlead avec espaces/tabs multiples
  const mSpaces = line.match(/^(.+?)\s{2,}(.+)$/);
  if (mSpaces) {
    const key = mSpaces[1].trim();
    const value = mSpaces[2].trim();
    const normalizedKey = strip(key).replace(/\s+/g,' ').trim();
    
    logger.debug('AssurleadParser parsing attempt', { 
      original_key: key, 
      normalized_key: normalizedKey, 
      value: value,
      key_exists: RAW_KEYS.hasOwnProperty(normalizedKey)
    });
    
    if (RAW_KEYS.hasOwnProperty(normalizedKey) && value && value !== 'NON RENSEIGNE') {
      logger.debug('AssurleadParser key matched', { 
        key: normalizedKey, 
        value: value 
      });
      return [key, value];
    } else {
      logger.debug('AssurleadParser key not matched', { 
        key: normalizedKey, 
        key_exists: RAW_KEYS.hasOwnProperty(normalizedKey),
        value: value
      });
    }
  }

  // Méthode de fallback avec analyse par mots - PRIORITÉ AUX CLÉS SPÉCIFIQUES
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