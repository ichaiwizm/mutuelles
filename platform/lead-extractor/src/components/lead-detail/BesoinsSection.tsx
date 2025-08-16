import type { Lead } from '@/types/lead';

interface BesoinsSectionProps {
  besoins: Lead['besoins'];
}

export function BesoinsSection({ besoins }: BesoinsSectionProps) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <h3 className="font-semibold mb-3 text-gray-900">Besoins en assurance</h3>
      <div className="space-y-3 text-sm">
        {besoins.dateEffet && <div><span className="font-medium">Date d'effet souhaitée:</span> {besoins.dateEffet}</div>}
        {besoins.assureActuellement !== undefined && (
          <div><span className="font-medium">Assuré actuellement:</span> {besoins.assureActuellement ? 'Oui' : 'Non'}</div>
        )}
        {besoins.niveaux && (
          <div>
            <div className="font-medium mb-2">Niveaux de garantie souhaités:</div>
            <div className="grid grid-cols-2 gap-2 ml-4">
              {besoins.niveaux.soinsMedicaux && <div>• Soins médicaux: {besoins.niveaux.soinsMedicaux}</div>}
              {besoins.niveaux.hospitalisation && <div>• Hospitalisation: {besoins.niveaux.hospitalisation}</div>}
              {besoins.niveaux.optique && <div>• Optique: {besoins.niveaux.optique}</div>}
              {besoins.niveaux.dentaire && <div>• Dentaire: {besoins.niveaux.dentaire}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}