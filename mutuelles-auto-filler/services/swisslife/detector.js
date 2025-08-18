// Détecteur pour SwissLife One
window.SwissLifeDetector = {
  
  // Informations du service
  service: {
    id: 'swisslife',
    name: 'SwissLife One',
    domains: ['*.swisslifeone.fr'],
    description: 'Extension pour SwissLife One'
  },

  // Détecter si on est sur SwissLife One
  isSwissLifeSite: () => {
    return location.hostname.includes('swisslifeone.fr');
  },

  // Détecter la page de tarification
  isTarificationPage: () => {
    return location.href.includes('#/tarification-et-simulation/slsis');
  },

  // Détecter l'iframe de tarification
  isTarificationIframe: () => {
    const isIframe = window.self !== window.top;
    return isIframe && location.href.includes('tarification');
  },

  // Test complet de détection
  detect: () => {
    if (!SwissLifeDetector.isSwissLifeSite()) {
      return null;
    }

    const context = {
      service: SwissLifeDetector.service,
      isMainFrame: window.self === window.top,
      isTarificationPage: SwissLifeDetector.isTarificationPage(),
      isTarificationIframe: SwissLifeDetector.isTarificationIframe()
    };

    // Retourner le contexte si pertinent
    if (context.isTarificationPage || context.isTarificationIframe) {
      return context;
    }

    return null;
  }
};