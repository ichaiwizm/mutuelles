/**
 * Exécuteur de workflow - Provider aware
 */

import { processTemplate } from '../template-processor.js';
import { getResolver } from '../dependency-resolver.js';
import { KEYS } from './storage-keys.js';

const DEFAULT_STEPS = [
    'projectName', 'hospitalComfort', 'simulationType', 'subscriberInfo', 
    'spouseInfo', 'childrenInfo', 'gammes', 'options', 'dateEffet', 
    'navigation', 'nomProjet', 'bouton-suivant'
];

async function getWorkflowConfig() {
  try {
    const result = await chrome.storage.local.get(['automation_config']);
    const config = result.automation_config;
    if (config) {
      return {
        MAX_RETRY_ATTEMPTS: typeof config.maxRetryAttempts === 'number' ? config.maxRetryAttempts : ((self.BG && self.BG.SHARED_DEFAULTS && self.BG.SHARED_DEFAULTS.retries?.attempts) || 2),
        RETRY_DELAY: typeof config.retryDelay === 'number' ? config.retryDelay : ((self.BG && self.BG.SHARED_DEFAULTS && self.BG.SHARED_DEFAULTS.retries?.delayMs) || 2000),
        TIMEOUT_RETRY_DELAY: typeof config.timeoutRetryDelay === 'number' ? config.timeoutRetryDelay : 3000,
        SUPPORTED_STEPS: DEFAULT_STEPS
      };
    }
    return {
      MAX_RETRY_ATTEMPTS: (self.BG && self.BG.SHARED_DEFAULTS && self.BG.SHARED_DEFAULTS.retries?.attempts) || 2,
      RETRY_DELAY: (self.BG && self.BG.SHARED_DEFAULTS && self.BG.SHARED_DEFAULTS.retries?.delayMs) || 2000,
      TIMEOUT_RETRY_DELAY: 3000,
      SUPPORTED_STEPS: DEFAULT_STEPS
    };
  } catch (_) {
    return {
      MAX_RETRY_ATTEMPTS: (self.BG && self.BG.SHARED_DEFAULTS && self.BG.SHARED_DEFAULTS.retries?.attempts) || 2,
      RETRY_DELAY: (self.BG && self.BG.SHARED_DEFAULTS && self.BG.SHARED_DEFAULTS.retries?.delayMs) || 2000,
      TIMEOUT_RETRY_DELAY: 3000,
      SUPPORTED_STEPS: DEFAULT_STEPS
    };
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

// Fonction pour calculer les dates du mois suivant
function getNextMonthDates() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  
  // Début du mois suivant
  const startDate = new Date(nextMonth);
  
  // Milieu du mois suivant (15)
  const middleDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 15);
  
  // Fin du mois suivant
  const endDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0);
  
  // Formater en DD/MM/YYYY
  const formatDate = (date) => {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };
  
  return {
    start_next_month: formatDate(startDate),
    middle_next_month: formatDate(middleDate),
    end_next_month: formatDate(endDate)
  };
}

async function resolveStepData(etape, leadData, resolver, overrides = null) {
  const stepName = etape.name || etape.nom;
  let stepData = { ...etape.data };

  // Appliquer les overrides (globaux et spécifiques) si disponibles
  if (overrides) {
    if (stepName === 'projectName' && overrides.projectName) {
      // Générer le nom du projet selon l'option choisie
      if (overrides.projectName === 'lead_name') {
        stepData = { value: `Simulation ${leadData.lead.nom} ${leadData.lead.prenom}` };
      } else if (overrides.projectName === 'lead_source') {
        stepData = { value: `${leadData.lead.nom} ${leadData.lead.prenom} - Source Extension` };
      }
    } else if (stepName === 'dateEffet' && overrides.dateEffet) {
      // Calculer la date selon l'option choisie
      const dates = getNextMonthDates();
      const selectedDate = dates[overrides.dateEffet];
      if (selectedDate) {
        stepData = { value: selectedDate };
      }
    } else if (stepName === 'hospitalComfort' && overrides.hospitalComfort) {
      stepData = { value: overrides.hospitalComfort };
    } else if (stepName === 'gammes' && overrides.gammes) {
      stepData = { value: overrides.gammes };
    }
  }

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

  // Récupérer les overrides temporaires si disponibles
  let overrides = null;
  try {
    const storage = await chrome.storage.local.get(['temp_overrides', 'temp_overrides_timestamp']);
    if (storage.temp_overrides && storage.temp_overrides_timestamp) {
      // Vérifier que les overrides ne sont pas trop anciens (30 minutes)
      const age = Date.now() - storage.temp_overrides_timestamp;
      if (age < 30 * 60 * 1000) {
        overrides = storage.temp_overrides;
      }
    }
  } catch (error) {
    console.warn('[WorkflowExecutor] Erreur lors de la récupération des overrides:', error);
  }

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

    const stepData = await resolveStepData(etape, leadData, resolver, overrides);
    if (stepData === null) continue;

    const serviceData = stepData.value || stepData;
    await executeStepWithRetry(stepName, serviceData, config, executor);
  }

  return { ok: true, completedSteps: etapes.length };
}
