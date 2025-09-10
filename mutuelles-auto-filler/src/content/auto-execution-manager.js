/**
 * Gestionnaire d'auto-exécution des leads
 * Vérifie l'état de la page et lance le traitement automatique
 */

import { KEYS } from '../core/orchestrator/storage-keys.js';

export class AutoExecutionManager {
  constructor() {
    this.orchestratorRunning = false;
    this.processLeadsQueue = null;
    this.progressHandler = null;
  }

  setDependencies(processLeadsQueue, progressHandler) {
    this.processLeadsQueue = processLeadsQueue;
    this.progressHandler = progressHandler;
  }

  isPageReadyForAutoExecution() {
    // Vérifier qu'on est sur la bonne page (ignorer les paramètres après ?)
    const hashWithoutParams = window.location.hash.split('?')[0];
    const isCorrectPage = hashWithoutParams === '#/tarification-et-simulation/slsis';
    
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

  async startProcessing() {
    if (this.orchestratorRunning) {
      console.log('⏹️ Traitement déjà en cours, ignoré');
      return;
    }
    
    console.log('🚀 Préparation du traitement automatique...');
    this.orchestratorRunning = true;
    
    try {
      // Attendre que l'iframe soit vraiment prête
      console.log('⏳ Attente stabilisation iframe (3s)...');
      try { if (!self.BG || !self.BG.wait) await import(chrome.runtime.getURL('src/shared/async.js')); } catch (_) {}
      await (self.BG && self.BG.wait ? self.BG.wait(3000) : new Promise(r => setTimeout(r, 3000)));
      
      console.log('🎯 Lancement du traitement automatique');
      await this.processLeadsQueue(this.progressHandler);
    } catch (error) {
      console.error('❌ Erreur traitement:', error);
    } finally {
      // Reset du flag après completion (réactivé au rechargement)
      setTimeout(() => {
        this.orchestratorRunning = false;
      }, 1000);
    }
  }

  async waitForPageReady(maxWaitTime = 10000) {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (this.isPageReadyForAutoExecution()) {
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

  async checkAndExecuteOnStartup() {
    // Vérifier si on doit lancer l'auto-exécution au démarrage
    // (cas où l'onglet SwissLife est créé après l'envoi des leads)
    try {
      const leadsKey = KEYS.LEADS();
      const currentLeads = await chrome.storage.local.get([leadsKey]);
      const leads = currentLeads[leadsKey] || [];
      
      if (leads.length > 0) {
        console.log('🔍 Leads présents au démarrage - Vérification auto-exécution...');
        
        // Attendre un peu que la page soit complètement chargée
        (async () => {
          try { if (!self.BG || !self.BG.wait) await import(chrome.runtime.getURL('src/shared/async.js')); } catch (_) {}
          await (self.BG && self.BG.wait ? self.BG.wait(5000) : new Promise(r => setTimeout(r, 5000)));
          try {
            // Vérifier si on est déjà sur la bonne page
            if (this.isPageReadyForAutoExecution()) {
              console.log('🤖 Auto-exécution démarrage direct...');
              await this.startProcessing();
            } else {
              console.log('⏳ Page pas encore prête - attente redirection...');
              // Si on n'est pas sur la bonne page, l'auto-redirection va nous y emmener
              // et on lancera l'exécution lors de la navigation
            }
          } catch (error) {
            console.error('❌ Erreur auto-exécution démarrage:', error);
          }
        })();
      }
    } catch (error) {
      console.error('❌ Erreur vérification leads au démarrage:', error);
    }
  }

  async handleAutoExecution(autoExecuteRequested) {
    if (!autoExecuteRequested) return;
    
    console.log('🤖 Auto-exécution demandée - Vérification de la page...');
    
    try {
      // Attendre que la page soit prête
      await this.waitForPageReady();
      
      // Petite pause supplémentaire pour laisser l'iframe se stabiliser
      try { if (!self.BG || !self.BG.wait) await import(chrome.runtime.getURL('src/shared/async.js')); } catch (_) {}
      await (self.BG && self.BG.wait ? self.BG.wait(2000) : new Promise(r => setTimeout(r, 2000)));
      try {
        console.log('🚀 Lancement auto-exécution du lead...');
        await this.startProcessing();
      } catch (error) {
        console.error('❌ Erreur lors de l\'auto-exécution:', error);
      }
      
    } catch (error) {
      console.error('❌ Page non prête pour auto-exécution:', error.message);
    }
  }
}
