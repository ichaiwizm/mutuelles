// Orchestrateur principal - logique + données
import { processTemplate } from './template-processor.js';
import { executeSwissLifeAction } from '../../services/swisslife/orchestrator-bridge.js';
import { getResolver } from './dependency-resolver.js';

let availableLeads = [];

// Charger les leads depuis chrome.storage
export async function loadLeads() {
  try {
    const result = await chrome.storage.local.get(['swisslife_leads']);
    
    if (result.swisslife_leads && Array.isArray(result.swisslife_leads)) {
      availableLeads = result.swisslife_leads;
      console.log('✅ Leads chargés depuis chrome.storage:', availableLeads.length, 'leads');
      
      
      return availableLeads;
    } else {
      availableLeads = [];
      console.log('❌ Aucun lead trouvé dans chrome.storage');
      return [];
    }
  } catch (error) {
    console.error('❌ Erreur chargement leads:', error.message);
    availableLeads = [];
    return [];
  }
}

// Obtenir la liste des leads disponibles
export function getAvailableLeads() {
  return availableLeads;
}

// Sauvegarder le statut de traitement dans chrome.storage
async function saveProcessingStatus(leadId, status, details = {}) {
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

// Récupérer l'état de la queue de traitement
async function getQueueState() {
  try {
    const result = await chrome.storage.local.get(['swisslife_queue_state']);
    return result.swisslife_queue_state || null;
  } catch (error) {
    console.error('❌ Erreur récupération queue state:', error);
    return null;
  }
}

// Mettre à jour l'état de la queue
async function updateQueueState(updates) {
  try {
    const currentState = await getQueueState();
    if (currentState) {
      const newState = { ...currentState, ...updates };
      await chrome.storage.local.set({ swisslife_queue_state: newState });
      console.log('📊 Queue state mise à jour:', newState);
    }
  } catch (error) {
    console.error('❌ Erreur mise à jour queue state:', error);
  }
}

// Marquer un lead comme traité dans la queue
async function markLeadAsProcessed(leadId, status = 'success', error = null) {
  const queueState = await getQueueState();
  if (queueState) {
    const processedLeads = [...queueState.processedLeads];
    processedLeads.push({
      leadId,
      status,
      error,
      completedAt: new Date().toISOString()
    });
    
    await updateQueueState({
      processedLeads,
      currentIndex: queueState.currentIndex + 1,
      status: queueState.currentIndex + 1 >= queueState.totalLeads ? 'completed' : 'processing'
    });
  }
}

// Obtenir le prochain lead à traiter
async function getNextLeadToProcess() {
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

// Traitement de la queue de leads
export async function processLeadsQueue(onProgress = null) {
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
      // Traiter ce lead
      const result = await runTestWithLead(index, onProgress);
      
      // Marquer comme traité avec succès
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
        
        // Programmer le rechargement pour le prochain lead
        console.log('🔄 Programmation du rechargement dans 3s...');
        setTimeout(() => {
          console.log('🔄 RECHARGEMENT MAINTENANT - window.location.reload()');
          
          try {
            window.location.reload(true); // Force reload
            console.log('✅ Rechargement lancé');
          } catch (error) {
            console.error('❌ Erreur rechargement:', error);
            // Fallback
            window.location.href = window.location.href + '?t=' + Date.now();
          }
        }, 3000);
        
      } else {
        console.log('🎉 Tous les leads ont été traités avec succès !');
        await updateQueueState({ 
          status: 'completed',
          completedAt: new Date().toISOString()
        });
        
        if (onProgress) {
          onProgress({
            type: 'queue_complete',
            totalProcessed: queueState.processedLeads.length + 1
          });
        }
      }
      
      return result;
      
    } catch (error) {
      console.error(`❌ Erreur traitement lead ${progress.current}:`, error);
      
      // Marquer comme erreur et continuer avec le suivant
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
        setTimeout(() => {
          console.log('🔄 Rechargement après erreur pour le prochain lead...');
          window.location.reload();
        }, 5000);
      }
      
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Erreur traitement queue:', error);
    throw error;
  }
}


// Exécuter le traitement avec un lead spécifique
export async function runTestWithLead(leadIndex, onProgress = null) {
  if (!availableLeads || availableLeads.length === 0) {
    throw new Error('Aucun lead disponible');
  }
  
  if (leadIndex < 0 || leadIndex >= availableLeads.length) {
    throw new Error(`Index lead invalide: ${leadIndex}`);
  }

  const selectedLead = availableLeads[leadIndex];
  
  // L'ID est à la racine du lead, pas dans lead.id
  const leadId = selectedLead.id;
  
  if (!leadId) {
    console.error('❌ Structure du lead sélectionné:', selectedLead);
    throw new Error('Aucun ID trouvé pour le lead sélectionné');
  }
  
  console.log('🚀 Démarrage traitement lead:', `${selectedLead.lead.nom} ${selectedLead.lead.prenom} (ID: ${leadId})`);
  
  // Marquer le lead comme en cours de traitement
  await saveProcessingStatus(leadId, 'processing', {
    leadName: `${selectedLead.lead.nom} ${selectedLead.lead.prenom}`
  });
  
  try {
    // Charger le résolveur de dépendances
    const resolver = await getResolver();
  
  // Traiter les étapes disponibles dans l'ordre
  const etapes = selectedLead.workflow.etapes
    .filter(e => ['projectName', 'hospitalComfort', 'simulationType', 'subscriberInfo', 'spouseInfo', 'childrenInfo', 'gammes', 'options', 'dateEffet', 'navigation', 'nomProjet', 'bouton-suivant'].includes(e.name || e.nom))  // Support anglais/français + conjoint + enfants + gammes + options + dateEffet + navigation
    .sort((a, b) => (a.order || a.ordre) - (b.order || b.ordre));
  
  console.log(`🎯 ${etapes.length} étapes à traiter`);

  // Notifier l'UI du début du traitement
  if (onProgress) {
    onProgress({
      type: 'start',
      totalSteps: etapes.length,
      leadName: `${selectedLead.lead.nom} ${selectedLead.lead.prenom}`
    });
  }

  for (let index = 0; index < etapes.length; index++) {
    const etape = etapes[index];
    const stepName = etape.name || etape.nom;
    let stepData = { ...etape.data };
    
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
    
    // Vérifier condition (ex: conjoint existe)
    if (etape.condition) {
      const conditionResult = processTemplate(etape.condition, selectedLead);
      if (!conditionResult || conditionResult === 'false') {
        console.log('⏭️ Condition non remplie, skip étape');
        continue;
      }
    }
    
    // Résolution automatique des dépendances
    if (etape.autoResolve) {
      console.log('🔧 Résolution automatique...');
      
      let resolvedData;
      let resolverContext;
      
      if (stepName === 'spouseInfo') {
        // Résolution spécifique pour le conjoint
        const spouseData = resolver.resolveSpouse(selectedLead);
        if (!spouseData) {
          console.log('⏭️ Pas de données conjoint, skip étape');
          continue;
        }
        resolvedData = spouseData;
        resolverContext = { spouseResolver: resolvedData };
        console.log('👫 Données conjoint résolues:', resolvedData);
      } else {
        // Résolution normale pour le souscripteur
        resolvedData = resolver.resolveSubscriber(selectedLead);
        resolverContext = { resolver: resolvedData };
        console.log('🎯 Données souscripteur résolues:', resolvedData);
      }
      
      // Enrichir les données avec les valeurs résolues
      for (const [key, value] of Object.entries(stepData)) {
        stepData[key] = processTemplate(value, { ...selectedLead, ...resolverContext });
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
    } else {
      // Traitement normal des templates
      for (const [key, value] of Object.entries(stepData)) {
        stepData[key] = processTemplate(value, selectedLead);
      }
    }

    // Exécuter l'action via le bridge avec retry
    console.log('⚡ Exécution action SwissLife...');
    
    // Pour compatibilité avec les anciens services qui attendent une valeur simple
    const serviceData = stepData.value || stepData;
    
    let result;
    let attempts = 0;
    const maxAttempts = 2;
    
    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`🔄 Tentative ${attempts}/${maxAttempts} pour l'étape: ${stepName}`);
        
        result = await executeSwissLifeAction(stepName, serviceData);
        
        if (result.ok) {
          console.log('✅ Succès étape:', stepName);
          break; // Sortir de la boucle en cas de succès
        } else {
          console.error('❌ Échec étape (tentative ' + attempts + '):', stepName, result);
          // Compatible avec nouveau format response-format.js et ancien format
          const errorMessage = result.error?.message || result.reason || 'Erreur inconnue';
          
          if (attempts >= maxAttempts) {
            throw new Error(`Échec étape ${stepName} après ${maxAttempts} tentatives: ${errorMessage}`);
          } else {
            console.log(`⏳ Attendre 2s avant retry...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      } catch (error) {
        console.error(`❌ Exception étape (tentative ${attempts}):`, stepName, error);
        
        // Si c'est un timeout et qu'on a encore des tentatives, retry
        if (error.message && error.message.includes('Timeout') && attempts < maxAttempts) {
          console.log(`⏳ Timeout détecté, retry dans 3s...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          continue;
        }
        
        // Sinon, re-lancer l'erreur
        throw error;
      }
    }
  }
  
    console.log('🎉 Toutes les étapes terminées avec succès');
    
    // Notifier l'UI de la fin du traitement
    if (onProgress) {
      onProgress({
        type: 'complete',
        status: 'success',
        leadName: `${selectedLead.lead.nom} ${selectedLead.lead.prenom}`,
        completedSteps: etapes.length
      });
    }
    
    // Sauvegarder le statut de succès
    await saveProcessingStatus(leadId, 'success', {
      leadName: `${selectedLead.lead.nom} ${selectedLead.lead.prenom}`,
      completedSteps: etapes.length,
      processedAt: new Date().toISOString()
    });
    
    return { ok: true, completedSteps: etapes.length };
  } catch (error) {
    // Notifier l'UI de l'erreur
    if (onProgress) {
      onProgress({
        type: 'error',
        status: 'error',
        leadName: `${selectedLead.lead.nom} ${selectedLead.lead.prenom}`,
        errorMessage: error.message
      });
    }
    
    // Sauvegarder le statut d'erreur
    await saveProcessingStatus(leadId, 'error', {
      leadName: `${selectedLead.lead.nom} ${selectedLead.lead.prenom}`,
      errorMessage: error.message,
      failedAt: new Date().toISOString()
    });
    
    throw error; // Re-lancer l'erreur pour l'UI
  }
}