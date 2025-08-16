import type { SwissLifeLead } from '@/types/automation';

const SWISSLIFE_STORAGE_KEY = 'swisslife_converted_leads';
const SWISSLIFE_METADATA_KEY = 'swisslife_conversion_metadata';

export interface ConversionMetadata {
  lastConversionDate: string;
  totalLeadsConverted: number;
  lastBatchSize: number;
}

/**
 * Gestionnaire du localStorage pour les leads SwissLife
 */
export class SwissLifeStorageManager {
  /**
   * Sauvegarde les leads dans le localStorage
   */
  static saveLeads(leads: SwissLifeLead[]): void {
    try {
      localStorage.setItem(SWISSLIFE_STORAGE_KEY, JSON.stringify(leads));
      this.updateMetadata(leads.length);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des leads:', error);
      throw new Error('Impossible de sauvegarder les leads dans le localStorage');
    }
  }
  
  /**
   * Récupère les leads depuis le localStorage
   */
  static getLeads(): SwissLifeLead[] {
    try {
      const stored = localStorage.getItem(SWISSLIFE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Erreur lors de la récupération des leads:', error);
      return [];
    }
  }
  
  /**
   * Ajoute de nouveaux leads aux existants
   */
  static appendLeads(newLeads: SwissLifeLead[]): SwissLifeLead[] {
    const existing = this.getLeads();
    const combined = [...existing, ...newLeads];
    this.saveLeads(combined);
    return combined;
  }
  
  /**
   * Remplace les leads existants
   */
  static replaceLeads(leads: SwissLifeLead[]): void {
    this.saveLeads(leads);
  }
  
  /**
   * Supprime un lead par son ID
   */
  static removeLead(leadId: string): boolean {
    const leads = this.getLeads();
    const filtered = leads.filter(lead => lead.id !== leadId);
    
    if (filtered.length < leads.length) {
      this.saveLeads(filtered);
      return true;
    }
    
    return false;
  }
  
  /**
   * Supprime tous les leads
   */
  static clearLeads(): void {
    localStorage.removeItem(SWISSLIFE_STORAGE_KEY);
    localStorage.removeItem(SWISSLIFE_METADATA_KEY);
  }
  
  /**
   * Vérifie si des leads existent
   */
  static hasLeads(): boolean {
    return this.getLeads().length > 0;
  }
  
  /**
   * Obtient le nombre de leads stockés
   */
  static getLeadsCount(): number {
    return this.getLeads().length;
  }
  
  /**
   * Recherche un lead par ID
   */
  static findLeadById(leadId: string): SwissLifeLead | undefined {
    const leads = this.getLeads();
    return leads.find(lead => lead.id === leadId);
  }
  
  /**
   * Met à jour les métadonnées
   */
  private static updateMetadata(batchSize: number): void {
    const existing = this.getMetadata();
    const metadata: ConversionMetadata = {
      lastConversionDate: new Date().toISOString(),
      totalLeadsConverted: existing.totalLeadsConverted + batchSize,
      lastBatchSize: batchSize
    };
    
    try {
      localStorage.setItem(SWISSLIFE_METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error('Erreur lors de la mise à jour des métadonnées:', error);
    }
  }
  
  /**
   * Récupère les métadonnées
   */
  static getMetadata(): ConversionMetadata {
    try {
      const stored = localStorage.getItem(SWISSLIFE_METADATA_KEY);
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
   * Exporte les leads en JSON
   */
  static exportToJSON(): string {
    const leads = this.getLeads();
    return JSON.stringify(leads, null, 2);
  }
  
  /**
   * Importe des leads depuis JSON
   */
  static importFromJSON(jsonString: string): { success: boolean; count: number; error?: string } {
    try {
      const leads = JSON.parse(jsonString) as SwissLifeLead[];
      
      // Validation basique
      if (!Array.isArray(leads)) {
        throw new Error('Le JSON doit contenir un tableau de leads');
      }
      
      // Vérification de la structure
      for (const lead of leads) {
        if (!lead.id || !lead.nom || !lead.data) {
          throw new Error('Structure de lead invalide');
        }
      }
      
      this.saveLeads(leads);
      
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
   * Obtient la taille utilisée dans le localStorage (en bytes)
   */
  static getStorageSize(): number {
    const leads = localStorage.getItem(SWISSLIFE_STORAGE_KEY) || '';
    const metadata = localStorage.getItem(SWISSLIFE_METADATA_KEY) || '';
    return new Blob([leads + metadata]).size;
  }
  
  /**
   * Vérifie si le localStorage est proche de sa limite
   */
  static isStorageNearLimit(): boolean {
    // La plupart des navigateurs ont une limite de 5-10MB
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const currentSize = this.getStorageSize();
    return currentSize > MAX_SIZE * 0.9; // Alerte à 90%
  }
}