import { toast } from 'sonner';
import { ExtensionBridge } from '@/services/extension-bridge';
import type { Lead } from '@/types/lead';
import type { ProcessingStatus } from '@/utils/processing-status-storage';

export interface DashboardHandlersConfig {
  selectedLeads: Lead[];
  parallelTabs: number;
  setLeadStatus: (id: string, status: ProcessingStatus) => void;
  setSendingToExtension: (sending: boolean) => void;
  clearSelection: () => void;
  getSwissLifeOverrides?: () => Record<string, any> | null;
}

export class DashboardHandlers {
  constructor(private config: DashboardHandlersConfig) {}

  // Handler pour l'envoi d'un seul lead (retry)
  handleRetrySingleLead = async (lead: Lead) => {
    try {
      const isInstalled = await ExtensionBridge.checkExtensionInstalled();
      if (!isInstalled) {
        toast.error('Extension SwissLife non détectée', {
          description: "Assurez-vous que l'extension est installée et activée.",
        });
        return;
      }

      toast.info(`Réessai en cours pour ${lead.contact.prenom} ${lead.contact.nom}...`);

      const result = await ExtensionBridge.startRun({
        providers: ['swisslife'],
        leads: [lead],
        parallelTabs: 1,
        options: {
          minimizeWindow: false,
          closeOnFinish: false,
          isolated: true,
          swissLifeOverrides: this.config.getSwissLifeOverrides?.() || undefined,
        },
      });

      if (result.success) {
        toast.success(`Lead "${lead.contact.prenom} ${lead.contact.nom}" renvoyé avec succès`);
      } else {
        toast.error('Erreur lors du réessai', {
          description: result.error || 'Erreur inconnue',
        });
      }
    } catch (error) {
      console.error('Erreur retry:', error);
      toast.error('Erreur lors du réessai', {
        description: error instanceof Error ? error.message : 'Erreur inconnue',
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
      const isInstalled = await ExtensionBridge.checkExtensionInstalled();

      if (!isInstalled) {
        toast.error('Extension SwissLife non détectée', {
          description: "Assurez-vous que l'extension est installée et activée.",
        });
        this.config.setSendingToExtension(false);
        return;
      }

      toast.info("Lancement du traitement dans l'extension...");
      const result = await ExtensionBridge.startRun({
        providers: ['swisslife'],
        leads: this.config.selectedLeads,
        parallelTabs: Math.max(1, this.config.parallelTabs || 3),
        options: {
          minimizeWindow: false,
          closeOnFinish: true,
          swissLifeOverrides: this.config.getSwissLifeOverrides?.() || undefined,
        },
      });

      if (result.success) {
        toast.success(`${this.config.selectedLeads.length} leads envoyés`, {
          description: "Traitement en cours dans l'extension.",
        });
        this.config.clearSelection();
      } else {
        toast.error("Erreur lors de l'envoi des leads", {
          description: result.error || 'Erreur inconnue',
        });
      }
    } catch (error) {
      console.error('Erreur générale:', error);
      toast.error('Erreur inattendue', {
        description: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    } finally {
      this.config.setSendingToExtension(false);
    }
  };

  // Mettre à jour manuellement le statut des leads sélectionnés
  handleUpdateSelectedStatus = (status: ProcessingStatus['status']) => {
    const selectedLeadIds = this.config.selectedLeads.map((l) => l.id);
    if (selectedLeadIds.length === 0) return;

    const timestamp = new Date().toISOString();
    selectedLeadIds.forEach((id) =>
      this.config.setLeadStatus(
        id,
        {
          status,
          timestamp,
          message: 'Statut modifié manuellement',
        } as ProcessingStatus,
      ),
    );
  };
}

