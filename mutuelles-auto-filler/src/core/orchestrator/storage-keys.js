/**
 * Gestionnaire des clés de stockage - Support pour traitement parallèle multi-onglets
 * 
 * Ce module centralise la logique de suffixage des clés de storage pour permettre
 * le traitement parallèle de leads sur plusieurs onglets sans collision.
 */

/**
 * Extrait le groupId depuis l'URL courante
 * @returns {string} Le groupId ou 'default' si aucun groupId n'est trouvé
 */
export function getGroupIdFromLocation() {
  try {
    // Parser l'URL pour extraire le paramètre groupId après le hash
    const hash = window.location.hash || '';
    const queryPart = hash.split('?')[1] || '';
    
    if (!queryPart) {
      return 'default';
    }
    
    const params = new URLSearchParams(queryPart);
    const groupId = params.get('groupId');
    
    return groupId || 'default';
  } catch (error) {
    console.warn('⚠️ [STORAGE-KEYS] Erreur parsing groupId:', error);
    return 'default';
  }
}

/**
 * Génère une clé de storage suffixée par le groupId
 * @param {string} baseKey - La clé de base (ex: 'swisslife_leads')
 * @param {string} [groupId] - Le groupId à utiliser (optionnel, détecté auto sinon)
 * @returns {string} La clé suffixée ou la clé de base si groupId='default'
 */
export function getStorageKey(baseKey, groupId = null) {
  const actualGroupId = groupId || getGroupIdFromLocation();
  
  // Si c'est le groupId par défaut, pas de suffixage (backward compatibility)
  if (actualGroupId === 'default') {
    return baseKey;
  }
  
  // Suffixer la clé avec le groupId
  return `${baseKey}__${actualGroupId}`;
}

/**
 * Helper pour débugger les clés utilisées
 * @param {string} baseKey - La clé de base
 * @returns {object} Informations de débugging
 */
export function debugStorageKey(baseKey) {
  const groupId = getGroupIdFromLocation();
  const finalKey = getStorageKey(baseKey, groupId);
  
  return {
    groupId,
    baseKey,
    finalKey,
    isDefault: groupId === 'default',
    location: window.location.hash
  };
}

/**
 * Constantes des clés de storage avec helpers
 * Utiliser ces fonctions plutôt que les chaînes hardcodées
 */
export const KEYS = {
  // Clés principales
  LEADS: (groupId = null) => getStorageKey('swisslife_leads', groupId),
  QUEUE_STATE: (groupId = null) => getStorageKey('swisslife_queue_state', groupId),
  
  // Clés pour retry et statuts
  RETRIES: (groupId = null) => getStorageKey('swisslife_lead_retries', groupId),
  PROCESSING_STATUS: (groupId = null) => getStorageKey('swisslife_processing_status', groupId),
  
  // Configuration
  AUTOMATION_CONFIG: () => 'automation_config', // Non suffixée (partagée entre tous)
  
  // Debug helpers
  debug: (baseKey) => debugStorageKey(baseKey),
  groupId: () => getGroupIdFromLocation()
};

/**
 * Utilitaire pour migrer des données d'une ancienne clé vers la nouvelle
 * Utile pour le processus de migration
 * @param {string} oldKey - Ancienne clé
 * @param {string} newKey - Nouvelle clé
 * @returns {Promise<boolean>} true si migration effectuée
 */
export async function migrateStorageKey(oldKey, newKey) {
  try {
    const result = await chrome.storage.local.get([oldKey]);
    
    if (result[oldKey]) {
      // Copier vers la nouvelle clé
      await chrome.storage.local.set({ [newKey]: result[oldKey] });
      
      // Supprimer l'ancienne clé
      await chrome.storage.local.remove([oldKey]);
      
      console.log(`✅ [STORAGE-KEYS] Migration ${oldKey} → ${newKey}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ [STORAGE-KEYS] Erreur migration:', error);
    return false;
  }
}

/**
 * Nettoie toutes les clés suffixées pour un groupId donné
 * Utile en fin de traitement pour éviter l'accumulation de données
 * @param {string} groupId - Le groupId à nettoyer
 * @returns {Promise<number>} Nombre de clés supprimées
 */
export async function cleanupGroupKeys(groupId) {
  if (groupId === 'default') {
    console.warn('⚠️ [STORAGE-KEYS] Nettoyage du groupe "default" non autorisé');
    return 0;
  }
  
  try {
    const allKeys = await chrome.storage.local.get(null);
    const keysToRemove = Object.keys(allKeys).filter(key => key.endsWith(`__${groupId}`));
    
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
      console.log(`🧹 [STORAGE-KEYS] Nettoyage ${keysToRemove.length} clés pour groupId: ${groupId}`, keysToRemove);
    }
    
    return keysToRemove.length;
  } catch (error) {
    console.error('❌ [STORAGE-KEYS] Erreur nettoyage:', error);
    return 0;
  }
}