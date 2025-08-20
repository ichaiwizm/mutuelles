import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, RotateCcw } from 'lucide-react';
import { ServiceConfigManager, type SwissLifeConfig, ConfigValueHelper } from '@/utils/service-config';
import { toast } from 'sonner';

interface SwissLifeConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SwissLifeConfigModal({ open, onOpenChange }: SwissLifeConfigModalProps) {
  const [config, setConfig] = useState<SwissLifeConfig>(ServiceConfigManager.getServiceConfig('swisslife'));
  const [hasChanges, setHasChanges] = useState(false);

  // Charger la configuration à l'ouverture
  useEffect(() => {
    if (open) {
      const currentConfig = ServiceConfigManager.getServiceConfig('swisslife');
      setConfig(currentConfig);
      setHasChanges(false);
    }
  }, [open]);

  // Marquer les changements
  const updateConfig = (updates: Partial<SwissLifeConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  // Sauvegarder la configuration
  const handleSave = () => {
    ServiceConfigManager.saveServiceConfig('swisslife', config);
    setHasChanges(false);
    toast.success('Configuration SwissLife sauvegardée');
    onOpenChange(false);
  };

  // Réinitialiser aux valeurs par défaut
  const handleReset = () => {
    const defaultConfig = ServiceConfigManager.getDefaultConfig('swisslife') as SwissLifeConfig;
    setConfig(defaultConfig);
    setHasChanges(true);
    toast.info('Configuration réinitialisée aux valeurs par défaut');
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader className="pb-8 border-b">
          <DialogTitle className="flex items-center gap-4 text-2xl font-bold">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
              <Settings className="h-7 w-7 text-white" />
            </div>
            <div>
              <span className="bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                Configuration SwissLife
              </span>
              <p className="text-sm font-normal text-gray-600 dark:text-gray-400 mt-1">
                Paramètres d'automatisation
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Options principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">Confort Hospitalisation</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">Indemnités journalières</p>
                  </div>
                  <Switch
                    checked={config.forceValues.hospitalComfort === 'oui'}
                    onCheckedChange={(checked) => updateConfig({
                      forceValues: {
                        ...config.forceValues,
                        hospitalComfort: checked ? 'oui' : 'non'
                      }
                    })}
                  />
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-xl p-6 border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-green-900 dark:text-green-100">Option Madelin</h3>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">Déduction fiscale TNS</p>
                  </div>
                  <Switch
                    checked={config.options.madelin === 'oui'}
                    onCheckedChange={(checked) => updateConfig({
                      options: {
                        ...config.options,
                        madelin: checked ? 'oui' : 'non'
                      }
                    })}
                  />
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 rounded-xl p-6 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-orange-900 dark:text-orange-100">Résiliation</h3>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">Contrat actuel</p>
                  </div>
                  <Switch
                    checked={config.options.resiliation === 'oui'}
                    onCheckedChange={(checked) => updateConfig({
                      options: {
                        ...config.options,
                        resiliation: checked ? 'oui' : 'non'
                      }
                    })}
                  />
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-purple-900 dark:text-purple-100">Reprise d'ancienneté</h3>
                    <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">Conservation historique</p>
                  </div>
                  <Switch
                    checked={config.options.reprise === 'oui'}
                    onCheckedChange={(checked) => updateConfig({
                      options: {
                        ...config.options,
                        reprise: checked ? 'oui' : 'non'
                      }
                    })}
                  />
                </div>
              </div>
            </div>

            {/* Section gamme et navigation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Gamme d'assurance</h3>
                <Select
                  value={config.forceValues.gammes || 'SwissLife Santé'}
                  onValueChange={(value) => updateConfig({
                    forceValues: {
                      ...config.forceValues,
                      gammes: value
                    }
                  })}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SwissLife Santé">SwissLife Santé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Clic sur suivant</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">Navigation automatique</p>
                  </div>
                  <Switch
                    checked={config.navigation.autoNext}
                    onCheckedChange={(checked) => updateConfig({
                      navigation: {
                        ...config.navigation,
                        autoNext: checked
                      }
                    })}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        <DialogFooter className="pt-6 border-t">
          <div className="flex justify-between w-full items-center">
            <Button
              variant="outline"
              onClick={handleReset}
              className="h-12 px-6"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Réinitialiser
            </Button>
            
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-12 px-8"
              >
                Annuler
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges}
                className="h-12 px-8 bg-blue-600 hover:bg-blue-700"
              >
                {hasChanges ? '💾 Sauvegarder' : '✓ À jour'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}