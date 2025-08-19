// Pont entre orchestrateur et services SwissLife
import nomProjetService from './fields/nom-projet-service.js';
import confortHospitalisationService from './fields/confort-hospitalisation-service.js';
import simulationTypeService from './fields/simulation-type-service.js';
import souscripteurService from './fields/souscripteur-service.js';
import enfantsService from './fields/enfants-service.js';
import conjointService from './fields/conjoint-service.js';
import gammesService from './fields/gammes-service.js';
import dateEffetService from './fields/date-effet-service.js';
import optionsService from './fields/options-service.js';

// Mapping simple action → service (support clés anglaises et françaises)
const SERVICES = {
  // Clés anglaises (nouveau format)
  'projectName': nomProjetService,
  'hospitalComfort': confortHospitalisationService,
  'simulationType': simulationTypeService,
  'subscriberInfo': souscripteurService,
  'spouseInfo': conjointService,
  
  // Clés françaises (ancien format, pour compatibilité)
  'nom-projet': nomProjetService,
  'confort-hospitalisation': confortHospitalisationService,
  'simulation-type': simulationTypeService,
  'souscripteur': souscripteurService,
  'enfants': enfantsService,
  'conjoint': conjointService,
  'gammes': gammesService,
  'date-effet': dateEffetService,
  'options': optionsService
};

// Interface unifiée pour exécuter une action SwissLife
export async function executeSwissLifeAction(action, data) {
  console.log('🔧 Bridge - Exécution action:', action, data);
  
  // Si on est dans le frame principal, envoyer à l'iframe
  if (window === window.top) {
    console.log('📨 Envoi commande à l\'iframe...');
    const { sendToIframe } = await import('../../src/core/iframe-bridge.js');
    return await sendToIframe(action, data);
  }
  
  // Si on est dans l'iframe, exécuter directement
  const service = SERVICES[action];
  if (!service) {
    throw new Error(`Service ${action} inexistant`);
  }
  
  // Détecter la méthode disponible (set, fill, etc.)
  const method = service.set || service.fill;
  if (!method) {
    throw new Error(`Service ${action} n'a pas de méthode set() ou fill()`);
  }
  
  try {
    const result = await method(data);
    console.log('🎯 Bridge - Résultat service:', result);
    return result;
  } catch (error) {
    console.error('❌ Bridge - Erreur service:', error);
    throw error;
  }
}

// Export des services disponibles pour debug
export function listAvailableServices() {
  return Object.keys(SERVICES);
}