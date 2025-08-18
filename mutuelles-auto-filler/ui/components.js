// Interface utilisateur simplifiée pour l'extension SwissLife One
window.SwissLifeUI = {
  
  state: {
    autoFillButton: null,
    leadsMenu: null,
    container: null
  },

  // Nettoyage des éléments UI
  cleanup: () => {
    if (SwissLifeUI.state.container) {
      SwissLifeUI.state.container.remove();
    }
    Object.keys(SwissLifeUI.state).forEach(key => {
      SwissLifeUI.state[key] = null;
    });
  },

  // Créer le bouton de remplissage automatique avec menu
  createAutoFillButton: () => {
    if (document.querySelector('#swisslife-autofill-container')) {
      return;
    }

    // Conteneur principal
    SwissLifeUI.state.container = SwissLifeUtils.createElement('div', 
      `position: fixed !important;
       top: 20px !important;
       right: 20px !important;
       z-index: 2147483646 !important;`
    );
    SwissLifeUI.state.container.id = 'swisslife-autofill-container';

    // Bouton principal
    SwissLifeUI.state.autoFillButton = SwissLifeUtils.createElement('button',
      `border: none !important;
       background: linear-gradient(135deg, #28a745 0%, #20803d 100%) !important;
       color: white !important;
       padding: 12px 20px !important;
       border-radius: 25px !important;
       font-size: 14px !important;
       cursor: pointer !important;
       box-shadow: 0 4px 15px rgba(0,0,0,0.2) !important;
       transition: all 0.3s ease !important;
       display: flex !important;
       align-items: center !important;
       gap: 8px !important;
       font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;`
    );
    SwissLifeUI.state.autoFillButton.innerHTML = '📝 Remplir Auto <span style="font-size: 10px;">▼</span>';

    // Menu déroulant
    SwissLifeUI.state.leadsMenu = SwissLifeUtils.createElement('div',
      `position: absolute !important;
       top: 50px !important;
       right: 0 !important;
       background: white !important;
       border: 1px solid #ddd !important;
       border-radius: 8px !important;
       box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
       display: none !important;
       min-width: 250px !important;
       max-height: 400px !important;
       overflow-y: auto !important;
       z-index: 2147483647 !important;`
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
    document.addEventListener('click', () => {
      if (SwissLifeUI.state.leadsMenu) {
        SwissLifeUI.state.leadsMenu.style.display = 'none';
      }
    });

    SwissLifeUI.state.container.appendChild(SwissLifeUI.state.autoFillButton);
    SwissLifeUI.state.container.appendChild(SwissLifeUI.state.leadsMenu);
    document.body.appendChild(SwissLifeUI.state.container);
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
         color: #333 !important;
         font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;`
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
        option.style.background = '#f8f8f8 !important';
      });

      option.addEventListener('mouseleave', () => {
        option.style.background = 'white !important';
      });

      // Action de sélection du lead
      option.addEventListener('click', () => {
        SwissLifeUI.state.leadsMenu.style.display = 'none';
        SwissLifeUI.sendLeadToIframe(lead.data);
      });

      SwissLifeUI.state.leadsMenu.appendChild(option);
    });
  },

  // Envoyer les données du lead à l'iframe
  sendLeadToIframe: (leadData) => {
    if (SwissLifeUtils.sendToIframe(leadData)) {
      SwissLifeUtils.showMessage(`✅ Remplissage envoyé: ${leadData.projetNom}`, 'success');
    }
  },

  // Initialisation de l'interface
  initialize: () => {
    console.log('🖥️ Initialisation de l\'interface utilisateur');
    
    // Attendre que la page soit prête
    const initUI = () => {
      SwissLifeUI.cleanup();
      setTimeout(() => {
        SwissLifeUI.createAutoFillButton();
      }, 1500);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initUI);
    } else {
      initUI();
    }
  }
};