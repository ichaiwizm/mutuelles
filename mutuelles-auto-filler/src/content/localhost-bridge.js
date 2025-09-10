/**
 * Pont de communication avec la plateforme localhost:5174
 * Gère l'injection de l'ID d'extension et la communication bidirectionnelle
 */

export class LocalhostBridge {
  constructor(messageHandler) {
    this.messageHandler = messageHandler;
    this._config = null;
  }

  initialize() {
    // Charger les constantes de messages (shared)
    import(chrome.runtime.getURL('src/shared/messages.js')).catch(() => {});

    // Charger la config dynamiquement
    import(chrome.runtime.getURL('src/config/config.js'))
      .then((mod) => {
        this._config = mod;
        
      })
      .catch(() => {
        // ignore
      });
    
    this.injectExtensionId();
    this.setupMessageListener();
    
    // Initialiser le gestionnaire de messages pour localhost
    this.messageHandler.initializeForLocalhost();
    
    
  }

  injectExtensionId() {
    // Injecter l'ID de l'extension pour la communication
    const extensionIdElement = document.createElement('div');
    extensionIdElement.setAttribute('data-extension-id', chrome.runtime.id);
    extensionIdElement.style.display = 'none';
    document.documentElement.appendChild(extensionIdElement);
  }

  setupMessageListener() {
    // Écouter les messages de la plateforme via window.postMessage
    window.addEventListener('message', async (event) => {
      try {
        let allowed = false;
        try {
          if (!this._config) {
            this._config = await import(chrome.runtime.getURL('src/config/config.js'));
          }
          allowed = await this._config.isAllowedPlatformOrigin(event.origin);
        } catch (_) {}
        const TO_EXTENSION = (self.BG && self.BG.WINDOW_MSG && self.BG.WINDOW_MSG.TO_EXTENSION) || 'TO_EXTENSION';
        if (event.data?.type === TO_EXTENSION && allowed) {
          await this.handlePlatformMessage(event);
        }
      } catch (_) {
        // ignore
      }
    });
  }

  async handlePlatformMessage(event) {
    try {
      const timeoutMs = (self.BG && self.BG.SCHEDULER_CONSTANTS && self.BG.SCHEDULER_CONSTANTS.CONFIG && self.BG.SCHEDULER_CONSTANTS.CONFIG.MESSAGE_TIMEOUT_MS)
        || (self.BG && self.BG.SHARED_DEFAULTS && self.BG.SHARED_DEFAULTS.timeouts && self.BG.SHARED_DEFAULTS.timeouts.extMessageMs)
        || 15000;
      // Assurer la disponibilité des helpers côté content
      try { if (!self.BG || !self.BG.chromeHelpers) await import(chrome.runtime.getURL('src/shared/chrome-helpers.js')); } catch (_) {}
      let response;
      if (self.BG && self.BG.chromeHelpers && typeof self.BG.chromeHelpers.sendMessageWithTimeout === 'function') {
        response = await self.BG.chromeHelpers.sendMessageWithTimeout(event.data.message, timeoutMs);
      } else {
        // Fallback local: Promise.race entre sendMessage et timeout
        const responsePromise = new Promise((resolve) => {
          try { chrome.runtime.sendMessage(event.data.message, (resp) => resolve(resp)); } catch (_) { resolve({ success: false, error: 'sendMessage error' }); }
        });
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout background script')), timeoutMs));
        response = await Promise.race([responsePromise, timeoutPromise]);
      }
      
      const FROM_EXTENSION = (self.BG && self.BG.WINDOW_MSG && self.BG.WINDOW_MSG.FROM_EXTENSION) || 'FROM_EXTENSION';
      window.postMessage({
        type: FROM_EXTENSION,
        messageId: event.data.messageId,
        response: response || { success: false, error: 'Empty response' }
      }, event.origin);
      
    } catch (error) {
      const isContextInvalidated = error && String(error).includes('Extension context invalidated');
      const errorMessage = isContextInvalidated
        ? 'Extension rechargée. Rafraîchis la page localhost:5174 pour rétablir le pont.'
        : (error.message || 'Erreur de communication');
      
      const FROM_EXTENSION = (self.BG && self.BG.WINDOW_MSG && self.BG.WINDOW_MSG.FROM_EXTENSION) || 'FROM_EXTENSION';
      window.postMessage({
        type: FROM_EXTENSION,
        messageId: event.data.messageId,
        response: {
          success: false,
          error: errorMessage
        }
      }, event.origin);
    }
  }
}
