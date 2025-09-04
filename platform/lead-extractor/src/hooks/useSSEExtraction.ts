import { useState } from 'react';
import { StorageManager } from '@/lib/storage';
import { ExtensionBridge } from '@/services/extension-bridge';
import { appendAutoLog } from '@/utils/automation-log';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
export const useSSEExtraction = (addLeads: any, checkAuthStatus: any) => {
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

  const extractWithSSE = async (source: any, days: any, replaceAll = false, dateRange?: any) => {
    const authResult = await checkAuthStatus();
    if (!authResult.authenticated) {
      toast.error('Authentification requise. Redirection...');
      window.location.href = `${API_URL}/auth/google/start`;
      return;
    }
    
    if (!authResult.hasTokens) {
      toast.error('Connexion Gmail requise. Redirection vers Google...', {
        description: 'Vous devez autoriser l\'accès à votre compte Gmail pour extraire les emails.'
      });
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

    // Construire l'endpoint selon le mode
    let endpoint: string;
    if (dateRange?.from && dateRange?.to) {
      // Mode dates personnalisées
      const fromDate = dateRange.from.toISOString().split('T')[0]; // YYYY-MM-DD
      const toDate = dateRange.to.toISOString().split('T')[0];
      endpoint = `${API_URL}/api/ingest/gmail/stream?fromDate=${fromDate}&toDate=${toDate}`;
    } else {
      // Mode nombre de jours
      endpoint = `${API_URL}/api/ingest/gmail/stream?days=${days}`;
    }
    // Envoyer les cookies d'auth (stateless) avec la requête SSE
    const eventSource = new EventSource(endpoint, { withCredentials: true });
    let collectedLeads = [];

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'final') {
          collectedLeads = data.leads || [];
          eventSource.close();
          
          // Ajouter les leads avec statistiques détaillées
          const { addedQualified, addedNon, totalAdded } = addLeads(collectedLeads, replaceAll);
          StorageManager.updateLastSync(source);

          // Toast avec informations claires
          const message = replaceAll 
            ? `Base mise à jour : ${addedQualified} lead(s) qualifié(s) et ${addedNon} non-lead(s)`
            : `${addedQualified} lead(s) qualifié(s) et ${addedNon} non-lead(s) trouvés (${totalAdded} ajoutés après déduplication)`;
          toast.success(message);

          setShowProgress(false);
          end();

          // Auto-envoi après extraction (par défaut 2 minutes)
          try {
            const raw = localStorage.getItem('autopilot_settings_v1');
            const ap = raw ? JSON.parse(raw) : {};
            const enabled = ap.postExtractAutoSendEnabled !== false; // par défaut ON
            const delayMs = typeof ap.postExtractAutoSendDelayMs === 'number' ? ap.postExtractAutoSendDelayMs : 120000;
            if (enabled && addedQualified > 0) {
              const qualifiedJustExtracted = (collectedLeads || []).filter((l: any) => (l?.score ?? 0) >= 3);
              if (qualifiedJustExtracted.length > 0) {
                const when = new Date(Date.now() + delayMs);
                appendAutoLog({ ts: new Date().toISOString(), type: 'send', ok: true, message: `Planification d'un envoi auto dans ${Math.round(delayMs/1000)}s (${qualifiedJustExtracted.length} lead(s))` });
                toast.info(`Auto‑envoi dans ${Math.round(delayMs/1000)}s`, { description: `${qualifiedJustExtracted.length} lead(s) seront envoyés à l'extension` });
                setTimeout(async () => {
                  try {
                    const installed = await ExtensionBridge.checkExtensionInstalled();
                    if (!installed) return;
                    await ExtensionBridge.sendLeadsToExtension(qualifiedJustExtracted as any);
                    appendAutoLog({ ts: new Date().toISOString(), type: 'send', ok: true, message: `Envoi post-extraction de ${qualifiedJustExtracted.length} lead(s)` });
                  } catch (e: any) {
                    appendAutoLog({ ts: new Date().toISOString(), type: 'send', ok: false, message: e?.message || 'Erreur envoi post-extraction' });
                  }
                }, delayMs);
              }
            }
          } catch (_) {}
        } else {
          // Updates de progression
          setProgressPhase(data.phase || '');
          setProgressMessage(data.message || '');
          if (data.total) setProgressTotal(data.total);
          if (data.current !== undefined) setProgressCurrent(data.current);
        }
      } catch (error) {
        console.error('Erreur parsing JSON:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Erreur EventSource:', error);
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
