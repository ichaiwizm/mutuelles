// Re-export des fonctions principales depuis les modules spécialisés
export { convertLeadToSwissLife } from './swisslife/lead-converter';
export { convertLeadsToSwissLife } from './swisslife/batch-converter';

// Re-export des types pour la compatibilité
export type { ValidationResult } from './swisslife/validator';
export type { BatchConversionResult } from './swisslife/batch-converter';