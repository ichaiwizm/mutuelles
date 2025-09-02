// Module de storage legacy pour la compatibilité

import type { Lead } from '@/types/lead';
import type { TestDataFormat } from '../types';
import { ServiceConfigManager } from '../../service-config';

// Fonction pour formater plusieurs leads (utilisée par le storage)
export function formatMultipleLeadsForStorage(leads: Lead[], formatLeadFunction: (lead: Lead) => TestDataFormat): Record<string, TestDataFormat> {
  const formattedLeads: Record<string, TestDataFormat> = {};
  
  for (const lead of leads) {
    if (lead.id) {
      formattedLeads[lead.id] = formatLeadFunction(lead);
    }
  }
  
  return formattedLeads;
}

// Fonction pour sauvegarder dans localStorage
// DEPRECATED: Cette fonction est maintenant remplacée par ExtensionBridge.sendLeadsToExtension()
// Conservée temporairement pour compatibilité
export function saveFormattedLeadsToStorage(leads: Lead[], formatMultipleFunction: (leads: Lead[]) => Record<string, TestDataFormat>): void {
  console.warn('saveFormattedLeadsToStorage is deprecated. Use ExtensionBridge.sendLeadsToExtension() instead.');
  
  const config = ServiceConfigManager.getServiceConfig('swisslife');
  const formattedLeads = formatMultipleFunction(leads);
  
  // Sauvegarder avec un timestamp dans l'ancien format pour compatibilité
  const storageData = {
    timestamp: new Date().toISOString(),
    count: Object.keys(formattedLeads).length,
    leads: formattedLeads,
    config: config
  };
  
  // Sauvegarder avec la clé par défaut
  localStorage.setItem('swisslife_formatted_leads', JSON.stringify(storageData));
  console.log(`📦 ${Object.keys(formattedLeads).length} leads formatés et sauvegardés dans localStorage (format legacy)`);
}

// Fonction pour récupérer les leads formatés du localStorage
export function getFormattedLeadsFromStorage(): Record<string, TestDataFormat> | null {
  const stored = localStorage.getItem('swisslife_formatted_leads');
  if (!stored) return null;
  
  try {
    const data = JSON.parse(stored);
    return data.leads;
  } catch {
    return null;
  }
}