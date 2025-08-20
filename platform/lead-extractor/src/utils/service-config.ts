// Configuration des services d'automation

export interface SwissLifeConfig {
  // Valeurs forcées
  forceValues: {
    dateEffet?: string; // Date d'effet forcée (format DD/MM/YYYY) ou "auto" pour mois prochain
    hospitalComfort?: 'oui' | 'non'; // Force la valeur confort hospitalisation
    gammes?: string; // Force une gamme spécifique
  };
  
  // Options du contrat
  options: {
    madelin: 'oui' | 'non'; // Option Madelin
    resiliation: 'oui' | 'non'; // Résiliation contrat actuel
    reprise: 'oui' | 'non'; // Reprise d'ancienneté
  };
  
  // Navigation automatique
  navigation: {
    autoNext: boolean; // Cliquer automatiquement sur "Suivant"
  };
}

export interface ServiceConfigs {
  swisslife: SwissLifeConfig;
  // Futurs services...
}

// Configuration par défaut SwissLife
const DEFAULT_SWISSLIFE_CONFIG: SwissLifeConfig = {
  forceValues: {
    dateEffet: 'auto', // 1er du mois prochain
    hospitalComfort: 'non',
    gammes: 'SwissLife Santé'
  },
  options: {
    madelin: 'oui', // Option Madelin activée par défaut
    resiliation: 'non', // Pas de résiliation par défaut
    reprise: 'non' // Pas de reprise par défaut
  },
  navigation: {
    autoNext: true // Clic automatique sur "Suivant" par défaut
  }
};

// Gestionnaire de configuration
export class ServiceConfigManager {
  private static readonly CONFIG_STORAGE_KEY = 'service_configs';
  
  // Récupérer la configuration d'un service
  static getServiceConfig(serviceName: keyof ServiceConfigs): SwissLifeConfig {
    const configs = this.getAllConfigs();
    return configs[serviceName] || this.getDefaultConfig(serviceName) as SwissLifeConfig;
  }
  
  // Sauvegarder la configuration d'un service
  static saveServiceConfig(serviceName: keyof ServiceConfigs, config: SwissLifeConfig): void {
    const configs = this.getAllConfigs();
    configs[serviceName] = config;
    localStorage.setItem(this.CONFIG_STORAGE_KEY, JSON.stringify(configs));
  }
  
  // Récupérer toutes les configurations
  static getAllConfigs(): ServiceConfigs {
    const stored = localStorage.getItem(this.CONFIG_STORAGE_KEY);
    if (!stored) return this.getDefaultConfigs();
    
    try {
      const parsed = JSON.parse(stored);
      
      // Nettoyer les anciennes propriétés obsolètes
      if (parsed.swisslife?.forceValues?.projectName) {
        delete parsed.swisslife.forceValues.projectName;
        // Sauvegarder la configuration nettoyée
        localStorage.setItem(this.CONFIG_STORAGE_KEY, JSON.stringify(parsed));
      }
      
      // Merger avec les valeurs par défaut pour éviter les propriétés manquantes
      return {
        swisslife: { ...DEFAULT_SWISSLIFE_CONFIG, ...parsed.swisslife }
      };
    } catch {
      return this.getDefaultConfigs();
    }
  }
  
  // Configurations par défaut
  static getDefaultConfigs(): ServiceConfigs {
    return {
      swisslife: { ...DEFAULT_SWISSLIFE_CONFIG }
    };
  }
  
  // Configuration par défaut d'un service
  static getDefaultConfig(serviceName: keyof ServiceConfigs): SwissLifeConfig {
    switch (serviceName) {
      case 'swisslife':
        return { ...DEFAULT_SWISSLIFE_CONFIG };
      default:
        return { ...DEFAULT_SWISSLIFE_CONFIG };
    }
  }
  
  // Réinitialiser la configuration d'un service
  static resetServiceConfig(serviceName: keyof ServiceConfigs): void {
    const defaultConfig = this.getDefaultConfig(serviceName);
    this.saveServiceConfig(serviceName, defaultConfig);
  }
  
  // Vérifier si une configuration existe
  static hasCustomConfig(serviceName: keyof ServiceConfigs): boolean {
    const stored = localStorage.getItem(this.CONFIG_STORAGE_KEY);
    if (!stored) return false;
    
    try {
      const parsed = JSON.parse(stored);
      return !!parsed[serviceName];
    } catch {
      return false;
    }
  }
}

// Helpers pour les valeurs de configuration
export class ConfigValueHelper {
  
  // Résoudre une date d'effet selon la config
  static resolveDateEffet(configValue?: string): string {
    if (!configValue || configValue === 'auto') {
      // 1er du mois prochain
      const today = new Date();
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      
      const day = nextMonth.getDate().toString().padStart(2, '0');
      const month = (nextMonth.getMonth() + 1).toString().padStart(2, '0');
      const year = nextMonth.getFullYear();
      
      return `${day}/${month}/${year}`;
    }
    
    return configValue;
  }
  
  
  // Valider les données selon la config
  static validateData(data: any, _config: SwissLifeConfig): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validation date d'effet
    if (!data.dateEffet) {
      errors.push('Date d\'effet manquante');
    }
    
    // Validation champs obligatoires
    if (!data.souscripteur?.dateNaissance) {
      warnings.push('Date de naissance du souscripteur manquante');
    }
    
    // Validation simulation couple
    if (data.simulationType === 'couple' && !data.conjoint) {
      warnings.push('Informations du conjoint manquantes pour une simulation couple');
    }
    
    // Validation logique métier
    if (data.options?.reprise === 'oui' && data.options?.resiliation === 'non') {
      errors.push('Incohérence: reprise d\'ancienneté sans résiliation');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}