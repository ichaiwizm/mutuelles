// Config helpers for background (service worker)
self.BG = self.BG || {};

self.BG.getDeploymentConfigSW = async function getDeploymentConfigSW() {
  try {
    const res = await chrome.storage.local.get(['deployment_config']);
    const cfg = res.deployment_config || {};
    return {
      platformOrigins: Array.isArray(cfg.platformOrigins) && cfg.platformOrigins.length > 0
        ? cfg.platformOrigins
        : self.BG.DEFAULT_DEPLOYMENT_CONFIG.platformOrigins,
      swisslifeBaseUrl: cfg.swisslifeBaseUrl || self.BG.DEFAULT_DEPLOYMENT_CONFIG.swisslifeBaseUrl,
      swisslifeTarifPath: cfg.swisslifeTarifPath || self.BG.DEFAULT_DEPLOYMENT_CONFIG.swisslifeTarifPath
    };
  } catch (_) {
    return { ...self.BG.DEFAULT_DEPLOYMENT_CONFIG };
  }
}

// hostsFromOrigins deprecated (filter by exact origin elsewhere)
