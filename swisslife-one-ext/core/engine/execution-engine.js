// Moteur d'exécution principal pour les plugins SwissLife
window.SwissLifeExecutionEngine = {
  
  // État du moteur
  state: {
    currentPlugin: null,
    currentStep: null,
    isRunning: false,
    data: null
  },

  // Exécuter un plugin avec des données
  run: async (pluginName, data) => {
    if (SwissLifeExecutionEngine.state.isRunning) {
      SwissLifeLoggerCore.warn('Une exécution est déjà en cours');
      return false;
    }

    SwissLifeExecutionEngine.state.isRunning = true;
    SwissLifeExecutionEngine.state.data = data;
    
    const startTime = Date.now();
    SwissLifeLoggerCore.info(`🚀 Début d'exécution du plugin: ${pluginName}`, { data: data.projetNom || 'unnamed' });

    try {
      const plugin = await SwissLifePluginLoader.load(pluginName);
      SwissLifeExecutionEngine.state.currentPlugin = plugin;

      // Exécuter chaque étape
      for (const step of plugin.steps) {
        await SwissLifeExecutionEngine.executeStep(step, data);
      }

      const duration = Date.now() - startTime;
      SwissLifeLoggerCore.logTiming(`Plugin ${pluginName}`, duration);
      SwissLifeLoggerCore.info(`✅ Plugin ${pluginName} exécuté avec succès`);
      
      return true;
    } catch (error) {
      SwissLifeLoggerCore.error(`❌ Erreur lors de l'exécution du plugin ${pluginName}`, { 
        error: error.message,
        stack: error.stack 
      });
      return false;
    } finally {
      SwissLifeExecutionEngine.state.isRunning = false;
      SwissLifeExecutionEngine.state.currentPlugin = null;
      SwissLifeExecutionEngine.state.currentStep = null;
    }
  },

  // Exécuter une étape
  executeStep: async (step, data) => {
    SwissLifeExecutionEngine.state.currentStep = step;
    SwissLifeLoggerCore.logStep(step.id, step.name, 'start');

    try {
      // Vérifier la condition d'exécution
      if (step.condition && !SwissLifeExecutionEngine.evaluateCondition(step.condition, data)) {
        SwissLifeLoggerCore.debug(`Étape ${step.id} ignorée (condition non remplie)`, { condition: step.condition });
        return;
      }

      // Exécuter l'action "avant" si définie
      if (step.beforeAction) {
        await SwissLifeExecutionEngine.executeAction(step.beforeAction, data);
        
        // Délai après l'action avant si spécifié
        if (step.beforeActionDelay) {
          SwissLifeLoggerCore.debug(`Attente de ${step.beforeActionDelay}ms après action avant`);
          await new Promise(resolve => setTimeout(resolve, step.beforeActionDelay));
        }
      }

      // Traiter les champs statiques
      if (step.fields) {
        for (const [fieldName, fieldConfig] of Object.entries(step.fields)) {
          await SwissLifeFieldProcessor.process(fieldName, fieldConfig, data);
        }
      }

      // Traiter les champs dynamiques (ex: enfants)
      if (step.dynamicFields) {
        await SwissLifeFieldProcessor.processDynamic(step.dynamicFields, data);
      }

      // Délai après l'étape
      if (step.delay) {
        SwissLifeLoggerCore.debug(`Attente de ${step.delay}ms après étape ${step.id}`);
        await new Promise(resolve => setTimeout(resolve, step.delay));
      }

      SwissLifeLoggerCore.logStep(step.id, step.name, 'success');
    } catch (error) {
      SwissLifeLoggerCore.logStep(step.id, step.name, 'error');
      throw error;
    }
  },

  // Exécuter une action
  executeAction: async (actionName, data) => {
    const plugin = SwissLifeExecutionEngine.state.currentPlugin;
    if (!plugin._compiledActions || !plugin._compiledActions[actionName]) {
      SwissLifeLoggerCore.warn(`Action introuvable: ${actionName}`);
      return;
    }

    try {
      SwissLifeLoggerCore.debug(`Exécution de l'action: ${actionName}`);
      await plugin._compiledActions[actionName](data);
    } catch (error) {
      SwissLifeLoggerCore.error(`Erreur lors de l'action ${actionName}`, { error: error.message });
      throw error;
    }
  },

  // Évaluer une condition
  evaluateCondition: (condition, data) => {
    return SwissLifeConditionEvaluator.evaluate(condition, data);
  },

  // Obtenir le plugin actuel
  getCurrentPlugin: () => SwissLifeExecutionEngine.state.currentPlugin,

  // Obtenir l'état actuel
  getState: () => ({ ...SwissLifeExecutionEngine.state }),

  // Arrêter l'exécution en cours
  stop: () => {
    if (SwissLifeExecutionEngine.state.isRunning) {
      SwissLifeLoggerCore.warn('Arrêt forcé de l\'exécution');
      SwissLifeExecutionEngine.state.isRunning = false;
    }
  }
};
