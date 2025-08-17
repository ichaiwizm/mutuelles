// Gestion des sélecteurs et des selects
window.SwissLifeSelectors = {

  // Sélection par valeur dans un select (pour les nombres)
  setSelectByValue: (selector, targetValue) => {
    const el = SwissLifeDOM.q(selector);
    
    if (!el) {
      SwissLifeLoggerCore.warn(`Select manquant: ${selector}`);
      return false;
    }
    
    // Conversion en string pour comparaison
    const valueStr = String(targetValue);
    
    // Chercher par value exacte d'abord
    const hitByValue = [...el.options].find(option => option.value === valueStr);
    if (hitByValue) {
      el.value = hitByValue.value;
      SwissLifeDOM.ev(el, 'input');
      SwissLifeDOM.ev(el, 'change');
      return true;
    }
    
    // Sinon, chercher par text content
    const hitByText = [...el.options].find(option => {
      const text = SwissLifeDOM.normalizeText(option.textContent || '');
      return text === SwissLifeDOM.normalizeText(valueStr);
    });
    
    if (hitByText) {
      el.value = hitByText.value;
      SwissLifeDOM.ev(el, 'input');
      SwissLifeDOM.ev(el, 'change');
      return true;
    }
    
    SwissLifeLoggerCore.warn(`Option introuvable pour ${selector} → ${targetValue}`);
    return false;
  },

  // Sélection par texte dans un select
  setSelectByText: (selector, targetText, options = {}) => {
    const { contains = false } = options;
    const el = SwissLifeDOM.q(selector);
    
    if (!el) {
      SwissLifeLoggerCore.warn(`Select manquant: ${selector}`);
      return false;
    }
    
    const hit = [...el.options].find(option => {
      const text = option.textContent || '';
      const normalizedTarget = SwissLifeDOM.normalizeText(targetText);
      const normalizedText = SwissLifeDOM.normalizeText(text);
      
      return contains ? normalizedText.includes(normalizedTarget) : normalizedText === normalizedTarget;
    });
    
    if (hit) {
      el.value = hit.value;
      SwissLifeDOM.ev(el, 'input');
      SwissLifeDOM.ev(el, 'change');
      return true;
    }
    
    SwissLifeLoggerCore.warn(`Option introuvable pour ${selector} → ${targetText}`);
    return false;
  },

  // Sélection avec retry pour gérer les reconstructions DOM
  setSelectByTextWithRetry: async (selector, targetText, options = {}) => {
    const { 
      tries = 6, 
      interval = 300, 
      contains = false, 
      logLabel = 'select' 
    } = options;

    for (let i = 0; i < tries; i++) {
      let el = SwissLifeDOM.q(selector);
      if (!el || !el.options || el.options.length === 0) {
        await new Promise(r => setTimeout(r, interval));
        continue;
      }

      // Tentative de sélection
      const hit = [...el.options].find(o => {
        const t = SwissLifeDOM.normalizeText(o.textContent || '');
        const target = SwissLifeDOM.normalizeText(targetText);
        return contains ? t.includes(target) : t === target;
      });
      
      if (hit) {
        el.value = hit.value;
        SwissLifeDOM.ev(el, 'input');
        SwissLifeDOM.ev(el, 'change');
      }

      // Vérification après un court délai
      await new Promise(r => setTimeout(r, Math.max(150, interval / 2)));

      const fresh = SwissLifeDOM.q(selector);
      const currentText = SwissLifeDOM.getSelectedText(fresh);
      const normalized = SwissLifeDOM.normalizeText(currentText);
      const targetNorm = SwissLifeDOM.normalizeText(targetText);
      
      if (fresh && normalized === targetNorm) {
        return true;
      }
      
      await new Promise(r => setTimeout(r, interval));
    }
    
    SwissLifeLoggerCore.warn(`❌ ${logLabel}: impossible de fixer « ${targetText} » après ${tries} tentatives`);
    return false;
  }
};
