// Types de champs standardisés pour tous les services
window.FieldTypes = {

  // Types de champs supportés
  TYPES: {
    CLICK: 'click',
    INPUT: 'input', 
    SELECT_BY_TEXT: 'select_by_text',
    SELECT_BY_PREFIX: 'select_by_prefix',
    SELECT_BY_COUNT: 'select_by_count',
    CONDITIONAL_CLICK: 'conditional_click',
    INPUT_ARRAY: 'input_array',
    CHECKBOX_CHECK: 'checkbox_check'
  },

  // Valider la configuration d'un champ
  validateFieldConfig: (field) => {
    const errors = [];
    
    if (!field.id) errors.push('id manquant');
    if (!field.type) errors.push('type manquant');
    if (!Object.values(FieldTypes.TYPES).includes(field.type)) {
      errors.push(`type "${field.type}" non supporté`);
    }
    
    // Validations spécifiques par type
    switch (field.type) {
      case FieldTypes.TYPES.CLICK:
      case FieldTypes.TYPES.INPUT:
      case FieldTypes.TYPES.SELECT_BY_TEXT:
      case FieldTypes.TYPES.SELECT_BY_PREFIX:
      case FieldTypes.TYPES.SELECT_BY_COUNT:
      case FieldTypes.TYPES.CHECKBOX_CHECK:
        if (!field.selector) errors.push('selector manquant');
        break;
        
      case FieldTypes.TYPES.CONDITIONAL_CLICK:
        if (!field.selector_individual && !field.selector_couple) {
          errors.push('selector_individual ou selector_couple manquant');
        }
        if (!field.condition) errors.push('condition manquante');
        break;
        
      case FieldTypes.TYPES.INPUT_ARRAY:
        if (!field.selector_pattern) errors.push('selector_pattern manquant');
        break;
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  },

  // Documentation des types de champs
  getTypeDocumentation: () => {
    return {
      [FieldTypes.TYPES.CLICK]: {
        description: 'Cliquer sur un élément (bouton, radio, etc.)',
        required: ['selector'],
        example: {
          id: 'sante_oui',
          type: 'click',
          selector: '#projet-sante-individuelle-oui',
          delay: 100
        }
      },
      
      [FieldTypes.TYPES.INPUT]: {
        description: 'Remplir un champ texte/date',
        required: ['selector', 'value'],
        optional: ['wait_for_element'],
        example: {
          id: 'nom_projet',
          type: 'input',
          selector: '#nom-projet',
          value: 'projetNom',
          delay: 100
        }
      },
      
      [FieldTypes.TYPES.SELECT_BY_TEXT]: {
        description: 'Sélectionner une option par texte exact',
        required: ['selector', 'value'],
        optional: ['wait_for_options'],
        example: {
          id: 'regime_social',
          type: 'select_by_text',
          selector: '#regime-social-assure-principal',
          value: 'Régime Général pour TNS (CPAM)',
          delay: 100
        }
      },
      
      [FieldTypes.TYPES.CONDITIONAL_CLICK]: {
        description: 'Clic conditionnel selon une propriété des données',
        required: ['selector_individual', 'selector_couple', 'condition'],
        example: {
          id: 'simulation_type',
          type: 'conditional_click',
          selector_individual: '#simulation-individuelle',
          selector_couple: '#simulation-couple',
          condition: 'simulationType',
          delay: 100
        }
      }
    };
  }
};