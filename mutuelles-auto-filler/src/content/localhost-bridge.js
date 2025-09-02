/**
 * Pont de communication avec la plateforme localhost:5174
 * Gère l'injection de l'ID d'extension et la communication bidirectionnelle
 */

export class LocalhostBridge {
  constructor(messageHandler) {
    this.messageHandler = messageHandler;
  }

  initialize() {
    console.log('✅ Extension active sur localhost:5174 - Initialisation pont de communication...');
    
    this.injectExtensionId();
    this.setupMessageListener();
    
    // Initialiser le gestionnaire de messages pour localhost
    this.messageHandler.initializeForLocalhost();
    
    console.log('✅ Pont de communication localhost:5174 prêt');
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
      if (event.data?.type === 'TO_EXTENSION' && event.origin === 'http://localhost:5174') {
        await this.handlePlatformMessage(event);
      }
    });
  }

  async handlePlatformMessage(event) {
    try {
      const responsePromise = chrome.runtime.sendMessage(event.data.message);
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout background script')), 4000);
      });
      
      const response = await Promise.race([responsePromise, timeoutPromise]);
      
      window.postMessage({
        type: 'FROM_EXTENSION',
        messageId: event.data.messageId,
        response: response || { success: false, error: 'Empty response' }
      }, event.origin);
      
    } catch (error) {
      const isContextInvalidated = error && String(error).includes('Extension context invalidated');
      const errorMessage = isContextInvalidated
        ? 'Extension rechargée. Rafraîchis la page localhost:5174 pour rétablir le pont.'
        : (error.message || 'Erreur de communication');
      
      window.postMessage({
        type: 'FROM_EXTENSION',
        messageId: event.data.messageId,
        response: {
          success: false,
          error: errorMessage
        }
      }, event.origin);
    }
  }
}