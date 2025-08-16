import type { Lead } from '@/types/lead';

interface ContactSectionProps {
  contact: Lead['contact'];
}

export function ContactSection({ contact }: ContactSectionProps) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <h3 className="font-semibold mb-3 text-gray-900">Informations de contact</h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          {contact.civilite && <div><span className="font-medium">Civilité:</span> {contact.civilite}</div>}
          {contact.nom && <div><span className="font-medium">Nom:</span> {contact.nom}</div>}
          {contact.prenom && <div><span className="font-medium">Prénom:</span> {contact.prenom}</div>}
          {contact.email && <div><span className="font-medium">Email:</span> {contact.email}</div>}
        </div>
        <div className="space-y-2">
          {contact.telephone && <div><span className="font-medium">Téléphone:</span> {contact.telephone}</div>}
          {contact.adresse && <div><span className="font-medium">Adresse:</span> {contact.adresse}</div>}
          {contact.codePostal && <div><span className="font-medium">Code postal:</span> {contact.codePostal}</div>}
          {contact.ville && <div><span className="font-medium">Ville:</span> {contact.ville}</div>}
        </div>
      </div>
    </div>
  );
}