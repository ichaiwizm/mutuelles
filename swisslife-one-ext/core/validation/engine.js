// Moteur de validation pour les plugins SwissLife
window.SwissLifeValidationEngine = {

  // Validation complète d'un plugin
  validatePlugin: (plugin) => {
    const errors = [];
    
    // Validation des propriétés requises de base
    if (!plugin.name || typeof plugin.name !== 'string') {
      errors.push('Propriété "name" manquante ou invalide');
    }
    
    if (!plugin.version || typeof plugin.version !== 'string') {
      errors.push('Propriété "version" manquante ou invalide');
    }
    
    if (!plugin.steps || !Array.isArray(plugin.steps) || plugin.steps.length === 0) {
      errors.push('Propriété "steps" manquante, invalide ou vide');
      return { valid: false, errors };
    }

    // Validation des steps
    plugin.steps.forEach((step, index) => {
      const stepErrors = SwissLifeValidationEngine.validateStep(step, index);
      errors.push(...stepErrors);
    });

    // Validation des transforms
    if (plugin.transforms) {
      Object.entries(plugin.transforms).forEach(([name, code]) => {
        if (typeof code !== 'string') {
          errors.push(`Transform "${name}" doit être une chaîne de caractères`);
        }
      });
    }

    // Validation des actions
    if (plugin.actions) {
      Object.entries(plugin.actions).forEach(([name, code]) => {
        if (typeof code !== 'string') {
          errors.push(`Action "${name}" doit être une chaîne de caractères`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  validateStep: (step, index) => {
    const errors = [];
    const stepPrefix = `Step ${index} ("${step.id || 'unnamed'}")`;
    
    if (!step.id || typeof step.id !== 'string') {
      errors.push(`${stepPrefix}: propriété "id" manquante ou invalide`);
    }
    
    if (!step.name || typeof step.name !== 'string') {
      errors.push(`${stepPrefix}: propriété "name" manquante ou invalide`);
    }

    if (step.delay !== undefined && (typeof step.delay !== 'number' || step.delay < 0)) {
      errors.push(`${stepPrefix}: propriété "delay" doit être un nombre positif`);
    }

    // Validation des fields
    if (step.fields) {
      Object.entries(step.fields).forEach(([fieldName, fieldConfig]) => {
        const fieldErrors = SwissLifeValidationEngine.validateField(fieldConfig, `${stepPrefix}.${fieldName}`);
        errors.push(...fieldErrors);
      });
    }

    // Validation des dynamicFields
    if (step.dynamicFields) {
      const fieldErrors = SwissLifeValidationEngine.validateDynamicField(step.dynamicFields, `${stepPrefix}.dynamicFields`);
      errors.push(...fieldErrors);
    }

    return errors;
  },

  validateField: (field, fieldPrefix) => {
    const errors = [];
    const validTypes = ['input', 'select', 'selectByValue', 'radio', 'checkbox', 'date'];
    const validWaitFor = ['element', 'selectOptions'];
    
    if (!field.selector || typeof field.selector !== 'string') {
      errors.push(`${fieldPrefix}: propriété "selector" manquante ou invalide`);
    }
    
    if (!field.type || !validTypes.includes(field.type)) {
      errors.push(`${fieldPrefix}: propriété "type" manquante ou invalide (${validTypes.join(', ')})`);
    }

    if (field.waitFor && !validWaitFor.includes(field.waitFor)) {
      errors.push(`${fieldPrefix}: propriété "waitFor" invalide (${validWaitFor.join(', ')})`);
    }

    if (field.required !== undefined && typeof field.required !== 'boolean') {
      errors.push(`${fieldPrefix}: propriété "required" doit être un booléen`);
    }

    if (field.retry !== undefined && typeof field.retry !== 'boolean') {
      errors.push(`${fieldPrefix}: propriété "retry" doit être un booléen`);
    }

    return errors;
  },

  validateDynamicField: (dynamicField, fieldPrefix) => {
    const errors = [];
    const validTypes = ['input', 'select', 'selectByValue', 'radio', 'checkbox', 'date'];
    
    if (!dynamicField.pattern || typeof dynamicField.pattern !== 'string') {
      errors.push(`${fieldPrefix}: propriété "pattern" manquante ou invalide`);
    }
    
    if (!dynamicField.type || !validTypes.includes(dynamicField.type)) {
      errors.push(`${fieldPrefix}: propriété "type" manquante ou invalide (${validTypes.join(', ')})`);
    }
    
    if (!dynamicField.dataField || typeof dynamicField.dataField !== 'string') {
      errors.push(`${fieldPrefix}: propriété "dataField" manquante ou invalide`);
    }

    return errors;
  },

  // Validation des données d'entrée (lead data)
  validateLeadData: (data) => {
    const errors = [];
    const schema = SwissLifeValidationSchemas.leadData;
    
    if (!data || typeof data !== 'object') {
      errors.push('Les données doivent être un objet');
      return { valid: false, errors };
    }

    // Propriétés requises
    schema.required.forEach(field => {
      if (!data[field]) {
        errors.push(`Propriété "${field}" manquante ou vide`);
      }
    });

    // Validation des dates
    schema.dateFields.forEach(field => {
      if (data[field] && !SwissLifeValidationEngine.isValidDate(data[field])) {
        errors.push(`${field} invalide`);
      }
    });

    // Validation des tableaux de dates
    schema.arrayDateFields.forEach(field => {
      if (data[field] && Array.isArray(data[field])) {
        data[field].forEach((value, index) => {
          if (!SwissLifeValidationEngine.isValidDate(value)) {
            errors.push(`${field}[${index}] invalide`);
          }
        });
      }
    });

    // Validation des énumérations
    if (schema.enums) {
      Object.entries(schema.enums).forEach(([field, validValues]) => {
        if (data[field] && !validValues.includes(data[field])) {
          errors.push(`${field} doit être l'une des valeurs: ${validValues.join(', ')}`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  // Validation d'une date au format DD/MM/YYYY
  isValidDate: (dateString) => {
    if (!dateString || typeof dateString !== 'string') return false;
    
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = dateString.match(dateRegex);
    
    if (!match) return false;
    
    const [, day, month, year] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    return date.getDate() == parseInt(day) &&
           date.getMonth() == parseInt(month) - 1 &&
           date.getFullYear() == parseInt(year);
  },

  // Validation avec rapport détaillé
  validateWithReport: (plugin) => {
    const startTime = Date.now();
    const result = SwissLifeValidationEngine.validatePlugin(plugin);
    const duration = Date.now() - startTime;
    
    SwissLifeLoggerCore.debug(`Validation du plugin terminée en ${duration}ms`, {
      valid: result.valid,
      errorsCount: result.errors.length
    });

    if (!result.valid) {
      SwissLifeLoggerCore.error('Plugin invalide', { errors: result.errors });
      result.errors.forEach(error => {
        SwissLifeLoggerCore.error(`Validation: ${error}`);
      });
    } else {
      SwissLifeLoggerCore.info('Plugin valide ✅');
    }

    return result;
  }
};
