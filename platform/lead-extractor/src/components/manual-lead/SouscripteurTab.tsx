import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NextSectionButton } from './NextSectionButton';
import { REGIME_OPTIONS, type ManualLeadForm, type ProfessionOption, type StatutOption } from '@/types/manual-lead';

interface SouscripteurTabProps {
  form: ManualLeadForm;
  updateSouscripteur: (updates: Partial<ManualLeadForm['souscripteur']>) => void;
  setNombreEnfants: (n: number) => void;
  getAvailableStatuts: (regime: string) => StatutOption[];
  getAvailableProfessions: (regime: string, statut: string) => ProfessionOption[];
  getDepartmentFromCodePostal: (cp: string) => string;
  highlightedFields?: Set<string>;
  onNext?: () => void;
}

export function SouscripteurTab({ form, updateSouscripteur, setNombreEnfants, getAvailableStatuts, getAvailableProfessions, getDepartmentFromCodePostal, highlightedFields, onNext }: SouscripteurTabProps) {
  const availableStatuts = getAvailableStatuts(form.souscripteur.regimeSocial);
  const availableProfessions = getAvailableProfessions(form.souscripteur.regimeSocial, form.souscripteur.statut);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Assuré principal</CardTitle>
        <CardDescription>Informations de la personne principale à assurer</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="souscripteur-date">Date de naissance</Label>
            <Input
              id="souscripteur-date"
              type="date"
              value={form.souscripteur.dateNaissance}
              onChange={(e) => updateSouscripteur({ dateNaissance: e.target.value })}
              max={new Date().toISOString().split('T')[0]}
              className={highlightedFields?.has('souscripteur.dateNaissance') ? 'border-red-500 ring-2 ring-red-200' : ''}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="souscripteur-codepostal">Code postal</Label>
            <Input
              id="souscripteur-codepostal"
              value={form.souscripteur.codePostal}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 5);
                updateSouscripteur({ codePostal: value });
              }}
              placeholder="75 ou 75001"
              maxLength={5}
              className={highlightedFields?.has('souscripteur.codePostal') ? 'border-red-500 ring-2 ring-red-200' : ''}
              required
            />
            {form.souscripteur.codePostal.length >= 2 && (
              <p className="text-sm text-muted-foreground">
                Département: {getDepartmentFromCodePostal(form.souscripteur.codePostal)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="souscripteur-regime">Régime social</Label>
            <Select
              value={form.souscripteur.regimeSocial}
              onValueChange={(value) => {
                const nextStatut = getAvailableStatuts(value)[0]?.value || '';
                const profs = nextStatut ? getAvailableProfessions(value, nextStatut) : [];
                const defaultProf = profs.find(p => p.value === 'AUTRE')?.value || profs[0]?.value || undefined;
                updateSouscripteur({ 
                  regimeSocial: value as any,
                  statut: nextStatut,
                  profession: defaultProf
                });
              }}
            >
              <SelectTrigger className={highlightedFields?.has('souscripteur.regimeSocial') ? 'border-red-500 ring-2 ring-red-200' : ''}>
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
            <Label htmlFor="souscripteur-statut">Statut</Label>
            <Select
              value={form.souscripteur.statut}
              onValueChange={(value) => {
                const profs = getAvailableProfessions(form.souscripteur.regimeSocial, value);
                const defaultProf = profs.find(p => p.value === 'AUTRE')?.value || profs[0]?.value || undefined;
                updateSouscripteur({ 
                  statut: value,
                  profession: defaultProf
                });
              }}
            >
              <SelectTrigger className={highlightedFields?.has('souscripteur.statut') ? 'border-red-500 ring-2 ring-red-200' : ''}>
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
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="souscripteur-profession">Profession</Label>
              <Select
                value={form.souscripteur.profession || ''}
                onValueChange={(value) => updateSouscripteur({ profession: value })}
              >
                <SelectTrigger className={highlightedFields?.has('souscripteur.profession') ? 'border-red-500 ring-2 ring-red-200' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableProfessions.map((profession) => (
                    <SelectItem key={profession.value} value={profession.value}>
                      {profession.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="nombre-enfants">Nombre d'enfants à assurer</Label>
            <Select
              value={form.souscripteur.nombreEnfants.toString()}
              onValueChange={(value) => setNombreEnfants(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 11 }, (_, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    {i === 0 ? 'Aucun enfant' : i === 1 ? '1 enfant' : `${i} enfants`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <NextSectionButton onClick={onNext} show={!!onNext} />
      </CardContent>
    </Card>
  );
}

