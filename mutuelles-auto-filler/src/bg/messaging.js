// Messaging and dispatch (provider-aware)
self.BG = self.BG || {};

self.BG.handleMessage = async function handleMessage(message, sender) {
  const { action, data } = message || {};
  const A = self.BG.ACTIONS || {};
  const validation = self.BG.validateMessage ? self.BG.validateMessage(action, data) : { ok: true };
  if (!validation.ok) {
    return { success: false, error: validation.error || 'Invalid payload' };
  }
  switch (action) {
    case A.PING:
      return { success: true, data: { alive: true } };
    case A.SET_CONFIG: {
      const { automation } = data || {};
      if (automation) {
        const cfg = {
          maxRetryAttempts: Math.min(10, Math.max(0, Number(automation.maxRetryAttempts ?? 2))),
          retryDelay: Math.min(30000, Math.max(500, Number(automation.retryDelay ?? 2000))),
          timeoutRetryDelay: Math.min(60000, Math.max(1000, Number(automation.timeoutRetryDelay ?? 3000))),
          minimizeWindow: automation.minimizeWindow !== false,
          closeWindowOnFinish: automation.closeWindowOnFinish === true,
          parallelTabs: 1
        };
        await chrome.storage.local.set({ automation_config: cfg });
        // Update logger debug toggle if provided
        if (typeof automation.debug === 'boolean' && self.BG.logger) {
          self.BG.logger.setDebug(automation.debug);
        }
      }
      return { success: true, data: { updated: true } };
    }
    case A.START_RUN: {
      const result = await self.BG.startRun(data || {});
      return { success: true, data: result };
    }
    case A.GET_CONTEXT: {
      try {
        const tabId = sender?.tab?.id;
        if (!tabId) return { success: true, data: { provider: null, groupId: 'default' } };

        // 1) Chercher dans le pool principal
        const pool = await self.BG.getPool();
        const entry = (pool?.tabs || []).find(t => t.tabId === tabId);
        if (entry && entry.assigned) {
          return { success: true, data: { provider: entry.assigned.provider || null, groupId: entry.assigned.groupId || 'default' } };
        }

        // 2) Chercher dans les groupes isolés (stockage)
        try {
          const res = await chrome.storage.local.get(['isolated_groups']);
          const groups = res?.isolated_groups || {};
          for (const [gid, g] of Object.entries(groups)) {
            if ((g && (g).tabId) === tabId) {
              return { success: true, data: { provider: (g).provider || null, groupId: gid } };
            }
          }
        } catch (_) { /* ignore */ }

        // 3) Fallback: essayer de parser l'URL de l'onglet pour extraire groupId
        try {
          const tabs = await chrome.tabs.query({});
          const me = tabs.find(t => t.id === tabId);
          if (me && me.url) {
            const url = new URL(me.url);
            const hash = url.hash || '';
            const qp = hash.split('?')[1] || '';
            const params = new URLSearchParams(qp);
            const gid = params.get('groupId');
            const provider = params.get('provider') || null;
            if (gid) return { success: true, data: { provider, groupId: gid } };
          }
        } catch (_) { /* ignore */ }

        return { success: true, data: { provider: null, groupId: 'default' } };
      } catch (e) {
        return { success: false, error: e?.message || 'GET_CONTEXT failed' };
      }
    }
    // removed: GET_RUN_STATE / CANCEL_RUN / GET_ISOLATED_STATE / CANCEL_ISOLATED
    case A.UPDATE_LEAD_STATUS: {
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
    case A.QUEUE_DONE: {
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
    const allowedOrigins = (cfg.platformOrigins || []).filter(Boolean);
    const platformTabs = tabs.filter(tab => {
      try {
        if (!tab.url) return false;
        const origin = new URL(tab.url).origin;
        return allowedOrigins.includes(origin);
      } catch (_) { return false; }
    });
    for (const tab of platformTabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'FORWARD_STATUS_TO_PLATFORM',
          data: statusUpdate,
          source: 'background'
        });
      } catch (_) { /* ignore */ }
    }
  } catch (_) { /* ignore */ }
}
