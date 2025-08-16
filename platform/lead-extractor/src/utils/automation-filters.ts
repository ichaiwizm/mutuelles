// Re-export des fonctions principales depuis les modules spécialisés
export { LeadFilter } from './filters/lead-filter';
export { StatisticsCalculator } from './filters/statistics-calculator';
export { FilterUtils } from './filters/filter-utils';

// Re-export des types pour la compatibilité
export type { LeadsStatistics } from './filters/statistics-calculator';

// Fonctions de compatibilité pour l'API existante
import type { Lead } from '@/types/lead';
import type { AutomationFilters } from '@/types/automation';
import { LeadFilter } from './filters/lead-filter';
import { StatisticsCalculator } from './filters/statistics-calculator';
import { FilterUtils } from './filters/filter-utils';

export function filterLeads(leads: Lead[], filters: AutomationFilters): Lead[] {
  return LeadFilter.filter(leads, filters);
}

export function getLeadsStatistics(leads: Lead[]) {
  return StatisticsCalculator.calculate(leads);
}

export function getDefaultFilters(): AutomationFilters {
  return FilterUtils.getDefaults();
}

export function sanitizeFilters(filters: Partial<AutomationFilters>): AutomationFilters {
  return FilterUtils.sanitize(filters);
}

export function getFiltersDescription(filters: AutomationFilters): string {
  return FilterUtils.getDescription(filters);
}