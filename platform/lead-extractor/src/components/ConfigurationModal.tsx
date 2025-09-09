import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { ExtensionBridge } from '@/services/extension-bridge';

interface ConfigurationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConfigurationModal({ open, onOpenChange }: ConfigurationModalProps) {
  const { parallelTabs, setParallelTabs } = useSettings();
  const [tempParallelTabs, setTempParallelTabs] = useState<number>(parallelTabs ?? 3);

  useEffect(() => {
    // Sync local temp when modal opens or global value changes
    if (open) setTempParallelTabs(parallelTabs ?? 3);
  }, [open, parallelTabs]);

  const hasChanges = (tempParallelTabs ?? 3) !== (parallelTabs ?? 3);

  const handleApply = async () => {
    const sanitized = Math.max(1, Math.min(10, Math.floor(Number(tempParallelTabs) || 1)));
    setParallelTabs(sanitized);
    try {
      await ExtensionBridge.setAutomationConfig({ parallelTabs: sanitized });
    } catch (_) {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-w-md w-[95vw] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration de l'extension
          </DialogTitle>
          <DialogDescription>
            Définissez le nombre d'onglets parallèles utilisés par l'extension.
          </DialogDescription>
        </DialogHeader>

        {/* Zone scrollable pour le contenu afin d'éviter les débordements */}
        <div className="space-y-6 flex-1 overflow-y-auto pr-1">
          {/* Parallélisation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Parallélisation</CardTitle>
              <CardDescription>Nombre d'onglets parallèles ouverts pour traiter les leads.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Label htmlFor="parallelTabs" className="whitespace-nowrap">Onglets parallèles</Label>
                <Input
                  id="parallelTabs"
                  type="number"
                  min={1}
                  max={10}
                  value={tempParallelTabs}
                  onChange={(e) => setTempParallelTabs(Number(e.target.value))}
                  className="w-24"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            onClick={handleApply}
            disabled={!hasChanges}
          >
            Appliquer
          </Button>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
