import { useState, useEffect } from 'react';
import type { Lead } from '@/types/lead';

interface ProcessingStatus {
  status: 'pending' | 'processing' | 'success' | 'error';
  timestamp?: string;
  message?: string;
  errorMessage?: string;
  completedSteps?: number;
  leadName?: string;
}

type ProcessingStatusMap = Record<string, ProcessingStatus>;

export function useProcessingStatus() {
  const [statusMap, setStatusMap] = useState<ProcessingStatusMap>({});

  // Charger les statuts depuis l'extension au démarrage
  useEffect(() => {
    const loadProcessingStatus = () => {
      // Demander les statuts à l'extension
      window.postMessage({
        type: 'GET_PROCESSING_STATUS',
        source: 'mutuelles-platform'
      }, '*');
    };

    loadProcessingStatus();
  }, []);

  // Écouter les changements en temps réel via les messages de l'extension
  useEffect(() => {
    const handleStatusUpdate = (event: MessageEvent) => {
      if (event.data?.source === 'mutuelles-extension') {
        // Réponse initiale avec les statuts
        if (event.data.type === 'PROCESSING_STATUS_RESPONSE') {
          const statusCount = Object.keys(event.data.data || {}).length;
          console.log('📡 Statuts chargés:', statusCount, 'leads');
          setStatusMap(event.data.data || {});
        }
        // Mise à jour en temps réel
        else if (event.data.type === 'PROCESSING_STATUS_UPDATED') {
          const newStatuses = event.data.data || {};
          const changedLeads = Object.keys(newStatuses).map(id => {
            const status = newStatuses[id];
            return `${status.leadName || id}: ${status.status}`;
          }).join(', ');
          console.log('🔄 Statuts mis à jour:', changedLeads);
          setStatusMap(newStatuses);
        }
      }
    };

    window.addEventListener('message', handleStatusUpdate);
    
    return () => {
      window.removeEventListener('message', handleStatusUpdate);
    };
  }, []);

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
          completedSteps: status.completedSteps
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
    getStatusStats
  };
}