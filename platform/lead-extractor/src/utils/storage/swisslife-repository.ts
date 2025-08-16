import type { SwissLifeLead } from '@/types/automation';
import type { ImportResult } from './storage-interface';
import { BaseStorage } from './base-storage';
import { MetadataManager } from './metadata-manager';
import { StorageValidator } from './storage-validator';

export class SwissLifeRepository extends BaseStorage<SwissLifeLead> {
  private metadataManager: MetadataManager;

  constructor(key: string, metadataKey: string) {
    super(key);
    this.metadataManager = new MetadataManager(metadataKey);
  }

  /**
   * Exporte les leads en JSON
   */
  exportToJSON(): string {
    const leads = this.get();
    return JSON.stringify(leads, null, 2);
  }

  /**
   * Importe des leads depuis JSON
   */
  importFromJSON(jsonString: string): ImportResult {
    try {
      const leads = StorageValidator.parseAndValidateJSON(jsonString);
      this.save(leads);
      
      return {
        success: true,
        count: leads.length
      };
    } catch (error) {
      return {
        success: false,
        count: 0,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Récupère les métadonnées
   */
  getMetadata() {
    return this.metadataManager.get();
  }

  // Implémentation des méthodes abstraites
  protected getId(item: SwissLifeLead): string {
    return item.id;
  }

  protected validateItem(item: any): item is SwissLifeLead {
    return StorageValidator.validateLead(item);
  }

  // Callbacks
  protected onSave(count: number): void {
    this.metadataManager.update(count);
  }

  protected onClear(): void {
    this.metadataManager.clear();
  }
}