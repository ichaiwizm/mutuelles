import { useState } from 'react';
import type { Lead } from '@/types/lead';
import type { LeadStatusUpdate } from '@/services/extension-bridge';

interface ProcessingStatus {
  status: 'pending' | 'processing' | 'success' | 'error';
  timestamp?: string;
  message?: string;
  errorMessage?: string;
  completedSteps?: number;
  leadName?: string;
  currentStep?: number;
  totalSteps?: number;
}

type ProcessingStatusMap = Record<string, ProcessingStatus>;

export function useProcessingStatus() {
  const [statusMap, setStatusMap] = useState<ProcessingStatusMap>({});

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

  return {
    statusMap,
    enrichLeadWithStatus,
    enrichLeadsWithStatus,
    getLeadStatus,
    getStatusStats,
    // Nouveaux helpers pour gérer les updates
    setLeadStatus,
    applyStatusUpdate
  };
}