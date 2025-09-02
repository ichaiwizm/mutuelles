// Point d'entrée principal refactorisé - gère frame principal ET iframe
(() => {
  'use strict';
  
  // Initialisation selon l'environnement
  async function initialize() {
    try {
      // Import dynamique des modules
      const { detectEnvironment } = await import(chrome.runtime.getURL('src/content/environment-detector.js'));
      
      // Détection de l'environnement
      const env = detectEnvironment();
      
      if (!env.isValid) {
        console.log('❌ Pas sur SwissLife ni localhost:5174, exit');
        return;
      }
      
      if (env.isMainFrame) {
        if (env.isSwissLife) {
          const { SwissLifeInitializer } = await import(chrome.runtime.getURL('src/content/swisslife-initializer.js'));
          const initializer = new SwissLifeInitializer();
          await initializer.initialize();
        } else if (env.isLocalhost) {
          const { LocalhostBridge } = await import(chrome.runtime.getURL('src/content/localhost-bridge.js'));
          const { MessageHandler } = await import(chrome.runtime.getURL('src/content/message-handler.js'));
          const messageHandler = new MessageHandler(null, null);
          const bridge = new LocalhostBridge(messageHandler);
          bridge.initialize();
        }
      } else if (env.isTarificateurIframe) {
        const { IframeInitializer } = await import(chrome.runtime.getURL('src/content/iframe-initializer.js'));
        const initializer = new IframeInitializer();
        await initializer.initialize();
      }
      // Autres frames silencieusement ignorés
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error);
    }
  }
  
  // Lancer l'initialisation
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

})();