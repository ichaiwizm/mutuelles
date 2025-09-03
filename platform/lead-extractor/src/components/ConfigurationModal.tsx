import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Settings } from 'lucide-react';
import { useAutomationConfig, type AutomationConfig } from '@/hooks/useAutomationConfig';

interface ConfigurationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConfigurationModal({ open, onOpenChange }: ConfigurationModalProps) {
  const { config, isSaving, saveConfig, resetToDefaults } = useAutomationConfig();
  const [localConfig, setLocalConfig] = useState<AutomationConfig>(config);
  const [hasChanges, setHasChanges] = useState(false);

  // Synchroniser avec la config globale quand elle change
  useEffect(() => {
    setLocalConfig(config);
    setHasChanges(false);
  }, [config]);

  // Détecter les changements
  useEffect(() => {
    const changed = JSON.stringify(localConfig) !== JSON.stringify(config);
    setHasChanges(changed);
  }, [localConfig, config]);

  const handleSave = async () => {
    try {
      await saveConfig(localConfig);
      onOpenChange(false);
    } catch (error) {
      // L'erreur est déjà affichée par useAutomationConfig
    }
  };

  const handleReset = async () => {
    try {
      await resetToDefaults();
      onOpenChange(false);
    } catch (error) {
      // L'erreur est déjà affichée par useAutomationConfig
    }
  };

  const handleCancel = () => {
    setLocalConfig(config);
    setHasChanges(false);
    onOpenChange(false);
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-w-md w-[95vw] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration de l'automatisation
          </DialogTitle>
          <DialogDescription>
            Configurez les paramètres de traitement automatique des leads SwissLife.
          </DialogDescription>
        </DialogHeader>

        {/* Zone scrollable pour le contenu afin d'éviter les débordements */}
        <div className="space-y-6 flex-1 overflow-y-auto pr-1">
          {/* Configuration principale */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Paramètres de tentatives</CardTitle>
              <CardDescription>
                Contrôlez combien de fois le système essaiera de traiter un lead en cas d'échec.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="maxRetryAttempts">Nombre de tentatives par lead</Label>
                <Input
                  id="maxRetryAttempts"
                  type="number"
                  min="0"
                  max="10"
                  value={localConfig.maxRetryAttempts}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    maxRetryAttempts: parseInt(e.target.value) || 0
                  })}
                  className="w-32"
                />
                <p className="text-sm text-muted-foreground">
                  0 = aucun retry, 2 = 3 tentatives au total (défaut)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="retryDelay">Délai entre les tentatives (ms)</Label>
                <Input
                  id="retryDelay"
                  type="number"
                  min="500"
                  max="30000"
                  step="500"
                  value={localConfig.retryDelay}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    retryDelay: parseInt(e.target.value) || 2000
                  })}
                  className="w-32"
                />
                <p className="text-sm text-muted-foreground">
                  Attente avant de réessayer (500ms à 30s)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeoutRetryDelay">Délai après timeout (ms)</Label>
                <Input
                  id="timeoutRetryDelay"
                  type="number"
                  min="1000"
                  max="60000"
                  step="500"
                  value={localConfig.timeoutRetryDelay}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    timeoutRetryDelay: parseInt(e.target.value) || 3000
                  })}
                  className="w-32"
                />
                <p className="text-sm text-muted-foreground">
                  Attente supplémentaire après un timeout
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Parallélisme */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Parallélisme</CardTitle>
              <CardDescription>
                Définissez le nombre d'onglets SwissLife ouverts en parallèle (1 à 10).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="parallelTabs">Onglets parallèles</Label>
              <Input
                id="parallelTabs"
                type="number"
                min="1"
                max="10"
                value={localConfig.parallelTabs}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  parallelTabs: Math.min(10, Math.max(1, parseInt(e.target.value) || 1))
                })}
                className="w-32"
              />
              <p className="text-sm text-muted-foreground">
                Maximum 10 onglets simultanés.
              </p>
            </CardContent>
          </Card>

          {/* Avertissement changements non sauvegardés */}
          {hasChanges && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm font-medium">Changements non sauvegardés</p>
                </div>
                <p className="text-sm text-amber-700 mt-1">
                  N'oubliez pas de sauvegarder vos modifications.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <Separator />

        <DialogFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isSaving}
            className="text-red-600 hover:text-red-700"
          >
            Réinitialiser
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
