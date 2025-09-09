import { toast } from 'sonner';
import { ExtensionBridge } from '@/services/extension-bridge';
import type { Lead } from '@/types/lead';
import type { ProcessingStatus } from '@/utils/processing-status-storage';

export interface DashboardHandlersConfig {
  selectedLeads: Lead[];
  parallelTabs: number;
  setLeadStatus: (id: string, status: ProcessingStatus) => void;
  setSendingToExtension: (sending: boolean) => void;
  setRunActive: (active: boolean) => void;
  setStoppingRun: (stopping: boolean) => void;
  setIsolatedCount: (count: number) => void;
  setStoppingIsolated: (stopping: boolean) => void;
  clearSelection: () => void;
}

export class DashboardHandlers {
  constructor(private config: DashboardHandlersConfig) {}

  // Handler pour l'envoi d'un seul lead (retry)
  handleRetrySingleLead = async (lead: Lead) => {
    try {
      // 1. Vérifier si l'extension est installée
      const isInstalled = await ExtensionBridge.checkExtensionInstalled();
      
      if (!isInstalled) {
        toast.error('Extension SwissLife non détectée', {
          description: 'Assurez-vous que l\'extension est installée et activée.'
        });
        return;
      }

      // 2. Lancer le run pour ce lead
      toast.info(`Réessai en cours pour ${lead.contact.prenom} ${lead.contact.nom}...`);
      
      const result = await ExtensionBridge.startRun({ 
        providers: ['swisslife'], 
        leads: [lead], 
        parallelTabs: 1, 
        options: { minimizeWindow: true, closeOnFinish: false, isolated: true } 
      });
      
      if (result.success) {
        toast.success(`Lead "${lead.contact.prenom} ${lead.contact.nom}" renvoyé avec succès`);
        try {
          const iso = await ExtensionBridge.getIsolatedState();
          this.config.setIsolatedCount(iso?.isolatedCount || 1);
        } catch { 
          this.config.setIsolatedCount(1); 
        }
      } else {
        toast.error('Erreur lors du réessai', {
          description: result.error || 'Erreur inconnue'
        });
      }
      
    } catch (error) {
      console.error('Erreur retry:', error);
      toast.error('Erreur lors du réessai', {
        description: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  };

  // Handler pour l'envoi à l'extension
  handleSendToExtension = async () => {
    this.config.setSendingToExtension(true);
    
    if (this.config.selectedLeads.length === 0) {
      toast.error('Aucun lead sélectionné');
      this.config.setSendingToExtension(false);
      return;
    }

    try {
      // 1. Vérifier si l'extension est installée
      const isInstalled = await ExtensionBridge.checkExtensionInstalled();
      
      if (!isInstalled) {
        toast.error('Extension SwissLife non détectée', {
          description: 'Assurez-vous que l\'extension est installée et activée.'
        });
        this.config.setSendingToExtension(false);
        return;
      }

      // 2. Démarrer le run
      toast.info('Lancement du traitement dans l\'extension...');
      const result = await ExtensionBridge.startRun({ 
        providers: ['swisslife'], 
        leads: this.config.selectedLeads, 
        parallelTabs: Math.max(1, this.config.parallelTabs || 3), 
        options: { minimizeWindow: true, closeOnFinish: true } 
      });
      
      if (result.success) {
        toast.success(`${this.config.selectedLeads.length} leads envoyés`, { 
          description: 'Traitement en cours dans l\'extension.' 
        });
        this.config.clearSelection();
        this.config.setRunActive(true);
      } else {
        toast.error('Erreur lors de l\'envoi des leads', { 
          description: result.error || 'Erreur inconnue' 
        });
      }
      
    } catch (error) {
      console.error('Erreur générale:', error);
      toast.error('Erreur inattendue', {
        description: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    } finally {
      this.config.setSendingToExtension(false);
    }
  };

  // Stop run en cours
  handleStopRun = async () => {
    try {
      this.config.setStoppingRun(true);
      const ok = await ExtensionBridge.cancelRun();
      if (ok) {
        toast.success('Run arrêté');
        this.config.setRunActive(false);
      } else {
        toast.error('Impossible d\'arrêter le run');
      }
    } catch (e) {
      toast.error('Erreur arrêt run', { 
        description: e instanceof Error ? e.message : 'Erreur inconnue' 
      });
    } finally {
      this.config.setStoppingRun(false);
    }
  };

  // Stop retries isolés en cours
  handleStopIsolated = async () => {
    try {
      this.config.setStoppingIsolated(true);
      const ok = await ExtensionBridge.cancelIsolated();
      if (ok) {
        toast.success('Retry(s) isolé(s) arrêté(s)');
        try {
          const iso = await ExtensionBridge.getIsolatedState();
          this.config.setIsolatedCount(iso?.isolatedCount || 0);
        } catch { /* ignore, poll mettra à jour */ }
      } else {
        toast.error("Impossible d'arrêter les retries isolés");
      }
    } catch (e) {
      toast.error('Erreur arrêt retries isolés', { 
        description: e instanceof Error ? e.message : 'Erreur inconnue' 
      });
    } finally {
      this.config.setStoppingIsolated(false);
    }
  };

  // Mettre à jour manuellement le statut des leads sélectionnés
  handleUpdateSelectedStatus = (status: ProcessingStatus['status']) => {
    const selectedLeadIds = this.config.selectedLeads.map(l => l.id);
    if (selectedLeadIds.length === 0) return;
    
    const timestamp = new Date().toISOString();
    selectedLeadIds.forEach(id => this.config.setLeadStatus(id, {
      status,
      timestamp,
      message: 'Statut modifié manuellement'
    } as ProcessingStatus));
  };
}