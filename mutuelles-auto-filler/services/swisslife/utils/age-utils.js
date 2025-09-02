/**
 * Utilitaires de calcul d'âge
 * Fonctions pour calculer l'âge à partir d'une date de naissance
 */

/**
 * Calcule l'âge d'une personne à partir de sa date de naissance
 * @param {string} birthDate - Date de naissance au format DD/MM/YYYY, DD-MM-YYYY ou YYYY-MM-DD
 * @returns {number} - Âge en années, ou null si la date est invalide
 */
export function calculateAge(birthDate) {
  if (!birthDate || typeof birthDate !== 'string') {
    console.warn('🔍 calculateAge - Date de naissance invalide:', birthDate);
    return null;
  }

  // Normaliser les différents formats de date possibles
  const normalizedDate = normalizeDateString(birthDate);
  if (!normalizedDate) {
    console.warn('🔍 calculateAge - Impossible de normaliser la date:', birthDate);
    return null;
  }

  const birth = new Date(normalizedDate);
  const today = new Date();

  // Vérifier que la date est valide
  if (isNaN(birth.getTime())) {
    console.warn('🔍 calculateAge - Date invalide après parsing:', normalizedDate);
    return null;
  }

  // Vérifier que la date de naissance n'est pas dans le futur
  if (birth > today) {
    console.warn('🔍 calculateAge - Date de naissance dans le futur:', birthDate);
    return null;
  }

  // Calculer l'âge
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  // Ajuster si l'anniversaire n'est pas encore passé cette année
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  console.log('🔍 calculateAge - Résultat:', birthDate, '→', age, 'ans');
  return age;
}

/**
 * Normalise une chaîne de date vers le format ISO (YYYY-MM-DD)
 * Supporte les formats : DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
 * @param {string} dateString - Chaîne de date à normaliser
 * @returns {string|null} - Date au format ISO ou null si invalide
 */
function normalizeDateString(dateString) {
  const trimmed = dateString.trim();
  
  // Format DD/MM/YYYY ou DD-MM-YYYY
  const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Format YYYY-MM-DD (déjà normalisé)
  const yyyymmddMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (yyyymmddMatch) {
    const [, year, month, day] = yyyymmddMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Format YYYY/MM/DD
  const yyyymmddSlashMatch = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (yyyymmddSlashMatch) {
    const [, year, month, day] = yyyymmddSlashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null;
}

/**
 * Vérifie si une personne a plus de X ans
 * @param {string} birthDate - Date de naissance
 * @param {number} ageLimit - Limite d'âge à vérifier
 * @returns {boolean|null} - true si > limite, false sinon, null si date invalide
 */
export function isOlderThan(birthDate, ageLimit) {
  const age = calculateAge(birthDate);
  if (age === null) return null;
  return age > ageLimit;
}

/**
 * Vérifie si une personne peut bénéficier de la Loi Madelin (âge ≤ 70 ans)
 * @param {string} birthDate - Date de naissance
 * @returns {boolean|null} - true si éligible, false si trop âgé, null si date invalide
 */
export function isEligibleForMadelin(birthDate) {
  const tooOld = isOlderThan(birthDate, 70);
  if (tooOld === null) return null;
  return !tooOld;
}