/**
 * Gestionnaire de navigation SwissLife
 * Gère les redirections automatiques et la navigation SPA
 */

import { KEYS } from '../core/orchestrator/storage-keys.js';

export class NavigationManager {
  constructor(autoExecutionManager) {
    this.autoExecutionManager = autoExecutionManager;
    this.redirectTimeout = null;
    this.hashObserver = null;
    this.lastHash = window.location.hash;
  }

  initialize() {
    console.log('🧭 Initialisation du gestionnaire de navigation SwissLife');
    
    // Auto-redirection initiale
    this.handleAccueilRedirect();
    
    // Écouter les changements de hash (navigation SPA)
    window.addEventListener('hashchange', () => this.onHashChange());
    
    // Observer les changements DOM au cas où la redirection se fait par JS
    this.startHashObserver();
    
    // Nettoyer l'observer après 30 secondes (éviter les fuites mémoire)
    setTimeout(() => this.cleanup(), 30000);
  }

  handleAccueilRedirect() {
    if (window.location.hash === '#/accueil') {
      console.log('🔄 Détection page d\'accueil SwissLife - Redirection automatique dans 3s...');
      
      // Éviter les redirections multiples
      if (this.redirectTimeout) {
        clearTimeout(this.redirectTimeout);
      }
      
      this.redirectTimeout = setTimeout(() => {
        const currentUrl = window.location.href;
        const oldHash = window.location.hash || '';
        const queryPart = oldHash.split('?')[1] || '';
        const newHash = '#/tarification-et-simulation/slsis' + (queryPart ? `?${queryPart}` : '');
        const targetUrl = currentUrl.replace(window.location.hash, newHash);
        
        console.log('🎯 Redirection vers:', targetUrl);
        window.location.href = targetUrl;
        this.redirectTimeout = null;
      }, 3000);
    }
  }

  async onHashChange() {
    // Gérer la redirection depuis /accueil
    this.handleAccueilRedirect();
    
    // Si on arrive sur la bonne page, vérifier l'auto-exécution (ignorer les paramètres après ?)
    const hashWithoutParams = window.location.hash.split('?')[0];
    if (hashWithoutParams === '#/tarification-et-simulation/slsis') {
      console.log('🎯 Navigation vers page tarification - Vérification auto-exécution...');
      
      setTimeout(async () => {
        try {
          // Recharger les leads pour vérifier s'il y en a
          const leadsKey = KEYS.LEADS();
          const currentLeads = await chrome.storage.local.get([leadsKey]);
          
          if (currentLeads[leadsKey] && currentLeads[leadsKey].length > 0) {
            console.log('🤖 Leads détectés après navigation - Lancement auto-exécution...');
            
            // Attendre que la page soit prête
            if (this.autoExecutionManager.isPageReadyForAutoExecution()) {
              await this.autoExecutionManager.startProcessing();
            } else {
              console.log('⏳ Page pas encore prête après navigation...');
            }
          }
        } catch (error) {
          console.error('❌ Erreur auto-exécution après navigation:', error);
        }
      }, 3000); // Attendre 3s pour laisser l'iframe se charger
    }
  }

  startHashObserver() {
    this.hashObserver = setInterval(() => {
      if (window.location.hash !== this.lastHash) {
        this.lastHash = window.location.hash;
        this.handleAccueilRedirect();
      }
    }, 1000);
  }

  cleanup() {
    if (this.hashObserver) {
      clearInterval(this.hashObserver);
      this.hashObserver = null;
    }
    
    if (this.redirectTimeout) {
      clearTimeout(this.redirectTimeout);
      this.redirectTimeout = null;
    }
  }
}
