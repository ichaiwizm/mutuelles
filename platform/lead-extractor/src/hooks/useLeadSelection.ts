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

  // Sélection par statut
  const selectByStatus = (status: 'pending' | 'processing' | 'success' | 'error') => {
    const newSelection = new Set(selectedLeadIds);
    filteredLeads.forEach(lead => {
      if (lead.processingStatus?.status === status) {
        newSelection.add(lead.id);
      }
    });
    setSelectedLeadIds(newSelection);
  };

  // Compter les leads par statut dans les leads filtrés
  const statusCounts = useMemo(() => {
    const counts = {
      pending: 0,
      processing: 0,
      success: 0,
      error: 0,
      undefined: 0 // Pour les leads sans statut
    };
    
    filteredLeads.forEach(lead => {
      const status = lead.processingStatus?.status || 'undefined';
      if (status in counts) {
        counts[status as keyof typeof counts]++;
      }
    });
    
    return counts;
  }, [filteredLeads]);

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
    selectByStatus,
    statusCounts,
    cleanSelection,
    allFilteredSelected,
    someFilteredSelected
  };
}