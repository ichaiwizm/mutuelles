// Gestion du stockage pour le système de logging
window.SwissLifeLoggerStorage = {
  
  // Initialisation de la configuration
  init: () => {
    const savedConfig = localStorage.getItem('swisslife-logger-config');
    if (savedConfig) {
      try {
        SwissLifeLoggerCore.config = { 
          ...SwissLifeLoggerCore.config, 
          ...JSON.parse(savedConfig) 
        };
      } catch (e) {
        console.warn('Config logger invalide, utilisation des défauts');
      }
    }
  },

  // Sauvegarder la configuration
  saveConfig: () => {
    localStorage.setItem('swisslife-logger-config', JSON.stringify(SwissLifeLoggerCore.config));
  },

  // Activer le mode debug
  enableDebugMode: () => {
    SwissLifeLoggerCore.config.enableUI = true;
    SwissLifeLoggerCore.config.level = 0; // DEBUG
    SwissLifeLoggerStorage.saveConfig();
    
    if (window.SwissLifeLoggerUI) {
      SwissLifeLoggerUI.create();
    }
    
    SwissLifeLoggerCore.info('Mode debug activé');
  },

  // Désactiver le mode debug
  disableDebugMode: () => {
    SwissLifeLoggerCore.config.enableUI = false;
    SwissLifeLoggerCore.config.level = 1; // INFO
    SwissLifeLoggerStorage.saveConfig();
    
    if (window.SwissLifeLoggerUI) {
      SwissLifeLoggerUI.hide();
    }
    
    SwissLifeLoggerCore.info('Mode debug désactivé');
  }
};
