/**
 * Initialisateur pour l'iframe tarificateur
 * Gère l'initialisation du listener de commandes dans l'iframe
 */

export class IframeInitializer {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (window.iframeListenerInitialized) {
      console.log('🔄 Listener iframe déjà initialisé');
      return;
    }
    window.iframeListenerInitialized = true;

    console.log('📡 Initialisation listener iframe tarificateur...');
    
    try {
      // Charger les dépendances nécessaires
      const { listenForCommands } = await import(chrome.runtime.getURL('src/core/iframe-bridge.js'));
      const { executeSwissLifeAction } = await import(chrome.runtime.getURL('services/swisslife/orchestrator-bridge.js'));
      
      // Écouter les commandes du frame principal
      listenForCommands(executeSwissLifeAction);
      
      this.initialized = true;
      console.log('✅ Listener iframe prêt');
    } catch (error) {
      console.error('❌ Erreur initialisation iframe:', error);
      this.initialized = false;
    }
  }

  isInitialized() {
    return this.initialized;
  }
}