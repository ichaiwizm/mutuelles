import { useState, useEffect, useMemo } from 'react';
import { StorageManager } from '@/lib/storage';
import { DeduplicationService } from '@/lib/deduplication';
import type { Lead } from '@/types/lead';

const MIN_SCORE = 3;

export const useLeads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);

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
  const addLeads = (newLeads: Lead[]) => {
    const before = leads;
    const allLeads = DeduplicationService.deduplicateLeads([...before, ...newLeads]);

    // Compter les nouveaux leads ajoutés par catégorie de score
    const newQualifiedLeads = newLeads.filter(l => (l.score ?? 0) >= MIN_SCORE);
    const newNonLeads = newLeads.filter(l => (l.score ?? 0) < MIN_SCORE);
    
    const addedQualified = newQualifiedLeads.length;
    const addedNon = newNonLeads.length;
    const totalAdded = allLeads.length - before.length;

    setLeads(allLeads);
    StorageManager.saveLeads(allLeads);
    
    return { 
      allLeads, 
      addedQualified, 
      addedNon,
      totalAdded
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