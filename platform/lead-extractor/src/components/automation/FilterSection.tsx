import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Star } from 'lucide-react';

interface FilterSectionProps {
  periodFilter: string;
  setPeriodFilter: (value: string) => void;
  scoreFilter: string;
  setScoreFilter: (value: string) => void;
  selectedService: string;
  setSelectedService: (value: string) => void;
}

export function FilterSection({
  periodFilter,
  setPeriodFilter,
  scoreFilter,
  setScoreFilter,
  selectedService,
  setSelectedService
}: FilterSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Filtres</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Filtre par période */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Période
          </Label>
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="7days">7 derniers jours</SelectItem>
              <SelectItem value="30days">30 derniers jours</SelectItem>
              <SelectItem value="all">Tous les leads</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filtre par score */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Score minimum
          </Label>
          <Select value={scoreFilter} onValueChange={setScoreFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Tous les scores</SelectItem>
              <SelectItem value="1">≥ 1 étoile</SelectItem>
              <SelectItem value="2">≥ 2 étoiles</SelectItem>
              <SelectItem value="3">≥ 3 étoiles</SelectItem>
              <SelectItem value="4">≥ 4 étoiles</SelectItem>
              <SelectItem value="5">5 étoiles uniquement</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Service de destination */}
        <div className="space-y-2">
          <Label>Service de destination</Label>
          <Select value={selectedService} onValueChange={setSelectedService}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="swisslife">SwissLife</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}