/**
 * FocusCycler
 * Active séquentiellement les onglets d'une fenêtre pour éviter le throttling par onglet.
 * Hypothèses: fenêtre visible (state normal) et autorisée à prendre le focus.
 */

self.BG = self.BG || {};

(function initFocusCycler(global) {
  const timers = new Map(); // windowId -> { timer, idx, intervalMs }

  async function cycleOnce(windowId) {
    const state = timers.get(windowId);
    if (!state) return;

    try {
      // S'assurer que la fenêtre est visible et focus (best-effort)
      try { await chrome.windows.update(windowId, { state: 'normal', focused: true }); } catch (_) {}

      const tabs = await chrome.tabs.query({ windowId });
      if (!tabs || tabs.length === 0) return;

      // Restreindre aux onglets encore "actifs":
      // 1) Pool principal (assigned != null)
      // 2) Groupes isolés (tabId existants pour ce windowId)
      let eligible = tabs;
      try {
        const data = await chrome.storage.local.get(['pool_state', 'isolated_groups']);
        const pool = data?.pool_state;
        const isolated = data?.isolated_groups || {};

        const activeIds = new Set();
        if (pool && Array.isArray(pool.tabs)) {
          pool.tabs
            .filter(t => t && t.tabId && t.assigned)
            .forEach(t => activeIds.add(t.tabId));
        }
        for (const g of Object.values(isolated)) {
          try { if (g && g.windowId && g.tabId && g.windowId === windowId) activeIds.add(g.tabId); } catch (_) {}
        }
        if (activeIds.size > 0) {
          eligible = tabs.filter(t => activeIds.has(t.id));
        }
      } catch (_) { /* ignore */ }

      if (!eligible || eligible.length === 0) {
        // Plus rien d'actif → arrêter automatiquement
        stop(windowId);
        return;
      }

      // Tourniquet sur l'index
      state.idx = state.idx % eligible.length;
      const tab = eligible[state.idx];

      try { await chrome.tabs.update(tab.id, { active: true }); } catch (_) {}
      state.idx = (state.idx + 1) % eligible.length;
      timers.set(windowId, state);
    } catch (e) {
      // Fenêtre probablement fermée
      stop(windowId);
    }
  }

  function start(windowId, intervalMs) {
    if (!windowId || timers.has(windowId)) return;
    const ms = Math.max(300, Number(intervalMs) || 1000);
    const state = { idx: 0, intervalMs: ms };
    const timer = setInterval(() => cycleOnce(windowId), ms);
    state.timer = timer;
    timers.set(windowId, state);
  }

  function stop(windowId) {
    const state = timers.get(windowId);
    if (state?.timer) clearInterval(state.timer);
    timers.delete(windowId);
  }

  try { global.BG.FocusCycler = { start, stop }; } catch (_) {}
})(self);
