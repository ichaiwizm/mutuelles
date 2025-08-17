// API publique unifiée pour l'extension SwissLife
window.SwissLifeAPI = {
  
  // DOM Helpers
  DOM: SwissLifeDOM,
  Waiters: SwissLifeWaiters,
  Interactions: SwissLifeInteractions,
  Selectors: SwissLifeSelectors,
  
  // Engine
  PluginLoader: SwissLifePluginLoader,
  FieldProcessor: SwissLifeFieldProcessor,
  ExecutionEngine: SwissLifeExecutionEngine,
  
  // Logging
  Logger: SwissLifeLoggerCore,
  LoggerStorage: SwissLifeLoggerStorage,
  LoggerUI: SwissLifeLoggerUI,
  
  // Validation
  ValidationSchemas: SwissLifeValidationSchemas,
  ValidationEngine: SwissLifeValidationEngine,
  
  // Méthodes de convenance
  runPlugin: (pluginName, data) => SwissLifeExecutionEngine.run(pluginName, data),
  enableDebug: () => SwissLifeLoggerStorage.enableDebugMode(),
  disableDebug: () => SwissLifeLoggerStorage.disableDebugMode(),
  
  // Alias pour compatibilité
  log: SwissLifeLoggerCore.log,
  debug: SwissLifeLoggerCore.debug,
  info: SwissLifeLoggerCore.info,
  warn: SwissLifeLoggerCore.warn,
  error: SwissLifeLoggerCore.error
};

// Initialisation automatique
SwissLifeLoggerStorage.init();
