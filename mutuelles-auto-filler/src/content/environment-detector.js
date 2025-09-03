/**
 * Détection de l'environnement d'exécution
 * Détermine si on est sur SwissLife, localhost, frame principal ou iframe
 */

export function detectEnvironment() {
  const hostname = window.location.hostname;
  const port = window.location.port;
  const href = window.location.href;
  const pathname = window.location.pathname;

  // Plateforme: localhost:5174 ou domaine Vercel (valeur par défaut)
  const isPlatform = (hostname === 'localhost' && port === '5174') || hostname === 'mutuelles-lead-extractor.vercel.app';
  // SwissLife (par défaut)
  const isSwissLife = hostname.includes('swisslifeone.fr');

  // Environnement valide si plateforme ou SwissLife
  const isValid = isSwissLife || isPlatform;

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
    isPlatform,
    isValid,
    isMainFrame,
    isTarificateurIframe
  };
}
