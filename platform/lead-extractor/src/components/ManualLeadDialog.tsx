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

interface ManualLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddLead?: (lead: any) => void;
}

// Plus de sections déroulantes: passage en onglets

export function ManualLeadDialog({ open, onOpenChange, onAddLead }: ManualLeadDialogProps) {
  const [activeTab, setActiveTab] = useState<'config' | 'souscripteur' | 'conjoint' | 'enfants'>('config');
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
                  onNext={getNextTab.conjoint() ? () => setActiveTab(getNextTab.conjoint() as any) : undefined}
                />
              </TabsContent>
            )}

          {/* Enfants */}
            {form.souscripteur.nombreEnfants > 0 && (
              <TabsContent value="enfants" className="mt-3">
                <EnfantsTab form={form} updateEnfant={updateEnfant} />
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
