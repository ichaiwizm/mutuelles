// Point d'entrée global - Extension mutuelles auto-filler
(() => {
  'use strict';

  console.log('🚀 Extension mutuelles auto-filler');

  // Détection simple du contexte SwissLife
  const isSwissLife = location.hostname.includes('swisslifeone.fr');
  const isTarificationPage = location.href.includes('#/tarification-et-simulation/slsis');
  const isTarificationIframe = window.self !== window.top && 
                               location.href.includes('tarification');

  // Interface utilisateur sur page principale
  if (isSwissLife && window.self === window.top && isTarificationPage) {
    console.log('🖥️ Initialisation interface SwissLife');
    // UI sera ajoutée plus tard
    setTimeout(() => {
      console.log('Interface utilisateur prête');
    }, 1000);
  }
  
  // Moteur de remplissage dans iframe
  else if (isSwissLife && isTarificationIframe) {
    console.log('📋 Initialisation moteur SwissLife');
    
    // Initialiser SwissLife quand tous les modules sont chargés
    const initSwissLife = () => {
      if (window.SwissLifeMain) {
        SwissLifeMain.setupMessageListener();
        console.log('✅ Moteur SwissLife prêt');
      } else {
        setTimeout(initSwissLife, 100);
      }
    };
    
    initSwissLife();
  }

  console.log(`✅ Extension chargée - SwissLife: ${isSwissLife}, Page tarif: ${isTarificationPage}, Iframe: ${isTarificationIframe}`);
})();