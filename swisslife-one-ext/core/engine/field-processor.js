// Processeur de champs pour l'exécution des plugins
window.SwissLifeFieldProcessor = {

  // Traiter un champ individuel
  process: async (fieldName, fieldConfig, data) => {
    const startTime = Date.now();
    
    try {
      // Obtenir la valeur à injecter
      let value = SwissLifeFieldProcessor.getValue(fieldConfig, data);
      
      // Appliquer une transformation si définie
      if (fieldConfig.transform) {
        value = SwissLifeFieldProcessor.applyTransform(fieldConfig.transform, value, data);
      }

      // Attendre l'élément si nécessaire
      if (fieldConfig.waitFor) {
        await SwissLifeFieldProcessor.waitForField(fieldConfig);
      }

      // Déterminer le sélecteur (avec fallback)
      const selector = fieldConfig.selector;
      const element = fieldConfig.fallbackSelector ? 
        SwissLifeDOM.findElementWithFallback(selector, fieldConfig.fallbackSelector) :
        SwissLifeDOM.q(selector);

      if (!element) {
        throw new Error(`Élément introuvable: ${selector}`);
      }

      // Exécuter l'action selon le type
      let success = false;
      switch (fieldConfig.type) {
        case 'input':
        case 'date':
          success = SwissLifeInteractions.setInputValue(selector, value);
          break;
        case 'select':
          if (fieldConfig.retry) {
            success = await SwissLifeSelectors.setSelectByTextWithRetry(selector, value, {
              logLabel: fieldName,
              contains: fieldConfig.selectByStartsWith
            });
          } else {
            success = SwissLifeSelectors.setSelectByText(selector, value, {
              contains: fieldConfig.selectByStartsWith
            });
          }
          break;
        case 'selectByValue':
          success = SwissLifeSelectors.setSelectByValue(selector, value);
          break;
        case 'radio':
          success = SwissLifeInteractions.clickElement(selector);
          break;
        case 'checkbox':
          success = SwissLifeInteractions.setCheckbox(selector, value);
          break;
        default:
          throw new Error(`Type de champ non supporté: ${fieldConfig.type}`);
      }

      const duration = Date.now() - startTime;
      SwissLifeLoggerCore.logField(fieldName, value, success);
      SwissLifeLoggerCore.debug(`Champ ${fieldName} traité en ${duration}ms`);

      if (!success && fieldConfig.required) {
        throw new Error(`Échec du remplissage du champ requis: ${fieldName}`);
      }

      return success;
    } catch (error) {
      SwissLifeLoggerCore.error(`Erreur lors du traitement du champ ${fieldName}`, { 
        error: error.message,
        fieldConfig 
      });
      throw error;
    }
  },

  // Traiter les champs dynamiques (tableaux)
  processDynamic: async (dynamicConfig, data) => {
    const dataArray = SwissLifeFieldProcessor.getValue({ dataField: dynamicConfig.dataField }, data);
    
    if (!Array.isArray(dataArray)) {
      SwissLifeLoggerCore.debug('Aucune donnée pour les champs dynamiques');
      return;
    }

    // Attendre que les champs dynamiques soient créés après sélection du nombre
    if (dynamicConfig.waitAfterNombreEnfants) {
      SwissLifeLoggerCore.debug(`Attente de ${dynamicConfig.waitAfterNombreEnfants}ms pour création des champs enfants`);
      await new Promise(resolve => setTimeout(resolve, dynamicConfig.waitAfterNombreEnfants));
    }

    for (let index = 0; index < dataArray.length; index++) {
      const selector = dynamicConfig.pattern.replace('{index}', index);
      const value = dataArray[index];
      
      const fieldConfig = {
        selector,
        type: dynamicConfig.type,
        required: dynamicConfig.required
      };

      // Créer un objet de données temporaire avec la valeur à la bonne position
      const tempData = { value };
      const tempFieldConfig = {
        ...fieldConfig,
        dataField: 'value' // Pointer vers la valeur directe
      };
      
      await SwissLifeFieldProcessor.process(`dynamic_${index}`, tempFieldConfig, tempData);
    }
  },

  // Attendre qu'un champ soit prêt
  waitForField: async (fieldConfig) => {
    const { waitFor, selector } = fieldConfig;
    
    switch (waitFor) {
      case 'element':
        SwissLifeLoggerCore.debug(`Attente de l'élément: ${selector}`);
        await SwissLifeWaiters.waitForElement(selector);
        break;
      case 'selectOptions':
        SwissLifeLoggerCore.debug(`Attente des options du select: ${selector}`);
        await SwissLifeWaiters.waitForSelectOptions(selector);
        break;
      default:
        SwissLifeLoggerCore.warn(`Type d'attente non supporté: ${waitFor}`);
    }
  },

  // Obtenir la valeur d'un champ depuis les données
  getValue: (fieldConfig, data) => {
    if (fieldConfig.value !== undefined) {
      return fieldConfig.value; // Valeur statique
    }
    
    if (fieldConfig.dataField) {
      const value = data[fieldConfig.dataField];
      return value !== undefined ? value : '';
    }
    
    return '';
  },

  // Appliquer une transformation
  applyTransform: (transformName, value, data) => {
    const plugin = SwissLifeExecutionEngine.getCurrentPlugin();
    if (!plugin._compiledTransforms || !plugin._compiledTransforms[transformName]) {
      SwissLifeLoggerCore.warn(`Transformation introuvable: ${transformName}`);
      return value;
    }

    try {
      return plugin._compiledTransforms[transformName](value, data);
    } catch (error) {
      SwissLifeLoggerCore.error(`Erreur lors de la transformation ${transformName}`, { 
        error: error.message,
        value 
      });
      return value;
    }
  }
};
