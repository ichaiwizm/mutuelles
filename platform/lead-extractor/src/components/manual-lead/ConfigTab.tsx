import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { NextSectionButton } from './NextSectionButton';
import type { ManualLeadForm } from '@/types/manual-lead';

interface ConfigTabProps {
  form: ManualLeadForm;
  updateForm: (updates: Partial<ManualLeadForm>) => void;
  globalConfig: { enabled: boolean; projectName?: 'lead_name' | 'lead_source'; dateEffet?: 'end_next_month' | 'start_next_month' | 'middle_next_month' };
  dateEffetOptions: { value: string; label: string }[];
  highlightedFields?: Set<string>;
  onNext?: () => void;
}

export function ConfigTab({ form, updateForm, globalConfig, dateEffetOptions, highlightedFields, onNext }: ConfigTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Configuration de la simulation</CardTitle>
        <CardDescription>Paramètres généraux de la simulation</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="project-name">Nom du projet</Label>
            <Input
              id="project-name"
              placeholder="Ex: Simulation Jean Dupont"
              value={form.projectNameValue || ''}
              onChange={(e) => updateForm({ projectNameValue: e.target.value })}
              className={highlightedFields?.has('projectName') ? 'border-red-500 ring-2 ring-red-200' : ''}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="simulation-type">Type de simulation</Label>
            <Select
              value={form.simulationType}
              onValueChange={(value: 'individuel' | 'couple') => {
                if (value === 'individuel') {
                  updateForm({ simulationType: value, conjoint: undefined });
                } else {
                  updateForm({
                    simulationType: value,
                    conjoint: {
                      dateNaissance: '',
                      regimeSocial: 'TNS',
                      statut: 'TNS',
                      profession: 'AUTRE'
                    }
                  });
                }
              }}
            >
              <SelectTrigger className={highlightedFields?.has('simulationType') ? 'border-red-500 ring-2 ring-red-200' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individuel">Individuel</SelectItem>
                <SelectItem value="couple">En couple</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="loi-madelin">Loi Madelin</Label>
            <Select
              value={form.loiMadelin}
              onValueChange={(value: 'oui' | 'non') => updateForm({ loiMadelin: value })}
            >
              <SelectTrigger className={highlightedFields?.has('loiMadelin') ? 'border-red-500 ring-2 ring-red-200' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="non">Non</SelectItem>
                <SelectItem value="oui">Oui</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {globalConfig.enabled && (
            <>
              <div className="space-y-2">
                <Label>Format du nom de projet <Badge variant="secondary" className="ml-2">Config globale</Badge></Label>
                <Select value={globalConfig.projectName || 'lead_name'} disabled>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead_name">Nom du lead</SelectItem>
                    <SelectItem value="lead_source">Nom du lead - Source Extension</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date d'effet <Badge variant="secondary" className="ml-2">Config globale</Badge></Label>
                <Select value={globalConfig.dateEffet || 'start_next_month'} disabled>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dateEffetOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <NextSectionButton onClick={onNext} show={!!onNext} />
      </CardContent>
    </Card>
  );
}

