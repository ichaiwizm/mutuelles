import type { Lead } from '@/types/lead';

export class DeduplicationService {
  private static normalizePhone(phone?: string): string {
    if (!phone) return '';
    return phone.replace(/[\s\-\(\)\.]/g, '');
  }

  private static normalizeEmail(email?: string): string {
    if (!email) return '';
    return email.toLowerCase().trim();
  }

  private static normalizeString(str?: string): string {
    if (!str) return '';
    return str.toLowerCase().trim();
  }

  private static getDeduplicationKey(lead: Lead): string | null {
    // Priorité 1: Email
    if (lead.contact.email) {
      return `email:${this.normalizeEmail(lead.contact.email)}`;
    }

    // Priorité 2: Téléphone
    if (lead.contact.telephone) {
      return `phone:${this.normalizePhone(lead.contact.telephone)}`;
    }

    // Priorité 3: Triplet (Prénom + Nom + DOB)
    if (lead.contact.prenom && lead.contact.nom && lead.souscripteur.dateNaissance) {
      return `triplet:${this.normalizeString(lead.contact.prenom)}-${this.normalizeString(lead.contact.nom)}-${lead.souscripteur.dateNaissance}`;
    }

    return null;
  }

  private static pick<T>(a: T | undefined, b: T | undefined): T | undefined {
    return a ?? b; // garde la valeur de base si définie
  }

  private static mergeLead(existing: Lead, newLead: Lead): Lead {
    const base = new Date(existing.extractedAt) > new Date(newLead.extractedAt) ? existing : newLead;
    const other = base === existing ? newLead : existing;

    const merged: Lead = {
      ...base,
      contact: Object.fromEntries(
        Object.keys({ ...base.contact, ...other.contact }).map((k) => [
          k,
          this.pick(base.contact[k as keyof typeof base.contact], other.contact[k as keyof typeof other.contact])
        ])
      ) as Lead['contact'],

      souscripteur: Object.fromEntries(
        Object.keys({ ...base.souscripteur, ...other.souscripteur }).map((k) => [
          k,
          this.pick(base.souscripteur[k as keyof typeof base.souscripteur], other.souscripteur[k as keyof typeof other.souscripteur])
        ])
      ) as Lead['souscripteur'],

      conjoint: (base.conjoint || other.conjoint)
        ? Object.fromEntries(
            Object.keys({ ...(base.conjoint||{}), ...(other.conjoint||{}) }).map((k) => [
              k,
              this.pick(base.conjoint?.[k as keyof NonNullable<typeof base.conjoint>], other.conjoint?.[k as keyof NonNullable<typeof other.conjoint>])
            ])
          ) as NonNullable<Lead['conjoint']>
        : undefined,

      enfants: [...base.enfants, ...other.enfants]
        .filter((e, i, arr) => arr.findIndex(x => x.dateNaissance === e.dateNaissance) === i),

      besoins: Object.fromEntries(
        Object.keys({ ...base.besoins, ...other.besoins }).map((k) => [
          k,
          this.pick(
            base.besoins[k as keyof typeof base.besoins],
            other.besoins[k as keyof typeof other.besoins]
          )
        ])
      ) as Lead['besoins'],

      source: base.source === other.source ? base.source : 'multiple',
      score: Math.max(base.score, other.score),
      isDuplicate: false,
      notes: { ...base.notes, ...other.notes }
    };

    if (base.source !== other.source) {
      merged.notes = { ...merged.notes, sources: Array.from(new Set([base.source, other.source])) };
    }

    return merged;
  }

  static deduplicateLeads(leads: Lead[]): Lead[] {
    const deduplicationMap = new Map<string, Lead>();
    const noKeyLeads: Lead[] = [];

    for (const lead of leads) {
      const key = this.getDeduplicationKey(lead);
      
      if (!key) {
        noKeyLeads.push(lead);
        continue;
      }

      const existing = deduplicationMap.get(key);
      if (existing) {
        // Fusionner avec l'existant
        deduplicationMap.set(key, this.mergeLead(existing, lead));
      } else {
        deduplicationMap.set(key, lead);
      }
    }

    // Marquer les doublons potentiels parmi les leads sans clé
    for (const lead of noKeyLeads) {
      lead.isDuplicate = this.checkPotentialDuplicate(lead, [...deduplicationMap.values(), ...noKeyLeads]);
    }

    return [...deduplicationMap.values(), ...noKeyLeads];
  }

  private static checkPotentialDuplicate(lead: Lead, allLeads: Lead[]): boolean {
    // Vérifier la similarité avec d'autres leads
    for (const other of allLeads) {
      if (other.id === lead.id) continue;
      
      let similarityScore = 0;
      
      // Comparer les noms
      if (lead.contact.nom && other.contact.nom && 
          this.normalizeString(lead.contact.nom) === this.normalizeString(other.contact.nom)) {
        similarityScore++;
      }
      
      // Comparer les prénoms
      if (lead.contact.prenom && other.contact.prenom && 
          this.normalizeString(lead.contact.prenom) === this.normalizeString(other.contact.prenom)) {
        similarityScore++;
      }
      
      // Comparer les villes
      if (lead.contact.ville && other.contact.ville && 
          this.normalizeString(lead.contact.ville) === this.normalizeString(other.contact.ville)) {
        similarityScore++;
      }
      
      // Si similarité élevée, marquer comme potentiel doublon
      if (similarityScore >= 2) {
        return true;
      }
    }
    
    return false;
  }
}