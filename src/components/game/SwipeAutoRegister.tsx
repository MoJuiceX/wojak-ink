// Auto-registration bridge between SageWallet and GameContext.
// Detects DID from connected wallet via getDIDs(), registers if not already registered.
// Renders nothing — pure side-effect component.

import { useEffect, useRef } from 'react';
import { useSageWallet } from '@/sage-wallet';
import { useGame } from '@/contexts/GameContext';

export function SwipeAutoRegister() {
  const { address, status, getDIDs } = useSageWallet();
  const { isRegistered, register } = useGame();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (status !== 'connected' || !address || isRegistered || attemptedRef.current) return;
    attemptedRef.current = true;

    getDIDs()
      .then(dids => {
        if (dids.length > 0) {
          return register(dids[0], address);
        }
      })
      .catch(err => {
        console.error('[SwipeAutoRegister] Auto-registration failed:', err);
        attemptedRef.current = false; // Allow retry
      });
  }, [status, address, isRegistered, getDIDs, register]);

  return null;
}
