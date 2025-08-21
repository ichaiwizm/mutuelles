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

// Exécuter le traitement avec un lead spécifique
export async function runTestWithLead(leadIndex, onProgress = null) {
  if (!availableLeads || availableLeads.length === 0) {
    throw new Error('Aucun lead disponible');
  }
  
  if (leadIndex < 0 || leadIndex >= availableLeads.length) {
    throw new Error(`Index lead invalide: ${leadIndex}`);
  }

  const selectedLead = availableLeads[leadIndex];
  
  
  const leadId = selectedLead.lead.id;
  
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

    // Exécuter l'action via le bridge
    console.log('⚡ Exécution action SwissLife...');
    
    // Pour compatibilité avec les anciens services qui attendent une valeur simple
    const serviceData = stepData.value || stepData;
    const result = await executeSwissLifeAction(stepName, serviceData);
    
    if (result.ok) {
      console.log('✅ Succès étape:', stepName);
    } else {
      console.error('❌ Échec étape:', stepName, result);
      // Compatible avec nouveau format response-format.js et ancien format
      const errorMessage = result.error?.message || result.reason || 'Erreur inconnue';
      throw new Error(`Échec étape ${stepName}: ${errorMessage}`);
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