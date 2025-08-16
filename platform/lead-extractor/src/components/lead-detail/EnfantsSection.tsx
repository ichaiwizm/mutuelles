import type { Lead } from '@/types/lead';

interface EnfantsSectionProps {
  enfants: Lead['enfants'];
}

export function EnfantsSection({ enfants }: EnfantsSectionProps) {
  if (!enfants || enfants.length === 0) return null;

  return (
    <div className="bg-white border rounded-lg p-4">
      <h3 className="font-semibold mb-3 text-gray-900">Enfants</h3>
      <div className="space-y-2 text-sm">
        {enfants.map((enfant, index) => (
          <div key={index}>
            <span className="font-medium">Enfant {index + 1}:</span> 
            {enfant.dateNaissance || 'Date non spécifiée'}
          </div>
        ))}
      </div>
    </div>
  );
}