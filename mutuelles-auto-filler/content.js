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
    
    // Auto-redirection depuis /accueil vers /tarification-et-simulation/slsis
    function handleAccueilRedirect() {
      if (window.location.hash === '#/accueil') {
        console.log('🔄 Détection page d\'accueil SwissLife - Redirection automatique dans 3s...');
        
        // Éviter les redirections multiples
        if (window.redirectTimeout) {
          clearTimeout(window.redirectTimeout);
        }
        
        window.redirectTimeout = setTimeout(() => {
          const currentUrl = window.location.href;
          const newHash = '#/tarification-et-simulation/slsis';
          const targetUrl = currentUrl.replace(window.location.hash, newHash);
          
          console.log('🎯 Redirection vers:', targetUrl);
          window.location.href = targetUrl;
          window.redirectTimeout = null;
        }, 3000);
      }
    }
    
    if (isSwissLife) {
      // Vérifier au chargement initial
      handleAccueilRedirect();
      
      // Écouter les changements de hash (navigation SPA)
      window.addEventListener('hashchange', handleAccueilRedirect);
      
      // Observer les changements DOM au cas où la redirection se fait par JS
      let lastHash = window.location.hash;
      const hashObserver = setInterval(() => {
        if (window.location.hash !== lastHash) {
          lastHash = window.location.hash;
          handleAccueilRedirect();
        }
      }, 1000);
      
      // Nettoyer l'observer après 30 secondes (éviter les fuites mémoire)
      setTimeout(() => {
        clearInterval(hashObserver);
      }, 30000);
    }
    
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
          
          // Écouter les messages du background script pour les mises à jour de leads
          chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'LEADS_UPDATED' && message.source === 'background') {
              // Recharger les leads et mettre à jour l'UI si nécessaire
              loadLeads().then(updatedLeads => {
                // L'UI sera automatiquement mise à jour via les watchers existants
              }).catch(error => {
                // Ignore silently
              });
              
              sendResponse({ received: true });
            }
          });
          
          console.log('✅ Orchestrateur SwissLife prêt');
        } catch (error) {
          console.error('❌ Erreur initialisation SwissLife:', error);
        }
      } else if (isLocalhost) {
        // Mode localhost - pont de communication avec la plateforme
        console.log('✅ Extension active sur localhost:5174 - Initialisation pont de communication...');
        
        // Injecter l'ID de l'extension pour la communication
        const extensionIdElement = document.createElement('div');
        extensionIdElement.setAttribute('data-extension-id', chrome.runtime.id);
        extensionIdElement.style.display = 'none';
        document.documentElement.appendChild(extensionIdElement);
        
        // Écouter les messages de la plateforme via window.postMessage
        window.addEventListener('message', async (event) => {
          if (event.data?.type === 'TO_EXTENSION' && event.origin === 'http://localhost:5174') {
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
        });
        
        console.log('✅ Pont de communication localhost:5174 prêt');
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