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

/**
 * Clés de stockage
 */
self.BG.POOL_KEY = 'pool_state';
self.BG.RUN_STATE_KEY = 'run_state';
self.BG.ISOLATED_GROUPS_KEY = 'isolated_groups';

/**
 * Utilitaire sleep
 */
self.BG.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * === API PRINCIPALE ===
 */

/**
 * Démarre un run
 * @param {Object} params - { providers, leads, parallelTabs, options }
 */
self.BG.startRun = async function startRun(params) {
  return await getOrchestrator().startRun(params);
};

/**
 * Gère la completion d'un groupe
 * @param {Object} data - { provider, groupId }
 * @param {Object} sender - Informations sur l'onglet expéditeur
 */
self.BG.onQueueDone = async function onQueueDone(data, sender) {
  return await getOrchestrator().onQueueDone(data, sender?.tab);
};

/**
 * Annule le run actuel
 */
self.BG.cancelRun = async function cancelRun() {
  return await getOrchestrator().cancelRun();
};

/**
 * Annule les groupes isolés seulement
 */
self.BG.cancelIsolated = async function cancelIsolated() {
  return await getOrchestrator().cancelIsolated();
};

/**
 * === API STATUS & ÉTAT ===
 */

/**
 * Obtient l'état du run pour l'UI
 */
self.BG.getRunStateSummary = async function getRunStateSummary() {
  return await getOrchestrator().getRunStateSummary();
};

/**
 * Obtient l'état des groupes isolés
 */
self.BG.getIsolatedState = async function getIsolatedState() {
  return await getOrchestrator().getIsolatedState();
};

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

/**
 * Ordre par défaut des providers
 */
self.BG.defaultProviderOrder = function defaultProviderOrder(providers) {
  return (providers || []).filter(p => !!self.BG.getProvider?.(p));
};

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