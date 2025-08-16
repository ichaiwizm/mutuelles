import type { Lead } from '@/types/lead';
import type { AutomationFilters } from '@/types/automation';
import { FilterPredicates } from './filter-predicates';

/**
 * Filtreur principal pour les leads
 */
export class LeadFilter {
  /**
   * Filtre les leads selon les critères d'automation
   */
  static filter(leads: Lead[], filters: AutomationFilters): Lead[] {
    const predicates = [
      FilterPredicates.byScoreMin(filters.scoreMin),
      FilterPredicates.bySources(filters.sources),
      FilterPredicates.byConjoint(filters.hasConjoint),
      FilterPredicates.byEnfants(filters.hasEnfants),
      FilterPredicates.byDateRange(filters.dateRange)
    ];

    return leads.filter(lead => 
      predicates.every(predicate => predicate(lead))
    );
  }
}