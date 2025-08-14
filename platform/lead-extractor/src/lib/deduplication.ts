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

  private static mergeLead(existing: Lead, newLead: Lead): Lead {
    // Garder la fiche la plus récente comme base
    const base = new Date(existing.extractedAt) > new Date(newLead.extractedAt) ? existing : newLead;
    const other = base === existing ? newLead : existing;

    // Fusionner les champs vides
    const merged: Lead = {
      ...base,
      contact: {
        ...base.contact,
        ...Object.fromEntries(
          Object.entries(other.contact).filter(([_, v]) => v && !base.contact[_ as keyof typeof base.contact])
        )
      },
      souscripteur: {
        ...base.souscripteur,
        ...Object.fromEntries(
          Object.entries(other.souscripteur).filter(([_, v]) => v && !base.souscripteur[_ as keyof typeof base.souscripteur])
        )
      },
      conjoint: base.conjoint || other.conjoint ? {
        ...base.conjoint,
        ...other.conjoint,
        ...Object.fromEntries(
          Object.entries(other.conjoint || {}).filter(([_, v]) => v && !(base.conjoint?.[_ as keyof typeof base.conjoint]))
        )
      } : undefined,
      enfants: [...base.enfants, ...other.enfants].filter((e, i, arr) => 
        arr.findIndex(x => x.dateNaissance === e.dateNaissance) === i
      ),
      besoins: {
        ...base.besoins,
        ...Object.fromEntries(
          Object.entries(other.besoins).filter(([_, v]) => v !== undefined && base.besoins[_ as keyof typeof base.besoins] === undefined)
        )
      },
      source: base.source === other.source ? base.source : 'gmail',
      score: Math.max(base.score, other.score),
      isDuplicate: false,
      notes: { ...other.notes, ...base.notes }
    };

    // Marquer les sources multiples dans les notes
    if (base.source !== other.source) {
      merged.notes = {
        ...merged.notes,
        sources: ['gmail', 'calendar']
      };
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