// Moteur de remplissage SwissLife - Version optimisée
window.SwissLifeEngine = {
  
  config: null,
  leadData: null,
  currentSection: null,

  // Initialisation
  async init(configPath = 'config-optimized.json') {
    try {
      const url = chrome.runtime.getURL(`services/swisslife/${configPath}`);
      const response = await fetch(url);
      this.config = await response.json();
      console.log('✅ Configuration SwissLife chargée');
      return true;
    } catch (error) {
      console.error('❌ Erreur chargement config:', error);
      return false;
    }
  },

  // Remplissage principal
  async fill(leadData) {
    if (!this.config) {
      throw new Error('Configuration non chargée');
    }

    this.leadData = leadData;
    console.log('🚀 Début remplissage SwissLife:', leadData.projetNom);

    try {
      // Exécuter les sections dans l'ordre configuré
      for (const workflowItem of this.config.workflow) {
        if (this.shouldExecuteSection(workflowItem)) {
          await this.executeSection(workflowItem.section);
        }
      }

      console.log('✅ Remplissage terminé avec succès');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors du remplissage:', error);
      throw error;
    }
  },

  // Vérifier si une section doit être exécutée
  shouldExecuteSection(workflowItem) {
    if (!workflowItem.conditions) return true;

    return Object.entries(workflowItem.conditions).every(([key, expectedValue]) => {
      const actualValue = this.getValue(key);
      
      // Cas spéciaux
      if (key === 'hasChildren') {
        return (this.leadData.enfantsDOB?.length > 0) === expectedValue;
      }
      
      return actualValue === expectedValue;
    });
  },

  // Exécuter une section
  async executeSection(sectionId) {
    this.currentSection = sectionId;
    const section = this.config.sections[sectionId];
    
    if (!section) {
      console.warn(`⚠️ Section ${sectionId} non trouvée`);
      return;
    }

    console.log(`🔄 Section: ${section.name}`);

    // Activation d'onglet si nécessaire
    if (section.tabActivation) {
      await this.activateTab(section.tabActivation);
    }

    // Attente avant section si configurée
    if (section.waitBefore) {
      await this.handleWait(section.waitBefore);
    }

    // Traiter chaque champ
    for (const field of section.fields) {
      await this.processField(field);
      await this.sleep(this.config.settings.defaultDelay);
    }

    // Attente après section si configurée
    if (section.waitAfter) {
      await this.handleWait(section.waitAfter);
    }

    console.log(`✅ Section ${section.name} terminée`);
  },

  // Traiter un champ
  async processField(field) {
    const element = await this.findElement(field);
    if (!element) {
      console.warn(`⚠️ Élément ${field.id} non trouvé`);
      return false;
    }

    const value = this.getValue(field.dataSource, field);
    if (value === null || value === undefined) {
      console.log(`⏭️ Champ ${field.id} ignoré (pas de valeur)`);
      return true;
    }

    console.log(`🔄 Remplissage ${field.id}: ${value}`);
    
    return await this.executeAction(element, field, value);
  },

  // Trouver un élément
  async findElement(field) {
    return await SwissLifeSelectors.findElement(field);
  },

  // Exécuter une action sur un élément
  async executeAction(element, field, value) {
    const { method, ...options } = field.action;
    
    // Appliquer transformation si configurée
    if (field.transform) {
      value = SwissLifeUtils.transformValue(value, field.transform);
    }
    
    // Appliquer alias si configuré
    if (field.aliases) {
      value = SwissLifeUtils.getValueWithAlias(value, field.aliases);
    }

    switch (method) {
      case 'setValue':
        return await SwissLifeActions.setValue(element, value, options);
      
      case 'humanType':
        return await SwissLifeActions.humanType(element, value, options);
      
      case 'clickSequence':
        // Pour les radios, déterminer l'élément à cliquer
        if (field.type === 'radio') {
          const targetSelector = field.selectors[value]; // oui/non
          const targetElement = document.querySelector(targetSelector);
          return await SwissLifeActions.clickSequence(targetElement || element, value, options);
        }
        return await SwissLifeActions.clickSequence(element, value, options);
      
      case 'pickSelect':
        return await SwissLifeActions.pickSelect(element, value, options);
      
      case 'clickLabel':
        return await SwissLifeActions.clickLabel(element, value, options);
      
      case 'fillArray':
        return await SwissLifeActions.fillArray(field.selectors.pattern, value, options);
      
      default:
        console.warn(`❌ Méthode d'action inconnue: ${method}`);
        return false;
    }
  },

  // Obtenir une valeur depuis les données
  getValue(dataSource, field = null) {
    if (!dataSource) return null;
    
    // Cas spéciaux
    if (dataSource === 'hasChildren') {
      return (this.leadData.enfantsDOB?.length || 0) > 0;
    }
    
    // Valeur par défaut
    if (!this.leadData[dataSource] && field?.defaultValue !== undefined) {
      return field.defaultValue;
    }
    
    return this.leadData[dataSource] || null;
  },

  // Activation d'onglet
  async activateTab(tabConfig) {
    return await SwissLifeUtils.activateTab(tabConfig);
  },

  // Gestion des attentes
  async handleWait(waitConfig) {
    return await SwissLifeUtils.handleWait(waitConfig);
  },

  // Utilitaire de délai
  async sleep(ms) {
    return await SwissLifeUtils.sleep(ms);
  }
};