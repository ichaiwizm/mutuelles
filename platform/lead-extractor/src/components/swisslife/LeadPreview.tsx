import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import type { SwissLifeLead } from '@/types/automation';

interface LeadPreviewProps {
  lead: SwissLifeLead;
}

export function LeadPreview({ lead }: LeadPreviewProps) {
  const formatJSON = (lead: SwissLifeLead) => {
    return JSON.stringify(lead, null, 2);
  };

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(formatJSON(lead));
    toast.success('JSON copié dans le presse-papier');
  };

  return (
    <div className="space-y-4">
      {/* Infos du lead actuel */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{lead.nom}</h3>
          <p className="text-sm text-gray-600">{lead.description}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleCopyJSON}>
          Copier JSON
        </Button>
      </div>

      <Separator />

      {/* Prévisualisation JSON */}
      <ScrollArea className="h-96 border rounded-lg bg-gray-900 p-4">
        <pre className="text-green-400 text-xs font-mono">
          {formatJSON(lead)}
        </pre>
      </ScrollArea>
    </div>
  );
}