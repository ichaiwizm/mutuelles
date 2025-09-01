import { useState, useCallback, useMemo } from 'react';
import type { Lead } from '@/types/lead';

export function useLeadTableSelection() {
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  // Sélectionner/désélectionner un lead spécifique
  const toggleSelectLead = useCallback((leadId: string) => {
    setSelectedLeadIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  }, []);

  // Sélectionner tous les leads fournis
  const selectAll = useCallback((allLeads: Lead[]) => {
    const allIds = new Set(allLeads.map(lead => lead.id));
    setSelectedLeadIds(allIds);
  }, []);

  // Désélectionner tous les leads
  const deselectAll = useCallback(() => {
    setSelectedLeadIds(new Set());
  }, []);

  // Obtenir le nombre total de leads sélectionnés
  const getSelectedCount = useCallback(() => {
    return selectedLeadIds.size;
  }, [selectedLeadIds]);

  // Obtenir les leads sélectionnés depuis un ensemble de leads
  const getSelectedLeads = useCallback((allLeads: Lead[]): Lead[] => {
    return allLeads.filter(lead => selectedLeadIds.has(lead.id));
  }, [selectedLeadIds]);

  // Vérifier si tous les leads fournis sont sélectionnés
  const isAllSelected = useCallback((allLeads: Lead[]) => {
    if (allLeads.length === 0) return false;
    return allLeads.every(lead => selectedLeadIds.has(lead.id));
  }, [selectedLeadIds]);

  // Réinitialiser la sélection
  const clearSelection = useCallback(() => {
    setSelectedLeadIds(new Set());
  }, []);

  return {
    selectedLeadIds,
    toggleSelectLead,
    selectAll,
    deselectAll,
    getSelectedCount,
    getSelectedLeads,
    isAllSelected,
    clearSelection
  };
}