/**
 * Orchestrateur principal du scheduler
 * Responsabilité: Coordonner tous les managers et fournir l'API publique
 */

self.BG = self.BG || {};

self.BG.SchedulerOrchestrator = class SchedulerOrchestrator {
  constructor() {
    this.poolManager = new self.BG.TabPoolManager();
    this.runStateManager = new self.BG.RunStateManager();
    this.isolatedManager = new self.BG.IsolatedGroupManager();
    this.config = self.BG.SCHEDULER_CONSTANTS.CONFIG;
    this.runStatus = self.BG.SCHEDULER_CONSTANTS.RUN_STATUS;
  }

  /**
   * Démarre un nouveau run
   */
  async startRun({ providers, leads, parallelTabs, options = {} }) {
    // Verrou: empêcher les runs concurrents (hors isolés) avec auto-récupération d'état périmé
    if (!options?.isolated) {
      const current = await this.runStateManager.getRunState();
      if (current && current.status === this.runStatus.RUNNING) {
        // Valider l'existence du pool/fenêtre
        const pool = await this.poolManager.validatePool(await this.poolManager.getPool());
        if (pool && pool.windowId) {
          // Il y a bien une fenêtre active pour ce run
          throw new Error('Run déjà en cours');
        } else {
          // État périmé (plus de fenêtre) → annuler l'état et continuer
          self.BG.logger.warn('[SchedulerOrchestrator] État RUNNING périmé détecté sans fenêtre; nettoyage...');
          try { await this.runStateManager.cancelRun(); } catch (_) {}
        }
      }
    }
    // Validation des paramètres
    if (!Array.isArray(providers) || providers.length === 0) {
      throw new Error('providers requis');
    }
    if (!Array.isArray(leads) || leads.length === 0) {
      throw new Error('leads requis');
    }

    // Filtrer les providers valides
    const validProviders = this._filterValidProviders(providers);
    if (validProviders.length === 0) {
      throw new Error('Aucun provider valide');
    }

    const capacity = Math.max(
      this.config.MIN_PARALLEL_TABS,
      Math.min(this.config.MAX_PARALLEL_TABS, parallelTabs || this.config.DEFAULT_PARALLEL_TABS)
    );

    // Gérer les runs isolés (retry single lead)
    if (options.isolated === true && leads.length === 1) {
      return await this.isolatedManager.createIsolatedRun(
        validProviders[0], 
        leads[0], 
        options
      );
    }

    // Créer l'état du run
    const runState = this.runStateManager.createRunState(validProviders, leads, {
      ...options,
      parallelTabs: capacity
    });

    // Assurer la capacité du pool en respectant l'option de minimisation si fournie
    const pool = await this.poolManager.ensureCapacity(capacity, { minimizeWindow: options.minimizeWindow });

    // Démarrer le run
    await this.runStateManager.startRun(runState);

    // Lancer le premier provider
    await this._startFirstProvider(runState, pool);

    return {
      started: true,
      providers: validProviders,
      capacity,
      runId: runState.id
    };
  }

  /**
   * Traite la completion d'un groupe
   */
  async onQueueDone({ provider, groupId }, senderTab) {
    // Vérifier si c'est un groupe isolé
    const isolatedGroup = await this.isolatedManager.getIsolatedGroup(groupId);
    if (isolatedGroup) {
      return await this.isolatedManager.completeIsolatedGroup(groupId);
    }

    // Gérer les runs normaux
    return await this._handleNormalQueueDone(provider, groupId, senderTab);
  }

  /**
   * Annule le run actuel
   */
  async cancelRun() {
    try {
      // Fermer le pool principal
      await this.poolManager.closePool();
      
      // Annuler l'état du run
      await this.runStateManager.cancelRun();
      
      // Annuler tous les groupes isolés
      await this.isolatedManager.cancelAllIsolatedGroups();

      return { cancelled: true };
    } catch (error) {
      self.BG.logger.error('[SchedulerOrchestrator] Erreur lors de l\'annulation:', error);
      return { cancelled: false, error: error.message };
    }
  }

  /**
   * Annule seulement les groupes isolés
   */
  async cancelIsolated() {
    try {
      const result = await this.isolatedManager.cancelAllIsolatedGroups();
      return { cancelled: true, count: result.cancelled };
    } catch (error) {
      self.BG.logger.error('[SchedulerOrchestrator] Erreur lors de l\'annulation isolée:', error);
      return { cancelled: false, error: error.message };
    }
  }

  /**
   * Annule un groupe isolé spécifique (si groupId fourni) ou tous
   */
  async cancelIsolatedAny({ groupId } = {}) {
    try {
      if (groupId) {
        const res = await this.isolatedManager.completeIsolatedGroup(groupId);
        const ok = !!res?.ok;
        return { cancelled: ok, count: ok ? 1 : 0 };
      }
      const resultAll = await this.isolatedManager.cancelAllIsolatedGroups();
      return { cancelled: resultAll.cancelled > 0, count: resultAll.cancelled };
    } catch (error) {
      console.error('[SchedulerOrchestrator] Erreur annulation isolée (ciblée/total):', error);
      return { cancelled: false, error: error.message };
    }
  }

  /**
   * Obtient l'état du run pour l'UI
   */
  async getRunStateSummary() {
    const runState = await this.runStateManager.getRunSummary();
    const pool = await this.poolManager.getPool();
    
    return {
      ...runState,
      windowId: pool?.windowId || null
    };
  }

  /**
   * Obtient l'état des groupes isolés
   */
  async getIsolatedState() {
    return await this.isolatedManager.getIsolatedState();
  }

  /**
   * Démarre le premier provider (méthode privée)
   */
  async _startFirstProvider(runState, pool) {
    const activeProvider = runState.providers[0];
    const pendingGroups = await this.runStateManager.getPendingGroups(activeProvider);
    
    // Limiter au nombre d'onglets disponibles
    const groupsToStart = pendingGroups.slice(0, pool.capacity);
    
    // Créer et assigner les onglets en parallèle
    const assignments = groupsToStart.map(async (group, index) => {
      const url = await self.BG.getProvider(activeProvider).buildUrlWithGroupId(group.groupId);
      
      // Créer ou réutiliser un onglet
      let tabId;
      if (index === 0 && pool.tabs.length > 0) {
        // Réutiliser le premier onglet
        tabId = pool.tabs[0].tabId;
        const upd = await self.BG.chromeHelpers.safeTabsUpdate(tabId, { url, active: false });
        if (!upd) {
          const tab = await self.BG.chromeHelpers.safeTabsCreate({ windowId: pool.windowId, url, active: false });
          tabId = tab && tab.id;
        }
      } else {
        // Créer nouvel onglet
        const tab = await self.BG.chromeHelpers.safeTabsCreate({ windowId: pool.windowId, url, active: false });
        tabId = tab && tab.id;
      }

      // Assigner l'onglet
      await this.poolManager.assignTab(tabId, activeProvider, group.groupId);

      // Stocker les données du groupe
      await this._storeGroupData(activeProvider, group, index, pendingGroups.length);

      // Notifier l'onglet
      await this._notifyTabLeadsUpdated(tabId, activeProvider, group, index, pendingGroups.length);
    });

    await Promise.all(assignments);
  }

  /**
   * Gère la completion d'un groupe normal (non isolé)
   */
  async _handleNormalQueueDone(provider, groupId, senderTab) {
    // Marquer le groupe comme terminé
    const runState = await this.runStateManager.completeGroup(provider, groupId);
    if (!runState) {
      return { ok: true }; // Pas de run actif
    }

    // Libérer l'onglet
    if (senderTab?.id) {
      await this.poolManager.releaseTab(senderTab.id);
    }

    // Vérifier s'il y a du travail pour le provider actif
    const activeProvider = await this.runStateManager.getActiveProvider();
    const pendingGroups = await this.runStateManager.getPendingGroups(activeProvider);

    if (provider === activeProvider && pendingGroups.length > 0) {
      // Assigner le prochain groupe à cet onglet
      const nextGroup = pendingGroups[0];
      await this._assignGroupToTab(senderTab.id, activeProvider, nextGroup);
      return { reassigned: true };
    }

    // Vérifier si le provider actuel est terminé
    const pool = await this.poolManager.getPool();
    const hasActiveAssignments = pool?.tabs?.some(tab => 
      tab.assigned && tab.assigned.provider === activeProvider
    );

    if (pendingGroups.length === 0 && !hasActiveAssignments) {
      // Provider actuel terminé, passer au suivant
      const newRunState = await this.runStateManager.switchToNextProvider();
      
      if (!newRunState) {
        // Tous les providers terminés
        await this._completeRun();
        return { finished: true };
      } else {
        // Basculer vers le nouveau provider
        const newActiveProvider = await this.runStateManager.getActiveProvider();
        const newPendingGroups = await this.runStateManager.getPendingGroups(newActiveProvider);
        
        if (newPendingGroups.length > 0 && senderTab?.id) {
          await this._switchProviderOnTab(senderTab.id, newActiveProvider, newPendingGroups[0]);
          return { switched: true };
        }
      }
    }

    return { ok: true };
  }

  /**
   * Assigne un groupe à un onglet existant
   */
  async _assignGroupToTab(tabId, provider, group) {
    const url = await self.BG.getProvider(provider).buildUrlWithGroupId(group.groupId);
    
      const upd = await self.BG.chromeHelpers.safeTabsUpdate(tabId, { url, active: false });
      if (!upd) {
        const pool = await this.poolManager.getPool();
        const tab = await self.BG.chromeHelpers.safeTabsCreate({ windowId: pool.windowId, url, active: false });
        tabId = tab && tab.id;
      }

    await this.poolManager.assignTab(tabId, provider, group.groupId);
    
    const allGroups = (await this.runStateManager.getRunState()).groups[provider];
    const groupIndex = allGroups.findIndex(g => g.groupId === group.groupId);
    
    await this._storeGroupData(provider, group, groupIndex, allGroups.length);
    await this._notifyTabLeadsUpdated(tabId, provider, group, groupIndex, allGroups.length);
  }

  /**
   * Bascule un onglet vers un nouveau provider
   */
  async _switchProviderOnTab(tabId, newProvider, group) {
    const pool = await this.poolManager.getPool();
    const url = await self.BG.getProvider(newProvider).buildUrlWithGroupId(group.groupId);
    
    // Créer nouvel onglet pour éviter de fermer le dernier
    const newTab = await self.BG.chromeHelpers.safeTabsCreate({ windowId: pool.windowId, url, active: false });
    
    // Fermer l'ancien onglet
    await self.BG.chromeHelpers.safeTabsRemove(tabId);

    await this.poolManager.assignTab(newTab.id, newProvider, group.groupId);
    
    const allGroups = (await this.runStateManager.getRunState()).groups[newProvider];
    const groupIndex = allGroups.findIndex(g => g.groupId === group.groupId);
    
    await this._storeGroupData(newProvider, group, groupIndex, allGroups.length);
    await this._notifyTabLeadsUpdated(newTab.id, newProvider, group, groupIndex, allGroups.length);
  }

  /**
   * Termine complètement un run
   */
  async _completeRun() {
    const runState = await this.runStateManager.getRunState();
    
    await this.runStateManager.completeRun();
    
    // Fermer la fenêtre si demandé
    if (runState?.options?.closeOnFinish) {
      await this.poolManager.closePool();
    }
  }

  /**
   * Filtre les providers valides
   */
  _filterValidProviders(providers) {
    return providers.filter(provider => !!self.BG.getProvider(provider));
  }

  /**
   * Stocke les données d'un groupe
   */
  async _storeGroupData(provider, group, groupIndex, totalGroups) {
    const leadsKey = `${provider}_leads__${group.groupId}`;
    const queueKey = `${provider}_queue_state__${group.groupId}`;
    
    const storageData = {};
    storageData[leadsKey] = group.leads;
    storageData[queueKey] = {
      currentIndex: 0,
      totalLeads: group.leads.length,
      processedLeads: [],
      status: 'pending',
      startedAt: new Date().toISOString(),
      completedAt: null,
      groupId: group.groupId,
      batchId: group.batchId,
      groupIndex,
      totalGroups,
      provider
    };
    
    await chrome.storage.local.set(storageData);
  }

  /**
   * Notifie un onglet de ses leads
   */
  async _notifyTabLeadsUpdated(tabId, provider, group, groupIndex, totalGroups) {
    const message = {
      action: 'LEADS_UPDATED',
      data: {
        provider,
        groupId: group.groupId,
        count: group.leads.length,
        groupIndex,
        totalGroups,
        timestamp: new Date().toISOString(),
        autoExecute: true
      },
      source: 'background'
    };

    // Retry avec backoff
    for (let attempt = 1; attempt <= this.config.RETRY_ATTEMPTS; attempt++) {
      try {
        await chrome.tabs.sendMessage(tabId, message);
        return true;
      } catch (error) {
        if (attempt === this.config.RETRY_ATTEMPTS) {
          console.warn(`[SchedulerOrchestrator] Impossible de notifier l'onglet ${tabId}:`, error);
          return false;
        }
        await self.BG.wait(this.config.RETRY_DELAY * attempt);
      }
    }
    return false;
  }
};
