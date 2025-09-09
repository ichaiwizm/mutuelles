// Global namespace for background modules
self.BG = self.BG || {};

// Patterns par défaut (peuvent être étendus via config)
// Note: URL patterns are provider-specific now; use provider registry helpers.
// Note: URL patterns are provider-specific now; use provider registry helpers.

// Configuration par défaut (service worker ne peut pas utiliser import())
self.BG.DEFAULT_DEPLOYMENT_CONFIG = {
  platformOrigins: [
    'http://localhost:5174',
    'https://mutuelles-lead-extractor.vercel.app'
  ],
  swisslifeBaseUrl: 'https://www.swisslifeone.fr',
  swisslifeTarifPath: '/index-swisslifeOne.html#/tarification-et-simulation/slsis'
};

// Clé de stockage pour le pool multi-onglets réutilisable
self.BG.POOL_KEY = 'processing_pool';

self.BG.RUN_STATE_KEY = 'processing_run_state';
