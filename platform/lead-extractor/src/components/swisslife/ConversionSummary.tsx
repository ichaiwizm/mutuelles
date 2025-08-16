import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

interface ConversionSummaryProps {
  successfulCount: number;
  failedCount: number;
  warnings: string[];
}

export function ConversionSummary({ successfulCount, failedCount, warnings }: ConversionSummaryProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">Résultat de la conversion</span>
        <div className="flex gap-2">
          <Badge className="bg-green-600">
            {successfulCount} réussis
          </Badge>
          {failedCount > 0 && (
            <Badge variant="destructive">
              {failedCount} échoués
            </Badge>
          )}
        </div>
      </div>
      
      {warnings.length > 0 && (
        <div className="flex items-start gap-2 mt-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium">Avertissements :</p>
            <ul className="list-disc list-inside mt-1">
              {warnings.slice(0, 3).map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
              {warnings.length > 3 && (
                <li>... et {warnings.length - 3} autres</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}