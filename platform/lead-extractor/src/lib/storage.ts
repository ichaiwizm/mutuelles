import type { Lead } from '@/types/lead';
import type { AutomationConfig } from '@/hooks/useAutomationConfig';

const STORAGE_KEYS = {
  LEADS: 'leads_v1',
  SETTINGS: 'settings_v1',
  LAST_SYNC: 'last_sync_v1',
  RULES_VERSION: 'rules_version',
  AUTOMATION_CONFIG: 'automation_config_v1'
};

export interface Settings {
  days: number;
  sources: {
    gmail: boolean;
  };
  ui: {
    pageSize: number;
    currentPage: number;
    activeTab: 'leads' | 'all';
    globalFilter: string;
  };
  dateRange?: {
    from?: string;
    to?: string;
  } | null;
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
      days: 7,
      sources: {
        gmail: true
      },
      ui: {
        pageSize: 10,
        currentPage: 0,
        activeTab: 'leads',
        globalFilter: ''
      },
      dateRange: null
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

  static getAutomationConfig(): AutomationConfig | null {
    const data = localStorage.getItem(STORAGE_KEYS.AUTOMATION_CONFIG);
    return data ? JSON.parse(data) : null;
  }

  static saveAutomationConfig(config: AutomationConfig): void {
    localStorage.setItem(STORAGE_KEYS.AUTOMATION_CONFIG, JSON.stringify(config));
  }

  static clearAll(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
}