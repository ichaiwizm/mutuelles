import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useManualLead } from '@/hooks/useManualLead';
import { useGlobalConfig } from '@/hooks/useGlobalConfig';
import { REGIME_OPTIONS } from '@/types/manual-lead';
import { Settings, User, Users, Baby, FileText, ChevronDown, Star } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ManualLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddLead?: (lead: any) => void;
}

// Composant CollapsibleSection réutilisable
interface CollapsibleSectionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function FormCollapsibleSection({ title, description, icon, badge, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-muted-foreground">{icon}</div>
                <div className="space-y-1 text-left">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base leading-none">{title}</CardTitle>
                    {badge && badge}
                  </div>
                  <CardDescription className="text-sm leading-tight">
                    {description}
                  </CardDescription>
                </div>
              </div>
              <ChevronDown
                className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform duration-200",
                  isOpen && "rotate-180"
                )}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-6">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function ManualLeadDialog({ open, onOpenChange, onAddLead }: ManualLeadDialogProps) {
  const {
    form,
    isValid,
    updateForm,
    updateSouscripteur,
    updateConjoint,
    updateEnfant,
    setNombreEnfants,
    getAvailableStatuts,
    getAvailableProfessions,
    getDepartmentFromCodePostal,
    resetForm,
    generateLead
  } = useManualLead();

  const { config: globalConfig, getNextMonthDates } = useGlobalConfig();
  const nextMonthDates = getNextMonthDates();

  const handleSubmit = () => {
    if (!isValid) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const lead = generateLead();
    if (lead && onAddLead) {
      onAddLead(lead);
      resetForm();
      onOpenChange(false);
      toast.success('Lead ajouté avec succès');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  // Options de date d'effet avec les vraies dates
  const dateEffetOptions = [
    { value: 'start_next_month', label: `Début du mois suivant (${nextMonthDates.start})` },
    { value: 'middle_next_month', label: `Milieu du mois suivant (${nextMonthDates.middle})` },
    { value: 'end_next_month', label: `Fin du mois suivant (${nextMonthDates.end})` }
  ];

  const availableStatutsSouscripteur = getAvailableStatuts(form.souscripteur.regimeSocial);
  const availableProfessionsSouscripteur = getAvailableProfessions(form.souscripteur.regimeSocial, form.souscripteur.statut);
  
  const availableStatutsConjoint = form.conjoint?.regimeSocial ? getAvailableStatuts(form.conjoint.regimeSocial) : [];
  const availableProfessionsConjoint = form.conjoint?.regimeSocial && form.conjoint?.statut ? 
    getAvailableProfessions(form.conjoint.regimeSocial, form.conjoint.statut) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-w-3xl w-[90vw] max-h-[85vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Créer une simulation SwissLife
          </DialogTitle>
          <DialogDescription>
            Remplissez les informations nécessaires pour générer une simulation personnalisée.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Configuration de base */}
          <FormCollapsibleSection
            title="Configuration de la simulation"
            description="Paramètres généraux de la simulation"
            icon={<Settings className="h-4 w-4" />}
            defaultOpen={true}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <SelectTrigger>
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
                  <SelectTrigger>
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
          </FormCollapsibleSection>

          {/* Assuré principal */}
          <FormCollapsibleSection
            title="Assuré principal"
            description="Informations de la personne principale à assurer"
            icon={<User className="h-4 w-4" />}
            defaultOpen={true}
            badge={!form.souscripteur.dateNaissance ? 
              <Badge variant="destructive">Requis</Badge> : 
              <Badge variant="secondary">Complété</Badge>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              

              <div className="space-y-2">
                <Label htmlFor="souscripteur-date">Date de naissance *</Label>
                <Input
                  id="souscripteur-date"
                  type="date"
                  value={form.souscripteur.dateNaissance}
                  onChange={(e) => updateSouscripteur({ dateNaissance: e.target.value })}
                  max={new Date().toISOString().split('T')[0]} // Ne peut pas être dans le futur
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="souscripteur-codepostal">Code postal *</Label>
                <Input
                  id="souscripteur-codepostal"
                  value={form.souscripteur.codePostal}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 5);
                    updateSouscripteur({ codePostal: value });
                  }}
                  placeholder="12345"
                  maxLength={5}
                />
                {form.souscripteur.codePostal.length === 5 && (
                  <p className="text-sm text-muted-foreground">
                    Département: {getDepartmentFromCodePostal(form.souscripteur.codePostal)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="souscripteur-regime">Régime social *</Label>
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
                  <SelectTrigger>
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
                <Label htmlFor="souscripteur-statut">Statut *</Label>
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStatutsSouscripteur.map(statut => (
                      <SelectItem key={statut.value} value={statut.value}>
                        {statut.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {availableProfessionsSouscripteur.length > 0 && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="souscripteur-profession">Profession</Label>
                  <Select
                    value={form.souscripteur.profession || ''}
                    onValueChange={(value) => updateSouscripteur({ profession: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProfessionsSouscripteur.map(profession => (
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
          </FormCollapsibleSection>

          {/* Conjoint */}
          {form.simulationType === 'couple' && (
            <FormCollapsibleSection
              title="Conjoint"
              description="Informations du conjoint à assurer"
              icon={<Users className="h-4 w-4" />}
              defaultOpen={true}
              badge={!form.conjoint?.dateNaissance ? 
                <Badge variant="destructive">Requis</Badge> : 
                <Badge variant="secondary">Complété</Badge>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              

                <div className="space-y-2">
                  <Label htmlFor="conjoint-date">Date de naissance *</Label>
                  <Input
                    id="conjoint-date"
                    type="date"
                    value={form.conjoint?.dateNaissance || ''}
                    onChange={(e) => updateConjoint({ dateNaissance: e.target.value })}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conjoint-regime">Régime social *</Label>
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
                    <SelectTrigger>
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
                  <Label htmlFor="conjoint-statut">Statut *</Label>
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStatutsConjoint.map(statut => (
                        <SelectItem key={statut.value} value={statut.value}>
                          {statut.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {availableProfessionsConjoint.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="conjoint-profession">Profession</Label>
                    <Select
                      value={form.conjoint?.profession || ''}
                      onValueChange={(value) => updateConjoint({ profession: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProfessionsConjoint.map(profession => (
                          <SelectItem key={profession.value} value={profession.value}>
                            {profession.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </FormCollapsibleSection>
          )}

          {/* Enfants */}
          {form.souscripteur.nombreEnfants > 0 && (
            <FormCollapsibleSection
              title={`Enfants (${form.enfants.length}/${form.souscripteur.nombreEnfants})`}
              description="Informations des enfants à assurer"
              icon={<Baby className="h-4 w-4" />}
              defaultOpen={true}
              badge={form.enfants.some(e => !e.dateNaissance) ? 
                <Badge variant="destructive">Requis</Badge> : 
                <Badge variant="secondary">Complété</Badge>
              }
            >
              <div className="space-y-4">
                {form.enfants.map((enfant, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-4">
                    <h4 className="font-medium text-sm">Enfant {index + 1}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`enfant-${index}-date`}>Date de naissance *</Label>
                        <Input
                          id={`enfant-${index}-date`}
                          type="date"
                          value={enfant.dateNaissance}
                          onChange={(e) => updateEnfant(index, { dateNaissance: e.target.value })}
                          max={new Date().toISOString().split('T')[0]}
                          min="1900-01-01"
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
                          <SelectTrigger>
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
            </FormCollapsibleSection>
          )}
        </div>

        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="outline">
              Annuler
            </Button>
          </DialogClose>
          <Button 
            onClick={handleSubmit}
            disabled={!isValid}
            className="min-w-[100px]"
          >
            {isValid ? (
              <>
                <Star className="h-4 w-4 mr-2" />
                Créer la simulation
              </>
            ) : (
              'Compléter les champs'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
