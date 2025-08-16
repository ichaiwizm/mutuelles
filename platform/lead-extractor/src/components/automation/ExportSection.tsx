import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import type { Lead } from '@/types/lead';

interface ExportSectionProps {
  selectedLeads: Lead[];
  selectedService: string;
  isExporting: boolean;
  onExport: () => void;
  onCancel: () => void;
}

export function ExportSection({
  selectedLeads,
  selectedService,
  isExporting,
  onExport,
  onCancel
}: ExportSectionProps) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-muted/50 rounded-lg">
        <h4 className="font-medium mb-2">Résumé de l'export</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Service de destination :</span>
            <span className="font-medium">{selectedService === 'swisslife' ? 'SwissLife' : selectedService}</span>
          </div>
          <div className="flex justify-between">
            <span>Nombre de leads :</span>
            <span className="font-medium">{selectedLeads.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Score moyen :</span>
            <span className="font-medium">
              {selectedLeads.length > 0 
                ? (selectedLeads.reduce((sum, lead) => sum + (lead.score ?? 0), 0) / selectedLeads.length).toFixed(1)
                : '0'
              }/5
            </span>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isExporting}>
          Annuler
        </Button>
        <Button 
          onClick={onExport} 
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
      </DialogFooter>
    </div>
  );
}