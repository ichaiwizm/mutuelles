// Point d'entrée principal - Extension Multi-Services
(() => {
  'use strict';

  console.log('🚀 Initialisation extension mutuelles auto-filler');

  // Attendre le chargement complet
  const initialize = () => {
    // Vérifier les modules essentiels
    const requiredModules = [
      'ServiceRegistry', 
      'MessagingCore', 
      'DataSchema',
      'FieldTypes'
    ];
    
    const missingModules = requiredModules.filter(module => !window[module]);
    if (missingModules.length > 0) {
      console.error('❌ Modules core manquants:', missingModules);
      return;
    }

    // Enregistrer les services disponibles
    if (window.SwissLifeDetector) {
      ServiceRegistry.register(window.SwissLifeDetector);
    }

    // Détecter le service actuel
    const currentService = ServiceRegistry.detectCurrentService();
    
    if (!currentService) {
      console.log('ℹ️ Aucun service détecté, extension inactive');
      return;
    }

    // Initialiser selon le contexte
    const { context } = currentService;
    
    if (context.isMainFrame && context.isTarificationPage) {
      // Interface utilisateur sur la page principale
      console.log('🖥️ Initialisation interface utilisateur');
      if (window.UIComponents) {
        UIComponents.initialize(currentService);
      }
    } 
    else if (context.isTarificationIframe) {
      // Remplissage automatique dans l'iframe
      console.log('📋 Initialisation moteur de remplissage');
      if (window.AutoFillEngine) {
        AutoFillEngine.initialize(currentService);
      }
    }

    console.log('✅ Extension initialisée avec succès');
  };

  // Initialiser quand tout est prêt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    setTimeout(initialize, 100);
  }
})();