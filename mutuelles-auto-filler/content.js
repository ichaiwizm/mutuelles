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
      
      // Écouter aussi les changements de hash pour déclencher l'auto-exécution
      window.addEventListener('hashchange', async () => {
        // Si on arrive sur la bonne page et qu'il y a des leads en storage, lancer l'auto-exécution
        if (window.location.hash === '#/tarification-et-simulation/slsis') {
          console.log('🎯 Navigation vers page tarification - Vérification auto-exécution...');
          
          setTimeout(async () => {
            try {
              // Recharger les leads pour vérifier s'il y en a
              const currentLeads = await chrome.storage.local.get(['swisslife_leads']);
              
              if (currentLeads.swisslife_leads && currentLeads.swisslife_leads.length > 0) {
                console.log('🤖 Leads détectés après navigation - Lancement auto-exécution...');
                
                // Attendre que la page soit prête
                if (isPageReadyForAutoExecution()) {
                  // Utiliser la fonction centralisée
                  if (window.startProcessing) {
                    await window.startProcessing();
                  }
                } else {
                  console.log('⏳ Page pas encore prête après navigation...');
                }
              }
            } catch (error) {
              console.error('❌ Erreur auto-exécution après navigation:', error);
            }
          }, 3000); // Attendre 3s pour laisser l'iframe se charger
        }
      });
      
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
    
    // Fonction pour vérifier si la page est prête pour l'exécution automatique
    function isPageReadyForAutoExecution() {
      // Vérifier qu'on est sur la bonne page
      const isCorrectPage = window.location.hash === '#/tarification-et-simulation/slsis';
      
      // Vérifier que l'iframe du tarificateur est présent et chargé
      const iframe = document.querySelector('iframe[name="iFrameTarificateur"]');
      const isIframeReady = iframe && iframe.contentWindow;
      
      console.log('🔍 Vérification page prête:', {
        correctPage: isCorrectPage,
        iframePresent: !!iframe,
        iframeReady: isIframeReady
      });
      
      return isCorrectPage && isIframeReady;
    }

    async function initializeMain() {
      if (isSwissLife) {
        // Mode complet pour SwissLife
        console.log('🎼 Initialisation orchestrateur SwissLife (frame principal)...');
        
        try {
          const { createUI, createQueueProgressHandler } = await import(chrome.runtime.getURL('src/ui/ui.js'));
          const { loadLeads, processLeadsQueue } = await import(chrome.runtime.getURL('src/core/orchestrator.js'));
          
          const leads = await loadLeads();
          
          // Nettoyer le flag de traitement au démarrage
          if (leads && leads.length > 0) {
            // Si on a des leads, réinitialiser la queue si elle était incomplète
            const queueResult = await chrome.storage.local.get(['swisslife_queue_state']);
            const queueState = queueResult.swisslife_queue_state;
            
            if (queueState && queueState.status === 'processing') {
              console.log('🔧 Reset queue state incomplète au démarrage');
              await chrome.storage.local.set({
                swisslife_queue_state: {
                  currentIndex: 0,
                  totalLeads: leads.length,
                  processedLeads: [],
                  status: 'pending',
                  startedAt: new Date().toISOString(),
                  completedAt: null
                }
              });
            }
          }
          
          createUI();
          
          // Créer le gestionnaire de progression global
          window.orchestratorProgressHandler = createQueueProgressHandler();
          
          // Flag pour éviter la double exécution
          window.orchestratorRunning = false;
          
          // Fonction centralisée pour lancer le traitement
          window.startProcessing = async function() {
            if (window.orchestratorRunning) {
              console.log('⏹️ Traitement déjà en cours, ignoré');
              return;
            }
            
            console.log('🚀 Préparation du traitement automatique...');
            window.orchestratorRunning = true;
            
            try {
              // Attendre que l'iframe soit vraiment prête
              console.log('⏳ Attente stabilisation iframe (3s)...');
              await new Promise(resolve => setTimeout(resolve, 3000));
              
              console.log('🎯 Lancement du traitement automatique');
              await processLeadsQueue(window.orchestratorProgressHandler);
            } catch (error) {
              console.error('❌ Erreur traitement:', error);
            } finally {
              // Reset du flag après completion (réactivé au rechargement)
              setTimeout(() => {
                window.orchestratorRunning = false;
              }, 1000);
            }
          };
          
          // Fonction pour attendre que la page soit prête avec timeout
          async function waitForPageReady(maxWaitTime = 10000) {
            const startTime = Date.now();
            
            return new Promise((resolve, reject) => {
              const checkInterval = setInterval(() => {
                if (isPageReadyForAutoExecution()) {
                  clearInterval(checkInterval);
                  console.log('✅ Page prête pour exécution automatique');
                  resolve(true);
                } else if (Date.now() - startTime > maxWaitTime) {
                  clearInterval(checkInterval);
                  reject(new Error('Timeout: Page non prête après 10s'));
                }
              }, 500);
            });
          }
          
          // Écouter les messages du background script pour les mises à jour de leads
          chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
            if (message.action === 'LEADS_UPDATED' && message.source === 'background') {
              // Recharger les leads
              loadLeads().then(updatedLeads => {
                // L'UI sera automatiquement mise à jour via les watchers existants
              }).catch(error => {
                // Ignore silently
              });
              
              // Si autoExecute est demandé, lancer l'exécution automatique
              if (message.data.autoExecute) {
                console.log('🤖 Auto-exécution demandée - Vérification de la page...');
                
                try {
                  // Attendre que la page soit prête
                  await waitForPageReady();
                  
                  // Petite pause supplémentaire pour laisser l'iframe se stabiliser
                  setTimeout(async () => {
                    try {
                      console.log('🚀 Lancement auto-exécution du lead...');
                      
                      // Utiliser la fonction centralisée
                      if (window.startProcessing) {
                        await window.startProcessing();
                      }
                      
                    } catch (error) {
                      console.error('❌ Erreur lors de l\'auto-exécution:', error);
                    }
                  }, 2000); // Attendre 2s supplémentaires pour la stabilité
                  
                } catch (error) {
                  console.error('❌ Page non prête pour auto-exécution:', error.message);
                }
              }
              
              sendResponse({ received: true });
            }
          });
          
          // Vérifier si on doit lancer l'auto-exécution au démarrage
          // (cas où l'onglet SwissLife est créé après l'envoi des leads)
          if (leads && leads.length > 0) {
            console.log('🔍 Leads présents au démarrage - Vérification auto-exécution...');
            
            // Attendre un peu que la page soit complètement chargée
            setTimeout(async () => {
              try {
                // Vérifier si on est déjà sur la bonne page
                if (isPageReadyForAutoExecution()) {
                  console.log('🤖 Auto-exécution démarrage direct...');
                  
                  // Utiliser la fonction centralisée
                  if (window.startProcessing) {
                    await window.startProcessing();
                  }
                } else {
                  console.log('⏳ Page pas encore prête - attente redirection...');
                  // Si on n'est pas sur la bonne page, l'auto-redirection va nous y emmener
                  // et on lancera l'exécution lors de la navigation
                }
              } catch (error) {
                console.error('❌ Erreur auto-exécution démarrage:', error);
              }
            }, 5000); // Attendre 5s pour laisser le temps aux redirections
          }
          
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