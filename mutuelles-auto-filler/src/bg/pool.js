// Pool/window/tab management
self.BG = self.BG || {};

self.BG.getProcessingPool = async function getProcessingPool() {
  const res = await chrome.storage.local.get([self.BG.POOL_KEY]);
  return res[self.BG.POOL_KEY] || null;
}

self.BG.setProcessingPool = async function setProcessingPool(pool) {
  await chrome.storage.local.set({ [self.BG.POOL_KEY]: pool });
}

self.BG.validateAndPrunePool = async function validateAndPrunePool(pool) {
  if (!pool) return null;
  try {
    await chrome.windows.get(pool.windowId);
  } catch (e) {
    return null;
  }

  const validTabs = [];
  for (const t of (pool.tabs || [])) {
    try {
      const tab = await chrome.tabs.get(t.tabId);
      if (tab && tab.windowId === pool.windowId) {
        validTabs.push(t);
      }
    } catch (e) {}
  }

  if (validTabs.length !== (pool.tabs || []).length) {
    pool.tabs = validTabs;
    await self.BG.setProcessingPool(pool);
  }
  return pool;
}

self.BG.ensureProcessingWindow = async function ensureProcessingWindow(capacity) {
  let pool = await self.BG.getProcessingPool();
  pool = await self.BG.validateAndPrunePool(pool);
  if (pool) return pool;

  const newWindow = await chrome.windows.create({
    type: 'normal',
    focused: false,
    width: 800,
    height: 600,
    url: 'about:blank'
  });

  await chrome.windows.update(newWindow.id, { state: 'minimized' }).catch(() => {});

  const newPool = {
    windowId: newWindow.id,
    capacity: capacity,
    tabs: [],
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString()
  };
  await self.BG.setProcessingPool(newPool);
  return newPool;
}

self.BG.chooseLeastLoadedGroup = async function chooseLeastLoadedGroup(pool) {
  if (!pool || !pool.tabs || pool.tabs.length === 0) return null;
  let best = null;
  let bestPending = Number.POSITIVE_INFINITY;
  for (const t of pool.tabs) {
    try {
      const queueKey = `swisslife_queue_state__${t.groupId}`;
      const leadsKey = `swisslife_leads__${t.groupId}`;
      const res = await chrome.storage.local.get([queueKey, leadsKey]);
      const queue = res[queueKey];
      const leads = res[leadsKey] || [];
      const pending = queue ? Math.max(0, (queue.totalLeads || leads.length) - (queue.currentIndex || 0)) : leads.length;
      if (pending < bestPending) {
        bestPending = pending;
        best = { ...t, pending };
      }
    } catch (e) {}
  }
  return best;
}

self.BG.appendLeadToExistingGroup = async function appendLeadToExistingGroup(groupId, lead) {
  const leadsKey = `swisslife_leads__${groupId}`;
  const queueKey = `swisslife_queue_state__${groupId}`;
  const res = await chrome.storage.local.get([leadsKey, queueKey]);
  const leads = res[leadsKey] || [];
  const queue = res[queueKey] || { currentIndex: 0, totalLeads: 0, processedLeads: [], status: 'pending' };
  leads.push(lead);
  queue.totalLeads = (queue.totalLeads || 0) + 1;
  queue.status = 'pending';
  await chrome.storage.local.set({ [leadsKey]: leads, [queueKey]: queue });
  try {
    let pool = await self.BG.getProcessingPool();
    pool = await self.BG.validateAndPrunePool(pool);
    if (pool && pool.tabs) {
      const t = pool.tabs.find(t => t.groupId === groupId);
      if (t) {
        t.completed = false;
        await self.BG.setProcessingPool(pool);
      }
    }
  } catch (_) {}
}

self.BG.createProcessingTab = async function createProcessingTab(pool, groupId, lead) {
  const tab = await chrome.tabs.create({
    windowId: pool.windowId,
    url: await self.BG.buildSwissLifeUrlWithGroupId(groupId),
    active: false
  });
  const storageData = {
    [`swisslife_leads__${groupId}`]: [lead],
    [`swisslife_queue_state__${groupId}`]: {
      currentIndex: 0,
      totalLeads: 1,
      processedLeads: [],
      status: 'pending',
      startedAt: new Date().toISOString(),
      completedAt: null,
      groupId: groupId
    }
  };
  await chrome.storage.local.set(storageData);
  pool.tabs.push({ tabId: tab.id, groupId, leadCount: 1, completed: false });
  pool.lastUsedAt = new Date().toISOString();
  await self.BG.setProcessingPool(pool);
  try {
    await chrome.tabs.sendMessage(tab.id, {
      action: 'LEADS_UPDATED',
      data: { count: 1, timestamp: new Date().toISOString(), autoExecute: true, groupId },
      source: 'background'
    });
  } catch (_) {}
}

self.BG.handleGroupQueueCompleted = async function handleGroupQueueCompleted(data, sender) {
  try {
    const incomingGroupId = data && data.groupId;
    const senderTabId = sender && sender.tab && sender.tab.id;
    let pool = await self.BG.getProcessingPool();
    pool = await self.BG.validateAndPrunePool(pool);
    if (!pool) return { success: true, data: { ignored: true } };

    let target = null;
    for (const t of pool.tabs || []) {
      if ((incomingGroupId && t.groupId === incomingGroupId) || (senderTabId && t.tabId === senderTabId)) {
        target = t;
        break;
      }
    }
    if (!target) return { success: true, data: { updated: false } };

    target.completed = true;
    pool.lastUsedAt = new Date().toISOString();
    await self.BG.setProcessingPool(pool);

    const tabs = pool.tabs || [];
    const allCompleted = tabs.length > 0 && tabs.every(t => t.completed);
    if (allCompleted) {
      let shouldClose = true;
      try {
        const { automation_config } = await chrome.storage.local.get(['automation_config']);
        shouldClose = typeof automation_config?.closeWindowOnFinish === 'boolean' ? automation_config.closeWindowOnFinish : true;
      } catch (_) {}

      try {
        const groupIds = tabs.map(t => t.groupId);
        const all = await chrome.storage.local.get(null);
        const keysToRemove = Object.keys(all).filter(k => groupIds.some(g => k.endsWith(`__${g}`)));
        if (keysToRemove.length > 0) await chrome.storage.local.remove(keysToRemove);
      } catch (_) {}

      if (shouldClose) {
        try { await chrome.windows.remove(pool.windowId); } catch (_) {}
      }
      await chrome.storage.local.remove([self.BG.POOL_KEY]);
      return { success: true, data: { windowClosed: true } };
    }
    return { success: true, data: { updated: true } };
  } catch (error) {
    return { success: false, error: error.message || 'Erreur handleGroupQueueCompleted' };
  }
}

