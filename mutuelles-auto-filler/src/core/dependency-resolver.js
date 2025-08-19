/**
 * Résolveur de dépendances pour SwissLife
 * Gère les règles complexes entre régimes, statuts et professions
 */

export class DependencyResolver {
  constructor(rules) {
    this.rules = rules;
  }

  /**
   * Détermine automatiquement le régime selon les données du lead
   */
  resolveRegime(leadData) {
    console.log('🔍 leadData reçu:', leadData);
    console.log('🔍 leadData.lead:', leadData.lead);
    
    // Les données sont dans leadData.lead.souscripteur
    const souscripteur = leadData.lead?.souscripteur;
    if (!souscripteur) {
      console.error('❌ Pas de souscripteur dans leadData');
      return 'SECURITE_SOCIALE';
    }
    
    const regimeSocial = souscripteur.regimeSocial;
    const mapped = this.rules.mappings.leadToProfil.regimeSocial[regimeSocial];
    
    if (!mapped) {
      console.warn('⚠️ Régime social non mappé:', regimeSocial);
      return 'SECURITE_SOCIALE'; // Fallback
    }
    
    console.log('🔍 Régime résolu:', regimeSocial, '→', mapped);
    return mapped;
  }

  /**
   * Détermine le statut selon le régime et les données du lead
   */
  resolveStatut(regime, leadData) {
    const profession = leadData.lead.souscripteur.profession;
    const regimeData = this.rules.regimes[regime];
    
    if (!regimeData) {
      console.warn('⚠️ Régime inconnu:', regime);
      return null;
    }

    // Essai de mapping direct de la profession
    const mappedStatut = this.rules.mappings.leadToProfil.profession[profession];
    
    // Vérifier si ce statut existe dans ce régime
    if (mappedStatut && regimeData.statuts[mappedStatut]) {
      console.log('🔍 Statut résolu:', profession, '→', mappedStatut);
      return mappedStatut;
    }

    // Fallback : premier statut disponible dans ce régime
    const availableStatuts = Object.keys(regimeData.statuts);
    const fallback = availableStatuts[0];
    
    console.log('🔄 Statut fallback pour', regime, ':', fallback);
    return fallback;
  }

  /**
   * Détermine la profession selon régime + statut
   */
  resolveProfession(regime, statut, leadData) {
    const regimeData = this.rules.regimes[regime];
    if (!regimeData?.statuts[statut]) {
      return null;
    }

    const availableProfessions = regimeData.statuts[statut].professions;
    
    // Si pas de professions disponibles, skip
    if (availableProfessions.length === 0) {
      console.log('⏭️ Pas de professions disponibles pour', regime, statut);
      return null;
    }

    // Essayer de mapper depuis la profession du lead
    const leadProfession = leadData.lead.souscripteur.profession;
    
    // Si c'est médical, essayer de trouver une correspondance
    if (leadProfession === 'Chef d\'entreprise' && availableProfessions.includes('AUTRE')) {
      return 'AUTRE';
    }

    // Sinon, prendre "AUTRE" si disponible, sinon la première
    if (availableProfessions.includes('AUTRE')) {
      console.log('🔍 Profession résolue: AUTRE (fallback)');
      return 'AUTRE';
    }

    const fallback = availableProfessions[0];
    console.log('🔄 Profession fallback:', fallback);
    return fallback;
  }

  /**
   * Résout toutes les données d'un souscripteur automatiquement
   */
  resolveSubscriber(leadData) {
    const regime = this.resolveRegime(leadData);
    const statut = this.resolveStatut(regime, leadData);
    const profession = this.resolveProfession(regime, statut, leadData);

    const result = {
      regime,
      statut,
      profession,
      dateNaissance: leadData.lead.souscripteur.dateNaissance,
      departement: leadData.lead.contact.codePostal.substring(0, 2)
    };

    console.log('✅ Souscripteur résolu:', result);
    return result;
  }

  /**
   * Résout les données du conjoint automatiquement
   */
  resolveSpouse(leadData) {
    if (!leadData.lead?.conjoint) {
      console.log('⏭️ Pas de conjoint, skip');
      return null;
    }

    // Résoudre le régime du conjoint
    const regimeSocial = leadData.lead.conjoint.regimeSocial;
    const mapped = this.rules.mappings.leadToProfil.regimeSocial[regimeSocial];
    const regime = mapped || 'SECURITE_SOCIALE';

    // Résoudre le statut du conjoint
    const profession = leadData.lead.conjoint.profession;
    const mappedStatut = this.rules.mappings.leadToProfil.profession[profession];
    const regimeData = this.rules.regimes[regime];
    
    let statut = mappedStatut;
    if (!statut || !regimeData?.statuts[statut]) {
      // Fallback : premier statut disponible dans ce régime
      statut = Object.keys(regimeData?.statuts || {})[0] || 'SALARIE';
    }

    // Résoudre la profession du conjoint
    const professionResolved = this.resolveProfession(regime, statut, {
      lead: {
        souscripteur: {
          profession: leadData.lead.conjoint.profession
        }
      }
    });

    const result = {
      regime,
      statut,
      profession: professionResolved,
      dateNaissance: leadData.lead.conjoint.dateNaissance,
      departement: leadData.lead.contact.codePostal.substring(0, 2)
    };

    console.log('✅ Conjoint résolu:', result);
    return result;
  }

  /**
   * Valide qu'une combinaison régime/statut/profession est valide
   */
  validateCombination(regime, statut, profession) {
    const regimeData = this.rules.regimes[regime];
    if (!regimeData) return false;
    
    const statutData = regimeData.statuts[statut];
    if (!statutData) return false;
    
    if (profession && statutData.professions.length > 0) {
      return statutData.professions.includes(profession);
    }
    
    // Si pas de profession requise
    return true;
  }

  /**
   * Vérifie si on peut skip les professions pour cette combinaison
   */
  shouldSkipProfession(regime, statut) {
    const regimeData = this.rules.regimes[regime];
    return regimeData?.statuts[statut]?.professions?.length === 0;
  }
}

// Instance globale pour réutilisation
let resolverInstance = null;

export async function getResolver() {
  if (!resolverInstance) {
    const response = await fetch(chrome.runtime.getURL('data/swisslife-rules.json'));
    const rules = await response.json();
    resolverInstance = new DependencyResolver(rules);
  }
  return resolverInstance;
}