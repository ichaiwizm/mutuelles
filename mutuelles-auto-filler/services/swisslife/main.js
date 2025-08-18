// Point d'entrée principal SwissLife
window.SwissLifeMain = {
  
  initialized: false,

  // Initialisation complète
  async init() {
    if (this.initialized) return true;

    console.log('🚀 Initialisation SwissLife');

    // Charger la configuration
    const configLoaded = await SwissLifeEngine.init();
    if (!configLoaded) {
      console.error('❌ Échec chargement configuration');
      return false;
    }

    // Vérifier les dépendances
    const requiredModules = [
      'SwissLifeEngine', 'SwissLifeActions', 
      'SwissLifeSelectors', 'SwissLifeUtils'
    ];
    
    const missing = requiredModules.filter(module => !window[module]);
    if (missing.length > 0) {
      console.error('❌ Modules manquants:', missing);
      return false;
    }

    this.initialized = true;
    console.log('✅ SwissLife initialisé');
    return true;
  },

  // Remplissage automatique
  async fillForm(leadData) {
    if (!this.initialized) {
      const initialized = await this.init();
      if (!initialized) {
        throw new Error('Impossible d\'initialiser SwissLife');
      }
    }

    return await SwissLifeEngine.fill(leadData);
  },

  // Écouter les messages depuis l'extension
  setupMessageListener() {
    window.addEventListener('message', async (event) => {
      if (!event.data || event.data.type !== 'SL_AUTO_FILL') return;
      
      try {
        console.log('📥 Message reçu:', event.data.payload.projetNom);
        await this.fillForm(event.data.payload);
      } catch (error) {
        console.error('❌ Erreur remplissage:', error);
      }
    });
    
    console.log('🎧 Écoute des messages activée');
  },

  // API de test pour debug
  test: {
    async withExampleLead() {
      // Charger example-lead.json pour test
      try {
        const url = chrome.runtime.getURL('services/swisslife/example-lead.json');
        const response = await fetch(url);
        const example = await response.json();
        return await SwissLifeMain.fillForm(example.leadData);
      } catch (error) {
        console.error('❌ Erreur test:', error);
        return false;
      }
    },

    async withCustomData(leadData) {
      return await SwissLifeMain.fillForm(leadData);
    }
  }
};