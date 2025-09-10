// Global namespace for background modules
self.BG = self.BG || {};

// Configuration par défaut (service worker)
self.BG.DEFAULT_DEPLOYMENT_CONFIG = {
  platformOrigins: [
    'http://localhost:5174',
    'https://mutuelles-lead-extractor.vercel.app'
  ],
  swisslifeBaseUrl: 'https://www.swisslifeone.fr',
  swisslifeTarifPath: '/index-swisslifeOne.html#/tarification-et-simulation/slsis'
};

// Alias de clés de stockage (alignés avec SCHEDULER_CONSTANTS)
self.BG.POOL_KEY = 'pool_state';
self.BG.RUN_STATE_KEY = 'run_state';
self.BG.ISOLATED_GROUPS_KEY = 'isolated_groups';
