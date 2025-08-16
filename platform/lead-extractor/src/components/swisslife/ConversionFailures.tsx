import { AlertTriangle } from 'lucide-react';

interface ConversionFailuresProps {
  failures: Array<{ lead: any; errors: string[] }>;
}

export function ConversionFailures({ failures }: ConversionFailuresProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-3" />
      <p className="text-red-800 font-medium">
        Aucun lead n'a pu être converti avec succès.
      </p>
      {failures.length > 0 && (
        <div className="mt-4 text-left">
          <p className="text-sm text-red-700 font-medium mb-2">Erreurs :</p>
          <ul className="text-sm text-red-600 space-y-1">
            {failures.map((failure, idx) => (
              <li key={idx}>
                • {failure.lead.contact.nom || 'Lead'}: {failure.errors.join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}