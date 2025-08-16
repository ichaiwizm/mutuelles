import type { AutomationFilters } from '@/types/automation';

/**
 * Utilitaires pour la gestion des filtres
 */
export class FilterUtils {
  /**
   * Crée des filtres par défaut
   */
  static getDefaults(): AutomationFilters {
    return {
      scoreMin: 4,
      sources: [],
      hasConjoint: 'all',
      hasEnfants: 'all',
      dateRange: '30days'
    };
  }

  /**
   * Valide et nettoie les filtres
   */
  static sanitize(filters: Partial<AutomationFilters>): AutomationFilters {
    const defaults = this.getDefaults();
    
    return {
      scoreMin: filters.scoreMin !== undefined 
        ? Math.max(0, Math.min(5, filters.scoreMin)) 
        : defaults.scoreMin,
      sources: filters.sources || defaults.sources,
      hasConjoint: filters.hasConjoint || defaults.hasConjoint,
      hasEnfants: filters.hasEnfants || defaults.hasEnfants,
      dateRange: filters.dateRange || defaults.dateRange
    };
  }

  /**
   * Génère un résumé textuel des filtres appliqués
   */
  static getDescription(filters: AutomationFilters): string {
    const parts: string[] = [];
    
    // Score
    parts.push(`Score ≥ ${filters.scoreMin}`);
    
    // Sources
    if (filters.sources.length > 0) {
      parts.push(`Source: ${filters.sources.join(', ')}`);
    }
    
    // Conjoint
    if (filters.hasConjoint === 'yes') {
      parts.push('Avec conjoint');
    } else if (filters.hasConjoint === 'no') {
      parts.push('Sans conjoint');
    }
    
    // Enfants
    if (filters.hasEnfants === 'yes') {
      parts.push('Avec enfants');
    } else if (filters.hasEnfants === 'no') {
      parts.push('Sans enfants');
    }
    
    // Date
    switch (filters.dateRange) {
      case 'today':
        parts.push("Aujourd'hui");
        break;
      case '7days':
        parts.push('7 derniers jours');
        break;
      case '30days':
        parts.push('30 derniers jours');
        break;
    }
    
    return parts.join(' • ');
  }
}