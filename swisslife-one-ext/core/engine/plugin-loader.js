// Chargeur de plugins SwissLife
window.SwissLifePluginLoader = {
  
  // Cache des plugins
  cache: new Map(),

  // Charger un plugin depuis son fichier JSON
  load: async (pluginName) => {
    if (SwissLifePluginLoader.cache.has(pluginName)) {
      return SwissLifePluginLoader.cache.get(pluginName);
    }

    try {
      let url;
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
        url = chrome.runtime.getURL(`plugins/${pluginName}.json`);
      } else {
        url = `plugins/${pluginName}.json`;
      }

      SwissLifeLoggerCore.debug(`Chargement du plugin: ${pluginName}`, { url });
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const plugin = await response.json();
      
      // Validation du plugin
      const validation = SwissLifeAPI.ValidationEngine.validatePlugin(plugin);
      if (!validation.valid) {
        throw new Error(`Plugin invalide: ${validation.errors.join(', ')}`);
      }

      // Compilation des transformations et actions
      SwissLifePluginLoader.compile(plugin);
      
      SwissLifePluginLoader.cache.set(pluginName, plugin);
      SwissLifeLoggerCore.info(`Plugin ${pluginName} chargé avec succès`, { 
        steps: plugin.steps.length,
        version: plugin.version 
      });
      
      return plugin;
    } catch (error) {
      SwissLifeLoggerCore.error(`Échec du chargement du plugin ${pluginName}`, { error: error.message });
      throw error;
    }
  },

  // Mapper les transformations et actions vers les implémentations pré-compilées
  compile: (plugin) => {
    // Mapper les transformations vers les builtins
    if (plugin.transforms) {
      plugin._compiledTransforms = {};
      Object.entries(plugin.transforms).forEach(([name, code]) => {
        if (SwissLifeBuiltinTransforms[name]) {
          plugin._compiledTransforms[name] = SwissLifeBuiltinTransforms[name];
          SwissLifeLoggerCore.debug(`Transform ${name} mappée vers builtin`);
        } else {
          SwissLifeLoggerCore.warn(`Transform ${name} non trouvée dans les builtins`, { code });
        }
      });
    }

    // Mapper les actions vers les builtins
    if (plugin.actions) {
      plugin._compiledActions = {};
      Object.entries(plugin.actions).forEach(([name, code]) => {
        if (SwissLifeBuiltinActions[name]) {
          plugin._compiledActions[name] = SwissLifeBuiltinActions[name];
          SwissLifeLoggerCore.debug(`Action ${name} mappée vers builtin`);
        } else {
          SwissLifeLoggerCore.warn(`Action ${name} non trouvée dans les builtins`, { code });
        }
      });
    }
  },

  // Vider le cache
  clearCache: () => {
    SwissLifePluginLoader.cache.clear();
    SwissLifeLoggerCore.info('Cache des plugins vidé');
  }
};
