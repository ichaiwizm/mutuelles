// Script principal de l'extension SwissLife One
// Point d'entrée principal qui orchestre les différents modules

(() => {
  'use strict';

  // Vérification que tous les modules sont chargés
  const requiredModules = ['SwissLifeUtils', 'SwissLifeFormFiller', 'SwissLifeUI'];
  const missingModules = requiredModules.filter(module => !window[module]);
  
  if (missingModules.length > 0) {
    console.error('❌ Modules manquants:', missingModules.join(', '));
    return;
  }

  // Vérification des données de leads
  if (!window.SWISSLIFE_LEADS) {
    console.error('❌ Données de leads non chargées');
    return;
  }

  // Détection du contexte d'exécution
  const isMainFrame = SwissLifeUtils.isMainFrame();
  const isTarifRoute = SwissLifeUtils.isTarifRoute();
  const isTarifIframe = SwissLifeUtils.isTarifIframe();

  SwissLifeUtils.log(`Contexte détecté - Frame principale: ${isMainFrame}, Route tarif: ${isTarifRoute}, Iframe tarif: ${isTarifIframe}`, 'info');

  // BRANCHE 1: Page parente - Interface utilisateur
  if (isMainFrame && isTarifRoute) {
    SwissLifeUtils.log('🖥️ Extension chargée dans page parente', 'info');
    SwissLifeUI.initialize();
  }
  
  // BRANCHE 2: Iframe tarificateur - Remplissage de formulaire
  else if (!isMainFrame && isTarifIframe) {
    SwissLifeUtils.log('📋 Extension chargée dans iframe tarificateur', 'info');
    SwissLifeFormFiller.setupMessageListener();
  }
  
  // BRANCHE 3: Autres contextes - Ne rien faire
  else {
    SwissLifeUtils.log('Contexte non pertinent, extension inactive', 'info');
  }

  // Gestion des erreurs globales pour l'extension
  window.addEventListener('error', (event) => {
    if (event.filename && event.filename.includes('content.js')) {
      SwissLifeUtils.log(`Erreur extension: ${event.message}`, 'error');
    }
  });

  // Nettoyage à la fermeture de la page
  window.addEventListener('beforeunload', () => {
    if (window.SwissLifeUI && typeof SwissLifeUI.cleanup === 'function') {
      SwissLifeUI.cleanup();
    }
  });

  SwissLifeUtils.log('✅ Extension SwissLife One initialisée avec succès', 'success');
})();