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
    MAX_PARALLEL_TABS: 10,
    MIN_PARALLEL_TABS: 1,
    DEFAULT_PARALLEL_TABS: 3,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
    WINDOW_WIDTH: 1000,
    WINDOW_HEIGHT: 800
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