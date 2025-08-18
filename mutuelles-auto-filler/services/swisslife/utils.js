// Utilitaires SwissLife
window.SwissLifeUtils = {

  // Délai simple
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // Attente stabilisation DOM
  async waitStable(options = {}) {
    const { minQuiet = 300, maxWait = 5000 } = options;
    let lastChange = Date.now();
    
    const observer = new MutationObserver(() => {
      lastChange = Date.now();
    });
    
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true
    });

    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      if (Date.now() - lastChange >= minQuiet) {
        observer.disconnect();
        return true;
      }
      await this.sleep(50);
    }
    
    observer.disconnect();
    return false;
  },

  // Attendre disparition overlay
  async waitOverlayGone(timeout = 8000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const overlays = document.querySelectorAll(
        '.blockUI, .loading, .overlay, [class*="loading"], [class*="overlay"]'
      );
      
      const visibleOverlays = [...overlays].filter(el => {
        const style = getComputedStyle(el);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0';
      });
      
      if (visibleOverlays.length === 0) {
        return true;
      }
      
      await this.sleep(100);
    }
    
    return false;
  },

  // Activation onglet
  async activateTab(tabConfig) {
    const { selectors, waitAfter } = tabConfig;
    
    for (const selector of selectors) {
      const tab = document.querySelector(selector);
      if (tab && this.isVisible(tab)) {
        console.log(`🔄 Activation onglet: ${selector}`);
        
        tab.click();
        
        if (waitAfter) {
          await this.handleWait(waitAfter);
        }
        
        return true;
      }
    }
    
    console.warn('⚠️ Aucun onglet trouvé:', selectors);
    return false;
  },

  // Gestion générique des attentes
  async handleWait(waitConfig) {
    const { type, minQuiet, maxWait, target } = waitConfig;
    
    switch (type) {
      case 'stable':
        return await this.waitStable({ minQuiet, maxWait });
      
      case 'tabActivation':
        // Géré spécifiquement dans activateTab
        return true;
      
      case 'overlay':
        return await this.waitOverlayGone(maxWait);
      
      case 'delay':
        await this.sleep(waitConfig.delay || 500);
        return true;
      
      default:
        console.warn('Type d\'attente inconnu:', type);
        return true;
    }
  },

  // Normalisation de texte
  normalizeText(text) {
    return (text || '')
      .toString()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  },

  // Vérification visibilité
  isVisible(element) {
    if (!element || !element.isConnected) return false;
    
    let current = element;
    while (current) {
      if (current.hidden || 
          current.getAttribute?.('aria-hidden') === 'true') {
        return false;
      }
      
      const style = getComputedStyle(current);
      if (style.display === 'none' || 
          style.visibility === 'hidden' || 
          style.opacity === '0') {
        return false;
      }
      
      current = current.parentElement;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  },

  // Transformation de valeurs
  transformValue(value, transform) {
    if (!transform) return value;
    
    switch (transform.type) {
      case 'prefix':
        return value.toString().slice(0, transform.length);
      
      case 'arrayLength':
        return Array.isArray(value) ? value.length : 0;
      
      case 'dateFormat':
        // Conversion de format si nécessaire
        return value;
      
      default:
        return value;
    }
  },

  // Obtenir valeur avec alias
  getValueWithAlias(value, aliases) {
    if (!aliases) return value;
    
    // Chercher la valeur directement
    if (aliases[value]) {
      return aliases[value];
    }
    
    // Chercher par correspondance de texte normalisé
    const normalizedValue = this.normalizeText(value);
    
    for (const [key, aliasValue] of Object.entries(aliases)) {
      if (this.normalizeText(key) === normalizedValue) {
        return aliasValue;
      }
    }
    
    return value;
  }
};