/**
 * Initialisateur pour SwissLife
 * Gère l'initialisation complète de l'orchestrateur, UI et gestion des leads
 */

import { NavigationManager } from './navigation-manager.js';
import { AutoExecutionManager } from './auto-execution-manager.js';
import { MessageHandler } from './message-handler.js';

export class SwissLifeInitializer {
  constructor() {
    this.autoExecutionManager = new AutoExecutionManager();
    this.navigationManager = null;
    this.messageHandler = null;
  }

  async initialize() {
    if (window.orchestratorInitialized) {
      console.log('🔄 Orchestrateur déjà initialisé');
      return;
    }
    window.orchestratorInitialized = true;

    console.log('🎼 Initialisation orchestrateur SwissLife (frame principal)...');
    
    try {
      // Charger les dépendances
      const { createUI, createQueueProgressHandler } = await import(chrome.runtime.getURL('src/ui/ui.js'));
      const { loadLeads, processLeadsQueue } = await import(chrome.runtime.getURL('src/core/orchestrator/index.js'));
      
      // Configurer les dépendances
      this.autoExecutionManager.setDependencies(processLeadsQueue, null);
      this.messageHandler = new MessageHandler(this.autoExecutionManager, loadLeads);
      this.navigationManager = new NavigationManager(this.autoExecutionManager);
      
      // Initialiser les composants
      await this.initializeQueueState(loadLeads);
      this.initializeUI(createUI, createQueueProgressHandler);
      this.initializeNavigation();
      this.initializeMessages();
      
      // Fonction globale pour compatibilité
      window.startProcessing = () => this.autoExecutionManager.startProcessing();
      
      // Vérifier auto-exécution au démarrage
      await this.autoExecutionManager.checkAndExecuteOnStartup();
      
      console.log('✅ Orchestrateur SwissLife prêt');
    } catch (error) {
      console.error('❌ Erreur initialisation SwissLife:', error);
    }
  }

  async initializeQueueState(loadLeads) {
    const leads = await loadLeads();
    
    // Nettoyer le flag de traitement au démarrage
    if (leads && leads.length > 0) {
      // Si on a des leads, réinitialiser la queue si elle était incomplète
      const queueResult = await chrome.storage.local.get(['swisslife_queue_state']);
      const queueState = queueResult.swisslife_queue_state;
      
      if (queueState && queueState.status === 'processing') {
        // Ne reset que si aucun lead n'a été traité (éviter la boucle infinie)
        if (!queueState.processedLeads || queueState.processedLeads.length === 0) {
          console.log('🔧 Reset queue state incomplète au démarrage (aucun lead traité)');
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
        } else {
          console.log(`📊 Queue en cours avec ${queueState.processedLeads.length} leads déjà traités - Reprise à l'index:`, queueState.currentIndex);
          // Vérifier si tous les leads ont été traités
          if (queueState.currentIndex >= leads.length) {
            console.log('🎉 Tous les leads ont été traités - Finalisation de la queue');
            await chrome.storage.local.set({
              swisslife_queue_state: {
                ...queueState,
                status: 'completed',
                completedAt: new Date().toISOString()
              }
            });
          }
        }
      }
    }
  }

  initializeUI(createUI, createQueueProgressHandler) {
    createUI();
    
    // Créer le gestionnaire de progression global
    window.orchestratorProgressHandler = createQueueProgressHandler();
    this.autoExecutionManager.setDependencies(
      this.autoExecutionManager.processLeadsQueue, 
      window.orchestratorProgressHandler
    );
    
    // Flag pour éviter la double exécution
    window.orchestratorRunning = false;
  }

  initializeNavigation() {
    this.navigationManager.initialize();
  }

  initializeMessages() {
    this.messageHandler.initializeForSwissLife();
  }
}