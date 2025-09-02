// Module de formatage des dates

// Fonction pour formater une date
export function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  
  // Si déjà au bon format DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Convertir différents formats
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
}