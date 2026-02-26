/**
 * Fight Club Page
 *
 * Unified hub for combat features: Battle, Vote, and Rankings.
 * Uses URL-based tab navigation.
 * Requires holding at least 1 Farmers Plot NFT to access.
 */

import { useLocation, useNavigate } from 'react-router-dom';
import { MINTGARDEN_COLLECTION_URL } from '@/services/constants';
import { lazy, Suspense, memo, useState, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Swords, ExternalLink, Wallet, Info } from 'lucide-react';
import { useLayout } from '@/hooks/useLayout';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';
import { PageTransition } from '@/components/layout/PageTransition';
import { PageSkeleton } from '@/components/layout/PageSkeleton';
import { GameProvider, useGame } from '@/contexts/GameContext';
import { SwipeAutoRegister } from '@/components/game/SwipeAutoRegister';
import { FightClubRankings } from '@/components/combat/FightClubRankings';
// import { SubscriptionBanner } from '@/components/combat/SubscriptionBanner';
import { FightClubGuideModal } from '@/components/combat/FightClubGuideModal';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useSageWallet } from '@/sage-wallet';

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

const VoteTabContent = memo(function VoteTabContent() {
  return (
    <>
      <SwipeAutoRegister />
      <Suspense fallback={<PageSkeleton type="media" />}>
        <GameVoting />
      </Suspense>
    </>
  );
});

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
  const { contentPadding, isMobile } = useLayout();
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getActiveTab(location.pathname);
  const [guideOpen, setGuideOpen] = useState(false);
  const { profile } = useUserProfile();
  const { address: walletAddress } = useSageWallet();
  const { player } = useGame();
  const { isSignedIn } = useClerkAuth();
  const { data: accessData, isLoading: accessLoading } = useFightClubAccess(walletAddress);
  const { data: playerDidFromWallet } = usePlayerDid(walletAddress ?? profile?.walletAddress ?? null);

  // When Clerk is signed in, prefer game player DID; otherwise use wallet-based DID
  const effectivePlayerDid = (CLERK_ENABLED && isSignedIn && player?.did)
    ? player.did
    : (playerDidFromWallet ?? null);

  const handleTabClick = useCallback((tab: Tab) => {
    navigate(tab.path);
  }, [navigate]);
  const handleGuideOpen = useCallback(() => setGuideOpen(true), []);
  const handleGuideClose = useCallback(() => setGuideOpen(false), []);

  const isGatedTab = activeTab === 'burn';
  const showGateLoading = accessLoading && isGatedTab;
  const showGate = !accessLoading && !accessData?.hasAccess && isGatedTab;

  // Tab bar scroll hint: remove fade when scrolled to end
  const tabsRef = useRef<HTMLDivElement>(null);
  const [tabsScrolledEnd, setTabsScrolledEnd] = useState(false);

  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    const check = () => {
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      setTabsScrolledEnd(atEnd);
    };
    check();
    el.addEventListener('scroll', check, { passive: true });
    return () => el.removeEventListener('scroll', check);
  }, []);

  return (
    <>
      <div
        style={{
          paddingTop: 8,
          paddingLeft: contentPadding,
          paddingRight: contentPadding,
          paddingBottom: contentPadding,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100dvh',
        }}
      >
        {/* Tab Bar */}
        <div className="flex items-center gap-2">
          <div ref={tabsRef} className={`fight-club-tabs flex-1${tabsScrolledEnd ? ' scrolled-end' : ''}`}>
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
          {!isMobile && (
            <button
              type="button"
              className="btn btn-ghost text-xs flex items-center gap-1"
              style={{ padding: '8px 12px', minWidth: '40px', minHeight: '40px' }}
              onClick={handleGuideOpen}
            >
              <Info size={16} />
            </button>
          )}
        </div>

        {/* SubscriptionBanner hidden until battling is live */}
        {/* <SubscriptionBanner playerDid={effectivePlayerDid} /> */}

        {/* 6px = same as vote-feed gap so tab→picture and picture→buttons are equal */}
        <div style={{ flex: 1, minHeight: 0, marginTop: 6 }}>
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
            <VoteTabContent />
          )}
          {activeTab === 'rankings' && <FightClubRankings currentUserDid={effectivePlayerDid} />}
        </div>
      </div>

      <FightClubGuideModal isOpen={guideOpen} onClose={handleGuideClose} />
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
