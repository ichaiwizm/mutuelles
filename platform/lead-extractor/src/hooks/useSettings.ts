import { useState, useEffect } from 'react';
import { StorageManager } from '@/lib/storage';
import type { DateRange } from 'react-day-picker';

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
  },
  dateRange: null as DateRange | null
};

export const useSettings = () => {
  const [days, setDays] = useState(DEFAULT_SETTINGS.days);
  const [dateRange, setDateRange] = useState<DateRange | null>(DEFAULT_SETTINGS.dateRange);
  const [filterMode, setFilterMode] = useState<'predefined' | 'custom'>('predefined');
  const [isLoaded, setIsLoaded] = useState(false);

  // Charger les paramètres au démarrage
  useEffect(() => {
    const settings = StorageManager.getSettings();
    setDays(settings.days);
    if (settings.dateRange) {
      setDateRange({
        from: settings.dateRange.from ? new Date(settings.dateRange.from) : undefined,
        to: settings.dateRange.to ? new Date(settings.dateRange.to) : undefined
      });
      setFilterMode('custom');
    }
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
      },
      dateRange: dateRange ? {
        from: dateRange.from?.toISOString(),
        to: dateRange.to?.toISOString()
      } : null
    };
    StorageManager.saveSettings(settings);
  }, [days, dateRange, isLoaded]);

  const updateDays = (newDays: number) => {
    setDays(newDays);
    setFilterMode('predefined');
    setDateRange(null);
  };

  const updateDateRange = (range: DateRange | undefined) => {
    setDateRange(range || null);
    setFilterMode(range ? 'custom' : 'predefined');
    // Si on revient en mode prédéfini, s'assurer qu'on a une valeur par défaut
    if (!range && days === 0) {
      setDays(7);
    }
  };

  return {
    days,
    setDays: updateDays,
    dateRange,
    setDateRange: updateDateRange,
    filterMode
  };
};