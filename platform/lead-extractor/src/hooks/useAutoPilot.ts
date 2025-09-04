import { useEffect, useRef } from 'react';
import type { AutoPilotSettings } from './useAutoPilotSettings';
import { appendAutoLog } from '@/utils/automation-log';
import { ExtensionBridge } from '@/services/extension-bridge';
import type { Lead } from '@/types/lead';

type ExtractFn = () => void; // wrapper qui fait extractWithSSE(..., replaceAll=false)

export function useAutoPilot(
  settings: AutoPilotSettings,
  extractNew: ExtractFn,
  getLeadsForAutoSend: () => Lead[],
) {
  const refreshTimer = useRef<number | null>(null);
  const scheduledRefreshTimer = useRef<number | null>(null);
  const sendTimer = useRef<number | null>(null);
  const busyRef = useRef(false);
  const lastTriedRef = useRef<Record<string, number>>({}); // leadId -> last try ts

  // Runtime state persistence for UI visibility
  const RUNTIME_KEY = 'autopilot_runtime_v1';
  const readRuntime = () => {
    try { return JSON.parse(localStorage.getItem(RUNTIME_KEY) || '{}'); } catch { return {}; }
  };
  const writeRuntime = (patch: any) => {
    try {
      const prev = readRuntime();
      const next = { ...prev, ...patch };
      localStorage.setItem(RUNTIME_KEY, JSON.stringify(next));
    } catch (_) {}
  };

  // Clear timers helper
  const clearTimers = () => {
    if (refreshTimer.current) window.clearInterval(refreshTimer.current);
    if (scheduledRefreshTimer.current) window.clearTimeout(scheduledRefreshTimer.current);
    if (sendTimer.current) window.clearInterval(sendTimer.current);
    refreshTimer.current = null;
    scheduledRefreshTimer.current = null;
    sendTimer.current = null;
    writeRuntime({ refreshNextAt: null, refreshDailyNextAt: null, autoSendNextAt: null, busy: false });
  };

  useEffect(() => {
    clearTimers();

    // Construire les réglages effectifs selon le mode (basic vs advanced)
    if (settings.automationEnabled === false) {
      writeRuntime({ enabled: false, busy: false, refreshNextAt: null, refreshDailyNextAt: null, autoSendNextAt: null });
      return clearTimers;
    }
    const mode = settings.automationMode || 'basic';
    const eff = { ...settings } as any;
    if (mode === 'basic') {
      const basicType = settings.basicModeType || 'interval';
      eff.enabledRefresh = basicType === 'interval';
      eff.refreshIntervalMin = settings.basicIntervalMin || 60;
      eff.refreshAtFixedTimeEnabled = basicType === 'daily';
      eff.refreshAtTime = settings.basicDailyTime || '08:00';
      // En mode basic, on s'appuie sur l'envoi post-extraction par défaut
      eff.enabledAutoSend = false;
    }

    // Seed runtime state for UI
    writeRuntime({
      enabled: true,
      enabledRefresh: !!eff.enabledRefresh,
      refreshIntervalMin: eff.refreshIntervalMin || null,
      refreshAtFixedTimeEnabled: !!eff.refreshAtFixedTimeEnabled,
      refreshAtTime: eff.refreshAtTime || null,
      enabledAutoSend: !!eff.enabledAutoSend,
      autoSendIntervalMin: eff.autoSendIntervalMin || null,
    });

    // Auto-refresh (merge)
    if (eff.enabledRefresh && eff.refreshIntervalMin >= 10) {
      writeRuntime({ refreshNextAt: new Date(Date.now() + eff.refreshIntervalMin * 60 * 1000).toISOString() });
      refreshTimer.current = window.setInterval(async () => {
        if (busyRef.current) return;
        try {
          busyRef.current = true;
          writeRuntime({ busy: true });
          extractNew();
          appendAutoLog({ ts: new Date().toISOString(), type: 'refresh', ok: true, message: `Auto-refresh exécuté` });
        } catch (e: any) {
          appendAutoLog({ ts: new Date().toISOString(), type: 'refresh', ok: false, message: e?.message || 'Erreur auto-refresh' });
        } finally {
          busyRef.current = false;
          writeRuntime({ busy: false, lastRun: { type: 'refresh', ok: true, ts: new Date().toISOString() }, refreshNextAt: new Date(Date.now() + eff.refreshIntervalMin * 60 * 1000).toISOString() });
        }
      }, eff.refreshIntervalMin * 60 * 1000) as unknown as number;
    }

    // Auto-refresh à heure fixe quotidienne
    if (eff.refreshAtFixedTimeEnabled) {
      // Sécuriser le parse HH:mm
      const parseTime = (s?: string): { h: number; m: number } | null => {
        if (!s || typeof s !== 'string') return null;
        const m = s.match(/^(\d{1,2}):(\d{2})$/);
        if (!m) return null;
        const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
        const mi = Math.min(59, Math.max(0, parseInt(m[2], 10)));
        return { h, m: mi };
      };
      const t = parseTime(eff.refreshAtTime) || { h: 8, m: 0 };
      const scheduleNext = () => {
        const now = new Date();
        const target = new Date();
        target.setHours(t.h, t.m, 0, 0);
        if (target.getTime() <= now.getTime()) {
          target.setDate(target.getDate() + 1);
        }
        const delay = target.getTime() - now.getTime();
        writeRuntime({ refreshDailyNextAt: target.toISOString() });
        scheduledRefreshTimer.current = window.setTimeout(async () => {
          if (!busyRef.current) {
            try {
              busyRef.current = true;
              writeRuntime({ busy: true });
              extractNew();
              appendAutoLog({ ts: new Date().toISOString(), type: 'refresh', ok: true, message: `Auto-refresh quotidien ${t.h.toString().padStart(2, '0')}:${t.m.toString().padStart(2, '0')}` });
            } catch (e: any) {
              appendAutoLog({ ts: new Date().toISOString(), type: 'refresh', ok: false, message: e?.message || 'Erreur auto-refresh quotidien' });
            } finally {
              busyRef.current = false;
              writeRuntime({ busy: false, lastRun: { type: 'refresh', ok: true, ts: new Date().toISOString() } });
            }
          }
          // Reprogrammer le suivant (J+1)
          scheduleNext();
        }, delay) as unknown as number;
      };
      scheduleNext();
    }

    // Auto-send pending/error
    if (eff.enabledAutoSend && eff.autoSendIntervalMin >= 10) {
      writeRuntime({ autoSendNextAt: new Date(Date.now() + eff.autoSendIntervalMin * 60 * 1000).toISOString() });
      sendTimer.current = window.setInterval(async () => {
        if (busyRef.current) return;
        try {
          const installed = await ExtensionBridge.checkExtensionInstalled();
          if (!installed) return; // extension absente

          const candidates = getLeadsForAutoSend();
          const targetStatuses = new Set(settings.autoSendStatuses);
          const now = Date.now();
          const coolDownMs = 30 * 60 * 1000; // 30 min cooldown par lead

          const eligible = candidates.filter(l => {
            const st = (l as any).processingStatus?.status as string | undefined;
            if (!st || !targetStatuses.has(st as any)) return false;
            const last = lastTriedRef.current[l.id] || 0;
            return (now - last) > coolDownMs;
          }).slice(0, Math.max(1, Math.min(50, settings.autoSendMaxPerCycle)));

          if (eligible.length === 0) return;

          busyRef.current = true;
          writeRuntime({ busy: true });
          const resp = await ExtensionBridge.sendLeadsToExtension(eligible as any);
          eligible.forEach(l => { lastTriedRef.current[l.id] = Date.now(); });
          appendAutoLog({ ts: new Date().toISOString(), type: 'send', ok: resp.success, message: resp.success ? `Envoi auto de ${eligible.length} lead(s)` : (resp.error || 'Erreur envoi auto') });
        } catch (e: any) {
          appendAutoLog({ ts: new Date().toISOString(), type: 'send', ok: false, message: e?.message || 'Erreur envoi auto' });
        } finally {
          busyRef.current = false;
          writeRuntime({ busy: false, lastRun: { type: 'send', ok: true, ts: new Date().toISOString() }, autoSendNextAt: new Date(Date.now() + eff.autoSendIntervalMin * 60 * 1000).toISOString() });
        }
      }, eff.autoSendIntervalMin * 60 * 1000) as unknown as number;
    }

    return clearTimers;
  }, [
    settings.automationMode,
    settings.basicModeType,
    settings.basicIntervalMin,
    settings.basicDailyTime,
    settings.enabledRefresh,
    settings.refreshIntervalMin,
    settings.enabledAutoSend,
    settings.autoSendIntervalMin,
    settings.autoSendStatuses.join(','),
    settings.autoSendMaxPerCycle,
    settings.refreshAtFixedTimeEnabled,
    settings.refreshAtTime
  ]);
}
