/**
 * Gestionnaire de notifications de statut - Communication avec la plateforme
 */

/**
 * Notifie la plateforme du statut d'un lead
 */
export async function notifyPlatformStatus(leadId, status, leadName, details = {}) {
  
  try {
    // Envoyer vers le content.js principal via postMessage
    window.top.postMessage({
      type: 'ORCHESTRATOR_STATUS_UPDATE',
      action: 'UPDATE_LEAD_STATUS',
      data: {
        leadId,
        status,
        leadName,
        details
      }
    }, '*');
    
    return true;
  } catch (error) {
    console.error('❌ [STATUS-NOTIFIER] Erreur notification plateforme:', error);
    return false;
  }
}

/**
 * Notifie le début du traitement d'un lead
 */
export async function notifyProcessingStart(leadId, leadName, attempt) {
  return await notifyPlatformStatus(leadId, 'processing', leadName, {
    message: attempt ? `Début du traitement (tentative ${attempt})` : 'Début du traitement',
    attempt
  });
}

/**
 * Notifie le succès du traitement d'un lead
 */
export async function notifyProcessingSuccess(leadId, leadName, completedSteps, attempt) {
  return await notifyPlatformStatus(leadId, 'success', leadName, {
    message: attempt ? `Traitement terminé avec succès (tentative ${attempt})` : 'Traitement terminé avec succès',
    completedSteps,
    attempt
  });
}

/**
 * Notifie l'erreur du traitement d'un lead
 */
export async function notifyProcessingError(leadId, leadName, errorMessage, attempt) {
  return await notifyPlatformStatus(leadId, 'error', leadName, {
    message: attempt ? `Erreur lors du traitement (tentative ${attempt})` : 'Erreur lors du traitement',
    errorMessage,
    attempt
  });
}
