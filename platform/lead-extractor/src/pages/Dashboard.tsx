import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
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
import { TabsNavigation } from '@/components/dashboard/TabsNavigation';
import { ProgressPanel } from '@/components/dashboard/ProgressPanel';
import { AuthStatus } from '@/components/dashboard/AuthStatus';
import { LeadsTable } from '@/components/dashboard/LeadsTable';
import type { Lead } from '@/types/lead';

export function Dashboard() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [modalLeads, setModalLeads] = useState<Lead[]>([]);
  const [currentLeadIndex, setCurrentLeadIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  // Hooks personnalisés
  const { isAuthenticated, hasTokens, checkAuthStatus, redirectToLogin } = useAuth();
  const {
    days, setDays, dateRange, setDateRange, filterMode
  } = useSettings();
  const { leads, qualifiedLeads, addLeads, clearAllLeads, stats } = useLeads(filterMode, days, dateRange);
  const { enrichLeadsWithStatus, applyStatusUpdate, cleanupOrphanedStatuses, isLoaded } = useProcessingStatus();
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
    extractWithSSE
  } = useSSEExtraction(addLeads, checkAuthStatus);

  // Handlers
  const handleRefresh = () => {
    // Utiliser le mode replaceAll pour remplacer tous les leads existants
    extractWithSSE('gmail', days, true);
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
      applyStatusUpdate(update);
      
      const { status, leadName, details } = update;
      
      switch (status) {
        case 'processing':
          console.log(`[EXTENSION] 🚀 Lead "${leadName}" - ${details.message || 'Début du traitement'}`);
          break;
        
        case 'success':
          console.log(`[EXTENSION] ✅ Lead "${leadName}" - ${details.message || 'Traitement terminé avec succès'}${details.completedSteps ? ` (${details.completedSteps} étapes)` : ''}`);
          break;
        
        case 'error':
          console.log(`[EXTENSION] ❌ Lead "${leadName}" - ${details.message || 'Erreur lors du traitement'}${details.errorMessage ? `: ${details.errorMessage}` : ''}`);
          break;
        
        default:
          console.log(`[EXTENSION] 📋 Lead "${leadName}" - Statut: ${status}`);
      }
    };
    
    // S'abonner aux notifications
    const unsubscribe = ExtensionBridge.onLeadStatusUpdate(handleStatusUpdate);
    
    // Nettoyer l'abonnement au démontage
    return unsubscribe;
  }, [applyStatusUpdate]);

  // Nettoyer les statuts orphelins quand les leads changent
  useEffect(() => {
    if (!isLoaded || leads.length === 0) return;
    
    const existingLeadIds = leads.map(lead => lead.id);
    const removedCount = cleanupOrphanedStatuses(existingLeadIds);
    
    if (removedCount > 0) {
      console.log(`[DASHBOARD] ${removedCount} statuts orphelins nettoyés`);
    }
  }, [leads, isLoaded, cleanupOrphanedStatuses]);
  
  // Handler pour l'envoi d'un seul lead (retry)
  const handleRetrySingleLead = async (lead: Lead) => {
    console.log('Retry lead:', lead.contact.nom, lead.contact.prenom);
    
    try {
      // 1. Vérifier si l'extension est installée
      const isInstalled = await ExtensionBridge.checkExtensionInstalled();
      
      if (!isInstalled) {
        toast.error('Extension SwissLife non détectée', {
          description: 'Assurez-vous que l\'extension est installée et activée.'
        });
        return;
      }

      // 2. Vérifier/ouvrir onglet SwissLife
      const tabResult = await ExtensionBridge.openSwissLifeTab();
      
      if (!tabResult.success) {
        toast.error('Impossible d\'accéder à SwissLife');
        return;
      }

      // 3. Envoyer le lead unique
      toast.info(`Réessai en cours pour ${lead.contact.prenom} ${lead.contact.nom}...`);
      
      const sendResult = await ExtensionBridge.sendLeadsToExtension([lead]);
      
      if (sendResult.success) {
        toast.success(`Lead "${lead.contact.prenom} ${lead.contact.nom}" renvoyé avec succès`);
      } else {
        toast.error('Erreur lors du réessai', {
          description: sendResult.error || 'Erreur inconnue'
        });
      }
      
    } catch (error) {
      console.error('❌ Erreur retry:', error);
      toast.error('Erreur lors du réessai', {
        description: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  };

  // Handler pour l'envoi à l'extension
  const handleSendToExtension = async () => {
    console.log('Début envoi vers extension - Leads sélectionnés:', selectedLeads.length);
    
    if (selectedLeads.length === 0) {
      toast.error('Aucun lead sélectionné');
      return;
    }

    try {
      // 1. Vérifier si l'extension est installée
      const isInstalled = await ExtensionBridge.checkExtensionInstalled();
      
      if (!isInstalled) {
        toast.error('Extension SwissLife non détectée', {
          description: 'Assurez-vous que l\'extension est installée et activée.'
        });
        return;
      }

      console.log('✅ Extension détectée');

      // 2. Vérifier si un onglet SwissLife est ouvert
      toast.info('Vérification des onglets SwissLife...');
      
      const tabResult = await ExtensionBridge.openSwissLifeTab();
      
      if (!tabResult.success) {
        toast.error('Impossible d\'accéder à SwissLife', {
          description: 'Erreur lors de l\'ouverture/activation de l\'onglet SwissLife.'
        });
        return;
      }

      if (tabResult.wasExisting) {
        console.log('Onglet SwissLife déjà ouvert - Activé');
        toast.success('Onglet SwissLife activé');
      } else {
        console.log('Nouvel onglet SwissLife créé');
        toast.success('Onglet SwissLife ouvert en arrière-plan');
      }

      // 3. Envoyer les leads à l'extension
      toast.info('Envoi des leads vers l\'extension...');
      
      const sendResult = await ExtensionBridge.sendLeadsToExtension(selectedLeads);
      
      if (sendResult.success) {
        toast.success(`${selectedLeads.length} leads envoyés avec succès`, {
          description: 'Les leads sont maintenant disponibles dans l\'extension SwissLife.'
        });
        
        // Vider la sélection après un envoi réussi
        handleClearSelection();
        
        console.log('✅ Envoi terminé avec succès');
      } else {
        toast.error('Erreur lors de l\'envoi des leads', {
          description: sendResult.error || 'Erreur inconnue'
        });
        
        console.error('❌ Erreur envoi:', sendResult.error);
      }
      
    } catch (error) {
      console.error('❌ Erreur générale:', error);
      toast.error('Erreur inattendue', {
        description: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  };

  // Handlers pour la sélection
  const handleSelectAll = selectAll;
  const handleDeselectAll = deselectAll;
  const handleClearSelection = deselectAll;
  const isAllDataSelected = allFilteredSelected;

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
      />

      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-800">
            Tableau de bord - Extraction de leads
          </h1>
          <AuthStatus 
            isAuthenticated={isAuthenticated}
            hasTokens={hasTokens}
            onRedirectToLogin={redirectToLogin}
          />
        </div>

        {/* Contrôles */}
        <ControlsPanel
          days={days}
          setDays={setDays}
          dateRange={dateRange}
          setDateRange={setDateRange}
          filterMode={filterMode}
          onClearAll={clearAllLeads}
          onRefresh={handleRefresh}
          busy={busy}
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
          onSelectByStatus={selectByStatus}
          statusCounts={statusCounts}
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
      </div>
    </div>
  );
}