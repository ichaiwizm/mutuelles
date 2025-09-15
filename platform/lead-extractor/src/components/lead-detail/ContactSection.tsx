import type { Lead } from '@/types/lead';

interface ContactSectionProps {
  contact: Lead['contact'];
  isManual?: boolean;
}

export function ContactSection({ contact, isManual }: ContactSectionProps) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <h3 className="font-semibold mb-3 text-gray-900">
        {isManual ? 'Informations de localisation' : 'Informations de contact'}
      </h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          {!isManual && contact.civilite && <div><span className="font-medium">Civilité:</span> {contact.civilite}</div>}
          {!isManual && contact.nom && <div><span className="font-medium">Nom:</span> {contact.nom}</div>}
          {!isManual && contact.prenom && <div><span className="font-medium">Prénom:</span> {contact.prenom}</div>}
          {!isManual && contact.email && <div><span className="font-medium">Email:</span> {contact.email}</div>}
          {contact.codePostal && <div><span className="font-medium">Code postal:</span> {contact.codePostal}</div>}
        </div>
        <div className="space-y-2">
          {!isManual && contact.telephone && <div><span className="font-medium">Téléphone:</span> {contact.telephone}</div>}
          {!isManual && contact.adresse && <div><span className="font-medium">Adresse:</span> {contact.adresse}</div>}
          {!isManual && contact.ville && <div><span className="font-medium">Ville:</span> {contact.ville}</div>}
        </div>
      </div>
    </div>
  );
}