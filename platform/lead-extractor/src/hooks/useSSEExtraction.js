import { useState } from 'react';
import { StorageManager } from '@/lib/storage';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const MIN_SCORE = 3;

export const useSSEExtraction = (addLeads, checkAuthStatus) => {
  const [showProgress, setShowProgress] = useState(false);
  const [progressPhase, setProgressPhase] = useState('');
  const [progressMessage, setProgressMessage] = useState('');
  const [progressSource, setProgressSource] = useState(null);
  const [progressTotal, setProgressTotal] = useState(0);
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [pendingOps, setPendingOps] = useState(0);

  const begin = () => setPendingOps(n => n + 1);
  const end = () => setPendingOps(n => Math.max(0, n - 1));
  const busy = pendingOps > 0;

  const extractWithSSE = async (source, days) => {
    const authOk = await checkAuthStatus();
    if (!authOk) {
      toast.error('Authentification requise. Redirection...');
      window.location.href = `${API_URL}/auth/google/start`;
      return;
    }

    begin();
    setProgressSource(source);
    setProgressPhase('Connexion...');
    setProgressMessage('');
    setProgressTotal(0);
    setProgressCurrent(0);
    setShowProgress(true);

    const endpoint = `${API_URL}/api/ingest/gmail/stream?days=${days}`;

    const eventSource = new EventSource(endpoint);
    let collectedLeads = [];

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'final') {
        collectedLeads = data.leads || [];
        eventSource.close();
        
        // Ajouter les leads avec statistiques détaillées
        const { allLeads: after, addedQualified, addedNon, dedupMerged } = addLeads(collectedLeads);
        StorageManager.updateLastSync(source);

        // Toast avec données post-déduplication
        const dedupInfo = dedupMerged > 0 ? ` (${dedupMerged} doublon(s) fusionnés)` : '';
        toast.success(
          `${addedQualified} lead(s) qualifié(s) et ${addedNon} non-lead(s) ajoutés${dedupInfo}`
        );

        setShowProgress(false);
        end();
      } else {
        // Updates de progression
        setProgressPhase(data.phase || '');
        setProgressMessage(data.message || '');
        if (data.total) setProgressTotal(data.total);
        if (data.current !== undefined) setProgressCurrent(data.current);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      eventSource.close();
      toast.error('Erreur lors de l\'extraction Gmail');
      setShowProgress(false);
      end();
    };
  };

  return {
    showProgress,
    progressPhase,
    progressMessage,
    progressSource,
    progressTotal,
    progressCurrent,
    busy,
    extractWithSSE
  };
};