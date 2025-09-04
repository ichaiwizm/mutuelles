// Global namespace for background modules
self.BG = self.BG || {};

// Patterns par défaut (peuvent être étendus via config)
self.BG.SWISSLIFE_URL_PATTERN = /swisslifeone\.fr.*\/tarification-et-simulation\/slsis/;
self.BG.SWISSLIFE_URL_PATTERN_LOOSE = /swisslifeone\.fr/; // Pattern plus permissif pour debug

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
self.BG.POOL_KEY = 'swisslife_processing_pool';

