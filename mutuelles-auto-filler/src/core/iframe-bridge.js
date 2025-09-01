/**
 * Bridge simple pour communication entre frame principal et iframe
 */

// Détecte si on est dans l'iframe tarificateur
export function isInTarificateurIframe() {
  return window !== window.top && 
         window.location.href.includes('oav-pool') && 
         window.location.pathname.includes('SLSISWeb') &&
         !window.location.pathname.includes('PDFViewer') &&
         window.name === 'iFrameTarificateur';
}

// Envoie une commande à l'iframe
export async function sendToIframe(action, data) {
  const iframe = document.querySelector('iframe#iFrameResizer0, iframe[name="iFrameTarificateur"]');
  
  if (!iframe) {
    throw new Error('Iframe tarificateur non trouvé');
  }
  
  return new Promise((resolve, reject) => {
    const messageId = Math.random().toString(36);
    
    // Écouter la réponse
    const handler = (event) => {
      if (event.data?.type === 'swisslife-response' && event.data?.messageId === messageId) {
        window.removeEventListener('message', handler);
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data.result);
        }
      }
    };
    
    window.addEventListener('message', handler);
    
    // Envoyer la commande
    iframe.contentWindow.postMessage({
      type: 'swisslife-command',
      messageId,
      action,
      data
    }, '*');
    
    // Timeout après 5 secondes
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Timeout: pas de réponse de l\'iframe'));
    }, 5000);
  });
}

// Écoute les commandes dans l'iframe
export function listenForCommands(executeAction) {
  if (!isInTarificateurIframe()) return;
  
  window.addEventListener('message', async (event) => {
    if (event.data?.type === 'swisslife-command') {
      const { messageId, action, data } = event.data;
      
      try {
        const result = await executeAction(action, data);
        event.source.postMessage({
          type: 'swisslife-response',
          messageId,
          result
        }, event.origin);
      } catch (error) {
        event.source.postMessage({
          type: 'swisslife-response',
          messageId,
          error: error.message
        }, event.origin);
      }
    }
  });
}