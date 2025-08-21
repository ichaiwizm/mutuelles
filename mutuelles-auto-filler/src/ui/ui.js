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
        <button class="orch-button" id="orch-test-btn" disabled>
          🚀 Lancer le traitement
        </button>
        <div class="orch-status" id="orch-status">
          Sélectionnez un lead pour commencer
        </div>
      </div>
    `;
  }

  document.body.appendChild(panel);

  // Event listeners seulement si des leads sont disponibles
  if (leads && leads.length > 0) {
    const selectEl = document.getElementById('orch-lead-select');
    const buttonEl = document.getElementById('orch-test-btn');
    const statusEl = document.getElementById('orch-status');
    
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
    
    // Lancer le traitement
    buttonEl.addEventListener('click', async () => {
      const selectedIndex = parseInt(selectEl.value);
      if (selectedIndex >= 0) {
        statusEl.textContent = 'Traitement en cours...';
        buttonEl.disabled = true;
        
        try {
          await onTestClick(selectedIndex);
          statusEl.textContent = 'Traitement terminé ✅';
        } catch (error) {
          statusEl.textContent = 'Erreur ❌';
          console.error(error);
        } finally {
          buttonEl.disabled = false;
        }
      }
    });
  }
}