export function getEmptyMessage(activeTab: 'leads' | 'all'): string {
  switch (activeTab) {
    case 'leads': return 'Aucun lead qualifié';
    case 'all': return 'Aucun lead trouvé';
    default: return 'Aucun lead trouvé';
  }
}