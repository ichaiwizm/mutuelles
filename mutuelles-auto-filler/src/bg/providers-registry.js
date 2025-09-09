// Background provider registry (service worker context)
self.BG = self.BG || {};

self.BG.providersRegistry = {
  // SwissLife adapter (background-side URL builder only)
  swisslife: {
    id: 'swisslife',
    label: 'Swiss Life',
    async buildUrlWithGroupId(groupId) {
      const cfg = await self.BG.getDeploymentConfigSW();
      const base = (cfg.swisslifeBaseUrl || '').replace(/\/$/, '');
      const path = (cfg.swisslifeTarifPath || '').startsWith('/') ? cfg.swisslifeTarifPath : '/' + (cfg.swisslifeTarifPath || '');
      const refreshTime = Date.now();
      const sep = path.includes('?') ? '&' : '?';
      // include provider id to help content bootstrap
      return `${base}${path}${sep}refreshTime=${refreshTime}&provider=swisslife&groupId=${groupId}`;
    },
  }
};

self.BG.getProvider = function getProvider(id) {
  return self.BG.providersRegistry[id] || null;
}

self.BG.defaultProviderOrder = function defaultProviderOrder(providers) {
  // keep incoming order; filter out unknown
  return (providers || []).filter(p => !!self.BG.providersRegistry[p]);
}
