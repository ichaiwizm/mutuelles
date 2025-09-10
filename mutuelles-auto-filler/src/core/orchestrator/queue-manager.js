/**
 * Gestionnaire de queue - Gestion de la queue de traitement des leads
 */

import { loadLeads } from './lead-manager.js';
import { 
  getQueueState, 
  updateQueueState, 
  markLeadAsProcessed,
  canRetryLead,
  incrementLeadRetryCount,
  clearLeadRetryCount,
  getLeadRetryCount
} from './storage-manager.js';
import { cleanupGroupKeys, KEYS } from './storage-keys.js';

/**
 * Configuration par défaut
 */
const CONFIG = {
  RELOAD_DELAY_SUCCESS: 3000,
  RELOAD_DELAY_ERROR: 5000,
  RELOAD_DELAY_RETRY: 3000
};

/**
 * Vérifie si une erreur justifie un rechargement de page (erreur récupérable)
 */
function isRecoverableError(errorMessage) {
  const recoverablePatterns = [
    // Erreurs DOM/sélecteur
    'Option .* non trouvée',
    'Select .* non trouvé',
    'Élément .* non trouvé',
    'Cannot read property',
    'Cannot read properties',
    'querySelector.*null',
    
    // Erreurs iframe
    'Timeout: pas de réponse de l\'iframe',
    'Iframe .* non trouvé',
    'postMessage.*failed',
    
    // Erreurs de chargement
    'Element not interactable',
    'Element is not clickable',
    'Waiting for .* failed',
    
    // Autres erreurs récupérables
    'Network error',
    'Script error',
    'Failed to execute'
  ];
  
  const message = errorMessage || '';
  const isRecoverable = recoverablePatterns.some(pattern => {
    const regex = new RegExp(pattern, 'i');
    return regex.test(message);
  });
  
  console.log(`🔍 Erreur "${message}" → Récupérable: ${isRecoverable}`);
  
  return isRecoverable;
}

/**
 * Obtient le prochain lead à traiter
 */
export async function getNextLeadToProcess() {
  const leads = await loadLeads();
  const queueState = await getQueueState();
  
  if (!leads || !queueState) {
    return null;
  }
  
  if (queueState.currentIndex >= leads.length) {
    console.log('🎉 Tous les leads ont été traités');
    await updateQueueState({ 
      status: 'completed',
      completedAt: new Date().toISOString()
    });
    
    // Nettoyer les clés de ce groupe si ce n'est pas le groupe par défaut
    const groupId = KEYS.groupId();
    if (groupId !== 'default') {
      console.log('🧹 Nettoyage des clés du groupe:', groupId);
      setTimeout(async () => {
        const cleanedCount = await cleanupGroupKeys(groupId);
        console.log(`✅ ${cleanedCount} clés nettoyées pour le groupe ${groupId}`);
      }, 5000); // Attendre 5s pour laisser l'UI se mettre à jour
    }
    
    return null;
  }
  
  const nextLead = leads[queueState.currentIndex];
  const leadName = `${nextLead.lead?.nom} ${nextLead.lead?.prenom}`;
  
  // Vérifier si c'est un retry
  const retryCount = await getLeadRetryCount(nextLead.id);
  if (retryCount > 0) {
    console.log(`🔄 RETRY Lead ${queueState.currentIndex + 1}/${queueState.totalLeads} - ${leadName} (Tentative ${retryCount + 1})`);
  } else {
    console.log(`🎯 Nouveau lead ${queueState.currentIndex + 1}/${queueState.totalLeads} - ${leadName}`);
  }
  
  return {
    lead: nextLead,
    index: queueState.currentIndex,
    progress: {
      current: queueState.currentIndex + 1,
      total: queueState.totalLeads,
      processed: queueState.processedLeads.length
    }
  };
}

/**
 * Programme le rechargement de la page
 */
function scheduleReload(delay = CONFIG.RELOAD_DELAY_SUCCESS, reason = 'prochain lead') {
  console.log(`🔄 Programmation du rechargement dans ${delay}ms pour ${reason}...`);
  
  setTimeout(() => {
    console.log(`🔄 RECHARGEMENT MAINTENANT - window.location.reload() - ${reason}`);
    
    try {
      window.location.reload(true); // Force reload
      console.log('✅ Rechargement lancé');
    } catch (error) {
      console.error('❌ Erreur rechargement:', error);
      // Fallback
      window.location.href = window.location.href + '?t=' + Date.now();
    }
  }, delay);
}

/**
 * Gère la finalisation d'un lead (succès)
 */
async function handleLeadSuccess(lead, progress, onProgress) {
  const leadName = `${lead.lead?.nom} ${lead.lead?.prenom}`;
  
  // Nettoyer le compteur de retry après succès
  await clearLeadRetryCount(lead.id);
  
  // Marquer le lead comme traité avec succès
  await markLeadAsProcessed(lead.id, 'success');
  
  const queueState = await getQueueState();
  const remaining = queueState.totalLeads - queueState.currentIndex;
  
  console.log(`✅ Lead ${progress.current}/${progress.total} (${leadName}) terminé avec succès!`);
  console.log('🔍 Debug après markLeadAsProcessed:', { 
    currentIndex: queueState.currentIndex, 
    totalLeads: queueState.totalLeads, 
    remaining: remaining 
  });
  
  if (remaining > 0) {
    console.log(`➡️ ${remaining} leads restants.`);
    
    if (onProgress) {
      onProgress({
        type: 'lead_complete',
        leadName: leadName,
        current: progress.current,
        total: progress.total,
        remaining: remaining
      });
    }
    
    scheduleReload(CONFIG.RELOAD_DELAY_SUCCESS, 'prochain lead');
  } else {
    console.log('🎉 Tous les leads ont été traités avec succès !');
    await updateQueueState({ 
      status: 'completed',
      completedAt: new Date().toISOString()
    });
    
    // Nettoyer les clés de ce groupe si ce n'est pas le groupe par défaut
    const groupId = KEYS.groupId();
    if (groupId !== 'default') {
      console.log('🧹 Nettoyage des clés du groupe après succès complet:', groupId);
      setTimeout(async () => {
        const cleanedCount = await cleanupGroupKeys(groupId);
        console.log(`✅ ${cleanedCount} clés nettoyées pour le groupe ${groupId}`);
      }, 5000); // Attendre 5s pour laisser l'UI se mettre à jour
    }
    
    if (onProgress) {
      // Recharger le queueState après markLeadAsProcessed pour avoir le bon compte
      const updatedQueueState = await getQueueState();
      onProgress({
        type: 'queue_complete',
        totalProcessed: updatedQueueState.processedLeads.length
      });
    }

    // Notifier le background que la queue de ce groupe est terminée
    await notifyQueueDone();
  }
}

/**
 * Gère les erreurs lors du traitement d'un lead
 */
async function handleLeadError(lead, progress, error, onProgress) {
  const leadName = `${lead.lead?.nom} ${lead.lead?.prenom}`;
  const errorMessage = error.message || error.toString();
  
  console.error(`❌ Erreur traitement lead ${progress.current} (${leadName}):`, errorMessage);
  
  // Vérifier si c'est une erreur récupérable et si on peut retenter
  const isRecoverable = isRecoverableError(errorMessage);
  const canRetry = await canRetryLead(lead.id);
  
  if (isRecoverable && canRetry) {
    // RETRY: Incrémenter le compteur et recharger la page sans changer currentIndex
    console.log(`🔄 Erreur récupérable pour ${leadName}, tentative de retry...`);
    
    await incrementLeadRetryCount(lead.id);
    
    if (onProgress) {
      onProgress({
        type: 'lead_retry',
        leadName: leadName,
        error: errorMessage,
        current: progress.current,
        total: progress.total,
        attempt: await getLeadRetryCount(lead.id) + 1
      });
    }
    
    // Recharger la page SANS incrémenter currentIndex
    // Le même lead sera retenté après rechargement
    scheduleReload(CONFIG.RELOAD_DELAY_RETRY, `retry ${leadName} après erreur récupérable`);
    
  } else {
    // ABANDON: Marquer comme erreur définitive et passer au suivant
    if (!canRetry) {
      console.log(`❌ ${leadName} - Maximum de tentatives atteint, abandon du lead`);
    } else {
      console.log(`❌ ${leadName} - Erreur non récupérable, abandon du lead`);
    }
    
    // Marquer comme erreur définitive
    await markLeadAsProcessed(lead.id, 'error', errorMessage);
    
    if (onProgress) {
      onProgress({
        type: 'lead_error',
        leadName: leadName,
        error: errorMessage,
        current: progress.current,
        total: progress.total,
        abandoned: true
      });
    }
    
    // Continuer avec le prochain lead
    const queueState = await getQueueState();
    const remaining = queueState.totalLeads - queueState.currentIndex;
    
    if (remaining > 0) {
      scheduleReload(CONFIG.RELOAD_DELAY_ERROR, 'prochain lead après erreur définitive');
    } else {
      // Dernier lead terminé avec erreur → notifier la fin de queue
      try { await updateQueueState({ status: 'completed', completedAt: new Date().toISOString() }); } catch (_) {}
      await notifyQueueDone();
    }
  }
}

/**
 * Traite la queue de leads
 */
export async function processLeadsQueue(leadProcessor, onProgress = null) {
  try {
    await updateQueueState({ status: 'processing' });
    
    const nextItem = await getNextLeadToProcess();
    if (!nextItem) {
      console.log('✅ Queue de traitement terminée');
      if (onProgress) {
        onProgress({
          type: 'queue_complete',
          totalProcessed: (await getQueueState()).processedLeads.length
        });
      }
      // Notifier le background que la queue de ce groupe est terminée
      await notifyQueueDone();
      return { completed: true };
    }
    
    const { lead, index, progress } = nextItem;
    
    console.log(`🚀 Traitement lead ${progress.current}/${progress.total}: ${lead.lead?.nom} ${lead.lead?.prenom}`);
    
    // Notifier la progression de la queue
    if (onProgress) {
      onProgress({
        type: 'queue_progress',
        leadName: `${lead.lead?.nom} ${lead.lead?.prenom}`,
        current: progress.current,
        total: progress.total,
        processed: progress.processed
      });
    }
    
    try {
      // Traiter ce lead via le processeur injecté
      const result = await leadProcessor(index, onProgress);
      
      // Gérer le succès
      await handleLeadSuccess(lead, progress, onProgress);
      
      return result;
      
    } catch (error) {
      // Gérer l'erreur
      await handleLeadError(lead, progress, error, onProgress);
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Erreur traitement queue:', error);
    throw error;
  }
}

async function notifyQueueDone() {
  try {
    const groupId = KEYS.groupId();
    const provider = KEYS.provider();
    await chrome.runtime.sendMessage({
      action: 'QUEUE_DONE',
      data: { provider, groupId }
    });
  } catch (_) { /* ignore */ }
}
