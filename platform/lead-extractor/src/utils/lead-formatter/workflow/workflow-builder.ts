// Module de génération des workflows SwissLife

import type { Lead } from '@/types/lead';
import type { TestDataLead, TestDataWorkflow, WorkflowEtape, SimulationType, ContractOptions } from '../types';
import { ConfigValueHelper, type SwissLifeConfig } from '../../service-config';
import { formatDate } from '../formatters/date-formatter';

// Fonction pour déterminer la date d'effet avec configuration
export function getDateEffet(lead: Lead, config: SwissLifeConfig): string {
  // Utiliser la date forcée de la configuration si définie
  if (config.forceValues.dateEffet && config.forceValues.dateEffet !== 'auto') {
    return ConfigValueHelper.resolveDateEffet(config.forceValues.dateEffet);
  }
  
  // Utiliser la date d'effet du lead si disponible
  if (lead.besoins?.dateEffet) {
    const formatted = formatDate(lead.besoins.dateEffet);
    if (formatted) return formatted;
  }
  
  // Sinon, utiliser la valeur par défaut de la configuration
  return ConfigValueHelper.resolveDateEffet(config.forceValues.dateEffet);
}

// Fonction pour déterminer le type de simulation
export function getSimulationType(lead: Lead): SimulationType {
  // Si conjoint présent avec date de naissance
  if (lead.conjoint?.dateNaissance) {
    return 'couple';
  }
  
  return 'individuel';
}

// Fonction pour déterminer les options avec configuration
export function getOptions(_lead: Lead, _statut: string, config: SwissLifeConfig): ContractOptions {
  const options = {
    // Madelin pour tous selon la configuration
    madelin: config.options.madelin,
    resiliation: config.options.resiliation,
    reprise: config.options.reprise
  };
  
  // Logique métier: si reprise = oui, alors résiliation = oui
  if (options.reprise === 'oui' && options.resiliation === 'non') {
    options.resiliation = 'oui';
  }
  
  return options;
}

// Fonction pour générer le workflow dynamique
export function generateWorkflow(lead: TestDataLead, config: SwissLifeConfig): TestDataWorkflow {
  const etapes: WorkflowEtape[] = [];
  let order = 1;

  // Étape 1: projectName (toujours)
  const projectNameTemplate = (lead as any).projectName && (lead as any).projectName.trim().length > 0
    ? '{{lead.projectName}}'
    : `Simulation {{lead.nom}} {{lead.prenom}}`;
  etapes.push({
    order: order++,
    name: 'projectName',
    service: 'nom-projet-service',
    required: true,
    data: {
      value: projectNameTemplate
    }
  });

  // Étape 2: hospitalComfort (toujours)
  etapes.push({
    order: order++,
    name: 'hospitalComfort',
    service: 'confort-hospitalisation-service',
    required: true,
    data: {
      value: config.forceValues.hospitalComfort || 'non'
    }
  });

  // Étape 3: simulationType (seulement pour les couples)
  const simulationType = lead.conjoint ? 'couple' : 'individuel';
  if (simulationType === 'couple') {
    etapes.push({
      order: order++,
      name: 'simulationType',
      service: 'simulation-type-service',
      required: true,
      data: {
        value: 'couple'
      }
    });
  }

  // Étape 4: subscriberInfo (toujours)
  etapes.push({
    order: order++,
    name: 'subscriberInfo',
    service: 'souscripteur-service',
    required: true,
    autoResolve: true,
    validate: true,
    data: {
      regime: '{{resolver.regime}}',
      statut: '{{resolver.statut}}',
      profession: '{{resolver.profession}}',
      dateNaissance: '{{resolver.dateNaissance}}',
      departement: '{{resolver.departement}}'
    }
  });

  // Étape 5: spouseInfo (si conjoint)
  if (lead.conjoint) {
    etapes.push({
      order: order++,
      name: 'spouseInfo',
      service: 'conjoint-service',
      required: false,
      condition: '{{lead.conjoint}}',
      autoResolve: true,
      validate: true,
      data: {
        regime: '{{spouseResolver.regime}}',
        statut: '{{spouseResolver.statut}}',
        profession: '{{spouseResolver.profession}}',
        dateNaissance: '{{lead.conjoint.dateNaissance}}',
        departement: '{{spouseResolver.departement}}'
      }
    });
  }

  // Étape 6: childrenInfo (si enfants)
  if (lead.souscripteur.nombreEnfants > 0) {
    const childrenData: Record<string, any> = {
      nbEnfants: '{{lead.souscripteur.nombreEnfants}}'
    };
    
    // Ajouter jusqu'à 3 enfants
    for (let i = 0; i < Math.min(3, lead.souscripteur.nombreEnfants); i++) {
      childrenData[`enfant${i + 1}`] = `{{lead.enfants.${i}.dateNaissance}}`;
    }
    
    etapes.push({
      order: order++,
      name: 'childrenInfo',
      service: 'enfants-service',
      required: false,
      condition: '{{lead.souscripteur.nombreEnfants > 0}}',
      data: childrenData
    });
  }

  // Étape 7: gammes (toujours)
  etapes.push({
    order: order++,
    name: 'gammes',
    service: 'gammes-service',
    required: true,
    data: {
      value: config.forceValues.gammes || 'SwissLife Santé'
    }
  });

  // Étape 8: options (toujours)
  const options = getOptions({} as Lead, 'TNS', config);
  etapes.push({
    order: order++,
    name: 'options',
    service: 'options-service',
    required: true,
    data: {
      madelin: options.madelin,
      resiliation: options.resiliation
    }
  });

  // Étape 9: dateEffet (toujours)
  etapes.push({
    order: order++,
    name: 'dateEffet',
    service: 'date-effet-service',
    required: true,
    data: {
      value: ConfigValueHelper.resolveDateEffet(config.forceValues.dateEffet)
    }
  });

  // Étape 10: navigation (toujours)
  etapes.push({
    order: order++,
    name: 'navigation',
    service: 'navigation-service',
    required: true,
    data: {
      action: 'next'
    }
  });

  return { etapes };
}
