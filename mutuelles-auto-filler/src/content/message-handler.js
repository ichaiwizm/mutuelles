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
    this._initializeCommon('provider');
  }

  initializeForLocalhost() {
    this._initializeCommon('platform');
  }

  _initializeCommon(mode) {
    // Écouter les messages du background script (leads/notifications)
    import(chrome.runtime.getURL('src/shared/messages.js')).catch(() => {});
    chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
      await this.handleRuntimeMessage(message, sender, sendResponse);
    });
    // Écouter les messages de l'orchestrator
    if (mode === 'provider') {
      window.addEventListener('message', async (event) => {
        await this.handleWindowMessage(event);
      });
    } else if (mode === 'platform') {
      window.addEventListener('message', async (event) => {
        await this.handleLocalhostWindowMessage(event);
      });
    }
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
      const FROM_EXTENSION_STATUS = (self.BG && self.BG.WINDOW_MSG && self.BG.WINDOW_MSG.FROM_EXTENSION_STATUS) || 'FROM_EXTENSION_STATUS';
      // Envoyer vers la plateforme via postMessage
      window.postMessage({
        type: FROM_EXTENSION_STATUS,
        statusUpdate: message.data
      }, window.location.origin);
      
      sendResponse({ forwarded: true });
    }
  }

  async handleWindowMessage(event) {
    await this._relayOrchestratorStatus(event, '[CONTENT SwissLife]');
  }

  async handleLocalhostWindowMessage(event) {
    // Filtrer les messages sans type pour éviter la pollution des logs
    if (!event.data?.type) {
      return;
    }
    
    // Écouter les messages de l'orchestrator (depuis l'iframe) - flux legacy
    const ORCH = (self.BG && self.BG.WINDOW_MSG && self.BG.WINDOW_MSG.ORCHESTRATOR_STATUS_UPDATE) || 'ORCHESTRATOR_STATUS_UPDATE';
    if (event.data.type === ORCH) {
      await this._relayOrchestratorStatus(event, '[CONTENT localhost]');
    }
  }

  async _relayOrchestratorStatus(event, tag = '[CONTENT]') {
    const ORCH = (self.BG && self.BG.WINDOW_MSG && self.BG.WINDOW_MSG.ORCHESTRATOR_STATUS_UPDATE) || 'ORCHESTRATOR_STATUS_UPDATE';
    if (event.data?.type !== ORCH) return;
    try {
      await chrome.runtime.sendMessage({
        action: event.data.action,
        data: event.data.data
      });
    } catch (error) {
      console.error(`❌ ${tag} Erreur relais au background:`, error);
    }
  }
}
