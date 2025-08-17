// Helpers DOM de base
window.SwissLifeDOM = {
  // Sélecteurs de base
  q: (selector) => document.querySelector(selector),
  qa: (selector) => [...document.querySelectorAll(selector)],
  
  // Déclenchement d'événements
  ev: (el, type) => el && el.dispatchEvent(new Event(type, { bubbles: true })),
  
  // Normalisation de texte pour comparaisons
  normalizeText: (text) => 
    String(text || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim(),

  // Obtenir le texte sélectionné dans un select
  getSelectedText: (selectEl) => {
    if (!selectEl) return '';
    const opt = selectEl.options[selectEl.selectedIndex];
    return (opt && (opt.textContent || '').trim()) || '';
  },

  // Recherche d'éléments avec fallback
  findElementWithFallback: (primarySelector, fallbackPattern) => {
    let element = SwissLifeDOM.q(primarySelector);
    if (element) return element;

    if (fallbackPattern) {
      element = SwissLifeDOM.q(fallbackPattern);
      if (element) {
        SwissLifeLoggerCore.info(`Utilisation du fallback selector: ${fallbackPattern}`);
        return element;
      }
    }
    return null;
  }
};
