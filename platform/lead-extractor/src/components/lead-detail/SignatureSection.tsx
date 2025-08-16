import type { Lead } from '@/types/lead';

interface SignatureSectionProps {
  signature: Lead['signature'];
}

export function SignatureSection({ signature }: SignatureSectionProps) {
  if (!signature) return null;
  
  return (
    <div className="bg-white border rounded-lg p-4">
      <h3 className="font-semibold mb-3 text-gray-900">Information professionnelle</h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          {signature.nomEntreprise && (
            <div><span className="font-medium">Entreprise:</span> {signature.nomEntreprise}</div>
          )}
          {signature.numeroOrias && (
            <div><span className="font-medium">N° ORIAS:</span> {signature.numeroOrias}</div>
          )}
          {signature.siren && (
            <div><span className="font-medium">SIREN:</span> {signature.siren}</div>
          )}
        </div>
        <div className="space-y-2">
          {signature.siteWeb && (
            <div><span className="font-medium">Site web:</span> {signature.siteWeb}</div>
          )}
          {signature.instagram && (
            <div><span className="font-medium">Instagram:</span> @{signature.instagram}</div>
          )}
          {signature.numeroRCP && (
            <div><span className="font-medium">N° RCP:</span> {signature.numeroRCP}</div>
          )}
        </div>
      </div>
    </div>
  );
}