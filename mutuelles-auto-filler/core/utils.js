// Fonctions utilitaires pour l'extension SwissLife One
window.SwissLifeUtils = {
  
  // Détection du contexte d'exécution
  isMainFrame: () => window === window.top,
  
  isTarifRoute: () => 
    location.href.includes('#/tarification-et-simulation/slsis') ||
    location.href.includes('#/accueil'),
    
  isTarifIframe: () => 
    window.name === 'iFrameTarificateur' ||
    (location.hostname.endsWith('swisslifeone.fr') && location.pathname.startsWith('/SLSISWeb')),

  // Fonctions DOM utilitaires
  createElement: (tag, styles, content = '') => {
    const el = document.createElement(tag);
    if (styles) {
      el.style.cssText = styles;
    }
    if (content) {
      if (typeof content === 'string') {
        el.textContent = content;
      } else {
        el.innerHTML = content;
      }
    }
    return el;
  },

  // Styles communs
  getCommonStyles: () => ({
    button: `
      font-family: Arial, sans-serif !important;
      font-weight: bold !important;
      cursor: pointer !important;
      border: none !important;
      transition: all 0.3s ease !important;
      z-index: 2147483647 !important;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2) !important;
    `,
    
    message: `
      position: fixed !important;
      padding: 15px 20px !important;
      border-radius: 8px !important;
      font-family: Arial, sans-serif !important;
      font-size: 14px !important;
      z-index: 2147483647 !important;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;
    `,
    
    menu: `
      position: absolute !important;
      background: white !important;
      border: 1px solid #ddd !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
      font-family: Arial, sans-serif !important;
      overflow: hidden !important;
    `
  }),

  // Gestion des messages
  showMessage: (text, type = 'info', duration = 3000) => {
    const colors = {
      success: '#28a745',
      error: '#dc3545',
      warning: '#ffc107',
      info: '#007ACC'
    };
    
    const textColors = {
      success: 'white',
      error: 'white', 
      warning: '#333',
      info: 'white'
    };

    const message = SwissLifeUtils.createElement('div', 
      `${SwissLifeUtils.getCommonStyles().message}
       bottom: 100px !important;
       right: 30px !important;
       background: ${colors[type]} !important;
       color: ${textColors[type]} !important;
       max-width: 300px !important;`,
      text
    );
    
    document.body.appendChild(message);
    
    setTimeout(() => {
      if (message.parentNode) {
        message.remove();
      }
    }, duration);
    
    return message;
  },

  // Communication postMessage
  sendToIframe: (data) => {
    const iframe = document.querySelector('iframe[name="iFrameTarificateur"]');
    if (!iframe || !iframe.contentWindow) {
      SwissLifeUtils.showMessage('❌ Iframe non trouvée<br><small>Attendez le chargement complet</small>', 'error', 5000);
      return false;
    }
    
    console.log('📤 Envoi des données à l\'iframe:', data.projetNom || 'données');
    iframe.contentWindow.postMessage({ type: 'SL_EXT_FILL', payload: data }, '*');
    return true;
  },

  // Gestion des événements
  addClickOutsideListener: (element, callback) => {
    const handler = (e) => {
      if (!element.contains(e.target)) {
        callback();
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  },

  // Debounce pour les événements fréquents
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Vérification périodique d'existence d'élément
  ensureElementExists: (element, parent = document.body, interval = 2000) => {
    const checkInterval = setInterval(() => {
      if (element && !parent.contains(element)) {
        console.warn('Élément disparu, rajout...');
        parent.appendChild(element);
      }
    }, interval);
    return () => clearInterval(checkInterval);
  },

  // Nettoyage des éléments
  removeElements: (...elements) => {
    elements.forEach(el => {
      if (el && el.parentNode) {
        el.remove();
      }
    });
  },

  // Logger avec timestamp
  log: (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const emoji = {
      info: '🔵',
      success: '✅', 
      warning: '⚠️',
      error: '❌'
    };
    console.log(`${emoji[type]} [${timestamp}] ${message}`);
  }
};