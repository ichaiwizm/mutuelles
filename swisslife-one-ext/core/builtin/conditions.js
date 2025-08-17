// Évaluateur de conditions sécurisé sans eval
window.SwissLifeConditionEvaluator = {
  
  // Évaluer une condition sans eval – gère &&, ===, longueur > N, truthiness
  evaluate: (condition, data) => {
    try {
      return condition.split('&&').every(token => {
        const part = token.trim();

        // Pattern 1 : data.prop.length > N
        let m = part.match(/^data\.(\w+)\.length\s*>\s*(\d+)$/);
        if (m) {
          const [, prop, n] = m;
          const arr = data[prop];
          return Array.isArray(arr) && arr.length > Number(n);
        }

        // Pattern 2 : data.prop === 'value'
        m = part.match(/^data\.(\w+)\s*===\s*['"]?(.*?)['"]?$/);
        if (m) {
          const [, prop, val] = m;
          return String(data[prop] ?? '') === val;
        }

        // Pattern 3 : data.prop (truthy)
        m = part.match(/^data\.(\w+)$/);
        if (m) {
          const [, prop] = m;
          return Boolean(data[prop]);
        }

        // Token non reconnu -> faux
        SwissLifeLoggerCore.warn(`Condition non supportée: ${part}`);
        return false;
      });
    } catch (err) {
      SwissLifeLoggerCore.error('Erreur ConditionEvaluator', { condition, err: err.message });
      return false;
    }
  }
};
