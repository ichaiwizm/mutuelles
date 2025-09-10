// Global namespace for background modules
self.BG = self.BG || {};

// Configuration par défaut (service worker) alimentée par shared-config
self.BG.DEFAULT_DEPLOYMENT_CONFIG = {
  platformOrigins: (self.BG.SHARED_DEFAULTS && self.BG.SHARED_DEFAULTS.platformOrigins) || [
    'http://localhost:5174',
    'https://mutuelles-lead-extractor.vercel.app'
  ],
  swisslifeBaseUrl: (self.BG.SHARED_DEFAULTS && self.BG.SHARED_DEFAULTS.swisslifeBaseUrl) || 'https://www.swisslifeone.fr',
  swisslifeTarifPath: (self.BG.SHARED_DEFAULTS && self.BG.SHARED_DEFAULTS.swisslifeTarifPath) || '/index-swisslifeOne.html#/tarification-et-simulation/slsis'
};

// STORAGE KEYS are provided via SCHEDULER_CONSTANTS and bg/core/storage-keys.js
