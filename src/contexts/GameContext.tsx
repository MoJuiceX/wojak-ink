import { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@clerk/clerk-react';

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

interface GamePlayer {
  did: string;
  walletAddress: string;
  powerLevel: number;
  phase1Verified: boolean;
  votesToday: number;
  votesRemaining: number;
  voteStreak: number;
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
  verifyPhase1: (did: string, nftId?: string) => Promise<boolean>;
  castVote: (nftId: string, editionNumber: number, voteType: 1 | -1) => Promise<boolean>;
  loadFeed: () => Promise<void>;
  refreshPowerLevel: () => Promise<void>;
  getAuthHeaders: () => Promise<Record<string, string>>;
}

const GameContext = createContext<GameContextType | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be inside GameProvider');
  return ctx;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const clerkAuth = useAuth();
  const authResult = CLERK_ENABLED ? clerkAuth : { getToken: async () => null };
  const getTokenRef = useRef(authResult.getToken);
  getTokenRef.current = authResult.getToken;

  const [player, setPlayer] = useState<GamePlayer | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = await getTokenRef.current?.();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }, []);

  const register = useCallback(async (did: string, walletAddress: string) => {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/game/register', {
      method: 'POST',
      headers,
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
        voteStreak: data.player.voteStreak ?? 0,
        onboarding: data.player.onboarding,
      });
    }
  }, []);

  const verifyPhase1 = useCallback(async (did: string, nftId?: string) => {
    const headers = await getAuthHeaders();
    const payload: Record<string, string> = { did };
    if (nftId) payload.nftId = nftId;
    const res = await fetch('/api/game/verify-phase1', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
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
    const headers = await getAuthHeaders();
    const res = await fetch('/api/game/vote', {
      method: 'POST',
      headers,
      body: JSON.stringify({ voterDid: player.did, nftId, editionNumber, voteType }),
    });
    const data = await res.json();
    if (data.success) {
      setPlayer(prev => prev ? {
        ...prev,
        votesToday: prev.votesToday + 1,
        votesRemaining: data.votesRemaining,
        voteStreak: data.voteStreak ?? prev.voteStreak,
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
      setPlayer(prev => prev ? { ...prev, powerLevel: data.powerLevel, voteStreak: data.voteStreak ?? prev.voteStreak } : null);
    }
  }, [player]);

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
      getAuthHeaders,
    }}>
      {children}
    </GameContext.Provider>
  );
}
