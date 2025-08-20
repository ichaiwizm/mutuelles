// Orchestrateur principal - logique + données
import { processTemplate } from './template-processor.js';
import { executeSwissLifeAction } from '../../services/swisslife/orchestrator-bridge.js';
import { getResolver } from './dependency-resolver.js';

let testData = null;

// Charger les données de test
export async function loadTestData() {
  try {
    const response = await fetch(chrome.runtime.getURL('data/test-data.json'));
    testData = await response.json();
    console.log('📊 Données de test chargées');
    return true;
  } catch (error) {
    console.error('❌ Erreur chargement données test:', error);
    return false;
  }
}

// Exécuter le test complet
export async function runTest() {
  if (!testData) {
    throw new Error('Données de test non chargées');
  }

  console.log('🚀 Démarrage test orchestrateur...');
  
  // Charger le résolveur de dépendances
  const resolver = await getResolver();
  
  // Traiter les étapes disponibles dans l'ordre
  const etapes = testData.workflow.etapes
    .filter(e => ['projectName', 'hospitalComfort', 'simulationType', 'subscriberInfo', 'spouseInfo', 'childrenInfo', 'gammes', 'options', 'dateEffet', 'navigation', 'nomProjet', 'bouton-suivant'].includes(e.name || e.nom))  // Support anglais/français + conjoint + enfants + gammes + options + dateEffet + navigation
    .sort((a, b) => (a.order || a.ordre) - (b.order || b.ordre));
  
  console.log(`🎯 ${etapes.length} étapes à traiter`);

  for (const etape of etapes) {
    const stepName = etape.name || etape.nom;
    let stepData = { ...etape.data };
    
    console.log(`📋 Étape ${etape.order || etape.ordre}: ${stepName}`);
    
    // Vérifier condition (ex: conjoint existe)
    if (etape.condition) {
      const conditionResult = processTemplate(etape.condition, testData);
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
        const spouseData = resolver.resolveSpouse(testData);
        if (!spouseData) {
          console.log('⏭️ Pas de données conjoint, skip étape');
          continue;
        }
        resolvedData = spouseData;
        resolverContext = { spouseResolver: resolvedData };
        console.log('👫 Données conjoint résolues:', resolvedData);
      } else {
        // Résolution normale pour le souscripteur
        resolvedData = resolver.resolveSubscriber(testData);
        resolverContext = { resolver: resolvedData };
        console.log('🎯 Données souscripteur résolues:', resolvedData);
      }
      
      // Enrichir les données avec les valeurs résolues
      for (const [key, value] of Object.entries(stepData)) {
        stepData[key] = processTemplate(value, { ...testData, ...resolverContext });
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
        stepData[key] = processTemplate(value, testData);
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
      throw new Error(`Échec étape ${stepName}: ${result.reason}`);
    }
  }
  
  console.log('🎉 Toutes les étapes terminées avec succès');
  return { ok: true, completedSteps: etapes.length };
}