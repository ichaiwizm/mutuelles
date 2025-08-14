import type { Lead } from '@/types/lead';

const STORAGE_KEYS = {
  LEADS: 'leads_v1',
  SETTINGS: 'settings_v1',
  LAST_SYNC: 'last_sync_v1',
  RULES_VERSION: 'rules_version'
};

export interface Settings {
  days: number;
  sources: {
    gmail: boolean;
  };
}

export interface LastSync {
  gmail?: string;
}

export class StorageManager {
  static getLeads(): Lead[] {
    const data = localStorage.getItem(STORAGE_KEYS.LEADS);
    return data ? JSON.parse(data) : [];
  }

  static saveLeads(leads: Lead[]): void {
    localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(leads));
  }

  static getSettings(): Settings {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : {
      days: 30,
      sources: {
        gmail: true
      }
    };
  }

  static saveSettings(settings: Settings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  static getLastSync(): LastSync {
    const data = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    return data ? JSON.parse(data) : {};
  }

  static updateLastSync(source: 'gmail'): void {
    const lastSync = this.getLastSync();
    lastSync[source] = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, JSON.stringify(lastSync));
  }

  static getRulesVersion(): number {
    const version = localStorage.getItem(STORAGE_KEYS.RULES_VERSION);
    return version ? parseInt(version) : 1;
  }

  static incrementRulesVersion(): void {
    const currentVersion = this.getRulesVersion();
    localStorage.setItem(STORAGE_KEYS.RULES_VERSION, String(currentVersion + 1));
  }

  static clearAll(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
}