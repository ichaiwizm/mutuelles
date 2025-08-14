import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

const ACTIVE_RULES = [
  { category: 'Contact', labels: ['Civilité', 'Nom', 'Prénom', 'Téléphone', 'Email', 'Adresse', 'Code postal', 'Ville'] },
  { category: 'Souscripteur', labels: ['Date de naissance', 'Profession', 'Régime social', 'Nombre d\'enfants'] },
  { category: 'Conjoint', labels: ['Date de naissance', 'Profession', 'Régime social'] },
  { category: 'Enfants', labels: ['Date de naissance du 1er enfant', 'Date de naissance du 2ème enfant', 'Date de naissance du 3ème enfant'] },
  { category: 'Besoins', labels: ['Date d\'effet', 'Assuré actuellement', 'Soins médicaux', 'Hospitalisation', 'Optique', 'Dentaire'] }
];

export function Rules() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Règles d'extraction</h1>
      
      <div className="space-y-4">
        {ACTIVE_RULES.map((rule) => (
          <Card key={rule.category} className="p-4">
            <h2 className="text-lg font-semibold mb-3">{rule.category}</h2>
            <div className="flex flex-wrap gap-2">
              {rule.labels.map((label) => (
                <Badge key={label} variant="secondary">
                  {label}
                </Badge>
              ))}
            </div>
          </Card>
        ))}
      </div>
      
      <div className="mt-6 text-sm text-gray-500">
        <p>Version 1 - Lecture seule</p>
        <p>L'édition des règles sera disponible dans la version 1.5</p>
      </div>
    </div>
  );
}