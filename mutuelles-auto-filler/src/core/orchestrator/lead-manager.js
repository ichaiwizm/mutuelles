/**
 * Gestionnaire des leads - Chargement et accès aux données des leads
 */

import { KEYS } from './storage-keys.js';

let availableLeads = [];

/**
 * Charge les leads depuis chrome.storage
 */
export async function loadLeads() {
  try {
    const leadsKey = KEYS.LEADS();
    const result = await chrome.storage.local.get([leadsKey]);
    
    if (result[leadsKey] && Array.isArray(result[leadsKey])) {
      availableLeads = result[leadsKey];
      console.log(`✅ Leads chargés depuis chrome.storage (clé: ${leadsKey}):`, availableLeads.length, 'leads');
      
      return availableLeads;
    } else {
      availableLeads = [];
      console.log(`❌ Aucun lead trouvé dans chrome.storage (clé: ${leadsKey})`);
      return [];
    }
  } catch (error) {
    console.error('❌ Erreur chargement leads:', error.message);
    availableLeads = [];
    return [];
  }
}

/**
 * Obtient la liste des leads disponibles
 */
export function getAvailableLeads() {
  return availableLeads;
}

/**
 * Obtient un lead par son index
 */
export function getLeadByIndex(index) {
  if (index < 0 || index >= availableLeads.length) {
    return null;
  }
  return availableLeads[index];
}

/**
 * Obtient le nombre total de leads
 */
export function getLeadsCount() {
  return availableLeads.length;
}

/**
 * Valide qu'un index de lead est valide
 */
export function isValidLeadIndex(index) {
  return index >= 0 && index < availableLeads.length;
}