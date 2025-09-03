import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { TestDataFormat } from '@/utils/lead-formatter';
import { SwissLifeStorageManager } from '@/utils/localStorage-manager';

interface ConversionResults {
  successful: TestDataFormat[];
  totalWarnings: string[];
  failed: any[];
}

export function useSwissLifeStorage(
  conversionResults: ConversionResults | null,
  open: boolean,
  onConversionComplete?: (convertedLeads: TestDataFormat[]) => void
) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false);

  // Réinitialiser l'état quand le modal s'ouvre
  useEffect(() => {
    if (open) {
      setIsSaved(false);
      setShowNextButton(false);
    }
  }, [open]);

  const handleSave = async () => {
    if (!conversionResults?.successful || conversionResults.successful.length === 0) {
      toast.error('Aucun lead à sauvegarder');
      return;
    }

    setIsSaving(true);
    
    try {
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

  return {
    isSaving,
    isSaved,
    showNextButton,
    handleSave,
  };
}