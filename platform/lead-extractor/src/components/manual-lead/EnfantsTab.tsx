import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ManualLeadForm } from '@/types/manual-lead';

interface EnfantsTabProps {
  form: ManualLeadForm;
  updateEnfant: (index: number, updates: Partial<ManualLeadForm['enfants'][0]>) => void;
  highlightedFields?: Set<string>;
}

export function EnfantsTab({ form, updateEnfant, highlightedFields }: EnfantsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Enfants ({form.enfants.length}/{form.souscripteur.nombreEnfants})</CardTitle>
        <CardDescription>Informations des enfants à assurer</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {form.enfants.map((enfant, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-4">
              <h4 className="font-medium text-sm">Enfant {index + 1}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`enfant-${index}-date`}>Date de naissance</Label>
                  <Input
                    id={`enfant-${index}-date`}
                    type="date"
                    value={enfant.dateNaissance}
                    onChange={(e) => updateEnfant(index, { dateNaissance: e.target.value })}
                    max={new Date().toISOString().split('T')[0]}
                    min="1900-01-01"
                    className={highlightedFields?.has(`enfant.${index}.dateNaissance`) ? 'border-red-500 ring-2 ring-red-200' : ''}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Ayant droit</Label>
                  <Select
                    value={enfant.ayantDroit}
                    onValueChange={(value: 'souscripteur' | 'conjoint') =>
                      updateEnfant(index, { ayantDroit: value })
                    }
                  >
                    <SelectTrigger className={highlightedFields?.has(`enfant.${index}.ayantDroit`) ? 'border-red-500 ring-2 ring-red-200' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="souscripteur">Assuré principal</SelectItem>
                      {form.simulationType === 'couple' && (
                        <SelectItem value="conjoint">Conjoint</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

