export interface ConversionMetadata {
  lastConversionDate: string;
  totalLeadsConverted: number;
  lastBatchSize: number;
}

export class MetadataManager {
  private readonly key: string;

  constructor(key: string) {
    this.key = key;
  }

  /**
   * Met à jour les métadonnées
   */
  update(batchSize: number): void {
    const existing = this.get();
    const metadata: ConversionMetadata = {
      lastConversionDate: new Date().toISOString(),
      totalLeadsConverted: existing.totalLeadsConverted + batchSize,
      lastBatchSize: batchSize
    };
    
    try {
      localStorage.setItem(this.key, JSON.stringify(metadata));
    } catch (error) {
      console.error('Erreur lors de la mise à jour des métadonnées:', error);
      throw new Error('Impossible de mettre à jour les métadonnées');
    }
  }
  
  /**
   * Récupère les métadonnées
   */
  get(): ConversionMetadata {
    try {
      const stored = localStorage.getItem(this.key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des métadonnées:', error);
    }
    
    return {
      lastConversionDate: '',
      totalLeadsConverted: 0,
      lastBatchSize: 0
    };
  }

  /**
   * Supprime les métadonnées
   */
  clear(): void {
    localStorage.removeItem(this.key);
  }
}