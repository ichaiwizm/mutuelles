import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Filter, Users, Baby, Calendar, Star } from 'lucide-react';
import type { Lead } from '@/types/lead';
import type { AutomationFilters } from '@/types/automation';
import { filterLeads, getDefaultFilters, getFiltersDescription } from '@/utils/automation-filters';

interface LeadSelectionModalProps {
  leads: Lead[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadsSelected: (leads: Lead[]) => void;
}

export function LeadSelectionModal({
  leads,
  open,
  onOpenChange,
  onLeadsSelected,
}: LeadSelectionModalProps) {
  const [filters, setFilters] = useState<AutomationFilters>(getDefaultFilters());

  // Filtrer les leads en temps réel
  const filteredLeads = useMemo(() => {
    return filterLeads(leads, filters);
  }, [leads, filters]);

  // Statistiques pour l'aperçu
  const stats = useMemo(() => {
    const byScore = filteredLeads.reduce((acc, lead) => {
      acc[lead.score] = (acc[lead.score] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const withConjoint = filteredLeads.filter(l => l.conjoint).length;
    const withEnfants = filteredLeads.filter(l => l.enfants.length > 0).length;

    return {
      total: filteredLeads.length,
      byScore,
      withConjoint,
      withEnfants,
    };
  }, [filteredLeads]);

  const handleScoreChange = (value: string) => {
    setFilters(prev => ({ ...prev, scoreMin: parseInt(value) }));
  };

  const handleSourceToggle = (source: 'gmail' | 'calendar' | 'multiple') => {
    setFilters(prev => {
      const sources = [...prev.sources];
      const index = sources.indexOf(source);
      if (index > -1) {
        sources.splice(index, 1);
      } else {
        sources.push(source);
      }
      return { ...prev, sources };
    });
  };

  const handleConjointChange = (value: string) => {
    setFilters(prev => ({ ...prev, hasConjoint: value as 'all' | 'yes' | 'no' }));
  };

  const handleEnfantsChange = (value: string) => {
    setFilters(prev => ({ ...prev, hasEnfants: value as 'all' | 'yes' | 'no' }));
  };

  const handleDateRangeChange = (value: string) => {
    setFilters(prev => ({ ...prev, dateRange: value as 'today' | '7days' | '30days' | 'all' }));
  };

  const handleContinue = () => {
    if (filteredLeads.length > 0) {
      onLeadsSelected(filteredLeads);
    }
  };

  const handleReset = () => {
    setFilters(getDefaultFilters());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Sélection des leads pour l'automation
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          {/* Colonne de gauche : Filtres */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-3">Filtres de sélection</h3>
              
              {/* Score minimum */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Score minimum
                </Label>
                <Select value={filters.scoreMin.toString()} onValueChange={handleScoreChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Tous les scores</SelectItem>
                    <SelectItem value="3">≥ 3 étoiles</SelectItem>
                    <SelectItem value="4">≥ 4 étoiles</SelectItem>
                    <SelectItem value="5">5 étoiles uniquement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sources */}
              <div className="space-y-2 mt-4">
                <Label>Sources</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="gmail"
                      checked={filters.sources.includes('gmail')}
                      onCheckedChange={() => handleSourceToggle('gmail')}
                    />
                    <label htmlFor="gmail" className="text-sm cursor-pointer">
                      Gmail
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="calendar"
                      checked={filters.sources.includes('calendar')}
                      onCheckedChange={() => handleSourceToggle('calendar')}
                    />
                    <label htmlFor="calendar" className="text-sm cursor-pointer">
                      Calendar
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="multiple"
                      checked={filters.sources.includes('multiple')}
                      onCheckedChange={() => handleSourceToggle('multiple')}
                    />
                    <label htmlFor="multiple" className="text-sm cursor-pointer">
                      Multiple
                    </label>
                  </div>
                </div>
              </div>

              {/* Conjoint */}
              <div className="space-y-2 mt-4">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Situation familiale
                </Label>
                <Select value={filters.hasConjoint} onValueChange={handleConjointChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Peu importe</SelectItem>
                    <SelectItem value="yes">Avec conjoint</SelectItem>
                    <SelectItem value="no">Sans conjoint</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Enfants */}
              <div className="space-y-2 mt-4">
                <Label className="flex items-center gap-2">
                  <Baby className="h-4 w-4" />
                  Enfants
                </Label>
                <Select value={filters.hasEnfants} onValueChange={handleEnfantsChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Peu importe</SelectItem>
                    <SelectItem value="yes">Avec enfants</SelectItem>
                    <SelectItem value="no">Sans enfants</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Période */}
              <div className="space-y-2 mt-4">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Période d'extraction
                </Label>
                <Select value={filters.dateRange} onValueChange={handleDateRangeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Aujourd'hui</SelectItem>
                    <SelectItem value="7days">7 derniers jours</SelectItem>
                    <SelectItem value="30days">30 derniers jours</SelectItem>
                    <SelectItem value="all">Toutes les dates</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Colonne de droite : Aperçu */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-3">Aperçu de la sélection</h3>
              
              {/* Statistiques */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Leads sélectionnés</span>
                  <span className="text-2xl font-bold text-purple-600">{stats.total}</span>
                </div>
                
                <Separator />
                
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avec conjoint</span>
                    <span className="font-medium">{stats.withConjoint}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avec enfants</span>
                    <span className="font-medium">{stats.withEnfants}</span>
                  </div>
                </div>
                
                {Object.keys(stats.byScore).length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-1 text-sm">
                      <span className="text-gray-600">Par score :</span>
                      {[5, 4, 3, 2, 1].map(score => {
                        const count = stats.byScore[score] || 0;
                        if (count === 0) return null;
                        return (
                          <div key={score} className="flex justify-between">
                            <span className="text-gray-600">{score} étoiles</span>
                            <span className="font-medium">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Filtres actifs */}
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Filtres actifs :</p>
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-sm text-purple-700">
                    {getFiltersDescription(filters)}
                  </p>
                </div>
              </div>

              {/* Liste des leads */}
              {filteredLeads.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">Aperçu des leads :</p>
                  <ScrollArea className="h-48 border rounded-lg">
                    <div className="p-2 space-y-1">
                      {filteredLeads.slice(0, 10).map(lead => (
                        <div
                          key={lead.id}
                          className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {lead.contact.prenom} {lead.contact.nom}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {lead.source}
                            </Badge>
                          </div>
                          <Badge
                            variant={lead.score >= 4 ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {lead.score}/5
                          </Badge>
                        </div>
                      ))}
                      {filteredLeads.length > 10 && (
                        <p className="text-sm text-gray-500 text-center py-2">
                          ... et {filteredLeads.length - 10} autres
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {filteredLeads.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-yellow-800">
                    Aucun lead ne correspond aux critères sélectionnés.
                    Essayez d'ajuster les filtres.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleReset}>
            Réinitialiser les filtres
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleContinue}
              disabled={filteredLeads.length === 0}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Continuer ({filteredLeads.length} leads)
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}