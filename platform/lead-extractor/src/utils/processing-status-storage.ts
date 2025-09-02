/**
 * Gestionnaire du localStorage pour les statuts de traitement des leads
 */

const PROCESSING_STATUS_STORAGE_KEY = 'lead_processing_statuses';
const PROCESSING_STATUS_METADATA_KEY = 'lead_processing_metadata';

export interface ProcessingStatus {
  status: 'pending' | 'processing' | 'success' | 'error';
  timestamp?: string;
  message?: string;
  errorMessage?: string;
  completedSteps?: number;
  leadName?: string;
  currentStep?: number;
  totalSteps?: number;
}

export type ProcessingStatusMap = Record<string, ProcessingStatus>;

interface ProcessingStatusMetadata {
  lastUpdated: string;
  version: string;
  totalStatuses: number;
}

export class ProcessingStatusStorage {
  private static readonly VERSION = '1.0.0';

  /**
   * Sauvegarde tous les statuts dans localStorage
   */
  static saveStatuses(statusMap: ProcessingStatusMap): void {
    try {
      const metadata: ProcessingStatusMetadata = {
        lastUpdated: new Date().toISOString(),
        version: this.VERSION,
        totalStatuses: Object.keys(statusMap).length
      };

      localStorage.setItem(PROCESSING_STATUS_STORAGE_KEY, JSON.stringify(statusMap));
      localStorage.setItem(PROCESSING_STATUS_METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error('[PROCESSING STATUS STORAGE] Erreur sauvegarde:', error);
    }
  }

  /**
   * Charge tous les statuts depuis localStorage
   */
  static loadStatuses(): ProcessingStatusMap {
    try {
      const stored = localStorage.getItem(PROCESSING_STATUS_STORAGE_KEY);
      if (!stored) return {};

      const statusMap = JSON.parse(stored) as ProcessingStatusMap;
      
      // Validation basique
      if (typeof statusMap !== 'object' || statusMap === null) {
        console.warn('[PROCESSING STATUS STORAGE] Format invalide, reset');
        return {};
      }

      return statusMap;
    } catch (error) {
      console.error('[PROCESSING STATUS STORAGE] Erreur chargement:', error);
      return {};
    }
  }

  /**
   * Sauvegarde le statut d'un lead spécifique
   */
  static saveLeadStatus(leadId: string, status: ProcessingStatus): void {
    const currentStatuses = this.loadStatuses();
    currentStatuses[leadId] = {
      ...currentStatuses[leadId],
      ...status,
      timestamp: status.timestamp || new Date().toISOString()
    };
    this.saveStatuses(currentStatuses);
  }

  /**
   * Récupère le statut d'un lead spécifique
   */
  static getLeadStatus(leadId: string): ProcessingStatus | null {
    const statuses = this.loadStatuses();
    return statuses[leadId] || null;
  }

  /**
   * Supprime le statut d'un lead
   */
  static removeLeadStatus(leadId: string): void {
    const statuses = this.loadStatuses();
    delete statuses[leadId];
    this.saveStatuses(statuses);
  }

  /**
   * Efface tous les statuts
   */
  static clearAllStatuses(): void {
    localStorage.removeItem(PROCESSING_STATUS_STORAGE_KEY);
    localStorage.removeItem(PROCESSING_STATUS_METADATA_KEY);
  }

  /**
   * Nettoie les statuts anciens (plus de X jours)
   */
  static cleanupOldStatuses(maxAgeDays: number = 30): number {
    const statuses = this.loadStatuses();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
    
    let removedCount = 0;
    const cleanedStatuses: ProcessingStatusMap = {};

    Object.entries(statuses).forEach(([leadId, status]) => {
      if (status.timestamp) {
        const statusDate = new Date(status.timestamp);
        if (statusDate >= cutoffDate) {
          cleanedStatuses[leadId] = status;
        } else {
          removedCount++;
        }
      } else {
        // Garder les statuts sans timestamp
        cleanedStatuses[leadId] = status;
      }
    });

    if (removedCount > 0) {
      this.saveStatuses(cleanedStatuses);
      console.log(`[PROCESSING STATUS STORAGE] ${removedCount} statuts anciens supprimés`);
    }

    return removedCount;
  }

  /**
   * Obtient les métadonnées de stockage
   */
  static getMetadata(): ProcessingStatusMetadata | null {
    try {
      const stored = localStorage.getItem(PROCESSING_STATUS_METADATA_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('[PROCESSING STATUS STORAGE] Erreur métadonnées:', error);
      return null;
    }
  }

  /**
   * Statistiques des statuts stockés
   */
  static getStatusStats(): { 
    total: number;
    pending: number;
    processing: number;
    success: number;
    error: number;
  } {
    const statuses = this.loadStatuses();
    const stats = { total: 0, pending: 0, processing: 0, success: 0, error: 0 };

    Object.values(statuses).forEach(status => {
      stats.total++;
      if (status.status in stats) {
        (stats as any)[status.status]++;
      }
    });

    return stats;
  }

  /**
   * Nettoie les statuts pour les leads qui n'existent plus
   */
  static cleanupOrphanedStatuses(existingLeadIds: string[]): number {
    const statuses = this.loadStatuses();
    const existingIds = new Set(existingLeadIds);
    let removedCount = 0;
    
    const cleanedStatuses: ProcessingStatusMap = {};

    Object.entries(statuses).forEach(([leadId, status]) => {
      if (existingIds.has(leadId)) {
        cleanedStatuses[leadId] = status;
      } else {
        removedCount++;
      }
    });

    if (removedCount > 0) {
      this.saveStatuses(cleanedStatuses);
      console.log(`[PROCESSING STATUS STORAGE] ${removedCount} statuts orphelins supprimés`);
    }

    return removedCount;
  }

  /**
   * Export des statuts en JSON pour debug/backup
   */
  static exportToJSON(): string {
    const statuses = this.loadStatuses();
    const metadata = this.getMetadata();
    
    return JSON.stringify({
      metadata,
      statuses,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }
}
