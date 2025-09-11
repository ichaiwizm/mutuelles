import { useState, useEffect } from 'react';

export interface GlobalConfig {
  enabled: boolean;
  projectName?: 'lead_name' | 'lead_source';
  dateEffet?: 'end_next_month' | 'start_next_month' | 'middle_next_month';
}

const STORAGE_KEY = 'global_config_overrides';

const DEFAULT_CONFIG: GlobalConfig = {
  enabled: false,
  projectName: 'lead_name',
  dateEffet: 'start_next_month'
};

export function useGlobalConfig() {
  const [config, setConfigState] = useState<GlobalConfig>(DEFAULT_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);

  // Charger la configuration depuis localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as GlobalConfig;
        setConfigState({ ...DEFAULT_CONFIG, ...parsed });
      }
    } catch (error) {
      console.warn('Erreur lors du chargement de la config globale:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Écouter les mises à jour cross‑composants (CustomEvent + storage)
  useEffect(() => {
    const onCustom = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail as Partial<GlobalConfig>;
        if (detail) setConfigState({ ...DEFAULT_CONFIG, ...detail });
      } catch (_) { /* ignore */ }
    };
    const onStorage = (e: StorageEvent) => {
      try {
        if (e.key === STORAGE_KEY && typeof e.newValue === 'string') {
          const parsed = JSON.parse(e.newValue) as GlobalConfig;
          setConfigState({ ...DEFAULT_CONFIG, ...parsed });
        }
      } catch (_) { /* ignore */ }
    };
    window.addEventListener('global-config-updated', onCustom as any);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('global-config-updated', onCustom as any);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Sauvegarder la configuration
  const setConfig = (newConfig: Partial<GlobalConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfigState(updated);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      // Notifier les autres composants de la mise à jour
      try {
        const evt: any = new CustomEvent('global-config-updated', { detail: updated });
        window.dispatchEvent(evt);
      } catch (_) { /* ignore */ }
    } catch (error) {
      console.warn('Erreur lors de la sauvegarde de la config globale:', error);
    }
  };

  // Réinitialiser la configuration
  const resetConfig = () => {
    setConfigState(DEFAULT_CONFIG);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Erreur lors de la réinitialisation de la config globale:', error);
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