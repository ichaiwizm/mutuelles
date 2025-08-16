import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Lead } from '@/types/lead';

interface LeadSelectionSectionProps {
  filteredLeads: Lead[];
  selectedLeads: Lead[];
  allFilteredSelected: boolean;
  someFilteredSelected: boolean;
  onSelectAll: (checked: boolean) => void;
  onSelectLead: (leadId: string, checked: boolean) => void;
  selectedLeadIds: Set<string>;
}

export function LeadSelectionSection({
  filteredLeads,
  selectedLeads,
  allFilteredSelected,
  someFilteredSelected,
  onSelectAll,
  onSelectLead,
  selectedLeadIds
}: LeadSelectionSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Sélection des leads</h3>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {selectedLeads.length} / {filteredLeads.length} leads sélectionnés
          </span>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-all"
              checked={allFilteredSelected}
              ref={(ref) => {
                if (ref) ref.indeterminate = someFilteredSelected && !allFilteredSelected;
              }}
              onCheckedChange={onSelectAll}
            />
            <label htmlFor="select-all" className="text-sm font-medium">
              Tout sélectionner
            </label>
          </div>
        </div>
      </div>

      <ScrollArea className="h-60 w-full border rounded-md p-4">
        <div className="space-y-2">
          {filteredLeads.map((lead, index) => (
            <div key={lead.id}>
              <div className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-sm">
                <Checkbox
                  id={`lead-${lead.id}`}
                  checked={selectedLeadIds.has(lead.id)}
                  onCheckedChange={(checked) => onSelectLead(lead.id, !!checked)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {lead.contact.prenom} {lead.contact.nom}
                    </span>
                    <Badge variant="secondary">
                      {lead.score}/5
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {lead.contact.email || 'Email non disponible'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(lead.extractedAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>
              {index < filteredLeads.length - 1 && <Separator className="my-1" />}
            </div>
          ))}
          {filteredLeads.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Aucun lead ne correspond aux critères de filtrage
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}