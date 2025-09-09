// Point d'entrée principal (provider-aware, fenêtre unique + pool d'onglets)
(() => {
  'use strict';

  async function initialize() {
    try {
      const hostname = window.location.hostname;
      const port = window.location.port;
      const href = window.location.href;
      const pathname = window.location.pathname;
      const isMainFrame = (window === window.top);

      // Plateforme ?
      const isPlatform = (hostname === 'localhost' && port === '5174') || hostname === 'mutuelles-lead-extractor.vercel.app';
      if (isMainFrame && isPlatform) {
        const { LocalhostBridge } = await import(chrome.runtime.getURL('src/content/localhost-bridge.js'));
        const { MessageHandler } = await import(chrome.runtime.getURL('src/content/message-handler.js'));
        const messageHandler = new MessageHandler(null, null);
        const bridge = new LocalhostBridge(messageHandler);
        bridge.initialize();
        return;
      }

      // Provider ?
      const { Providers, detectProviderFromLocation } = await import(chrome.runtime.getURL('src/providers/registry.js'));
      const detected = detectProviderFromLocation();
      const provider = detected.provider;

      if (!provider) {
        // Not on a supported provider, ignore silently
        return;
      }

      if (isMainFrame) {
        await provider.initMainFrame();
      } else {
        const isTarif = provider.isTarificateurIframe(href, pathname, window.name, isMainFrame);
        if (isTarif) {
          await provider.initIframe();
        }
      }
    } catch (error) {
      console.error('❌ Erreur initialisation content:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
