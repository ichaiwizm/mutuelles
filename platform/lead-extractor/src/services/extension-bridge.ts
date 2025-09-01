// Service de communication avec l'extension Chrome SwissLife
import type { Lead } from '@/types/lead';
import { formatLeadsForExtension } from '@/utils/lead-formatter';

export interface ExtensionMessage {
  action: 'CHECK_SWISSLIFE_TAB' | 'OPEN_SWISSLIFE_TAB' | 'SEND_LEADS';
  data?: any;
}

export interface ExtensionResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export class ExtensionBridge {
  private static readonly EXTENSION_ID = 'extension-id-will-be-set-in-production'; // TODO: Définir l'ID réel en production

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

  // Construire l'URL SwissLife complète
  static buildSwissLifeUrl(): string {
    const baseUrl = import.meta.env.VITE_SWISSLIFE_BASE_URL || 'https://www.swisslifeone.fr';
    const path = import.meta.env.VITE_SWISSLIFE_TARIF_PATH || '/index-swisslifeOne.html#/tarification-et-simulation/slsis';
    const refreshTime = Date.now();
    
    // Si le path contient un fragment (#), ajouter refreshTime après le fragment
    if (path.includes('#')) {
      const [basePath, fragment] = path.split('#');
      return `${baseUrl}${basePath}#${fragment}?refreshTime=${refreshTime}`;
    } else {
      return `${baseUrl}${path}?refreshTime=${refreshTime}`;
    }
  }

  // Vérifier si un onglet SwissLife est ouvert
  static async checkSwissLifeTab(): Promise<{ exists: boolean; tabId?: number }> {
    try {
      const message: ExtensionMessage = {
        action: 'CHECK_SWISSLIFE_TAB'
      };

      const response = await this.sendMessageToExtension(message);
      
      if (response && response.success) {
        return response.data || { exists: false };
      } else {
        return { exists: false };
      }
    } catch (error) {
      console.error('❌ Error checking SwissLife tab:', error);
      return { exists: false };
    }
  }

  // Ouvrir ou activer un onglet SwissLife
  static async openSwissLifeTab(): Promise<{ success: boolean; tabId?: number; wasExisting?: boolean }> {
    try {
      // D'abord vérifier si un onglet existe
      const tabCheck = await this.checkSwissLifeTab();
      
      if (tabCheck.exists && tabCheck.tabId) {
        // Ne pas activer l'onglet existant - rester en arrière-plan
        return {
          success: true,
          tabId: tabCheck.tabId,
          wasExisting: true
        };
      } else {
        // Créer un nouvel onglet
        const createMessage: ExtensionMessage = {
          action: 'OPEN_SWISSLIFE_TAB',
          data: { 
            url: this.buildSwissLifeUrl(),
            active: false // Ne pas donner le focus au nouvel onglet
          }
        };
        
        const response = await this.sendMessageToExtension(createMessage);
        
        return {
          success: response.success,
          tabId: response.data?.tabId,
          wasExisting: false
        };
      }
    } catch (error) {
      console.error('Error opening SwissLife tab:', error);
      return { success: false };
    }
  }

  // Envoyer des leads à l'extension
  static async sendLeadsToExtension(leads: Lead[]): Promise<{ success: boolean; error?: string }> {
    try {
      if (leads.length === 0) {
        return { success: false, error: 'Aucun lead à envoyer' };
      }

      // Formater les leads pour l'extension
      const formattedLeads = formatLeadsForExtension(leads);
      
      const message: ExtensionMessage = {
        action: 'SEND_LEADS',
        data: {
          leads: formattedLeads,
          timestamp: new Date().toISOString(),
          count: formattedLeads.length
        }
      };

      const response = await this.sendMessageToExtension(message);
      
      if (response.success) {
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Erreur inconnue' };
      }
    } catch (error) {
      console.error('Error sending leads to extension:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  }

  // Envoyer un message à l'extension
  private static async sendMessageToExtension(message: ExtensionMessage): Promise<ExtensionResponse> {
    
    return new Promise((resolve) => {
      // Pour le développement, on simule la communication via window.postMessage
      // En production, on utilisera chrome.runtime.sendMessage
      
      if (window.location.hostname === 'localhost') {
        // Mode développement : communication via events
        const targetOrigin = window.location.origin;
        const messageId = `extension-message-${Date.now()}`;
        
        const handleResponse = (event: MessageEvent) => {
          if (event.origin !== targetOrigin) return;           // sécurité
          if (event.source !== window) return;                 // même fenêtre
          const data = event.data;
          if (!data || data.type !== 'FROM_EXTENSION') return; // ne traiter que les réponses
          if (data.messageId !== messageId) return;            // bon corrélateur
          
          window.removeEventListener('message', handleResponse);
          resolve(data.response || { success: false, error: 'Empty response' });
        };
        
        window.addEventListener('message', handleResponse);
        
        // Envoyer le message
        const messagePayload = {
          type: 'TO_EXTENSION',        // requête
          message,
          messageId
        };
        window.postMessage(messagePayload, targetOrigin);
        
        // Timeout plus réaliste pour réveiller le service worker
        setTimeout(() => {
          window.removeEventListener('message', handleResponse);
          resolve({ success: false, error: 'Timeout - Extension ne répond pas' });
        }, 5000);
      } else {
        // Mode production : utiliser chrome.runtime.sendMessage
        const chromeApi = (window as any).chrome;
        if (typeof chromeApi !== 'undefined' && chromeApi.runtime) {
          chromeApi.runtime.sendMessage(
            this.EXTENSION_ID,
            message,
            (response: ExtensionResponse) => {
              if (chromeApi.runtime.lastError) {
                resolve({ success: false, error: chromeApi.runtime.lastError.message });
              } else {
                resolve(response || { success: false, error: 'No response' });
              }
            }
          );
        } else {
          resolve({ success: false, error: 'Chrome runtime not available' });
        }
      }
    });
  }

}

// Export des types pour utilisation externe
export type { Lead };