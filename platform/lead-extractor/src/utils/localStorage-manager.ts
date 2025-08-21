import type { TestDataFormat } from './lead-formatter';

const SWISSLIFE_STORAGE_KEY = 'swisslife_converted_leads';
const SWISSLIFE_METADATA_KEY = 'swisslife_conversion_metadata';

/**
 * Gestionnaire du localStorage pour les leads SwissLife formatés au format test-data.json
 */
export class SwissLifeStorageManager {
  static saveLeads(leads: TestDataFormat[]): void {
    const storageData = {
      timestamp: new Date().toISOString(),
      count: leads.length,
      leads: leads
    };
    
    // Sauvegarder dans localStorage (pour l'app React)
    localStorage.setItem(SWISSLIFE_STORAGE_KEY, JSON.stringify(storageData));
    
    // Synchroniser avec l'extension via chrome.storage
    try {
      window.postMessage({
        type: 'EXTENSION_STORAGE_SET',
        data: { swisslife_leads: leads },
        source: 'mutuelles-platform'
      }, '*');
      console.log('✅ Synchronisation extension:', leads.length, 'leads');
    } catch (error) {
      console.log('❌ Erreur synchronisation extension:', error);
    }
  }
  
  static getLeads(): TestDataFormat[] {
    const stored = localStorage.getItem(SWISSLIFE_STORAGE_KEY);
    if (!stored) return [];
    
    try {
      const data = JSON.parse(stored);
      return Array.isArray(data.leads) ? data.leads : [];
    } catch {
      return [];
    }
  }
  
  static replaceLeads(leads: TestDataFormat[]): void {
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
  
  /**
   * Récupère les leads dans un format compatible avec l'extension
   * Retourne un tableau d'objets test-data individuels
   */
  static getLeadsForExtension(): TestDataFormat[] {
    return this.getLeads();
  }
}