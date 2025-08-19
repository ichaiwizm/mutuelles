/**
 * Service principal SwissLife Form Filler
 * Point d'entrée unifié pour tous les services de remplissage
 */

// Import des services
import nomProjetService from './fields/nom-projet-service.js';
import simulationTypeService from './fields/simulation-type-service.js';
import confortHospitalisationService from './fields/confort-hospitalisation-service.js';
import souscripteurService from './fields/souscripteur-service.js';
import enfantsService from './fields/enfants-service.js';
import conjointService from './fields/conjoint-service.js';
import gammesService from './fields/gammes-service.js';
import dateEffetService from './fields/date-effet-service.js';
import optionsService from './fields/options-service.js';
import navigationService from './navigation/navigation-service.js';

// Import des utilitaires
import { wait, waitStable, waitReady } from './utils/async-utils.js';

/**
 * Configuration par défaut complète
 */
const DEFAULT_CONFIG = {
  // Nom du projet
  nomProjet: "Simulation SwissLife",
  
  // Type de simulation
  typeSimulation: "individuel", // ou "couple"
  
  // Confort hospitalisation
  confortHospitalisation: "non",
  
  // Souscripteur principal
  souscripteur: {
    dateNaissance: "01/01/1980",
    regimeSocial: "general",
    statut: "actif",
    profession: null,
    departement: "75"
  },
  
  // Enfants
  enfants: {
    nbEnfants: 0,
    liste: []
  },
  
  // Conjoint (si typeSimulation = "couple")
  conjoint: {
    dateNaissance: "01/01/1985",
    regimeSocial: "general",
    statut: "actif",
    profession: null
  },
  
  // Gamme
  gamme: "SwissLife Santé",
  
  // Date d'effet
  dateEffet: "today",
  
  // Options
  options: {
    madelin: false,
    resiliation: "non",
    reprise: "non"
  }
};

/**
 * Classe principale SwissLife Form Filler
 */
class SwissLifeFormFiller {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.services = {
      nomProjet: nomProjetService,
      simulationType: simulationTypeService,
      confortHospitalisation: confortHospitalisationService,
      souscripteur: souscripteurService,
      enfants: enfantsService,
      conjoint: conjointService,
      gammes: gammesService,
      dateEffet: dateEffetService,
      options: optionsService,
      navigation: navigationService
    };
    
    this.results = {};
    this.errors = [];
  }

  /**
   * Mise à jour de la configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    return this;
  }

  /**
   * Normalise les résultats des services pour l'orchestrateur
   */
  normalizeStepResult(stepName, raw) {
    if (typeof raw === 'boolean') {
      return { ok: raw }; // legacy boolean returns
    }
    
    if (raw && typeof raw === 'object') {
      if ('ok' in raw) return raw; // Format standard
      
      if ('allOk' in raw) {
        return { ok: !!raw.allOk, ...raw }; // enfantsService.runAll, conjointService.runAll
      }
      
      if (stepName === 'options') {
        // optionsService.setAll() retourne un objet de sous-résultats
        const parts = Object.values(raw);
        const ok = parts.every(p => !p || p.ok !== false); // tolérant si checkbox absente
        return { ok, details: raw };
      }
    }
    
    return { ok: false, reason: 'unknown_result_shape', raw };
  }

  /**
   * Remplissage étape par étape
   */
  async fillStep(stepName, stepConfig) {
    console.log(`🔄 Étape: ${stepName}`);
    
    try {
      await waitReady();
      
      let rawResult;
      
      switch (stepName) {
        case 'nomProjet':
          rawResult = await this.services.nomProjet.set(stepConfig || this.config.nomProjet);
          break;
          
        case 'simulationType':
          rawResult = await this.services.simulationType.set(stepConfig || this.config.typeSimulation);
          break;
          
        case 'confortHospitalisation':
          rawResult = await this.services.confortHospitalisation.set(stepConfig || this.config.confortHospitalisation);
          break;
          
        case 'souscripteur':
          rawResult = await this.services.souscripteur.fill(stepConfig || this.config.souscripteur);
          break;
          
        case 'enfants':
          if (this.config.enfants.nbEnfants > 0) {
            rawResult = await this.services.enfants.runAll({
              nbEnfants: this.config.enfants.nbEnfants,
              enfants: this.config.enfants.liste
            });
          } else {
            rawResult = { ok: true, skipped: 'no_children' };
          }
          break;
          
        case 'conjoint':
          if (this.config.typeSimulation === 'couple') {
            rawResult = await this.services.conjoint.runAll(stepConfig || this.config.conjoint);
          } else {
            rawResult = { ok: true, skipped: 'individual_simulation' };
          }
          break;
          
        case 'gammes':
          rawResult = await this.services.gammes.set(stepConfig || this.config.gamme);
          break;
          
        case 'dateEffet':
          rawResult = await this.services.dateEffet.set(stepConfig || this.config.dateEffet);
          break;
          
        case 'options':
          rawResult = await this.services.options.setAll(stepConfig || this.config.options);
          break;
          
        default:
          throw new Error(`Étape inconnue: ${stepName}`);
      }
      
      // Normalisation du résultat
      const result = this.normalizeStepResult(stepName, rawResult);
      this.results[stepName] = result;
      
      if (result.ok || result.skipped) {
        console.log(`✅ ${stepName}: OK`);
        return { ok: true, step: stepName, result };
      } else {
        console.log(`❌ ${stepName}: ÉCHEC`, result);
        this.errors.push({ step: stepName, error: result });
        return { ok: false, step: stepName, result };
      }
      
    } catch (error) {
      console.error(`💥 Erreur ${stepName}:`, error);
      this.errors.push({ step: stepName, error: error.message });
      return { ok: false, step: stepName, error: error.message };
    }
  }

  /**
   * Remplissage complet automatique
   */
  async fillAll(steps = null) {
    const defaultSteps = [
      'nomProjet',
      'simulationType', 
      'confortHospitalisation',
      'souscripteur',
      'enfants',
      'conjoint',
      'gammes',
      'dateEffet',
      'options'
    ];
    
    const stepsToFill = steps || defaultSteps;
    const results = [];
    
    console.log(`🚀 Début remplissage complet (${stepsToFill.length} étapes)`);
    
    for (const step of stepsToFill) {
      const result = await this.fillStep(step);
      results.push(result);
      
      if (!result.ok && result.error) {
        console.log(`🛑 Arrêt sur erreur: ${step}`);
        break;
      }
      
      await wait(200); // Pause entre les étapes
    }
    
    const success = results.filter(r => r.ok).length;
    const total = results.length;
    
    console.log(`📊 Résultat: ${success}/${total} étapes réussies`);
    
    return {
      ok: success === total,
      completed: success,
      total,
      results,
      errors: this.errors
    };
  }

  /**
   * Navigation vers l'étape suivante
   */
  async next() {
    console.log('➡️ Navigation vers étape suivante...');
    return await this.services.navigation.smartClick();
  }

  /**
   * Workflow complet avec navigation
   */
  async runComplete() {
    console.log('🎯 Démarrage workflow complet SwissLife');
    
    // 1. Remplissage de tous les champs
    const fillResult = await this.fillAll();
    
    if (!fillResult.ok) {
      console.log('❌ Remplissage incomplet, abandon');
      return { ok: false, phase: 'fill', ...fillResult };
    }
    
    // 2. Vérification finale
    const verification = await this.verify();
    
    if (!verification.ok) {
      console.log('⚠️ Vérifications échouées');
      return { ok: false, phase: 'verify', ...verification };
    }
    
    // 3. Navigation
    const navResult = await this.next();
    
    if (!navResult.ok) {
      console.log('❌ Navigation échouée');
      return { ok: false, phase: 'navigation', ...navResult };
    }
    
    console.log('✅ Workflow complet terminé avec succès');
    
    return {
      ok: true,
      phases: {
        fill: fillResult,
        verify: verification,
        navigate: navResult
      }
    };
  }

  /**
   * Vérification complète
   */
  async verify() {
    console.log('🔍 Vérification complète...');
    
    const checks = [];
    
    // Vérifier chaque service qui le supporte
    if (this.config.nomProjet) {
      checks.push({
        service: 'nomProjet',
        result: this.services.nomProjet.check(this.config.nomProjet)
      });
    }
    
    if (this.config.typeSimulation) {
      checks.push({
        service: 'simulationType',
        result: this.services.simulationType.check(this.config.typeSimulation)
      });
    }
    
    if (this.config.gamme) {
      checks.push({
        service: 'gammes',
        result: this.services.gammes.check(this.config.gamme)
      });
    }
    
    if (this.config.dateEffet) {
      checks.push({
        service: 'dateEffet',
        result: this.services.dateEffet.check(this.config.dateEffet)
      });
    }
    
    const failures = checks.filter(c => !c.result.ok);
    
    if (failures.length > 0) {
      console.log(`❌ ${failures.length} vérifications échouées`);
      console.table(failures.map(f => ({ service: f.service, ...f.result })));
    } else {
      console.log('✅ Toutes les vérifications OK');
    }
    
    return {
      ok: failures.length === 0,
      checks,
      failures
    };
  }

  /**
   * Diagnostic complet
   */
  async diagnose() {
    console.log('🔬 Diagnostic complet...');
    
    const diagnostics = {};
    
    for (const [name, service] of Object.entries(this.services)) {
      if (service.diagnose) {
        try {
          diagnostics[name] = service.diagnose(this.config[name] || this.config);
        } catch (e) {
          diagnostics[name] = { error: e.message };
        }
      }
    }
    
    return diagnostics;
  }

  /**
   * Reset des résultats
   */
  reset() {
    this.results = {};
    this.errors = [];
    return this;
  }

  /**
   * Export des résultats
   */
  export() {
    return {
      config: this.config,
      results: this.results,
      errors: this.errors,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Factory function pour créer une instance
 */
export function createFormFiller(config = {}) {
  return new SwissLifeFormFiller(config);
}

/**
 * API raccourci pour usage rapide
 */
export async function quickFill(config = {}) {
  const filler = createFormFiller(config);
  return await filler.runComplete();
}

// Export de la classe et des services individuels
export {
  SwissLifeFormFiller,
  nomProjetService,
  simulationTypeService,
  confortHospitalisationService,
  souscripteurService,
  enfantsService,
  conjointService,
  gammesService,
  dateEffetService,
  optionsService,
  navigationService
};

// Export par défaut
export default SwissLifeFormFiller;