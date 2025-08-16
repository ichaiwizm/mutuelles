import { BaseParser } from '../BaseParser.js';

export function extractEnfants(result) {
  const enfants = [];
  
  // Extraire les enfants avec les clés spécifiques
  for (let i = 1; i <= 3; i++) {
    const dateKey = `dob_enfant_${i}`;
    if (result[dateKey]) {
      enfants.push({
        dateNaissance: BaseParser.normalizeDate(result[dateKey])
      });
    }
  }
  
  // Si pas d'enfants trouvés avec les clés spécifiques, essayer les anciennes méthodes
  if (enfants.length === 0) {
    if (result.dob_enfant_min && result.dob_enfant_max) {
      // Si on a des dates min/max, créer des enfants factices
      const minDate = BaseParser.normalizeDate(result.dob_enfant_min);
      const maxDate = BaseParser.normalizeDate(result.dob_enfant_max);
      
      if (minDate) enfants.push({ dateNaissance: minDate });
      if (maxDate && maxDate !== minDate) enfants.push({ dateNaissance: maxDate });
    }
  }
  
  return enfants;
}