import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { Lead } from '@/types/lead';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useLeadParsing() {
  const [showParsingDetails, setShowParsingDetails] = useState(false);
  const [parsingResult, setParsingResult] = useState<any>(null);
  const [parsing, setParsing] = useState(false);

  const parseCurrentLead = async (lead: Lead) => {
    if (showParsingDetails && parsingResult) {
      // Si déjà ouvert, on ferme
      setShowParsingDetails(false);
      setParsingResult(null);
      return;
    }

    // Sinon on lance le parsing
    setParsing(true);
    
    const requestBody = {
      content: lead.fullContent || lead.rawSnippet || '',
      subject: lead.emailSubject || '',
      date: lead.emailDate || lead.extractedAt,
      from: (lead as any).emailFrom || '',
      sourceHint: lead.source || ''
    };
    
    try {
      const response = await fetch(`${API_URL}/api/ingest/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Parsing failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Utiliser soit parsingDetails soit directement data selon la structure de réponse
      const resultData = data.parsingDetails || data;
      
      setParsingResult(resultData);
      setShowParsingDetails(true);
      toast.success('Parsing réalisé avec succès');
    } catch (error) {
      console.error('Parsing error:', error);
      toast.error(`Erreur lors du parsing: ${error.message}`);
    } finally {
      setParsing(false);
    }
  };

  const resetParsing = useCallback(() => {
    setShowParsingDetails(false);
    setParsingResult(null);
  }, []);

  return {
    showParsingDetails,
    parsingResult,
    parsing,
    parseCurrentLead,
    resetParsing
  };
}