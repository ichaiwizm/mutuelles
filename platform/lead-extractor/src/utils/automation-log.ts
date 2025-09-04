export type AutoLogEntry = {
  ts: string; // ISO timestamp
  type: 'refresh' | 'send';
  ok: boolean;
  message?: string;
  details?: any;
};

const LOG_KEY = 'autopilot_log_v1';
const MAX_ENTRIES = 200;

export function appendAutoLog(entry: AutoLogEntry) {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    const arr: AutoLogEntry[] = raw ? JSON.parse(raw) : [];
    arr.unshift(entry);
    while (arr.length > MAX_ENTRIES) arr.pop();
    localStorage.setItem(LOG_KEY, JSON.stringify(arr));
  } catch (_) {}
}

export function getAutoLog(): AutoLogEntry[] {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

export function clearAutoLog() {
  try { localStorage.removeItem(LOG_KEY); } catch (_) {}
}

