const SWISSLIFE_STORAGE_KEY = 'swisslife_converted_leads';
const SWISSLIFE_METADATA_KEY = 'swisslife_conversion_metadata';

/**
 * Gestionnaire du localStorage pour les leads SwissLife formatés
 */
export class SwissLifeStorageManager {
  static saveLeads(leads: any[]): void {
    const storageData = {
      timestamp: new Date().toISOString(),
      count: leads.length,
      leads: leads
    };
    localStorage.setItem(SWISSLIFE_STORAGE_KEY, JSON.stringify(storageData));
  }
  
  static getLeads(): any[] {
    const stored = localStorage.getItem(SWISSLIFE_STORAGE_KEY);
    if (!stored) return [];
    
    try {
      const data = JSON.parse(stored);
      return Array.isArray(data.leads) ? data.leads : [];
    } catch {
      return [];
    }
  }
  
  static replaceLeads(leads: any[]): void {
    this.saveLeads(leads);
  }
  
  static clearLeads(): void {
    localStorage.removeItem(SWISSLIFE_STORAGE_KEY);
    localStorage.removeItem(SWISSLIFE_METADATA_KEY);
  }
  
  static hasLeads(): boolean {
    return this.getLeads().length > 0;
  }
  
  static getLeadsCount(): number {
    return this.getLeads().length;
  }
  
  static exportToJSON(): string {
    const leads = this.getLeads();
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      count: leads.length,
      leads: leads
    }, null, 2);
  }
}