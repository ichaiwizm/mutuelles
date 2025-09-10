/**
 * Background storage keys helper, aligned with SCHEDULER_CONSTANTS.
 * Exposes self.BG.STORAGE_KEYS with getters to avoid hard-coded strings.
 */
self.BG = self.BG || {};

self.BG.STORAGE_KEYS = {
  get POOL() { return self.BG.SCHEDULER_CONSTANTS.STORAGE_KEYS.POOL; },
  get RUN_STATE() { return self.BG.SCHEDULER_CONSTANTS.STORAGE_KEYS.RUN_STATE; },
  get ISOLATED_GROUPS() { return self.BG.SCHEDULER_CONSTANTS.STORAGE_KEYS.ISOLATED_GROUPS; }
};

