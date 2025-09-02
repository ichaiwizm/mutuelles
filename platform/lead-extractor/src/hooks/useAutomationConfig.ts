import { useState, useEffect } from 'react';
import { StorageManager } from '@/lib/storage';
import { ExtensionBridge } from '@/services/extension-bridge';
import { toast } from 'sonner';

export interface AutomationConfig {
  maxRetryAttempts: number;
  retryDelay: number;
  timeoutRetryDelay: number;
}

const DEFAULT_CONFIG: AutomationConfig = {
  maxRetryAttempts: 2,
  retryDelay: 2000,
  timeoutRetryDelay: 3000
};

export const useAutomationConfig = () => {
  const [config, setConfig] = useState<AutomationConfig>(DEFAULT_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Charger la configuration au démarrage
  useEffect(() => {
    const savedConfig = StorageManager.getAutomationConfig();
    if (savedConfig) {
      setConfig(savedConfig);
    }
    setIsLoaded(true);
  }, []);

  // Sauvegarder la configuration
  const saveConfig = async (newConfig: AutomationConfig) => {
    setIsSaving(true);
    
    try {
      // Validation
      if (newConfig.maxRetryAttempts < 0 || newConfig.maxRetryAttempts > 10) {
        throw new Error('Le nombre de tentatives doit être entre 0 et 10');
      }
      
      if (newConfig.retryDelay < 500 || newConfig.retryDelay > 30000) {
        throw new Error('Le délai de retry doit être entre 500ms et 30s');
      }

      // Sauvegarder en local
      StorageManager.saveAutomationConfig(newConfig);
      setConfig(newConfig);

      // Envoyer à l'extension
      const extensionInstalled = await ExtensionBridge.checkExtensionInstalled();
      if (extensionInstalled) {
        await ExtensionBridge.updateAutomationConfig(newConfig);
        toast.success('Configuration mise à jour avec succès');
      } else {
        toast.warning('Configuration sauvée. Extension non détectée - redémarrez l\'extension.');
      }

    } catch (error) {
      console.error('❌ Erreur sauvegarde config:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  // Réinitialiser aux valeurs par défaut
  const resetToDefaults = async () => {
    await saveConfig(DEFAULT_CONFIG);
  };

  // Calculer le temps total estimé pour un lead
  const getEstimatedTimePerLead = () => {
    // Estimation : 10 étapes × (retry delay + processing time) × retry attempts
    const avgProcessingTimePerStep = 3000; // 3s par étape
    const totalSteps = 10;
    const timePerAttempt = totalSteps * (avgProcessingTimePerStep + config.retryDelay);
    const totalTime = timePerAttempt * (config.maxRetryAttempts + 1);
    
    return Math.round(totalTime / 1000); // Retourner en secondes
  };

  return {
    config,
    isLoaded,
    isSaving,
    saveConfig,
    resetToDefaults,
    getEstimatedTimePerLead,
    // Propriétés individuelles pour faciliter l'usage
    maxRetryAttempts: config.maxRetryAttempts,
    retryDelay: config.retryDelay,
    timeoutRetryDelay: config.timeoutRetryDelay
  };
};