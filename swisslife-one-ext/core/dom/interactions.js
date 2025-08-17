// Primitives d'interaction avec les éléments DOM
window.SwissLifeInteractions = {

  // Remplir un champ input
  setInputValue: (selector, value, options = {}) => {
    const { triggerEvents = ['input', 'change'], focus = true } = options;
    const el = SwissLifeDOM.q(selector);
    
    if (!el) {
      SwissLifeLoggerCore.warn(`Champ manquant: ${selector}`);
      return false;
    }
    
    if (focus) el.focus();
    el.value = value;
    
    triggerEvents.forEach(eventType => {
      SwissLifeDOM.ev(el, eventType);
    });
    
    return true;
  },

  // Cliquer sur un élément
  clickElement: (selector) => {
    const el = SwissLifeDOM.q(selector);
    
    if (!el) {
      SwissLifeLoggerCore.warn(`Élément manquant: ${selector}`);
      return false;
    }
    
    SwissLifeLoggerCore.debug(`➡️ ClickElement: tentative sur ${selector}`);

    el.click();
    SwissLifeDOM.ev(el, 'input');
    SwissLifeDOM.ev(el, 'change');

    // Pour les radios : vérifier l'état, sinon forcer via label ou attribut
    if (el.type === 'radio') {
      if (!el.checked) {
        SwissLifeLoggerCore.debug(`Radio ${selector} toujours décoché après clic, tentative via label…`);
        const lbl = document.querySelector(`label[for="${el.id}"]`);
        if (lbl) {
          lbl.click();
          SwissLifeDOM.ev(el, 'input');
          SwissLifeDOM.ev(el, 'change');
        }
      }
      // Si toujours pas coché, on force l'attribut pour éviter le fallback couple
      if (!el.checked) {
        SwissLifeLoggerCore.warn(`Radio ${selector} forcé sur checked=true`);
        el.checked = true;
        SwissLifeDOM.ev(el, 'input');
        SwissLifeDOM.ev(el, 'change');
      }
    }

    SwissLifeLoggerCore.debug(`✅ ClickElement: ${selector} checked=${el.checked}`);
    return true;
  },

  // Gérer une checkbox
  setCheckbox: (selector, checked = true) => {
    const el = SwissLifeDOM.q(selector);
    
    if (!el) {
      SwissLifeLoggerCore.warn(`Checkbox manquant: ${selector}`);
      return false;
    }
    
    if (el.checked !== checked) {
      el.click();
    }
    return true;
  },

  // Déclencher un recalcul via focus/blur
  triggerRecalc: (selectors = ['#date-naissance-assure-principal', '#statut-assure-principal']) => {
    for (const selector of selectors) {
      const el = SwissLifeDOM.q(selector);
      if (el) {
        el.focus();
        setTimeout(() => el.blur(), 80);
        return true;
      }
    }
    SwissLifeLoggerCore.warn('Aucun élément trouvé pour déclencher un recalcul');
    return false;
  }
};
