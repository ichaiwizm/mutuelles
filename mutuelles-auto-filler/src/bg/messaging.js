// Messaging and dispatch
self.BG = self.BG || {};

self.BG.checkSwissLifeTab = async function checkSwissLifeTab() {
  try {
    const tabs = await chrome.tabs.query({});
    console.log('🔍 [BACKGROUND] Vérification onglets SwissLife...');
    console.log("🔍 [BACKGROUND] Nombre total d'onglets:", tabs.length);
    tabs.forEach((tab, index) => {
      console.log(`🔍 [BACKGROUND] Onglet ${index}: ${tab.url}`);
      if (tab.url && self.BG.SWISSLIFE_URL_PATTERN_LOOSE.test(tab.url)) {
        console.log(`🎯 [BACKGROUND] SwissLife détecté (pattern loose) sur onglet ${index}`);
        console.log('🎯 [BACKGROUND] Pattern strict match:', self.BG.SWISSLIFE_URL_PATTERN.test(tab.url));
      }
    });
    const swissLifeTab = tabs.find(tab => tab.url && self.BG.SWISSLIFE_URL_PATTERN.test(tab.url));
    if (swissLifeTab) {
      return { success: true, data: { exists: true, tabId: swissLifeTab.id, windowId: swissLifeTab.windowId, url: swissLifeTab.url } };
    } else {
      return { success: true, data: { exists: false } };
    }
  } catch (error) {
    console.error('Erreur lors de la vérification des onglets:', error);
    throw error;
  }
}

self.BG.openSwissLifeTab = async function openSwissLifeTab(data) {
  try {
    const { activate, tabId, url, active = false } = data || {};
    if (activate && tabId) {
      await chrome.tabs.update(tabId, { active: true });
      const tab = await chrome.tabs.get(tabId);
      if (tab.windowId) {
        await chrome.windows.update(tab.windowId, { focused: true, state: 'normal' });
      }
      return { success: true, data: { activated: true, tabId: tabId, windowId: tab.windowId } };
    } else if (url) {
      const newWindow = await chrome.windows.create({ url, type: 'normal', focused: false, width: 800, height: 600 });
      chrome.windows.update(newWindow.id, { state: 'minimized' }).catch(() => {});
      return { success: true, data: { created: true, tabId: newWindow.tabs[0].id, windowId: newWindow.id, url: newWindow.tabs[0].url } };
    } else {
      throw new Error('Paramètres invalides pour ouvrir un onglet');
    }
  } catch (error) {
    console.error("Erreur lors de l'ouverture/activation d'onglet:", error);
    throw error;
  }
}

self.BG.notifyPlatformLeadStatus = async function notifyPlatformLeadStatus(data) {
  try {
    const { leadId, status, leadName, details } = data || {};
    if (!leadId || !status) throw new Error('leadId et status sont requis');
    const statusUpdate = { type: 'LEAD_STATUS_UPDATE', leadId, status, leadName: leadName || `Lead ${leadId}`, timestamp: new Date().toISOString(), details: details || {} };
    console.log(`📡 [BACKGROUND] ${status} notification pour ${leadName}`);
    await self.BG.notifyPlatformTabs(statusUpdate);
    return { success: true, data: { notified: true } };
  } catch (error) {
    console.error('❌ [BACKGROUND] Erreur notification plateforme:', error);
    throw error;
  }
}

self.BG.notifyPlatformTabs = async function notifyPlatformTabs(statusUpdate) {
  try {
    const tabs = await chrome.tabs.query({});
    const cfg = await self.BG.getDeploymentConfigSW();
    const hostSubstrings = self.BG.hostsFromOrigins(cfg.platformOrigins);
    const platformTabs = tabs.filter(tab => tab.url && hostSubstrings.some(h => tab.url.includes(h)));
    if (platformTabs.length === 0) {
      console.log('⚠️ [BACKGROUND] Aucun onglet plateforme trouvé');
      return;
    }
    for (const tab of platformTabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'FORWARD_STATUS_TO_PLATFORM', data: statusUpdate, source: 'background' });
      } catch (_) {}
    }
  } catch (error) {
    console.error('❌ [BACKGROUND] Erreur notification onglets plateforme:', error);
  }
}

self.BG.updateAutomationConfig = async function updateAutomationConfig(data) {
  try {
    const { config, timestamp } = data || {};
    if (!config) throw new Error('Configuration manquante');
    if (typeof config.maxRetryAttempts !== 'number' || config.maxRetryAttempts < 0 || config.maxRetryAttempts > 10) throw new Error('maxRetryAttempts doit être un nombre entre 0 et 10');
    if (typeof config.retryDelay !== 'number' || config.retryDelay < 500 || config.retryDelay > 30000) throw new Error('retryDelay doit être un nombre entre 500 et 30000');
    if (typeof config.timeoutRetryDelay !== 'number' || config.timeoutRetryDelay < 1000 || config.timeoutRetryDelay > 60000) throw new Error('timeoutRetryDelay doit être un nombre entre 1000 et 60000');
    if (typeof config.parallelTabs !== 'number' || config.parallelTabs < 1 || config.parallelTabs > 10) throw new Error('parallelTabs doit être un nombre entre 1 et 10');
    const minimizeWindow = typeof config.minimizeWindow === 'boolean' ? config.minimizeWindow : true;
    const closeWindowOnFinish = typeof config.closeWindowOnFinish === 'boolean' ? config.closeWindowOnFinish : true;
    const configData = { automation_config: { ...config, minimizeWindow, closeWindowOnFinish }, updated_at: timestamp || new Date().toISOString() };
    await chrome.storage.local.set(configData);
    console.log('✅ [BACKGROUND] Configuration automation mise à jour:', config);
    try {
      let pool = await self.BG.getProcessingPool();
      pool = await self.BG.validateAndPrunePool(pool);
      if (pool) {
        pool.capacity = Math.min(10, Math.max(1, config.parallelTabs));
        await self.BG.setProcessingPool(pool);
        console.log('✅ [BACKGROUND] Capacité du pool mise à jour:', pool.capacity);
      }
    } catch (_) {}
    return { success: true, data: { updated: true, config: { ...config, minimizeWindow, closeWindowOnFinish }, timestamp: configData.updated_at } };
  } catch (error) {
    console.error('❌ [BACKGROUND] Erreur mise à jour configuration:', error);
    throw error;
  }
}

self.BG.notifySwissLifeTabs = async function notifySwissLifeTabs(action, data) {
  try {
    const tabs = await chrome.tabs.query({});
    const swissLifeTabs = tabs.filter(tab => tab.url && self.BG.SWISSLIFE_URL_PATTERN.test(tab.url));
    for (const tab of swissLifeTabs) {
      try { await chrome.tabs.sendMessage(tab.id, { action, data, source: 'background' }); } catch (_) {}
    }
  } catch (error) {
    console.error('Erreur lors de la notification des onglets:', error);
  }
}

self.BG.handleMessage = async function handleMessage(message, sender) {
  const { action, data } = message;
  switch (action) {
    case 'CHECK_SWISSLIFE_TAB':
      return await self.BG.checkSwissLifeTab();
    case 'OPEN_SWISSLIFE_TAB':
      return await self.BG.openSwissLifeTab(data);
    case 'SEND_LEADS':
      return await self.BG.sendLeadsToStorage(data);
    case 'UPDATE_LEAD_STATUS':
      return await self.BG.notifyPlatformLeadStatus(data);
    case 'UPDATE_CONFIG':
      return await self.BG.updateAutomationConfig(data);
    case 'GROUP_QUEUE_COMPLETED':
      return await self.BG.handleGroupQueueCompleted(data, sender);
    default:
      throw new Error(`Action inconnue: ${action}`);
  }
}

