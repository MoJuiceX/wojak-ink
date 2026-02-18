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
  const { isRegistered, player, register, resetPlayer } = useGame();
  const attemptedRef = useRef(false);
  const lastAddressRef = useRef<string | null>(null);

  // Reset when wallet address changes so re-registration can occur
  useEffect(() => {
    if (address && lastAddressRef.current && address !== lastAddressRef.current) {
      attemptedRef.current = false;
      resetPlayer();
    }
    lastAddressRef.current = address || null;
  }, [address, resetPlayer]);

  // Also reset if player's wallet doesn't match connected wallet
  useEffect(() => {
    if (player && address && player.walletAddress !== address) {
      attemptedRef.current = false;
      resetPlayer();
    }
  }, [player, address, resetPlayer]);

  // Auto-register: detect DID and register player
  useEffect(() => {
    if (status !== 'connected' || !address || isRegistered || attemptedRef.current) return;
    attemptedRef.current = true;

    let cancelled = false;

    (async () => {
      console.log('[SwipeAutoRegister] Starting auto-registration for', address);
      for (let attempt = 0; attempt < MAX_DID_RETRIES; attempt++) {
        if (cancelled) return;
        try {
          const dids = await getDIDs();
          console.log('[SwipeAutoRegister] getDIDs attempt', attempt + 1, ':', dids);
          if (dids.length > 0) {
            await register(dids[0], address);
            console.log('[SwipeAutoRegister] Registration succeeded for DID:', dids[0]);
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
