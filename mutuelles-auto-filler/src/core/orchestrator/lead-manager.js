/**
 * Gestionnaire des leads - Chargement et accès aux données des leads
 */

let availableLeads = [];

/**
 * Charge les leads depuis chrome.storage
 */
export async function loadLeads() {
  try {
    const result = await chrome.storage.local.get(['swisslife_leads']);
    
    if (result.swisslife_leads && Array.isArray(result.swisslife_leads)) {
      availableLeads = result.swisslife_leads;
      console.log('✅ Leads chargés depuis chrome.storage:', availableLeads.length, 'leads');
      
      return availableLeads;
    } else {
      availableLeads = [];
      console.log('❌ Aucun lead trouvé dans chrome.storage');
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