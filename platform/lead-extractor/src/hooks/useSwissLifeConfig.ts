import { useState, useEffect } from 'react';

export interface SwissLifeConfig {
  enabled: boolean;
  projectName?: 'lead_name' | 'lead_source';
  dateEffet?: 'end_next_month' | 'start_next_month' | 'middle_next_month';
  hospitalComfort?: 'oui' | 'non';
  gammes?: 'SwissLife Santé';
}

const STORAGE_KEY = 'swisslife_config_overrides';

const DEFAULT_CONFIG: SwissLifeConfig = {
  enabled: false,
  projectName: 'lead_name',
  dateEffet: 'start_next_month',
  hospitalComfort: 'non',
  gammes: 'SwissLife Santé'
};

export function useSwissLifeConfig() {
  const [config, setConfigState] = useState<SwissLifeConfig>(DEFAULT_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);

  // Charger la configuration depuis localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SwissLifeConfig;
        setConfigState({ ...DEFAULT_CONFIG, ...parsed });
      }
    } catch (error) {
      console.warn('Erreur lors du chargement de la config SwissLife:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Sauvegarder la configuration
  const setConfig = (newConfig: Partial<SwissLifeConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfigState(updated);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('Erreur lors de la sauvegarde de la config SwissLife:', error);
    }
  };

  // Réinitialiser la configuration
  const resetConfig = () => {
    setConfigState(DEFAULT_CONFIG);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Erreur lors de la réinitialisation de la config SwissLife:', error);
    }
  };

  // Calculer les dates du mois suivant
  const getNextMonthDates = () => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    // Début du mois suivant
    const startDate = new Date(nextMonth);
    
    // Milieu du mois suivant (15)
    const middleDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 15);
    
    // Fin du mois suivant
    const endDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0);
    
    return {
      start: startDate.toLocaleDateString('fr-FR'),
      middle: middleDate.toLocaleDateString('fr-FR'),
      end: endDate.toLocaleDateString('fr-FR')
    };
  };

  // Obtenir les overrides actifs pour l'extension
  const getActiveOverrides = () => {
    if (!config.enabled) return null;

    const overrides: Record<string, any> = {};
    
    if (config.projectName) {
      overrides.projectName = config.projectName;
    }
    
    if (config.dateEffet) {
      overrides.dateEffet = config.dateEffet;
    }
    
    if (config.hospitalComfort) {
      overrides.hospitalComfort = config.hospitalComfort;
    }
    
    if (config.gammes) {
      overrides.gammes = config.gammes;
    }

    return Object.keys(overrides).length > 0 ? overrides : null;
  };

  return {
    config,
    setConfig,
    resetConfig,
    getActiveOverrides,
    getNextMonthDates,
    isLoaded
  };
}