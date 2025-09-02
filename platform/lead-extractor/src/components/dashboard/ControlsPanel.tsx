import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Calendar } from 'lucide-react';
import { DateRangePicker } from '@/components/DateRangePicker';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useState } from 'react';

interface ControlsPanelProps {
  days: number;
  setDays: (days: number) => void;
  dateRange?: DateRange | null;
  setDateRange?: (range: DateRange | undefined) => void;
  filterMode?: 'predefined' | 'custom';
  onClearAll: () => void;
  onRefresh: () => void;
  busy: boolean;
}

export function ControlsPanel({
  days,
  setDays,
  dateRange,
  setDateRange,
  filterMode = 'predefined',
  onClearAll,
  onRefresh,
  busy
}: ControlsPanelProps) {
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  const handleSelectChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomDatePicker(true);
    } else {
      setShowCustomDatePicker(false);
      setDays(Number(value));
    }
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (setDateRange) {
      setDateRange(range);
    }
    setShowCustomDatePicker(false);
  };

  const getSelectValue = () => {
    if (filterMode === 'custom' && dateRange?.from && dateRange?.to) {
      return 'custom';
    }
    return String(days);
  };

  const getSelectDisplayValue = () => {
    if (filterMode === 'custom' && dateRange?.from && dateRange?.to) {
      return `${format(dateRange.from, "dd/MM", { locale: fr })} - ${format(dateRange.to, "dd/MM", { locale: fr })}`;
    }
    return undefined; // Laisse le SelectValue par défaut
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/60 mb-6">
      <div className="flex flex-wrap gap-4 items-center">
        {/* Sélection période */}
        <div className="flex items-center gap-2">
          <Label className="text-slate-700 font-medium">Derniers</Label>
          <Select value={getSelectValue()} onValueChange={handleSelectChange}>
            <SelectTrigger className="w-40">
              <SelectValue>
                {getSelectDisplayValue() || undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 jours</SelectItem>
              <SelectItem value="30">30 jours</SelectItem>
              <SelectItem value="60">60 jours</SelectItem>
              <SelectItem value="90">90 jours</SelectItem>
              <SelectItem value="custom">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Plage personnalisée...
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date picker personnalisé */}
        {showCustomDatePicker && setDateRange && (
          <div className="flex items-center gap-2">
            <DateRangePicker
              date={dateRange || undefined}
              onDateChange={handleDateRangeChange}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 ml-auto">
          
          <Button 
            onClick={onRefresh} 
            disabled={busy} 
            className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy ? 'Actualisation...' : 'Actualiser'}
          </Button>
          
          <Button 
            onClick={onClearAll} 
            variant="destructive" 
            className="flex items-center gap-2"
          >
            Supprimer tout
          </Button>
        </div>
      </div>
    </div>
  );
}