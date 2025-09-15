import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useManualLead } from '@/hooks/useManualLead';
import { useGlobalConfig } from '@/hooks/useGlobalConfig';
import { Settings, User, Users, Baby, FileText, Star } from 'lucide-react';
import { toast } from 'sonner';
import { ConfigTab } from '@/components/manual-lead/ConfigTab';
import { SouscripteurTab } from '@/components/manual-lead/SouscripteurTab';
import { ConjointTab } from '@/components/manual-lead/ConjointTab';
import { EnfantsTab } from '@/components/manual-lead/EnfantsTab';
import { REGIME_OPTIONS } from '@/types/manual-lead';

interface ManualLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddLead?: (lead: any) => void;
}

// Plus de sections déroulantes: passage en onglets

export function ManualLeadDialog({ open, onOpenChange, onAddLead }: ManualLeadDialogProps) {
  const [activeTab, setActiveTab] = useState<'config' | 'souscripteur' | 'conjoint' | 'enfants'>('config');
  const [highlightedFields, setHighlightedFields] = useState<Set<string>>(new Set());
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

  // Fonction pour identifier les champs manquants et l'onglet correspondant
  const getMissingFieldsInfo = () => {
    const missingFields = new Set<string>();
    let firstMissingTab: 'config' | 'souscripteur' | 'conjoint' | 'enfants' = 'config';

    // Validation config
    if (!form.projectNameValue?.trim()) {
      missingFields.add('projectName');
      firstMissingTab = 'config';
    } else if (form.simulationType !== 'individuel' && form.simulationType !== 'couple') {
      missingFields.add('simulationType');
      firstMissingTab = 'config';
    } else if (form.loiMadelin !== 'oui' && form.loiMadelin !== 'non') {
      missingFields.add('loiMadelin');
      firstMissingTab = 'config';
    }
    // Validation souscripteur
    else if (!form.souscripteur.dateNaissance) {
      missingFields.add('souscripteur.dateNaissance');
      firstMissingTab = 'souscripteur';
    } else if (!form.souscripteur.codePostal || !/^\d{2,5}$/.test(form.souscripteur.codePostal)) {
      missingFields.add('souscripteur.codePostal');
      firstMissingTab = 'souscripteur';
    } else if (!form.souscripteur.regimeSocial) {
      missingFields.add('souscripteur.regimeSocial');
      firstMissingTab = 'souscripteur';
    } else if (!form.souscripteur.statut) {
      missingFields.add('souscripteur.statut');
      firstMissingTab = 'souscripteur';
    } else {
      // Vérifier si profession est requise pour le souscripteur
      const regimeOption = REGIME_OPTIONS.find(r => r.value === form.souscripteur.regimeSocial);
      const statutOption = regimeOption?.statuts.find(s => s.value === form.souscripteur.statut);
      const professionRequired = !!(statutOption && Array.isArray(statutOption.professions) && statutOption.professions.length > 0);
      if (professionRequired && !form.souscripteur.profession) {
        missingFields.add('souscripteur.profession');
        firstMissingTab = 'souscripteur';
      }
      // Validation conjoint si simulation couple
      else if (form.simulationType === 'couple') {
        if (!form.conjoint?.dateNaissance) {
          missingFields.add('conjoint.dateNaissance');
          firstMissingTab = 'conjoint';
        } else if (!form.conjoint?.regimeSocial) {
          missingFields.add('conjoint.regimeSocial');
          firstMissingTab = 'conjoint';
        } else if (!form.conjoint?.statut) {
          missingFields.add('conjoint.statut');
          firstMissingTab = 'conjoint';
        } else {
          // Vérifier si profession est requise pour le conjoint
          const regConjoint = REGIME_OPTIONS.find(r => r.value === form.conjoint!.regimeSocial);
          const statConjoint = regConjoint?.statuts.find(s => s.value === form.conjoint!.statut);
          const profReqConjoint = !!(statConjoint && Array.isArray(statConjoint.professions) && statConjoint.professions.length > 0);
          if (profReqConjoint && !form.conjoint!.profession) {
            missingFields.add('conjoint.profession');
            firstMissingTab = 'conjoint';
          }
          // Validation enfants
          else if (form.souscripteur.nombreEnfants > 0) {
            const invalidEnfant = form.enfants.findIndex((enfant, index) => 
              index < form.souscripteur.nombreEnfants && (!enfant.dateNaissance || !enfant.ayantDroit)
            );
            if (invalidEnfant !== -1) {
              missingFields.add(`enfant.${invalidEnfant}.dateNaissance`);
              missingFields.add(`enfant.${invalidEnfant}.ayantDroit`);
              firstMissingTab = 'enfants';
            }
          }
        }
      }
      // Validation enfants si pas de conjoint mais des enfants
      else if (form.souscripteur.nombreEnfants > 0) {
        const invalidEnfant = form.enfants.findIndex((enfant, index) => 
          index < form.souscripteur.nombreEnfants && (!enfant.dateNaissance || !enfant.ayantDroit)
        );
        if (invalidEnfant !== -1) {
          missingFields.add(`enfant.${invalidEnfant}.dateNaissance`);
          missingFields.add(`enfant.${invalidEnfant}.ayantDroit`);
          firstMissingTab = 'enfants';
        }
      }
    }

    return { missingFields, firstMissingTab };
  };

  const handleSubmit = () => {
    if (!isValid) {
      const { missingFields, firstMissingTab } = getMissingFieldsInfo();
      setHighlightedFields(missingFields);
      setActiveTab(firstMissingTab);
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const lead = generateLead();
    if (lead && onAddLead) {
      onAddLead(lead);
      resetForm();
      setHighlightedFields(new Set());
      onOpenChange(false);
      toast.success('Lead ajouté avec succès');
    }
  };

  // Note: fermeture gérée par onOpenChange depuis les actions du Dialog

  // Options de date d'effet avec les vraies dates
  const dateEffetOptions = [
    { value: 'start_next_month', label: `Début du mois suivant (${nextMonthDates.start})` },
    { value: 'middle_next_month', label: `Milieu du mois suivant (${nextMonthDates.middle})` },
    { value: 'end_next_month', label: `Fin du mois suivant (${nextMonthDates.end})` }
  ];

  const orderedTabs = useMemo(() => {
    const tabs: Array<'config' | 'souscripteur' | 'conjoint' | 'enfants'> = ['config', 'souscripteur'];
    if (form.simulationType === 'couple') tabs.push('conjoint');
    if ((form.souscripteur?.nombreEnfants || 0) > 0) tabs.push('enfants');
    return tabs;
  }, [form.simulationType, form.souscripteur?.nombreEnfants]);

  useEffect(() => {
    if (!orderedTabs.includes(activeTab)) setActiveTab(orderedTabs[0]);
  }, [orderedTabs, activeTab]);

  // Effacer les highlights quand l'utilisateur modifie le formulaire
  useEffect(() => {
    if (highlightedFields.size > 0) {
      setHighlightedFields(new Set());
    }
  }, [form]);

  const getNextTab = useMemo(() => {
    const nextMap: Record<'config' | 'souscripteur' | 'conjoint' | 'enfants', () => ('config' | 'souscripteur' | 'conjoint' | 'enfants' | null)> = {
      config: () => 'souscripteur',
      souscripteur: () => {
        if (form.simulationType === 'couple') return 'conjoint';
        if ((form.souscripteur?.nombreEnfants || 0) > 0) return 'enfants';
        return null;
      },
      conjoint: () => ((form.souscripteur?.nombreEnfants || 0) > 0 ? 'enfants' : null),
      enfants: () => null
    };
    return nextMap;
  }, [form.simulationType, form.souscripteur?.nombreEnfants]);

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

        <div className="space-y-4 py-2">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="config" className="gap-2"><Settings className="h-4 w-4" /> Configuration</TabsTrigger>
                <TabsTrigger value="souscripteur" className="gap-2"><User className="h-4 w-4" /> Assuré principal</TabsTrigger>
                {form.simulationType === 'couple' && (
                  <TabsTrigger value="conjoint" className="gap-2"><Users className="h-4 w-4" /> Conjoint</TabsTrigger>
                )}
                {form.souscripteur.nombreEnfants > 0 && (
                  <TabsTrigger value="enfants" className="gap-2"><Baby className="h-4 w-4" /> Enfants</TabsTrigger>
                )}
              </TabsList>
            </div>

            <TabsContent value="config" className="mt-3">
              <ConfigTab
                form={form}
                updateForm={updateForm}
                globalConfig={globalConfig}
                dateEffetOptions={dateEffetOptions}
                highlightedFields={highlightedFields}
                onNext={getNextTab.config() ? () => setActiveTab(getNextTab.config() as any) : undefined}
              />
            </TabsContent>

            <TabsContent value="souscripteur" className="mt-3">
              <SouscripteurTab
                form={form}
                updateSouscripteur={updateSouscripteur}
                setNombreEnfants={setNombreEnfants}
                getAvailableStatuts={getAvailableStatuts}
                getAvailableProfessions={getAvailableProfessions}
                getDepartmentFromCodePostal={getDepartmentFromCodePostal}
                highlightedFields={highlightedFields}
                onNext={getNextTab.souscripteur() ? () => setActiveTab(getNextTab.souscripteur() as any) : undefined}
              />
            </TabsContent>

          {/* Conjoint */}
            {form.simulationType === 'couple' && (
              <TabsContent value="conjoint" className="mt-3">
                <ConjointTab
                  form={form}
                  updateConjoint={updateConjoint}
                  getAvailableStatuts={getAvailableStatuts}
                  getAvailableProfessions={getAvailableProfessions}
                  highlightedFields={highlightedFields}
                  onNext={getNextTab.conjoint() ? () => setActiveTab(getNextTab.conjoint() as any) : undefined}
                />
              </TabsContent>
            )}

          {/* Enfants */}
            {form.souscripteur.nombreEnfants > 0 && (
              <TabsContent value="enfants" className="mt-3">
                <EnfantsTab form={form} updateEnfant={updateEnfant} highlightedFields={highlightedFields} />
              </TabsContent>
            )}
          </Tabs>
        </div>

        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="outline">
              Annuler
            </Button>
          </DialogClose>
          <Button 
            onClick={handleSubmit}
            className="min-w-[100px]"
          >
            <Star className="h-4 w-4 mr-2" />
            Créer la simulation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
