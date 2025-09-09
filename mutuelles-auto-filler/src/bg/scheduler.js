// Single-window, global tab pool scheduler (multi-providers)
self.BG = self.BG || {};

// Utility
self.BG.sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Pool helpers
self.BG.getPool = async function getPool() {
  const res = await chrome.storage.local.get([self.BG.POOL_KEY]);
  return res[self.BG.POOL_KEY] || null;
}

self.BG.setPool = async function setPool(pool) {
  await chrome.storage.local.set({ [self.BG.POOL_KEY]: pool });
}

self.BG.getRunState = async function getRunState() {
  const res = await chrome.storage.local.get([self.BG.RUN_STATE_KEY]);
  return res[self.BG.RUN_STATE_KEY] || null;
}

self.BG.setRunState = async function setRunState(state) {
  await chrome.storage.local.set({ [self.BG.RUN_STATE_KEY]: state });
}

self.BG.validatePool = async function validatePool(pool) {
  if (!pool) return null;
  try { await chrome.windows.get(pool.windowId); } catch (_) { return null; }
  const validTabs = [];
  for (const t of pool.tabs || []) {
    try {
      const tab = await chrome.tabs.get(t.tabId);
      if (tab && tab.windowId === pool.windowId) validTabs.push(t);
    } catch (_) {}
  }
  if (validTabs.length !== (pool.tabs || []).length) {
    pool.tabs = validTabs;
    await self.BG.setPool(pool);
  }
  return pool;
}

// Create/reuse single window
self.BG.ensureWindow = async function ensureWindow(initialUrl) {
  let pool = await self.BG.getPool();
  pool = await self.BG.validatePool(pool);
  if (pool) return pool;

  const win = await chrome.windows.create({ type: 'normal', focused: false, width: 1000, height: 800, url: initialUrl || 'about:blank' });
  try {
    const { automation_config } = await chrome.storage.local.get(['automation_config']);
    const minimize = typeof automation_config?.minimizeWindow === 'boolean' ? automation_config.minimizeWindow : true;
    if (minimize) await chrome.windows.update(win.id, { state: 'minimized' });
  } catch (_) {}

  const newPool = { windowId: win.id, capacity: 1, tabs: [], createdAt: new Date().toISOString(), lastUsedAt: new Date().toISOString() };
  await self.BG.setPool(newPool);
  return newPool;
}

// Ensure capacity number of tabs exist (using about:blank for idle)
self.BG.ensureCapacity = async function ensureCapacity(capacity) {
  let pool = await self.BG.ensureWindow();
  pool = await self.BG.validatePool(pool);
  const existing = pool.tabs.length;
  while (pool.tabs.length < capacity) {
    const tab = await chrome.tabs.create({ windowId: pool.windowId, url: 'about:blank', active: false });
    pool.tabs.push({ tabId: tab.id, assigned: null });
  }
  // Optionally trim extra tabs if capacity reduced
  while (pool.tabs.length > capacity && pool.tabs.length > 1) {
    const t = pool.tabs.pop();
    try { await chrome.tabs.remove(t.tabId); } catch (_) {}
  }
  pool.capacity = capacity;
  pool.lastUsedAt = new Date().toISOString();
  await self.BG.setPool(pool);
  return pool;
}

// Leads chunking per provider
self.BG.splitIntoGroups = function splitIntoGroups(leads, capacity) {
  const n = Math.max(1, Math.min(capacity || 1, leads.length));
  const size = Math.floor(leads.length / n);
  let remainder = leads.length % n;
  const groups = [];
  let i = 0;
  for (let k = 0; k < n; k++) {
    const extra = remainder > 0 ? 1 : 0;
    const end = i + size + extra;
    groups.push(leads.slice(i, end));
    i = end;
    remainder--;
  }
  // if leads < capacity, we might have empty groups; filter them
  return groups.filter(g => g && g.length > 0);
}

self.BG.storeGroupData = async function storeGroupData(provider, groupId, leadsChunk, batchId, groupIndex, totalGroups) {
  const leadsKey = `${provider}_leads__${groupId}`;
  const queueKey = `${provider}_queue_state__${groupId}`;
  const storageData = {};
  storageData[leadsKey] = leadsChunk;
  storageData[queueKey] = {
    currentIndex: 0,
    totalLeads: leadsChunk.length,
    processedLeads: [],
    status: 'pending',
    startedAt: new Date().toISOString(),
    completedAt: null,
    groupId,
    batchId,
    groupIndex,
    totalGroups,
    provider
  };
  await chrome.storage.local.set(storageData);
}

self.BG.notifyTabLeadsUpdated = async function notifyTabLeadsUpdated(tabId, provider, groupId, leadCount, groupIndex, totalGroups, timestamp) {
  const message = {
    action: 'LEADS_UPDATED',
    data: {
      provider,
      groupId,
      count: leadCount,
      groupIndex,
      totalGroups,
      timestamp: timestamp || new Date().toISOString(),
      autoExecute: true
    },
    source: 'background'
  };
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await chrome.tabs.sendMessage(tabId, message);
      return true;
    } catch (e) {
      await self.BG.sleep(1000 * attempt);
    }
  }
  return false;
}

// Assign group to existing tab (same provider)
self.BG.assignGroupToTab = async function assignGroupToTab(tabSlot, provider, group, groupIndex, totalGroups) {
  const groupId = group.groupId;
  const url = await self.BG.getProvider(provider).buildUrlWithGroupId(groupId);
  try {
    await chrome.tabs.update(tabSlot.tabId, { url, active: false });
  } catch (_) {
    // If tab gone, recreate in same window
    let pool = await self.BG.getPool();
    const tab = await chrome.tabs.create({ windowId: pool.windowId, url, active: false });
    tabSlot.tabId = tab.id;
  }
  await self.BG.storeGroupData(provider, groupId, group.leads, group.batchId, groupIndex, totalGroups);
  tabSlot.assigned = { provider, groupId };
  await self.BG.notifyTabLeadsUpdated(tabSlot.tabId, provider, groupId, group.leads.length, groupIndex, totalGroups);
}

// Switch provider: close old tab then open new tab (ensure keepalive)
self.BG.switchProviderOnTab = async function switchProviderOnTab(tabSlot, provider, group, groupIndex, totalGroups) {
  let pool = await self.BG.getPool();
  // Create new tab first to avoid closing the last one
  const url = await self.BG.getProvider(provider).buildUrlWithGroupId(group.groupId);
  const newTab = await chrome.tabs.create({ windowId: pool.windowId, url, active: false });
  const oldTabId = tabSlot.tabId;
  tabSlot.tabId = newTab.id;
  try { await chrome.tabs.remove(oldTabId); } catch (_) {}
  await self.BG.storeGroupData(provider, group.groupId, group.leads, group.batchId, groupIndex, totalGroups);
  tabSlot.assigned = { provider, groupId: group.groupId };
  await self.BG.notifyTabLeadsUpdated(tabSlot.tabId, provider, group.groupId, group.leads.length, groupIndex, totalGroups);
}

// Ingest START_RUN: prepare plan and fill pool
self.BG.startRun = async function startRun({ providers, leads, parallelTabs, options }) {
  if (!Array.isArray(providers) || providers.length === 0) throw new Error('providers requis');
  if (!Array.isArray(leads) || leads.length === 0) throw new Error('leads requis');
  const cap = Math.max(1, Math.min(10, Number(parallelTabs || 1)));
  const orderedProviders = self.BG.defaultProviderOrder(providers);
  if (orderedProviders.length === 0) throw new Error('Aucun provider valide');

  // Build groups per provider (same leads for each provider)
  const batchId = Date.now().toString();
  const perProvider = {};
  for (const p of orderedProviders) {
    const chunks = self.BG.splitIntoGroups(leads, cap);
    perProvider[p] = chunks.map((chunk, idx) => ({ groupId: `${batchId}-${p}-${idx}`, leads: chunk, batchId }));
  }

  // Persist run state
  const runState = {
    providers: orderedProviders,
    backlog: Object.fromEntries(orderedProviders.map(p => [p, perProvider[p].map(g => g.groupId)])),
    groups: perProvider,
    activeProviderIndex: 0,
    options: {
      minimizeWindow: options?.minimizeWindow !== false,
      closeOnFinish: options?.closeOnFinish === true
    }
  };
  await self.BG.setRunState(runState);

  // Open tabs directly with target URLs (no about:blank), in parallel
  const activeProvider = orderedProviders[0];
  const totalGroups = perProvider[activeProvider].length;
  const toAssign = Math.min(cap, totalGroups);
  const groupsToOpen = perProvider[activeProvider].slice(0, toAssign);

  // Ensure window exists, possibly created with first URL
  const firstUrl = await self.BG.getProvider(activeProvider).buildUrlWithGroupId(groupsToOpen[0].groupId);
  let pool = await self.BG.getPool();
  pool = await self.BG.validatePool(pool);
  if (!pool) {
    pool = await self.BG.ensureWindow(firstUrl);
  }

  // Find first tab if window was created with firstUrl
  const tabsInWindow = await chrome.tabs.query({ windowId: pool.windowId });
  const firstGroupId = groupsToOpen[0].groupId;
  // Tenter de récupérer l'onglet actif de la fenêtre (créé avec firstUrl)
  let firstTab = tabsInWindow.find(t => t.active) || tabsInWindow[0];
  if (!firstTab) {
    // Aucun onglet dans la fenêtre: créer le premier
    firstTab = await chrome.tabs.create({ windowId: pool.windowId, url: firstUrl, active: false });
  } else {
    // S'assurer qu'il pointe bien vers l'URL attendue (éviter le doublon)
    try { await chrome.tabs.update(firstTab.id, { url: firstUrl, active: false }); } catch (_) {}
  }

  // Create remaining tabs concurrently
  const creations = groupsToOpen.slice(1).map(async (group) => {
    const url = await self.BG.getProvider(activeProvider).buildUrlWithGroupId(group.groupId);
    const tab = await chrome.tabs.create({ windowId: pool.windowId, url, active: false });
    return { tab, group };
  });
  const created = await Promise.all(creations);

  // Build pool tabs list: include first tab + created ones
  pool.tabs = [];
  const firstSlot = { tabId: firstTab.id, assigned: { provider: activeProvider, groupId: firstGroupId } };
  pool.tabs.push(firstSlot);
  for (let i = 0; i < created.length; i++) {
    const { tab, group } = created[i];
    pool.tabs.push({ tabId: tab.id, assigned: { provider: activeProvider, groupId: group.groupId } });
  }
  pool.capacity = cap;
  pool.lastUsedAt = new Date().toISOString();
  await self.BG.setPool(pool);

  // Store group data and notify content scripts concurrently
  const notifyAll = [];
  const allAssigned = [{ tabId: firstTab.id, group: groupsToOpen[0], index: 0 }].concat(created.map((c, idx) => ({ tabId: c.tab.id, group: c.group, index: idx + 1 })));
  for (const { tabId, group, index } of allAssigned) {
    await self.BG.storeGroupData(activeProvider, group.groupId, group.leads, group.batchId, index, totalGroups);
    notifyAll.push(self.BG.notifyTabLeadsUpdated(tabId, activeProvider, group.groupId, group.leads.length, index, totalGroups));
  }
  await Promise.all(notifyAll);

  return { started: true, providers: orderedProviders, capacity: cap };
}

self.BG.onQueueDone = async function onQueueDone({ provider, groupId }, sender) {
  // Mark tab free and assign next work
  let pool = await self.BG.getPool();
  pool = await self.BG.validatePool(pool);
  if (!pool) return { ok: true };
  const tabId = sender?.tab?.id;
  const slot = pool.tabs.find(t => t.tabId === tabId);
  const state = await self.BG.getRunState();
  if (!state) return { ok: true };

  // Remove groupId from backlog
  state.backlog[provider] = (state.backlog[provider] || []).filter(g => g !== groupId);
  await self.BG.setRunState(state);

  if (!slot) return { ok: true };
  slot.assigned = null;
  await self.BG.setPool(pool);

  // If active provider still has groups, assign next to this tab
  const activeProvider = state.providers[state.activeProviderIndex];
  const hasActiveBacklog = (state.backlog[activeProvider] || []).length > 0;
  if (provider === activeProvider && hasActiveBacklog) {
    const nextId = state.backlog[activeProvider][0];
    const allGroups = state.groups[activeProvider];
    const groupIndex = allGroups.findIndex(g => g.groupId === nextId);
    const totalGroups = allGroups.length;
    const group = allGroups[groupIndex];
    // Pop from backlog
    state.backlog[activeProvider].shift();
    await self.BG.setRunState(state);
    await self.BG.assignGroupToTab(slot, activeProvider, group, groupIndex, totalGroups);
    return { reassigned: true };
  }

  // If no more active backlog, check if entire provider finished
  const allAssignedTabs = pool.tabs.filter(t => t.assigned && t.assigned.provider === activeProvider);
  const activeHasTabs = allAssignedTabs.length > 0;
  const activeHasBacklog = (state.backlog[activeProvider] || []).length > 0;

  if (!activeHasBacklog && !activeHasTabs) {
    // Move to next provider with backlog
    let nextIndex = state.activeProviderIndex + 1;
    while (nextIndex < state.providers.length) {
      const nextProvider = state.providers[nextIndex];
      if ((state.backlog[nextProvider] || []).length > 0) break;
      nextIndex++;
    }
    if (nextIndex < state.providers.length) {
      state.activeProviderIndex = nextIndex;
      await self.BG.setRunState(state);
      const nextProvider = state.providers[nextIndex];
      const totalGroups = state.groups[nextProvider].length;
      // reassign this free tab to next provider (switch close/open)
      const nextId = state.backlog[nextProvider][0];
      const allGroups = state.groups[nextProvider];
      const groupIndex = allGroups.findIndex(g => g.groupId === nextId);
      const group = allGroups[groupIndex];
      state.backlog[nextProvider].shift();
      await self.BG.setRunState(state);
      await self.BG.switchProviderOnTab(slot, nextProvider, group, groupIndex, totalGroups);
      return { switched: true };
    } else {
      // All providers finished? if all backlogs empty and no assigned tabs
      const anyAssigned = pool.tabs.some(t => t.assigned);
      const anyBacklog = Object.values(state.backlog).some(arr => (arr || []).length > 0);
      if (!anyAssigned && !anyBacklog) {
        // Cleanup and finish
        await chrome.storage.local.remove([self.BG.RUN_STATE_KEY]);
        try {
          const shouldClose = state.options?.closeOnFinish === true;
          if (shouldClose) {
            try { await chrome.windows.remove(pool.windowId); } catch (_) {}
            await chrome.storage.local.remove([self.BG.POOL_KEY]);
          }
        } catch (_) {}
        return { finished: true };
      }
    }
  }

  return { ok: true };
}
