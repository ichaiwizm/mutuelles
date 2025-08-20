import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Settings2, Loader2, Settings } from 'lucide-react';
import type { Lead } from '@/types/lead';
import { StorageManager } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { ExportSuccessModal } from './ExportSuccessModal';
import { SwissLifeConfigModal } from './SwissLifeConfigModal';
import { FilterSection } from './FilterSection';
import { LeadSelectionSection } from './LeadSelectionSection';
import { ExportSummary } from './ExportSummary';
import { useAutomationFilters } from '@/hooks/useAutomationFilters';
import { useLeadSelection } from '@/hooks/useLeadSelection';
import { useLeadExport } from '@/hooks/useLeadExport';
import { toast } from 'sonner';

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
  const [configModalOpen, setConfigModalOpen] = useState(false);

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
        <DialogContent className="sm:max-w-4xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Export d'automation
              </div>
              {selectedService === 'swisslife' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfigModalOpen(true)}
                  className="text-muted-foreground"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configuration SwissLife
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
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

            <ExportSummary
              selectedLeads={selectedLeads}
              selectedService={selectedService}
            />
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-background">
            <div className="flex justify-between w-full">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
                Annuler
              </Button>
              <Button 
                onClick={handleExport} 
                disabled={selectedLeads.length === 0 || isExporting}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Export en cours...
                  </>
                ) : (
                  `Exporter ${selectedLeads.length} lead${selectedLeads.length > 1 ? 's' : ''}`
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExportSuccessModal
        open={successModalOpen}
        onOpenChange={setSuccessModalOpen}
        result={exportResult}
      />

      <SwissLifeConfigModal
        open={configModalOpen}
        onOpenChange={setConfigModalOpen}
      />
    </>
  );
}