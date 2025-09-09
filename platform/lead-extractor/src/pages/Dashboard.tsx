import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { LeadDetailModal } from '@/components/LeadDetailModal';
import { useAuth } from '@/hooks/useAuth';
import { useLeads } from '@/hooks/useLeads';
import { useSettings } from '@/hooks/useSettings';
import { useUIState } from '@/hooks/useUIState';
import { useSSEExtraction } from '@/hooks/useSSEExtraction';
import { useProcessingStatus } from '@/hooks/useProcessingStatus';
import { useLeadSelection } from '@/hooks/useLeadSelection';
import { ExtensionBridge, type LeadStatusUpdate } from '@/services/extension-bridge';
import { toast } from 'sonner';
import { ControlsPanel } from '@/components/dashboard/ControlsPanel';
import { ManualLeadDialog } from '@/components/ManualLeadDialog';
import type { ProcessingStatus } from '@/utils/processing-status-storage';
import { TabsNavigation } from '@/components/dashboard/TabsNavigation';
import { ProgressPanel } from '@/components/dashboard/ProgressPanel';
import { AuthStatus } from '@/components/dashboard/AuthStatus';
import { LeadsTable } from '@/components/dashboard/LeadsTable';
import { ConfigurationModal } from '@/components/ConfigurationModal';
import type { Lead } from '@/types/lead';
import { StorageManager } from '@/lib/storage';

export function Dashboard() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [modalLeads, setModalLeads] = useState<Lead[]>([]);
  const [currentLeadIndex, setCurrentLeadIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualInitialTab, setManualInitialTab] = useState<'form' | 'csv'>('form');
  const [lastSyncGmail, setLastSyncGmail] = useState<string | null>(null);
  const [sendingToExtension, setSendingToExtension] = useState(false);
  const [runActive, setRunActive] = useState(false);
  const [stoppingRun, setStoppingRun] = useState(false);

  // Obtenir l'état du run au montage
  useEffect(() => {
    (async () => {
      try {
        const s = await ExtensionBridge.getRunState();
        setRunActive(!!s?.active);
      } catch { /* ignore */ }
    })();
  }, []);

  // Hooks personnalisés
  const { isAuthenticated, hasTokens, email, loading: authLoading, checkAuthStatus, redirectToLogin, logout } = useAuth();
  const {
    days, setDays, dateRange, setDateRange, filterMode, parallelTabs
  } = useSettings();
  const { leads, qualifiedLeads, addLeads, clearAllLeads, removeLeadsByIds, stats } = useLeads();
  const { enrichLeadsWithStatus, applyStatusUpdate, cleanupOrphanedStatuses, isLoaded, setLeadStatus } = useProcessingStatus();
  const {
    uiState,
    setPageSize,
    setCurrentPage,
    setActiveTab,
    setGlobalFilter
  } = useUIState();

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

  // Extraction "nouveaux seulement" (merge, sans remplacer)
  const handleExtractNew = () => {
    extractWithSSE('gmail', days, false, filterMode === 'custom' ? dateRange : null);
  };

  const handleRowClick = (lead: Lead, allSortedData: Lead[], leadIndex: number) => {
    setSelectedLead(lead);
    setModalLeads(allSortedData);
    setCurrentLeadIndex(leadIndex);
    setModalOpen(true);
  };

  const handleLeadChange = (newLead: Lead, newIndex: number) => {
    setSelectedLead(newLead);
    setCurrentLeadIndex(newIndex);
  };

  // Données de table selon l'onglet actif (enrichies avec les statuts de traitement)
  const getTableData = () => {
    const baseData = (() => {
      switch (uiState?.activeTab || 'leads') {
        case 'leads': return qualifiedLeads;
        case 'all': return leads;
        default: return leads;
      }
    })();
    
    // Enrichir avec les statuts de traitement
    return enrichLeadsWithStatus(baseData);
  };

  // Données du tableau
  const tableData = getTableData();

  // Mettre à jour manuellement le statut des leads sélectionnés
  const handleUpdateSelectedStatus = (status: ProcessingStatus['status']) => {
    const ids = Array.from(selectedLeadIds);
    if (ids.length === 0) return;
    const timestamp = new Date().toISOString();
    ids.forEach(id => setLeadStatus(id, {
      status,
      timestamp,
      message: 'Statut modifié manuellement'
    } as ProcessingStatus));
  };
  
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
  
  // Écouter les notifications de statut depuis l'extension
  useEffect(() => {
    
    
    const handleStatusUpdate = (update: LeadStatusUpdate) => {
      
      
      // Appliquer l'update au store local pour mettre à jour le tableau
      try {
        applyStatusUpdate(update);
        
      } catch (error) {
        console.error('[DASHBOARD] Erreur applyStatusUpdate:', error);
      }
      
      const { status, leadName, details } = update;
      
      switch (status) {
        case 'processing':
          
          break;
        
        case 'success':
          
          break;
        
        case 'error':
          
          break;
        
        default:
          
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
    const removedCount = cleanupOrphanedStatuses(existingLeadIds);
    
    if (removedCount > 0) {
      // nettoyage silencieux
    }
  }, [leads, isLoaded, cleanupOrphanedStatuses]);

  // Mettre à jour la dernière synchro Gmail (lecture storage)
  useEffect(() => {
    try {
      const last = (StorageManager.getLastSync() as any)?.gmail || null;
      setLastSyncGmail(last);
    } catch {
      setLastSyncGmail(null);
    }
  }, [leads]);

  // plus de libellé période: le sélecteur est inline dans la barre
  
  // Handler pour l'envoi d'un seul lead (retry)
  const handleRetrySingleLead = async (lead: Lead) => {
    
    try {
      // 1. Vérifier si l'extension est installée
      const isInstalled = await ExtensionBridge.checkExtensionInstalled();
      
      if (!isInstalled) {
        toast.error('Extension SwissLife non détectée', {
          description: 'Assurez-vous que l\'extension est installée et activée.'
        });
        return;
      }

      // 2. Lancer le run pour ce lead
      toast.info(`Réessai en cours pour ${lead.contact.prenom} ${lead.contact.nom}...`);
      
      const result = await ExtensionBridge.startRun({ providers: ['swisslife'], leads: [lead], parallelTabs: 1, options: { minimizeWindow: true, closeOnFinish: false, isolated: true } });
      
      if (result.success) {
        toast.success(`Lead "${lead.contact.prenom} ${lead.contact.nom}" renvoyé avec succès`);
      } else {
        toast.error('Erreur lors du réessai', {
          description: result.error || 'Erreur inconnue'
        });
      }
      
    } catch (error) {
      console.error('Erreur retry:', error);
      toast.error('Erreur lors du réessai', {
        description: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  };

  // Handler pour l'envoi à l'extension
  const handleSendToExtension = async () => {
    setSendingToExtension(true);
    if (selectedLeads.length === 0) {
      toast.error('Aucun lead sélectionné');
      setSendingToExtension(false);
      return;
    }

    try {
      // 1. Vérifier si l'extension est installée
      const isInstalled = await ExtensionBridge.checkExtensionInstalled();
      
      if (!isInstalled) {
        toast.error('Extension SwissLife non détectée', {
          description: 'Assurez-vous que l\'extension est installée et activée.'
        });
        setSendingToExtension(false);
        return;
      }

      // Extension détectée

      // 2. Démarrer le run (fenêtre unique + pool d'onglets)
      toast.info('Lancement du traitement dans l\'extension...');
      const result = await ExtensionBridge.startRun({ providers: ['swisslife'], leads: selectedLeads, parallelTabs: Math.max(1, parallelTabs || 3), options: { minimizeWindow: true, closeOnFinish: true } });
      if (result.success) {
        toast.success(`${selectedLeads.length} leads envoyés`, { description: 'Traitement en cours dans l\'extension.' });
        handleClearSelection();
        setRunActive(true);
      } else {
        toast.error('Erreur lors de l\'envoi des leads', { description: result.error || 'Erreur inconnue' });
      }
      
    } catch (error) {
      console.error('Erreur générale:', error);
      toast.error('Erreur inattendue', {
        description: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    } finally {
      setSendingToExtension(false);
    }
  };

  // Stop run en cours
  const handleStopRun = async () => {
    try {
      setStoppingRun(true);
      const ok = await ExtensionBridge.cancelRun();
      if (ok) {
        toast.success('Run arrêté');
        setRunActive(false);
      } else {
        toast.error('Impossible d\'arrêter le run');
      }
    } catch (e) {
      toast.error('Erreur arrêt run', { description: e instanceof Error ? e.message : 'Erreur inconnue' });
    } finally {
      setStoppingRun(false);
    }
  };

  // Poll léger de l'état du run quand on pense qu'il est actif
  useEffect(() => {
    let timer: any;
    let cancelled = false;
    const tick = async () => {
      try {
        const s = await ExtensionBridge.getRunState();
        if (!cancelled) setRunActive(!!s?.active);
      } finally {
        if (!cancelled && runActive) timer = setTimeout(tick, 3000);
      }
    };
    if (runActive) tick();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [runActive]);

  // Handlers pour la sélection
  const handleSelectAll = selectAll;
  const handleDeselectAll = deselectAll;
  const handleClearSelection = deselectAll;
  const isAllDataSelected = allFilteredSelected;

  const handleDeleteSelected = () => {
    const count = selectedLeadIds.size;
    if (count === 0) return;
    const confirmed = window.confirm(
      `Supprimer ${count} lead${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''} ? Cette action est irréversible.`
    );
    if (!confirmed) return;
    const removed = removeLeadsByIds(Array.from(selectedLeadIds));
    if (removed > 0) {
      toast.success(`${removed} lead${removed > 1 ? 's' : ''} supprimé${removed > 1 ? 's' : ''}`);
      handleClearSelection();
    } else {
      toast.info('Aucun lead supprimé');
    }
  };

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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-800">
            Tableau de bord - Extraction de leads
          </h1>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfigModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Configuration
            </Button>
            <AuthStatus
              isAuthenticated={isAuthenticated}
              hasTokens={hasTokens}
              email={email}
              onRedirectToLogin={redirectToLogin}
              onLogout={logout}
              loading={authLoading}
            />
          </div>
        </div>

        {/* Contrôles (bouton Gmail + période inline, ajout à gauche) */}
        <ControlsPanel
          onOpenManual={(tab) => { setManualInitialTab(tab); setManualDialogOpen(true); }}
          onExtractNow={handleExtractNew}
          days={days}
          setDays={setDays}
          dateRange={dateRange}
          setDateRange={setDateRange}
          filterMode={filterMode}
          onClearAll={clearAllLeads}
          busy={busy}
          lastSyncGmail={lastSyncGmail}
          runActive={runActive}
          onStopRun={handleStopRun}
          stopping={stoppingRun}
        />

        {/* Recherche */}
        <div className="mb-4 mt-6">
          <Input
            placeholder="Rechercher par nom, prénom, email, téléphone ou ville..."
            value={uiState?.globalFilter || ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-sm border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        {/* Navigation onglets */}
        <TabsNavigation
          activeTab={uiState?.activeTab || 'leads'}
          onTabChange={setActiveTab}
          qualifiedCount={stats.qualified}
          totalCount={stats.total}
        />

        {/* Table */}
        <LeadsTable
          data={tableData}
          globalFilter={uiState?.globalFilter || ''}
          onRowClick={handleRowClick}
          activeTab={uiState?.activeTab || 'leads'}
          pageSize={uiState?.pageSize || 10}
          currentPage={uiState?.currentPage || 0}
          onPageSizeChange={setPageSize}
          onPageChange={setCurrentPage}
          selectedLeadIds={selectedLeadIds}
          onToggleSelect={toggleSelectLead}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onReplaceSelection={replaceSelection}
          onSendToExtension={handleSendToExtension}
          onClearSelection={handleClearSelection}
          onRetrySingleLead={handleRetrySingleLead}
          isAllSelected={isAllDataSelected}
          isSending={sendingToExtension}
          onSelectByStatus={selectByStatus}
          statusCounts={statusCounts}
          onUpdateSelectedStatus={handleUpdateSelectedStatus}
          onDeleteSelected={handleDeleteSelected}
        />

        {/* Modal détail */}
        <LeadDetailModal
          lead={selectedLead}
          leads={modalLeads}
          currentIndex={currentLeadIndex}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onLeadChange={handleLeadChange}
        />

        {/* Modal configuration */}
        <ConfigurationModal open={configModalOpen} onOpenChange={setConfigModalOpen} />

        {/* Dialog Manuel (UI seulement) */}
        <ManualLeadDialog open={manualDialogOpen} onOpenChange={setManualDialogOpen} initialTab={manualInitialTab} />

        {/* Pas de modal Gmail: extraction directe via la barre */}
      </div>
    </div>
  );
}
