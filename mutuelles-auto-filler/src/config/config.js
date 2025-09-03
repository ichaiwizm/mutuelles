/**
 * Configuration centralisée (extension)
 * - Valeurs par défaut embarquées
 * - Possibilité de surcharger via chrome.storage.local.deployment_config
 */

const DEFAULT_CONFIG = {
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
        : DEFAULT_CONFIG.platformOrigins,
      swisslifeBaseUrl: cfg.swisslifeBaseUrl || DEFAULT_CONFIG.swisslifeBaseUrl,
      swisslifeTarifPath: cfg.swisslifeTarifPath || DEFAULT_CONFIG.swisslifeTarifPath
    };
  } catch (_) {
    return { ...DEFAULT_CONFIG };
  }
}

export function getDefaultConfig() {
  return { ...DEFAULT_CONFIG };
}

export function getDefaultPlatformOrigins() {
  return [...DEFAULT_CONFIG.platformOrigins];
}

export function getDefaultSwisslifeBaseUrl() {
  return DEFAULT_CONFIG.swisslifeBaseUrl;
}

export function getDefaultSwisslifeTarifPath() {
  return DEFAULT_CONFIG.swisslifeTarifPath;
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

export async function buildSwissLifeUrlWithGroupId(groupId) {
  const cfg = await getDeploymentConfig();
  const refreshTime = Date.now();
  const base = cfg.swisslifeBaseUrl.replace(/\/$/, '');
  const path = cfg.swisslifeTarifPath.startsWith('/') ? cfg.swisslifeTarifPath : '/' + cfg.swisslifeTarifPath;
  const sep = path.includes('#') ? (path.includes('?') ? '&' : '?') : (path.includes('?') ? '&' : '?');
  return `${base}${path}${sep}refreshTime=${refreshTime}&groupId=${groupId}`;
}

