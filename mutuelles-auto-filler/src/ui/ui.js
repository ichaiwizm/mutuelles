// Interface utilisateur simple
export function createUI(onTestClick) {
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
    .orch-status {
      padding: 8px 0;
      font-size: 12px;
      color: #666;
    }
  `;
  document.head.appendChild(style);

  // Panel HTML
  const panel = document.createElement('div');
  panel.id = 'orchestrator-panel';
  panel.innerHTML = `
    <div class="orch-header">🎼 Orchestrateur</div>
    <div class="orch-content">
      <button class="orch-button" id="orch-test-btn">
        🚀 Test DESCHAMPS
      </button>
      <div class="orch-status" id="orch-status">
        Prêt...
      </div>
    </div>
  `;

  document.body.appendChild(panel);

  // Event listener
  document.getElementById('orch-test-btn').addEventListener('click', async () => {
    const statusEl = document.getElementById('orch-status');
    statusEl.textContent = 'Exécution...';
    
    try {
      await onTestClick();
      statusEl.textContent = 'Succès ✅';
    } catch (error) {
      statusEl.textContent = 'Erreur ❌';
      console.error(error);
    }
  });
}