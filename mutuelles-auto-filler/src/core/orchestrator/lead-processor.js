/**
 * Processeur de leads - Traitement complet d'un lead individuel
 */

import { getLeadByIndex, isValidLeadIndex } from './lead-manager.js';
import { saveProcessingStatus } from './storage-manager.js';
import { notifyProcessingStart, notifyProcessingSuccess, notifyProcessingError } from './status-notifier.js';
import { executeWorkflow } from './workflow-executor.js';

/**
 * Extrait l'ID et le nom d'un lead de manière sécurisée
 */
function extractLeadInfo(leadData) {
  // L'ID est à la racine du lead, pas dans lead.id
  const leadId = leadData.id;
  const leadName = `${leadData.lead?.nom || 'Inconnu'} ${leadData.lead?.prenom || 'Inconnu'}`;
  
  return { leadId, leadName };
}

/**
 * Valide les données d'un lead avant traitement
 */
function validateLeadData(leadData) {
  const { leadId, leadName } = extractLeadInfo(leadData);
  
  if (!leadId) {
    console.error('❌ Structure du lead sélectionné:', leadData);
    throw new Error('Aucun ID trouvé pour le lead sélectionné');
  }
  
  if (!leadData.workflow || !leadData.workflow.etapes) {
    throw new Error('Workflow manquant ou invalide pour le lead');
  }
  
  return { leadId, leadName };
}

/**
 * Traite un lead par son index
 */
export async function runTestWithLead(leadIndex, onProgress = null) {
  // Validation de l'index
  if (!isValidLeadIndex(leadIndex)) {
    throw new Error(`Index lead invalide: ${leadIndex}`);
  }

  // Récupération du lead
  const selectedLead = getLeadByIndex(leadIndex);
  if (!selectedLead) {
    throw new Error('Aucun lead disponible à cet index');
  }

  // Validation des données du lead
  const { leadId, leadName } = validateLeadData(selectedLead);
  
  console.log('🚀 Démarrage traitement lead:', `${leadName} (ID: ${leadId})`);
  
  // Marquer le lead comme en cours de traitement
  await saveProcessingStatus(leadId, 'processing', {
    leadName: leadName
  });
  
  // Notifier la plateforme du début du traitement
  await notifyProcessingStart(leadId, leadName);
  
  try {
    // Exécuter le workflow
    const result = await executeWorkflow(selectedLead, onProgress);
    
    // Notifier l'UI de la fin du traitement
    if (onProgress) {
      onProgress({
        type: 'complete',
        status: 'success',
        leadName: leadName,
        completedSteps: result.completedSteps
      });
    }
    
    // Sauvegarder le statut de succès
    await saveProcessingStatus(leadId, 'success', {
      leadName: leadName,
      completedSteps: result.completedSteps,
      processedAt: new Date().toISOString()
    });
    
    // Notifier la plateforme du succès
    await notifyProcessingSuccess(leadId, leadName, result.completedSteps);
    
    return result;
    
  } catch (error) {
    console.error('❌ Erreur traitement lead:', error);
    
    // Notifier l'UI de l'erreur
    if (onProgress) {
      onProgress({
        type: 'error',
        status: 'error',
        leadName: leadName,
        errorMessage: error.message
      });
    }
    
    // Sauvegarder le statut d'erreur
    await saveProcessingStatus(leadId, 'error', {
      leadName: leadName,
      errorMessage: error.message,
      failedAt: new Date().toISOString()
    });
    
    // Notifier la plateforme de l'erreur
    await notifyProcessingError(leadId, leadName, error.message);
    
    throw error; // Re-lancer l'erreur pour l'UI
  }
}

/**
 * Traite plusieurs leads en séquence (pour usage futur)
 */
export async function processBatchLeads(leadIndexes, onProgress = null) {
  const results = [];
  
  for (let i = 0; i < leadIndexes.length; i++) {
    const leadIndex = leadIndexes[i];
    
    try {
      const result = await runTestWithLead(leadIndex, (progress) => {
        if (onProgress) {
          onProgress({
            ...progress,
            batchProgress: {
              current: i + 1,
              total: leadIndexes.length
            }
          });
        }
      });
      
      results.push({ leadIndex, success: true, result });
    } catch (error) {
      results.push({ leadIndex, success: false, error: error.message });
    }
  }
  
  return results;
}