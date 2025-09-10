/**
 * Shared storage cleaner for group-scoped keys (provider + groupId suffix).
 * Exposes self.BG.cleanupGroupStorage(provider, groupId) returning removed count.
 */
(function initStorageCleaner(global) {
  try { global.BG = global.BG || {}; } catch(_) { /* ignore */ }

  async function cleanupGroupStorage(provider, groupId) {
    if (!provider || !groupId || groupId === 'default') return 0;
    try {
      const all = await chrome.storage.local.get(null);
      const keys = Object.keys(all).filter(k => k.startsWith(provider + '_') && k.endsWith('__' + groupId));
      if (keys.length > 0) {
        await chrome.storage.local.remove(keys);
      }
      return keys.length;
    } catch (_) {
      return 0;
    }
  }

  try { global.BG.cleanupGroupStorage = cleanupGroupStorage; } catch(_) { /* ignore */ }
})(self);

