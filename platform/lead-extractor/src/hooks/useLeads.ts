import { useState, useEffect, useMemo } from 'react';
import { StorageManager } from '@/lib/storage';
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

  // Ajouter de nouveaux leads (déjà dédupliqués côté serveur)
  const addLeads = (newLeads: Lead[]) => {
    console.log('🎯 useLeads.addLeads - DÉBUT (serveur a déjà fait la déduplication)', {
      leadsExistants: leads.length,
      nouveauxLeadsDejaDedup: newLeads.length,
    });

    console.log('🎯 Nouveaux leads (déjà dédupliqués par le serveur):', newLeads.map(l => ({
      id: l.id,
      nom: l.contact.nom,
      prenom: l.contact.prenom,
      email: l.contact.email,
      extractedAt: l.extractedAt
    })));

    // Les leads viennent du serveur déjà dédupliqués, on les accepte directement
    const allLeads = [...leads, ...newLeads];

    // Compter les statistiques
    const newQualifiedLeads = newLeads.filter(l => (l.score ?? 0) >= MIN_SCORE);
    const newNonLeads = newLeads.filter(l => (l.score ?? 0) < MIN_SCORE);
    
    const addedQualified = newQualifiedLeads.length;
    const addedNon = newNonLeads.length;
    const totalAdded = newLeads.length;

    console.log('🎯 Statistiques finales (pas de re-déduplication frontend):', {
      avantAjout: leads.length,
      apresAjout: allLeads.length,
      ajoutesReel: totalAdded,
      pierreLeads: allLeads.filter(l => 
        l.contact.nom?.toLowerCase() === 'laurent' && 
        l.contact.prenom?.toLowerCase() === 'pierre'
      ).map(l => ({
        id: l.id,
        email: l.contact.email,
        civilite: l.contact.civilite
      }))
    });

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