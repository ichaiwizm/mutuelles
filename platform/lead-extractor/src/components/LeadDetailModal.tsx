import { useEffect } from 'react';
import type { Lead } from '@/types/lead';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useLeadNavigation } from '@/hooks/useLeadNavigation';
import { useLeadParsing } from '@/hooks/useLeadParsing';
import { LeadDetailHeader } from './LeadDetailHeader';
import { ParsingResultSection } from './lead-detail/ParsingResultSection';
import { ContactSection } from './lead-detail/ContactSection';
import { SouscripteurSection } from './lead-detail/SouscripteurSection';
import { ConjointSection } from './lead-detail/ConjointSection';
import { EnfantsSection } from './lead-detail/EnfantsSection';
import { BesoinsSection } from './lead-detail/BesoinsSection';
import { EmailContentSection } from './lead-detail/EmailContentSection';

interface LeadDetailModalProps {
  lead: Lead | null;
  leads: Lead[];
  currentIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadChange?: (lead: Lead, newIndex: number) => void;
}

export function LeadDetailModal({ lead, leads, currentIndex, open, onOpenChange, onLeadChange }: LeadDetailModalProps) {
  if (!lead) return null;

  // Hooks personnalisés
  const {
    hasPrevious,
    hasNext,
    goToPrevious,
    goToNext
  } = useLeadNavigation(leads, currentIndex, onLeadChange);

  const {
    showParsingDetails,
    parsingResult,
    parsing,
    parseCurrentLead,
    resetParsing
  } = useLeadParsing();

  // Réinitialiser le parsing lors du changement de lead
  useEffect(() => {
    resetParsing();
  }, [lead.id, resetParsing]);

  const handleParseCurrentLead = () => {
    parseCurrentLead(lead);
  };

  const handlePrevious = () => {
    goToPrevious();
    resetParsing();
  };

  const handleNext = () => {
    goToNext();
    resetParsing();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Overlay plus opaque */}
      <div 
        className={`fixed inset-0 z-40 bg-black transition-opacity duration-200 ${
          open ? 'opacity-70' : 'opacity-0 pointer-events-none'
        }`} 
      />
      <DialogContent className="sm:max-w-6xl max-w-6xl w-[95vw] max-h-[90vh] p-0 z-50"
        style={{ 
          backgroundColor: 'white',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Header avec navigation - sticky */}
        <LeadDetailHeader
          lead={lead}
          currentIndex={currentIndex}
          totalLeads={leads.length}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          onPrevious={handlePrevious}
          onNext={handleNext}
          parsing={parsing}
          showParsingDetails={showParsingDetails}
          onParseCurrentLead={handleParseCurrentLead}
        />

        {/* Informations d'extraction */}
        <div className="px-6 pb-2 text-sm text-gray-600 border-b">
          Extrait le {new Date(lead.extractedAt).toLocaleDateString()} à {new Date(lead.extractedAt).toLocaleTimeString()}
          {lead.notes?.parserUsed && (
            <span className="ml-2">• Parser: {lead.notes.parserUsed.replace('Parser', '')}</span>
          )}
        </div>

        {/* Zone scrollable avec hauteur fixe */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          <div className="p-6">
            <div className="space-y-6">
              {/* Détails de parsing */}
              {showParsingDetails && parsingResult && (
                <ParsingResultSection parsingResult={parsingResult} />
              )}

              {/* Sections d'information */}
              <ContactSection contact={lead.contact} />
              <SouscripteurSection souscripteur={lead.souscripteur} />
              <ConjointSection conjoint={lead.conjoint} />
              <EnfantsSection enfants={lead.enfants} />
              <BesoinsSection besoins={lead.besoins} />
              <EmailContentSection lead={lead} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}