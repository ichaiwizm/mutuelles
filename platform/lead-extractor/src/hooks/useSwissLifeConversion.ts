import { useMemo } from 'react';
import type { Lead } from '@/types/lead';
import { convertLeadsToSwissLife } from '@/utils/swisslife-converter';

export function useSwissLifeConversion(leads: Lead[]) {
  const conversionResults = useMemo(() => {
    if (leads.length === 0) return null;
    return convertLeadsToSwissLife(leads);
  }, [leads]);

  const totalConverted = conversionResults?.successful.length || 0;
  const hasFailures = (conversionResults?.failed.length || 0) > 0;
  const hasWarnings = (conversionResults?.totalWarnings.length || 0) > 0;

  return {
    conversionResults,
    totalConverted,
    hasFailures,
    hasWarnings,
  };
}