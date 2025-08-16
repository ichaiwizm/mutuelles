import type { Lead } from '@/types/lead';

export interface LeadsStatistics {
  total: number;
  byScore: Record<number, number>;
  bySource: Record<string, number>;
  withConjoint: number;
  withEnfants: number;
  today: number;
  last7Days: number;
  last30Days: number;
}

/**
 * Calculateur de statistiques pour les leads
 */
export class StatisticsCalculator {
  private static calculateDateStats(leads: Lead[], now: Date) {
    const stats = { today: 0, last7Days: 0, last30Days: 0 };
    
    for (const lead of leads) {
      const leadDate = new Date(lead.extractedAt);
      const daysDiff = Math.floor((now.getTime() - leadDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 0) stats.today++;
      if (daysDiff <= 7) stats.last7Days++;
      if (daysDiff <= 30) stats.last30Days++;
    }
    
    return stats;
  }

  private static calculateScoreStats(leads: Lead[]): Record<number, number> {
    const byScore: Record<number, number> = {};
    
    for (const lead of leads) {
      byScore[lead.score] = (byScore[lead.score] || 0) + 1;
    }
    
    return byScore;
  }

  private static calculateSourceStats(leads: Lead[]): Record<string, number> {
    const bySource: Record<string, number> = {};
    
    for (const lead of leads) {
      bySource[lead.source] = (bySource[lead.source] || 0) + 1;
    }
    
    return bySource;
  }

  private static calculateFamilyStats(leads: Lead[]): { withConjoint: number; withEnfants: number } {
    let withConjoint = 0;
    let withEnfants = 0;
    
    for (const lead of leads) {
      if (lead.conjoint) withConjoint++;
      
      if (lead.enfants.length > 0 || (lead.souscripteur.nombreEnfants && lead.souscripteur.nombreEnfants > 0)) {
        withEnfants++;
      }
    }
    
    return { withConjoint, withEnfants };
  }

  /**
   * Calcule les statistiques complètes pour une liste de leads
   */
  static calculate(leads: Lead[]): LeadsStatistics {
    const now = new Date();
    const dateStats = this.calculateDateStats(leads, now);
    const scoreStats = this.calculateScoreStats(leads);
    const sourceStats = this.calculateSourceStats(leads);
    const familyStats = this.calculateFamilyStats(leads);
    
    return {
      total: leads.length,
      byScore: scoreStats,
      bySource: sourceStats,
      ...familyStats,
      ...dateStats
    };
  }
}