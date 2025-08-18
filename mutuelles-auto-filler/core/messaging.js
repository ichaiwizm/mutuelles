// Gestion de la communication entre frame parent et iframe
window.MessagingCore = {

  // Envoyer des données à l'iframe
  sendToIframe: (leadData) => {
    const iframes = document.querySelectorAll('iframe');
    let sent = false;
    
    iframes.forEach(iframe => {
      try {
        if (iframe.contentWindow && iframe.src.includes('tarification')) {
          iframe.contentWindow.postMessage({
            type: 'AUTO_FILL_REQUEST',
            payload: leadData
          }, '*');
          sent = true;
          console.log('📤 Données envoyées à l\'iframe:', leadData.projetNom);
        }
      } catch (error) {
        console.warn('⚠️ Erreur envoi iframe:', error);
      }
    });
    
    return sent;
  },

  // Configurer l'écoute des messages dans l'iframe
  setupIframeListener: (fillFunction) => {
    window.addEventListener('message', (event) => {
      if (!event.data || event.data.type !== 'AUTO_FILL_REQUEST') return;
      
      console.log('📥 Message reçu dans iframe:', event.data.payload.projetNom);
      fillFunction(event.data.payload);
    });
    
    console.log('🎧 Iframe prête à recevoir les messages');
  },

  // Afficher un message temporaire
  showMessage: (text, type = 'info', duration = 4000) => {
    const existing = document.querySelector('#auto-filler-message');
    if (existing) existing.remove();

    const colors = {
      success: '#28a745',
      error: '#dc3545',
      warning: '#ffc107', 
      info: '#007ACC'
    };

    const message = document.createElement('div');
    message.id = 'auto-filler-message';
    message.style.cssText = `
      position: fixed !important;
      top: 70px !important;
      right: 20px !important;
      background: ${colors[type] || colors.info} !important;
      color: white !important;
      padding: 12px 20px !important;
      border-radius: 8px !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      z-index: 2147483647 !important;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2) !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    `;
    message.textContent = text;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
      if (message.parentNode) {
        message.remove();
      }
    }, duration);
  }
};