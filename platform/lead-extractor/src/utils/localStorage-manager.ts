import type { SwissLifeLead } from '@/types/automation';
import { SwissLifeRepository } from './storage/swisslife-repository';

const SWISSLIFE_STORAGE_KEY = 'swisslife_converted_leads';
const SWISSLIFE_METADATA_KEY = 'swisslife_conversion_metadata';

// Re-export des types pour la compatibilité
export type { ConversionMetadata } from './storage/metadata-manager';

// Instance globale du repository
const repository = new SwissLifeRepository(SWISSLIFE_STORAGE_KEY, SWISSLIFE_METADATA_KEY);

/**
 * Gestionnaire du localStorage pour les leads SwissLife
 * @deprecated Utilisez directement SwissLifeRepository pour une meilleure modularité
 */
export class SwissLifeStorageManager {
  static saveLeads(leads: SwissLifeLead[]): void {
    repository.save(leads);
  }
  
  static getLeads(): SwissLifeLead[] {
    return repository.get();
  }
  
  static appendLeads(newLeads: SwissLifeLead[]): SwissLifeLead[] {
    return repository.append(newLeads);
  }
  
  static replaceLeads(leads: SwissLifeLead[]): void {
    repository.replace(leads);
  }
  
  static removeLead(leadId: string): boolean {
    return repository.remove(leadId);
  }
  
  static clearLeads(): void {
    repository.clear();
  }
  
  static hasLeads(): boolean {
    return repository.has();
  }
  
  static getLeadsCount(): number {
    return repository.count();
  }
  
  static findLeadById(leadId: string): SwissLifeLead | undefined {
    return repository.findById(leadId);
  }
  
  static getMetadata() {
    return repository.getMetadata();
  }
  
  static exportToJSON(): string {
    return repository.exportToJSON();
  }
  
  static importFromJSON(jsonString: string) {
    return repository.importFromJSON(jsonString);
  }
  
  static getStorageSize(): number {
    return repository.getStorageSize();
  }
  
  static isStorageNearLimit(): boolean {
    return repository.isStorageNearLimit();
  }
}

// Export du repository pour une utilisation moderne
export { SwissLifeRepository };