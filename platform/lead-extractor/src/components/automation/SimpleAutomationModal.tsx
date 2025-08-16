import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Settings2 } from 'lucide-react';
import type { Lead } from '@/types/lead';
import { StorageManager } from '@/lib/storage';
import { ExportSuccessModal } from './ExportSuccessModal';
import { FilterSection } from './FilterSection';
import { LeadSelectionSection } from './LeadSelectionSection';
import { ExportSection } from './ExportSection';
import { useAutomationFilters } from '@/hooks/useAutomationFilters';
import { useLeadSelection } from '@/hooks/useLeadSelection';
import { useLeadExport } from '@/hooks/useLeadExport';

interface SimpleAutomationModalProps {
  leads: Lead[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SimpleAutomationModal({
  leads,
  open,
  onOpenChange,
}: SimpleAutomationModalProps) {
  const [selectedService, setSelectedService] = useState('swisslife');
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  // Hooks personnalisés
  const {
    periodFilter,
    setPeriodFilter,
    scoreFilter,
    setScoreFilter,
    filteredLeads
  } = useAutomationFilters(leads);

  const {
    selectedLeadIds,
    selectedLeads,
    handleSelectAll,
    handleSelectLead,
    allFilteredSelected,
    someFilteredSelected
  } = useLeadSelection(filteredLeads);

  const {
    isExporting,
    exportResult,
    exportLeads
  } = useLeadExport();

  // Export des leads
  const handleExport = async () => {
    const result = await exportLeads(selectedLeads, selectedService);
    if (result) {
      onOpenChange(false);
      setSuccessModalOpen(true);
    }
  };

  // Réinitialiser l'état à l'ouverture
  useEffect(() => {
    if (open) {
      // Récupérer la période du dashboard depuis le localStorage
      const settings = StorageManager.getSettings();
      const dashboardDays = settings.days;
      
      // Convertir les jours en format de filtre
      const periodValue = dashboardDays === 1 ? 'today' :
                         dashboardDays === 7 ? '7days' :
                         dashboardDays === 30 ? '30days' : 'all';
      
      setPeriodFilter(periodValue);
      setScoreFilter('4'); // Score par défaut ≥ 4
      setSelectedService('swisslife');
    }
  }, [open, setPeriodFilter, setScoreFilter]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Export d'automation
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <FilterSection
              periodFilter={periodFilter}
              setPeriodFilter={setPeriodFilter}
              scoreFilter={scoreFilter}
              setScoreFilter={setScoreFilter}
              selectedService={selectedService}
              setSelectedService={setSelectedService}
            />

            <LeadSelectionSection
              filteredLeads={filteredLeads}
              selectedLeads={selectedLeads}
              allFilteredSelected={allFilteredSelected}
              someFilteredSelected={someFilteredSelected}
              onSelectAll={handleSelectAll}
              onSelectLead={handleSelectLead}
              selectedLeadIds={selectedLeadIds}
            />

            <ExportSection
              selectedLeads={selectedLeads}
              selectedService={selectedService}
              isExporting={isExporting}
              onExport={handleExport}
              onCancel={() => onOpenChange(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <ExportSuccessModal
        open={successModalOpen}
        onOpenChange={setSuccessModalOpen}
        result={exportResult}
      />
    </>
  );
}