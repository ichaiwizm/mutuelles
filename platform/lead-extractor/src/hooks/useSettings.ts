import { useState, useEffect } from 'react';
import { StorageManager } from '@/lib/storage';
import { toast } from 'sonner';

const DEFAULT_SETTINGS = {
  days: 7,
  sources: {
    gmail: true
  },
  ui: {
    pageSize: 10,
    currentPage: 0,
    activeTab: 'leads' as const,
    globalFilter: ''
  }
};

export const useSettings = () => {
  const [days, setDays] = useState(DEFAULT_SETTINGS.days);
  const [isLoaded, setIsLoaded] = useState(false);

  // Charger les paramètres au démarrage
  useEffect(() => {
    const settings = StorageManager.getSettings();
    setDays(settings.days);
    setIsLoaded(true);
  }, []);

  // Sauvegarder automatiquement quand les paramètres changent (mais seulement après le chargement initial)
  useEffect(() => {
    if (!isLoaded) return;
    
    const currentSettings = StorageManager.getSettings();
    const settings = {
      ...currentSettings,
      days,
      sources: {
        gmail: true // Toujours activé maintenant
      }
    };
    StorageManager.saveSettings(settings);
  }, [days, isLoaded]);

  return {
    days,
    setDays
  };
};