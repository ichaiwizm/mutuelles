import type { Lead } from '@/types/lead';

/**
 * Prédicats de filtrage pour les leads
 */
export class FilterPredicates {
  /**
   * Filtre par score minimum
   */
  static byScoreMin(scoreMin: number) {
    return (lead: Lead): boolean => lead.score >= scoreMin;
  }

  /**
   * Filtre par sources
   */
  static bySources(sources: string[]) {
    if (sources.length === 0) return () => true;
    return (lead: Lead): boolean => sources.includes(lead.source);
  }

  /**
   * Filtre par présence de conjoint
   */
  static byConjoint(hasConjoint: 'all' | 'yes' | 'no') {
    if (hasConjoint === 'all') return () => true;
    
    return (lead: Lead): boolean => {
      const hasConj = lead.conjoint !== null && lead.conjoint !== undefined;
      return hasConjoint === 'yes' ? hasConj : !hasConj;
    };
  }

  /**
   * Filtre par présence d'enfants
   */
  static byEnfants(hasEnfants: 'all' | 'yes' | 'no') {
    if (hasEnfants === 'all') return () => true;
    
    return (lead: Lead): boolean => {
      const hasEnf = lead.enfants.length > 0 || (lead.souscripteur.nombreEnfants !== undefined && lead.souscripteur.nombreEnfants > 0);
      return hasEnfants === 'yes' ? hasEnf : !hasEnf;
    };
  }

  /**
   * Filtre par date d'extraction
   */
  static byDateRange(dateRange: 'all' | 'today' | '7days' | '30days') {
    if (dateRange === 'all') return () => true;
    
    return (lead: Lead): boolean => {
      const leadDate = new Date(lead.extractedAt);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - leadDate.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (dateRange) {
        case 'today': return daysDiff === 0;
        case '7days': return daysDiff <= 7;
        case '30days': return daysDiff <= 30;
        default: return true;
      }
    };
  }
}