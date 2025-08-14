import { useState, useEffect, useMemo } from 'react';
import { StorageManager } from '@/lib/storage';
import { DeduplicationService } from '@/lib/deduplication';

const MIN_SCORE = 3;

export const useLeads = () => {
  const [leads, setLeads] = useState([]);

  // Charger les leads au démarrage
  useEffect(() => {
    const storedLeads = StorageManager.getLeads();
    setLeads(storedLeads);
  }, []);

  // Séparer leads qualifiés et non-leads
  const qualifiedLeads = useMemo(() => 
    leads.filter(l => (l.score ?? 0) >= MIN_SCORE), [leads]
  );
  
  const nonLeads = useMemo(() => 
    leads.filter(l => (l.score ?? 0) < MIN_SCORE), [leads]
  );

  // Ajouter de nouveaux leads avec déduplication et statistiques détaillées
  const addLeads = (newLeads) => {
    const before = leads;
    const beforeQualified = before.filter(l => (l.score ?? 0) >= MIN_SCORE).length;

    const allLeads = DeduplicationService.deduplicateLeads([...before, ...newLeads]);

    const afterQualified = allLeads.filter(l => (l.score ?? 0) >= MIN_SCORE).length;

    const uniquesAdded = Math.max(0, allLeads.length - before.length);
    const addedQualified = Math.max(0, afterQualified - beforeQualified);
    const addedNon = Math.max(0, (allLeads.length - afterQualified) - (before.length - beforeQualified));
    const dedupMerged = Math.max(0, newLeads.length - uniquesAdded);

    setLeads(allLeads);
    StorageManager.saveLeads(allLeads);
    
    return { 
      allLeads, 
      uniquesAdded, 
      addedQualified, 
      addedNon, 
      dedupMerged 
    };
  };

  // Statistiques
  const stats = useMemo(() => ({
    total: leads.length,
    qualified: qualifiedLeads.length,
    nonLeads: nonLeads.length,
    qualificationRate: leads.length > 0 ? (qualifiedLeads.length / leads.length * 100).toFixed(1) : '0'
  }), [leads, qualifiedLeads, nonLeads]);

  const clearAllLeads = () => {
    setLeads([]);
    StorageManager.saveLeads([]);
  };

  return {
    leads,
    qualifiedLeads,
    nonLeads,
    addLeads,
    clearAllLeads,
    stats,
    setLeads
  };
};