import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useSageWallet } from '@/sage-wallet';

interface GamePlayer {
  did: string;
  walletAddress: string;
  powerLevel: number;
  phase1Verified: boolean;
  votesToday: number;
  votesRemaining: number;
  onboarding: {
    did: boolean;
    phase1: boolean;
    minted: boolean;
    voted: boolean;
    battled: boolean;
  };
}

interface FeedItem {
  nftId: string;
  editionNumber: number;
  creatorWallet: string;
  name: string;
  customName: string | null;
  imageUri: string;
  totalVotes: number;
  likes: number;
  dislikes: number;
}

interface GameContextType {
  player: GamePlayer | null;
  isRegistered: boolean;
  isVerified: boolean;
  feed: FeedItem[];
  feedLoading: boolean;
  register: (did: string, walletAddress: string) => Promise<void>;
  verifyPhase1: (did: string) => Promise<boolean>;
  castVote: (nftId: string, editionNumber: number, voteType: 1 | -1) => Promise<boolean>;
  loadFeed: () => Promise<void>;
  refreshPowerLevel: () => Promise<void>;
}

const GameContext = createContext<GameContextType | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be inside GameProvider');
  return ctx;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<GamePlayer | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);

  const register = useCallback(async (did: string, walletAddress: string) => {
    const res = await fetch('/api/game/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ did, walletAddress }),
    });
    const data = await res.json();
    if (data.success) {
      setPlayer({
        did: data.player.did,
        walletAddress: walletAddress,
        powerLevel: data.player.powerLevel,
        phase1Verified: data.player.phase1Verified,
        votesToday: data.player.votesToday,
        votesRemaining: 10 - data.player.votesToday,
        onboarding: data.player.onboarding,
      });
    }
  }, []);

  const verifyPhase1 = useCallback(async (did: string) => {
    const res = await fetch('/api/game/verify-phase1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ did }),
    });
    const data = await res.json();
    if (data.verified && player) {
      setPlayer({ ...player, phase1Verified: true, onboarding: { ...player.onboarding, phase1: true } });
    }
    return data.verified;
  }, [player]);

  const loadFeed = useCallback(async () => {
    if (!player) return;
    setFeedLoading(true);
    try {
      const res = await fetch(`/api/game/feed?did=${player.did}&limit=10`);
      const data = await res.json();
      if (data.success) {
        setFeed(data.feed);
      }
    } finally {
      setFeedLoading(false);
    }
  }, [player]);

  const castVote = useCallback(async (nftId: string, editionNumber: number, voteType: 1 | -1) => {
    if (!player) return false;
    const res = await fetch('/api/game/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voterDid: player.did, nftId, editionNumber, voteType }),
    });
    const data = await res.json();
    if (data.success) {
      setPlayer(prev => prev ? {
        ...prev,
        votesToday: prev.votesToday + 1,
        votesRemaining: data.votesRemaining,
      } : null);
      // Remove voted item from feed
      setFeed(prev => prev.filter(item => item.nftId !== nftId));
      return true;
    }
    return false;
  }, [player]);

  const refreshPowerLevel = useCallback(async () => {
    if (!player) return;
    const res = await fetch(`/api/game/power-level?did=${player.did}`);
    const data = await res.json();
    if (data.success) {
      setPlayer(prev => prev ? { ...prev, powerLevel: data.powerLevel } : null);
    }
  }, [player]);

  // Auto-register: when wallet connects, look up DID from MintGarden and register
  const { address, status: walletStatus } = useSageWallet();
  const autoRegisterAttempted = useRef(false);

  useEffect(() => {
    if (walletStatus !== 'connected' || !address || player || autoRegisterAttempted.current) return;
    autoRegisterAttempted.current = true;

    (async () => {
      try {
        // Query MintGarden for any NFTs owned by this address — the response includes owner_did
        const res = await fetch(
          `https://api.mintgarden.io/address/${address}/nfts?type=owned&size=1`
        );
        if (!res.ok) return;
        const data = await res.json();
        const firstNft = data?.items?.[0];
        const did = firstNft?.owner_did;
        if (did && typeof did === 'string' && did.startsWith('did:chia:')) {
          await register(did, address);
        }
      } catch {
        // Silent — user can still register manually
      }
    })();
  }, [walletStatus, address, player, register]);

  return (
    <GameContext.Provider value={{
      player,
      isRegistered: !!player,
      isVerified: !!player?.phase1Verified,
      feed,
      feedLoading,
      register,
      verifyPhase1,
      castVote,
      loadFeed,
      refreshPowerLevel,
    }}>
      {children}
    </GameContext.Provider>
  );
}
