// Point d'entrée principal - gère frame principal ET iframe
(() => {
  'use strict';
  
  // Vérifications de base - autoriser SwissLife et localhost:5174
  const isSwissLife = window.location.hostname.includes('swisslifeone.fr');
  const isLocalhost = window.location.hostname === 'localhost' && window.location.port === '5174';
  
  if (!isSwissLife && !isLocalhost) {
    console.log('❌ Pas sur SwissLife ni localhost:5174, exit');
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
  
  // Frame principal : UI et orchestrateur sur SwissLife, synchronisation sur localhost
  if (isMainFrame) {
    if (window.orchestratorInitialized) {
      console.log('🔄 Orchestrateur déjà initialisé');
      return;
    }
    window.orchestratorInitialized = true;
    
    async function initializeMain() {
      if (isSwissLife) {
        // Mode complet pour SwissLife
        console.log('🎼 Initialisation orchestrateur SwissLife (frame principal)...');
        
        try {
          const { createUI } = await import(chrome.runtime.getURL('src/ui/ui.js'));
          const { loadLeads, runTestWithLead } = await import(chrome.runtime.getURL('src/core/orchestrator.js'));
          
          const leads = await loadLeads();
          
          createUI(leads, async (leadIndex, handleProgress) => {
            await runTestWithLead(leadIndex, handleProgress);
          });
          
          console.log('✅ Orchestrateur SwissLife prêt');
        } catch (error) {
          console.error('❌ Erreur initialisation SwissLife:', error);
        }
      } else if (isLocalhost) {
        // Mode localhost - extension présente mais pas d'interaction automatique
        console.log('✅ Extension active sur localhost:5174');
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