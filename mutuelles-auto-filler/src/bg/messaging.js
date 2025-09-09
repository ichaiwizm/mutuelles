// Messaging and dispatch (provider-aware)
self.BG = self.BG || {};

self.BG.handleMessage = async function handleMessage(message, sender) {
  const { action, data } = message || {};
  switch (action) {
    case 'PING':
      return { success: true, data: { alive: true } };
    case 'SET_CONFIG': {
      const { automation } = data || {};
      if (automation) {
        const cfg = {
          maxRetryAttempts: Math.min(10, Math.max(0, Number(automation.maxRetryAttempts ?? 2))),
          retryDelay: Math.min(30000, Math.max(500, Number(automation.retryDelay ?? 2000))),
          timeoutRetryDelay: Math.min(60000, Math.max(1000, Number(automation.timeoutRetryDelay ?? 3000))),
          minimizeWindow: automation.minimizeWindow !== false,
          closeWindowOnFinish: automation.closeWindowOnFinish === true,
          parallelTabs: Math.min(10, Math.max(1, Number(automation.parallelTabs ?? 1)))
        };
        await chrome.storage.local.set({ automation_config: cfg });
      }
      return { success: true, data: { updated: true } };
    }
    case 'START_RUN': {
      const result = await self.BG.startRun(data || {});
      return { success: true, data: result };
    }
    case 'GET_RUN_STATE': {
      const summary = await self.BG.getRunStateSummary();
      return { success: true, data: summary };
    }
    case 'CANCEL_RUN': {
      const result = await self.BG.cancelRun();
      return { success: true, data: result };
    }
    case 'GET_ISOLATED_STATE': {
      const summary = await self.BG.getIsolatedSummary();
      return { success: true, data: summary };
    }
    case 'CANCEL_ISOLATED': {
      const result = await self.BG.cancelIsolated(data || {});
      return { success: true, data: result };
    }
    case 'UPDATE_LEAD_STATUS': {
      // Reçu depuis le content script côté provider (SwissLife)
      // On relaie vers les onglets plateforme via le content script localhost
      try {
        const { leadId, status, leadName, details } = data || {};
        const statusUpdate = {
          type: 'LEAD_STATUS_UPDATE',
          leadId: String(leadId || ''),
          status: status || 'pending',
          leadName: String(leadName || ''),
          timestamp: new Date().toISOString(),
          details: details || {}
        };
        await self.BG.notifyPlatformTabs(statusUpdate);
        return { success: true };
      } catch (e) {
        return { success: false, error: e?.message || 'Erreur relais statut' };
      }
    }
    case 'QUEUE_DONE': {
      const result = await self.BG.onQueueDone(data || {}, sender);
      return { success: true, data: result };
    }
    default:
      throw new Error(`Action inconnue: ${action}`);
  }
}

// (optional) helper to broadcast status to platform tabs
self.BG.notifyPlatformTabs = async function notifyPlatformTabs(statusUpdate) {
  try {
    const tabs = await chrome.tabs.query({});
    const cfg = await self.BG.getDeploymentConfigSW();
    const hostSubstrings = self.BG.hostsFromOrigins(cfg.platformOrigins);
    const platformTabs = tabs.filter(tab => tab.url && hostSubstrings.some(h => tab.url.includes(h)));
    for (const tab of platformTabs) {
      try { await chrome.tabs.sendMessage(tab.id, { action: 'FORWARD_STATUS_TO_PLATFORM', data: statusUpdate, source: 'background' }); } catch (_) {}
    }
  } catch (_) {}
}
