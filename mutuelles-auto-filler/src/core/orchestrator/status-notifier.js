/**
 * Gestionnaire de notifications de statut - Communication avec la plateforme
 */

/**
 * Notifie la plateforme du statut d'un lead
 */
export async function notifyPlatformStatus(leadId, status, leadName, details = {}) {
  const TYPE = (self.BG && self.BG.WINDOW_MSG && self.BG.WINDOW_MSG.ORCHESTRATOR_STATUS_UPDATE) || 'ORCHESTRATOR_STATUS_UPDATE';
  try {
    // Envoyer vers le content.js principal via postMessage
    window.top.postMessage({
      type: TYPE,
      action: 'UPDATE_LEAD_STATUS',
      data: {
        leadId,
        status,
        leadName,
        details
      }
    }, window.location.origin);
    
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
