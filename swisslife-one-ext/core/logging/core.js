// Système de logging modulable - Core
window.SwissLifeLoggerCore = {
  
  // Configuration des niveaux
  LEVELS: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  },

  // Configuration par défaut
  config: {
    level: 1, // INFO par défaut
    enableConsole: true,
    enableUI: false,
    maxLogs: 100
  },

  // Stockage des logs
  logs: [],
  
  // Émojis par niveau
  EMOJIS: {
    0: '🔍', // DEBUG
    1: '🔵', // INFO  
    2: '⚠️', // WARN
    3: '❌'  // ERROR
  },

  // Méthode de log principale
  log: (level, message, context = {}) => {
    if (level < SwissLifeLoggerCore.config.level) return;

    const timestamp = new Date().toLocaleTimeString();
    const emoji = SwissLifeLoggerCore.EMOJIS[level];
    const levelName = Object.keys(SwissLifeLoggerCore.LEVELS)[level];
    
    const logEntry = {
      timestamp,
      level,
      levelName,
      message,
      context,
      emoji
    };

    // Ajouter au stockage interne
    SwissLifeLoggerCore.logs.push(logEntry);
    if (SwissLifeLoggerCore.logs.length > SwissLifeLoggerCore.config.maxLogs) {
      SwissLifeLoggerCore.logs.shift();
    }

    // Affichage console
    if (SwissLifeLoggerCore.config.enableConsole) {
      const consoleMethod = level === 0 ? 'debug' : 
                           level === 1 ? 'log' : 
                           level === 2 ? 'warn' : 'error';
      
      console[consoleMethod](`${emoji} [${timestamp}] ${message}`, context);
    }

    // Mise à jour UI de debug si activée
    if (SwissLifeLoggerCore.config.enableUI && window.SwissLifeLoggerUI) {
      SwissLifeLoggerUI.updateUI(logEntry);
    }
  },

  // Méthodes de logging
  debug: (message, context = {}) => SwissLifeLoggerCore.log(0, message, context),
  info: (message, context = {}) => SwissLifeLoggerCore.log(1, message, context),
  warn: (message, context = {}) => SwissLifeLoggerCore.log(2, message, context),
  error: (message, context = {}) => SwissLifeLoggerCore.log(3, message, context),

  // Méthodes utilitaires pour le debugging
  logStep: (stepId, stepName, status = 'start') => {
    const emoji = status === 'start' ? '▶️' : status === 'success' ? '✅' : '❌';
    SwissLifeLoggerCore.info(`${emoji} Étape: ${stepName}`, { stepId, status });
  },

  logField: (fieldName, value, success = true) => {
    const emoji = success ? '✅' : '❌';
    SwissLifeLoggerCore.debug(`${emoji} Champ: ${fieldName} = ${value}`, { fieldName, value, success });
  },

  logTiming: (operation, duration) => {
    SwissLifeLoggerCore.debug(`⏱️ ${operation} terminé en ${duration}ms`, { operation, duration });
  },

  // Gestion de la configuration
  setLevel: (level) => {
    SwissLifeLoggerCore.config.level = level;
    SwissLifeLoggerStorage.saveConfig();
    SwissLifeLoggerCore.info(`Niveau de log changé vers: ${Object.keys(SwissLifeLoggerCore.LEVELS)[level]}`);
  },

  clearLogs: () => {
    SwissLifeLoggerCore.logs = [];
  }
};
