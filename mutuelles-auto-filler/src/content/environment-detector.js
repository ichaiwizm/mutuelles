/**
 * Détection de l'environnement d'exécution
 * Détermine si on est sur SwissLife, localhost, frame principal ou iframe
 */

export function detectEnvironment() {
  const hostname = window.location.hostname;
  const port = window.location.port;
  const href = window.location.href;
  const pathname = window.location.pathname;
  
  // Vérifications de base
  const isSwissLife = hostname.includes('swisslifeone.fr');
  const isLocalhost = hostname === 'localhost' && port === '5174';
  
  // Validation de l'environnement
  const isValid = isSwissLife || isLocalhost;
  
  // Détection du type de frame
  const isMainFrame = (window === window.top);
  
  // Détection précise de l'iframe tarificateur uniquement (pas les PDF viewers)
  const isTarificateurIframe = !isMainFrame && (
    href.includes('oav-pool') && 
    pathname.includes('SLSISWeb') &&
    !pathname.includes('PDFViewer') &&
    window.name === 'iFrameTarificateur'
  );
  
  return {
    isSwissLife,
    isLocalhost,
    isValid,
    isMainFrame,
    isTarificateurIframe
  };
}