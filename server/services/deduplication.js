import logger from '../logger.js';

export class DeduplicationService {
  static normalizePhone(phone) {
    if (!phone) return '';
    return phone.replace(/[\s\-\(\)\.]/g, '');
  }

  static normalizeEmail(email) {
    if (!email) return '';
    return email.toLowerCase().trim();
  }

  static normalizeString(str) {
    if (!str) return '';
    return str.toLowerCase().trim();
  }

  static getDeduplicationKey(lead) {
    logger.info('🔑 Génération clé déduplication pour lead:', {
      id: lead.id,
      nom: lead.contact?.nom,
      prenom: lead.contact?.prenom,
      email: lead.contact?.email,
      telephone: lead.contact?.telephone,
      dateNaissance: lead.souscripteur?.dateNaissance,
      extractedAt: lead.extractedAt
    });

    // Priorité 1: Email
    if (lead.contact?.email) {
      const key = `email:${this.normalizeEmail(lead.contact.email)}`;
      logger.info('🔑 Clé EMAIL générée:', {
        leadId: lead.id,
        originalEmail: lead.contact.email,
        normalizedEmail: this.normalizeEmail(lead.contact.email),
        finalKey: key
      });
      return key;
    }

    // Priorité 2: Téléphone
    if (lead.contact?.telephone) {
      const key = `phone:${this.normalizePhone(lead.contact.telephone)}`;
      logger.info('🔑 Clé TELEPHONE générée:', {
        leadId: lead.id,
        originalPhone: lead.contact.telephone,
        normalizedPhone: this.normalizePhone(lead.contact.telephone),
        finalKey: key
      });
      return key;
    }

    // Priorité 3: Triplet (Prénom + Nom + DOB)
    if (lead.contact?.prenom && lead.contact?.nom && lead.souscripteur?.dateNaissance) {
      const key = `triplet:${this.normalizeString(lead.contact.prenom)}-${this.normalizeString(lead.contact.nom)}-${lead.souscripteur.dateNaissance}`;
      logger.info('🔑 Clé TRIPLET générée:', {
        leadId: lead.id,
        prenom: lead.contact.prenom,
        nom: lead.contact.nom,
        dateNaissance: lead.souscripteur.dateNaissance,
        finalKey: key
      });
      return key;
    }

    logger.info('🔑 AUCUNE CLÉ générée pour lead:', {
      leadId: lead.id,
      hasEmail: !!(lead.contact?.email),
      hasPhone: !!(lead.contact?.telephone),
      hasPrenom: !!(lead.contact?.prenom),
      hasNom: !!(lead.contact?.nom),
      hasDateNaissance: !!(lead.souscripteur?.dateNaissance)
    });
    return null;
  }

  static pick(a, b) {
    return a ?? b; // garde la valeur de base si définie
  }

  static mergeLead(existing, newLead) {
    logger.info('🔀 FUSION DE LEADS:', {
      existing: {
        id: existing.id,
        extractedAt: existing.extractedAt,
        civilite: existing.contact?.civilite,
        email: existing.contact?.email
      },
      newLead: {
        id: newLead.id,
        extractedAt: newLead.extractedAt,
        civilite: newLead.contact?.civilite,
        email: newLead.contact?.email
      }
    });

    const base = new Date(existing.extractedAt) > new Date(newLead.extractedAt) ? existing : newLead;
    const other = base === existing ? newLead : existing;

    logger.info('🔀 Base/Other selection:', {
      baseId: base.id,
      baseCivilite: base.contact?.civilite,
      baseExtractedAt: base.extractedAt,
      otherId: other.id,
      otherCivilite: other.contact?.civilite,
      otherExtractedAt: other.extractedAt
    });

    const merged = {
      ...base,
      contact: Object.fromEntries(
        Object.keys({ ...base.contact, ...other.contact }).map((k) => [
          k,
          this.pick(base.contact?.[k], other.contact?.[k])
        ])
      ),

      souscripteur: Object.fromEntries(
        Object.keys({ ...base.souscripteur, ...other.souscripteur }).map((k) => [
          k,
          this.pick(base.souscripteur?.[k], other.souscripteur?.[k])
        ])
      ),

      conjoint: (base.conjoint || other.conjoint)
        ? Object.fromEntries(
            Object.keys({ ...(base.conjoint||{}), ...(other.conjoint||{}) }).map((k) => [
              k,
              this.pick(base.conjoint?.[k], other.conjoint?.[k])
            ])
          )
        : undefined,

      enfants: [...(base.enfants || []), ...(other.enfants || [])]
        .filter((e, i, arr) => arr.findIndex(x => x.dateNaissance === e.dateNaissance) === i),

      besoins: Object.fromEntries(
        Object.keys({ ...base.besoins, ...other.besoins }).map((k) => [
          k,
          this.pick(base.besoins?.[k], other.besoins?.[k])
        ])
      ),

      source: base.source === other.source ? base.source : 'multiple',
      score: Math.max(base.score || 0, other.score || 0),
      isDuplicate: false,
      notes: { ...base.notes, ...other.notes }
    };

    if (base.source !== other.source) {
      merged.notes = { ...merged.notes, sources: Array.from(new Set([base.source, other.source])) };
    }

    logger.info('🔀 RÉSULTAT FUSION:', {
      mergedId: merged.id,
      mergedCivilite: merged.contact?.civilite,
      mergedEmail: merged.contact?.email,
      mergedExtractedAt: merged.extractedAt,
      mergedScore: merged.score
    });

    return merged;
  }

  static deduplicateLeads(leads) {
    logger.info('🚀 DÉBUT DÉDUPLICATION SERVEUR - Traitement de', leads.length, 'leads');
    logger.info('🚀 Liste des leads à traiter:', leads.map(l => ({
      id: l.id,
      nom: l.contact?.nom,
      prenom: l.contact?.prenom,
      email: l.contact?.email,
      telephone: l.contact?.telephone,
      extractedAt: l.extractedAt
    })));

    const deduplicationMap = new Map();
    const noKeyLeads = [];

    for (const lead of leads) {
      logger.info('🔄 Traitement lead:', lead.id, `(${lead.contact?.prenom} ${lead.contact?.nom})`);
      
      const key = this.getDeduplicationKey(lead);
      
      if (!key) {
        logger.info('🚫 Lead sans clé → ajout à noKeyLeads:', lead.id);
        noKeyLeads.push(lead);
        continue;
      }

      const existing = deduplicationMap.get(key);
      if (existing) {
        logger.info('🔀 DOUBLON DÉTECTÉ! Fusion required:', {
          key,
          existingLead: {
            id: existing.id,
            extractedAt: existing.extractedAt,
            civilite: existing.contact?.civilite
          },
          newLead: {
            id: lead.id,
            extractedAt: lead.extractedAt,
            civilite: lead.contact?.civilite
          }
        });
        
        const merged = this.mergeLead(existing, lead);
        logger.info('🔀 Lead fusionné:', {
          mergedId: merged.id,
          mergedCivilite: merged.contact?.civilite,
          mergedExtractedAt: merged.extractedAt
        });
        
        deduplicationMap.set(key, merged);
      } else {
        logger.info('✅ Nouveau lead ajouté avec clé:', { key, leadId: lead.id });
        deduplicationMap.set(key, lead);
      }
    }

    logger.info('📊 Résultat déduplication MAP:', {
      uniqueKeys: Array.from(deduplicationMap.keys()),
      leadCount: deduplicationMap.size,
      noKeyLeadsCount: noKeyLeads.length
    });

    // Marquer les doublons potentiels parmi les leads sans clé
    for (const lead of noKeyLeads) {
      lead.isDuplicate = this.checkPotentialDuplicate(lead, [...deduplicationMap.values(), ...noKeyLeads]);
      if (lead.isDuplicate) {
        logger.info('⚠️ Lead marqué comme doublon potentiel:', lead.id);
      }
    }

    const finalResult = [...deduplicationMap.values(), ...noKeyLeads];
    logger.info('🏁 RÉSULTAT FINAL DÉDUPLICATION SERVEUR:', {
      inputCount: leads.length,
      outputCount: finalResult.length,
      duplicatesRemoved: leads.length - finalResult.length,
      finalLeads: finalResult.map(l => ({
        id: l.id,
        nom: l.contact?.nom,
        prenom: l.contact?.prenom,
        email: l.contact?.email,
        isDuplicate: l.isDuplicate
      }))
    });

    return finalResult;
  }

  static checkPotentialDuplicate(lead, allLeads) {
    // Vérifier la similarité avec d'autres leads
    for (const other of allLeads) {
      if (other.id === lead.id) continue;
      
      let similarityScore = 0;
      
      // Comparer les noms
      if (lead.contact?.nom && other.contact?.nom && 
          this.normalizeString(lead.contact.nom) === this.normalizeString(other.contact.nom)) {
        similarityScore++;
      }
      
      // Comparer les prénoms
      if (lead.contact?.prenom && other.contact?.prenom && 
          this.normalizeString(lead.contact.prenom) === this.normalizeString(other.contact.prenom)) {
        similarityScore++;
      }
      
      // Comparer les villes
      if (lead.contact?.ville && other.contact?.ville && 
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