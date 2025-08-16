import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Code2 } from 'lucide-react';
import type { Lead } from '@/types/lead';
import type { SwissLifeLead } from '@/types/automation';
import { useSwissLifeConversion } from '@/hooks/useSwissLifeConversion';
import { useSwissLifePreviewNavigation } from '@/hooks/useSwissLifePreviewNavigation';
import { useSwissLifeStorage } from '@/hooks/useSwissLifeStorage';
import { ConversionSummary } from '@/components/swisslife/ConversionSummary';
import { LeadPreview } from '@/components/swisslife/LeadPreview';
import { NavigationControls } from '@/components/swisslife/NavigationControls';
import { SaveControls } from '@/components/swisslife/SaveControls';
import { ConversionFailures } from '@/components/swisslife/ConversionFailures';

interface SwissLifePreviewModalProps {
  leads: Lead[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversionComplete?: (convertedLeads: SwissLifeLead[]) => void;
}

export function SwissLifePreviewModal({
  leads,
  open,
  onOpenChange,
  onConversionComplete,
}: SwissLifePreviewModalProps) {
  const { conversionResults, totalConverted } = useSwissLifeConversion(leads);
  const { currentIndex, hasPrevious, hasNext, goToPrevious, goToNext } = useSwissLifePreviewNavigation(totalConverted, open);
  const { isSaving, isSaved, showNextButton, handleSave } = useSwissLifeStorage(conversionResults, open, onConversionComplete);

  const currentLead = conversionResults?.successful[currentIndex];

  if (!conversionResults) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5" />
              Prévisualisation de la conversion SwissLife
            </div>
            <div className="flex items-center gap-2">
              {totalConverted > 0 && (
                <Badge variant="outline">
                  {currentIndex + 1} / {totalConverted}
                </Badge>
              )}
              {isSaved && (
                <Badge className="bg-green-600">
                  <Check className="h-3 w-3 mr-1" />
                  Sauvegardé
                </Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <ConversionSummary
          successfulCount={conversionResults.successful.length}
          failedCount={conversionResults.failed.length}
          warnings={conversionResults.totalWarnings}
        />

        {currentLead && (
          <div className="space-y-4">
            <LeadPreview lead={currentLead} />
            <NavigationControls
              currentIndex={currentIndex}
              totalCount={totalConverted}
              hasPrevious={hasPrevious}
              hasNext={hasNext}
              onPrevious={goToPrevious}
              onNext={goToNext}
            />
          </div>
        )}

        {totalConverted === 0 && (
          <ConversionFailures failures={conversionResults.failed} />
        )}

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isSaved ? 'Fermer' : 'Annuler'}
          </Button>
          
          <SaveControls
            isSaved={isSaved}
            isSaving={isSaving}
            showNextButton={showNextButton}
            totalConverted={totalConverted}
            onSave={handleSave}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}