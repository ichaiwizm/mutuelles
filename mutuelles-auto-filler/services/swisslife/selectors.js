// Système de sélection d'éléments SwissLife
window.SwissLifeSelectors = {

  // Trouver un élément avec fallbacks
  async findElement(field) {
    const selectors = field.selectors;
    
    // 1. Sélecteur principal
    if (selectors.primary) {
      const element = document.querySelector(selectors.primary);
      if (element && this.isVisible(element)) {
        return element;
      }
    }

    // 2. Sélecteurs de fallback
    if (selectors.fallbacks) {
      for (const selector of selectors.fallbacks) {
        const element = document.querySelector(selector);
        if (element && this.isVisible(element)) {
          return element;
        }
      }
    }

    // 3. Recherche contextuelle
    if (selectors.contextSearch) {
      const element = await this.contextualSearch(selectors.contextSearch, field.type);
      if (element) {
        return element;
      }
    }

    // 4. Gestion des patterns (pour arrays)
    if (selectors.pattern) {
      // Géré spécifiquement dans les actions array
      return null;
    }

    return null;
  },

  // Recherche par contexte et libellé
  async contextualSearch(searchConfig, fieldType) {
    const { labelRegex, sectionKeywords } = searchConfig;
    
    // Recherche par regex sur les labels
    if (labelRegex) {
      const regex = new RegExp(labelRegex.slice(1, -2), 'i'); // Enlever les /.../ 
      const labels = document.querySelectorAll('label, legend, .label, [role="label"]');
      
      for (const label of labels) {
        if (regex.test(label.textContent)) {
          const targetElement = this.findInputNearLabel(label, fieldType);
          if (targetElement) {
            return targetElement;
          }
        }
      }
    }

    // Recherche par mots-clés de section
    if (sectionKeywords) {
      return this.findInSection(sectionKeywords, fieldType);
    }

    return null;
  },

  // Trouver un input près d'un label
  findInputNearLabel(label, fieldType) {
    // 1. Label avec attribut 'for'
    if (label.getAttribute('for')) {
      const target = document.getElementById(label.getAttribute('for'));
      if (target && this.matchesFieldType(target, fieldType)) {
        return target;
      }
    }

    // 2. Input dans le même conteneur
    const container = label.closest('.form-group, .row, .col, section, fieldset, .panel, .card, div');
    if (container) {
      const input = container.querySelector(this.getTypeSelector(fieldType));
      if (input && this.isVisible(input)) {
        return input;
      }
    }

    // 3. Sibling suivant
    const sibling = label.nextElementSibling;
    if (sibling) {
      const input = sibling.querySelector ? 
        sibling.querySelector(this.getTypeSelector(fieldType)) : 
        (this.matchesFieldType(sibling, fieldType) ? sibling : null);
      
      if (input && this.isVisible(input)) {
        return input;
      }
    }

    return null;
  },

  // Recherche dans une section par mots-clés
  findInSection(keywords, fieldType) {
    const sections = document.querySelectorAll('section, fieldset, .panel, .card, .box, .bloc, div');
    
    for (const section of sections) {
      const text = section.textContent.toLowerCase();
      const hasAllKeywords = keywords.every(keyword => 
        text.includes(keyword.toLowerCase())
      );
      
      if (hasAllKeywords) {
        const input = section.querySelector(this.getTypeSelector(fieldType));
        if (input && this.isVisible(input)) {
          return input;
        }
      }
    }

    return null;
  },

  // Obtenir sélecteur par type de champ
  getTypeSelector(fieldType) {
    switch (fieldType) {
      case 'input':
        return 'input[type="text"], input[type="date"], input:not([type])';
      case 'radio':
        return 'input[type="radio"]';
      case 'checkbox':
        return 'input[type="checkbox"]';
      case 'select':
        return 'select';
      default:
        return 'input, select, textarea';
    }
  },

  // Vérifier si un élément correspond au type
  matchesFieldType(element, fieldType) {
    switch (fieldType) {
      case 'input':
        return element.tagName === 'INPUT' && 
               ['text', 'date', ''].includes(element.type);
      case 'radio':
        return element.tagName === 'INPUT' && element.type === 'radio';
      case 'checkbox':
        return element.tagName === 'INPUT' && element.type === 'checkbox';
      case 'select':
        return element.tagName === 'SELECT';
      default:
        return ['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName);
    }
  },

  // Vérification de visibilité
  isVisible(element) {
    if (!element || !element.isConnected) return false;
    
    // Vérification des parents
    let current = element;
    while (current) {
      if (current.hidden || 
          current.getAttribute?.('aria-hidden') === 'true') {
        return false;
      }
      
      const style = getComputedStyle(current);
      if (style.display === 'none' || 
          style.visibility === 'hidden' || 
          style.opacity === '0') {
        return false;
      }
      
      current = current.parentElement;
    }

    // Vérification des dimensions
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }
};