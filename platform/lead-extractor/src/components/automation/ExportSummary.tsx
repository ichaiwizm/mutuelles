import type { Lead } from '@/types/lead';

interface ExportSummaryProps {
  selectedLeads: Lead[];
  selectedService: string;
}

export function ExportSummary({
  selectedLeads,
  selectedService
}: ExportSummaryProps) {
  return (
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
  );
}