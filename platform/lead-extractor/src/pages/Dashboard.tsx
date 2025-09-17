import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLeads } from '@/hooks/useLeads';
import { useSettings } from '@/hooks/useSettings';
import { useUIState } from '@/hooks/useUIState';
import { useSSEExtraction } from '@/hooks/useSSEExtraction';
import { useProcessingStatus } from '@/hooks/useProcessingStatus';
import { useLeadSelection } from '@/hooks/useLeadSelection';
import { useDashboardState } from '@/hooks/dashboard/useDashboardState';
import { useSwissLifeConfig } from '@/hooks/useSwissLifeConfig';
import { useGlobalConfig } from '@/hooks/useGlobalConfig';
import { ExtensionBridge, type LeadStatusUpdate } from '@/services/extension-bridge';
import { DashboardHandlers } from '@/services/dashboard/dashboardHandlers';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSearch } from '@/components/dashboard/DashboardSearch';
import { DashboardModals } from '@/components/dashboard/DashboardModals';
import { ControlsPanel } from '@/components/dashboard/ControlsPanel';
import { ProgressPanel } from '@/components/dashboard/ProgressPanel';
import { LeadsTable } from '@/components/dashboard/LeadsTable';
import { StorageManager } from '@/lib/storage';
import type { Lead } from '@/types/lead';

export function Dashboard() {
  // Hooks principaux
  const { isAuthenticated, hasTokens, email, loading: authLoading, checkAuthStatus, redirectToLogin, logout } = useAuth();
  const { days, setDays, dateRange, setDateRange, filterMode } = useSettings();
  const { leads, addLeads, clearAllLeads, removeLeadsByIds } = useLeads();
  const { enrichLeadsWithStatus, applyStatusUpdate, cleanupOrphanedStatuses, isLoaded, setLeadStatus } = useProcessingStatus();
  const { uiState, setPageSize, setCurrentPage, setGlobalFilter } = useUIState();

  // Hooks de refactorisation
  const { modalState, modalActions, uiState: dashboardUIState, uiActions } = useDashboardState();
  // État d'exécution/isolated retiré (plus de boutons d'arrêt)
  const { getActiveOverrides: getGlobalOverrides } = useGlobalConfig();
  const { getActiveOverrides: getSwissLifeOverrides } = useSwissLifeConfig();

  const {
    showProgress,
    progressPhase,
    progressMessage,
    progressSource,
    progressTotal,
    progressCurrent,
    busy,
    extractWithSSE,
    cancelExtraction
  } = useSSEExtraction(addLeads, checkAuthStatus);

  // Données de table (tous les leads enrichis avec les statuts de traitement)
  const getTableData = () => {
    return enrichLeadsWithStatus(leads);
  };

  const tableData = getTableData();

  // Hook de sélection des leads dans le tableau
  const {
    selectedLeadIds,
    selectedLeads,
    toggleSelectLead,
    selectAll,
    deselectAll,
    replaceSelection,
    selectByStatus,
    statusCounts,
    allFilteredSelected
  } = useLeadSelection(tableData);

  // Combiner les overrides globaux et SwissLife
  const getCombinedOverrides = () => {
    const globalOverrides = getGlobalOverrides() || {};
    const swissLifeOverrides = getSwissLifeOverrides() || {};
    
    const combined = { ...globalOverrides, ...swissLifeOverrides };
    return Object.keys(combined).length > 0 ? combined : null;
  };

  // Configuration des handlers
  const handlersConfig = {
    selectedLeads,
    parallelTabs: 1,
    setLeadStatus,
    setSendingToExtension: uiActions.setSendingToExtension,
    clearSelection: deselectAll,
    getSwissLifeOverrides: getCombinedOverrides,
  };

  const handlers = new DashboardHandlers(handlersConfig);

  // Extraction "nouveaux seulement" (merge, sans remplacer)
  const handleExtractNew = () => {
    extractWithSSE('gmail', days, false, filterMode === 'custom' ? dateRange : null);
  };

  // Handlers pour les modales
  const handleRowClick = (lead: Lead, allSortedData: Lead[], leadIndex: number) => {
    modalActions.setSelectedLead(lead);
    modalActions.setModalLeads(allSortedData);
    modalActions.setCurrentLeadIndex(leadIndex);
    modalActions.setModalOpen(true);
  };

  const handleLeadChange = (newLead: Lead, newIndex: number) => {
    modalActions.setSelectedLead(newLead);
    modalActions.setCurrentLeadIndex(newIndex);
  };

  const handleDeleteSelected = () => {
    const count = selectedLeadIds.size;
    if (count === 0) return;
    const confirmed = window.confirm(
      `Supprimer ${count} lead${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''} ? Cette action est irréversible.`
    );
    if (!confirmed) return;
    const removed = removeLeadsByIds(Array.from(selectedLeadIds));
    if (removed > 0) {
      deselectAll();
    }
  };

  const handleAddLead = (lead: Lead) => {
    addLeads([lead]);
  };

  // Écouter les notifications de statut depuis l'extension
  useEffect(() => {
    const handleStatusUpdate = (update: LeadStatusUpdate) => {
      try {
        applyStatusUpdate(update);
      } catch (error) {
        console.error('[DASHBOARD] Erreur applyStatusUpdate:', error);
      }
    };

    // S'abonner aux notifications
    const unsubscribe = ExtensionBridge.onLeadStatusUpdate(handleStatusUpdate);
    
    // Nettoyer l'abonnement au démontage
    return () => {
      unsubscribe();
    };
  }, [applyStatusUpdate]);

  // Nettoyer les statuts orphelins quand les leads changent
  useEffect(() => {
    if (!isLoaded || leads.length === 0) return;
    
    const existingLeadIds = leads.map(lead => lead.id);
    cleanupOrphanedStatuses(existingLeadIds);
  }, [leads, isLoaded, cleanupOrphanedStatuses]);

  // Mettre à jour la dernière synchro Gmail (lecture storage)
  useEffect(() => {
    try {
      const last = (StorageManager.getLastSync() as any)?.gmail || null;
      uiActions.setLastSyncGmail(last);
    } catch {
      uiActions.setLastSyncGmail(null);
    }
  }, [leads, uiActions]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Progress flottant */}
      <ProgressPanel
        show={showProgress}
        source={progressSource}
        phase={progressPhase}
        message={progressMessage}
        current={progressCurrent}
        total={progressTotal}
        onCancel={cancelExtraction}
      />

      <div className="container mx-auto p-6">
        {/* Header */}
        <DashboardHeader
          isAuthenticated={!!isAuthenticated}
          hasTokens={!!hasTokens}
          email={email}
          loading={authLoading}
          onConfigOpen={() => modalActions.setConfigModalOpen(true)}
          onRedirectToLogin={redirectToLogin}
          onLogout={logout}
        />

        {/* Contrôles */}
        <ControlsPanel
          onOpenManual={() => modalActions.setManualDialogOpen(true)}
          onExtractNow={handleExtractNew}
          days={days}
          setDays={setDays}
          dateRange={dateRange}
          setDateRange={setDateRange}
          filterMode={filterMode}
          onClearAll={clearAllLeads}
          busy={busy}
          lastSyncGmail={dashboardUIState.lastSyncGmail}
        />

        {/* Recherche */}
        <DashboardSearch
          globalFilter={uiState?.globalFilter || ''}
          onFilterChange={setGlobalFilter}
        />

        {/* Table */}
        <LeadsTable
          data={tableData}
          globalFilter={uiState?.globalFilter || ''}
          onRowClick={handleRowClick}
          activeTab="all"
          pageSize={uiState?.pageSize || 10}
          currentPage={uiState?.currentPage || 0}
          onPageSizeChange={setPageSize}
          onPageChange={setCurrentPage}
          selectedLeadIds={selectedLeadIds}
          onToggleSelect={toggleSelectLead}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
          onReplaceSelection={replaceSelection}
          onSendToExtension={handlers.handleSendToExtension}
          onClearSelection={deselectAll}
          onRetrySingleLead={handlers.handleRetrySingleLead}
          isAllSelected={allFilteredSelected}
          isSending={dashboardUIState.sendingToExtension}
          onSelectByStatus={selectByStatus}
          statusCounts={statusCounts}
          onUpdateSelectedStatus={handlers.handleUpdateSelectedStatus}
          onDeleteSelected={handleDeleteSelected}
        />

        {/* Modales */}
        <DashboardModals
          selectedLead={modalState.selectedLead}
          modalLeads={modalState.modalLeads}
          currentLeadIndex={modalState.currentLeadIndex}
          modalOpen={modalState.modalOpen}
          onModalOpenChange={modalActions.setModalOpen}
          onLeadChange={handleLeadChange}
          configModalOpen={modalState.configModalOpen}
          onConfigModalOpenChange={modalActions.setConfigModalOpen}
          manualDialogOpen={modalState.manualDialogOpen}
          onManualDialogOpenChange={modalActions.setManualDialogOpen}
          onAddLead={handleAddLead}
        />
      </div>
    </div>
  );
}
