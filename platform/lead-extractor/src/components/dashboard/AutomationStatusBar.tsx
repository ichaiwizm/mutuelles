import { useAutoPilotRuntime } from '@/hooks/useAutoPilotRuntime';
import { useAutoPilotSettings } from '@/hooks/useAutoPilotSettings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity } from 'lucide-react';

function fmt(iso?: string | null) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

export function AutomationStatusBar({ onOpenAutomation }: { onOpenAutomation: () => void }) {
  const runtime = useAutoPilotRuntime(2000);
  const { settings } = useAutoPilotSettings();

  if (settings.automationEnabled === false || settings.showStatusBar === false) {
    return null; // ne rien afficher si désactivé
  }

  const nextExtraction = runtime.refreshDailyNextAt || runtime.refreshNextAt || null;
  const nextSend = runtime.autoSendNextAt || null;
  const postSend = settings.postExtractAutoSendEnabled !== false;
  const postDelaySec = Math.round((settings.postExtractAutoSendDelayMs ?? 120000) / 1000);

  return (
    <div className="w-full bg-white border border-slate-200/60 rounded-xl px-4 py-3 mb-4 flex items-center gap-6 shadow-sm">
      <div className="flex items-center gap-2 min-w-[120px]">
        <Activity className={`h-4 w-4 ${runtime.busy ? 'text-blue-600' : 'text-slate-500'}`} />
        <span className="text-sm font-medium text-slate-800">Automation</span>
        <Badge className="bg-green-50 text-green-700 border border-green-200">Active</Badge>
      </div>

      <div className="text-sm text-slate-700">
        <span className="font-medium">Prochaine extraction:</span> {fmt(nextExtraction)}
      </div>

      <div className="text-sm text-slate-700">
        <span className="font-medium">Envoi:</span> {nextSend ? fmt(nextSend) : (postSend ? `Auto ${postDelaySec}s après extraction` : '—')}
      </div>

      <div className="ml-auto">
        <Button size="sm" variant="outline" onClick={onOpenAutomation}>
          Détails
        </Button>
      </div>
    </div>
  );
}
