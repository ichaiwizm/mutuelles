/**
 * Constants et clés pour le scheduler refactorisé
 */

self.BG = self.BG || {};

self.BG.SCHEDULER_CONSTANTS = {
  STORAGE_KEYS: {
    POOL: 'pool_state',
    RUN_STATE: 'run_state', 
    ISOLATED_GROUPS: 'isolated_groups'
  },

  CONFIG: {
    MAX_PARALLEL_TABS: (self.BG.SHARED_DEFAULTS && self.BG.SHARED_DEFAULTS.parallelTabs?.max) || 10,
    MIN_PARALLEL_TABS: (self.BG.SHARED_DEFAULTS && self.BG.SHARED_DEFAULTS.parallelTabs?.min) || 1,
    DEFAULT_PARALLEL_TABS: (self.BG.SHARED_DEFAULTS && self.BG.SHARED_DEFAULTS.parallelTabs?.def) || 3,
    RETRY_ATTEMPTS: (self.BG.SHARED_DEFAULTS && self.BG.SHARED_DEFAULTS.retries?.attempts) || 3,
    RETRY_DELAY: (self.BG.SHARED_DEFAULTS && self.BG.SHARED_DEFAULTS.retries?.delayMs) || 1000,
    WINDOW_WIDTH: (self.BG.SHARED_DEFAULTS && self.BG.SHARED_DEFAULTS.window?.width) || 1000,
    WINDOW_HEIGHT: (self.BG.SHARED_DEFAULTS && self.BG.SHARED_DEFAULTS.window?.height) || 800,
    MESSAGE_TIMEOUT_MS: (self.BG.SHARED_DEFAULTS && self.BG.SHARED_DEFAULTS.timeouts?.extMessageMs) || 15000,
    TAB_CYCLE_INTERVAL_MS: 1000
  },

  RUN_STATUS: {
    PENDING: 'pending',
    RUNNING: 'running', 
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    ERROR: 'error'
  },

  TAB_STATUS: {
    IDLE: 'idle',
    ASSIGNED: 'assigned',
    PROCESSING: 'processing'
  }
};
