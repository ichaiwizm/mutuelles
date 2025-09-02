// Background script pour l'extension SwissLife
// Gère la communication avec la plateforme et la gestion des onglets

// Background script pour l'extension SwissLife - Chargé

// Pattern pour identifier les onglets SwissLife (ignore les paramètres comme refreshTime)
const SWISSLIFE_URL_PATTERN = /swisslifeone\.fr.*\/tarification-et-simulation\/slsis/;
const SWISSLIFE_URL_PATTERN_LOOSE = /swisslifeone\.fr/; // Pattern plus permissif pour debug

// Écouter les messages externes (depuis la plateforme localhost:5174)
chrome.runtime.onMessageExternal.addListener(
  (message, sender, sendResponse) => {
    handleMessage(message)
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
  handleMessage(message)
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
async function handleMessage(message) {
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

// Stocker les leads pour l'extension
async function sendLeadsToStorage(data) {
  try {
    const { leads, timestamp, count } = data || {};
    
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      throw new Error('Aucun lead valide à stocker');
    }
    
    // Stocker dans le format attendu par l'orchestrateur
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
    
    return {
      success: true,
      data: {
        stored: true,
        count: storageData.count,
        timestamp: storageData.timestamp
      }
    };
  } catch (error) {
    console.error('Erreur lors du stockage des leads:', error);
    throw error;
  }
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
    
    // Trouver tous les onglets localhost:5174
    const platformTabs = tabs.filter(tab => 
      tab.url && tab.url.includes('localhost:5174')
    );
    
    if (platformTabs.length === 0) {
      console.log('⚠️ [BACKGROUND] Aucun onglet localhost:5174 trouvé');
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
    
    // Stocker dans chrome.storage.local
    const configData = {
      automation_config: config,
      updated_at: timestamp || new Date().toISOString()
    };
    
    await chrome.storage.local.set(configData);
    
    console.log('✅ [BACKGROUND] Configuration automation mise à jour:', config);
    
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