// Module de formatage des codes postaux

// Fonction pour extraire le département du code postal
export function getDepartementFromCodePostal(codePostal?: string): string {
  if (!codePostal) return '75'; // Paris par défaut
  
  const cp = codePostal.replace(/\D/g, '');
  if (cp.length < 2) return '75';
  
  // Cas spéciaux
  if (cp.startsWith('97')) return cp.substring(0, 3); // DOM-TOM
  if (cp.startsWith('98')) return cp.substring(0, 3); // DOM-TOM
  if (cp.startsWith('20')) return '2A'; // Corse
  
  return cp.substring(0, 2);
}