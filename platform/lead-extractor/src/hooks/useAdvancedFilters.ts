import { useState, useMemo } from 'react';
import type { Lead } from '@/types/lead';
import type { AutomationFilters } from '@/types/automation';
import { filterLeads, getDefaultFilters } from '@/utils/automation-filters';

export function useAdvancedFilters(leads: Lead[]) {
  const [filters, setFilters] = useState<AutomationFilters>(getDefaultFilters());

  // Filtrer les leads en temps réel
  const filteredLeads = useMemo(() => {
    return filterLeads(leads, filters);
  }, [leads, filters]);

  // Statistiques pour l'aperçu
  const stats = useMemo(() => {
    const byScore = filteredLeads.reduce((acc, lead) => {
      acc[lead.score] = (acc[lead.score] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const withConjoint = filteredLeads.filter(l => l.conjoint).length;
    const withEnfants = filteredLeads.filter(l => l.enfants.length > 0).length;

    return {
      total: filteredLeads.length,
      byScore,
      withConjoint,
      withEnfants,
    };
  }, [filteredLeads]);

  const handlers = {
    handleScoreChange: (value: string) => {
      setFilters(prev => ({ ...prev, scoreMin: parseInt(value) }));
    },

    handleSourceToggle: (source: 'gmail' | 'calendar' | 'multiple') => {
      setFilters(prev => {
        const sources = [...prev.sources];
        const index = sources.indexOf(source);
        if (index > -1) {
          sources.splice(index, 1);
        } else {
          sources.push(source);
        }
        return { ...prev, sources };
      });
    },

    handleConjointChange: (value: string) => {
      setFilters(prev => ({ ...prev, hasConjoint: value as 'all' | 'yes' | 'no' }));
    },

    handleEnfantsChange: (value: string) => {
      setFilters(prev => ({ ...prev, hasEnfants: value as 'all' | 'yes' | 'no' }));
    },

    handleDateRangeChange: (value: string) => {
      setFilters(prev => ({ ...prev, dateRange: value as 'today' | '7days' | '30days' | 'all' }));
    },

    handleReset: () => {
      setFilters(getDefaultFilters());
    }
  };

  return {
    filters,
    filteredLeads,
    stats,
    ...handlers
  };
}