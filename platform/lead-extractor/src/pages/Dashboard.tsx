import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { LeadDetailModal } from '@/components/LeadDetailModal';
import { useAuth } from '@/hooks/useAuth';
import { useLeads } from '@/hooks/useLeads';
import { useSettings } from '@/hooks/useSettings';
import { useSSEExtraction } from '@/hooks/useSSEExtraction';
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
  const [globalFilter, setGlobalFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'leads' | 'nonleads' | 'all'>('leads');

  // Hooks personnalisés
  const { isAuthenticated, checkAuthStatus, redirectToLogin } = useAuth();
  const { leads, qualifiedLeads, nonLeads, addLeads, clearAllLeads, stats } = useLeads();
  const {
    days, setDays,
    gmailEnabled, setGmailEnabled,
    saveSettings
  } = useSettings();

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
  const handleExtractGmail = () => extractWithSSE('gmail', days);
  
  const handleRefresh = async () => {
    clearAllLeads();
    await handleExtractGmail();
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

  // Données de table selon l'onglet actif
  const getTableData = () => {
    switch (activeTab) {
      case 'leads': return qualifiedLeads;
      case 'nonleads': return nonLeads;
      case 'all': return leads;
      default: return leads;
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
      />

      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-800">
            Tableau de bord - Extraction de leads
          </h1>
          <AuthStatus 
            isAuthenticated={isAuthenticated}
            onRedirectToLogin={redirectToLogin}
          />
        </div>

        {/* Contrôles */}
        <ControlsPanel
          days={days}
          setDays={setDays}
          gmailEnabled={gmailEnabled}
          setGmailEnabled={setGmailEnabled}
          saveSettings={saveSettings}
          onExtractGmail={handleExtractGmail}
          onClearAll={clearAllLeads}
          onRefresh={handleRefresh}
          busy={busy}
        />


        {/* Recherche */}
        <div className="mb-4 mt-6">
          <Input
            placeholder="Rechercher par nom, prénom, email, téléphone ou ville..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-sm border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        {/* Navigation onglets */}
        <TabsNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          qualifiedCount={stats.qualified}
          nonLeadsCount={stats.nonLeads}
          totalCount={stats.total}
        />

        {/* Table */}
        <LeadsTable
          data={getTableData()}
          globalFilter={globalFilter}
          onRowClick={handleRowClick}
          activeTab={activeTab}
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