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

  // Helpers de normalisation/déduplication (frontend)
  const normalizePhone = (phone?: string) => phone ? phone.replace(/[\s\-\(\)\.]/g, '') : '';
  const normalizeEmail = (email?: string) => email ? email.toLowerCase().trim() : '';
  const normalizeString = (s?: string) => s ? s.toLowerCase().trim() : '';

  const getDedupKey = (lead: Lead): string | null => {
    const email = normalizeEmail(lead.contact?.email);
    if (email) return `email:${email}`;
    const phone = normalizePhone(lead.contact?.telephone);
    if (phone) return `phone:${phone}`;
    const prenom = normalizeString(lead.contact?.prenom);
    const nom = normalizeString(lead.contact?.nom);
    const dob = lead.souscripteur?.dateNaissance || '';
    if (prenom && nom && dob) return `triplet:${prenom}-${nom}-${dob}`;
    return null;
  };

  const pick = <T,>(a: T | undefined, b: T | undefined): T | undefined => (a ?? b);

  // Fusionne les données en gardant l'ID de l'existant (préserve les statuts côté UI)
  const mergePreferExisting = (existing: Lead, incoming: Lead): Lead => {
    const base = existing; // garder ID existant pour préserver les statuts
    const other = incoming;
    return {
      ...base,
      extractedAt: (new Date(base.extractedAt) > new Date(other.extractedAt)) ? base.extractedAt : other.extractedAt,
      score: Math.max(base.score ?? 0, other.score ?? 0),
      source: base.source === other.source ? base.source : 'multiple',
      contact: Object.fromEntries(
        Object.keys({ ...base.contact, ...other.contact }).map(k => [k, pick((base.contact as any)[k], (other.contact as any)[k])])
      ) as Lead['contact'],
      souscripteur: Object.fromEntries(
        Object.keys({ ...base.souscripteur, ...other.souscripteur }).map(k => [k, pick((base.souscripteur as any)[k], (other.souscripteur as any)[k])])
      ) as Lead['souscripteur'],
      conjoint: (base.conjoint || other.conjoint)
        ? Object.fromEntries(
            Object.keys({ ...(base.conjoint || {}), ...(other.conjoint || {}) }).map(k => [k, pick((base.conjoint as any)?.[k], (other.conjoint as any)?.[k])])
          ) as NonNullable<Lead['conjoint']>
        : undefined,
      enfants: [...(base.enfants || []), ...(other.enfants || [])]
        .filter((e, i, arr) => arr.findIndex(x => x.dateNaissance === e.dateNaissance) === i),
      besoins: Object.fromEntries(
        Object.keys({ ...base.besoins, ...other.besoins }).map(k => [k, pick((base.besoins as any)[k], (other.besoins as any)[k])])
      ) as Lead['besoins'],
      notes: { ...base.notes, ...other.notes }
    };
  };

  // Ajouter de nouveaux leads (dédupliqués côté serveur par extraction; on redéduplique côté front en merge)
  const addLeads = (newLeads: Lead[], replaceAll = false) => {
    if (replaceAll) {
      // Remplacement complet (comportement existant)
      const allLeads = newLeads;
      const addedQualified = newLeads.filter(l => (l.score ?? 0) >= MIN_SCORE).length;
      const addedNon = newLeads.length - addedQualified;
      setLeads(allLeads);
      StorageManager.saveLeads(allLeads);
      return { allLeads, addedQualified, addedNon, totalAdded: newLeads.length };
    }

    // Merge: déduplication frontend préférant conserver l'ID existant
    const existingByKey = new Map<string, Lead>();
    const othersExisting: Lead[] = [];
    // Indexer existants
    for (const el of leads) {
      const key = getDedupKey(el);
      if (key) existingByKey.set(key, el);
      else othersExisting.push(el);
    }

    const addedUniques: Lead[] = [];
    const mergedUpdates: Lead[] = [];
    const othersNew: Lead[] = [];

    for (const nl of newLeads) {
      const key = getDedupKey(nl);
      if (key && existingByKey.has(key)) {
        // Fusionner et conserver l'ID existant
        const merged = mergePreferExisting(existingByKey.get(key) as Lead, nl);
        existingByKey.set(key, merged);
        mergedUpdates.push(merged);
      } else if (key) {
        // Nouveau unique par clé
        existingByKey.set(key, nl);
        addedUniques.push(nl);
      } else {
        // Pas de clé → ajouter tel quel (risque de doublon minimal)
        othersNew.push(nl);
        addedUniques.push(nl);
      }
    }

    const dedupedByKey = Array.from(existingByKey.values());
    const allLeads = [...dedupedByKey, ...othersExisting, ...othersNew];

    // Stats d'ajout (uniques ajoutés seulement)
    const newQualifiedLeads = addedUniques.filter(l => (l.score ?? 0) >= MIN_SCORE);
    const newNonLeads = addedUniques.filter(l => (l.score ?? 0) < MIN_SCORE);
    const addedQualified = newQualifiedLeads.length;
    const addedNon = newNonLeads.length;
    const totalAdded = addedUniques.length;

    setLeads(allLeads);
    StorageManager.saveLeads(allLeads);
    return { allLeads, addedQualified, addedNon, totalAdded };
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

  const removeLeadsByIds = (ids: string[]) => {
    if (!ids || ids.length === 0) return 0;
    const idsSet = new Set(ids);
    const next = leads.filter(l => !idsSet.has(l.id));
    const removed = leads.length - next.length;
    if (removed > 0) {
      setLeads(next);
      StorageManager.saveLeads(next);
    }
    return removed;
  };

  return {
    leads,
    qualifiedLeads,
    nonLeads,
    addLeads,
    clearAllLeads,
    removeLeadsByIds,
    stats,
    setLeads
  };
};
