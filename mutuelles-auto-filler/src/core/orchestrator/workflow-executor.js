/**
 * Exécuteur de workflow - Provider aware
 */

import { processTemplate } from '../template-processor.js';
import { getResolver } from '../dependency-resolver.js';
import { KEYS } from './storage-keys.js';

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
    return DEFAULT_CONFIG;
  } catch (_) {
    return DEFAULT_CONFIG;
  }
}

function prepareWorkflowSteps(workflow, config) {
  return workflow.etapes
    .filter(e => config.SUPPORTED_STEPS.includes(e.name || e.nom))
    .sort((a, b) => (a.order || a.ordre) - (b.order || b.ordre));
}

function checkStepCondition(condition, leadData) {
  if (!condition) return true;
  const conditionResult = processTemplate(condition, leadData);
  return conditionResult && conditionResult !== 'false';
}

async function resolveStepData(etape, leadData, resolver) {
  const stepName = etape.name || etape.nom;
  let stepData = { ...etape.data };

  if (!etape.autoResolve) {
    for (const [key, value] of Object.entries(stepData)) {
      stepData[key] = processTemplate(value, leadData);
    }
    return stepData;
  }

  let resolvedData;
  let resolverContext;

  if (stepName === 'spouseInfo') {
    resolvedData = resolver.resolveSpouse(leadData);
    if (!resolvedData) return null;
    resolverContext = { spouseResolver: resolvedData };
  } else {
    resolvedData = resolver.resolveSubscriber(leadData);
    resolverContext = { resolver: resolvedData };
  }

  for (const [key, value] of Object.entries(stepData)) {
    stepData[key] = processTemplate(value, { ...leadData, ...resolverContext });
  }

  if (etape.validate) {
    const isValid = resolver.validateCombination(
      resolvedData.regime,
      resolvedData.statut,
      resolvedData.profession
    );
    if (!isValid) {
      throw new Error(`❌ Combinaison invalide: ${resolvedData.regime}/${resolvedData.statut}/${resolvedData.profession}`);
    }
  }

  return stepData;
}

async function getExecutorForProvider() {
  const providerId = KEYS.provider();
  const mod = await import(chrome.runtime.getURL('src/providers/registry.js'));
  const adapter = mod.Providers?.[providerId];
  if (!adapter || !adapter.executeAction) throw new Error(`Adapter provider introuvable: ${providerId}`);
  return adapter.executeAction;
}

async function executeStepWithRetry(stepName, serviceData, config, executor) {
  let attempts = 0;
  while (attempts < config.MAX_RETRY_ATTEMPTS) {
    try {
      attempts++;
      const result = await executor(stepName, serviceData);
      if (result.ok) return result;
      const errorMessage = result.error?.message || result.reason || 'Erreur inconnue';
      if (attempts >= config.MAX_RETRY_ATTEMPTS) {
        throw new Error(`Échec étape ${stepName} après ${config.MAX_RETRY_ATTEMPTS} tentatives: ${errorMessage}`);
      } else {
        await new Promise(r => setTimeout(r, config.RETRY_DELAY));
      }
    } catch (error) {
      if (error.message && error.message.includes('Timeout') && attempts < config.MAX_RETRY_ATTEMPTS) {
        await new Promise(r => setTimeout(r, config.TIMEOUT_RETRY_DELAY));
        continue;
      }
      throw error;
    }
  }
}

export async function executeWorkflow(leadData, onProgress = null) {
  const config = await getWorkflowConfig();
  const resolver = await getResolver();
  const executor = await getExecutorForProvider();

  const etapes = prepareWorkflowSteps(leadData.workflow, config);
  if (onProgress) {
    onProgress({ type: 'start', totalSteps: etapes.length, leadName: `${leadData.lead.nom} ${leadData.lead.prenom}` });
  }

  for (let index = 0; index < etapes.length; index++) {
    const etape = etapes[index];
    const stepName = etape.name || etape.nom;

    if (onProgress) {
      onProgress({ type: 'step', currentStep: index + 1, totalSteps: etapes.length, stepName, status: 'in_progress' });
    }

    if (etape.condition && !checkStepCondition(etape.condition, leadData)) continue;

    const stepData = await resolveStepData(etape, leadData, resolver);
    if (stepData === null) continue;

    const serviceData = stepData.value || stepData;
    await executeStepWithRetry(stepName, serviceData, config, executor);
  }

  return { ok: true, completedSteps: etapes.length };
}
