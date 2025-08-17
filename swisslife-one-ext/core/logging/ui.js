// Interface utilisateur pour le système de logging
window.SwissLifeLoggerUI = {
  
  // Créer l'interface de debug
  create: () => {
    if (document.querySelector('#swisslife-debug-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'swisslife-debug-panel';
    panel.style.cssText = `
      position: fixed !important;
      top: 10px !important;
      left: 10px !important;
      width: 400px !important;
      max-height: 300px !important;
      background: rgba(0, 0, 0, 0.9) !important;
      color: white !important;
      font-family: 'Courier New', monospace !important;
      font-size: 12px !important;
      border-radius: 8px !important;
      padding: 10px !important;
      z-index: 2147483647 !important;
      overflow-y: auto !important;
      border: 1px solid #333 !important;
    `;

    // Header avec titre et bouton fermer
    const header = SwissLifeLoggerUI.createHeader();
    
    // Contrôles (sélecteur niveau + bouton clear)
    const controls = SwissLifeLoggerUI.createControls();

    // Conteneur des logs
    const logsContainer = document.createElement('div');
    logsContainer.id = 'swisslife-logs-container';
    logsContainer.style.cssText = `
      max-height: 200px !important;
      overflow-y: auto !important;
    `;

    panel.appendChild(header);
    panel.appendChild(controls);
    panel.appendChild(logsContainer);
    
    document.body.appendChild(panel);

    // Afficher les logs existants
    SwissLifeLoggerCore.logs.forEach(log => SwissLifeLoggerUI.updateUI(log));
  },

  createHeader: () => {
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      margin-bottom: 10px !important;
      border-bottom: 1px solid #333 !important;
      padding-bottom: 5px !important;
    `;
    
    const title = document.createElement('span');
    title.textContent = '🔧 SwissLife Debug';
    title.style.fontWeight = 'bold';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      background: none !important;
      border: none !important;
      color: white !important;
      cursor: pointer !important;
      font-size: 16px !important;
    `;
    closeBtn.onclick = () => SwissLifeLoggerUI.hide();

    header.appendChild(title);
    header.appendChild(closeBtn);
    return header;
  },

  createControls: () => {
    const controls = document.createElement('div');
    controls.style.cssText = `
      margin-bottom: 10px !important;
      display: flex !important;
      gap: 10px !important;
    `;

    // Sélecteur de niveau
    const levelSelect = document.createElement('select');
    levelSelect.style.cssText = `
      background: #333 !important;
      color: white !important;
      border: 1px solid #666 !important;
      padding: 2px !important;
    `;
    Object.entries(SwissLifeLoggerCore.LEVELS).forEach(([name, value]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = name;
      option.selected = value === SwissLifeLoggerCore.config.level;
      levelSelect.appendChild(option);
    });
    levelSelect.onchange = (e) => {
      SwissLifeLoggerCore.setLevel(parseInt(e.target.value));
    };

    // Bouton clear
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear';
    clearBtn.style.cssText = `
      background: #333 !important;
      color: white !important;
      border: 1px solid #666 !important;
      padding: 2px 8px !important;
      cursor: pointer !important;
    `;
    clearBtn.onclick = () => {
      SwissLifeLoggerCore.clearLogs();
      const container = document.querySelector('#swisslife-logs-container');
      if (container) container.innerHTML = '';
    };

    controls.appendChild(levelSelect);
    controls.appendChild(clearBtn);
    return controls;
  },

  // Mettre à jour l'UI avec un nouveau log
  updateUI: (logEntry) => {
    const container = document.querySelector('#swisslife-logs-container');
    if (!container) return;

    const logDiv = document.createElement('div');
    logDiv.style.cssText = `
      margin: 2px 0 !important;
      padding: 2px !important;
      border-left: 3px solid ${SwissLifeLoggerUI.getLevelColor(logEntry.level)} !important;
      padding-left: 8px !important;
    `;
    
    const contextStr = Object.keys(logEntry.context).length > 0 ? 
      ` | ${JSON.stringify(logEntry.context)}` : '';
    
    logDiv.textContent = `${logEntry.emoji} [${logEntry.timestamp}] ${logEntry.message}${contextStr}`;
    
    container.appendChild(logDiv);
    container.scrollTop = container.scrollHeight;
  },

  // Couleurs par niveau
  getLevelColor: (level) => {
    const colors = ['#888', '#007ACC', '#FFA500', '#FF4444'];
    return colors[level] || '#FFF';
  },

  // Cacher l'interface
  hide: () => {
    const panel = document.querySelector('#swisslife-debug-panel');
    if (panel) panel.remove();
  }
};
