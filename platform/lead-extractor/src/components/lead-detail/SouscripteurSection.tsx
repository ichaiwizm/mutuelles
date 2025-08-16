import type { Lead } from '@/types/lead';

interface SouscripteurSectionProps {
  souscripteur: Lead['souscripteur'];
}

export function SouscripteurSection({ souscripteur }: SouscripteurSectionProps) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <h3 className="font-semibold mb-3 text-gray-900">Souscripteur</h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        {souscripteur.dateNaissance && <div><span className="font-medium">Date de naissance:</span> {souscripteur.dateNaissance}</div>}
        {souscripteur.profession && <div><span className="font-medium">Profession:</span> {souscripteur.profession}</div>}
        {souscripteur.regimeSocial && <div><span className="font-medium">Régime social:</span> {souscripteur.regimeSocial}</div>}
        {souscripteur.nombreEnfants !== undefined && <div><span className="font-medium">Nombre d'enfants:</span> {souscripteur.nombreEnfants}</div>}
        {souscripteur.revenusAnnuels && <div><span className="font-medium">Revenus annuels:</span> {souscripteur.revenusAnnuels}</div>}
      </div>
    </div>
  );
}