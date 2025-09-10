/**
 * Content-side providers registry
 */

export const Providers = {
  swisslife: {
    id: 'swisslife',
    label: 'Swiss Life',
    matchHost(hostname) {
      return typeof hostname === 'string' && hostname.includes('swisslifeone.fr');
    },
    isTarificateurIframe(href, pathname, name, isMainFrame) {
      // Moins strict: ne dépend pas du name (peut être renommé par iFrameResizer)
      return !isMainFrame
        && href.includes('oav-pool')
        && pathname.includes('SLSISWeb')
        && !pathname.includes('PDFViewer');
    },
    async initMainFrame() {
      const { SwissLifeInitializer } = await import(chrome.runtime.getURL('src/content/swisslife-initializer.js'));
      const initializer = new SwissLifeInitializer();
      await initializer.initialize();
    },
    async initIframe() {
      const { IframeInitializer } = await import(chrome.runtime.getURL('src/content/iframe-initializer.js'));
      const initializer = new IframeInitializer();
      await initializer.initialize();
    },
    async executeAction(stepName, data) {
      // Used by runtime executors when needed
      const { executeSwissLifeAction } = await import(chrome.runtime.getURL('services/swisslife/orchestrator-bridge.js'));
      return await executeSwissLifeAction(stepName, data);
    }
  }
};

export function detectProviderFromLocation() {
  try {
    const hostname = window.location.hostname;
    const port = window.location.port;
    const href = window.location.href;
    const pathname = window.location.pathname;
    const isMainFrame = window === window.top;

    // Check URL param first
    const hash = window.location.hash || '';
    const queryPart = hash.split('?')[1] || '';
    const params = new URLSearchParams(queryPart);
    const pid = params.get('provider');
    if (pid && Providers[pid]) {
      const provider = Providers[pid];
      return { providerId: provider.id, provider };
    }

    // Fallback: match by host for known providers
    for (const [id, provider] of Object.entries(Providers)) {
      if (provider.matchHost(hostname)) {
        return { providerId: id, provider };
      }
    }
  } catch (_) {}
  return { providerId: null, provider: null };
}
