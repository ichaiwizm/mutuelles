import { LeadDetailModal } from '@/components/LeadDetailModal';
import { ConfigurationModal } from '@/components/ConfigurationModal';
import { ManualLeadDialog } from '@/components/ManualLeadDialog';
import type { Lead } from '@/types/lead';

interface DashboardModalsProps {
  // Lead Detail Modal
  selectedLead: Lead | null;
  modalLeads: Lead[];
  currentLeadIndex: number;
  modalOpen: boolean;
  onModalOpenChange: (open: boolean) => void;
  onLeadChange: (lead: Lead, index: number) => void;

  // Configuration Modal
  configModalOpen: boolean;
  onConfigModalOpenChange: (open: boolean) => void;

  // Manual Lead Dialog
  manualDialogOpen: boolean;
  onManualDialogOpenChange: (open: boolean) => void;
}

export function DashboardModals({
  selectedLead,
  modalLeads,
  currentLeadIndex,
  modalOpen,
  onModalOpenChange,
  onLeadChange,
  configModalOpen,
  onConfigModalOpenChange,
  manualDialogOpen,
  onManualDialogOpenChange
}: DashboardModalsProps) {
  return (
    <>
      {/* Modal détail */}
      <LeadDetailModal
        lead={selectedLead}
        leads={modalLeads}
        currentIndex={currentLeadIndex}
        open={modalOpen}
        onOpenChange={onModalOpenChange}
        onLeadChange={onLeadChange}
      />

      {/* Modal configuration */}
      <ConfigurationModal 
        open={configModalOpen} 
        onOpenChange={onConfigModalOpenChange} 
      />

      {/* Dialog Manuel */}
      <ManualLeadDialog 
        open={manualDialogOpen} 
        onOpenChange={onManualDialogOpenChange} 
      />
    </>
  );
}