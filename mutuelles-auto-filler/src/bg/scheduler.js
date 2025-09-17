/**
 * Scheduler V2 - Architecture refactorisée
 * Point d'entrée principal qui expose une API clean et modulaire
 */

// Instance singleton de l'orchestrateur
let orchestrator = null;

function getOrchestrator() {
  if (!orchestrator) {
    orchestrator = new self.BG.SchedulerOrchestrator();
  }
  return orchestrator;
}

// API publique
self.BG = self.BG || {};


// Async helpers available from shared (self.BG.wait)

/**
 * === API PRINCIPALE ===
 */

/**
 * Démarre un run
 * @param {Object} params - { providers, leads, parallelTabs, options }
 */
self.BG.startRun = async function startRun(params) {
  const sanitizedParams = {
    ...params,
    parallelTabs: 1,
    options: { ...(params?.options || {}) }
  };

  // Si des overrides sont fournis, les stocker pour ce run
  if (sanitizedParams.options?.swissLifeOverrides) {
    try {
      await chrome.storage.local.set({
        temp_overrides: sanitizedParams.options.swissLifeOverrides,
        temp_overrides_timestamp: Date.now()
      });
    } catch (error) {
      self.BG.logger.warn('[Scheduler] Erreur lors du stockage des overrides:', error);
    }
  }
  return await getOrchestrator().startRun(sanitizedParams);
};

/**
 * Gère la completion d'un groupe
 * @param {Object} data - { provider, groupId }
 * @param {Object} sender - Informations sur l'onglet expéditeur
 */
self.BG.onQueueDone = async function onQueueDone(data, sender) {
  return await getOrchestrator().onQueueDone(data, sender?.tab);
};

// removed: cancelRun / cancelIsolated / cancelIsolatedAny / getRunStateSummary / getIsolatedState (plus exposés à l'UI)

/**
 * === API ACCÈS DIRECT AUX MANAGERS ===
 * (pour les cas d'usage avancés)
 */

/**
 * Obtient le pool d'onglets
 */
self.BG.getPool = async function getPool() {
  return await getOrchestrator().poolManager.getPool();
};

/**
 * Sauvegarde le pool d'onglets
 */
self.BG.setPool = async function setPool(pool) {
  return await getOrchestrator().poolManager.setPool(pool);
};

/**
 * Obtient l'état du run complet
 */
self.BG.getRunState = async function getRunState() {
  return await getOrchestrator().runStateManager.getRunState();
};

/**
 * Sauvegarde l'état du run
 */
self.BG.setRunState = async function setRunState(state) {
  return await getOrchestrator().runStateManager.setRunState(state);
};

/**
 * === API UTILITAIRES ===
 */

// Les clés de stockage et l'ordre provider sont définis via les constants et providers-registry

/**
 * Valide un pool d'onglets
 */
self.BG.validatePool = async function validatePool(pool) {
  return await getOrchestrator().poolManager.validatePool(pool);
};

/**
 * === API GROUPES ISOLÉS ===
 */

/**
 * Obtient un groupe isolé
 */
self.BG.getIsolatedGroup = async function getIsolatedGroup(groupId) {
  return await getOrchestrator().isolatedManager.getIsolatedGroup(groupId);
};

/**
 * Ajoute un groupe isolé
 */
self.BG.addIsolatedGroup = async function addIsolatedGroup(groupId, tabId, windowId, metadata = {}) {
  return await getOrchestrator().isolatedManager.addIsolatedGroup(groupId, tabId, windowId, metadata);
};

/**
 * Supprime un groupe isolé
 */
self.BG.removeIsolatedGroup = async function removeIsolatedGroup(groupId) {
  return await getOrchestrator().isolatedManager.removeIsolatedGroup(groupId);
};

/**
 * Démarre un run isolé
 */
self.BG.startIsolatedRun = async function startIsolatedRun({ provider, lead, options = {} }) {
  return await getOrchestrator().isolatedManager.createIsolatedRun(provider, lead, options);
};

console.log('🚀 [Scheduler V2] Architecture refactorisée initialisée');
console.log('📊 [Scheduler V2] Modules: TabPoolManager, RunStateManager, IsolatedGroupManager, SchedulerOrchestrator');
