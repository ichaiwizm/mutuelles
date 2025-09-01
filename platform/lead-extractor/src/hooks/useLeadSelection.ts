import { useState, useMemo } from 'react';
import type { Lead } from '@/types/lead';

export function useLeadSelection(filteredLeads: Lead[]) {
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  // Fonction de nettoyage pour supprimer les leads qui ne sont plus dans filteredLeads
  const cleanSelection = () => {
    const filteredIds = new Set(filteredLeads.map(lead => lead.id));
    setSelectedLeadIds(prev => {
      const cleaned = new Set<string>();
      prev.forEach(id => {
        if (filteredIds.has(id)) {
          cleaned.add(id);
        }
      });
      return cleaned;
    });
  };

  // Leads sélectionnés (intersection entre filtrés et sélectionnés)
  const selectedLeads = useMemo(() => {
    return filteredLeads.filter(lead => selectedLeadIds.has(lead.id));
  }, [filteredLeads, selectedLeadIds]);

  // Gestion de la sélection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelection = new Set(selectedLeadIds);
      filteredLeads.forEach(lead => newSelection.add(lead.id));
      setSelectedLeadIds(newSelection);
    } else {
      const newSelection = new Set(selectedLeadIds);
      filteredLeads.forEach(lead => newSelection.delete(lead.id));
      setSelectedLeadIds(newSelection);
    }
  };

  const handleSelectLead = (leadId: string, checked: boolean) => {
    const newSelection = new Set(selectedLeadIds);
    if (checked) {
      newSelection.add(leadId);
    } else {
      newSelection.delete(leadId);
    }
    setSelectedLeadIds(newSelection);
  };

  const toggleSelectLead = (leadId: string) => {
    const newSelection = new Set(selectedLeadIds);
    if (newSelection.has(leadId)) {
      newSelection.delete(leadId);
    } else {
      newSelection.add(leadId);
    }
    setSelectedLeadIds(newSelection);
  };

  const selectAll = () => handleSelectAll(true);
  const deselectAll = () => handleSelectAll(false);

  // État de "Tout sélectionner"
  const allFilteredSelected = filteredLeads.length > 0 && 
    filteredLeads.every(lead => selectedLeadIds.has(lead.id));
  const someFilteredSelected = filteredLeads.some(lead => selectedLeadIds.has(lead.id));

  return {
    selectedLeadIds,
    selectedLeads,
    handleSelectAll,
    handleSelectLead,
    toggleSelectLead,
    selectAll,
    deselectAll,
    cleanSelection,
    allFilteredSelected,
    someFilteredSelected
  };
}