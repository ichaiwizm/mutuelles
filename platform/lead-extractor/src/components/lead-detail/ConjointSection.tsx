import type { Lead } from '@/types/lead';

interface ConjointSectionProps {
  conjoint: Lead['conjoint'];
}

export function ConjointSection({ conjoint }: ConjointSectionProps) {
  if (!conjoint) return null;

  return (
    <div className="bg-white border rounded-lg p-4">
      <h3 className="font-semibold mb-3 text-gray-900">Conjoint</h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        {conjoint.dateNaissance && <div><span className="font-medium">Date de naissance:</span> {conjoint.dateNaissance}</div>}
        {conjoint.profession && <div><span className="font-medium">Profession:</span> {conjoint.profession}</div>}
        {conjoint.regimeSocial && <div><span className="font-medium">Régime social:</span> {conjoint.regimeSocial}</div>}
      </div>
    </div>
  );
}