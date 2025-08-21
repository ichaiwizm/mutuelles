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
        // Mode synchronisation pour localhost
        console.log('📡 Initialisation synchronisation localhost:5174...');
        
        // Signaler que l'extension est prête pour la communication
        window.postMessage({
          type: 'EXTENSION_READY',
          source: 'mutuelles-extension'
        }, '*');
        
        // Écouter les messages de la page
        window.addEventListener('message', async (event) => {
          if (event.source !== window) return;
          
          if (event.data.type === 'EXTENSION_STORAGE_SET' && event.data.source === 'mutuelles-platform') {
            try {
              await chrome.storage.local.set(event.data.data);
              console.log('✅ Chrome storage mis à jour');
            } catch (error) {
              console.error('❌ Erreur sauvegarde chrome.storage:', error);
            }
          }
          
          // Répondre aux demandes de statuts de traitement
          if (event.data.type === 'GET_PROCESSING_STATUS' && event.data.source === 'mutuelles-platform') {
            try {
              const result = await chrome.storage.local.get(['swisslife_processing_status']);
              window.postMessage({
                type: 'PROCESSING_STATUS_RESPONSE',
                data: result.swisslife_processing_status || {},
                source: 'mutuelles-extension'
              }, '*');
            } catch (error) {
              console.error('❌ Erreur récupération statuts:', error);
            }
          }
        });
        
        // Écouter les changements de statut de traitement pour notifier la page
        chrome.storage.onChanged.addListener((changes, area) => {
          if (area === 'local' && changes.swisslife_processing_status) {
            // Notifier la page du changement de statut
            window.postMessage({
              type: 'PROCESSING_STATUS_UPDATED',
              data: changes.swisslife_processing_status.newValue,
              source: 'mutuelles-extension'
            }, '*');
          }
        });
        
        console.log('✅ Extension active sur localhost - synchronisation chrome.storage disponible');
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