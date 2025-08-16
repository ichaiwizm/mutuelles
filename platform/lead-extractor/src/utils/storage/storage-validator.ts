import type { SwissLifeLead } from '@/types/automation';

export class StorageValidator {
  /**
   * Valide la structure d'un lead SwissLife
   */
  static validateLead(lead: any): lead is SwissLifeLead {
    return !!(
      lead &&
      typeof lead === 'object' &&
      lead.id &&
      lead.nom &&
      lead.data &&
      typeof lead.data === 'object'
    );
  }

  /**
   * Valide un tableau de leads
   */
  static validateLeads(data: any): data is SwissLifeLead[] {
    if (!Array.isArray(data)) {
      throw new Error('Le JSON doit contenir un tableau de leads');
    }

    for (const lead of data) {
      if (!this.validateLead(lead)) {
        throw new Error('Structure de lead invalide');
      }
    }

    return true;
  }

  /**
   * Valide et parse du JSON
   */
  static parseAndValidateJSON(jsonString: string): SwissLifeLead[] {
    try {
      const data = JSON.parse(jsonString);
      this.validateLeads(data);
      return data;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('JSON invalide');
      }
      throw error;
    }
  }
}