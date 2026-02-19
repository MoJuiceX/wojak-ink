import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

const SESSION_KEY = 'wojak_game_session';
const GUEST_ID_KEY = 'wojak_guest_id';
const GUEST_VOTES_KEY = 'wojak_guest_votes';

// Daily limits
const DAILY_LIMIT_HOLDER = 20;
const DAILY_LIMIT_FREE = 5;

// Generate or retrieve stable guest ID
function getGuestId(): string {
  try {
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id) {
      id = 'guest_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      localStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
  } catch {
    // Fallback if localStorage not available
    return 'guest_' + Math.random().toString(36).slice(2, 18);
  }
}

// Get today's date string for tracking
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// Track guest votes in localStorage
function getGuestVotesToday(): number {
  try {
    const data = localStorage.getItem(GUEST_VOTES_KEY);
    if (!data) return 0;
    const { date, count } = JSON.parse(data);
    if (date !== getTodayString()) return 0;
    return count;
  } catch {
    return 0;
  }
}

function incrementGuestVotes(): number {
  try {
    const today = getTodayString();
    const data = localStorage.getItem(GUEST_VOTES_KEY);
    let count = 1;
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.date === today) {
        count = parsed.count + 1;
      }
    }
    localStorage.setItem(GUEST_VOTES_KEY, JSON.stringify({ date: today, count }));
    return count;
  } catch {
    return 1;
  }
}

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
  guestId: string;
  isRegistered: boolean;
  isVerified: boolean;
  isHolder: boolean;
  votesRemaining: number;
  dailyLimit: number;
  feed: FeedItem[];
  feedLoading: boolean;
  register: (did: string, walletAddress: string) => Promise<void>;
  resetPlayer: () => void;
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

/** Safe version that returns null when outside GameProvider */
export function useOptionalGame() {
  return useContext(GameContext);
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<GamePlayer | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [guestVotesToday, setGuestVotesToday] = useState(() => getGuestVotesToday());

  // Stable guest ID for this browser
  const [guestId] = useState(() => getGuestId());

  // Computed values
  const isHolder = !!player?.phase1Verified;
  const dailyLimit = isHolder ? DAILY_LIMIT_HOLDER : DAILY_LIMIT_FREE;
  const votesRemaining = player
    ? player.votesRemaining
    : Math.max(0, DAILY_LIMIT_FREE - guestVotesToday);

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    return { 'Content-Type': 'application/json' };
  }, []);

  const resetPlayer = useCallback(() => {
    setPlayer(null);
    setFeed([]);
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  }, []);

  // Restore session on mount — re-register with cached DID to get fresh player data
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current || player) return;
    restoredRef.current = true;
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const { did, walletAddress } = JSON.parse(raw) as { did: string; walletAddress: string };
      if (!did || !walletAddress) return;
      // register is idempotent — just fetches current player state
      fetch('/api/game/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did, walletAddress }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            const isHolderNow = data.player.phase1Verified;
            const limit = isHolderNow ? DAILY_LIMIT_HOLDER : DAILY_LIMIT_FREE;
            setPlayer({
              did: data.player.did,
              walletAddress,
              powerLevel: data.player.powerLevel,
              phase1Verified: isHolderNow,
              votesToday: data.player.votesToday,
              votesRemaining: Math.max(0, limit - data.player.votesToday),
              voteStreak: data.player.voteStreak ?? 0,
              onboarding: data.player.onboarding,
            });
          } else {
            sessionStorage.removeItem(SESSION_KEY);
          }
        })
        .catch(() => { /* network error — will show gate checklist */ });
    } catch { /* corrupt storage — ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const register = useCallback(async (did: string, walletAddress: string) => {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/game/register', {
      method: 'POST',
      headers,
      body: JSON.stringify({ did, walletAddress }),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Registration failed');
    }
    const isHolderNow = data.player.phase1Verified;
    const limit = isHolderNow ? DAILY_LIMIT_HOLDER : DAILY_LIMIT_FREE;
    setPlayer({
      did: data.player.did,
      walletAddress: walletAddress,
      powerLevel: data.player.powerLevel,
      phase1Verified: isHolderNow,
      votesToday: data.player.votesToday,
      votesRemaining: Math.max(0, limit - data.player.votesToday),
      voteStreak: data.player.voteStreak ?? 0,
      onboarding: data.player.onboarding,
    });
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ did: data.player.did, walletAddress }));
    } catch { /* quota exceeded or private mode — non-critical */ }
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
      // Upgrade to holder: increase daily limit
      setPlayer({
        ...player,
        phase1Verified: true,
        votesRemaining: Math.max(0, DAILY_LIMIT_HOLDER - player.votesToday),
        onboarding: { ...player.onboarding, phase1: true },
      });
    }
    return data.verified;
  }, [player]);

  const loadFeed = useCallback(async () => {
    setFeedLoading(true);
    try {
      // Use player DID if available, otherwise use guestId
      const feedUrl = player?.did
        ? `/api/game/feed?did=${encodeURIComponent(player.did)}&limit=10`
        : `/api/game/feed?guestId=${encodeURIComponent(guestId)}&limit=10`;

      const res = await fetch(feedUrl);
      const data = await res.json();
      if (data.success) {
        setFeed(data.feed);
      } else {
        throw new Error(data.error || 'Feed request failed');
      }
    } finally {
      setFeedLoading(false);
    }
  }, [player, guestId]);

  const castVote = useCallback(async (nftId: string, editionNumber: number, voteType: 1 | -1) => {
    const headers = await getAuthHeaders();

    // Build request body based on whether we have a player or not
    const body = player?.did
      ? { voterDid: player.did, guestId: null, nftId, editionNumber, voteType }
      : { voterDid: null, guestId, nftId, editionNumber, voteType };

    const res = await fetch('/api/game/vote', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (data.success) {
      if (player) {
        // Update player state
        setPlayer(prev => prev ? {
          ...prev,
          votesToday: prev.votesToday + 1,
          votesRemaining: data.votesRemaining,
          voteStreak: data.voteStreak ?? prev.voteStreak,
          onboarding: data.onboarding ?? prev.onboarding,
        } : null);
      } else {
        // Track guest votes locally
        const newCount = incrementGuestVotes();
        setGuestVotesToday(newCount);
      }
      // Remove voted item from feed
      setFeed(prev => prev.filter(item => item.nftId !== nftId));
      return true;
    }
    return false;
  }, [player, guestId]);

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
      guestId,
      isRegistered: !!player,
      isVerified: !!player?.phase1Verified,
      isHolder,
      votesRemaining,
      dailyLimit,
      feed,
      feedLoading,
      register,
      resetPlayer,
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
