import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { AutomationButton } from '@/components/automation';
import type { Lead } from '@/types/lead';

interface ControlsPanelProps {
  days: number;
  setDays: (days: number) => void;
  gmailEnabled: boolean;
  setGmailEnabled: (enabled: boolean) => void;
  saveSettings: () => void;
  onExtractGmail: () => void;
  onClearAll: () => void;
  onRefresh: () => void;
  busy: boolean;
  leads?: Lead[];
}

export function ControlsPanel({
  days,
  setDays,
  gmailEnabled,
  setGmailEnabled,
  saveSettings,
  onExtractGmail,
  onClearAll,
  onRefresh,
  busy,
  leads = []
}: ControlsPanelProps) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/60 mb-6">
      <div className="flex flex-wrap gap-4 items-center">
        {/* Sélection période */}
        <div className="flex items-center gap-2">
          <Label className="text-slate-700 font-medium">Derniers</Label>
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-24">
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

        {/* Sources */}
        <div className="flex items-center gap-2">
          <Switch id="gmail" checked={gmailEnabled} onCheckedChange={setGmailEnabled} />
          <Label htmlFor="gmail" className="text-slate-700 font-medium">Gmail</Label>
        </div>

        {/* Sauvegarde */}
        <Button 
          onClick={saveSettings} 
          variant="outline" 
          className="border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          Sauvegarder
        </Button>

        {/* Bouton Automation */}
        <AutomationButton 
          leads={leads} 
          disabled={busy || leads.length === 0}
        />


        {/* Actions */}
        <div className="flex gap-2 ml-auto">
          <Button 
            onClick={onExtractGmail} 
            disabled={busy || !gmailEnabled} 
            className="flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy ? 'Collecte...' : 'Collecter Gmail'}
          </Button>
          
          <Button 
            onClick={onRefresh} 
            disabled={busy || !gmailEnabled} 
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