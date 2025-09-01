import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface ControlsPanelProps {
  days: number;
  setDays: (days: number) => void;
  onClearAll: () => void;
  onRefresh: () => void;
  busy: boolean;
}

export function ControlsPanel({
  days,
  setDays,
  onClearAll,
  onRefresh,
  busy
}: ControlsPanelProps) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/60 mb-6">
      <div className="flex flex-wrap gap-4 items-center">
        {/* Sélection période */}
        <div className="flex items-center gap-2">
          <Label className="text-slate-700 font-medium">Derniers</Label>
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 jours</SelectItem>
              <SelectItem value="30">30 jours</SelectItem>
              <SelectItem value="60">60 jours</SelectItem>
              <SelectItem value="90">90 jours</SelectItem>
            </SelectContent>
          </Select>
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