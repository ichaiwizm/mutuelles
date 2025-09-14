/**
 * Initialisateur pour SwissLife
 * Gère l'initialisation complète de l'orchestrateur, UI et gestion des leads
 */

import { NavigationManager } from './navigation-manager.js';
import { AutoExecutionManager } from './auto-execution-manager.js';
import { MessageHandler } from './message-handler.js';
import { KEYS } from '../core/orchestrator/storage-keys.js';

export class SwissLifeInitializer {
  constructor() {
    this.autoExecutionManager = new AutoExecutionManager();
    this.navigationManager = null;
    this.messageHandler = null;
    this._isPlatformContext = false;
  }

  async initialize() {
    // Activer uniquement quand l'onglet est ouvert via la plateforme (groupId non "default").
    // Fallback: interroger le background si le hash manque (post-redirect) et réinjecter groupId dans le hash.
    try {
      let groupId = KEYS.groupId();
      if (!groupId || groupId === 'default') {
        try {
          const resp = await chrome.runtime.sendMessage({ action: 'GET_CONTEXT' });
          if (resp?.success && resp.data?.groupId && resp.data.groupId !== 'default') {
            const provider = resp.data.provider || 'swisslife';
            // Réinjecter provider/groupId dans le hash courant (conserve la route après '#')
            const hash = window.location.hash || '#/';
            const [route, query = ''] = hash.split('?');
            const params = new URLSearchParams(query);
            params.set('groupId', resp.data.groupId);
            params.set('provider', provider);
            const nextHash = `${route}?${params.toString()}`;
            if (nextHash !== hash) {
              window.location.hash = nextHash; // met à jour le hash pour les clés de storage
            }
          }
        } catch (_) { /* ignore */ }
      }
      groupId = KEYS.groupId();
      this._isPlatformContext = !!groupId && groupId !== 'default';
    } catch (_) {
      this._isPlatformContext = false;
    }

    if (!this._isPlatformContext) {
      // Pas d'UI/auto-exécution sans groupId plateforme
      console.log('🛑 SwissLife: contexte plateforme absent → UI/auto‑exécution désactivées');
      return;
    }

    if (window.orchestratorInitialized) {
      return;
    }
    window.orchestratorInitialized = true;

    try {
      // Charger les dépendances
      const { createUI, createQueueProgressHandler } = await import(chrome.runtime.getURL('src/ui/ui.js'));
      const { loadLeads, processLeadsQueue } = await import(chrome.runtime.getURL('src/core/orchestrator/index.js'));
      
      // Configurer les dépendances
      this.autoExecutionManager.setDependencies(processLeadsQueue, null);
      this.messageHandler = new MessageHandler(this.autoExecutionManager, loadLeads);
      this.navigationManager = new NavigationManager(this.autoExecutionManager);
      
      // Initialiser les composants (contexte plateforme uniquement)
      await this.initializeQueueState(loadLeads);
      this.initializeUI(createUI, createQueueProgressHandler);
      this.initializeNavigation();
      this.initializeMessages();
      
      // Fonction globale pour compatibilité
      window.startProcessing = () => this.autoExecutionManager.startProcessing();
      
      // Vérifier auto-exécution au démarrage (plateforme)
      await this.autoExecutionManager.checkAndExecuteOnStartup();
    } catch (error) {
      console.error('❌ Erreur initialisation SwissLife:', error);
    }
  }

  async initializeQueueState(loadLeads) {
    if (!this._isPlatformContext) return;
    const leads = await loadLeads();
    
    // Nettoyer le flag de traitement au démarrage
    if (leads && leads.length > 0) {
      // Si on a des leads, réinitialiser la queue si elle était incomplète
      const queueKey = KEYS.QUEUE_STATE();
      const queueResult = await chrome.storage.local.get([queueKey]);
      const queueState = queueResult[queueKey];
      
      if (queueState && queueState.status === 'processing') {
        // Ne reset que si aucun lead n'a été traité (éviter la boucle infinie)
        if (!queueState.processedLeads || queueState.processedLeads.length === 0) {
          console.log('🔧 Reset queue state incomplète au démarrage (aucun lead traité)');
          await chrome.storage.local.set({
            [queueKey]: {
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
              [queueKey]: {
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
    if (!this._isPlatformContext) return;
    // Ne créer l'UI que si des leads/une queue existent
    (async () => {
      try {
        const leadsKey = KEYS.LEADS();
        const queueKey = KEYS.QUEUE_STATE();
        const result = await chrome.storage.local.get([leadsKey, queueKey]);
        const leads = result[leadsKey] || [];
        const queueState = result[queueKey] || null;
        const hasQueue = !!queueState && (queueState.status === 'processing' || queueState.status === 'pending' || (queueState.processedLeads||[]).length > 0);

        if (leads.length > 0 || hasQueue) {
          createUI();
          // Créer le gestionnaire de progression global
          window.orchestratorProgressHandler = createQueueProgressHandler();
          this.autoExecutionManager.setDependencies(
            this.autoExecutionManager.processLeadsQueue,
            window.orchestratorProgressHandler
          );
        } else {
          // Pas de leads → ne rien afficher par défaut
          window.orchestratorProgressHandler = null;
        }
      } catch (_) {
        // En cas d'erreur, ne pas bloquer l'initialisation
      } finally {
        // Flag pour éviter la double exécution
        window.orchestratorRunning = false;
      }
    })();
  }

  initializeNavigation() {
    if (!this._isPlatformContext) return;
    this.navigationManager.initialize();
  }

  initializeMessages() {
    if (!this._isPlatformContext) return;
    this.messageHandler.initializeForSwissLife();
  }
}

