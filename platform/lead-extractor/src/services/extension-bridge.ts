// Service de communication avec l'extension Chrome SwissLife
import type { Lead } from '@/types/lead';
import { formatLeadsForExtension } from '@/utils/lead-formatter';

export interface ExtensionMessage {
  action: 'PING' | 'SET_CONFIG' | 'START_RUN';
  data?: any;
}

export interface LeadStatusUpdate {
  type: 'LEAD_STATUS_UPDATE';
  leadId: string;
  status: 'processing' | 'success' | 'error' | 'launched' | 'started' | 'pending';
  leadName: string;
  timestamp: string;
  details: {
    message?: string;
    completedSteps?: number;
    errorMessage?: string;
    currentStep?: number;
    totalSteps?: number;
    stepName?: string;
  };
}

export interface ExtensionResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export class ExtensionBridge {
  // ID d'extension lu depuis l'env Vite si disponible
  private static getExtensionId(): string | null {
    const envId = (import.meta as any).env?.VITE_EXTENSION_ID as string | undefined;
    if (envId && envId.trim() && !/will-be-set/i.test(envId)) return envId.trim();
    // fallback legacy (ancien hardcode, à éviter)
    const legacy = 'extension-id-will-be-set-in-production';
    return /will-be-set/i.test(legacy) ? null : legacy;
  }
  private static statusUpdateCallbacks: Set<(update: LeadStatusUpdate) => void> = new Set();

  // Vérifier si l'extension est installée
  static async checkExtensionInstalled(): Promise<boolean> {
    if (typeof (window as any).chrome === 'undefined' || !(window as any).chrome.runtime) {
      return false;
    }

    try {
      // Vérifier la présence de l'élément injecté par le content script
      const extensionElement = document.querySelector('[data-extension-id]');
      
      if (extensionElement) {
        return true;
      }

      // Fallback: vérifier si on est sur localhost (extension devrait être active)
      if (window.location.hostname === 'localhost') {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking extension:', error);
      return false;
    }
  }

  // Ping simple du SW
  static async ping(): Promise<boolean> {
    try {
      const res = await this.sendMessageToExtension({ action: 'PING' } as any);
      return !!(res && (res as any).success);
    } catch (_) {
      return false;
    }
  }

  // Mettre à jour la configuration d'automatisation côté extension
  static async setAutomationConfig(config: { parallelTabs?: number; minimizeWindow?: boolean; closeWindowOnFinish?: boolean; retryDelay?: number; maxRetryAttempts?: number; timeoutRetryDelay?: number }): Promise<boolean> {
    try {
      const message: ExtensionMessage = {
        action: 'SET_CONFIG',
        data: { automation: config }
      };
      const res = await this.sendMessageToExtension(message);
      return !!res?.success;
    } catch (error) {
      console.error('Error setting automation config:', error);
      return false;
    }
  }

  // Demander l'état du run au background
  static async getRunState(): Promise<{ active: boolean } & Record<string, any>> {
    try {
      const message: ExtensionMessage = { action: 'GET_RUN_STATE' } as any;
      const res = await this.sendMessageToExtension(message);
      return (res?.data as any) || { active: false };
    } catch {
      return { active: false } as any;
    }
  }

  // Demander l'annulation du run en cours (fermer fenêtre/onglets)
  static async cancelRun(): Promise<boolean> {
    try {
      const message: ExtensionMessage = { action: 'CANCEL_RUN' } as any;
      const res = await this.sendMessageToExtension(message);
      return !!res?.success;
    } catch {
      return false;
    }
  }

  // État des retries isolés
  static async getIsolatedState(): Promise<{ isolatedCount: number; groups: Array<{ groupId: string; tabId?: number; windowId?: number }> }> {
    try {
      const message: ExtensionMessage = { action: 'GET_ISOLATED_STATE' } as any;
      const res = await this.sendMessageToExtension(message);
      return (res?.data as any) || { isolatedCount: 0, groups: [] };
    } catch {
      return { isolatedCount: 0, groups: [] };
    }
  }

  // Annuler les retries isolés (tous ou un groupId)
  static async cancelIsolated(groupId?: string): Promise<boolean> {
    try {
      const message: ExtensionMessage = { action: 'CANCEL_ISOLATED', data: groupId ? { groupId } : {} } as any;
      const res = await this.sendMessageToExtension(message);
      return !!res?.success;
    } catch {
      return false;
    }
  }

  // Démarrer un run (fenêtre unique + pool d'onglets)
  static async startRun(params: { providers: string[]; leads: Lead[]; parallelTabs: number; options?: { minimizeWindow?: boolean; closeOnFinish?: boolean } }): Promise<{ success: boolean; error?: string }> {
    try {
      const { providers, leads, parallelTabs, options } = params || ({} as any);
      if (!providers || providers.length === 0) return { success: false, error: 'providers requis' };
      if (!leads || leads.length === 0) return { success: false, error: 'leads requis' };
      const formattedLeads = formatLeadsForExtension(leads);

      const message: ExtensionMessage = {
        action: 'START_RUN',
        data: { providers, leads: formattedLeads, parallelTabs, options }
      };

      const response = await this.sendMessageToExtension(message);
      return response.success ? { success: true } : { success: false, error: response.error || 'Erreur inconnue' };
    } catch (error) {
      console.error('Error starting run:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  }
  // Envoyer un message à l'extension
  private static async sendMessageToExtension(message: ExtensionMessage): Promise<ExtensionResponse> {
    // Stratégie: essayer chrome.runtime.sendMessage si un ID d'extension est disponible;
    // sinon ou en échec, fallback vers window.postMessage (bridge contenu) quel que soit l'host.

    return new Promise((resolve) => {
      const chromeApi = (window as any).chrome;
      const extId = this.getExtensionId();

      const fallbackViaWindow = () => {
        const targetOrigin = window.location.origin;
        const messageId = `extension-message-${Date.now()}`;

        const handleResponse = (event: MessageEvent) => {
          if (event.origin !== targetOrigin) return;
          if (event.source !== window) return;
          const data = event.data;
          if (!data || data.type !== 'FROM_EXTENSION') return;
          if (data.messageId !== messageId) return;

          window.removeEventListener('message', handleResponse);
          resolve(data.response || { success: false, error: 'Empty response' });
        };

        window.addEventListener('message', handleResponse);

        window.postMessage({ type: 'TO_EXTENSION', message, messageId }, targetOrigin);

        setTimeout(() => {
          window.removeEventListener('message', handleResponse);
          resolve({ success: false, error: 'Timeout - Extension ne répond pas' });
        }, 5000);
      };

      if (chromeApi?.runtime && extId) {
        try {
          chromeApi.runtime.sendMessage(
            extId,
            message,
            (response: ExtensionResponse) => {
              if (chromeApi.runtime.lastError) {
                // Échec: fallback vers window.postMessage
                fallbackViaWindow();
              } else {
                resolve(response || { success: false, error: 'No response' });
              }
            }
          );
        } catch (_) {
          fallbackViaWindow();
        }
      } else {
        fallbackViaWindow();
      }
    });
  }


  // Ajouter un callback pour les mises à jour de statut
  static onLeadStatusUpdate(callback: (update: LeadStatusUpdate) => void): () => void {
    this.statusUpdateCallbacks.add(callback);
    this.initializeStatusListener();
    return () => {
      this.statusUpdateCallbacks.delete(callback);
    };
  }

  // Initialiser l'écoute des messages de statut (une seule fois)
  private static statusListenerInitialized = false;
  private static initializeStatusListener(): void {
    if (this.statusListenerInitialized) return;
    this.statusListenerInitialized = true;
    window.addEventListener('message', (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'FROM_EXTENSION_STATUS' && event.data?.statusUpdate) {
        const update = event.data.statusUpdate as LeadStatusUpdate;
        this.statusUpdateCallbacks.forEach(callback => {
          try { callback(update); } catch (error) { console.error('[EXTENSION BRIDGE] Callback error:', error); }
        });
      } else if (event.data?.type === 'FROM_EXTENSION' && event.data?.statusUpdate) {
        const update = event.data.statusUpdate as LeadStatusUpdate;
        this.statusUpdateCallbacks.forEach(callback => {
          try { callback(update); } catch (error) { console.error('[EXTENSION BRIDGE] Callback error:', error); }
        });
      }
    });
  }

}

// Export des types pour utilisation externe
// Types already exported above
