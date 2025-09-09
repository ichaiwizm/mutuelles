/**
 * Provides an executeAction function for the current provider (content-side)
 */
import { detectProviderFromLocation, Providers } from './registry.js';

export async function getExecuteActionForCurrentProvider() {
  const { providerId } = detectProviderFromLocation();
  if (!providerId) throw new Error('Provider inconnu pour cette page');
  const adapter = Providers[providerId];
  return async function executeAction(stepName, data) {
    return await adapter.executeAction(stepName, data);
  };
}
