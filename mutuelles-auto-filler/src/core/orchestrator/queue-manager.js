/**
 * Gestionnaire de queue - Gestion de la queue de traitement des leads
 */

import { loadLeads } from './lead-manager.js';
import { getQueueState, updateQueueState, markLeadAsProcessed } from './storage-manager.js';

/**
 * Configuration par défaut
 */
const CONFIG = {
  RELOAD_DELAY_SUCCESS: 3000,
  RELOAD_DELAY_ERROR: 5000
};

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
    return null;
  }
  
  const nextLead = leads[queueState.currentIndex];
  console.log(`🎯 Prochain lead à traiter: ${queueState.currentIndex + 1}/${queueState.totalLeads} - ${nextLead.lead?.nom} ${nextLead.lead?.prenom}`);
  
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
  await markLeadAsProcessed(lead.id, 'success');
  
  const queueState = await getQueueState();
  const remaining = queueState.totalLeads - queueState.currentIndex;
  
  console.log('🔍 Debug après markLeadAsProcessed:', { 
    currentIndex: queueState.currentIndex, 
    totalLeads: queueState.totalLeads, 
    remaining: remaining 
  });
  
  if (remaining > 0) {
    console.log(`✅ Lead ${progress.current}/${progress.total} terminé. ${remaining} leads restants.`);
    
    if (onProgress) {
      onProgress({
        type: 'lead_complete',
        leadName: `${lead.lead?.nom} ${lead.lead?.prenom}`,
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
    
    if (onProgress) {
      // Recharger le queueState après markLeadAsProcessed pour avoir le bon compte
      const updatedQueueState = await getQueueState();
      onProgress({
        type: 'queue_complete',
        totalProcessed: updatedQueueState.processedLeads.length
      });
    }
  }
}

/**
 * Gère les erreurs lors du traitement d'un lead
 */
async function handleLeadError(lead, progress, error, onProgress) {
  console.error(`❌ Erreur traitement lead ${progress.current}:`, error);
  
  // Marquer comme erreur
  await markLeadAsProcessed(lead.id, 'error', error.message);
  
  if (onProgress) {
    onProgress({
      type: 'lead_error',
      leadName: `${lead.lead?.nom} ${lead.lead?.prenom}`,
      error: error.message,
      current: progress.current,
      total: progress.total
    });
  }
  
  // Continuer avec le prochain lead même en cas d'erreur
  const queueState = await getQueueState();
  const remaining = queueState.totalLeads - queueState.currentIndex;
  
  if (remaining > 0) {
    scheduleReload(CONFIG.RELOAD_DELAY_ERROR, 'prochain lead après erreur');
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