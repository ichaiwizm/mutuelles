import { useState, useMemo, useEffect } from 'react';
import type { Lead } from '@/types/lead';

export interface FilterOptions {
  periodFilter: string;
  scoreFilter: string;
}

export function useAutomationFilters(leads: Lead[]) {
  const [periodFilter, setPeriodFilter] = useState('7days');
  const [scoreFilter, setScoreFilter] = useState('0');

  // Filtrer les leads selon les critères
  const filteredLeads = useMemo(() => {
    let filtered = [...leads];

    // Filtre par période
    if (periodFilter !== 'all') {
      const now = new Date();
      const daysAgo = periodFilter === 'today' ? 1 : 
                     periodFilter === '7days' ? 7 : 
                     periodFilter === '30days' ? 30 : 0;
      
      if (daysAgo > 0) {
        const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(lead => 
          new Date(lead.extractedAt) >= cutoffDate
        );
      }
    }

    // Filtre par score
    if (scoreFilter !== '0') {
      const minScore = parseInt(scoreFilter);
      filtered = filtered.filter(lead => (lead.score ?? 0) >= minScore);
    }

    return filtered;
  }, [leads, periodFilter, scoreFilter]);

  return {
    periodFilter,
    setPeriodFilter,
    scoreFilter,
    setScoreFilter,
    filteredLeads
  };
}