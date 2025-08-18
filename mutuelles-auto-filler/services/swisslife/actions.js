// Actions spécialisées SwissLife
window.SwissLifeActions = {

  // Saisie caractère par caractère (pour champs masqués)
  async humanType(element, value, options = {}) {
    const charDelay = options.charDelay || 8;
    
    element.focus();
    element.value = '';
    
    for (const char of value.toString()) {
      element.value += char;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, charDelay));
    }
    
    this.fireEvents(element, options.events || ['change', 'blur']);
    return true;
  },

  // Saisie simple
  async setValue(element, value, options = {}) {
    element.focus();
    element.value = value;
    this.fireEvents(element, options.events || ['input', 'change', 'blur']);
    return true;
  },

  // Séquence de clic complète (pour radios)
  async clickSequence(element, value, options = {}) {
    const events = options.events || ['pointerdown', 'mousedown', 'mouseup', 'click'];
    
    for (const eventType of events) {
      element.dispatchEvent(new Event(eventType, { bubbles: true }));
      await new Promise(r => setTimeout(r, 5));
    }
    
    return true;
  },

  // Sélection dans liste déroulante
  async pickSelect(element, value, options = {}) {
    if (options.waitForOptions) {
      await this.waitForSelectOptions(element, options.waitDelay || 500);
    }

    const option = this.findOption(element, value, options.matching || 'exactValue');
    if (!option) {
      console.warn(`❌ Option "${value}" non trouvée`);
      return false;
    }

    element.value = option.value;
    element.selectedIndex = option.index;
    this.fireEvents(element, options.events || ['focus', 'change', 'blur']);
    return true;
  },

  // Clic sur checkbox via label
  async clickLabel(element, checked, options = {}) {
    if (element.checked === checked) {
      return true; // Déjà dans le bon état
    }

    // Chercher le label associé
    const label = document.querySelector(`label[for="${element.id}"]`) || 
                  element.closest('label');
    
    if (label) {
      label.click();
    } else {
      element.click();
    }

    this.fireEvents(element, options.events || ['change']);
    return true;
  },

  // Remplissage de tableau (enfants)
  async fillArray(pattern, values, options = {}) {
    const results = [];
    
    for (let i = 0; i < values.length; i++) {
      const selector = pattern.replace('{index}', i);
      const element = document.querySelector(selector);
      
      if (element) {
        const success = await this.executeFieldAction(element, values[i], options);
        results.push(success);
      } else if (options.mode !== 'loose') {
        console.warn(`❌ Élément ${selector} non trouvé`);
        results.push(false);
      }
    }
    
    return results.every(r => r);
  },

  // Utilitaires
  fireEvents(element, events) {
    events.forEach(eventType => {
      element.dispatchEvent(new Event(eventType, { bubbles: true }));
    });
  },

  async waitForSelectOptions(element, delay = 500) {
    await new Promise(r => setTimeout(r, delay));
    
    const startTime = Date.now();
    while (Date.now() - startTime < 5000) {
      if (element.options && element.options.length > 1) {
        return true;
      }
      await new Promise(r => setTimeout(r, 100));
    }
    
    return false;
  },

  findOption(selectElement, value, matching) {
    const options = [...selectElement.options];
    
    switch (matching) {
      case 'exactValue':
        return options.find(opt => opt.value === value);
      
      case 'prefix':
        return options.find(opt => 
          opt.textContent.trim().startsWith(value)
        );
      
      case 'text':
        return options.find(opt => 
          opt.textContent.trim() === value
        );
      
      default:
        return options.find(opt => 
          opt.value === value || opt.textContent.trim() === value
        );
    }
  }
};