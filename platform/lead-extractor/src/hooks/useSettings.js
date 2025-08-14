import { useState, useEffect } from 'react';
import { StorageManager } from '@/lib/storage';
import { toast } from 'sonner';

const DEFAULT_SETTINGS = {
  days: 30,
  sources: {
    gmail: true
  }
};

export const useSettings = () => {
  const [days, setDays] = useState(DEFAULT_SETTINGS.days);
  const [gmailEnabled, setGmailEnabled] = useState(DEFAULT_SETTINGS.sources.gmail);

  // Charger les paramètres au démarrage
  useEffect(() => {
    const settings = StorageManager.getSettings();
    setDays(settings.days);
    setGmailEnabled(settings.sources.gmail);
  }, []);

  const saveSettings = () => {
    const settings = {
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