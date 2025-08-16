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
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

interface ExportResult {
  successful: number;
  failed: number;
  warnings: string[];
  service: string;
}

interface ExportSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: ExportResult | null;
}

export function ExportSuccessModal({
  open,
  onOpenChange,
  result,
}: ExportSuccessModalProps) {
  if (!result) return null;

  const hasWarnings = result.warnings.length > 0;
  const hasFailed = result.failed > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Export terminé
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Résumé principal */}
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-green-800">
                  Export vers {result.service} réussi !
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  {result.successful} leads ont été exportés avec succès
                </p>
              </div>
              <Badge className="bg-green-600 text-white">
                {result.successful} réussis
              </Badge>
            </div>
          </div>

          {/* Statistiques détaillées */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium">Exportés</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {result.successful}
              </div>
              <div className="text-sm text-gray-600">leads</div>
            </div>

            {hasFailed && (
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="font-medium">Échoués</span>
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {result.failed}
                </div>
                <div className="text-sm text-gray-600">leads</div>
              </div>
            )}
          </div>

          {/* Avertissements */}
          {hasWarnings && (
            <div className="space-y-3">
              <Separator />
              
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <h3 className="font-semibold text-yellow-800">
                  Avertissements ({result.warnings.length})
                </h3>
              </div>

              <ScrollArea className="h-32 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="p-3 space-y-2">
                  {result.warnings.map((warning, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm text-yellow-800">{warning}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Information supplémentaire */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Où trouver vos leads :</p>
                <p>
                  Les leads exportés ont été sauvegardés dans le localStorage de votre navigateur.
                  Ils sont maintenant disponibles pour votre outil {result.service}.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={() => onOpenChange(false)}
            className="bg-green-600 hover:bg-green-700"
          >
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}