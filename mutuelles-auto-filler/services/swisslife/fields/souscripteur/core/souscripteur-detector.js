/**
 * Détecteur de souscripteur - Détection des éléments DOM du formulaire
 * Responsable de trouver les éléments du formulaire souscripteur/assuré principal
 */

import { qa, isVisible } from '../../../utils/dom-utils.js';
import { T, findByLabelLike, findFirstExisting } from '../../../utils/form-utils.js';

/**
 * Trouve l'élément date de naissance
 */
export function findDateElement() {
  return findFirstExisting(['#date-naissance-assure-principal', '[name="client.dateNaissance"]', 'input[id*="date-naiss"]']);
}

/**
 * Trouve le sélecteur régime social
 */
export function findRegimeSelect() {
  return findFirstExisting(['#regime-social-assure-principal', '[name="client.regimeSocial"]']);
}

/**
 * Trouve le sélecteur statut
 */
export function findStatutSelect() {
  return findFirstExisting(['#statut-assure-principal', '[name="client.statut"]']);
}

/**
 * Trouve le sélecteur profession
 */
export function findProfessionSelect() {
  return findFirstExisting(['#profession-assure-principal', '[name="client.profession"]']);
}

/**
 * Trouve le sélecteur département
 */
export function findDepartementSelect() {
  const direct = findFirstExisting(['#departement-assure-principal', '[name="client.departement"]']);
  if (direct) return direct;
  
  // Recherche alternative par label
  const byLabel = findByLabelLike(/d[ée]partement/i);
  if (byLabel && byLabel.tagName === 'SELECT') return byLabel;
  
  // Recherche dans les selects visibles contenant des codes département
  const selects = qa('select').filter(isVisible);
  return selects.find(sel => {
    const opts = [...sel.options].map(o => T(o.text)).join(' ');
    return /\b(75|77|78|91|92|93|94|95)\b/.test(opts);
  });
}

/**
 * Vérifie si tous les éléments essentiels sont présents et visibles
 */
export function hasEssentialElements() {
  const elements = {
    dateNaissance: findDateElement(),
    regimeSocial: findRegimeSelect(),
    statut: findStatutSelect(),
    departement: findDepartementSelect()
  };
  
  const missing = Object.entries(elements)
    .filter(([_, el]) => !el)
    .map(([key]) => key);
  
  const hidden = Object.entries(elements)
    .filter(([_, el]) => el && !isVisible(el))
    .map(([key]) => key);
  
  return { 
    ready: missing.length === 0 && hidden.length === 0,
    missing,
    hidden,
    elements
  };
}