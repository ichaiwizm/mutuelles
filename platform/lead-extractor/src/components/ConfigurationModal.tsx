import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useEffect, useState } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { useSwissLifeConfig } from '@/hooks/useSwissLifeConfig';
import { ExtensionBridge } from '@/services/extension-bridge';

interface ConfigurationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConfigurationModal({ open, onOpenChange }: ConfigurationModalProps) {
  const { parallelTabs, setParallelTabs } = useSettings();
  const { config: swissLifeConfig, setConfig: setSwissLifeConfig, getNextMonthDates, isLoaded } = useSwissLifeConfig();
  const [tempParallelTabs, setTempParallelTabs] = useState<number>(parallelTabs ?? 3);
  const [swissLifeExpanded, setSwissLifeExpanded] = useState(false);
  
  const nextMonthDates = getNextMonthDates();

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

          {/* Configuration SwissLife */}
          <Card>
            <CardHeader 
              className="cursor-pointer hover:bg-muted/50 transition-colors" 
              onClick={() => setSwissLifeExpanded(!swissLifeExpanded)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Configuration SwissLife</CardTitle>
                  <CardDescription>Paramètres personnalisés pour l'automatisation SwissLife</CardDescription>
                </div>
                <ChevronDown 
                  className={`h-5 w-5 transition-transform ${swissLifeExpanded ? 'rotate-180' : ''}`} 
                />
              </div>
            </CardHeader>
            {swissLifeExpanded && (
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="swisslife-enabled">Activer les surcharges</Label>
                  <Switch
                    id="swisslife-enabled"
                    checked={swissLifeConfig.enabled}
                    onCheckedChange={(checked) => setSwissLifeConfig({ enabled: checked })}
                  />
                </div>
                
                {swissLifeConfig.enabled && (
                  <div className="space-y-4 pt-2 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="project-name">Nom du projet</Label>
                      <Select
                        value={swissLifeConfig.projectName || ''}
                        onValueChange={(value) => setSwissLifeConfig({ projectName: value as 'lead_name' | 'lead_source' })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir un format..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lead_name">Nom du lead</SelectItem>
                          <SelectItem value="lead_source">Nom du lead - Source Extension</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date-effet">Date d'effet</Label>
                      <Select
                        value={swissLifeConfig.dateEffet || ''}
                        onValueChange={(value) => setSwissLifeConfig({ dateEffet: value as 'end_next_month' | 'start_next_month' | 'middle_next_month' })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir une date..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="start_next_month">Début du mois suivant ({nextMonthDates.start})</SelectItem>
                          <SelectItem value="middle_next_month">Milieu du mois suivant ({nextMonthDates.middle})</SelectItem>
                          <SelectItem value="end_next_month">Fin du mois suivant ({nextMonthDates.end})</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hospital-comfort">Confort hospitalisation</Label>
                      <Select
                        value={swissLifeConfig.hospitalComfort || ''}
                        onValueChange={(value) => setSwissLifeConfig({ hospitalComfort: value as 'oui' | 'non' })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir une option..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="oui">Oui</SelectItem>
                          <SelectItem value="non">Non</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gammes">Gammes</Label>
                      <Select
                        value={swissLifeConfig.gammes || ''}
                        onValueChange={(value) => setSwissLifeConfig({ gammes: value as 'SwissLife Santé' })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir une gamme..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SwissLife Santé">SwissLife Santé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            )}
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
