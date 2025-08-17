// Fonctions d'attente DOM intelligentes
window.SwissLifeWaiters = {
  
  // Attendre qu'un élément soit disponible et visible
  waitForElement: (selector, timeout = 5000) => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkElement = () => {
        const element = SwissLifeDOM.q(selector);
        if (element && element.offsetParent !== null) {
          resolve(element);
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          SwissLifeLoggerCore.warn(`Timeout: élément ${selector} non trouvé après ${timeout}ms`);
          resolve(null);
          return;
        }
        
        setTimeout(checkElement, 100);
      };
      
      checkElement();
    });
  },

  // Attendre les options d'un select avec MutationObserver
  waitForSelectOptions: (selector, minOptions = 2, timeout = 5000) => {
    return new Promise((resolve) => {
      const element = SwissLifeDOM.q(selector);
      if (!element) {
        SwissLifeLoggerCore.warn(`Select ${selector} introuvable`);
        resolve(null);
        return;
      }

      // Vérification immédiate
      if (element.options && element.options.length >= minOptions) {
        resolve(element);
        return;
      }

      const startTime = Date.now();
      let observer;

      const checkOptions = () => {
        if (element.options && element.options.length >= minOptions) {
          if (observer) observer.disconnect();
          resolve(element);
          return true;
        }
        
        if (Date.now() - startTime > timeout) {
          if (observer) observer.disconnect();
          SwissLifeLoggerCore.warn(`Timeout: options pour ${selector} non disponibles après ${timeout}ms`);
          resolve(null);
          return true;
        }
        
        return false;
      };

      // Observer les changements dans le select
      observer = new MutationObserver(() => {
        checkOptions();
      });

      observer.observe(element, { 
        childList: true, 
        subtree: true 
      });

      // Fallback avec timeout classique
      const intervalCheck = setInterval(() => {
        if (checkOptions()) {
          clearInterval(intervalCheck);
        }
      }, 150);

      setTimeout(() => {
        clearInterval(intervalCheck);
        if (observer) observer.disconnect();
        if (!checkOptions()) {
          resolve(null);
        }
      }, timeout);
    });
  },

  // Attendre un changement DOM avec MutationObserver
  waitForDOMChange: (targetSelector, options = {}) => {
    const { timeout = 5000, childList = true, subtree = true } = options;
    
    return new Promise((resolve) => {
      const target = SwissLifeDOM.q(targetSelector);
      if (!target) {
        resolve(false);
        return;
      }

      const observer = new MutationObserver((mutations) => {
        observer.disconnect();
        resolve(true);
      });

      observer.observe(target, { childList, subtree });

      setTimeout(() => {
        observer.disconnect();
        resolve(false);
      }, timeout);
    });
  }
};
