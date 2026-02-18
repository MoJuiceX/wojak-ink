// Auto-registration bridge between SageWallet and GameContext.
// Detects DID from connected wallet via getDIDs(), registers if not already registered.
// Phase 1 verification is handled by GateChecklist (not here, to avoid duplicate calls).
// Renders nothing — pure side-effect component.

import { useEffect, useRef } from 'react';
import { useSageWallet } from '@/sage-wallet';
import { useGame } from '@/contexts/GameContext';

const MAX_DID_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

export function SwipeAutoRegister() {
  const { address, status, getDIDs } = useSageWallet();
  const { isRegistered, register } = useGame();
  const attemptedRef = useRef(false);

  // Auto-register: detect DID and register player
  useEffect(() => {
    if (status !== 'connected' || !address || isRegistered || attemptedRef.current) return;
    attemptedRef.current = true;

    let cancelled = false;

    (async () => {
      for (let attempt = 0; attempt < MAX_DID_RETRIES; attempt++) {
        if (cancelled) return;
        try {
          const dids = await getDIDs();
          if (dids.length > 0) {
            await register(dids[0], address);
            return;
          }
          if (attempt < MAX_DID_RETRIES - 1) {
            await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
          }
        } catch (err) {
          console.error('[SwipeAutoRegister] Auto-registration failed:', err);
          attemptedRef.current = false;
          return;
        }
      }
      console.warn('[SwipeAutoRegister] No DID found after', MAX_DID_RETRIES, 'attempts');
      attemptedRef.current = false;
    })();

    return () => { cancelled = true; };
  }, [status, address, isRegistered, getDIDs, register]);

  return null;
}
