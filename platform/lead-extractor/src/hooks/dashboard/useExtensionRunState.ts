import { useState, useEffect } from 'react';
import { ExtensionBridge } from '@/services/extension-bridge';

export interface ExtensionRunState {
  runActive: boolean;
  stoppingRun: boolean;
  isolatedCount: number;
  stoppingIsolated: boolean;
}

export const useExtensionRunState = () => {
  const [runActive, setRunActive] = useState(false);
  const [stoppingRun, setStoppingRun] = useState(false);
  const [isolatedCount, setIsolatedCount] = useState(0);
  const [stoppingIsolated, setStoppingIsolated] = useState(false);

  // Obtenir l'état du run/retry au montage
  useEffect(() => {
    (async () => {
      try {
        const s = await ExtensionBridge.getRunState();
        setRunActive(!!s?.active);
        const iso = await ExtensionBridge.getIsolatedState();
        setIsolatedCount(iso?.isolatedCount || 0);
      } catch { /* ignore */ }
    })();
  }, []);

  // Poll périodique de l'état run + retries isolés
  useEffect(() => {
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const [s, iso] = await Promise.all([
          ExtensionBridge.getRunState(),
          ExtensionBridge.getIsolatedState()
        ]);
        if (!cancelled) {
          setRunActive(!!s?.active);
          setIsolatedCount(iso?.isolatedCount || 0);
        }
      } catch { /* ignore */ }
    }, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const state: ExtensionRunState = {
    runActive,
    stoppingRun,
    isolatedCount,
    stoppingIsolated,
  };

  const actions = {
    setRunActive,
    setStoppingRun,
    setIsolatedCount,
    setStoppingIsolated,
  };

  return { state, actions };
};