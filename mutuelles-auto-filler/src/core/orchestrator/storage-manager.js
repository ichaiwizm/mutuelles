/**
 * Gestionnaire de stockage - Gestion des opérations chrome.storage
 */

import { KEYS } from './storage-keys.js';

/**
 * Configuration par défaut des retry
 */
const DEFAULT_RETRY_CONFIG = {
  MAX_RETRY_ATTEMPTS: 2, // 2 retry = 3 tentatives total par lead
};

/**
 * Récupère la configuration d'automation depuis chrome.storage
 */
async function getAutomationConfig() {
  try {
    const result = await chrome.storage.local.get(['automation_config']);
    const config = result.automation_config;
    
    if (config && typeof config.maxRetryAttempts === 'number') {
      return {
        MAX_RETRY_ATTEMPTS: config.maxRetryAttempts
      };
    }
    
    console.log('🔧 [STORAGE] Utilisation config par défaut:', DEFAULT_RETRY_CONFIG);
    return DEFAULT_RETRY_CONFIG;
  } catch (error) {
    console.error('❌ [STORAGE] Erreur récupération config:', error);
    return DEFAULT_RETRY_CONFIG;
  }
}

/**
 * Sauvegarde le statut de traitement dans chrome.storage
 */
export async function saveProcessingStatus(leadId, status, details = {}) {
  try {
    const statusKey = KEYS.PROCESSING_STATUS();
    const result = await chrome.storage.local.get([statusKey]);
    const statusHistory = result[statusKey] || {};
    
    statusHistory[leadId] = {
      status,
      timestamp: new Date().toISOString(),
      ...details
    };
    
    await chrome.storage.local.set({ [statusKey]: statusHistory });
    console.log(`💾 Statut sauvegardé pour lead ${leadId} (clé: ${statusKey}):`, status);
  } catch (error) {
    console.error('❌ Erreur sauvegarde statut:', error);
  }
}

/**
 * Récupère l'état de la queue de traitement
 */
export async function getQueueState() {
  try {
    const queueKey = KEYS.QUEUE_STATE();
    const result = await chrome.storage.local.get([queueKey]);
    return result[queueKey] || null;
  } catch (error) {
    console.error('❌ Erreur récupération queue state:', error);
    return null;
  }
}

/**
 * Met à jour l'état de la queue
 */
export async function updateQueueState(updates) {
  try {
    const currentState = await getQueueState();
    if (currentState) {
      const queueKey = KEYS.QUEUE_STATE();
      const newState = { ...currentState, ...updates };
      await chrome.storage.local.set({ [queueKey]: newState });
      console.log('📊 Queue state mise à jour:', newState);
      return newState;
    }
    return null;
  } catch (error) {
    console.error('❌ Erreur mise à jour queue state:', error);
    return null;
  }
}

/**
 * Marque un lead comme traité dans la queue
 */
export async function markLeadAsProcessed(leadId, status = 'success', error = null) {
  const queueState = await getQueueState();
  if (queueState) {
    const processedLeads = [...queueState.processedLeads];
    processedLeads.push({
      leadId,
      status,
      error,
      completedAt: new Date().toISOString()
    });
    
    const updates = {
      processedLeads,
      currentIndex: queueState.currentIndex + 1,
      status: queueState.currentIndex + 1 >= queueState.totalLeads ? 'completed' : 'processing'
    };

    return await updateQueueState(updates);
  }
  return null;
}

/**
 * Récupère le compteur de retry pour un lead spécifique
 */
export async function getLeadRetryCount(leadId) {
  try {
    const retriesKey = KEYS.RETRIES();
    const result = await chrome.storage.local.get([retriesKey]);
    const retries = result[retriesKey] || {};
    return retries[leadId] || 0;
  } catch (error) {
    console.error('❌ Erreur récupération retry count:', error);
    return 0;
  }
}

/**
 * Incrémente le compteur de retry pour un lead
 */
export async function incrementLeadRetryCount(leadId) {
  try {
    const retriesKey = KEYS.RETRIES();
    const result = await chrome.storage.local.get([retriesKey]);
    const retries = result[retriesKey] || {};
    
    retries[leadId] = (retries[leadId] || 0) + 1;
    
    await chrome.storage.local.set({ [retriesKey]: retries });
    console.log(`🔄 Retry count pour lead ${leadId}: ${retries[leadId]}`);
    
    return retries[leadId];
  } catch (error) {
    console.error('❌ Erreur incrémentation retry count:', error);
    return 0;
  }
}

/**
 * Vérifie si un lead peut être retenté
 */
export async function canRetryLead(leadId) {
  const retryCount = await getLeadRetryCount(leadId);
  const config = await getAutomationConfig();
  const canRetry = retryCount < config.MAX_RETRY_ATTEMPTS;
  
  console.log(`🤔 Lead ${leadId} - Tentatives: ${retryCount}/${config.MAX_RETRY_ATTEMPTS}, Peut retry: ${canRetry}`);
  
  return canRetry;
}

/**
 * Remet à zéro le compteur de retry pour un lead (après succès)
 */
export async function clearLeadRetryCount(leadId) {
  try {
    const retriesKey = KEYS.RETRIES();
    const result = await chrome.storage.local.get([retriesKey]);
    const retries = result[retriesKey] || {};
    
    if (retries[leadId]) {
      delete retries[leadId];
      await chrome.storage.local.set({ [retriesKey]: retries });
      console.log(`🧹 Retry count cleared pour lead ${leadId}`);
    }
  } catch (error) {
    console.error('❌ Erreur clear retry count:', error);
  }
}

/**
 * Initialise une nouvelle queue avec les leads donnés
 */
export async function initializeQueue(totalLeads) {
  const queueKey = KEYS.QUEUE_STATE();
  const queueState = {
    status: 'initialized',
    currentIndex: 0,
    totalLeads,
    processedLeads: [],
    createdAt: new Date().toISOString()
  };
  
  await chrome.storage.local.set({ [queueKey]: queueState });
  console.log('📊 Queue initialisée:', queueState);
  return queueState;
}