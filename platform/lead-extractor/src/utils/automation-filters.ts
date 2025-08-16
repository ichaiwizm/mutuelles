import type { Lead } from '@/types/lead';
import type { AutomationFilters } from '@/types/automation';

/**
 * Filtre les leads selon les critères d'automation
 */
export function filterLeads(leads: Lead[], filters: AutomationFilters): Lead[] {
  return leads.filter(lead => {
    // Filtre par score minimum
    if (lead.score < filters.scoreMin) {
      return false;
    }
    
    // Filtre par sources
    if (filters.sources.length > 0 && !filters.sources.includes(lead.source)) {
      return false;
    }
    
    // Filtre par présence de conjoint
    if (filters.hasConjoint !== 'all') {
      const hasConjoint = lead.conjoint !== null && lead.conjoint !== undefined;
      if (filters.hasConjoint === 'yes' && !hasConjoint) {
        return false;
      }
      if (filters.hasConjoint === 'no' && hasConjoint) {
        return false;
      }
    }
    
    // Filtre par présence d'enfants
    if (filters.hasEnfants !== 'all') {
      const hasEnfants = lead.enfants.length > 0 || (lead.souscripteur.nombreEnfants && lead.souscripteur.nombreEnfants > 0);
      if (filters.hasEnfants === 'yes' && !hasEnfants) {
        return false;
      }
      if (filters.hasEnfants === 'no' && hasEnfants) {
        return false;
      }
    }
    
    // Filtre par date d'extraction
    if (filters.dateRange !== 'all') {
      const leadDate = new Date(lead.extractedAt);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - leadDate.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (filters.dateRange) {
        case 'today':
          if (daysDiff > 0) return false;
          break;
        case '7days':
          if (daysDiff > 7) return false;
          break;
        case '30days':
          if (daysDiff > 30) return false;
          break;
      }
    }
    
    return true;
  });
}

/**
 * Compte les leads par critère pour affichage des statistiques
 */
export function getLeadsStatistics(leads: Lead[]): {
  total: number;
  byScore: Record<number, number>;
  bySource: Record<string, number>;
  withConjoint: number;
  withEnfants: number;
  today: number;
  last7Days: number;
  last30Days: number;
} {
  const stats = {
    total: leads.length,
    byScore: {} as Record<number, number>,
    bySource: {} as Record<string, number>,
    withConjoint: 0,
    withEnfants: 0,
    today: 0,
    last7Days: 0,
    last30Days: 0
  };
  
  const now = new Date();
  
  for (const lead of leads) {
    // Par score
    if (!stats.byScore[lead.score]) {
      stats.byScore[lead.score] = 0;
    }
    stats.byScore[lead.score]++;
    
    // Par source
    if (!stats.bySource[lead.source]) {
      stats.bySource[lead.source] = 0;
    }
    stats.bySource[lead.source]++;
    
    // Avec conjoint
    if (lead.conjoint) {
      stats.withConjoint++;
    }
    
    // Avec enfants
    if (lead.enfants.length > 0 || (lead.souscripteur.nombreEnfants && lead.souscripteur.nombreEnfants > 0)) {
      stats.withEnfants++;
    }
    
    // Par date
    const leadDate = new Date(lead.extractedAt);
    const daysDiff = Math.floor((now.getTime() - leadDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) {
      stats.today++;
    }
    if (daysDiff <= 7) {
      stats.last7Days++;
    }
    if (daysDiff <= 30) {
      stats.last30Days++;
    }
  }
  
  return stats;
}

/**
 * Crée des filtres par défaut
 */
export function getDefaultFilters(): AutomationFilters {
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
export function sanitizeFilters(filters: Partial<AutomationFilters>): AutomationFilters {
  const defaults = getDefaultFilters();
  
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
export function getFiltersDescription(filters: AutomationFilters): string {
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