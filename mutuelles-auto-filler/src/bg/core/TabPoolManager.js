/**
 * Gestionnaire du pool d'onglets
 * Responsabilité: Gérer la fenêtre unique et les onglets partagés
 */

self.BG = self.BG || {};

self.BG.TabPoolManager = class TabPoolManager {
  constructor() {
    this.storageKey = self.BG.STORAGE_KEYS.POOL;
    this.config = self.BG.SCHEDULER_CONSTANTS.CONFIG;
    this.tabStatus = self.BG.SCHEDULER_CONSTANTS.TAB_STATUS;
  }

  async getPool() {
    const result = await chrome.storage.local.get([this.storageKey]);
    return result[this.storageKey] || null;
  }

  async setPool(pool) {
    await chrome.storage.local.set({ [this.storageKey]: pool });
  }

  async validatePool(pool) {
    if (!pool) return null;

    try {
      await chrome.windows.get(pool.windowId);
    } catch (error) {
      return null;
    }

    const validTabs = [];
    for (const tab of pool.tabs || []) {
      try {
        const chromeTab = await chrome.tabs.get(tab.tabId);
        if (chromeTab && chromeTab.windowId === pool.windowId) {
          validTabs.push(tab);
        }
      } catch (error) {
        // Onglet fermé, ignorer
      }
    }

    if (validTabs.length !== (pool.tabs || []).length) {
      pool.tabs = validTabs;
      await this.setPool(pool);
    }

    return pool;
  }

  async ensureWindow(initialUrl = 'about:blank', options = {}) {
    let pool = await this.getPool();
    pool = await this.validatePool(pool);
    
    if (pool) return pool;

    const wantFocus = options?.minimizeWindow === false;
    const window = await self.BG.chromeHelpers.safeWindowsCreate({
      type: 'normal',
      focused: !!wantFocus,
      width: this.config.WINDOW_WIDTH,
      height: this.config.WINDOW_HEIGHT,
      url: initialUrl
    });

    try {
      let minimize;
      if (typeof options.minimizeWindow === 'boolean') {
        minimize = options.minimizeWindow;
      } else {
        const { automation_config } = await chrome.storage.local.get(['automation_config']);
        minimize = automation_config?.minimizeWindow !== false;
      }
      if (minimize) {
        await self.BG.chromeHelpers.safeWindowsUpdate(window.id, { state: 'minimized' });
      } else if (wantFocus) {
        await self.BG.chromeHelpers.safeWindowsUpdate(window.id, { state: 'normal', focused: true });
      }
    } catch (error) {
      // Ignore si impossible de minimiser
    }

    // Enregistrer l'onglet initial de la fenêtre comme premier slot du pool
    let initialTabEntry = null;
    try {
      const tabsInWindow = await chrome.tabs.query({ windowId: window.id });
      const initialTab = tabsInWindow.find(t => t.active) || tabsInWindow[0];
      if (initialTab && typeof initialTab.id === 'number') {
        initialTabEntry = {
          tabId: initialTab.id,
          status: this.tabStatus.IDLE,
          assigned: null,
          createdAt: new Date().toISOString()
        };
      }
    } catch (e) {
      // ignore: si on ne peut pas récupérer l'onglet, ensureCapacity créera les suivants
    }

    const newPool = {
      windowId: window.id,
      capacity: 1,
      tabs: initialTabEntry ? [initialTabEntry] : [],
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString()
    };

    await this.setPool(newPool);
    return newPool;
  }

  async ensureCapacity(targetCapacity, options = {}) {
    const capacity = Math.max(
      this.config.MIN_PARALLEL_TABS,
      Math.min(this.config.MAX_PARALLEL_TABS, targetCapacity || this.config.DEFAULT_PARALLEL_TABS)
    );

    let pool = await this.ensureWindow(undefined, options);
    pool = await this.validatePool(pool);

    // Ne plus pré-créer d'onglets about:blank ici.
    // Les onglets nécessaires seront créés à la demande par l'orchestrateur
    // (_startFirstProvider, _assignGroupToTab, etc.) afin d'éviter des about:blank inutiles

    while (pool.tabs.length > capacity && pool.tabs.length > 1) {
      const tabToRemove = pool.tabs.pop();
      await self.BG.chromeHelpers.safeTabsRemove(tabToRemove.tabId);
    }

    pool.capacity = capacity;
    pool.lastUsedAt = new Date().toISOString();
    await this.setPool(pool);

    return pool;
  }

  async findFreeTab() {
    const pool = await this.validatePool(await this.getPool());
    if (!pool) return null;

    return pool.tabs.find(tab => tab.status === this.tabStatus.IDLE) || null;
  }

  async assignTab(tabId, provider, groupId) {
    const pool = await this.getPool();
    if (!pool) return false;

    let tab = pool.tabs.find(t => t.tabId === tabId);
    if (!tab) {
      // Tolérance: si l'onglet n'est pas encore dans le pool, l'ajouter automatiquement
      tab = {
        tabId,
        status: this.tabStatus.IDLE,
        assigned: null,
        createdAt: new Date().toISOString()
      };
      pool.tabs.push(tab);
    }

    tab.status = this.tabStatus.ASSIGNED;
    tab.assigned = { provider, groupId };
    tab.assignedAt = new Date().toISOString();

    await this.setPool(pool);
    return true;
  }

  async releaseTab(tabId) {
    const pool = await this.getPool();
    if (!pool) return false;

    const tab = pool.tabs.find(t => t.tabId === tabId);
    if (!tab) return false;

    tab.status = this.tabStatus.IDLE;
    tab.assigned = null;
    tab.releasedAt = new Date().toISOString();

    await this.setPool(pool);
    return true;
  }

  async closePool() {
    const pool = await this.getPool();
    if (!pool) return;

    try {
      await self.BG.chromeHelpers.safeWindowsRemove(pool.windowId);
    } catch (error) {
      // Ignore si fenêtre déjà fermée
    }

    await chrome.storage.local.remove([this.storageKey]);
  }
};
