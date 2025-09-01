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

// Exécuter automatiquement le premier lead
export async function autoExecuteLead(onTestClick) {
  try {
    console.log('🤖 Démarrage exécution automatique...');
    
    // Vérifier si l'UI existe et la mettre à jour
    const statusEl = document.getElementById('orch-status');
    const progressEl = document.getElementById('orch-progress');
    const stepDetailEl = document.getElementById('orch-step-detail');
    const progressBarEl = document.getElementById('orch-progress-bar');
    
    if (statusEl) {
      statusEl.textContent = '🤖 Exécution automatique en cours...';
    }
    
    if (progressEl) {
      progressEl.style.display = 'block';
    }
    
    // Callback pour recevoir les mises à jour de progression
    const handleProgress = (update) => {
      // Gestion des événements de queue multi-leads
      if (update.type === 'queue_progress') {
        if (statusEl) {
          statusEl.textContent = `🤖 Traitement lead ${update.current}/${update.total}: ${update.leadName}`;
        }
        if (stepDetailEl) {
          stepDetailEl.textContent = `📊 Queue: ${update.current}/${update.total} leads - En cours: ${update.leadName}`;
        }
      } else if (update.type === 'queue_complete') {
        if (progressBarEl) {
          progressBarEl.style.width = '100%';
          progressBarEl.textContent = '100%';
        }
        if (stepDetailEl) {
          stepDetailEl.textContent = `🎉 Queue terminée - ${update.totalProcessed} leads traités`;
        }
        if (statusEl) {
          statusEl.textContent = `✅ Tous les leads traités (${update.totalProcessed})`;
        }
        saveLastResult({
          leadName: `Queue de ${update.totalProcessed} leads`,
          status: 'success',
          timestamp: new Date().toISOString(),
          isAuto: true,
          isQueue: true,
          totalProcessed: update.totalProcessed
        });
      } else if (update.type === 'lead_complete') {
        if (statusEl) {
          statusEl.textContent = `✅ Lead ${update.current}/${update.total} terminé - ${update.remaining} restants`;
        }
        if (stepDetailEl) {
          stepDetailEl.textContent = `✅ ${update.leadName} terminé - Rechargement dans 3s...`;
        }
      } else if (update.type === 'lead_error') {
        if (statusEl) {
          statusEl.textContent = `❌ Erreur lead ${update.current}/${update.total}`;
        }
        if (stepDetailEl) {
          stepDetailEl.textContent = `❌ ${update.leadName}: ${update.error}`;
        }
      }
      // Gestion des événements de traitement individuel
      else if (update.type === 'start') {
        if (progressBarEl) {
          progressBarEl.style.width = '0%';
          progressBarEl.textContent = '0%';
        }
        if (stepDetailEl) {
          stepDetailEl.textContent = `🤖 Traitement automatique de ${update.leadName}`;
        }
      } else if (update.type === 'step') {
        const percent = Math.round((update.currentStep / update.totalSteps) * 100);
        if (progressBarEl) {
          progressBarEl.style.width = `${percent}%`;
          progressBarEl.textContent = `${percent}%`;
        }
        if (stepDetailEl) {
          stepDetailEl.textContent = `Étape ${update.currentStep}/${update.totalSteps}: ${update.stepName}`;
        }
      } else if (update.type === 'complete') {
        if (progressBarEl) {
          progressBarEl.style.width = '100%';
          progressBarEl.textContent = '100%';
        }
        if (stepDetailEl) {
          stepDetailEl.textContent = '✅ Lead terminé avec succès';
        }
        if (statusEl) {
          statusEl.textContent = 'Lead terminé ✅';
        }
        saveLastResult({
          leadName: update.leadName,
          status: 'success',
          timestamp: new Date().toISOString(),
          steps: update.completedSteps,
          isAuto: true
        });
      } else if (update.type === 'error') {
        if (stepDetailEl) {
          stepDetailEl.textContent = `❌ Erreur automatique: ${update.errorMessage}`;
        }
        if (statusEl) {
          statusEl.textContent = 'Erreur exécution automatique ❌';
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
    
    // Lancer l'exécution automatique avec le premier lead (index 0)
    await onTestClick(0, handleProgress);
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution automatique UI:', error);
    const statusEl = document.getElementById('orch-status');
    if (statusEl) {
      statusEl.textContent = `❌ Erreur: ${error.message}`;
    }
  }
}

// Interface utilisateur pour sélection des leads
export function createUI(leads, onTestClick) {
  // Éviter les doublons
  if (document.getElementById('orchestrator-panel')) {
    return;
  }

  // Styles CSS simples
  const style = document.createElement('style');
  style.textContent = `
    #orchestrator-panel {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 300px;
      background: white;
      border: 2px solid #007bff;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: Arial, sans-serif;
    }
    .orch-header {
      background: #007bff;
      color: white;
      padding: 12px 16px;
      font-weight: bold;
      border-radius: 6px 6px 0 0;
    }
    .orch-content {
      padding: 16px;
    }
    .orch-select {
      width: 100%;
      padding: 8px;
      margin-bottom: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }
    .orch-button {
      background: #28a745;
      color: white;
      border: none;
      padding: 10px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      width: 100%;
      margin-bottom: 8px;
    }
    .orch-button:hover {
      background: #218838;
    }
    .orch-button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    .orch-status {
      padding: 8px 0;
      font-size: 12px;
      color: #666;
    }
    .orch-error {
      color: #dc3545;
      font-size: 12px;
      padding: 8px 0;
    }
    .orch-button-secondary {
      background: #6c757d;
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      width: 100%;
      margin-bottom: 8px;
    }
    .orch-button-secondary:hover {
      background: #5a6268;
    }
    .orch-progress-container {
      margin: 12px 0;
      background: #f0f0f0;
      border-radius: 4px;
      height: 20px;
      position: relative;
      overflow: hidden;
      display: none;
    }
    .orch-progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #007bff, #0056b3);
      transition: width 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 11px;
      width: 0%;
    }
    .orch-step-detail {
      font-size: 12px;
      color: #007bff;
      padding: 4px 0;
      min-height: 16px;
    }
    .orch-history {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 4px;
      padding: 8px;
      margin-top: 12px;
      font-size: 11px;
      display: none;
    }
    .orch-history-title {
      font-weight: bold;
      color: #495057;
      margin-bottom: 4px;
    }
    .orch-history-success {
      color: #28a745;
    }
    .orch-history-error {
      color: #dc3545;
    }
  `;
  document.head.appendChild(style);

  // Panel HTML
  const panel = document.createElement('div');
  panel.id = 'orchestrator-panel';
  
  if (!leads || leads.length === 0) {
    // Aucun lead disponible
    panel.innerHTML = `
      <div class="orch-header">🎼 Orchestrateur</div>
      <div class="orch-content">
        <div class="orch-error">
          ❌ Aucun lead disponible<br>
          Veuillez d'abord synchroniser depuis le dashboard localhost:5174
        </div>
      </div>
    `;
  } else {
    // Leads disponibles
    const leadOptions = leads.map((lead, index) => {
      const nom = lead.lead?.nom || 'Nom inconnu';
      const prenom = lead.lead?.prenom || 'Prénom inconnu';
      const dateNaissance = lead.lead?.souscripteur?.dateNaissance || 'Date inconnue';
      return `<option value="${index}">${nom} ${prenom} (${dateNaissance})</option>`;
    }).join('');
    
    panel.innerHTML = `
      <div class="orch-header">🎼 Orchestrateur (${leads.length} leads)</div>
      <div class="orch-content">
        <select class="orch-select" id="orch-lead-select">
          <option value="">Sélectionner un lead...</option>
          ${leadOptions}
        </select>
        <div class="orch-progress-container" id="orch-progress">
          <div class="orch-progress-bar" id="orch-progress-bar">0%</div>
        </div>
        <div class="orch-step-detail" id="orch-step-detail"></div>
        <button class="orch-button" id="orch-test-btn" disabled>
          🚀 Lancer le traitement
        </button>
        <button class="orch-button-secondary" id="orch-refresh-btn">
          🔄 Rafraîchir les leads
        </button>
        <div class="orch-status" id="orch-status">
          Sélectionnez un lead pour commencer
        </div>
        <div class="orch-history" id="orch-history">
          <div class="orch-history-title">Dernier traitement:</div>
          <div id="orch-last-result"></div>
        </div>
      </div>
    `;
  }

  document.body.appendChild(panel);

  // Charger et afficher l'historique au démarrage
  loadAndDisplayHistory();

  // Event listeners seulement si des leads sont disponibles
  if (leads && leads.length > 0) {
    const selectEl = document.getElementById('orch-lead-select');
    const buttonEl = document.getElementById('orch-test-btn');
    const refreshEl = document.getElementById('orch-refresh-btn');
    const statusEl = document.getElementById('orch-status');
    const progressEl = document.getElementById('orch-progress');
    const progressBarEl = document.getElementById('orch-progress-bar');
    const stepDetailEl = document.getElementById('orch-step-detail');
    
    // Activer/désactiver le bouton selon la sélection
    selectEl.addEventListener('change', () => {
      const selectedIndex = selectEl.value;
      if (selectedIndex !== '') {
        buttonEl.disabled = false;
        const selectedLead = leads[parseInt(selectedIndex)];
        statusEl.textContent = `Lead sélectionné: ${selectedLead.lead?.nom} ${selectedLead.lead?.prenom}`;
      } else {
        buttonEl.disabled = true;
        statusEl.textContent = 'Sélectionnez un lead pour commencer';
      }
    });
    
    // Callback pour recevoir les mises à jour de progression
    const handleProgress = (update) => {
      if (update.type === 'start') {
        progressEl.style.display = 'block';
        progressBarEl.style.width = '0%';
        progressBarEl.textContent = '0%';
        stepDetailEl.textContent = `Traitement de ${update.leadName}`;
        statusEl.textContent = 'Traitement en cours...';
      } else if (update.type === 'step') {
        const percent = Math.round((update.currentStep / update.totalSteps) * 100);
        progressBarEl.style.width = `${percent}%`;
        progressBarEl.textContent = `${percent}%`;
        stepDetailEl.textContent = `Étape ${update.currentStep}/${update.totalSteps}: ${update.stepName}`;
      } else if (update.type === 'complete') {
        progressBarEl.style.width = '100%';
        progressBarEl.textContent = '100%';
        stepDetailEl.textContent = '✅ Traitement terminé avec succès';
        statusEl.textContent = 'Traitement terminé ✅';
        saveLastResult({
          leadName: update.leadName,
          status: 'success',
          timestamp: new Date().toISOString(),
          steps: update.completedSteps
        });
      } else if (update.type === 'error') {
        stepDetailEl.textContent = `❌ Erreur: ${update.errorMessage}`;
        statusEl.textContent = 'Erreur ❌';
        saveLastResult({
          leadName: update.leadName,
          status: 'error',
          timestamp: new Date().toISOString(),
          error: update.errorMessage
        });
      }
    };

    // Lancer le traitement avec callback de progression
    buttonEl.addEventListener('click', async () => {
      const selectedIndex = parseInt(selectEl.value);
      if (selectedIndex >= 0) {
        buttonEl.disabled = true;
        refreshEl.disabled = true;
        
        try {
          await onTestClick(selectedIndex, handleProgress);
        } catch (error) {
          console.error(error);
        } finally {
          buttonEl.disabled = false;
          refreshEl.disabled = false;
          // Masquer la barre de progression après 3 secondes
          setTimeout(() => {
            progressEl.style.display = 'none';
            stepDetailEl.textContent = '';
          }, 3000);
        }
      }
    });

    // Rafraîchir les leads
    refreshEl.addEventListener('click', async () => {
      refreshEl.disabled = true;
      statusEl.textContent = 'Rafraîchissement...';
      
      try {
        const { loadLeads } = await import(chrome.runtime.getURL('src/core/orchestrator.js'));
        const newLeads = await loadLeads();
        
        // Supprimer l'ancien panel et recréer avec les nouveaux leads
        document.getElementById('orchestrator-panel').remove();
        createUI(newLeads, onTestClick);
        
        console.log('✅ Leads rafraîchis');
      } catch (error) {
        console.error('❌ Erreur rafraîchissement:', error);
        statusEl.textContent = 'Erreur de rafraîchissement ❌';
      } finally {
        refreshEl.disabled = false;
      }
    });
  }
}