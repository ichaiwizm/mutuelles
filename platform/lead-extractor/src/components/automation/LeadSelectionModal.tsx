import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react';
import type { Lead } from '@/types/lead';
import { getFiltersDescription } from '@/utils/automation-filters';
import { useAdvancedFilters } from '@/hooks/useAdvancedFilters';
import { AdvancedFilterSection } from './AdvancedFilterSection';
import { LeadStatistics } from './LeadStatistics';

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
  const {
    filters,
    filteredLeads,
    stats,
    handleScoreChange,
    handleSourceToggle,
    handleConjointChange,
    handleEnfantsChange,
    handleDateRangeChange,
    handleReset
  } = useAdvancedFilters(leads);

  const handleContinue = () => {
    if (filteredLeads.length > 0) {
      onLeadsSelected(filteredLeads);
    }
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
          <AdvancedFilterSection
            filters={filters}
            onScoreChange={handleScoreChange}
            onSourceToggle={handleSourceToggle}
            onConjointChange={handleConjointChange}
            onEnfantsChange={handleEnfantsChange}
            onDateRangeChange={handleDateRangeChange}
            onReset={handleReset}
          />

          {/* Colonne de droite : Aperçu */}
          <div className="space-y-4">
            <LeadStatistics filteredLeads={filteredLeads} stats={stats} />

            {/* Filtres actifs */}
            <div className="bg-purple-50 rounded-lg p-3">
              <p className="text-sm text-purple-700">
                {getFiltersDescription(filters)}
              </p>
            </div>

            {filteredLeads.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  Aucun lead ne correspond aux critères sélectionnés.
                  Essayez d'ajuster les filtres.
                </p>
              </div>
            )}
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