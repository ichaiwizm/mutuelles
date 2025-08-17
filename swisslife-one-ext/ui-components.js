// Composants d'interface utilisateur pour l'extension SwissLife One
window.SwissLifeUI = {
  
  // État des composants
  state: {
    currentButton: null,
    currentMessage: null,
    autoFillButton: null,
    leadsMenu: null,
    cleanupFunctions: []
  },

  // Nettoyage de tous les éléments UI
  cleanup: () => {
    SwissLifeUtils.removeElements(
      SwissLifeUI.state.currentButton,
      SwissLifeUI.state.currentMessage,
      SwissLifeUI.state.autoFillButton,
      SwissLifeUI.state.leadsMenu
    );
    
    // Nettoyer les event listeners
    SwissLifeUI.state.cleanupFunctions.forEach(fn => fn());
    SwissLifeUI.state.cleanupFunctions = [];
    
    // Réinitialiser l'état
    Object.keys(SwissLifeUI.state).forEach(key => {
      if (key !== 'cleanupFunctions') {
        SwissLifeUI.state[key] = null;
      }
    });
  },

  // Créer le bouton d'accès à la tarification
  createAccessButton: () => {
    if (document.querySelector('#swisslife-ext-button')) {
      return;
    }

    const styles = SwissLifeUtils.getCommonStyles();
    SwissLifeUI.state.currentButton = SwissLifeUtils.createElement('button', 
      `${styles.button}
       position: fixed !important;
       bottom: 30px !important;
       right: 30px !important;
       background: linear-gradient(135deg, #007ACC 0%, #0056a3 100%) !important;
       color: white !important;
       padding: 15px 25px !important;
       border-radius: 50px !important;
       font-size: 16px !important;
       display: block !important;
       visibility: visible !important;
       opacity: 1 !important;`,
      '🚀 Accès Tarification'
    );

    // Effets hover
    SwissLifeUI.state.currentButton.addEventListener('mouseenter', () => {
      SwissLifeUI.state.currentButton.style.transform = 'scale(1.05)';
      SwissLifeUI.state.currentButton.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3) !important';
    });

    SwissLifeUI.state.currentButton.addEventListener('mouseleave', () => {
      SwissLifeUI.state.currentButton.style.transform = 'scale(1)';
      SwissLifeUI.state.currentButton.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2) !important';
    });

    // Action de redirection
    SwissLifeUI.state.currentButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const refreshTime = Date.now();
      const targetUrl = `https://www.swisslifeone.fr/index-swisslifeOne.html#/tarification-et-simulation/slsis?refreshTime=${refreshTime}`;
      window.location.href = targetUrl;
    });

    document.body.appendChild(SwissLifeUI.state.currentButton);

    // Vérification périodique de l'existence
    const cleanup = SwissLifeUtils.ensureElementExists(SwissLifeUI.state.currentButton);
    SwissLifeUI.state.cleanupFunctions.push(cleanup);
  },

  // Créer le bouton de remplissage automatique avec menu
  createAutoFillButton: () => {
    if (document.querySelector('#swisslife-autofill-button')) {
      return;
    }

    const styles = SwissLifeUtils.getCommonStyles();
    
    // Conteneur principal
    const container = SwissLifeUtils.createElement('div', 
      `position: fixed !important;
       top: 20px !important;
       right: 20px !important;
       z-index: 2147483646 !important;`
    );
    container.id = 'swisslife-autofill-container';

    // Bouton principal
    SwissLifeUI.state.autoFillButton = SwissLifeUtils.createElement('button',
      `${styles.button}
       background: linear-gradient(135deg, #28a745 0%, #20803d 100%) !important;
       color: white !important;
       padding: 12px 20px !important;
       border-radius: 25px !important;
       font-size: 14px !important;
       display: flex !important;
       align-items: center !important;
       gap: 8px !important;`
    );
    SwissLifeUI.state.autoFillButton.innerHTML = '📝 Remplir Auto <span style="font-size: 10px;">▼</span>';

    // Menu déroulant
    SwissLifeUI.state.leadsMenu = SwissLifeUtils.createElement('div',
      `${styles.menu}
       top: 50px !important;
       right: 0 !important;
       display: none !important;
       min-width: 250px !important;`
    );

    // Ajouter les options de leads
    SwissLifeUI.populateLeadsMenu();

    // Gestion du toggle du menu
    SwissLifeUI.state.autoFillButton.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = SwissLifeUI.state.leadsMenu.style.display !== 'none';
      SwissLifeUI.state.leadsMenu.style.display = isVisible ? 'none' : 'block';
    });

    // Fermer le menu en cliquant à l'extérieur
    const closeMenu = () => {
      if (SwissLifeUI.state.leadsMenu) {
        SwissLifeUI.state.leadsMenu.style.display = 'none';
      }
    };
    
    const cleanup = SwissLifeUtils.addClickOutsideListener(container, closeMenu);
    SwissLifeUI.state.cleanupFunctions.push(cleanup);

    container.appendChild(SwissLifeUI.state.autoFillButton);
    container.appendChild(SwissLifeUI.state.leadsMenu);
    document.body.appendChild(container);
  },

  // Remplir le menu des leads
  populateLeadsMenu: () => {
    if (!window.SWISSLIFE_LEADS || !SwissLifeUI.state.leadsMenu) return;

    window.SWISSLIFE_LEADS.forEach((lead, index) => {
      const option = SwissLifeUtils.createElement('div',
        `padding: 12px 15px !important;
         cursor: pointer !important;
         border-bottom: 1px solid #f0f0f0 !important;
         transition: background 0.2s !important;
         color: #333 !important;`
      );
      
      // Supprimer la bordure du dernier élément
      if (index === window.SWISSLIFE_LEADS.length - 1) {
        option.style.borderBottom = 'none !important';
      }

      option.innerHTML = `
        <div style="font-weight: bold; font-size: 14px; margin-bottom: 3px;">${lead.nom}</div>
        <div style="font-size: 12px; color: #666;">${lead.description}</div>
      `;

      // Effets hover
      option.addEventListener('mouseenter', () => {
        option.style.background = '#f8f8f8';
      });

      option.addEventListener('mouseleave', () => {
        option.style.background = 'white';
      });

          // Action de sélection du lead
    option.addEventListener('click', () => {
      SwissLifeUI.state.leadsMenu.style.display = 'none';
      SwissLifeUI.sendLeadToIframe(lead.data);
    });

    // Bouton pour activer le mode debug sur ce lead
    const debugBtn = SwissLifeUtils.createElement('button',
      `position: absolute !important;
       right: 5px !important;
       top: 50% !important;
       transform: translateY(-50%) !important;
       background: #333 !important;
       color: white !important;
       border: none !important;
       padding: 2px 6px !important;
       font-size: 10px !important;
       cursor: pointer !important;
       border-radius: 3px !important;`,
      '🔧'
    );
    
    debugBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      SwissLifeAPI.enableDebug();
      SwissLifeUI.state.leadsMenu.style.display = 'none';
      SwissLifeUI.sendLeadToIframe(lead.data);
    });

    option.style.position = 'relative';
    option.appendChild(debugBtn);

      SwissLifeUI.state.leadsMenu.appendChild(option);
    });
  },

  // Envoyer les données du lead à l'iframe
  sendLeadToIframe: (leadData) => {
    if (SwissLifeUtils.sendToIframe(leadData)) {
      SwissLifeUtils.showMessage(`✅ Remplissage envoyé: ${leadData.projetNom}`, 'success');
    }
  },

  // Créer un message temporaire
  createTemporaryMessage: (text, duration = 4000) => {
    SwissLifeUI.state.currentMessage = SwissLifeUtils.createElement('div',
      `${SwissLifeUtils.getCommonStyles().message}
       top: 20px !important;
       right: 20px !important;
       background: #007ACC !important;
       color: white !important;`,
      text
    );

    document.body.appendChild(SwissLifeUI.state.currentMessage);

    setTimeout(() => {
      if (SwissLifeUI.state.currentMessage) {
        SwissLifeUI.state.currentMessage.remove();
        SwissLifeUI.state.currentMessage = null;
      }
    }, duration);
  },

  // Initialiser l'interface selon la page
  initializeForPage: () => {
    SwissLifeUI.cleanup();

    const isHomePage = location.href.includes('#/accueil');
    const isTarificationPage = location.href.includes('#/tarification-et-simulation/slsis');

    if (isHomePage) {
      setTimeout(() => SwissLifeUI.createAccessButton(), 1500);
    } else if (isTarificationPage) {
      setTimeout(() => SwissLifeUI.createAutoFillButton(), 1500);
    } else {
      SwissLifeUI.createTemporaryMessage('Bonjour utilisateur SwissLife One !');
    }
  },

  // Surveillance des changements d'URL
  setupUrlWatcher: () => {
    let lastUrl = location.href;
    
    const checkUrlChange = SwissLifeUtils.debounce(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        SwissLifeUtils.log(`Changement d'URL détecté: ${currentUrl}`, 'info');
        setTimeout(() => SwissLifeUI.initializeForPage(), 1000);
      }
    }, 500);

    setInterval(checkUrlChange, 1000);
    SwissLifeUI.state.cleanupFunctions.push(() => clearInterval(checkUrlChange));
  },

  // Initialisation complète de l'UI
  initialize: () => {
    SwissLifeUtils.log('🖥️ Initialisation de l\'interface utilisateur', 'info');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => SwissLifeUI.initializeForPage(), 1000);
      });
    } else {
      setTimeout(() => SwissLifeUI.initializeForPage(), 1500);
    }

    SwissLifeUI.setupUrlWatcher();
  }
};