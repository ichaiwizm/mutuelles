// Extension mutuelles auto-filler - UI seulement
(() => {
  'use strict';

  console.log('🚀 Extension mutuelles auto-filler');

  // Détection simple du contexte SwissLife
  const isSwissLife = location.hostname.includes('swisslifeone.fr');
  const isTarificationPage = location.href.includes('#/tarification-et-simulation/slsis');
  
  console.log('🔍 Contexte:', {
    hostname: location.hostname,
    isSwissLife,
    isTarificationPage
  });

  // Interface utilisateur sur page principale
  if (isSwissLife && window.self === window.top && isTarificationPage) {
    console.log('🖥️ Initialisation interface SwissLife');
    initializeUI();
  }

  // Fonction pour créer l'interface utilisateur
  function initializeUI() {
    setTimeout(() => {
      createLeadSelector();
      loadLeadsFromStorage();
    }, 2000);
  }

  // Créer le sélecteur de leads flottant
  function createLeadSelector() {
    if (document.getElementById('sl-lead-selector')) return;

    // CSS intégré
    const style = document.createElement('style');
    style.textContent = `
      #sl-lead-selector {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 350px;
        background: #fff;
        border: 2px solid #0066cc;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: Arial, sans-serif;
        font-size: 14px;
      }
      .sl-header {
        background: #0066cc;
        color: white;
        padding: 10px 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-radius: 6px 6px 0 0;
      }
      .sl-title {
        font-weight: bold;
      }
      .sl-minimize {
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        padding: 0 5px;
      }
      .sl-content {
        padding: 15px;
      }
      .sl-hidden {
        display: none;
      }
      .sl-sync-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        font-size: 12px;
      }
      .sl-btn-icon {
        background: none;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 5px 8px;
        cursor: pointer;
      }
      .sl-select-wrapper {
        margin-bottom: 10px;
      }
      #sl-lead-select {
        width: 100%;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
      }
      .sl-lead-info {
        background: #f8f9fa;
        padding: 10px;
        border-radius: 4px;
        margin-bottom: 10px;
        font-size: 12px;
      }
      .sl-info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 5px;
      }
      .sl-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-bottom: 10px;
      }
      .sl-btn-primary {
        background: #0066cc;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
      }
      .sl-btn-primary:disabled {
        background: #ccc;
        cursor: not-allowed;
      }
      .sl-btn-secondary {
        background: #6c757d;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
      }
      .sl-status {
        padding: 8px;
        border-radius: 4px;
        font-size: 12px;
        text-align: center;
      }
      .sl-status-success { background: #d4edda; color: #155724; }
      .sl-status-error { background: #f8d7da; color: #721c24; }
      .sl-status-warning { background: #fff3cd; color: #856404; }
      .sl-status-info { background: #d1ecf1; color: #0c5460; }
      .sl-success { color: #28a745; }
      .sl-warning { color: #ffc107; }
    `;
    document.head.appendChild(style);

    // Créer le conteneur de l'UI
    const container = document.createElement('div');
    container.id = 'sl-lead-selector';
    container.innerHTML = `
      <div class="sl-header">
        <span class="sl-title">📋 Auto-Filler</span>
        <button class="sl-minimize" id="sl-minimize">−</button>
      </div>
      <div class="sl-content" id="sl-content">
        <div class="sl-sync-info">
          <span id="sl-sync-status">Chargement...</span>
          <button id="sl-refresh" class="sl-btn-icon">🔄</button>
        </div>
        <div class="sl-select-wrapper">
          <select id="sl-lead-select">
            <option value="">-- Sélectionner un lead --</option>
          </select>
        </div>
        <div class="sl-lead-info" id="sl-lead-info"></div>
        <div class="sl-actions">
          <button id="sl-fill-btn" class="sl-btn-primary" disabled>
            Remplir avec bigtest
          </button>
          <button id="sl-clear-btn" class="sl-btn-secondary">
            Effacer leads
          </button>
        </div>
        <div class="sl-status" id="sl-status"></div>
      </div>
    `;

    document.body.appendChild(container);
    setupEventListeners();
  }

  // Configurer les event listeners
  function setupEventListeners() {
    // Minimize/Maximize
    const minimizeBtn = document.getElementById('sl-minimize');
    const content = document.getElementById('sl-content');
    minimizeBtn?.addEventListener('click', () => {
      content.classList.toggle('sl-hidden');
      minimizeBtn.textContent = content.classList.contains('sl-hidden') ? '+' : '−';
    });

    // Refresh leads
    document.getElementById('sl-refresh')?.addEventListener('click', () => {
      loadLeadsFromStorage();
      showStatus('Leads rechargés', 'success');
    });

    // Lead selection
    document.getElementById('sl-lead-select')?.addEventListener('change', (e) => {
      const selectedId = e.target.value;
      if (selectedId) {
        displayLeadInfo(selectedId);
        document.getElementById('sl-fill-btn').disabled = false;
      } else {
        document.getElementById('sl-lead-info').innerHTML = '';
        document.getElementById('sl-fill-btn').disabled = true;
      }
    });

    // Fill button - utilise bigtest.js
    document.getElementById('sl-fill-btn')?.addEventListener('click', () => {
      const selectedId = document.getElementById('sl-lead-select').value;
      if (selectedId) {
        fillWithBigtest(selectedId);
      }
    });

    // Clear button
    document.getElementById('sl-clear-btn')?.addEventListener('click', () => {
      if (confirm('Voulez-vous vraiment effacer tous les leads ?')) {
        chrome.storage.local.remove(['swisslife_converted_leads', 'swisslife_metadata'], () => {
          loadLeadsFromStorage();
          showStatus('Leads effacés', 'info');
        });
      }
    });
  }

  // Charger les leads depuis chrome.storage
  function loadLeadsFromStorage() {
    chrome.storage.local.get(['swisslife_converted_leads', 'last_sync'], (data) => {
      const leads = data.swisslife_converted_leads || [];
      const lastSync = data.last_sync;
      
      updateSyncStatus(leads.length, lastSync);
      populateLeadSelect(leads);
    });
  }

  // Mettre à jour le statut de synchronisation
  function updateSyncStatus(count, lastSync) {
    const statusEl = document.getElementById('sl-sync-status');
    if (statusEl) {
      if (count > 0) {
        const syncTime = lastSync ? new Date(lastSync).toLocaleTimeString('fr-FR') : 'inconnu';
        statusEl.innerHTML = `<span class="sl-success">${count} leads disponibles</span> (sync: ${syncTime})`;
      } else {
        statusEl.innerHTML = '<span class="sl-warning">Aucun lead disponible</span>';
      }
    }
  }

  // Remplir le select avec les leads
  function populateLeadSelect(leads) {
    const select = document.getElementById('sl-lead-select');
    if (!select) return;

    select.innerHTML = '<option value="">-- Sélectionner un lead --</option>';
    
    leads.forEach((lead, index) => {
      const option = document.createElement('option');
      option.value = lead.id || index;
      
      const label = `${lead.data?.projetNom || 'Lead'} - ${lead.nom || 'N/A'}`;
      option.textContent = label.trim();
      
      select.appendChild(option);
    });

    window.slLeadsData = leads;
  }

  // Afficher les infos du lead sélectionné
  function displayLeadInfo(leadId) {
    const lead = window.slLeadsData?.find(l => (l.id || window.slLeadsData.indexOf(l)) == leadId);
    if (!lead) return;

    const infoEl = document.getElementById('sl-lead-info');
    if (infoEl) {
      const data = lead.data || {};
      const enfants = data.enfantsDOB?.length || 0;
      const type = data.simulationType === 'couple' ? 'Couple' : 'Individuel';
      
      infoEl.innerHTML = `
        <div class="sl-info-grid">
          <div><strong>Type:</strong> ${type}</div>
          <div><strong>Description:</strong> ${lead.description || 'N/A'}</div>
          <div><strong>Code postal:</strong> ${data.cp || 'N/A'}</div>
          <div><strong>Enfants:</strong> ${enfants}</div>
          ${data.conjointDOB ? `<div><strong>Conjoint:</strong> Oui</div>` : ''}
        </div>
      `;
    }
  }

  // Remplir avec bigtest.js
  function fillWithBigtest(leadId) {
    const lead = window.slLeadsData?.find(l => (l.id || window.slLeadsData.indexOf(l)) == leadId);
    if (!lead) {
      showStatus('Lead non trouvé', 'error');
      return;
    }

    showStatus('Utilisation de bigtest.js...', 'info');
    
    // Trouver l'iframe de tarification
    const iframe = document.querySelector('iframe[name="iFrameTarificateur"]') ||
                   document.querySelector('iframe[src*="SLSISWeb"]') ||
                   document.querySelector('iframe[src*="swisslifeone.fr"]');
    
    if (!iframe) {
      showStatus('Iframe de tarification non trouvée', 'error');
      return;
    }

    // Envoyer le lead à l'iframe pour utiliser bigtest.js
    iframe.contentWindow.postMessage({
      type: 'USE_BIGTEST',
      payload: lead.data || lead
    }, '*');

    showStatus('Commande envoyée à bigtest.js', 'success');
  }

  // Afficher un message de statut
  function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('sl-status');
    if (statusEl) {
      statusEl.className = `sl-status sl-status-${type}`;
      statusEl.textContent = message;
      
      setTimeout(() => {
        statusEl.textContent = '';
        statusEl.className = 'sl-status';
      }, 5000);
    }
  }

  console.log(`✅ Extension UI chargée - SwissLife: ${isSwissLife}, Page tarif: ${isTarificationPage}`);
})();