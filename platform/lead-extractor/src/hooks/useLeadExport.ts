import { useState } from 'react';
import { toast } from 'sonner';
import type { Lead } from '@/types/lead';
import { convertLeadsToSwissLife } from '@/utils/swisslife-converter';
import { SwissLifeStorageManager } from '@/utils/localStorage-manager';

export interface ExportResult {
  successful: number;
  failed: number;
  warnings: string[];
  service: string;
}

export function useLeadExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);

  const exportLeads = async (selectedLeads: Lead[], service: string): Promise<ExportResult | null> => {
    if (selectedLeads.length === 0) {
      toast.error('Aucun lead sélectionné');
      return null;
    }

    setIsExporting(true);
    
    try {
      if (service === 'swisslife') {
        const conversionResults = convertLeadsToSwissLife(selectedLeads);
        
        if (conversionResults.successful.length === 0) {
          const result: ExportResult = {
            successful: 0,
            failed: conversionResults.failed.length,
            warnings: ['Aucun lead n\'a pu être converti avec succès'],
            service: 'SwissLife'
          };
          setExportResult(result);
          return result;
        }

        SwissLifeStorageManager.replaceLeads(conversionResults.successful);
        
        const result: ExportResult = {
          successful: conversionResults.successful.length,
          failed: conversionResults.failed.length,
          warnings: conversionResults.totalWarnings,
          service: 'SwissLife'
        };
        setExportResult(result);
        return result;
      }
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast.error('Erreur lors de l\'export');
      return null;
    } finally {
      setIsExporting(false);
    }

    return null;
  };

  return {
    isExporting,
    exportResult,
    exportLeads,
    setExportResult
  };
}