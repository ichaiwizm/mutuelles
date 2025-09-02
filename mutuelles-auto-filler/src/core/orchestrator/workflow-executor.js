/**
 * Exécuteur de workflow - Traitement des étapes d'un workflow
 */

import { processTemplate } from '../template-processor.js';
import { executeSwissLifeAction } from '../../../services/swisslife/orchestrator-bridge.js';
import { getResolver } from '../dependency-resolver.js';

/**
 * Configuration par défaut
 */
const DEFAULT_CONFIG = {
  MAX_RETRY_ATTEMPTS: 2,
  RETRY_DELAY: 2000,
  TIMEOUT_RETRY_DELAY: 3000,
  SUPPORTED_STEPS: [
    'projectName', 'hospitalComfort', 'simulationType', 'subscriberInfo', 
    'spouseInfo', 'childrenInfo', 'gammes', 'options', 'dateEffet', 
    'navigation', 'nomProjet', 'bouton-suivant'
  ]
};

/**
 * Récupère la configuration d'automation depuis chrome.storage
 */
async function getWorkflowConfig() {
  try {
    const result = await chrome.storage.local.get(['automation_config']);
    const config = result.automation_config;
    
    if (config) {
      return {
        MAX_RETRY_ATTEMPTS: config.maxRetryAttempts || DEFAULT_CONFIG.MAX_RETRY_ATTEMPTS,
        RETRY_DELAY: config.retryDelay || DEFAULT_CONFIG.RETRY_DELAY,
        TIMEOUT_RETRY_DELAY: config.timeoutRetryDelay || DEFAULT_CONFIG.TIMEOUT_RETRY_DELAY,
        SUPPORTED_STEPS: DEFAULT_CONFIG.SUPPORTED_STEPS
      };
    }
    
    console.log('🔧 [WORKFLOW] Utilisation config par défaut:', DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  } catch (error) {
    console.error('❌ [WORKFLOW] Erreur récupération config:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Filtre et trie les étapes d'un workflow
 */
function prepareWorkflowSteps(workflow, config) {
  return workflow.etapes
    .filter(e => config.SUPPORTED_STEPS.includes(e.name || e.nom))
    .sort((a, b) => (a.order || a.ordre) - (b.order || b.ordre));
}

/**
 * Vérifie si une condition d'étape est remplie
 */
function checkStepCondition(condition, leadData) {
  if (!condition) return true;
  
  const conditionResult = processTemplate(condition, leadData);
  return conditionResult && conditionResult !== 'false';
}

/**
 * Résout automatiquement les données d'une étape
 */
async function resolveStepData(etape, leadData, resolver) {
  const stepName = etape.name || etape.nom;
  let stepData = { ...etape.data };

  if (!etape.autoResolve) {
    // Traitement normal des templates
    for (const [key, value] of Object.entries(stepData)) {
      stepData[key] = processTemplate(value, leadData);
    }
    return stepData;
  }

  console.log('🔧 Résolution automatique...');
  
  let resolvedData;
  let resolverContext;
  
  if (stepName === 'spouseInfo') {
    // Résolution spécifique pour le conjoint
    resolvedData = resolver.resolveSpouse(leadData);
    if (!resolvedData) {
      console.log('⏭️ Pas de données conjoint, skip étape');
      return null; // Signal pour skip
    }
    resolverContext = { spouseResolver: resolvedData };
    console.log('👫 Données conjoint résolues:', resolvedData);
  } else {
    // Résolution normale pour le souscripteur
    resolvedData = resolver.resolveSubscriber(leadData);
    resolverContext = { resolver: resolvedData };
    console.log('🎯 Données souscripteur résolues:', resolvedData);
  }
  
  // Enrichir les données avec les valeurs résolues
  for (const [key, value] of Object.entries(stepData)) {
    stepData[key] = processTemplate(value, { ...leadData, ...resolverContext });
  }
  
  console.log('🎯 Données finales après template:', stepData);
  
  // Validation si demandée
  if (etape.validate) {
    const isValid = resolver.validateCombination(
      resolvedData.regime, 
      resolvedData.statut, 
      resolvedData.profession
    );
    if (!isValid) {
      throw new Error(`❌ Combinaison invalide: ${resolvedData.regime}/${resolvedData.statut}/${resolvedData.profession}`);
    }
    console.log('✅ Validation réussie');
  }
  
  return stepData;
}

/**
 * Exécute une étape avec retry
 */
async function executeStepWithRetry(stepName, serviceData, config) {
  let attempts = 0;
  
  while (attempts < config.MAX_RETRY_ATTEMPTS) {
    try {
      attempts++;
      console.log(`🔄 Tentative ${attempts}/${config.MAX_RETRY_ATTEMPTS} pour l'étape: ${stepName}`);
      
      const result = await executeSwissLifeAction(stepName, serviceData);
      
      if (result.ok) {
        console.log('✅ Succès étape:', stepName);
        return result;
      } else {
        console.error('❌ Échec étape (tentative ' + attempts + '):', stepName, result);
        const errorMessage = result.error?.message || result.reason || 'Erreur inconnue';
        
        if (attempts >= config.MAX_RETRY_ATTEMPTS) {
          throw new Error(`Échec étape ${stepName} après ${config.MAX_RETRY_ATTEMPTS} tentatives: ${errorMessage}`);
        } else {
          console.log(`⏳ Attendre ${config.RETRY_DELAY}ms avant retry...`);
          await new Promise(resolve => setTimeout(resolve, config.RETRY_DELAY));
        }
      }
    } catch (error) {
      console.error(`❌ Exception étape (tentative ${attempts}):`, stepName, error);
      
      // Si c'est un timeout et qu'on a encore des tentatives, retry
      if (error.message && error.message.includes('Timeout') && attempts < config.MAX_RETRY_ATTEMPTS) {
        console.log(`⏳ Timeout détecté, retry dans ${config.TIMEOUT_RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, config.TIMEOUT_RETRY_DELAY));
        continue;
      }
      
      // Sinon, re-lancer l'erreur
      throw error;
    }
  }
}

/**
 * Exécute un workflow complet
 */
export async function executeWorkflow(leadData, onProgress = null) {
  // Charger la configuration et le résolveur de dépendances
  const config = await getWorkflowConfig();
  const resolver = await getResolver();

  // Préparer les étapes du workflow
  const etapes = prepareWorkflowSteps(leadData.workflow, config);
  
  console.log(`🎯 ${etapes.length} étapes à traiter`);

  // Notifier l'UI du début du traitement
  if (onProgress) {
    onProgress({
      type: 'start',
      totalSteps: etapes.length,
      leadName: `${leadData.lead.nom} ${leadData.lead.prenom}`
    });
  }

  // Traiter chaque étape
  for (let index = 0; index < etapes.length; index++) {
    const etape = etapes[index];
    const stepName = etape.name || etape.nom;
    
    console.log(`📋 Étape ${etape.order || etape.ordre}: ${stepName}`);
    
    // Notifier l'UI de l'étape en cours
    if (onProgress) {
      onProgress({
        type: 'step',
        currentStep: index + 1,
        totalSteps: etapes.length,
        stepName: stepName,
        status: 'in_progress'
      });
    }
    
    // Vérifier condition
    if (etape.condition && !checkStepCondition(etape.condition, leadData)) {
      console.log('⏭️ Condition non remplie, skip étape');
      continue;
    }
    
    // Résoudre les données de l'étape
    const stepData = await resolveStepData(etape, leadData, resolver);
    if (stepData === null) {
      // Skip signalé par la résolution (ex: pas de conjoint)
      continue;
    }
    
    // Exécuter l'action
    console.log('⚡ Exécution action SwissLife...');
    
    // Pour compatibilité avec les anciens services
    const serviceData = stepData.value || stepData;
    
    await executeStepWithRetry(stepName, serviceData, config);
  }

  console.log('🎉 Toutes les étapes terminées avec succès');
  return { ok: true, completedSteps: etapes.length };
}