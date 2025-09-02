// Fonctions utilitaires pour l'historique
function saveLastResult(result) {
  try {
    localStorage.setItem('orch-last-result', JSON.stringify(result));
    displayHistory(result);
  } catch (error) {
    console.warn('Impossible de sauvegarder l\'historique:', error);
  }
}

function loadAndDisplayHistory() {
  try {
    const stored = localStorage.getItem('orch-last-result');
    if (stored) {
      const history = JSON.parse(stored);
      displayHistory(history);
    }
  } catch (error) {
    console.warn('Impossible de charger l\'historique:', error);
  }
}

// Initialiser l'UI avec les données chrome.storage
async function initializeStats() {
  try {
    // Récupérer les données de queue depuis chrome.storage
    const result = await chrome.storage.local.get(['swisslife_leads', 'swisslife_queue_state']);
    
    const leads = result.swisslife_leads || [];
    const queueState = result.swisslife_queue_state;
    
    const statusLineEl = document.getElementById('orch-status-line');
    
    if (leads.length > 0) {
      if (queueState && queueState.currentIndex < leads.length) {
        const currentLead = leads[queueState.currentIndex];
        const processed = queueState.processedLeads ? queueState.processedLeads.length : 0;
        
        if (statusLineEl && currentLead) {
          statusLineEl.textContent = `🎯 ${currentLead.lead?.nom} ${currentLead.lead?.prenom} (${processed}/${leads.length} traités)`;
        }
      } else if (queueState && queueState.currentIndex >= leads.length) {
        // Tous traités
        const processed = queueState.processedLeads ? queueState.processedLeads.length : 0;
        if (statusLineEl) {
          statusLineEl.textContent = `✅ ${processed} lead${processed > 1 ? 's' : ''} traité${processed > 1 ? 's' : ''} avec succès`;
        }
      } else {
        // Pas de queue state, on est au début
        const firstLead = leads[0];
        if (statusLineEl && firstLead) {
          statusLineEl.textContent = `🎯 ${firstLead.lead?.nom} ${firstLead.lead?.prenom} (0/${leads.length} traités)`;
        }
      }
    } else {
      // Pas de leads
      if (statusLineEl) {
        statusLineEl.textContent = 'En attente de leads...';
      }
    }
    
    console.log('✅ UI initialisée:', { 
      totalLeads: leads.length, 
      queueState: queueState ? 'présent' : 'absent' 
    });
  } catch (error) {
    console.warn('❌ Erreur initialisation UI:', error);
  }
}

function displayHistory(history) {
  const historyEl = document.getElementById('orch-history');
  const lastResultEl = document.getElementById('orch-last-result');
  
  if (historyEl && lastResultEl && history) {
    const time = new Date(history.timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const statusClass = history.status === 'success' ? 'orch-history-success' : 'orch-history-error';
    const statusText = history.status === 'success' 
      ? `✅ ${history.leadName} (${history.steps || 0} étapes)`
      : `❌ ${history.leadName}: ${history.error || 'Erreur inconnue'}`;
    
    lastResultEl.innerHTML = `<div class="${statusClass}">${statusText}</div><div>${time}</div>`;
    historyEl.style.display = 'block';
  }
}

// Gestionnaire de progression ultra-simplifié
export function createQueueProgressHandler() {
  return (update) => {
    const statusLineEl = document.getElementById('orch-status-line');
    const progressContainerEl = document.getElementById('orch-progress-container');
    const progressBarEl = document.getElementById('orch-progress-bar');
    const progressTextEl = document.getElementById('orch-progress-text');
    
    // Gestion des événements de queue multi-leads
    if (update.type === 'queue_progress') {
      if (statusLineEl) {
        statusLineEl.textContent = `⚡ ${update.leadName} (${update.current}/${update.total})`;
      }
      if (progressContainerEl) {
        progressContainerEl.classList.remove('orch-hidden');
      }
    } 
    else if (update.type === 'queue_complete') {
      if (statusLineEl) {
        statusLineEl.textContent = `✅ ${update.totalProcessed} leads traités avec succès`;
      }
      if (progressContainerEl) {
        progressContainerEl.classList.add('orch-hidden');
      }
      
      saveLastResult({
        leadName: `Queue de ${update.totalProcessed} leads`,
        status: 'success',
        timestamp: new Date().toISOString(),
        isAuto: true,
        isQueue: true,
        totalProcessed: update.totalProcessed
      });
    } 
    else if (update.type === 'lead_complete') {
      if (statusLineEl) {
        statusLineEl.textContent = `✅ ${update.leadName} terminé - Rechargement...`;
      }
    } 
    else if (update.type === 'lead_error') {
      if (statusLineEl) {
        statusLineEl.textContent = `❌ ${update.leadName}: ${update.error}`;
      }
    }
    
    // Gestion des événements de traitement individuel
    else if (update.type === 'start') {
      if (statusLineEl) {
        statusLineEl.textContent = `🚀 Démarrage ${update.leadName}`;
      }
      if (progressContainerEl) {
        progressContainerEl.classList.remove('orch-hidden');
      }
      if (progressBarEl) {
        progressBarEl.style.width = '0%';
      }
      if (progressTextEl) {
        progressTextEl.textContent = '0%';
      }
    } 
    else if (update.type === 'step') {
      const percent = Math.round((update.currentStep / update.totalSteps) * 100);
      
      if (statusLineEl) {
        statusLineEl.textContent = `${update.stepName} (${update.currentStep}/${update.totalSteps})`;
      }
      if (progressBarEl) {
        progressBarEl.style.width = `${percent}%`;
      }
      if (progressTextEl) {
        progressTextEl.textContent = `${percent}%`;
      }
    } 
    else if (update.type === 'complete') {
      if (statusLineEl) {
        statusLineEl.textContent = `✅ ${update.leadName} traité avec succès`;
      }
      if (progressBarEl) {
        progressBarEl.style.width = '100%';
      }
      if (progressTextEl) {
        progressTextEl.textContent = '100%';
      }
      
      saveLastResult({
        leadName: update.leadName,
        status: 'success',
        timestamp: new Date().toISOString(),
        steps: update.completedSteps,
        isAuto: true
      });
    } 
    else if (update.type === 'error') {
      if (statusLineEl) {
        statusLineEl.textContent = `❌ Erreur: ${update.errorMessage}`;
      }
      
      saveLastResult({
        leadName: update.leadName,
        status: 'error',
        timestamp: new Date().toISOString(),
        error: update.errorMessage,
        isAuto: true
      });
    }
  };
}

// Interface utilisateur simplifiée pour queue automatique
export function createUI() {
  // Éviter les doublons
  if (document.getElementById('orchestrator-panel')) {
    return;
  }

  // Styles CSS ultra-simplifiés
  const style = document.createElement('style');
  style.textContent = `
    #orchestrator-panel {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 300px;
      background: #ffffff;
      border: 1px solid #e1e5e9;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      font-size: 14px;
    }
    .orch-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 16px;
      font-weight: 600;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .orch-content {
      padding: 16px;
    }
    .orch-status-line {
      padding: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      text-align: center;
      margin-bottom: 12px;
      min-height: 20px;
      font-weight: 500;
    }
    .orch-progress-container {
      position: relative;
      background: #f3f4f6;
      border-radius: 6px;
      height: 24px;
      overflow: hidden;
    }
    .orch-progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      transition: width 0.3s ease;
      width: 0%;
    }
    .orch-progress-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #374151;
      font-weight: 600;
      font-size: 12px;
    }
    .orch-hidden {
      display: none;
    }
    .orch-spinner {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  // Panel HTML ultra-simplifié
  const panel = document.createElement('div');
  panel.id = 'orchestrator-panel';
  
  panel.innerHTML = `
    <div class="orch-header">
      ⚡ SwissLife Auto
    </div>
    
    <div class="orch-content">
      <!-- Statut principal -->
      <div class="orch-status-line" id="orch-status-line">
        En attente de leads...
      </div>
      
      <!-- Barre de progression -->
      <div class="orch-progress-container orch-hidden" id="orch-progress-container">
        <div class="orch-progress-bar" id="orch-progress-bar"></div>
        <div class="orch-progress-text" id="orch-progress-text">0%</div>
      </div>
    </div>
  `;

  document.body.appendChild(panel);

  // Charger et afficher l'historique au démarrage
  loadAndDisplayHistory();
  
  // Initialiser les statistiques au démarrage
  initializeStats();
}