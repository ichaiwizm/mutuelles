// Background script pour l'extension SwissLife
// Gère la communication avec la plateforme et la gestion des onglets

// Background script pour l'extension SwissLife - Chargé

// Pattern pour identifier les onglets SwissLife (ignore les paramètres comme refreshTime)
const SWISSLIFE_URL_PATTERN = /swisslifeone\.fr.*\/tarification-et-simulation\/slsis/;

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
      
    default:
      throw new Error(`Action inconnue: ${action}`);
  }
}

// Vérifier si un onglet SwissLife est ouvert
async function checkSwissLifeTab() {
  try {
    const tabs = await chrome.tabs.query({});
    
    // Chercher un onglet qui correspond au pattern SwissLife
    const swissLifeTab = tabs.find(tab => 
      tab.url && SWISSLIFE_URL_PATTERN.test(tab.url)
    );
    
    if (swissLifeTab) {
      return {
        success: true,
        data: {
          exists: true,
          tabId: swissLifeTab.id,
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
      
      // Optionellement, amener la fenêtre au premier plan
      const tab = await chrome.tabs.get(tabId);
      if (tab.windowId) {
        await chrome.windows.update(tab.windowId, { focused: true });
      }
      
      return {
        success: true,
        data: {
          activated: true,
          tabId: tabId
        }
      };
    } else if (url) {
      // Créer un nouvel onglet
      // Obtenir l'onglet actuel pour le restaurer après
      const currentTab = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTabId = currentTab.length > 0 ? currentTab[0].id : null;
      
      const newTab = await chrome.tabs.create({
        url: url,
        active: false // Toujours false pour éviter le vol de focus
      });
      
      // Remettre le focus sur l'onglet précédent si on en avait un
      if (currentTabId && !active) {
        try {
          await chrome.tabs.update(currentTabId, { active: true });
        } catch (error) {
          // Ignore silently
        }
      }
      
      return {
        success: true,
        data: {
          created: true,
          tabId: newTab.id,
          url: newTab.url
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


// Gestionnaire d'installation/mise à jour de l'extension
chrome.runtime.onInstalled.addListener((details) => {
  // Extension installée ou mise à jour
  if (details.reason === 'install') {
    // Première installation
  }
});