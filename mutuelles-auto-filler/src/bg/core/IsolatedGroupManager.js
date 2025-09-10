/**
 * Gestionnaire des groupes isolés 
 * Responsabilité: Gérer les retry isolés (1 lead = 1 onglet/fenêtre séparée)
 */

self.BG = self.BG || {};

self.BG.IsolatedGroupManager = class IsolatedGroupManager {
  constructor() {
    this.storageKey = self.BG.SCHEDULER_CONSTANTS.STORAGE_KEYS.ISOLATED_GROUPS;
    this.runStatus = self.BG.SCHEDULER_CONSTANTS.RUN_STATUS;
  }

  /**
   * Obtient tous les groupes isolés
   */
  async getIsolatedGroups() {
    const result = await chrome.storage.local.get([this.storageKey]);
    return result[this.storageKey] || {};
  }

  /**
   * Sauvegarde les groupes isolés
   */
  async setIsolatedGroups(groups) {
    await chrome.storage.local.set({ [this.storageKey]: groups });
  }

  /**
   * Obtient un groupe isolé spécifique
   */
  async getIsolatedGroup(groupId) {
    const groups = await this.getIsolatedGroups();
    return groups[groupId] || null;
  }

  /**
   * Crée un nouveau run isolé pour un seul lead
   */
  async createIsolatedRun(provider, lead, options = {}) {
    const batchId = Date.now().toString();
    const groupId = `${batchId}-${provider}-isolated-0`;

    // Stocker le lead pour ce groupe
    const leadsKey = `${provider}_leads__${groupId}`;
    const queueKey = `${provider}_queue_state__${groupId}`;
    
    const storageData = {};
    storageData[leadsKey] = [lead];
    storageData[queueKey] = {
      currentIndex: 0,
      totalLeads: 1,
      processedLeads: [],
      status: 'pending',
      startedAt: new Date().toISOString(),
      completedAt: null,
      groupId,
      batchId,
      groupIndex: 0,
      totalGroups: 1,
      provider
    };

    await chrome.storage.local.set(storageData);

    // Créer l'onglet/fenêtre
    const url = await self.BG.getProvider(provider).buildUrlWithGroupId(groupId);
    let tab;
    let windowId;

    if (options.useExistingWindow) {
      // Utiliser fenêtre existante si disponible
      try {
        const poolManager = new self.BG.TabPoolManager();
        const pool = await poolManager.ensureWindow();
        
        tab = await chrome.tabs.create({ 
          windowId: pool.windowId, 
          url, 
          active: false 
        });
        windowId = pool.windowId;
      } catch (error) {
        // Fallback sur nouvelle fenêtre
        const window = await chrome.windows.create({ 
          type: 'normal', 
          focused: false, 
          url 
        });
        windowId = window.id;
        const tabs = await chrome.tabs.query({ windowId });
        tab = tabs.find(t => t.active) || tabs[0];
      }
    } else {
      // Créer nouvelle fenêtre dédiée
      const window = await chrome.windows.create({ 
        type: 'normal', 
        focused: false, 
        url 
      });
      windowId = window.id;

      try {
        const minimize = options.minimizeWindow !== false;
        if (minimize) {
          await chrome.windows.update(windowId, { state: 'minimized' });
        }
      } catch (error) {
        // Ignore si impossible de minimiser
      }

      const tabs = await chrome.tabs.query({ windowId });
      tab = tabs.find(t => t.active) || tabs[0];
    }

    // Enregistrer le groupe isolé
    await this.addIsolatedGroup(groupId, tab.id, windowId, {
      provider,
      leadId: lead.id,
      leadName: `${lead.contact?.prenom || ''} ${lead.contact?.nom || ''}`.trim(),
      createdAt: new Date().toISOString()
    });

    // Notifier le content script
    await this._notifyTabLeadsUpdated(tab.id, provider, groupId, 1, 0, 1);

    return {
      started: true,
      isolated: true,
      groupId,
      tabId: tab.id,
      windowId
    };
  }

  /**
   * Ajoute un groupe isolé au registre
   */
  async addIsolatedGroup(groupId, tabId, windowId, metadata = {}) {
    const groups = await this.getIsolatedGroups();
    groups[groupId] = {
      tabId,
      windowId,
      ...metadata
    };
    await this.setIsolatedGroups(groups);
  }

  /**
   * Supprime un groupe isolé du registre
   */
  async removeIsolatedGroup(groupId) {
    const groups = await this.getIsolatedGroups();
    delete groups[groupId];
    await this.setIsolatedGroups(groups);
  }

  /**
   * Termine un groupe isolé et nettoie les ressources
   */
  async completeIsolatedGroup(groupId) {
    const group = await this.getIsolatedGroup(groupId);
    if (!group) return { ok: true };

    try {
      // Fermer l'onglet
      if (group.tabId) {
        await chrome.tabs.remove(group.tabId);
      }
    } catch (error) {
      // Ignore si onglet déjà fermé
    }

    try {
      // Si c'est une fenêtre séparée et qu'elle est maintenant vide, la fermer
      if (group.windowId) {
        const tabs = await chrome.tabs.query({ windowId: group.windowId });
        if (tabs.length === 0) {
          await chrome.windows.remove(group.windowId);
        }
      }
    } catch (error) {
      // Ignore si fenêtre déjà fermée
    }

    // Nettoyer les clés de storage liées au groupe
    try {
      await this._cleanupGroupStorage(group.provider, groupId);
    } catch (_) { /* ignore */ }

    // Supprimer du registre
    await this.removeIsolatedGroup(groupId);

    return { ok: true, isolated: true };
  }

  /**
   * Annule tous les groupes isolés actifs
   */
  async cancelAllIsolatedGroups() {
    const groups = await this.getIsolatedGroups();
    const groupIds = Object.keys(groups);

    for (const groupId of groupIds) {
      await this.completeIsolatedGroup(groupId);
    }

    // Nettoyer le storage
    await chrome.storage.local.remove([this.storageKey]);

    return { cancelled: groupIds.length };
  }

  /**
   * Obtient l'état des groupes isolés pour l'UI
   */
  async getIsolatedState() {
    const groups = await this.getIsolatedGroups();
    const groupIds = Object.keys(groups);

    return {
      isolatedCount: groupIds.length,
      groups: Object.entries(groups).map(([groupId, group]) => ({
        groupId,
        leadName: group.leadName || 'Lead inconnu',
        provider: group.provider,
        createdAt: group.createdAt
      }))
    };
  }

  /**
   * Valide qu'un groupe isolé existe encore
   */
  async validateIsolatedGroup(groupId) {
    const group = await this.getIsolatedGroup(groupId);
    if (!group) return null;

    try {
      // Vérifier que l'onglet existe
      const tab = await chrome.tabs.get(group.tabId);
      if (!tab) {
        await this.removeIsolatedGroup(groupId);
        return null;
      }
      return group;
    } catch (error) {
      // Onglet fermé, nettoyer
      await this.removeIsolatedGroup(groupId);
      return null;
    }
  }

  /**
   * Notifie un onglet de ses leads mis à jour (méthode privée)
   */
  async _notifyTabLeadsUpdated(tabId, provider, groupId, leadCount, groupIndex, totalGroups) {
    const message = {
      action: 'LEADS_UPDATED',
      data: {
        provider,
        groupId,
        count: leadCount,
        groupIndex,
        totalGroups,
        timestamp: new Date().toISOString(),
        autoExecute: true
      },
      source: 'background'
    };

    // Retry avec backoff (config globale)
    const attempts = self.BG.SCHEDULER_CONSTANTS.CONFIG.RETRY_ATTEMPTS;
    const baseDelay = self.BG.SCHEDULER_CONSTANTS.CONFIG.RETRY_DELAY;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        await chrome.tabs.sendMessage(tabId, message);
        return true;
      } catch (error) {
        if (attempt === attempts) {
          console.warn(`[IsolatedGroupManager] Impossible de notifier l'onglet ${tabId}:`, error);
          return false;
        }
        await new Promise(resolve => setTimeout(resolve, baseDelay * attempt));
      }
    }
    return false;
  }
  
  /**
   * Nettoie les clés de storage relatives à un groupId donné
   */
  async _cleanupGroupStorage(provider, groupId) {
    try {
      const all = await chrome.storage.local.get(null);
      const keys = Object.keys(all).filter(key => key.startsWith(`${provider}_`) && key.endsWith(`__${groupId}`));
      if (keys.length > 0) {
        await chrome.storage.local.remove(keys);
      }
      return keys.length;
    } catch (_) {
      return 0;
    }
  }
};
