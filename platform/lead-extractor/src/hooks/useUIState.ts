import { useState, useEffect } from 'react';
import { StorageManager } from '@/lib/storage';

export interface UIState {
  pageSize: number;
  currentPage: number;
  activeTab: 'leads' | 'all';
  globalFilter: string;
}

export const useUIState = () => {
  const [uiState, setUIState] = useState<UIState>({
    pageSize: 10,
    currentPage: 0,
    activeTab: 'leads',
    globalFilter: ''
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Charger les paramètres UI au démarrage
  useEffect(() => {
    const settings = StorageManager.getSettings();
    setUIState(settings.ui);
    setIsLoaded(true);
  }, []);

  // Sauvegarder automatiquement quand les paramètres UI changent
  useEffect(() => {
    if (!isLoaded) return;

    const settings = StorageManager.getSettings();
    settings.ui = uiState;
    StorageManager.saveSettings(settings);
  }, [uiState, isLoaded]);

  const updateUIState = (updates: Partial<UIState>) => {
    setUIState(prev => ({
      ...prev,
      ...updates,
      // Validation : pageSize max 100
      pageSize: updates.pageSize ? Math.min(100, Math.max(1, updates.pageSize)) : prev.pageSize
    }));
  };

  const setPageSize = (pageSize: number) => {
    updateUIState({ pageSize, currentPage: 0 }); // Reset à la page 0 lors du changement de taille
  };

  const setCurrentPage = (currentPage: number) => {
    updateUIState({ currentPage });
  };

  const setActiveTab = (activeTab: 'leads' | 'all') => {
    updateUIState({ activeTab, currentPage: 0 }); // Reset à la page 0 lors du changement d'onglet
  };

  const setGlobalFilter = (globalFilter: string) => {
    updateUIState({ globalFilter, currentPage: 0 }); // Reset à la page 0 lors de la recherche
  };


  return {
    uiState,
    setPageSize,
    setCurrentPage,
    setActiveTab,
    setGlobalFilter,
    updateUIState
  };
};