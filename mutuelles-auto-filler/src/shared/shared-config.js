/**
 * Shared defaults accessible from both background (importScripts) and content (dynamic import).
 * This module intentionally exports nothing (no ESM export) so it can be loaded in both contexts.
 * Values are exposed via the global namespace self.BG.SHARED_DEFAULTS.
 */

(function initSharedDefaults(global) {
  try { global.BG = global.BG || {}; } catch (_) { /* ignore */ }
  var defaults = {
    platformOrigins: [
      'http://localhost:5174',
      'https://mutuelles-lead-extractor.vercel.app'
    ],
    swisslifeBaseUrl: 'https://www.swisslifeone.fr',
    swisslifeTarifPath: '/index-swisslifeOne.html#/tarification-et-simulation/slsis',
    retries: {
      attempts: 3,
      delayMs: 1000
    },
    timeouts: {
      extMessageMs: 15000
    },
    window: {
      width: 1000,
      height: 800
    },
    parallelTabs: {
      min: 1,
      max: 10,
      def: 3
    }
  };
  try { global.BG.SHARED_DEFAULTS = defaults; } catch (_) { /* ignore */ }
})(self);

