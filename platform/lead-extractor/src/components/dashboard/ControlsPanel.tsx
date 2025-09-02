import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { PeriodSelector } from '@/components/PeriodSelector';
import type { DateRange } from 'react-day-picker';

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
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/60 mb-6">
      <div className="flex flex-wrap gap-4 items-center">
        {/* Sélection période d'extraction */}
        <div className="flex items-center gap-2">
          <Label className="text-slate-700 font-medium">Extraire les</Label>
          <PeriodSelector
            days={days}
            setDays={setDays}
            dateRange={dateRange}
            setDateRange={setDateRange}
            filterMode={filterMode}
          />
        </div>

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