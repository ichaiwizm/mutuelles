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
  const [gmailEnabled, setGmailEnabled] = useState(DEFAULT_SETTINGS.sources.gmail);
  const [isLoaded, setIsLoaded] = useState(false);

  // Charger les paramètres au démarrage
  useEffect(() => {
    const settings = StorageManager.getSettings();
    setDays(settings.days);
    setGmailEnabled(settings.sources.gmail);
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
        gmail: gmailEnabled
      }
    };
    StorageManager.saveSettings(settings);
  }, [days, gmailEnabled, isLoaded]);

  const saveSettings = () => {
    const currentSettings = StorageManager.getSettings();
    const settings = {
      ...currentSettings,
      days,
      sources: {
        gmail: gmailEnabled
      }
    };
    
    StorageManager.saveSettings(settings);
    toast.success('Paramètres sauvegardés');
  };

  return {
    days,
    setDays,
    gmailEnabled,
    setGmailEnabled,
    saveSettings
  };
};