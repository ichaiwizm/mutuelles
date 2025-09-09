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
    
    
    // Écouter les messages du background script pour les notifications de statut
    chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
      await this.handleRuntimeMessage(message, sender, sendResponse);
    });
    
    // Écouter les messages de l'orchestrator (depuis l'iframe)
    window.addEventListener('message', async (event) => {
      await this.handleLocalhostWindowMessage(event);
    });
  }

  async handleRuntimeMessage(message, sender, sendResponse) {
    if (message.action === 'LEADS_UPDATED' && message.source === 'background') {
      // Recharger les leads
      this.loadLeads().then(updatedLeads => {
        // Si pas d'UI, la créer à la volée (affichage uniquement quand leads présents)
        if (!document.getElementById('orchestrator-panel')) {
          (async () => {
            try {
              const uiMod = await import(chrome.runtime.getURL('src/ui/ui.js'));
              // Créer l'UI maintenant
              uiMod.createUI();
              // Créer/brancher le gestionnaire de progression global
              const progressHandler = uiMod.createQueueProgressHandler();
              this.autoExecutionManager.setDependencies(
                this.autoExecutionManager.processLeadsQueue,
                progressHandler
              );
              window.orchestratorProgressHandler = progressHandler;
            } catch (e) {
              console.warn('[MESSAGE-HANDLER] Impossible de créer l\'UI à la volée:', e);
            }
          })();
        }
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
      
      
      // Envoyer vers la plateforme via postMessage
      window.postMessage({
        type: 'FROM_EXTENSION_STATUS',
        statusUpdate: message.data
      }, window.location.origin);
      
      sendResponse({ forwarded: true });
    }
  }

  async handleWindowMessage(event) {
    if (event.data?.type === 'ORCHESTRATOR_STATUS_UPDATE') {
      
      
      // Relayer au background
      try {
        const response = await chrome.runtime.sendMessage({
          action: event.data.action,
          data: event.data.data
        });
      } catch (error) {
        console.error('❌ [CONTENT SwissLife] Erreur relais au background:', error);
      }
    }
  }

  async handleLocalhostWindowMessage(event) {
    // Filtrer les messages sans type pour éviter la pollution des logs
    if (!event.data?.type) {
      return;
    }
    
    // Écouter les messages de l'orchestrator (depuis l'iframe) - flux legacy
    if (event.data.type === 'ORCHESTRATOR_STATUS_UPDATE') {
      
      
      // Relayer au background
      try {
        const response = await chrome.runtime.sendMessage({
          action: event.data.action,
          data: event.data.data
        });
      } catch (error) {
        console.error('❌ [CONTENT localhost] Erreur relais au background:', error);
      }
    }
  }
}
