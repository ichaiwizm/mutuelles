// Remplissage automatique simplifié des formulaires SwissLife One
window.SwissLifeFormFiller = {
  
  config: null,

  // Charger la configuration depuis config.json
  loadConfig: async function() {
    if (this.config) return this.config;
    
    try {
      const url = chrome.runtime.getURL('config.json');
      const response = await fetch(url);
      this.config = await response.json();
      return this.config;
    } catch (error) {
      console.error('❌ Erreur chargement config:', error);
      return null;
    }
  },

  // Attendre qu'un élément soit disponible
  waitForElement: function(selector, timeout = 3000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const check = () => {
        const element = document.querySelector(selector);
        if (element && element.offsetParent !== null) {
          resolve(element);
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          console.warn(`⚠️ Timeout: ${selector} non trouvé après ${timeout}ms`);
          resolve(null);
          return;
        }
        
        setTimeout(check, 100);
      };
      
      check();
    });
  },

  // Attendre que les options d'un select soient chargées
  waitForSelectOptions: function(selector, minOptions = 2, timeout = 5000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const check = () => {
        const element = document.querySelector(selector);
        if (element && element.options && element.options.length >= minOptions) {
          resolve(element);
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          console.warn(`⚠️ Timeout: options pour ${selector} non disponibles après ${timeout}ms`);
          resolve(null);
          return;
        }
        
        setTimeout(check, 150);
      };
      
      check();
    });
  },

  // Délai simple
  sleep: function(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // Normaliser le texte pour les comparaisons
  normalizeText: function(text) {
    return (text || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
  },

  // Générer la date d'effet (1er du mois suivant)
  generateNextMonthDate: function() {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(nextMonth.getDate())}/${pad(nextMonth.getMonth() + 1)}/${nextMonth.getFullYear()}`;
  },

  // Obtenir la valeur selon le type
  getValue: function(field, leadData) {
    if (field.value === 'auto_next_month') {
      return this.generateNextMonthDate();
    }
    
    if (typeof field.value === 'string' && leadData[field.value] !== undefined) {
      return leadData[field.value];
    }
    
    return field.value;
  },

  // Vérifier la condition
  checkCondition: function(condition, leadData) {
    if (!condition) return true;
    
    // Condition simple: simulationType === 'couple'
    if (condition === "simulationType === 'couple'") {
      return leadData.simulationType === 'couple';
    }
    
    return true;
  },

  // Remplir un champ selon son type
  fillField: async function(field, leadData) {
    console.log(`🔄 Remplissage: ${field.id}`);
    
    // Vérifier la condition
    if (!this.checkCondition(field.condition, leadData)) {
      console.log(`⏭️ Ignoré (condition): ${field.id}`);
      return true;
    }

    let element;
    let success = false;

    switch (field.type) {
      case 'click':
        element = document.querySelector(field.selector);
        if (element) {
          element.click();
          success = true;
        }
        break;

      case 'conditional_click':
        const selector = leadData[field.condition] === 'couple' ? 
          field.selector_couple : field.selector_individual;
        element = document.querySelector(selector);
        if (element) {
          element.click();
          success = true;
        }
        break;

      case 'input':
        if (field.wait_for_element) {
          element = await this.waitForElement(field.selector);
        } else {
          element = document.querySelector(field.selector);
        }
        
        if (element) {
          const value = this.getValue(field, leadData);
          if (value !== null && value !== undefined) {
            element.focus();
            element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            success = true;
          }
        }
        break;

      case 'select_by_text':
        if (field.wait_for_options) {
          element = await this.waitForSelectOptions(field.selector);
        } else {
          element = document.querySelector(field.selector);
        }
        
        if (element && element.options) {
          const targetText = this.getValue(field, leadData);
          const normalizedTarget = this.normalizeText(targetText);
          
          const option = [...element.options].find(opt => 
            this.normalizeText(opt.textContent) === normalizedTarget
          );
          
          if (option) {
            element.value = option.value;
            element.dispatchEvent(new Event('change', { bubbles: true }));
            success = true;
          }
        }
        break;

      case 'select_by_prefix':
        element = document.querySelector(field.selector);
        if (element && element.options) {
          const sourceValue = leadData[field.value] || '';
          const prefix = sourceValue.slice(0, field.prefix_length);
          
          const option = [...element.options].find(opt => 
            this.normalizeText(opt.textContent).startsWith(this.normalizeText(prefix))
          );
          
          if (option) {
            element.value = option.value;
            element.dispatchEvent(new Event('change', { bubbles: true }));
            success = true;
          }
        }
        break;

      case 'select_by_count':
        element = document.querySelector(field.selector);
        if (element) {
          const array = leadData[field.value] || [];
          element.value = String(array.length);
          element.dispatchEvent(new Event('change', { bubbles: true }));
          success = true;
        }
        break;

      case 'input_array':
        const array = leadData[field.value] || [];
        let arraySuccess = true;
        
        for (let i = 0; i < array.length; i++) {
          const selector = field.selector_pattern.replace('{index}', i);
          element = document.querySelector(selector);
          
          if (element) {
            element.focus();
            element.value = array[i];
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            arraySuccess = false;
          }
          
          if (i < array.length - 1) {
            await this.sleep(field.delay);
          }
        }
        success = arraySuccess;
        break;

      case 'checkbox_check':
        element = document.querySelector(field.selector);
        if (element && !element.checked) {
          element.click();
          success = true;
        } else if (element) {
          success = true; // Déjà coché
        }
        break;

      default:
        console.warn(`⚠️ Type de champ non reconnu: ${field.type}`);
    }

    if (success) {
      console.log(`✅ Réussi: ${field.id}`);
    } else {
      console.warn(`❌ Échec: ${field.id}`);
    }

    return success;
  },

  // Fonction principale de remplissage
  fillFormComplete: async function(leadData) {
    console.log('🚀 Début du remplissage:', leadData.projetNom);
    
    // Charger la configuration
    const config = await this.loadConfig();
    if (!config) {
      console.error('❌ Configuration non chargée');
      return false;
    }

    // Attendre que l'iframe soit prêt
    await this.sleep(1000);

    // Remplir chaque champ séquentiellement
    for (const field of config.fields) {
      await this.fillField(field, leadData);
      await this.sleep(field.delay || config.settings.default_delay);
    }

    console.log('✅ Remplissage terminé:', leadData.projetNom);
    return true;
  },

  // Listener pour les messages postMessage
  setupMessageListener: function() {
    window.addEventListener('message', (event) => {
      if (!event.data || event.data.type !== 'SL_EXT_FILL') return;
      
      console.log('📥 Message reçu dans iframe:', event.data.payload.projetNom);
      this.fillFormComplete(event.data.payload);
    });
    
    console.log('🎧 Iframe prête à recevoir les messages de remplissage');
  }
};