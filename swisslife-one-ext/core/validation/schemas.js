// Schémas de validation pour les plugins SwissLife
window.SwissLifeValidationSchemas = {
  
  // Schéma principal pour les plugins
  plugin: {
    type: "object",
    required: ["name", "version", "steps"],
    properties: {
      name: { type: "string" },
      version: { type: "string" },
      context: {
        type: "object",
        properties: {
          iframeName: { type: "string" },
          routes: { 
            type: "object",
            patternProperties: {
              ".*": { type: "string" }
            }
          }
        }
      },
      steps: {
        type: "array",
        minItems: 1,
        items: { "$ref": "#/definitions/step" }
      },
      transforms: {
        type: "object",
        patternProperties: {
          ".*": { type: "string" }
        }
      },
      actions: {
        type: "object",
        patternProperties: {
          ".*": { type: "string" }
        }
      }
    },
    definitions: {
      step: {
        type: "object",
        required: ["id", "name"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          condition: { type: "string" },
          beforeAction: { type: "string" },
          delay: { type: "number", minimum: 0 },
          fields: {
            type: "object",
            patternProperties: {
              ".*": { "$ref": "#/definitions/field" }
            }
          },
          dynamicFields: { "$ref": "#/definitions/dynamicField" }
        }
      },
      field: {
        type: "object",
        required: ["selector", "type"],
        properties: {
          selector: { type: "string" },
          type: { 
            type: "string",
            enum: ["input", "select", "selectByValue", "radio", "checkbox", "date"]
          },
          dataField: { type: "string" },
          value: {},
          transform: { type: "string" },
          condition: { type: "string" },
          required: { type: "boolean" },
          retry: { type: "boolean" },
          waitFor: { 
            type: "string",
            enum: ["element", "selectOptions"]
          },
          fallbackSelector: { type: "string" }
        }
      },
      dynamicField: {
        type: "object",
        required: ["pattern", "type", "dataField"],
        properties: {
          pattern: { type: "string" },
          type: { 
            type: "string",
            enum: ["input", "select", "selectByValue", "radio", "checkbox", "date"]
          },
          dataField: { type: "string" },
          isArray: { type: "boolean" },
          required: { type: "boolean" }
        }
      }
    }
  },

  // Règles de validation pour les données de lead
  leadData: {
    required: ['projetNom'],
    optional: ['principalDOB', 'conjointDOB', 'enfantsDOB', 'cp', 'statutTexte', 'profTexte', 'gammeTexte', 'simulationType'],
    dateFields: ['principalDOB', 'conjointDOB'],
    arrayDateFields: ['enfantsDOB'],
    enums: {
      simulationType: ['individuelle', 'couple']
    }
  }
};
