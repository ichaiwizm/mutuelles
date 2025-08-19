// Point d'entrée principal - gère frame principal ET iframe
(() => {
  'use strict';
  
  // Vérifications de base
  const isSwissLife = window.location.hostname.includes('swisslifeone.fr');
  if (!isSwissLife) {
    console.log('❌ Pas sur SwissLife, exit');
    return;
  }
  
  const isMainFrame = (window === window.top);
  // Détection précise de l'iframe tarificateur uniquement (pas les PDF viewers)
  const isTarificateurIframe = !isMainFrame && (
    window.location.href.includes('oav-pool') && 
    window.location.pathname.includes('SLSISWeb') &&
    !window.location.pathname.includes('PDFViewer') &&
    window.name === 'iFrameTarificateur'
  );
  
  // Frame principal : UI et orchestrateur
  if (isMainFrame) {
    if (window.orchestratorInitialized) {
      console.log('🔄 Orchestrateur déjà initialisé');
      return;
    }
    window.orchestratorInitialized = true;
    
    async function initializeMain() {
      console.log('🎼 Initialisation orchestrateur (frame principal)...');
      
      try {
        const { createUI } = await import(chrome.runtime.getURL('src/ui/ui.js'));
        const { loadTestData, runTest } = await import(chrome.runtime.getURL('src/core/orchestrator.js'));
        
        const loaded = await loadTestData();
        if (!loaded) {
          console.error('❌ Impossible de charger les données de test');
          return;
        }
        
        createUI(async () => {
          await runTest();
        });
        
        console.log('✅ Orchestrateur prêt');
      } catch (error) {
        console.error('❌ Erreur initialisation:', error);
      }
    }
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeMain);
    } else {
      initializeMain();
    }
  }
  
  // Iframe tarificateur : écoute les commandes
  else if (isTarificateurIframe) {
    if (window.iframeListenerInitialized) {
      return;
    }
    window.iframeListenerInitialized = true;
    
    async function initializeIframe() {
      console.log('📡 Initialisation listener iframe tarificateur...');
      
      try {
        const { listenForCommands } = await import(chrome.runtime.getURL('src/core/iframe-bridge.js'));
        const { executeSwissLifeAction } = await import(chrome.runtime.getURL('services/swisslife/orchestrator-bridge.js'));
        
        // Écouter les commandes du frame principal
        listenForCommands(executeSwissLifeAction);
        
        console.log('✅ Listener iframe prêt');
      } catch (error) {
        console.error('❌ Erreur initialisation iframe:', error);
      }
    }
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeIframe);
    } else {
      initializeIframe();
    }
  }
  
  // Autres frames silencieusement ignorés

})();