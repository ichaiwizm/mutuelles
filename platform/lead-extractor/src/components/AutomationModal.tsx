import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Workflow } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAutoPilotSettings, type AutoPilotSettings } from '@/hooks/useAutoPilotSettings';
import { useAutoPilotRuntime } from '@/hooks/useAutoPilotRuntime';
import { appendAutoLog, getAutoLog, clearAutoLog } from '@/utils/automation-log';
import { toast } from 'sonner';
import { ExtensionBridge } from '@/services/extension-bridge';
import type { Lead } from '@/types/lead';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';

interface AutomationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRunRefreshNow?: () => void;
  getLeadsForAutoSend?: () => Lead[];
}

export function AutomationModal({ open, onOpenChange, onRunRefreshNow, getLeadsForAutoSend }: AutomationModalProps) {
  const { settings: apSettings, save: saveAP, reset: resetAP } = useAutoPilotSettings();
  const [localAP, setLocalAP] = useState<AutoPilotSettings>(apSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const runtime = useAutoPilotRuntime(2000);
  const [log, setLog] = useState(() => getAutoLog());

  useEffect(() => {
    setLocalAP(apSettings);
    setHasChanges(false);
  }, [apSettings]);

  useEffect(() => {
    const changed = JSON.stringify(localAP) !== JSON.stringify(apSettings);
    setHasChanges(changed);
  }, [localAP, apSettings]);

  useEffect(() => {
    if (open) setLog(getAutoLog());
  }, [open]);

  const handleSave = async () => {
    await saveAP(localAP);
    onOpenChange(false);
  };

  const handleReset = async () => {
    await resetAP();
    onOpenChange(false);
  };

  const handleCancel = () => {
    setLocalAP(apSettings);
    setHasChanges(false);
    onOpenChange(false);
  };

  const computeNextDailyRunText = () => {
    try {
      if (!localAP.refreshAtFixedTimeEnabled) return 'Désactivé';
      const time = localAP.refreshAtTime || '08:00';
      const m = time.match(/^(\d{1,2}):(\d{2})$/);
      const h = Math.min(23, Math.max(0, parseInt(m?.[1] || '8', 10)));
      const mi = Math.min(59, Math.max(0, parseInt(m?.[2] || '0', 10)));
      const now = new Date();
      const target = new Date();
      target.setHours(h, mi, 0, 0);
      if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
      const dateStr = target.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' });
      const timeStr = target.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      return `${dateStr} à ${timeStr}`;
    } catch {
      return '—';
    }
  };

  const fmt = (iso?: string | null) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      const ds = d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' });
      const ts = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      return `${ds} ${ts}`;
    } catch {
      return '—';
    }
  };

  const handleRunNow = async () => {
    try {
      if (!onRunRefreshNow) return;
      onRunRefreshNow();
      appendAutoLog({ ts: new Date().toISOString(), type: 'refresh', ok: true, message: 'Lancement manuel auto‑refresh' });
      toast.success('Extraction lancée');
    } catch (e: any) {
      toast.error(e?.message || 'Erreur lancement');
    }
  };

  const handleSendNow = async () => {
    try {
      if (!getLeadsForAutoSend) return;
      const all = getLeadsForAutoSend();
      const target = new Set(localAP.autoSendStatuses);
      const eligible = all.filter(l => target.has(((l as any).processingStatus?.status || 'pending') as any)).slice(0, Math.max(1, Math.min(50, localAP.autoSendMaxPerCycle)));
      if (eligible.length === 0) {
        toast.info('Aucun lead éligible');
        return;
      }
      const ok = await ExtensionBridge.sendLeadsToExtension(eligible as any);
      appendAutoLog({ ts: new Date().toISOString(), type: 'send', ok: ok.success, message: ok.success ? `Envoi manuel de ${eligible.length} lead(s)` : (ok.error || 'Erreur envoi manuel') });
      if (ok.success) toast.success(`Envoi de ${eligible.length} leads`); else toast.error(ok.error || 'Erreur envoi');
    } catch (e: any) {
      appendAutoLog({ ts: new Date().toISOString(), type: 'send', ok: false, message: e?.message || 'Erreur envoi manuel' });
      toast.error(e?.message || 'Erreur envoi');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-w-md w-[95vw] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            Automatisation (Front‑only)
          </DialogTitle>
          <DialogDescription>
            Planifiez l'extraction automatique et l'envoi périodique vers l'extension.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 flex-1 overflow-y-auto pr-1">
          {/* Activation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activation</CardTitle>
              <CardDescription>Activez/désactivez l'automatisation globale.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Activer l'automatisation</Label>
                </div>
                <Switch checked={localAP.automationEnabled !== false} onCheckedChange={(v) => setLocalAP({ ...localAP, automationEnabled: !!v })} />
              </div>
            </CardContent>
          </Card>

          {/* Mode */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mode</CardTitle>
              <CardDescription>Choisissez un mode simple ou avancé.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={localAP.automationMode || 'basic'} onValueChange={(v) => setLocalAP({ ...localAP, automationMode: v as any })}>
                <TabsList>
                  <TabsTrigger value="basic">Simple</TabsTrigger>
                  <TabsTrigger value="advanced">Avancé</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          {/* Affichage */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Affichage</CardTitle>
              <CardDescription>Contrôlez l'affichage de la barre d'état.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Afficher la barre sur le Dashboard</Label>
                </div>
                <Switch checked={localAP.showStatusBar !== false} onCheckedChange={(v) => setLocalAP({ ...localAP, showStatusBar: !!v })} />
              </div>
            </CardContent>
          </Card>

          {/* SIMPLE MODE */}
          { (localAP.automationMode || 'basic') === 'basic' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Planification</CardTitle>
                  <CardDescription>Extraction planifiée; envoi auto {Math.round((localAP.postExtractAutoSendDelayMs ?? 120000)/1000)}s après.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" checked={(localAP.basicModeType || 'interval') === 'interval'} onChange={() => setLocalAP({ ...localAP, basicModeType: 'interval' })} />
                      Intervalle (minutes)
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" checked={(localAP.basicModeType || 'interval') === 'daily'} onChange={() => setLocalAP({ ...localAP, basicModeType: 'daily' })} />
                      Heure fixe quotidienne
                    </label>
                  </div>

                  { (localAP.basicModeType || 'interval') === 'interval' ? (
                    <div className="flex items-center gap-3">
                      <Label htmlFor="basicInterval" className="w-56">Intervalle (minutes)</Label>
                      <Input id="basicInterval" type="number" min={10} max={180} value={localAP.basicIntervalMin ?? 60} onChange={(e) => setLocalAP({ ...localAP, basicIntervalMin: Math.min(180, Math.max(10, parseInt(e.target.value) || 60)) })} className="w-32" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Label htmlFor="basicTime" className="w-56">Heure programmée</Label>
                      <Input id="basicTime" type="time" value={localAP.basicDailyTime || '08:00'} onChange={(e) => setLocalAP({ ...localAP, basicDailyTime: e.target.value || '08:00' })} className="w-36" />
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Envoyer après extraction</Label>
                        <p className="text-xs text-muted-foreground">Envoi automatique des leads qualifiés après extraction.</p>
                      </div>
                      <Switch checked={!!localAP.postExtractAutoSendEnabled} onCheckedChange={(v) => setLocalAP({ ...localAP, postExtractAutoSendEnabled: !!v })} />
                    </div>
                    <div className="flex items-center gap-3">
                      <Label htmlFor="postExtractDelay" className="w-56">Délai (secondes)</Label>
                      <Input id="postExtractDelay" type="number" min={10} max={1800} value={Math.round((localAP.postExtractAutoSendDelayMs ?? 120000)/1000)} onChange={(e) => setLocalAP({ ...localAP, postExtractAutoSendDelayMs: Math.min(1800, Math.max(10, parseInt(e.target.value) || 120))*1000 })} className="w-32" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
          {/* ADVANCED MODE */}
          {(localAP.automationMode || 'basic') === 'advanced' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Auto‑refresh périodique</CardTitle>
              <CardDescription>Relance automatique de l'extraction (merge) selon un intervalle.</CardDescription>
            </CardHeader>
          <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Activer</Label>
                </div>
                <Switch
                  checked={!!localAP.enabledRefresh}
                  onCheckedChange={(v) => setLocalAP({ ...localAP, enabledRefresh: !!v })}
                />
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="refreshIntervalMin" className="w-56">Intervalle (minutes)</Label>
                <Input
                  id="refreshIntervalMin"
                  type="number"
                  min={10}
                  max={180}
                  value={localAP.refreshIntervalMin}
                  onChange={(e) => setLocalAP({
                    ...localAP,
                    refreshIntervalMin: Math.min(180, Math.max(10, parseInt(e.target.value) || 10))
                  })}
                  className="w-32"
                />
              </div>
              <div className="flex items-center gap-3">
                <Label className="w-56">Prochain run estimé</Label>
                <div className="text-sm text-slate-700">{fmt(runtime.refreshNextAt)}</div>
                <Button size="sm" variant="outline" onClick={handleRunNow}>Lancer maintenant</Button>
              </div>
            </CardContent>
          </Card>
          )}

          {(localAP.automationMode || 'basic') === 'advanced' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Planification quotidienne</CardTitle>
              <CardDescription>Exécuter l'extraction chaque jour à l'heure indiquée.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Activer</Label>
                </div>
                <Switch
                  checked={!!localAP.refreshAtFixedTimeEnabled}
                  onCheckedChange={(v) => setLocalAP({ ...localAP, refreshAtFixedTimeEnabled: !!v })}
                />
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="refreshAtTime" className="w-56">Heure programmée</Label>
                <Input
                  id="refreshAtTime"
                  type="time"
                  value={localAP.refreshAtTime || '08:00'}
                  onChange={(e) => setLocalAP({ ...localAP, refreshAtTime: e.target.value || '08:00' })}
                  className="w-36"
                />
                <p className="text-xs text-muted-foreground">Fuseau horaire local.</p>
              </div>
              <p className="text-xs text-slate-600">Prochain run: <span className="font-medium">{fmt(runtime.refreshDailyNextAt)}</span></p>
            </CardContent>
          </Card>
          )}

          {(localAP.automationMode || 'basic') === 'advanced' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Envoi automatique vers l'extension</CardTitle>
              <CardDescription>Envoi périodique des leads non traités.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Activer</Label>
                </div>
                <Switch
                  checked={!!localAP.enabledAutoSend}
                  onCheckedChange={(v) => setLocalAP({ ...localAP, enabledAutoSend: !!v })}
                />
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="autoSendIntervalMin" className="w-56">Intervalle (minutes)</Label>
                <Input
                  id="autoSendIntervalMin"
                  type="number"
                  min={10}
                  max={180}
                  value={localAP.autoSendIntervalMin}
                  onChange={(e) => setLocalAP({
                    ...localAP,
                    autoSendIntervalMin: Math.min(180, Math.max(10, parseInt(e.target.value) || 10))
                  })}
                  className="w-32"
                />
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="status-pending"
                    checked={localAP.autoSendStatuses.includes('pending')}
                    onCheckedChange={(checked) => {
                      const set = new Set(localAP.autoSendStatuses);
                      if (checked) set.add('pending'); else set.delete('pending');
                      setLocalAP({ ...localAP, autoSendStatuses: Array.from(set) as any });
                    }}
                  />
                  <Label htmlFor="status-pending">Inclure: En attente</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="status-error"
                    checked={localAP.autoSendStatuses.includes('error')}
                    onCheckedChange={(checked) => {
                      const set = new Set(localAP.autoSendStatuses);
                      if (checked) set.add('error'); else set.delete('error');
                      setLocalAP({ ...localAP, autoSendStatuses: Array.from(set) as any });
                    }}
                  />
                  <Label htmlFor="status-error">Inclure: Erreur</Label>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Label htmlFor="autoSendMaxPerCycle" className="w-56">Max par cycle</Label>
                <Input
                  id="autoSendMaxPerCycle"
                  type="number"
                  min={1}
                  max={50}
                  value={localAP.autoSendMaxPerCycle}
                  onChange={(e) => setLocalAP({
                    ...localAP,
                    autoSendMaxPerCycle: Math.min(50, Math.max(1, parseInt(e.target.value) || 1))
                  })}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">Nombre maximum de leads envoyés par cycle.</p>
              </div>
              <div className="flex items-center gap-3">
                <Label className="w-56">Prochain envoi estimé</Label>
                <div className="text-sm text-slate-700">{fmt(runtime.autoSendNextAt)}</div>
                <Button size="sm" variant="outline" onClick={handleSendNow}>Envoyer maintenant</Button>
              </div>

            </CardContent>
          </Card>
          )}

          {/* Historique (dans les détails) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historique</CardTitle>
              <CardDescription>Dernières opérations d'automatisation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {log.length === 0 && <div className="text-sm text-muted-foreground">Aucun événement</div>}
              {log.slice(0, 20).map((e, idx) => (
                <div key={idx} className="text-sm flex items-center justify-between gap-4">
                  <div className="truncate">[{e.type}] {e.message || ''}</div>
                  <div className="text-xs text-slate-500">{fmt(e.ts)}</div>
                </div>
              ))}
              {log.length > 0 && (
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => { clearAutoLog(); setLog([]); }}>Vider l'historique</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Separator />

        <DialogFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleReset}
          >
            Réinitialiser
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges}
            >
              Sauvegarder
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
