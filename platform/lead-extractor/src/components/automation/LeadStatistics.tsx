import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { BarChart3, Users, Baby, Star } from 'lucide-react';
import type { Lead } from '@/types/lead';

interface LeadStatisticsProps {
  filteredLeads: Lead[];
  stats: {
    total: number;
    byScore: Record<number, number>;
    withConjoint: number;
    withEnfants: number;
  };
}

export function LeadStatistics({ filteredLeads, stats }: LeadStatisticsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <BarChart3 className="h-4 w-4" />
        Aperçu des résultats ({stats.total} leads)
      </h3>
      
      {/* Statistiques globales */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            <div>
              <div className="text-xs text-muted-foreground">Avec conjoint</div>
              <div className="text-sm font-medium">{stats.withConjoint}</div>
            </div>
          </div>
        </Card>
        
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Baby className="h-4 w-4 text-green-500" />
            <div>
              <div className="text-xs text-muted-foreground">Avec enfants</div>
              <div className="text-sm font-medium">{stats.withEnfants}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Répartition par score */}
      <div>
        <Label className="text-xs font-medium">Répartition par score</Label>
        <div className="space-y-1 mt-2">
          {[5, 4, 3, 2, 1].map(score => (
            <div key={score} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                {score} étoile{score > 1 ? 's' : ''}
              </div>
              <Badge variant="secondary" className="text-xs">
                {stats.byScore[score] || 0}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Aperçu des leads */}
      <div>
        <Label className="text-xs font-medium">Aperçu des leads sélectionnés</Label>
        <ScrollArea className="h-40 mt-2">
          <div className="space-y-1">
            {filteredLeads.slice(0, 10).map(lead => (
              <div key={lead.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded text-xs">
                <div className="truncate">
                  <div className="font-medium">
                    {lead.contact.prenom} {lead.contact.nom}
                  </div>
                  <div className="text-muted-foreground">
                    {lead.contact.email}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {lead.score}/5
                </Badge>
              </div>
            ))}
            {filteredLeads.length > 10 && (
              <div className="text-center text-muted-foreground py-2">
                ... et {filteredLeads.length - 10} autres
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}