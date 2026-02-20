// Auto-registration bridge between SageWallet and GameContext.
// Detects DID from connected wallet via getDIDs(), registers if not already registered.
// When Clerk is enabled and user is signed in, do not overwrite the Clerk-linked player.
// Phase 1 verification is handled by GateChecklist (not here, to avoid duplicate calls).
// Renders nothing — pure side-effect component.

import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useSageWallet } from '@/sage-wallet';
import { useGame } from '@/contexts/GameContext';

const MAX_DID_RETRIES = 3;
const RETRY_DELAY_MS = 3000;
const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export function SwipeAutoRegister() {
  const { address, status, getDIDs } = useSageWallet();
  const { isRegistered, player, register, resetPlayer } = useGame();
  const { isSignedIn } = useAuth();
  const attemptedRef = useRef(false);
  const lastAddressRef = useRef<string | null>(null);

  const clerkBackedPlayer = CLERK_ENABLED && isSignedIn && player;

  // Reset when wallet address changes so re-registration can occur (skip if player is Clerk-backed)
  useEffect(() => {
    if (clerkBackedPlayer) return;
    if (address && lastAddressRef.current && address !== lastAddressRef.current) {
      attemptedRef.current = false;
      resetPlayer();
    }
    lastAddressRef.current = address || null;
  }, [address, resetPlayer, clerkBackedPlayer]);

  // Also reset if player's wallet doesn't match connected wallet (skip if player is Clerk-backed)
  useEffect(() => {
    if (clerkBackedPlayer) return;
    if (player && address && player.walletAddress !== address) {
      attemptedRef.current = false;
      resetPlayer();
    }
  }, [player, address, resetPlayer, clerkBackedPlayer]);

  // Auto-register: detect DID and register player
  // Skip when Clerk is signed in and we already have a player (from /api/game/me)
  useEffect(() => {
    if (clerkBackedPlayer) return;
    if (status !== 'connected' || !address || isRegistered || attemptedRef.current) return;
    // If sessionStorage has a cached session for this address, let GameProvider restore it
    try {
      const raw = sessionStorage.getItem('wojak_game_session');
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached.walletAddress === address) return;
      }
    } catch { /* ignore */ }
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
  }, [status, address, isRegistered, getDIDs, register, clerkBackedPlayer]);

  return null;
}
