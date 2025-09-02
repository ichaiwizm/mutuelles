import { useState, useEffect, useMemo } from 'react';
import { StorageManager } from '@/lib/storage';
import type { Lead } from '@/types/lead';
import type { DateRange } from 'react-day-picker';
import { isWithinInterval } from 'date-fns';

const MIN_SCORE = 3;

export const useLeads = (
  filterMode: 'predefined' | 'custom' = 'predefined',
  days: number = 7,
  dateRange?: DateRange | null
) => {
  const [leads, setLeads] = useState<Lead[]>([]);

  // Charger les leads au démarrage
  useEffect(() => {
    const storedLeads = StorageManager.getLeads();
    setLeads(storedLeads);
  }, []);

  // Filtrer les leads par période
  const filteredLeads = useMemo(() => {
    if (filterMode === 'custom' && dateRange?.from && dateRange?.to) {
      // Filtrage par plage de dates personnalisée
      return leads.filter(lead => {
        const leadDate = new Date(lead.extractedAt);
        return isWithinInterval(leadDate, {
          start: dateRange.from!,
          end: dateRange.to!
        });
      });
    } else {
      // Filtrage par nombre de jours (mode prédéfini)
      const now = new Date();
      const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      return leads.filter(lead => new Date(lead.extractedAt) >= cutoffDate);
    }
  }, [leads, filterMode, days, dateRange]);

  // Séparer leads qualifiés et non-leads (sur les leads filtrés)
  const qualifiedLeads = useMemo(() => 
    filteredLeads.filter(l => (l.score ?? 0) >= MIN_SCORE), [filteredLeads]
  );
  
  const nonLeads = useMemo(() => 
    filteredLeads.filter(l => (l.score ?? 0) < MIN_SCORE), [filteredLeads]
  );

  // Ajouter de nouveaux leads (déjà dédupliqués côté serveur)
  const addLeads = (newLeads: Lead[], replaceAll = false) => {
    console.log('🎯 useLeads.addLeads - DÉBUT (serveur a déjà fait la déduplication)', {
      leadsExistants: leads.length,
      nouveauxLeadsDejaDedup: newLeads.length,
      replaceAll
    });

    console.log('🎯 Nouveaux leads (déjà dédupliqués par le serveur):', newLeads.map(l => ({
      id: l.id,
      nom: l.contact.nom,
      prenom: l.contact.prenom,
      email: l.contact.email,
      extractedAt: l.extractedAt
    })));

    // Si replaceAll est true, on remplace tout, sinon on ajoute aux existants
    const allLeads = replaceAll ? newLeads : [...leads, ...newLeads];

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

  // Statistiques (basées sur les leads filtrés)
  const stats = useMemo(() => ({
    total: filteredLeads.length,
    qualified: qualifiedLeads.length,
    nonLeads: nonLeads.length,
    qualificationRate: filteredLeads.length > 0 ? (qualifiedLeads.length / filteredLeads.length * 100).toFixed(1) : '0',
    // Statistiques globales (non filtrées)
    totalStored: leads.length
  }), [filteredLeads, qualifiedLeads, nonLeads, leads]);

  const clearAllLeads = () => {
    setLeads([]);
    StorageManager.saveLeads([]);
  };

  return {
    leads: filteredLeads, // Retourner les leads filtrés
    allLeads: leads, // Garder l'accès aux leads non filtrés si besoin
    qualifiedLeads,
    nonLeads,
    addLeads,
    clearAllLeads,
    stats,
    setLeads
  };
};