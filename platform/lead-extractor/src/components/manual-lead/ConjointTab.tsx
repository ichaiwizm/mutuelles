import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NextSectionButton } from './NextSectionButton';
import { REGIME_OPTIONS, type ManualLeadForm, type ProfessionOption, type StatutOption } from '@/types/manual-lead';

interface ConjointTabProps {
  form: ManualLeadForm;
  updateConjoint: (updates: Partial<ManualLeadForm['conjoint']>) => void;
  getAvailableStatuts: (regime: string) => StatutOption[];
  getAvailableProfessions: (regime: string, statut: string) => ProfessionOption[];
  highlightedFields?: Set<string>;
  onNext?: () => void;
}

export function ConjointTab({ form, updateConjoint, getAvailableStatuts, getAvailableProfessions, highlightedFields, onNext }: ConjointTabProps) {
  const availableStatuts = form.conjoint?.regimeSocial ? getAvailableStatuts(form.conjoint.regimeSocial) : [];
  const availableProfessions = form.conjoint?.regimeSocial && form.conjoint?.statut
    ? getAvailableProfessions(form.conjoint.regimeSocial, form.conjoint.statut)
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Conjoint</CardTitle>
        <CardDescription>Informations du conjoint à assurer</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="conjoint-date">Date de naissance</Label>
            <Input
              id="conjoint-date"
              type="date"
              value={form.conjoint?.dateNaissance || ''}
              onChange={(e) => updateConjoint({ dateNaissance: e.target.value })}
              max={new Date().toISOString().split('T')[0]}
              className={highlightedFields?.has('conjoint.dateNaissance') ? 'border-red-500 ring-2 ring-red-200' : ''}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="conjoint-regime">Régime social</Label>
            <Select
              value={form.conjoint?.regimeSocial || 'TNS'}
              onValueChange={(value) => {
                const nextStatut = getAvailableStatuts(value)[0]?.value || '';
                const profs = nextStatut ? getAvailableProfessions(value, nextStatut) : [];
                const defaultProf = profs.find(p => p.value === 'AUTRE')?.value || profs[0]?.value || undefined;
                updateConjoint({ 
                  regimeSocial: value as any,
                  statut: nextStatut,
                  profession: defaultProf
                });
              }}
            >
              <SelectTrigger className={highlightedFields?.has('conjoint.regimeSocial') ? 'border-red-500 ring-2 ring-red-200' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGIME_OPTIONS.map(regime => (
                  <SelectItem key={regime.value} value={regime.value}>
                    {regime.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="conjoint-statut">Statut</Label>
            <Select
              value={form.conjoint?.statut || ''}
              onValueChange={(value) => {
                const profs = form.conjoint?.regimeSocial ? getAvailableProfessions(form.conjoint.regimeSocial, value) : [];
                const defaultProf = profs.find(p => p.value === 'AUTRE')?.value || profs[0]?.value || undefined;
                updateConjoint({ 
                  statut: value,
                  profession: defaultProf
                });
              }}
            >
              <SelectTrigger className={highlightedFields?.has('conjoint.statut') ? 'border-red-500 ring-2 ring-red-200' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableStatuts.map(statut => (
                  <SelectItem key={statut.value} value={statut.value}>
                    {statut.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {availableProfessions.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="conjoint-profession">Profession</Label>
              <Select
                value={form.conjoint?.profession || ''}
                onValueChange={(value) => updateConjoint({ profession: value })}
              >
                <SelectTrigger className={highlightedFields?.has('conjoint.profession') ? 'border-red-500 ring-2 ring-red-200' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableProfessions.map(profession => (
                    <SelectItem key={profession.value} value={profession.value}>
                      {profession.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <NextSectionButton onClick={onNext} show={!!onNext} />
      </CardContent>
    </Card>
  );
}

