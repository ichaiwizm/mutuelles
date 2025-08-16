import { DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Code, Loader2 } from 'lucide-react';
import type { Lead } from '@/types/lead';

interface LeadDetailHeaderProps {
  lead: Lead;
  currentIndex: number;
  totalLeads: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  parsing: boolean;
  showParsingDetails: boolean;
  onParseCurrentLead: () => void;
}

export function LeadDetailHeader({
  lead,
  currentIndex,
  totalLeads,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  parsing,
  showParsingDetails,
  onParseCurrentLead
}: LeadDetailHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-white p-6 pb-4 border-b shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <DialogTitle className="text-xl">
            {lead.contact.prenom} {lead.contact.nom}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Badge variant={lead.score >= 4 ? 'default' : lead.score >= 3 ? 'secondary' : 'destructive'}>
              {lead.score}/5
            </Badge>
            <Badge variant="outline">{lead.source}</Badge>
            {lead.isDuplicate && <Badge variant="destructive">Doublon</Badge>}
          </div>
        </div>
        
        {/* Navigation et actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onParseCurrentLead}
            disabled={parsing}
            className={`flex items-center gap-2 transition-all duration-200 ${
              parsing ? 'bg-blue-50 border-blue-300' : 
              showParsingDetails ? 'bg-green-50 border-green-300 text-green-700' : ''
            }`}
          >
            {parsing ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            ) : showParsingDetails ? (
              <Code className="h-4 w-4 text-green-600" />
            ) : (
              <Code className="h-4 w-4" />
            )}
            {parsing ? 'Analyse en cours...' : (showParsingDetails ? '✅ Masquer les détails' : '🔍 Analyser')}
          </Button>
          
          <div className="flex items-center gap-1 border-l pl-2 ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrevious}
              disabled={!hasPrevious}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </Button>
            
            <span className="text-sm text-gray-500 px-2">
              {currentIndex + 1} / {totalLeads}
            </span>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onNext}
              disabled={!hasNext}
              className="flex items-center gap-1"
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}