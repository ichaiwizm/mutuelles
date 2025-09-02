/**
 * Orchestrateur principal - Point d'entrée refactorisé
 * 
 * Cette version refactorisée sépare les responsabilités en modules spécialisés :
 * - lead-manager : Gestion des leads
 * - storage-manager : Opérations de stockage
 * - status-notifier : Notifications de statut
 * - queue-manager : Gestion de la queue de traitement
 * - workflow-executor : Exécution des workflows
 * - lead-processor : Traitement complet des leads
 */

// Exports publics - Interface de l'orchestrateur
export { loadLeads, getAvailableLeads } from './lead-manager.js';
export { runTestWithLead } from './lead-processor.js';
export { processLeadsQueue } from './queue-manager.js';
export { initializeQueue } from './storage-manager.js';

// Re-export des fonctions principales pour rétrocompatibilité
import { loadLeads as _loadLeads } from './lead-manager.js';
import { runTestWithLead as _runTestWithLead } from './lead-processor.js';
import { processLeadsQueue as _processLeadsQueue } from './queue-manager.js';

/**
 * Fonction de traitement de queue avec injection de dépendance
 */
export async function processLeadsQueueWithProcessor(onProgress = null) {
  return await _processLeadsQueue(_runTestWithLead, onProgress);
}

// Fonction de compatibilité avec l'ancienne interface
export { processLeadsQueueWithProcessor as processLeadsQueue };