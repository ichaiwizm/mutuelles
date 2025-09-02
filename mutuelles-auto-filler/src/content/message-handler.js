/**
 * Gestionnaire de messages Chrome Runtime et window.postMessage
 * Gère la communication avec le background script et les notifications de statut
 */

export class MessageHandler {
  constructor(autoExecutionManager, loadLeads) {
    this.autoExecutionManager = autoExecutionManager;
    this.loadLeads = loadLeads;
  }

  initializeForSwissLife() {
    console.log('📬 Initialisation gestionnaire de messages SwissLife');
    
    // Écouter les messages du background script pour les mises à jour de leads
    chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
      await this.handleRuntimeMessage(message, sender, sendResponse);
    });

    // Écouter les messages de l'orchestrator (depuis l'iframe)
    window.addEventListener('message', async (event) => {
      await this.handleWindowMessage(event);
    });
  }

  initializeForLocalhost() {
    console.log('📬 Initialisation gestionnaire de messages localhost');
    
    // Écouter les messages de l'orchestrator (depuis l'iframe)
    window.addEventListener('message', async (event) => {
      await this.handleLocalhostWindowMessage(event);
    });
  }

  async handleRuntimeMessage(message, sender, sendResponse) {
    if (message.action === 'LEADS_UPDATED' && message.source === 'background') {
      // Recharger les leads
      this.loadLeads().then(updatedLeads => {
        // L'UI sera automatiquement mise à jour via les watchers existants
      }).catch(error => {
        // Ignore silently
      });
      
      // Si autoExecute est demandé, lancer l'exécution automatique
      if (message.data.autoExecute) {
        await this.autoExecutionManager.handleAutoExecution(true);
      }
      
      sendResponse({ received: true });
    }
    
    // Relayer les notifications de statut vers la plateforme
    else if (message.action === 'FORWARD_STATUS_TO_PLATFORM' && message.source === 'background') {
      console.log('📡 [CONTENT] Relais notification statut vers plateforme:', message.data);
      
      // Envoyer vers la plateforme via postMessage
      window.postMessage({
        type: 'FROM_EXTENSION_STATUS',
        statusUpdate: message.data
      }, window.location.origin);
      
      console.log('📡 [CONTENT] Message relayé via postMessage');
      sendResponse({ forwarded: true });
    }
  }

  async handleWindowMessage(event) {
    if (event.data?.type === 'ORCHESTRATOR_STATUS_UPDATE') {
      console.log('📡 [CONTENT SwissLife] Reçu status update de l\'orchestrator:', event.data);
      
      // Relayer au background
      try {
        const response = await chrome.runtime.sendMessage({
          action: event.data.action,
          data: event.data.data
        });
        console.log('📡 [CONTENT SwissLife] Relayé au background, réponse:', response);
      } catch (error) {
        console.error('❌ [CONTENT SwissLife] Erreur relais au background:', error);
      }
    }
  }

  async handleLocalhostWindowMessage(event) {
    // Écouter les messages de l'orchestrator (depuis l'iframe)
    if (event.data?.type === 'ORCHESTRATOR_STATUS_UPDATE') {
      console.log('📡 [CONTENT] Reçu status update de l\'orchestrator:', event.data);
      
      // Relayer au background
      try {
        const response = await chrome.runtime.sendMessage({
          action: event.data.action,
          data: event.data.data
        });
        console.log('📡 [CONTENT] Relayé au background, réponse:', response);
      } catch (error) {
        console.error('❌ [CONTENT] Erreur relais au background:', error);
      }
      
      // AUSSI relayer à la plateforme localhost:5174
      try {
        const statusUpdate = {
          type: 'LEAD_STATUS_UPDATE',
          leadId: event.data.data.leadId,
          status: event.data.data.status,
          leadName: event.data.data.leadName,
          timestamp: new Date().toISOString(),
          details: event.data.data.details || {}
        };
        
        window.postMessage({
          type: 'FROM_EXTENSION_STATUS',
          statusUpdate: statusUpdate
        }, 'http://localhost:5174');
        
        console.log('📡 [CONTENT] Notification envoyée à la plateforme:', statusUpdate);
      } catch (error) {
        console.error('❌ [CONTENT] Erreur notification plateforme:', error);
      }
    }
  }
}