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

    // Dimensionner la capacité initiale au besoin réel multi-provider
    let totalNeeded = 0;
    for (const p of runState.providers) {
      const groups = (runState.groups && runState.groups[p]) ? runState.groups[p] : [];
      totalNeeded += Math.min(capacity, groups.length);
    }
    totalNeeded = Math.max(1, totalNeeded);

    // Assurer la capacité du pool (fenêtre + onglets) selon le besoin multi-provider
    const pool = await this.poolManager.ensureCapacity(totalNeeded, { minimizeWindow: options.minimizeWindow });

    // Démarrer le run
    await this.runStateManager.startRun(runState);

    // Démarrer tous les providers en parallèle (selon plafond par provider)
    await this._startAllProviders(runState, pool);

    // Si fenêtre visible demandée, lancer le pianotage d'onglets
    try {
      if (options.minimizeWindow === false && pool?.windowId) {
        const intervalMs = self.BG.SCHEDULER_CONSTANTS.CONFIG.TAB_CYCLE_INTERVAL_MS || 1000;
        self.BG.FocusCycler?.start(pool.windowId, intervalMs);
      }
    } catch (_) { /* ignore */ }

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
      // Stopper pianotage si actif
      try {
        const pool = await this.poolManager.getPool();
        if (pool?.windowId) self.BG.FocusCycler?.stop(pool.windowId);
      } catch (_) { /* ignore */ }
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
  async _startAllProviders(runState, pool) {
    const perProviderCap = runState.options?.parallelTabs || this.config.DEFAULT_PARALLEL_TABS;
    for (const provider of runState.providers) {
      const pendingGroups = await this.runStateManager.getPendingGroups(provider);
      const toStart = pendingGroups.slice(0, Math.min(perProviderCap, pendingGroups.length));
      let idx = 0;
      for (const group of toStart) {
        const url = await self.BG.getProvider(provider).buildUrlWithGroupId(group.groupId);
        const tabId = await this._getOrCreateTabForUrl(pool, url);
        if (!tabId) { continue; }
        await this.poolManager.assignTab(tabId, provider, group.groupId);
        // Calculer l'index du groupe pour stockage et UI
        const allGroups = (await this.runStateManager.getRunState()).groups[provider];
        const groupIndex = allGroups.findIndex(g => g.groupId === group.groupId);
        await this._storeGroupData(provider, group, groupIndex, allGroups.length);
        await this._notifyTabLeadsUpdated(tabId, provider, group, groupIndex, allGroups.length);
        idx += 1;
      }
    }
  }

  async _getOrCreateTabForUrl(pool, url) {
    // Essayer de réutiliser un onglet IDLE
    let currentPool = await this.poolManager.getPool();
    currentPool = await this.poolManager.validatePool(currentPool);
    if (!currentPool) return null;

    const idle = (currentPool.tabs || []).find(t => t.status === this.poolManager.tabStatus.IDLE);
    if (idle) {
      const upd = await self.BG.chromeHelpers.safeTabsUpdate(idle.tabId, { url, active: false });
      if (!upd) {
        const tab = await self.BG.chromeHelpers.safeTabsCreate({ windowId: currentPool.windowId, url, active: false });
        if (!tab) return null;
        idle.tabId = tab.id;
        await this.poolManager.setPool(currentPool);
        return tab.id;
      }
      return idle.tabId;
    }

    // Créer un nouvel onglet si sous-capacité
    if ((currentPool.tabs?.length || 0) < (currentPool.capacity || 1)) {
      const tab = await self.BG.chromeHelpers.safeTabsCreate({ windowId: currentPool.windowId, url, active: false });
      if (!tab) return null;
      currentPool.tabs = currentPool.tabs || [];
      currentPool.tabs.push({
        tabId: tab.id,
        status: this.poolManager.tabStatus.IDLE,
        assigned: null,
        createdAt: new Date().toISOString()
      });
      await this.poolManager.setPool(currentPool);
      return tab.id;
    }

    return null;
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

    // Libérer l'onglet et éventuellement le fermer si on veut éviter le retour au formulaire
    let closedSender = false;
    if (senderTab?.id) {
      await this.poolManager.releaseTab(senderTab.id);

      try {
        const state = await this.runStateManager.getRunState();
        const shouldCloseOnGroupDone = state?.options?.minimizeWindow === false; // visible run → fermer l'onglet terminé
        if (shouldCloseOnGroupDone) {
          // Retirer l'entrée du pool et fermer physiquement l'onglet
          const poolNow = await this.poolManager.getPool();
          if (poolNow && Array.isArray(poolNow.tabs)) {
            poolNow.tabs = poolNow.tabs.filter(t => t.tabId !== senderTab.id);
            await this.poolManager.setPool(poolNow);
          }
          await self.BG.chromeHelpers.safeTabsRemove(senderTab.id);
          closedSender = true;
        }
      } catch (_) { /* ignore */ }
    }

    // Essayer de réassigner cet onglet à un autre provider avec backlog, sans dépasser le plafond par provider
    const perProviderCap = runState.options?.parallelTabs || this.config.DEFAULT_PARALLEL_TABS;
    const pool = await this.poolManager.getPool();
    const providers = runState.providers || [];

    // Compter les assignations actives par provider
    const assignedCounts = Object.fromEntries(providers.map(p => [p, 0]));
    for (const t of (pool?.tabs || [])) {
      const p = t?.assigned?.provider;
      if (p && assignedCounts[p] != null) assignedCounts[p] += 1;
    }

    for (const p of providers) {
      const pending = await this.runStateManager.getPendingGroups(p);
      if (pending.length > 0 && (assignedCounts[p] || 0) < perProviderCap) {
        const nextGroup = pending[0];
        if (!closedSender && senderTab?.id) {
          // Comportement historique: réassigne sur le même onglet si non fermé
          await this._assignGroupToTab(senderTab.id, p, nextGroup);
        } else {
          // Onglet fermé (mode visible) → démarrer sur un nouvel onglet du pool
          await this._startNewTabForGroup(p, nextGroup);
        }
        return { reassigned: true, provider: p, groupId: nextGroup.groupId };
      }
    }

    // Aucune réassignation possible: vérifier si tout est terminé
    const anyBacklog = await this._hasAnyBacklog();
    const hasActiveAssignments = pool?.tabs?.some(t => !!t.assigned);
    if (!anyBacklog && !hasActiveAssignments) {
      // Stopper le pianotage avant de finaliser
      try { if (pool?.windowId) self.BG.FocusCycler?.stop(pool.windowId); } catch (_) {}
      await this._completeRun();
      return { finished: true };
    }

    return { ok: true };
  }

  async _hasAnyBacklog() {
    const state = await this.runStateManager.getRunState();
    if (!state) return false;
    return Object.values(state.backlog || {}).some(arr => (arr || []).length > 0);
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
        const newTabId = tab && tab.id;
        if (newTabId) {
          // Remplacer l'entrée existante du pool pour garder la capacité stable
          const p = await this.poolManager.getPool();
          if (p && Array.isArray(p.tabs)) {
            const entry = p.tabs.find(t => t.tabId === tabId);
            if (entry) { entry.tabId = newTabId; await this.poolManager.setPool(p); }
          }
          tabId = newTabId;
        }
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

    // Mettre à jour l'entrée du pool pour remplacer l'ancien tabId par le nouveau
    try {
      const p = await this.poolManager.getPool();
      if (p && Array.isArray(p.tabs)) {
        const entry = p.tabs.find(t => t.tabId === tabId);
        if (entry) { entry.tabId = newTab.id; entry.status = this.poolManager.tabStatus.IDLE; entry.assigned = null; await this.poolManager.setPool(p); }
      }
    } catch (_) { /* ignore */ }

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
    
    // Stopper pianotage si actif
    try {
      const pool = await this.poolManager.getPool();
      if (pool?.windowId) self.BG.FocusCycler?.stop(pool.windowId);
    } catch (_) { /* ignore */ }

    // Fermer la fenêtre si demandé
    if (runState?.options?.closeOnFinish) {
      await this.poolManager.closePool();
    }
  }

  /**
   * Démarre un nouveau tab pour un group donné
   */
  async _startNewTabForGroup(provider, group) {
    const pool = await this.poolManager.getPool();
    const url = await self.BG.getProvider(provider).buildUrlWithGroupId(group.groupId);
    const tabId = await this._getOrCreateTabForUrl(pool, url);
    if (!tabId) return null;
    await this.poolManager.assignTab(tabId, provider, group.groupId);
    const allGroups = (await this.runStateManager.getRunState()).groups[provider];
    const groupIndex = allGroups.findIndex(g => g.groupId === group.groupId);
    await this._storeGroupData(provider, group, groupIndex, allGroups.length);
    await this._notifyTabLeadsUpdated(tabId, provider, group, groupIndex, allGroups.length);
    return tabId;
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
