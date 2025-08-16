import { Button } from '@/components/ui/button';
import { Save, ArrowRight, Loader2 } from 'lucide-react';

interface SaveControlsProps {
  isSaved: boolean;
  isSaving: boolean;
  showNextButton: boolean;
  totalConverted: number;
  onSave: () => void;
}

export function SaveControls({
  isSaved,
  isSaving,
  showNextButton,
  totalConverted,
  onSave,
}: SaveControlsProps) {
  return (
    <div className="flex gap-2">
      {!isSaved && totalConverted > 0 && (
        <Button
          onClick={onSave}
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
  );
}