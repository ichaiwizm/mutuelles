import { useEffect, useState } from 'react';

export type AutoPilotSettings = {
  automationEnabled?: boolean; // master switch
  showStatusBar?: boolean; // afficher la barre d'état sur le Dashboard
  enabledRefresh: boolean;
  refreshIntervalMin: number; // 10–180
  // Nouvelle planification quotidienne
  refreshAtFixedTimeEnabled?: boolean; // activer l'heure fixe quotidienne
  refreshAtTime?: string; // format HH:mm (ex: "08:00")
  enabledAutoSend: boolean;
  autoSendIntervalMin: number; // 10–180
  autoSendStatuses: Array<'pending' | 'error'>;
  autoSendMaxPerCycle: number; // 1–50
  // Envoi après extraction
  postExtractAutoSendEnabled?: boolean; // envoyer automatiquement après la fin de l'extraction
  postExtractAutoSendDelayMs?: number; // délai en ms (défaut 2 min)
  // Mode global
  automationMode?: 'basic' | 'advanced';
  basicModeType?: 'interval' | 'daily';
  basicIntervalMin?: number; // 10–180
  basicDailyTime?: string; // HH:mm
};

const STORAGE_KEY = 'autopilot_settings_v1';

const DEFAULTS: AutoPilotSettings = {
  automationEnabled: true,
  showStatusBar: true,
  enabledRefresh: false,
  refreshIntervalMin: 60,
  refreshAtFixedTimeEnabled: false,
  refreshAtTime: '08:00',
  enabledAutoSend: false,
  autoSendIntervalMin: 60,
  autoSendStatuses: ['pending', 'error'],
  autoSendMaxPerCycle: 10,
  postExtractAutoSendEnabled: true,
  postExtractAutoSendDelayMs: 120000,
  automationMode: 'basic',
  basicModeType: 'interval',
  basicIntervalMin: 60,
  basicDailyTime: '08:00',
};

export function useAutoPilotSettings() {
  const [settings, setSettings] = useState<AutoPilotSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setSettings({ ...DEFAULTS, ...parsed });
      }
    } catch (_) {}
    setLoaded(true);
  }, []);

  const save = (next: Partial<AutoPilotSettings>) => {
    setSettings(prev => {
      const merged = { ...prev, ...next };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch (_) {}
      return merged;
    });
  };

  const reset = () => {
    setSettings(DEFAULTS);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULTS)); } catch (_) {}
  };

  return { settings, save, reset, loaded };
}
