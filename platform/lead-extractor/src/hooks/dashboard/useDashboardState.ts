import { useState } from 'react';
import type { Lead } from '@/types/lead';

export interface DashboardModalState {
  selectedLead: Lead | null;
  modalLeads: Lead[];
  currentLeadIndex: number;
  modalOpen: boolean;
  configModalOpen: boolean;
  manualDialogOpen: boolean;
}

export interface DashboardUIState {
  sendingToExtension: boolean;
  lastSyncGmail: string | null;
}

export const useDashboardState = () => {
  // État des modales
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [modalLeads, setModalLeads] = useState<Lead[]>([]);
  const [currentLeadIndex, setCurrentLeadIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);

  // État de l'interface utilisateur
  const [sendingToExtension, setSendingToExtension] = useState(false);
  const [lastSyncGmail, setLastSyncGmail] = useState<string | null>(null);

  const modalState: DashboardModalState = {
    selectedLead,
    modalLeads,
    currentLeadIndex,
    modalOpen,
    configModalOpen,
    manualDialogOpen,
  };

  const modalActions = {
    setSelectedLead,
    setModalLeads,
    setCurrentLeadIndex,
    setModalOpen,
    setConfigModalOpen,
    setManualDialogOpen,
  };

  const uiState: DashboardUIState = {
    sendingToExtension,
    lastSyncGmail,
  };

  const uiActions = {
    setSendingToExtension,
    setLastSyncGmail,
  };

  return {
    modalState,
    modalActions,
    uiState,
    uiActions,
  };
};