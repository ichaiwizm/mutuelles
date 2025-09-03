// Background script pour l'extension SwissLife
// Gère la communication avec la plateforme et la gestion des onglets

// Background script pour l'extension SwissLife - Chargé

// Patterns par défaut (peuvent être étendus via config)
const SWISSLIFE_URL_PATTERN = /swisslifeone\.fr.*\/tarification-et-simulation\/slsis/;
const SWISSLIFE_URL_PATTERN_LOOSE = /swisslifeone\.fr/; // Pattern plus permissif pour debug

// Configuration par défaut (service worker ne peut pas utiliser import())
const DEFAULT_DEPLOYMENT_CONFIG = {
  platformOrigins: [
    'http://localhost:5174',
    'https://mutuelles-lead-extractor.vercel.app'
  ],
  swisslifeBaseUrl: 'https://www.swisslifeone.fr',
  swisslifeTarifPath: '/index-swisslifeOne.html#/tarification-et-simulation/slsis'
};

async function getDeploymentConfigSW() {
  try {
    const res = await chrome.storage.local.get(['deployment_config']);
    const cfg = res.deployment_config || {};
    return {
      platformOrigins: Array.isArray(cfg.platformOrigins) && cfg.platformOrigins.length > 0
        ? cfg.platformOrigins
        : DEFAULT_DEPLOYMENT_CONFIG.platformOrigins,
      swisslifeBaseUrl: cfg.swisslifeBaseUrl || DEFAULT_DEPLOYMENT_CONFIG.swisslifeBaseUrl,
      swisslifeTarifPath: cfg.swisslifeTarifPath || DEFAULT_DEPLOYMENT_CONFIG.swisslifeTarifPath
    };
  } catch (_) {
    return { ...DEFAULT_DEPLOYMENT_CONFIG };
  }
}

function hostsFromOrigins(origins) {
  const out = [];
  (origins || []).forEach(o => {
    try {
      const u = new URL(o);
      out.push(u.host);
    } catch (_) {}
  });
  return out;
}

// Écouter les messages externes (depuis la plateforme localhost:5174)
chrome.runtime.onMessageExternal.addListener(
  (message, sender, sendResponse) => {
    handleMessage(message, sender)
      .then(response => {
        sendResponse(response);
      })
      .catch(error => {
        sendResponse({
          success: false,
          error: error.message || 'Erreur inconnue'
        });
      });
    
    return true;
  }
);

// Écouter les messages internes (depuis le content script)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(response => {
      sendResponse(response);
    })
    .catch(error => {
      sendResponse({
        success: false,
        error: error.message || 'Erreur inconnue'
      });
    });
  
  return true;
});

// Gestionnaire principal des messages
async function handleMessage(message, sender) {
  const { action, data } = message;
  
  switch (action) {
    case 'CHECK_SWISSLIFE_TAB':
      return await checkSwissLifeTab();
      
    case 'OPEN_SWISSLIFE_TAB':
      return await openSwissLifeTab(data);
      
    case 'SEND_LEADS':
      return await sendLeadsToStorage(data);
      
    case 'UPDATE_LEAD_STATUS':
      return await notifyPlatformLeadStatus(data);

    case 'UPDATE_CONFIG':
      return await updateAutomationConfig(data);
    
    case 'GROUP_QUEUE_COMPLETED':
      return await handleGroupQueueCompleted(data, sender);
      
    default:
      throw new Error(`Action inconnue: ${action}`);
  }
}

// Vérifier si un onglet SwissLife est ouvert
async function checkSwissLifeTab() {
  try {
    const tabs = await chrome.tabs.query({});
    
    console.log('🔍 [BACKGROUND] Vérification onglets SwissLife...');
    console.log('🔍 [BACKGROUND] Nombre total d\'onglets:', tabs.length);
    
    // Debug: afficher toutes les URLs et tester les patterns
    tabs.forEach((tab, index) => {
      console.log(`🔍 [BACKGROUND] Onglet ${index}: ${tab.url}`);
      if (tab.url && SWISSLIFE_URL_PATTERN_LOOSE.test(tab.url)) {
        console.log(`🎯 [BACKGROUND] SwissLife détecté (pattern loose) sur onglet ${index}`);
        console.log(`🎯 [BACKGROUND] Pattern strict match:`, SWISSLIFE_URL_PATTERN.test(tab.url));
      }
    });
    
    // Chercher un onglet qui correspond au pattern SwissLife
    const swissLifeTab = tabs.find(tab => {
      const matches = tab.url && SWISSLIFE_URL_PATTERN.test(tab.url);
      if (matches) {
        console.log('✅ [BACKGROUND] SwissLife trouvé avec pattern strict:', tab.url);
      }
      return matches;
    });
    
    if (swissLifeTab) {
      return {
        success: true,
        data: {
          exists: true,
          tabId: swissLifeTab.id,
          windowId: swissLifeTab.windowId,
          url: swissLifeTab.url
        }
      };
    } else {
      return {
        success: true,
        data: {
          exists: false
        }
      };
    }
  } catch (error) {
    console.error('Erreur lors de la vérification des onglets:', error);
    throw error;
  }
}

// Ouvrir ou activer un onglet SwissLife
async function openSwissLifeTab(data) {
  try {
    const { activate, tabId, url, active = false } = data || {};
    
    if (activate && tabId) {
      // Activer un onglet existant
      await chrome.tabs.update(tabId, { active: true });
      
      // Restaurer la fenêtre si elle est miniaturisée et la mettre au premier plan
      const tab = await chrome.tabs.get(tabId);
      if (tab.windowId) {
        await chrome.windows.update(tab.windowId, { 
          focused: true,
          state: 'normal' // Restaurer depuis miniaturisé
        });
      }
      
      return {
        success: true,
        data: {
          activated: true,
          tabId: tabId,
          windowId: tab.windowId
        }
      };
    } else if (url) {
      // Créer une nouvelle fenêtre normale puis minimiser immédiatement
      const newWindow = await chrome.windows.create({
        url: url,
        type: 'normal',
        focused: false,  // Ne vole pas le focus
        width: 800,
        height: 600
      });
      
      // Minimiser immédiatement
      chrome.windows.update(newWindow.id, { 
        state: 'minimized' 
      }).catch(err => {
        console.log('⚠️ [BACKGROUND] Minimisation échouée:', err);
      });
      
      return {
        success: true,
        data: {
          created: true,
          tabId: newWindow.tabs[0].id,
          windowId: newWindow.id,
          url: newWindow.tabs[0].url
        }
      };
    } else {
      throw new Error('Paramètres invalides pour ouvrir un onglet');
    }
  } catch (error) {
    console.error('Erreur lors de l\'ouverture/activation d\'onglet:', error);
    throw error;
  }
}

// Découpe un tableau en N groupes de taille égale
function splitIntoChunks(array, numChunks) {
  if (numChunks <= 1) return [array];
  
  const chunks = [];
  const chunkSize = Math.ceil(array.length / numChunks);
  
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  
  return chunks;
}

// Construit une URL SwissLife avec groupId (sans import dynamique)
async function buildSwissLifeUrlWithGroupId(groupId) {
  const cfg = await getDeploymentConfigSW();
  const base = (cfg.swisslifeBaseUrl || '').replace(/\/$/, '');
  const path = (cfg.swisslifeTarifPath || '').startsWith('/') ? cfg.swisslifeTarifPath : '/' + (cfg.swisslifeTarifPath || '');
  const refreshTime = Date.now();
  const sep = path.includes('?') ? '&' : '?';
  return `${base}${path}${sep}refreshTime=${refreshTime}&groupId=${groupId}`;
}

// Notifie un onglet avec retry automatique
async function notifyTabWithRetry(tabInfo, index, totalTabs, timestamp, maxRetries = 2) {
  const message = {
    action: 'LEADS_UPDATED',
    data: {
      count: tabInfo.leadCount,
      timestamp: timestamp || new Date().toISOString(),
      autoExecute: true,
      groupId: tabInfo.groupId,
      groupIndex: index,
      totalGroups: totalTabs
    },
    source: 'background'
  };

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      await chrome.tabs.sendMessage(tabInfo.tabId, message);
      console.log(`📡 [BACKGROUND] Notification envoyée à l'onglet ${index + 1}/${totalTabs} (groupId: ${tabInfo.groupId})${attempt > 1 ? ` (tentative ${attempt})` : ''}`);
      return; // Succès, arrêter les tentatives
    } catch (error) {
      console.warn(`⚠️ [BACKGROUND] Tentative ${attempt}/${maxRetries + 1} échouée pour l'onglet ${tabInfo.groupId}:`, error.message);
      
      if (attempt <= maxRetries) {
        // Attendre avant la prochaine tentative (délai croissant)
        const retryDelay = attempt * 2000; // 2s, puis 4s
        console.log(`🔄 [BACKGROUND] Retry dans ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error(`❌ [BACKGROUND] Impossible de notifier l'onglet ${tabInfo.groupId} après ${maxRetries + 1} tentatives`);
      }
    }
  }
}

// Clé de stockage pour le pool multi-onglets réutilisable
const POOL_KEY = 'swisslife_processing_pool';

// Récupérer le pool depuis le storage
async function getProcessingPool() {
  const res = await chrome.storage.local.get([POOL_KEY]);
  return res[POOL_KEY] || null;
}

// Sauvegarder le pool dans le storage
async function setProcessingPool(pool) {
  await chrome.storage.local.set({ [POOL_KEY]: pool });
}

// Vérifie que la fenêtre du pool existe encore et nettoie les tabs inexistants
async function validateAndPrunePool(pool) {
  if (!pool) return null;
  try {
    // Vérifier la fenêtre
    await chrome.windows.get(pool.windowId);
  } catch (e) {
    // Fenêtre inexistante → pool invalide
    return null;
  }

  // Vérifier que les tabs existent encore
  const validTabs = [];
  for (const t of (pool.tabs || [])) {
    try {
      const tab = await chrome.tabs.get(t.tabId);
      if (tab && tab.windowId === pool.windowId) {
        validTabs.push(t);
      }
    } catch (e) {
      // Tab n'existe plus → on l'ignore
    }
  }

  if (validTabs.length !== (pool.tabs || []).length) {
    pool.tabs = validTabs;
    await setProcessingPool(pool);
  }

  return pool;
}

// Crée une fenêtre de traitement si nécessaire
async function ensureProcessingWindow(capacity) {
  let pool = await getProcessingPool();
  pool = await validateAndPrunePool(pool);
  if (pool) return pool;

  // Créer une nouvelle fenêtre dédiée
  const newWindow = await chrome.windows.create({
    type: 'normal',
    focused: false,
    width: 800,
    height: 600,
    url: 'about:blank'
  });

  // Minimiser pour rester en arrière-plan
  await chrome.windows.update(newWindow.id, { state: 'minimized' }).catch(() => {});

  const newPool = {
    windowId: newWindow.id,
    capacity: capacity,
    tabs: [],
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString()
  };
  await setProcessingPool(newPool);
  return newPool;
}

// Choisit le groupe le moins chargé parmi les tabs du pool
async function chooseLeastLoadedGroup(pool) {
  if (!pool || !pool.tabs || pool.tabs.length === 0) return null;

  let best = null;
  let bestPending = Number.POSITIVE_INFINITY;

  for (const t of pool.tabs) {
    try {
      const queueKey = `swisslife_queue_state__${t.groupId}`;
      const leadsKey = `swisslife_leads__${t.groupId}`;
      const res = await chrome.storage.local.get([queueKey, leadsKey]);
      const queue = res[queueKey];
      const leads = res[leadsKey] || [];
      const pending = queue ? Math.max(0, (queue.totalLeads || leads.length) - (queue.currentIndex || 0)) : leads.length;
      if (pending < bestPending) {
        bestPending = pending;
        best = { ...t, pending };
      }
    } catch (e) {
      // Ignore et ne sélectionne pas ce tab
    }
  }
  return best;
}

// Ajoute un lead à un groupe existant (tab déjà ouvert)
async function appendLeadToExistingGroup(groupId, lead) {
  const leadsKey = `swisslife_leads__${groupId}`;
  const queueKey = `swisslife_queue_state__${groupId}`;

  const res = await chrome.storage.local.get([leadsKey, queueKey]);
  const leads = res[leadsKey] || [];
  const queue = res[queueKey] || { currentIndex: 0, totalLeads: 0, processedLeads: [], status: 'pending' };

  leads.push(lead);
  queue.totalLeads = (queue.totalLeads || 0) + 1;
  queue.status = 'pending';

  await chrome.storage.local.set({ [leadsKey]: leads, [queueKey]: queue });

  // Marquer le groupe comme non complété dans le pool
  try {
    let pool = await getProcessingPool();
    pool = await validateAndPrunePool(pool);
    if (pool && pool.tabs) {
      const t = pool.tabs.find(t => t.groupId === groupId);
      if (t) {
        t.completed = false;
        await setProcessingPool(pool);
      }
    }
  } catch (e) {
    // ignore
  }
}

// Crée un nouvel onglet de traitement dans la fenêtre du pool
async function createProcessingTab(pool, groupId, lead) {
  const tab = await chrome.tabs.create({
    windowId: pool.windowId,
    url: await buildSwissLifeUrlWithGroupId(groupId),
    active: false
  });

  // Stocker les données pour ce groupe
  const storageData = {
    [`swisslife_leads__${groupId}`]: [lead],
    [`swisslife_queue_state__${groupId}`]: {
      currentIndex: 0,
      totalLeads: 1,
      processedLeads: [],
      status: 'pending',
      startedAt: new Date().toISOString(),
      completedAt: null,
      groupId: groupId
    }
  };
  await chrome.storage.local.set(storageData);

  // Mettre à jour le pool
  pool.tabs.push({ tabId: tab.id, groupId, leadCount: 1, completed: false });
  pool.lastUsedAt = new Date().toISOString();
  await setProcessingPool(pool);

  // Notifier l'onglet
  try {
    await chrome.tabs.sendMessage(tab.id, {
      action: 'LEADS_UPDATED',
      data: {
        count: 1,
        timestamp: new Date().toISOString(),
        autoExecute: true,
        groupId
      },
      source: 'background'
    });
  } catch (error) {
    // l'onglet n'est peut-être pas encore prêt, pas grave
  }
}

// Marquer un groupe comme terminé et fermer la fenêtre si tous sont finis
async function handleGroupQueueCompleted(data, sender) {
  try {
    const incomingGroupId = data && data.groupId;
    const senderTabId = sender && sender.tab && sender.tab.id;
    let pool = await getProcessingPool();
    pool = await validateAndPrunePool(pool);
    if (!pool) {
      return { success: true, data: { ignored: true } };
    }

    // Trouver l'entrée du tab/groupe
    let target = null;
    for (const t of pool.tabs || []) {
      if ((incomingGroupId && t.groupId === incomingGroupId) || (senderTabId && t.tabId === senderTabId)) {
        target = t;
        break;
      }
    }

    if (!target) {
      return { success: true, data: { updated: false } };
    }

    target.completed = true;
    pool.lastUsedAt = new Date().toISOString();
    await setProcessingPool(pool);

    // Vérifier si tous les onglets sont complétés
    const tabs = pool.tabs || [];
    const allCompleted = tabs.length > 0 && tabs.every(t => t.completed);

    if (allCompleted) {
      // Nettoyage des clés de storage pour les groupes du pool
      try {
        const groupIds = tabs.map(t => t.groupId);
        const all = await chrome.storage.local.get(null);
        const keysToRemove = Object.keys(all).filter(k => groupIds.some(g => k.endsWith(`__${g}`)));
        if (keysToRemove.length > 0) {
          await chrome.storage.local.remove(keysToRemove);
        }
      } catch (e) {
        // ignore cleanup errors
      }

      try {
        await chrome.windows.remove(pool.windowId);
      } catch (e) {
        // fenêtre peut déjà être fermée
      }
      await chrome.storage.local.remove([POOL_KEY]);
      return { success: true, data: { windowClosed: true } };
    }

    return { success: true, data: { updated: true } };
  } catch (error) {
    return { success: false, error: error.message || 'Erreur handleGroupQueueCompleted' };
  }
}

// Ajoute un lead au pool (création fenêtre/onglet si nécessaire)
async function sendSingleLeadToProcessingPool(lead, parallelTabs) {
  // 1) S'assurer qu'une fenêtre de pool existe
  let pool = await ensureProcessingWindow(parallelTabs);
  pool = await validateAndPrunePool(pool);

  // 2) S'il reste de la capacité en onglets, créer un nouvel onglet
  if ((pool.tabs || []).length < (pool.capacity || parallelTabs)) {
    const groupId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await createProcessingTab(pool, groupId, lead);
    return {
      success: true,
      data: { stored: true, count: 1, parallelTabs: (pool.tabs || []).length + 0 }
    };
  }

  // 3) Sinon, ajouter au groupe le moins chargé
  const target = await chooseLeastLoadedGroup(pool);
  if (!target) {
    // fallback: créer un nouvel onglet si possible
    const groupId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await createProcessingTab(pool, groupId, lead);
    return { success: true, data: { stored: true, count: 1 } };
  }

  await appendLeadToExistingGroup(target.groupId, lead);

  // Notifier l'onglet cible pour déclencher l'auto-exécution
  try {
    await chrome.tabs.sendMessage(target.tabId, {
      action: 'LEADS_UPDATED',
      data: {
        count: 1,
        timestamp: new Date().toISOString(),
        autoExecute: true,
        groupId: target.groupId
      },
      source: 'background'
    });
  } catch (error) {
    // ignore
  }

  pool.lastUsedAt = new Date().toISOString();
  await setProcessingPool(pool);

  return { success: true, data: { stored: true, count: 1 } };
}

// Stocker les leads pour l'extension (version multi-onglets)
async function sendLeadsToStorage(data) {
  try {
    let { leads, timestamp, count, parallelTabs } = data || {};
    
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      throw new Error('Aucun lead valide à stocker');
    }
    
    // Déterminer parallelTabs si non fourni
    if (typeof parallelTabs !== 'number') {
      try {
        const { automation_config } = await chrome.storage.local.get(['automation_config']);
        parallelTabs = Math.min(10, Math.max(1, Number(automation_config?.parallelTabs ?? 1)));
      } catch (_) {
        parallelTabs = 1;
      }
    }

    const batchId = Date.now().toString();
    const actualParallelTabs = Math.min(parallelTabs, leads.length); // Pas plus d'onglets que de leads
    
    console.log(`📊 [BACKGROUND] Traitement ${leads.length} leads avec ${actualParallelTabs} onglet(s) parallèle(s)`);
    
    if (actualParallelTabs <= 1) {
      // Cas particulier: un seul lead mais on souhaite le mode pool parallèle
      if (parallelTabs > 1 && leads.length === 1) {
        return await sendSingleLeadToProcessingPool(leads[0], parallelTabs);
      }
      // Mode mono-onglet (backward compatibility)
      return await sendLeadsToStorageSingle(leads, timestamp, count);
    }
    
    // Mode multi-onglets
    const leadChunks = splitIntoChunks(leads, actualParallelTabs);
    const createdTabs = [];
    
    console.log(`📦 [BACKGROUND] Découpage en ${leadChunks.length} groupes:`, leadChunks.map(chunk => chunk.length));
    
    // 1. Créer une fenêtre principale
    const window = await chrome.windows.create({
      type: 'normal',
      focused: false,
      width: 800,
      height: 600,
      url: 'about:blank' // Onglet temporaire qui sera fermé
    });
    
    // 2. Créer les onglets pour chaque groupe
    for (let i = 0; i < leadChunks.length; i++) {
      const groupId = `${batchId}-${i}`;
      const chunk = leadChunks[i];
      
      // Créer l'onglet avec l'URL contenant le groupId
      const tab = await chrome.tabs.create({
        windowId: window.id,
        url: await buildSwissLifeUrlWithGroupId(groupId),
        active: false
      });
      
      // Stocker les données pour ce groupe
      const storageData = {
        [`swisslife_leads__${groupId}`]: chunk,
        [`swisslife_queue_state__${groupId}`]: {
          currentIndex: 0,
          totalLeads: chunk.length,
          processedLeads: [],
          status: 'pending',
          startedAt: new Date().toISOString(),
          completedAt: null,
          groupId: groupId,
          batchId: batchId,
          groupIndex: i,
          totalGroups: leadChunks.length
        }
      };
      
      await chrome.storage.local.set(storageData);
      
      createdTabs.push({
        tabId: tab.id,
        groupId: groupId,
        leadCount: chunk.length,
        completed: false
      });
      
      console.log(`✅ [BACKGROUND] Groupe ${i + 1}/${leadChunks.length} créé: ${chunk.length} leads, groupId: ${groupId}`);
    }
    
    // 3. Fermer l'onglet temporaire
    const tabs = await chrome.tabs.query({ windowId: window.id });
    const tempTab = tabs.find(tab => tab.url === 'about:blank');
    if (tempTab) {
      await chrome.tabs.remove(tempTab.id);
    }
    
    // 4. Minimiser la fenêtre
    await chrome.windows.update(window.id, { 
      state: 'minimized' 
    }).catch(err => {
      console.log('⚠️ [BACKGROUND] Minimisation échouée:', err);
    });
    
    // 5. Enregistrer le pool pour réutilisation ultérieure
    const pool = {
      windowId: window.id,
      capacity: parallelTabs,
      tabs: createdTabs,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString()
    };
    await setProcessingPool(pool);

    // 6. Notifier chaque onglet avec un délai progressif pour éviter la surcharge
    for (let i = 0; i < createdTabs.length; i++) {
      const tabInfo = createdTabs[i];
      
      setTimeout(async () => {
        await notifyTabWithRetry(tabInfo, i, createdTabs.length, timestamp);
      }, i * 3000); // Délai de 3s entre chaque notification
    }
    
    return {
      success: true,
      data: {
        stored: true,
        count: leads.length,
        timestamp: timestamp || new Date().toISOString(),
        parallelTabs: createdTabs.length,
        groups: createdTabs.map(tab => ({
          groupId: tab.groupId,
          leadCount: tab.leadCount
        }))
      }
    };
  } catch (error) {
    console.error('Erreur lors du stockage des leads (multi-onglets):', error);
    throw error;
  }
}

// Version mono-onglet (backward compatibility)
async function sendLeadsToStorageSingle(leads, timestamp, count) {
  // Stocker dans le format attendu par l'orchestrateur (mode legacy)
  const storageData = {
    swisslife_leads: leads,
    timestamp: timestamp || new Date().toISOString(),
    count: count || leads.length,
    source: 'platform-lead-extractor'
  };
  
  // Initialiser la queue de traitement pour plusieurs leads
  const queueState = {
    currentIndex: 0,
    totalLeads: leads.length,
    processedLeads: [],
    status: 'pending',
    startedAt: new Date().toISOString(),
    completedAt: null
  };
  
  await chrome.storage.local.set({
    ...storageData,
    swisslife_queue_state: queueState
  });
  
  // Notifier tous les onglets SwissLife de la mise à jour avec auto-exécution
  await notifySwissLifeTabs('LEADS_UPDATED', {
    count: storageData.count,
    timestamp: storageData.timestamp,
    autoExecute: true // Flag pour déclencher l'exécution automatique
  });
  
  console.log(`✅ [BACKGROUND] Mode mono-onglet: ${leads.length} leads stockés`);
  
  return {
    success: true,
    data: {
      stored: true,
      count: storageData.count,
      timestamp: storageData.timestamp,
      parallelTabs: 1
    }
  };
}

// Notifier tous les onglets SwissLife d'un événement
async function notifySwissLifeTabs(action, data) {
  try {
    const tabs = await chrome.tabs.query({});
    
    // Trouver tous les onglets SwissLife
    const swissLifeTabs = tabs.filter(tab => 
      tab.url && SWISSLIFE_URL_PATTERN.test(tab.url)
    );
    
    // Envoyer le message à chaque onglet SwissLife
    for (const tab of swissLifeTabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action,
          data,
          source: 'background'
        });
      } catch (error) {
        // Ignore silently
      }
    }
  } catch (error) {
    console.error('Erreur lors de la notification des onglets:', error);
  }
}


// Notifier la plateforme d'une mise à jour de statut de lead
async function notifyPlatformLeadStatus(data) {
  try {
    const { leadId, status, leadName, details } = data || {};
    
    if (!leadId || !status) {
      throw new Error('leadId et status sont requis');
    }
    
    const statusUpdate = {
      type: 'LEAD_STATUS_UPDATE',
      leadId,
      status, // 'processing', 'success', 'error'
      leadName: leadName || `Lead ${leadId}`,
      timestamp: new Date().toISOString(),
      details: details || {}
    };
    
    console.log(`📡 [BACKGROUND] ${status} notification pour ${leadName}`);
    
    // Envoyer vers tous les onglets localhost:5174
    await notifyPlatformTabs(statusUpdate);
    
    return {
      success: true,
      data: { notified: true }
    };
  } catch (error) {
    console.error('❌ [BACKGROUND] Erreur notification plateforme:', error);
    throw error;
  }
}

// Notifier tous les onglets de la plateforme (localhost:5174)
async function notifyPlatformTabs(statusUpdate) {
  try {
    const tabs = await chrome.tabs.query({});
    // Origines plateforme supportées (dev + prod)
    const cfg = await getDeploymentConfigSW();
    const hostSubstrings = hostsFromOrigins(cfg.platformOrigins);

    // Trouver tous les onglets plateforme
    const platformTabs = tabs.filter(tab => {
      if (!tab.url) return false;
      return hostSubstrings.some(h => tab.url.includes(h));
    });
    
    if (platformTabs.length === 0) {
      console.log('⚠️ [BACKGROUND] Aucun onglet plateforme trouvé');
      return;
    }
    
    // Envoyer le message à chaque onglet plateforme
    for (const tab of platformTabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'FORWARD_STATUS_TO_PLATFORM',
          data: statusUpdate,
          source: 'background'
        });
      } catch (error) {
        // Ignore silently - onglet peut être fermé ou inaccessible
      }
    }
  } catch (error) {
    console.error('❌ [BACKGROUND] Erreur notification onglets plateforme:', error);
  }
}

// Mettre à jour la configuration d'automatisation
async function updateAutomationConfig(data) {
  try {
    const { config, timestamp } = data || {};
    
    if (!config) {
      throw new Error('Configuration manquante');
    }
    
    // Valider la configuration
    if (typeof config.maxRetryAttempts !== 'number' || config.maxRetryAttempts < 0 || config.maxRetryAttempts > 10) {
      throw new Error('maxRetryAttempts doit être un nombre entre 0 et 10');
    }
    
    if (typeof config.retryDelay !== 'number' || config.retryDelay < 500 || config.retryDelay > 30000) {
      throw new Error('retryDelay doit être un nombre entre 500 et 30000');
    }

    if (typeof config.timeoutRetryDelay !== 'number' || config.timeoutRetryDelay < 1000 || config.timeoutRetryDelay > 60000) {
      throw new Error('timeoutRetryDelay doit être un nombre entre 1000 et 60000');
    }

    if (typeof config.parallelTabs !== 'number' || config.parallelTabs < 1 || config.parallelTabs > 10) {
      throw new Error('parallelTabs doit être un nombre entre 1 et 10');
    }
    
    // Stocker dans chrome.storage.local
    const configData = {
      automation_config: config,
      updated_at: timestamp || new Date().toISOString()
    };
    
    await chrome.storage.local.set(configData);

    console.log('✅ [BACKGROUND] Configuration automation mise à jour:', config);

    // Mettre à jour la capacité du pool existant s'il existe
    try {
      let pool = await getProcessingPool();
      pool = await validateAndPrunePool(pool);
      if (pool) {
        pool.capacity = Math.min(10, Math.max(1, config.parallelTabs));
        await setProcessingPool(pool);
        console.log('✅ [BACKGROUND] Capacité du pool mise à jour:', pool.capacity);
      }
    } catch (e) {
      // ignore pool update errors
    }
    
    return {
      success: true,
      data: {
        updated: true,
        config: config,
        timestamp: configData.updated_at
      }
    };
  } catch (error) {
    console.error('❌ [BACKGROUND] Erreur mise à jour configuration:', error);
    throw error;
  }
}

// Gestionnaire d'installation/mise à jour de l'extension
chrome.runtime.onInstalled.addListener((details) => {
  // Extension installée ou mise à jour
  if (details.reason === 'install') {
    // Première installation
  }
});
