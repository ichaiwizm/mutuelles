import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';
import { ExtensionBridge } from '@/services/extension-bridge';
import { toast } from 'sonner';

interface ConfigurationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConfigurationModal({ open, onOpenChange }: ConfigurationModalProps) {
  const handleTestExtension = async () => {
    try {
      const installed = await ExtensionBridge.checkExtensionInstalled();
      if (!installed) {
        toast.error('Extension non détectée', { description: "Installez et activez l'extension." });
        return;
      }
      const ok = await ExtensionBridge.ping();
      if (ok) {
        toast.success('Extension connectée', { description: 'Communication OK avec le service worker.' });
      } else {
        toast.error('Extension présente mais ne répond pas');
      }
    } catch (e) {
      toast.error('Test extension échoué', { description: e instanceof Error ? e.message : String(e) });
    }
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
            Testez la connexion avec l'extension SwissLife.
          </DialogDescription>
        </DialogHeader>

        {/* Zone scrollable pour le contenu afin d'éviter les débordements */}
        <div className="space-y-6 flex-1 overflow-y-auto pr-1">
          {/* Extension */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Extension</CardTitle>
              <CardDescription>Vérifiez la connexion de l'extension et son état.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleTestExtension}
                className="w-full"
                variant="outline"
              >
                Tester l'extension
              </Button>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="gap-2">
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