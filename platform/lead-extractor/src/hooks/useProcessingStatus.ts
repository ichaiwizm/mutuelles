import { useState, useEffect } from 'react';
import type { Lead } from '@/types/lead';
import type { LeadStatusUpdate } from '@/services/extension-bridge';
import { ProcessingStatusStorage, type ProcessingStatus, type ProcessingStatusMap } from '@/utils/processing-status-storage';

export function useProcessingStatus() {
  const [statusMap, setStatusMap] = useState<ProcessingStatusMap>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Charger les statuts depuis localStorage au démarrage
  useEffect(() => {
    const loadedStatuses = ProcessingStatusStorage.loadStatuses();
    setStatusMap(loadedStatuses);
    setIsLoaded(true);
    
    // Nettoyer les statuts anciens (optionnel, 30 jours par défaut)
    ProcessingStatusStorage.cleanupOldStatuses(30);
    
    console.log('[PROCESSING STATUS] Statuts chargés depuis localStorage:', Object.keys(loadedStatuses).length);
  }, []);

  // Sauvegarder automatiquement quand statusMap change (mais seulement après le chargement initial)
  useEffect(() => {
    if (!isLoaded) return;
    
    ProcessingStatusStorage.saveStatuses(statusMap);
    console.log('[PROCESSING STATUS] Statuts sauvegardés:', Object.keys(statusMap).length);
  }, [statusMap, isLoaded]);

  // Mappe les statuts externes vers nos statuts internes
  const mapExternalStatus = (status: string): ProcessingStatus['status'] => {
    switch (status) {
      case 'launched':
      case 'started':
      case 'processing': return 'processing';
      case 'success': return 'success';
      case 'error': return 'error';
      default: return 'pending';
    }
  };

  // Met à jour le statut d'un lead
  const setLeadStatus = (leadId: string, next: ProcessingStatus) => {
    setStatusMap(prev => ({ ...prev, [leadId]: { ...prev[leadId], ...next } }));
  };

  // Applique un update envoyé par l'extension
  const applyStatusUpdate = (update: LeadStatusUpdate) => {
    const next: ProcessingStatus = {
      status: mapExternalStatus(update.status),
      timestamp: update.timestamp || new Date().toISOString(),
      message: update.details?.message || update.leadName,
      errorMessage: update.details?.errorMessage,
      completedSteps: update.details?.completedSteps,
      currentStep: update.details?.currentStep,
      totalSteps: update.details?.totalSteps,
      leadName: update.leadName,
    };
    setLeadStatus(update.leadId, next);
  };

  // Fonction pour enrichir un lead avec son statut de traitement
  const enrichLeadWithStatus = (lead: Lead): Lead => {
    const status = statusMap[lead.id];
    
    if (status) {
      return {
        ...lead,
        processingStatus: {
          status: status.status,
          timestamp: status.timestamp,
          message: status.message || status.leadName,
          errorMessage: status.errorMessage,
          completedSteps: status.completedSteps,
          currentStep: status.currentStep,
          totalSteps: status.totalSteps
        }
      };
    }

    return {
      ...lead,
      processingStatus: {
        status: 'pending'
      }
    };
  };

  // Fonction pour enrichir une liste de leads
  const enrichLeadsWithStatus = (leads: Lead[]): Lead[] => {
    return leads.map(enrichLeadWithStatus);
  };

  // Obtenir le statut d'un lead spécifique
  const getLeadStatus = (leadId: string): ProcessingStatus | null => {
    return statusMap[leadId] || null;
  };

  // Statistiques des statuts
  const getStatusStats = () => {
    const stats = {
      pending: 0,
      processing: 0,
      success: 0,
      error: 0,
      total: Object.keys(statusMap).length
    };

    Object.values(statusMap).forEach(status => {
      if (status.status in stats) {
        stats[status.status as keyof typeof stats]++;
      }
    });

    return stats;
  };

  // Méthodes de nettoyage et gestion
  const clearAllStatuses = () => {
    ProcessingStatusStorage.clearAllStatuses();
    setStatusMap({});
  };

  const removeLeadStatus = (leadId: string) => {
    setStatusMap(prev => {
      const newMap = { ...prev };
      delete newMap[leadId];
      return newMap;
    });
  };

  const cleanupOrphanedStatuses = (existingLeadIds: string[]) => {
    const removedCount = ProcessingStatusStorage.cleanupOrphanedStatuses(existingLeadIds);
    if (removedCount > 0) {
      // Recharger depuis localStorage après nettoyage
      const cleanedStatuses = ProcessingStatusStorage.loadStatuses();
      setStatusMap(cleanedStatuses);
    }
    return removedCount;
  };

  const getStorageStats = () => {
    return ProcessingStatusStorage.getStatusStats();
  };

  const exportStatuses = () => {
    return ProcessingStatusStorage.exportToJSON();
  };

  return {
    statusMap,
    enrichLeadWithStatus,
    enrichLeadsWithStatus,
    getLeadStatus,
    getStatusStats,
    isLoaded,
    // Helpers pour gérer les updates
    setLeadStatus,
    applyStatusUpdate,
    // Méthodes de nettoyage
    clearAllStatuses,
    removeLeadStatus,
    cleanupOrphanedStatuses,
    getStorageStats,
    exportStatuses
  };
}