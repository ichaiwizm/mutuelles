/**
 * Convertit une date du format YYYY-MM-DD vers DD/MM/YYYY
 */
export function convertDateToSwissFormat(dateStr: string | undefined): string {
  if (!dateStr) return '';
  
  // Si la date est déjà au format DD/MM/YYYY, la retourner
  if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    return dateStr;
  }
  
  // Convertir depuis YYYY-MM-DD
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return '';
  
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
}