// Lead splitting, URL build, send logic
self.BG = self.BG || {};

self.BG.splitIntoChunks = function splitIntoChunks(array, numChunks) {
  if (numChunks <= 1) return [array];
  const chunks = [];
  const chunkSize = Math.ceil(array.length / numChunks);
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

self.BG.buildSwissLifeUrlWithGroupId = async function buildSwissLifeUrlWithGroupId(groupId) {
  const cfg = await self.BG.getDeploymentConfigSW();
  const base = (cfg.swisslifeBaseUrl || '').replace(/\/$/, '');
  const path = (cfg.swisslifeTarifPath || '').startsWith('/') ? cfg.swisslifeTarifPath : '/' + (cfg.swisslifeTarifPath || '');
  const refreshTime = Date.now();
  const sep = path.includes('?') ? '&' : '?';
  return `${base}${path}${sep}refreshTime=${refreshTime}&groupId=${groupId}`;
}

self.BG.notifyTabWithRetry = async function notifyTabWithRetry(tabInfo, index, totalTabs, timestamp, maxRetries = 2) {
  const message = {
    action: 'LEADS_UPDATED',
    data: {
      count: tabInfo.leadCount,
      timestamp: timestamp || new Date().toISOString(),
      autoExecute: true,
      groupId: tabInfo.groupId,
      groupIndex: index,
      totalGroups: totalTabs
    },
    source: 'background'
  };
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      await chrome.tabs.sendMessage(tabInfo.tabId, message);
      console.log(`📡 [BACKGROUND] Notification envoyée à l'onglet ${index + 1}/${totalTabs} (groupId: ${tabInfo.groupId})${attempt > 1 ? ` (tentative ${attempt})` : ''}`);
      return;
    } catch (error) {
      console.warn(`⚠️ [BACKGROUND] Tentative ${attempt}/${maxRetries + 1} échouée pour l'onglet ${tabInfo.groupId}:`, error.message);
      if (attempt <= maxRetries) {
        const retryDelay = attempt * 2000;
        console.log(`🔄 [BACKGROUND] Retry dans ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error(`❌ [BACKGROUND] Impossible de notifier l'onglet ${tabInfo.groupId} après ${maxRetries + 1} tentatives`);
      }
    }
  }
}

self.BG.sendSingleLeadToProcessingPool = async function sendSingleLeadToProcessingPool(lead, parallelTabs) {
  let pool = await self.BG.ensureProcessingWindow(parallelTabs);
  pool = await self.BG.validateAndPrunePool(pool);
  if ((pool.tabs || []).length < (pool.capacity || parallelTabs)) {
    const groupId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await self.BG.createProcessingTab(pool, groupId, lead);
    return { success: true, data: { stored: true, count: 1, parallelTabs: (pool.tabs || []).length + 0 } };
  }
  const target = await self.BG.chooseLeastLoadedGroup(pool);
  if (!target) {
    const groupId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await self.BG.createProcessingTab(pool, groupId, lead);
    return { success: true, data: { stored: true, count: 1 } };
  }
  await self.BG.appendLeadToExistingGroup(target.groupId, lead);
  try {
    await chrome.tabs.sendMessage(target.tabId, {
      action: 'LEADS_UPDATED',
      data: { count: 1, timestamp: new Date().toISOString(), autoExecute: true, groupId: target.groupId },
      source: 'background'
    });
  } catch (_) {}
  pool.lastUsedAt = new Date().toISOString();
  await self.BG.setProcessingPool(pool);
  return { success: true, data: { stored: true, count: 1 } };
}

self.BG.sendLeadsToStorage = async function sendLeadsToStorage(data) {
  try {
    let { leads, timestamp, count, parallelTabs } = data || {};
    if (!leads || !Array.isArray(leads) || leads.length === 0) throw new Error('Aucun lead valide à stocker');
    if (typeof parallelTabs !== 'number') {
      try {
        const { automation_config } = await chrome.storage.local.get(['automation_config']);
        parallelTabs = Math.min(10, Math.max(1, Number(automation_config?.parallelTabs ?? 1)));
      } catch (_) { parallelTabs = 1; }
    }
    const batchId = Date.now().toString();
    const actualParallelTabs = Math.min(parallelTabs, leads.length);
    console.log(`📊 [BACKGROUND] Traitement ${leads.length} leads avec ${actualParallelTabs} onglet(s) parallèle(s)`);
    if (actualParallelTabs <= 1) {
      if (parallelTabs > 1 && leads.length === 1) {
        return await self.BG.sendSingleLeadToProcessingPool(leads[0], parallelTabs);
      }
      return await self.BG.sendLeadsToStorageSingle(leads, timestamp, count);
    }
    const leadChunks = self.BG.splitIntoChunks(leads, actualParallelTabs);
    const createdTabs = [];
    console.log(`📦 [BACKGROUND] Découpage en ${leadChunks.length} groupes:`, leadChunks.map(chunk => chunk.length));
    const window = await chrome.windows.create({ type: 'normal', focused: false, width: 800, height: 600, url: 'about:blank' });
    for (let i = 0; i < leadChunks.length; i++) {
      const groupId = `${batchId}-${i}`;
      const chunk = leadChunks[i];
      const tab = await chrome.tabs.create({ windowId: window.id, url: await self.BG.buildSwissLifeUrlWithGroupId(groupId), active: false });
      const storageData = {
        [`swisslife_leads__${groupId}`]: chunk,
        [`swisslife_queue_state__${groupId}`]: {
          currentIndex: 0,
          totalLeads: chunk.length,
          processedLeads: [],
          status: 'pending',
          startedAt: new Date().toISOString(),
          completedAt: null,
          groupId,
          batchId,
          groupIndex: i,
          totalGroups: leadChunks.length
        }
      };
      await chrome.storage.local.set(storageData);
      createdTabs.push({ tabId: tab.id, groupId, leadCount: chunk.length, completed: false });
      console.log(`✅ [BACKGROUND] Groupe ${i + 1}/${leadChunks.length} créé: ${chunk.length} leads, groupId: ${groupId}`);
    }
    const tabs = await chrome.tabs.query({ windowId: window.id });
    const tempTab = tabs.find(tab => tab.url === 'about:blank');
    if (tempTab) await chrome.tabs.remove(tempTab.id);
    try {
      const { automation_config } = await chrome.storage.local.get(['automation_config']);
      const minimize = typeof automation_config?.minimizeWindow === 'boolean' ? automation_config.minimizeWindow : true;
      if (minimize) {
        await chrome.windows.update(window.id, { state: 'minimized' }).catch(err => console.log('⚠️ [BACKGROUND] Minimisation échouée:', err));
      }
    } catch (_) {}
    const pool = { windowId: window.id, capacity: parallelTabs, tabs: createdTabs, createdAt: new Date().toISOString(), lastUsedAt: new Date().toISOString() };
    await self.BG.setProcessingPool(pool);
    for (let i = 0; i < createdTabs.length; i++) {
      const tabInfo = createdTabs[i];
      setTimeout(async () => { await self.BG.notifyTabWithRetry(tabInfo, i, createdTabs.length, timestamp); }, i * 3000);
    }
    return { success: true, data: { stored: true, count: leads.length, timestamp: timestamp || new Date().toISOString(), parallelTabs: createdTabs.length, groups: createdTabs.map(t => ({ groupId: t.groupId, leadCount: t.leadCount })) } };
  } catch (error) {
    console.error('Erreur lors du stockage des leads (multi-onglets):', error);
    throw error;
  }
}

self.BG.sendLeadsToStorageSingle = async function sendLeadsToStorageSingle(leads, timestamp, count) {
  const storageData = { swisslife_leads: leads, timestamp: timestamp || new Date().toISOString(), count: count || leads.length, source: 'platform-lead-extractor' };
  const queueState = { currentIndex: 0, totalLeads: leads.length, processedLeads: [], status: 'pending', startedAt: new Date().toISOString(), completedAt: null };
  await chrome.storage.local.set({ ...storageData, swisslife_queue_state: queueState });
  await self.BG.notifySwissLifeTabs('LEADS_UPDATED', { count: storageData.count, timestamp: storageData.timestamp, autoExecute: true });
  console.log(`✅ [BACKGROUND] Mode mono-onglet: ${leads.length} leads stockés`);
  return { success: true, data: { stored: true, count: storageData.count, timestamp: storageData.timestamp, parallelTabs: 1 } };
}

