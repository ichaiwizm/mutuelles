// Registre des services disponibles
window.ServiceRegistry = {
  
  services: [],
  currentService: null,

  // Enregistrer un service
  register: (serviceModule) => {
    if (serviceModule && serviceModule.detect) {
      ServiceRegistry.services.push(serviceModule);
      console.log(`📋 Service enregistré: ${serviceModule.service?.name || 'Inconnu'}`);
    }
  },

  // Détecter le service actuel
  detectCurrentService: () => {
    for (const service of ServiceRegistry.services) {
      const detection = service.detect();
      if (detection) {
        ServiceRegistry.currentService = {
          module: service,
          context: detection
        };
        console.log(`✅ Service détecté: ${detection.service.name}`);
        return ServiceRegistry.currentService;
      }
    }
    
    console.log('ℹ️ Aucun service détecté pour cette page');
    return null;
  },

  // Obtenir le service actuel
  getCurrentService: () => {
    return ServiceRegistry.currentService;
  },

  // Charger la configuration d'un service
  loadServiceConfig: async (serviceId) => {
    try {
      const configUrl = chrome.runtime.getURL(`services/${serviceId}/config.json`);
      const response = await fetch(configUrl);
      return await response.json();
    } catch (error) {
      console.error(`❌ Erreur chargement config ${serviceId}:`, error);
      return null;
    }
  },

  // Charger les leads d'un service
  loadServiceLeads: async (serviceId) => {
    try {
      const leadsUrl = chrome.runtime.getURL(`services/${serviceId}/leads.js`);
      // Pour les leads, on utilise un script tag car c'est du JS
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = leadsUrl;
        script.onload = () => {
          // Assume que les leads sont dans window.SERVICE_LEADS
          resolve(window.SERVICE_LEADS || []);
          document.head.removeChild(script);
        };
        script.onerror = reject;
        document.head.appendChild(script);
      });
    } catch (error) {
      console.error(`❌ Erreur chargement leads ${serviceId}:`, error);
      return [];
    }
  }
};