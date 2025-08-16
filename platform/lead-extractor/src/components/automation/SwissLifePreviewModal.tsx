import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Check,
  AlertTriangle,
  Code2,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import type { Lead } from '@/types/lead';
import type { SwissLifeLead } from '@/types/automation';
import { convertLeadsToSwissLife } from '@/utils/swisslife-converter';
import { SwissLifeStorageManager } from '@/utils/localStorage-manager';

interface SwissLifePreviewModalProps {
  leads: Lead[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversionComplete?: (convertedLeads: SwissLifeLead[]) => void;
}

export function SwissLifePreviewModal({
  leads,
  open,
  onOpenChange,
  onConversionComplete,
}: SwissLifePreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false);

  // Conversion des leads
  const conversionResults = useMemo(() => {
    if (leads.length === 0) return null;
    return convertLeadsToSwissLife(leads);
  }, [leads]);

  const currentLead = conversionResults?.successful[currentIndex];
  const totalConverted = conversionResults?.successful.length || 0;

  // Navigation
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < totalConverted - 1;

  const goToPrevious = () => {
    if (hasPrevious) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (hasNext) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Sauvegarde dans localStorage
  const handleSave = async () => {
    if (!conversionResults?.successful || conversionResults.successful.length === 0) {
      toast.error('Aucun lead à sauvegarder');
      return;
    }

    setIsSaving(true);
    
    try {
      // Vérifier l'espace disponible
      if (SwissLifeStorageManager.isStorageNearLimit()) {
        toast.warning('Le stockage local est presque plein. Certains leads pourraient ne pas être sauvegardés.');
      }

      // Sauvegarder les leads
      SwissLifeStorageManager.replaceLeads(conversionResults.successful);
      
      // Afficher les avertissements s'il y en a
      if (conversionResults.totalWarnings.length > 0) {
        toast.warning(
          `${conversionResults.successful.length} leads sauvegardés avec ${conversionResults.totalWarnings.length} avertissements`
        );
      } else {
        toast.success(`${conversionResults.successful.length} leads sauvegardés avec succès !`);
      }

      setIsSaved(true);
      setShowNextButton(true);
      
      // Callback optionnel
      if (onConversionComplete) {
        onConversionComplete(conversionResults.successful);
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde des leads');
    } finally {
      setIsSaving(false);
    }
  };

  // Réinitialiser l'état quand le modal s'ouvre
  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
      setIsSaved(false);
      setShowNextButton(false);
    }
  }, [open]);

  // Formatage JSON pour l'affichage
  const formatJSON = (lead: SwissLifeLead | undefined) => {
    if (!lead) return '';
    return JSON.stringify(lead, null, 2);
  };

  // Copier dans le presse-papier
  const handleCopyJSON = () => {
    if (currentLead) {
      navigator.clipboard.writeText(formatJSON(currentLead));
      toast.success('JSON copié dans le presse-papier');
    }
  };

  if (!conversionResults) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5" />
              Prévisualisation de la conversion SwissLife
            </div>
            <div className="flex items-center gap-2">
              {totalConverted > 0 && (
                <Badge variant="outline">
                  {currentIndex + 1} / {totalConverted}
                </Badge>
              )}
              {isSaved && (
                <Badge className="bg-green-600">
                  <Check className="h-3 w-3 mr-1" />
                  Sauvegardé
                </Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Résumé de la conversion */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Résultat de la conversion</span>
            <div className="flex gap-2">
              <Badge className="bg-green-600">
                {conversionResults.successful.length} réussis
              </Badge>
              {conversionResults.failed.length > 0 && (
                <Badge variant="destructive">
                  {conversionResults.failed.length} échoués
                </Badge>
              )}
            </div>
          </div>
          
          {conversionResults.totalWarnings.length > 0 && (
            <div className="flex items-start gap-2 mt-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Avertissements :</p>
                <ul className="list-disc list-inside mt-1">
                  {conversionResults.totalWarnings.slice(0, 3).map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                  {conversionResults.totalWarnings.length > 3 && (
                    <li>... et {conversionResults.totalWarnings.length - 3} autres</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Contenu principal */}
        {currentLead && (
          <div className="space-y-4">
            {/* Infos du lead actuel */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{currentLead.nom}</h3>
                <p className="text-sm text-gray-600">{currentLead.description}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleCopyJSON}>
                Copier JSON
              </Button>
            </div>

            <Separator />

            {/* Prévisualisation JSON */}
            <ScrollArea className="h-96 border rounded-lg bg-gray-900 p-4">
              <pre className="text-green-400 text-xs font-mono">
                {formatJSON(currentLead)}
              </pre>
            </ScrollArea>

            {/* Navigation entre les leads */}
            {totalConverted > 1 && (
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPrevious}
                  disabled={!hasPrevious}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Précédent
                </Button>
                
                <span className="text-sm text-gray-600">
                  Lead {currentIndex + 1} sur {totalConverted}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNext}
                  disabled={!hasNext}
                >
                  Suivant
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Aucun lead converti avec succès */}
        {totalConverted === 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-3" />
            <p className="text-red-800 font-medium">
              Aucun lead n'a pu être converti avec succès.
            </p>
            {conversionResults.failed.length > 0 && (
              <div className="mt-4 text-left">
                <p className="text-sm text-red-700 font-medium mb-2">Erreurs :</p>
                <ul className="text-sm text-red-600 space-y-1">
                  {conversionResults.failed.map((failure, idx) => (
                    <li key={idx}>
                      • {failure.lead.contact.nom || 'Lead'}: {failure.errors.join(', ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isSaved ? 'Fermer' : 'Annuler'}
          </Button>
          
          <div className="flex gap-2">
            {!isSaved && totalConverted > 0 && (
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Sauvegarder dans LocalStorage
                  </>
                )}
              </Button>
            )}
            
            {showNextButton && (
              <Button className="bg-green-600 hover:bg-green-700">
                Suivant
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}