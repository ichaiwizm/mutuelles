/**
 * Configuration centralisée (extension)
 * - Valeurs par défaut embarquées
 * - Possibilité de surcharger via chrome.storage.local.deployment_config
 */

// Load shared defaults into global (module executes and sets self.BG.SHARED_DEFAULTS)
await import(chrome.runtime.getURL('src/shared/shared-config.js'));

const DEFAULTS = (self.BG && self.BG.SHARED_DEFAULTS) || {
  platformOrigins: [
    'http://localhost:5174',
    'https://mutuelles-lead-extractor.vercel.app'
  ],
  swisslifeBaseUrl: 'https://www.swisslifeone.fr',
  swisslifeTarifPath: '/index-swisslifeOne.html#/tarification-et-simulation/slsis'
};

export async function getDeploymentConfig() {
  try {
    const res = await chrome.storage.local.get(['deployment_config']);
    const cfg = res.deployment_config || {};
    return {
      platformOrigins: Array.isArray(cfg.platformOrigins) && cfg.platformOrigins.length > 0
        ? cfg.platformOrigins
        : DEFAULTS.platformOrigins,
      swisslifeBaseUrl: cfg.swisslifeBaseUrl || DEFAULTS.swisslifeBaseUrl,
      swisslifeTarifPath: cfg.swisslifeTarifPath || DEFAULTS.swisslifeTarifPath
    };
  } catch (_) {
    return { ...DEFAULTS };
  }
}

export function getDefaultConfig() {
  return { ...DEFAULTS };
}

export function getDefaultPlatformOrigins() {
  return [...DEFAULTS.platformOrigins];
}

export function getDefaultSwisslifeBaseUrl() {
  return DEFAULTS.swisslifeBaseUrl;
}

export function getDefaultSwisslifeTarifPath() {
  return DEFAULTS.swisslifeTarifPath;
}

export async function isAllowedPlatformOrigin(origin) {
  const cfg = await getDeploymentConfig();
  return (cfg.platformOrigins || []).includes(origin);
}

export function extractHashPathFromTarifPath(tarifPath) {
  // Ex: "/index.html#/tarification-et-simulation/slsis" => "#/tarification-et-simulation/slsis"
  if (!tarifPath) return '#/tarification-et-simulation/slsis';
  const idx = tarifPath.indexOf('#');
  return idx >= 0 ? tarifPath.slice(idx) : '#/tarification-et-simulation/slsis';
}

export function hostFromUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch (_) {
    return null;
  }
}

export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|\[\]\\]/g, '\\$&');
}

// Note: URL builder is centralized in background providers-registry.
