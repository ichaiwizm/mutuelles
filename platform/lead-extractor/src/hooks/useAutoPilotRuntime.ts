import { useEffect, useState } from 'react';

export type AutoPilotRuntime = {
  enabledRefresh?: boolean;
  refreshIntervalMin?: number | null;
  refreshNextAt?: string | null;
  refreshAtFixedTimeEnabled?: boolean;
  refreshAtTime?: string | null;
  refreshDailyNextAt?: string | null;
  enabledAutoSend?: boolean;
  autoSendIntervalMin?: number | null;
  autoSendNextAt?: string | null;
  busy?: boolean;
  lastRun?: { type: 'refresh' | 'send'; ok: boolean; ts: string; message?: string } | null;
};

const RUNTIME_KEY = 'autopilot_runtime_v1';

function readRuntime(): AutoPilotRuntime {
  try {
    const raw = localStorage.getItem(RUNTIME_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {} as any;
  }
}

export function useAutoPilotRuntime(pollMs: number = 2000) {
  const [runtime, setRuntime] = useState<AutoPilotRuntime>(() => readRuntime());

  useEffect(() => {
    setRuntime(readRuntime());
    const id = window.setInterval(() => {
      setRuntime(readRuntime());
    }, Math.max(1000, pollMs));
    return () => window.clearInterval(id);
  }, [pollMs]);

  return runtime;
}

