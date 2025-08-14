import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Mail, Calendar } from 'lucide-react';

interface ProgressPanelProps {
  show: boolean;
  source: 'gmail' | 'calendar' | null;
  phase: string;
  message: string;
  current: number;
  total: number;
}

export function ProgressPanel({
  show,
  source,
  phase,
  message,
  current,
  total
}: ProgressPanelProps) {
  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[340px] rounded-xl border bg-white shadow-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-slate-700 font-semibold">
          {source === 'gmail' ? (
            <Mail className="h-4 w-4" />
          ) : (
            <Calendar className="h-4 w-4" />
          )}
          <span>{source === 'gmail' ? 'Gmail' : 'Agenda'}</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {phase}
        </Badge>
      </div>
      
      {total > 0 && (
        <Progress
          value={current}
          max={total}
          label={message}
        />
      )}
      
      {total === 0 && (
        <div className="text-sm text-slate-600">
          {message || 'Préparation...'}
        </div>
      )}
    </div>
  );
}