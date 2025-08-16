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
import { Button } from '@/components/ui/button';
import { Star, Users, Baby, Calendar, RotateCcw } from 'lucide-react';
import type { AutomationFilters } from '@/types/automation';

interface AdvancedFilterSectionProps {
  filters: AutomationFilters;
  onScoreChange: (value: string) => void;
  onSourceToggle: (source: 'gmail' | 'calendar' | 'multiple') => void;
  onConjointChange: (value: string) => void;
  onEnfantsChange: (value: string) => void;
  onDateRangeChange: (value: string) => void;
  onReset: () => void;
}

export function AdvancedFilterSection({
  filters,
  onScoreChange,
  onSourceToggle,
  onConjointChange,
  onEnfantsChange,
  onDateRangeChange,
  onReset
}: AdvancedFilterSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Filtres de sélection</h3>
        <Button variant="outline" size="sm" onClick={onReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Réinitialiser
        </Button>
      </div>
      
      {/* Score minimum */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Star className="h-4 w-4" />
          Score minimum
        </Label>
        <Select value={filters.scoreMin.toString()} onValueChange={onScoreChange}>
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
      <div className="space-y-2">
        <Label>Sources</Label>
        <div className="space-y-2">
          {(['gmail', 'calendar', 'multiple'] as const).map(source => (
            <div key={source} className="flex items-center space-x-2">
              <Checkbox
                id={`source-${source}`}
                checked={filters.sources.includes(source)}
                onCheckedChange={() => onSourceToggle(source)}
              />
              <label htmlFor={`source-${source}`} className="text-sm">
                {source === 'gmail' ? 'Gmail' : 
                 source === 'calendar' ? 'Calendar' : 'Sources multiples'}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Conjoint */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Présence d'un conjoint
        </Label>
        <Select value={filters.hasConjoint} onValueChange={onConjointChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="yes">Avec conjoint</SelectItem>
            <SelectItem value="no">Sans conjoint</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Enfants */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Baby className="h-4 w-4" />
          Présence d'enfants
        </Label>
        <Select value={filters.hasEnfants} onValueChange={onEnfantsChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="yes">Avec enfants</SelectItem>
            <SelectItem value="no">Sans enfants</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Période */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Période d'extraction
        </Label>
        <Select value={filters.dateRange} onValueChange={onDateRangeChange}>
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
  );
}