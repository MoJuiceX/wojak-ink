import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';

const SESSION_KEY = 'wojak_game_session';
const GUEST_ID_KEY = 'wojak_guest_id';
const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Unlimited voting - large number for compatibility
const UNLIMITED_VOTES = 9999;

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
  /** MintGarden mainnet CDN URL (from image_hash); use first for reliable thumbnails */
  thumbnailUri?: string | null;
  totalVotes: number;
  likes: number;
  dislikes: number;
}

interface FeedVotePassProgress {
  enabled: boolean;
  windowHours: number;
  seenCount: number;
  totalCount: number;
  remainingCount: number;
  passComplete: boolean;
  passLocked?: boolean;
  unseenOnlyFeed: boolean;
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
  feedVotePassProgress: FeedVotePassProgress | null;
  feedLoading: boolean;
  register: (did: string, walletAddress: string) => Promise<void>;
  linkDid: (did: string, walletAddress?: string) => Promise<void>;
  resetPlayer: () => void;
  verifyPhase1: (did: string, nftId?: string) => Promise<boolean>;
  castVote: (nftId: string, editionNumber: number, voteType: 1 | -1) => Promise<{ ok: boolean; error?: string; status?: number }>;
  removeFromFeed: (nftId: string) => void;
  loadFeed: () => Promise<void>;
  refreshPowerLevel: () => Promise<void>;
  getAuthHeaders: () => Promise<Record<string, string>>;
}

const GameContext = createContext<GameContextType | null>(null);

/* eslint-disable react-refresh/only-export-components -- context file exports provider + hooks */
export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be inside GameProvider');
  return ctx;
}

/** Safe version that returns null when outside GameProvider */
export function useOptionalGame() {
  return useContext(GameContext);
}
/* eslint-enable react-refresh/only-export-components */

function apiPlayerToPlayer(api: { did: string; powerLevel: number; phase1Verified: boolean; votesToday?: number; voteStreak?: number; onboarding: GamePlayer['onboarding'] }, walletAddress = ''): GamePlayer {
  return {
    did: api.did,
    walletAddress,
    powerLevel: api.powerLevel ?? 0,
    phase1Verified: !!api.phase1Verified,
    votesToday: api.votesToday ?? 0,
    votesRemaining: UNLIMITED_VOTES,
    voteStreak: api.voteStreak ?? 0,
    onboarding: api.onboarding,
  };
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<GamePlayer | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [feedVotePassProgress, setFeedVotePassProgress] = useState<FeedVotePassProgress | null>(null);
  const [feedLoading, setFeedLoading] = useState(false);

  // Track voted nftIds this session to filter them from feed responses
  // (API may return them before vote is processed)
  const votedNftIdsRef = useRef<Set<string>>(new Set());

  const { getToken, isSignedIn, isLoaded: isClerkLoaded } = useClerkAuth();

  // Stable guest ID for this browser
  const [guestId] = useState(() => getGuestId());

  // Computed values
  const isHolder = !!player?.phase1Verified;
  const dailyLimit = UNLIMITED_VOTES; // Unlimited voting
  const votesRemaining = UNLIMITED_VOTES; // Unlimited voting

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      if (getToken) {
        const token = await getToken();
        if (token) headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Auth not ready or Clerk error — proceed without Authorization (guest vote)
    }
    return headers;
  }, [getToken]);

  const resetPlayer = useCallback(() => {
    setPlayer(null);
    setFeed([]);
    setFeedVotePassProgress(null);
    votedNftIdsRef.current.clear();
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  }, []);

  // When Clerk is enabled and signed in: fetch /api/game/me and set player; on sign-out clear player
  const wasSignedInRef = useRef(false);
  useEffect(() => {
    if (!CLERK_ENABLED || !isClerkLoaded) return;
    if (!isSignedIn) {
      // Only clear feed if user was previously signed in (explicit sign-out)
      // Don't clear for initial anonymous state — feed may already be loaded via guest path
      if (wasSignedInRef.current) {
        setPlayer(null);
        setFeed([]);
      }
      wasSignedInRef.current = false;
      return;
    }
    wasSignedInRef.current = true;
    let cancelled = false;
    (async () => {
      if (!getToken) return;
      const token = await getToken();
      if (!token || cancelled) return;
      const res = await fetch('/api/game/me', {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (cancelled) return;
      if (data.success && data.player) {
        setPlayer(apiPlayerToPlayer(data.player, (data.player as { walletAddress?: string }).walletAddress ?? ''));
      } else {
        setPlayer(null);
      }
    })();
    return () => { cancelled = true; };
  }, [isClerkLoaded, isSignedIn, getToken]);

  // Restore session on mount (wallet path only) — skip when Clerk is enabled and user is signed in
  const restoredRef = useRef(false);
  useEffect(() => {
    if (!isClerkLoaded) return;
    if (CLERK_ENABLED && isSignedIn) return; // Player comes from /api/game/me
    if (restoredRef.current || player) return;
    restoredRef.current = true;
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const { did, walletAddress } = JSON.parse(raw) as { did: string; walletAddress: string };
      if (!did || !walletAddress) return;
      fetch('/api/game/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did, walletAddress }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setPlayer(apiPlayerToPlayer(data.player, walletAddress));
          } else {
            sessionStorage.removeItem(SESSION_KEY);
          }
        })
        .catch(() => { /* network error — will show gate checklist */ });
    } catch { /* corrupt storage — ignore */ }
  }, [isClerkLoaded, isSignedIn, player]);

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
    setPlayer(apiPlayerToPlayer(data.player, walletAddress));
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ did: data.player.did, walletAddress }));
    } catch { /* quota exceeded or private mode — non-critical */ }
  }, [getAuthHeaders]);

  const linkDid = useCallback(async (did: string, walletAddress?: string) => {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/game/link-did', {
      method: 'POST',
      headers,
      body: JSON.stringify({ did, walletAddress: walletAddress ?? '' }),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Link DID failed');
    }
    setPlayer(apiPlayerToPlayer(data.player, walletAddress ?? ''));
  }, [getAuthHeaders]);

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
      // Upgrade to holder status
      setPlayer({
        ...player,
        phase1Verified: true,
        votesRemaining: UNLIMITED_VOTES,
        onboarding: { ...player.onboarding, phase1: true },
      });
    }
    return data.verified;
  }, [player, getAuthHeaders]);

  const loadFeed = useCallback(async () => {
    setFeedLoading(true);
    try {
      const feedUrl = player?.did
        ? `/api/game/feed?did=${encodeURIComponent(player.did)}&limit=10`
        : `/api/game/feed?guestId=${encodeURIComponent(guestId)}&limit=10`;

      const res = await fetch(feedUrl);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Feed request failed');
      setFeedVotePassProgress(data?.meta?.votePass ?? null);

      // Filter out any nftIds we've already voted on this session
      // (API may return stale data before vote is fully processed)
      const filterVoted = (items: FeedItem[]) =>
        items.filter(item => !votedNftIdsRef.current.has(item.nftId));

      if (Array.isArray(data.feed) && data.feed.length > 0) {
        setFeed(filterVoted(data.feed));
        return;
      }
      const retryRes = await fetch('/api/game/feed?limit=10');
      const retryData = await retryRes.json();
      if (retryData.success && Array.isArray(retryData.feed)) {
        setFeed(filterVoted(retryData.feed));
        setFeedVotePassProgress(retryData?.meta?.votePass ?? data?.meta?.votePass ?? null);
      } else {
        setFeed(filterVoted(data.feed));
      }
    } finally {
      setFeedLoading(false);
    }
  }, [player, guestId]);

  const castVote = useCallback(async (nftId: string, editionNumber: number, voteType: 1 | -1) => {
    // Immediately track this nftId as voted so it won't reappear if feed reloads
    votedNftIdsRef.current.add(nftId);

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
        // Update player state (onboarding status may change)
        setPlayer(prev => prev ? {
          ...prev,
          onboarding: data.onboarding ?? prev.onboarding,
        } : null);
      }
      // Feed removal is done by VotingFeed after exit animation
      return { ok: true as const };
    }
    // Vote failed - remove from voted set so it can appear again
    votedNftIdsRef.current.delete(nftId);
    return { ok: false as const, error: data?.error || 'Vote failed', status: res.status };
  }, [player, guestId, getAuthHeaders]);

  const removeFromFeed = useCallback((nftId: string) => {
    setFeed(prev => prev.filter(item => item.nftId !== nftId));
  }, []);

  const refreshPowerLevel = useCallback(async () => {
    if (!player) return;
    const res = await fetch(`/api/game/power-level?did=${player.did}`);
    const data = await res.json();
    if (data.success) {
      setPlayer(prev => prev ? { ...prev, powerLevel: data.powerLevel } : null);
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
      feedVotePassProgress,
      feedLoading,
      register,
      linkDid,
      resetPlayer,
      verifyPhase1,
      castVote,
      removeFromFeed,
      loadFeed,
      refreshPowerLevel,
      getAuthHeaders,
    }}>
      {children}
    </GameContext.Provider>
  );
}
