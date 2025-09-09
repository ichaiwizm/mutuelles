/**
 * Gestionnaire des clés de stockage - Provider + Group aware
 */

/**
 * Extrait le groupId depuis l'URL courante
 */
export function getGroupIdFromLocation() {
  try {
    const hash = window.location.hash || '';
    const queryPart = hash.split('?')[1] || '';
    if (!queryPart) return 'default';
    const params = new URLSearchParams(queryPart);
    const groupId = params.get('groupId');
    return groupId || 'default';
  } catch (error) {
    console.warn('⚠️ [STORAGE-KEYS] Erreur parsing groupId:', error);
    return 'default';
  }
}

/**
 * Extrait le provider depuis l'URL courante
 */
export function getProviderFromLocation() {
  try {
    const hash = window.location.hash || '';
    const queryPart = hash.split('?')[1] || '';
    const params = new URLSearchParams(queryPart);
    const provider = params.get('provider');
    if (provider && typeof provider === 'string' && provider.length > 0) return provider;
  } catch (_) {}
  try { if ((window.location.hostname || '').includes('swisslifeone.fr')) return 'swisslife'; } catch (_) {}
  return 'swisslife';
}

/**
 * Génère une clé de storage préfixée par provider et suffixée par groupId
 */
export function getStorageKey(baseKey, groupId = null) {
  const actualGroupId = groupId || getGroupIdFromLocation();
  const provider = getProviderFromLocation();
  const prefix = `${provider}_`;
  if (actualGroupId === 'default') return `${prefix}${baseKey}`;
  return `${prefix}${baseKey}__${actualGroupId}`;
}

/**
 * Helper debug
 */
export function debugStorageKey(baseKey) {
  const groupId = getGroupIdFromLocation();
  const finalKey = getStorageKey(baseKey, groupId);
  return { groupId, baseKey, finalKey, isDefault: groupId === 'default', location: window.location.hash };
}

export const KEYS = {
  LEADS: (groupId = null) => getStorageKey('leads', groupId),
  QUEUE_STATE: (groupId = null) => getStorageKey('queue_state', groupId),
  RETRIES: (groupId = null) => getStorageKey('lead_retries', groupId),
  PROCESSING_STATUS: (groupId = null) => getStorageKey('processing_status', groupId),
  AUTOMATION_CONFIG: () => 'automation_config',
  debug: (baseKey) => debugStorageKey(baseKey),
  groupId: () => getGroupIdFromLocation(),
  provider: () => getProviderFromLocation()
};

export async function migrateStorageKey(oldKey, newKey) {
  try {
    const result = await chrome.storage.local.get([oldKey]);
    if (result[oldKey]) {
      await chrome.storage.local.set({ [newKey]: result[oldKey] });
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

export async function cleanupGroupKeys(groupId) {
  if (groupId === 'default') {
    console.warn('⚠️ [STORAGE-KEYS] Nettoyage du groupe "default" non autorisé');
    return 0;
  }
  try {
    const provider = getProviderFromLocation();
    const allKeys = await chrome.storage.local.get(null);
    const keysToRemove = Object.keys(allKeys).filter(key => key.startsWith(`${provider}_`) && key.endsWith(`__${groupId}`));
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
