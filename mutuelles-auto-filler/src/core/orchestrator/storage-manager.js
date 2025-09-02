/**
 * Gestionnaire de stockage - Gestion des opérations chrome.storage
 */

/**
 * Configuration des retry
 */
const RETRY_CONFIG = {
  MAX_RETRY_ATTEMPTS: 1, // 1 retry = 2 tentatives total par lead
};

/**
 * Sauvegarde le statut de traitement dans chrome.storage
 */
export async function saveProcessingStatus(leadId, status, details = {}) {
  try {
    const result = await chrome.storage.local.get(['swisslife_processing_status']);
    const statusHistory = result.swisslife_processing_status || {};
    
    statusHistory[leadId] = {
      status,
      timestamp: new Date().toISOString(),
      ...details
    };
    
    await chrome.storage.local.set({ swisslife_processing_status: statusHistory });
    console.log(`💾 Statut sauvegardé pour lead ${leadId}:`, status);
  } catch (error) {
    console.error('❌ Erreur sauvegarde statut:', error);
  }
}

/**
 * Récupère l'état de la queue de traitement
 */
export async function getQueueState() {
  try {
    const result = await chrome.storage.local.get(['swisslife_queue_state']);
    return result.swisslife_queue_state || null;
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
      const newState = { ...currentState, ...updates };
      await chrome.storage.local.set({ swisslife_queue_state: newState });
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
    const result = await chrome.storage.local.get(['swisslife_lead_retries']);
    const retries = result.swisslife_lead_retries || {};
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
    const result = await chrome.storage.local.get(['swisslife_lead_retries']);
    const retries = result.swisslife_lead_retries || {};
    
    retries[leadId] = (retries[leadId] || 0) + 1;
    
    await chrome.storage.local.set({ swisslife_lead_retries: retries });
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
  const canRetry = retryCount < RETRY_CONFIG.MAX_RETRY_ATTEMPTS;
  
  console.log(`🤔 Lead ${leadId} - Tentatives: ${retryCount}/${RETRY_CONFIG.MAX_RETRY_ATTEMPTS}, Peut retry: ${canRetry}`);
  
  return canRetry;
}

/**
 * Remet à zéro le compteur de retry pour un lead (après succès)
 */
export async function clearLeadRetryCount(leadId) {
  try {
    const result = await chrome.storage.local.get(['swisslife_lead_retries']);
    const retries = result.swisslife_lead_retries || {};
    
    if (retries[leadId]) {
      delete retries[leadId];
      await chrome.storage.local.set({ swisslife_lead_retries: retries });
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
  const queueState = {
    status: 'initialized',
    currentIndex: 0,
    totalLeads,
    processedLeads: [],
    createdAt: new Date().toISOString()
  };
  
  await chrome.storage.local.set({ swisslife_queue_state: queueState });
  console.log('📊 Queue initialisée:', queueState);
  return queueState;
}