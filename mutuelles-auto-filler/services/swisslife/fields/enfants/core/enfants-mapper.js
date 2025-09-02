/**
 * Mappeur d'enfants - Logique de mapping et structuration des données
 * Responsable des conversions de format, mapping ayants droits, etc.
 */

import { qa, isVisible } from '../../../utils/dom-utils.js';
import { getChildDateEl, getChildAyantSel } from './enfants-detector.js';

// Configuration par défaut - Mode loose comme dans le script manuel
export const DEFAULT_CONFIG = {
  nbEnfants: 0,
  enfants: [],
  MODE: "loose" // "visible" ou "loose" - loose par défaut pour plus de robustesse
};

/**
 * Paires d'enfants visibles (interface rendue)
 */
export function visibleChildPairs() {
  const dateSel = [
    'input[id*="enfant"][id*="naiss"]',
    'input[name*="enfant"][name*="naiss"]',
    'input[id*="enfants"][id*="naiss"]',
    'input[name*="enfants"][name*="naiss"]',
    'input[id*="date-naissance"][id*="enfant"]',
    '#contrat-enfants-0-date-naissance,#contrat-enfants-1-date-naissance,#contrat-enfants-2-date-naissance,#contrat-enfants-3-date-naissance'
  ].join(',');
  
  const ayantSel = [
    'select[id*="ayant"]',
    'select[name*="ayant"]',
    'select[id*="idAyantDroit"]',
    'select[name*="idAyantDroit"]',
    '#enfants-0-idAyantDroit,#enfants-1-idAyantDroit,#enfants-2-idAyantDroit,#enfants-3-idAyantDroit'
  ].join(',');
  
  const dates = qa(dateSel).filter(isVisible);
  const ayants = qa(ayantSel).filter(isVisible);
  
  // Classer par position à l'écran
  const pos = el => (el.getBoundingClientRect().top * 10000 + el.getBoundingClientRect().left);
  dates.sort((a, b) => pos(a) - pos(b));
  ayants.sort((a, b) => pos(a) - pos(b));
  
  const n = Math.min(dates.length, ayants.length);
  const pairs = [];
  for (let i = 0; i < n; i++) {
    pairs.push({
      index: i,
      date: dates[i],
      ayant: ayants[i]
    });
  }
  return pairs;
}

/**
 * Paires d'enfants en mode loose (par index)
 */
export function looseChildPairs(n) {
  const pairs = [];
  for (let i = 0; i < n; i++) {
    pairs.push({
      index: i,
      date: getChildDateEl(i),
      ayant: getChildAyantSel(i)
    });
  }
  return pairs;
}

/**
 * Convertit le format bridge vers le format interne
 */
export function mapBridgeConfigToInternal(cfg, hasConjoint = false) {
  const nbEnfants = parseInt(cfg.nbEnfants) || 0;
  const enfants = [];
  
  // Si on a déjà un tableau d'enfants structuré
  if (cfg.enfants && Array.isArray(cfg.enfants)) {
    enfants.push(...cfg.enfants);
  } else {
    // Format simple avec enfant1, enfant2, etc.
    for (let i = 1; i <= nbEnfants; i++) {
      const dateKey = `enfant${i}`;
      const ayantKey = `enfant${i}Ayant`;
      const dateNaissance = cfg[dateKey];
      
      if (dateNaissance) {
        // Déterminer l'ayant droit
        let ayantDroit = cfg[ayantKey] || cfg.ayantDroitDefaut;
        
        if (!ayantDroit) {
          // Logique par défaut : alternance CLIENT/CONJOINT si conjoint présent
          // Sinon tous CLIENT
          if (cfg.hasConjoint || cfg.simulationType === 'couple' || hasConjoint) {
            // Alternance : premier enfant CLIENT, deuxième CONJOINT, etc.
            ayantDroit = (i % 2 === 1) ? "CLIENT" : "CONJOINT";
          } else {
            ayantDroit = "CLIENT";
          }
        }
        
        enfants.push({ 
          dateNaissance,
          ayantDroit
        });
      }
    }
  }
  
  return {
    nbEnfants,
    enfants,
    MODE: cfg.MODE || 'loose'
  };
}

/**
 * Mapping des ayants droits pour SwissLife
 */
export const AYANT_MAPPING = {
  'CLIENT': ['CLIENT', 'Assuré principal', 'Titulaire'],
  'CONJOINT': ['CONJOINT', 'Conjoint', 'Partenaire'],
  '1': ['CLIENT', 'Assuré principal'],  // Compatibilité legacy
  '0': ['CONJOINT', 'Conjoint']  // Compatibilité legacy
};

/**
 * Obtient les synonymes pour un ayant droit
 */
export function getAyantSynonyms(ayantDroit) {
  return AYANT_MAPPING[ayantDroit] || [ayantDroit];
}