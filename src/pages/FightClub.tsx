/**
 * Fight Club Page
 *
 * Unified hub for combat features: Battle, Vote, and Rankings.
 * Uses URL-based tab navigation.
 * Requires holding at least 1 Farmers Plot NFT to access.
 */

import { useLocation, useNavigate } from 'react-router-dom';
import { MINTGARDEN_COLLECTION_URL } from '@/services/constants';
import { lazy, Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Swords, ExternalLink, Wallet, Info } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { useToast } from '@/contexts/ToastContext';
import { PageTransition } from '@/components/layout/PageTransition';
import { PageSkeleton } from '@/components/layout/PageSkeleton';
import { useLayout } from '@/hooks/useLayout';
import { GameProvider, useGame } from '@/contexts/GameContext';
import { SwipeAutoRegister } from '@/components/game/SwipeAutoRegister';
import { FightClubRankings } from '@/components/combat/FightClubRankings';
import { SubscriptionBanner } from '@/components/combat/SubscriptionBanner';
import { FightClubGuideModal } from '@/components/combat/FightClubGuideModal';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useSageWallet } from '@/sage-wallet';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Lazy load tab content
const GameVoting = lazy(() => import('./GameVoting'));
const DemoBattle = lazy(() => import('@/components/combat/DemoBattle'));

import { BattleTeaser } from '@/components/combat/BattleTeaser';

// Gate API response type
interface GateResponse {
  hasAccess: boolean;
  farmersPlotCount: number;
  wojakCount: number;
}

// Check if user has access to Fight Club (holds Farmers Plot NFT)
function useFightClubAccess(walletAddress: string | null) {
  return useQuery({
    queryKey: ['fight-club-gate', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return { hasAccess: false, farmersPlotCount: 0, wojakCount: 0 };
      const res = await fetch(`/api/combat/gate?wallet=${encodeURIComponent(walletAddress)}`);
      if (!res.ok) throw new Error('Failed to check access');
      return res.json() as Promise<GateResponse>;
    },
    enabled: !!walletAddress,
    staleTime: 60000, // 1 minute
  });
}

// Fetch floor price for gate display
function useFloorPrice() {
  return useQuery({
    queryKey: ['floor-price'],
    queryFn: async () => {
      const res = await fetch('/api/mint/pricing');
      if (!res.ok) return null;
      const data = await res.json();
      return data.floorPrice as number | null;
    },
    staleTime: 300000, // 5 minutes
  });
}

// Get player's DID from wallet address
function usePlayerDid(walletAddress: string | null) {
  return useQuery({
    queryKey: ['player-did', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null;
      const res = await fetch(`/api/game/player?wallet=${encodeURIComponent(walletAddress)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.player?.did as string | null;
    },
    enabled: !!walletAddress,
    staleTime: 300000,
  });
}

// Link DID + Set name when Clerk signed in and no linked player (or show set-name after link)
function LinkDidCard({ onDone }: { onDone?: () => void }) {
  const { linkDid, player } = useGame();
  const { authenticatedFetch } = useAuthenticatedFetch();
  const toast = useToast();
  const [did, setDid] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkedDid, setLinkedDid] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const handleLink = useCallback(async () => {
    const d = did.trim();
    if (!d || !/^did:chia:1[a-z0-9]{58}$/.test(d)) {
      toast.error('Please enter a valid DID (did:chia:1...)');
      return;
    }
    setLinking(true);
    try {
      await linkDid(d, walletAddress.trim() || undefined);
      setLinkedDid(d);
    } catch (e) {
      toast.error((e as Error).message || 'Link failed');
    } finally {
      setLinking(false);
    }
  }, [did, walletAddress, linkDid, toast]);

  const handleSetName = useCallback(async () => {
    const name = displayName.trim();
    if (name.length < 2 || name.length > 20 || !/^[a-zA-Z0-9 ]+$/.test(name)) {
      toast.error('Name must be 2–20 characters, letters and numbers only');
      return;
    }
    const targetDid = player?.did ?? linkedDid;
    if (!targetDid) return;
    setSavingName(true);
    try {
      const res = await authenticatedFetch('/api/profile/display-name', {
        method: 'PUT',
        body: JSON.stringify({ did: targetDid, name, source: 'custom' as const }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to set name');
      }
      toast.success('Name saved');
      onDone?.();
    } catch (e) {
      toast.error((e as Error).message || 'Failed to set name');
    } finally {
      setSavingName(false);
    }
  }, [displayName, player?.did, linkedDid, authenticatedFetch, toast, onDone]);

  return (
    <div className="card-static p-6 max-w-md mx-auto mb-6">
      <h3 className="text-lg font-bold mb-2">Link your DID</h3>
      <p className="text-secondary text-sm mb-4">
        Connect your Chia DID to this account to vote and appear on the leaderboard.
      </p>
      {!linkedDid && !player ? (
        <>
          <input
            className="input w-full mb-2"
            placeholder="did:chia:1..."
            value={did}
            onChange={e => setDid(e.target.value)}
          />
          <input
            className="input w-full mb-3"
            placeholder="Wallet address (optional)"
            value={walletAddress}
            onChange={e => setWalletAddress(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary w-full"
            onClick={handleLink}
            disabled={linking || !did.trim()}
          >
            {linking ? 'Linking...' : 'Link DID'}
          </button>
        </>
      ) : (
        <>
          <p className="text-secondary text-sm mb-3">DID linked. Set your leaderboard name (optional):</p>
          <input
            className="input w-full mb-2"
            placeholder="Display name (2–20 chars)"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary w-full"
            onClick={handleSetName}
            disabled={savingName || displayName.trim().length < 2}
          >
            {savingName ? 'Saving...' : 'Set name'}
          </button>
        </>
      )}
    </div>
  );
}

// Prompt shown when user hasn't connected wallet (exported for use by routing or future callers)
export function ConnectWalletPrompt() {
  const { contentPadding } = useLayout();
  const { connect } = useSageWallet();

  return (
    <PageTransition>
      <div
        className="flex flex-col items-center justify-center"
        style={{ padding: contentPadding, minHeight: '60vh' }}
      >
        <div className="card p-8 max-w-md text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full" style={{ background: 'var(--color-primary-15)' }}>
              <Wallet size={32} style={{ color: 'var(--color-primary)' }} />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Connect Your Wallet</h1>
          <p className="text-secondary mb-6">
            Connect your wallet to access Fight Club and join the battle.
          </p>
          <button
            type="button"
            className="btn btn-primary w-full"
            onClick={() => connect()}
          >
            Connect Wallet
          </button>
        </div>
      </div>
    </PageTransition>
  );
}

// Inline gate shown inside tab content when user doesn't have access (used for non-burn gated tabs)
function FightClubGateInline() {
  const { data: floorPrice } = useFloorPrice();

  return (
    <div className="card-static p-6 text-center max-w-lg mx-auto">
      <div className="flex justify-center mb-4">
        <div className="p-3 rounded-full" style={{ background: 'var(--color-primary-15)' }}>
          <Swords size={28} className="text-primary" />
        </div>
      </div>
      <h2 className="text-xl font-bold mb-2">Hold a Farmers Plot NFT</h2>
      <p className="text-secondary mb-4 text-sm">
        This tab requires holding a Wojak Farmers Plot NFT.
      </p>
      {floorPrice != null && (
        <p className="text-sm text-secondary mb-4">
          Current floor: <span className="text-primary font-medium">{floorPrice} XCH</span>
        </p>
      )}
      <a
        href={MINTGARDEN_COLLECTION_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-primary inline-flex items-center gap-2"
      >
        Buy on MintGarden
        <ExternalLink size={16} />
      </a>
    </div>
  );
}

// Burn tab: coming soon message (burning not enabled yet)
function BurningComingSoon() {
  return (
    <div className="card-static p-6 text-center max-w-lg mx-auto">
      <div className="flex justify-center mb-4">
        <div className="p-3 rounded-full flex items-center justify-center text-4xl" style={{ background: 'var(--color-primary-15)' }}>
          🔥
        </div>
      </div>
      <h2 className="text-xl font-bold mb-2">Burning coming soon</h2>
      <p className="text-secondary text-sm">
        Burning incentives might be free mint credits or extra power that you can give your Wojak.
      </p>
    </div>
  );
}

type TabId = 'battle' | 'vote' | 'rankings' | 'burn';

interface Tab {
  id: TabId;
  label: string;
  path: string;
  demo?: boolean;
}

const TABS: Tab[] = [
  { id: 'vote', label: 'Vote', path: '/fight-club/vote' },
  { id: 'battle', label: 'Battle', path: '/fight-club/battle', demo: true },
  { id: 'rankings', label: 'Rankings', path: '/fight-club/rankings' },
  { id: 'burn', label: 'Burn', path: '/fight-club/burn' },
];

function getActiveTab(pathname: string): TabId {
  if (pathname.includes('/vote')) return 'vote';
  if (pathname.includes('/battle')) return 'battle';
  if (pathname.includes('/rankings')) return 'rankings';
  if (pathname.includes('/burn')) return 'burn';
  // Default to vote for /fight-club
  return 'vote';
}

// Inner content: must be inside GameProvider so we can use useGame() and effectivePlayerDid
function FightClubContent() {
  const { contentPadding } = useLayout();
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getActiveTab(location.pathname);
  const [guideOpen, setGuideOpen] = useState(false);
  const [showSetNamePhase, setShowSetNamePhase] = useState(false);
  const { profile } = useUserProfile();
  const { address: walletAddress } = useSageWallet();
  const { player } = useGame();
  const { isSignedIn } = useAuth();
  const { data: accessData, isLoading: accessLoading } = useFightClubAccess(walletAddress);
  const { data: playerDidFromWallet } = usePlayerDid(walletAddress ?? profile?.walletAddress ?? null);

  // When Clerk is signed in, prefer game player DID; otherwise use wallet-based DID
  const effectivePlayerDid = (CLERK_ENABLED && isSignedIn && player?.did)
    ? player.did
    : (playerDidFromWallet ?? null);

  // After linking DID, show set-name step once (only when we just got player, not on every load)
  const hadPlayerRef = useRef(!!player);
  useEffect(() => {
    if (player && !hadPlayerRef.current) {
      hadPlayerRef.current = true;
      queueMicrotask(() => setShowSetNamePhase(true));
    }
    if (player) hadPlayerRef.current = true;
  }, [player]);
  const showLinkDidCard = CLERK_ENABLED && isSignedIn && (!player || showSetNamePhase);

  const handleTabClick = (tab: Tab) => {
    navigate(tab.path);
  };

  const isGatedTab = activeTab === 'burn';
  const showGateLoading = accessLoading && isGatedTab;
  const showGate = !accessLoading && !accessData?.hasAccess && isGatedTab;

  return (
    <>
      <div
        style={{
          padding: contentPadding,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100%',
        }}
      >
        {/* Link DID / Set name when Clerk signed in and no player or in set-name phase */}
        {showLinkDidCard && (
          <LinkDidCard onDone={() => setShowSetNamePhase(false)} />
        )}

        {/* Tab Bar */}
        <div className="flex items-center gap-2">
          <div className="fight-club-tabs flex-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`fight-club-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => handleTabClick(tab)}
              >
                {tab.label}
                {tab.demo && <span className="tab-demo-pill">Demo</span>}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-ghost text-xs flex items-center gap-1"
            style={{ padding: '6px 10px', minWidth: 'auto' }}
            onClick={() => setGuideOpen(true)}
          >
            <Info size={14} />
          </button>
        </div>

        <SubscriptionBanner playerDid={effectivePlayerDid} />

        <div style={{ flex: 1, marginTop: '16px' }}>
          {/* Burn tab: always show "Burning coming soon" for now (no gate, no full BurnTab) */}
          {activeTab === 'burn' && <BurningComingSoon />}

          {activeTab !== 'burn' && showGateLoading && (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card-static p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg" style={{ background: 'var(--color-white-8)' }} />
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="h-4 w-32 rounded" style={{ background: 'var(--color-white-8)' }} />
                      <div className="h-3 w-48 rounded" style={{ background: 'var(--color-white-5)' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab !== 'burn' && showGate && <FightClubGateInline />}

          {activeTab === 'battle' && (
            <div className="flex flex-col gap-6">
              {/* Demo-only disclaimer — battles do not affect rankings */}
              <div
                className="card-static"
                style={{
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '0.8rem',
                  color: 'var(--color-text-secondary)',
                  borderLeft: '3px solid var(--color-warning, #f59e0b)',
                }}
              >
                <Swords size={16} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Battle is a demo preview.</strong> Results do not affect Fight Club rankings.
                </span>
              </div>
              <Suspense fallback={<PageSkeleton />}>
                <DemoBattle />
              </Suspense>
              <BattleTeaser />
            </div>
          )}
          {activeTab === 'vote' && (
            <>
              <SwipeAutoRegister />
              <Suspense fallback={<PageSkeleton type="media" />}>
                <GameVoting />
              </Suspense>
            </>
          )}
          {activeTab === 'rankings' && <FightClubRankings currentUserDid={effectivePlayerDid} />}
        </div>
      </div>

      <FightClubGuideModal isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
    </>
  );
}

export default function FightClub() {
  // Burn tab shows BurningComingSoon with no wallet required; no connect gate for any tab here
  return (
    <PageTransition>
      <GameProvider>
        <FightClubContent />
      </GameProvider>
    </PageTransition>
  );
}
