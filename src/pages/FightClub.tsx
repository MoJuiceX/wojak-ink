/**
 * Fight Club Page
 *
 * Unified hub for combat features: Battle, Vote, and Rankings.
 * Uses URL-based tab navigation.
 * Requires holding at least 1 Farmers Plot NFT to access.
 */

import { useLocation, useNavigate, Link } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Swords, Trophy, Heart, ExternalLink, Wallet, Palette } from 'lucide-react';
import { PageTransition } from '@/components/layout/PageTransition';
import { PageSkeleton } from '@/components/layout/PageSkeleton';
import { useLayout } from '@/hooks/useLayout';
import { GameProvider } from '@/contexts/GameContext';
import { SwipeAutoRegister } from '@/components/game/SwipeAutoRegister';
import { GameErrorBoundary } from '@/components/games/GameError';
import { GameLoading } from '@/components/games/GameLoading';
import { FightClubRankings } from '@/components/combat/FightClubRankings';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useSageWallet } from '@/sage-wallet';

// Lazy load tab content
const CombatArena = lazy(() => import('./CombatArena'));
const GameVoting = lazy(() => import('./GameVoting'));
const BurnTab = lazy(() => import('@/components/combat/BurnTab'));

// Gate API response type
interface GateResponse {
  hasAccess: boolean;
  farmersPlotCount: number;
  wojakCount: number;
}

// Check if user has access to Fight Club (holds Farmers Plot NFT)
function useFightClubAccess() {
  const { isSignedIn, profile } = useUserProfile();
  const walletAddress = profile?.walletAddress;

  return useQuery({
    queryKey: ['fight-club-gate', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return { hasAccess: false, farmersPlotCount: 0, wojakCount: 0 };
      const res = await fetch(`/api/combat/gate?wallet=${encodeURIComponent(walletAddress)}`);
      if (!res.ok) throw new Error('Failed to check access');
      return res.json() as Promise<GateResponse>;
    },
    enabled: isSignedIn && !!walletAddress,
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

// Prompt shown when user hasn't connected wallet
function ConnectWalletPrompt() {
  const { contentPadding } = useLayout();
  const { connect } = useSageWallet();

  return (
    <PageTransition>
      <div
        style={{
          padding: contentPadding,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center',
        }}
      >
        <div className="card p-8 max-w-md">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full" style={{ background: 'var(--color-primary-15)' }}>
              <Wallet size={32} className="text-primary" />
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

// Gated view shown when user doesn't have Farmers Plot
function FightClubGate() {
  const { contentPadding } = useLayout();
  const { data: floorPrice } = useFloorPrice();

  return (
    <PageTransition>
      <div
        style={{
          padding: contentPadding,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center',
        }}
      >
        <div className="card p-8 max-w-md">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full" style={{ background: 'var(--color-primary-15)' }}>
              <Swords size={32} className="text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome to Fight Club</h1>
          <p className="text-secondary mb-6">
            Hold a Wojak Farmers Plot NFT to vote, battle, and climb the rankings.
          </p>

          {/* Feature preview */}
          <div className="flex flex-col gap-3 mb-6 text-left">
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--color-white-5)' }}>
              <Heart size={20} className="text-error" />
              <div>
                <p className="font-medium">Vote</p>
                <p className="text-sm text-secondary">Rate Wojaks, shape the meta</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--color-white-5)' }}>
              <Swords size={20} className="text-primary" />
              <div>
                <p className="font-medium">Battle</p>
                <p className="text-sm text-secondary">Turn-based combat, earn Power</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--color-white-5)' }}>
              <Trophy size={20} className="text-gold" />
              <div>
                <p className="font-medium">Rankings</p>
                <p className="text-sm text-secondary">Climb the leaderboard</p>
              </div>
            </div>
          </div>

          {/* Floor price */}
          {floorPrice != null && (
            <p className="text-sm text-secondary mb-4">
              Current floor: <span className="text-primary font-medium">{floorPrice} XCH</span>
            </p>
          )}

          {/* CTA */}
          <a
            href="https://mintgarden.io/collections/wojak-farmers-plot-col1fgqe3rl99t6vdv5cykqq0ngrpx93wzw4ufvf3awsv67mkvxw8qsu9g53e"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            Buy on MintGarden
            <ExternalLink size={16} />
          </a>
        </div>
      </div>
    </PageTransition>
  );
}

// Banner shown on Battle tab when user has no Wojaks
function MintFighterBanner() {
  return (
    <div
      className="card p-4 flex items-center gap-4 mb-4"
      style={{
        borderColor: 'var(--color-primary)',
        borderWidth: 1,
        borderStyle: 'solid',
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: 48,
          height: 48,
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-primary-15)',
          flexShrink: 0,
        }}
      >
        <Palette size={24} className="text-primary" />
      </div>
      <div className="flex-1">
        <p className="font-bold" style={{ fontSize: 15 }}>Mint your first fighter!</p>
        <p className="text-secondary" style={{ fontSize: 13 }}>
          Create a Wojak in the Generator to enter the arena.
        </p>
      </div>
      <Link to="/generator" className="btn btn-primary" style={{ flexShrink: 0 }}>
        Generator
      </Link>
    </div>
  );
}

type TabId = 'battle' | 'vote' | 'rankings' | 'burn';

interface Tab {
  id: TabId;
  label: string;
  path: string;
}

const TABS: Tab[] = [
  { id: 'battle', label: 'Battle', path: '/fight-club/battle' },
  { id: 'vote', label: 'Vote', path: '/fight-club/vote' },
  { id: 'rankings', label: 'Rankings', path: '/fight-club/rankings' },
  { id: 'burn', label: 'Burn', path: '/fight-club/burn' },
];

function getActiveTab(pathname: string): TabId {
  if (pathname.includes('/battle')) return 'battle';
  if (pathname.includes('/vote')) return 'vote';
  if (pathname.includes('/rankings')) return 'rankings';
  if (pathname.includes('/burn')) return 'burn';
  // Default to battle for /fight-club
  return 'battle';
}

export default function FightClub() {
  const { contentPadding } = useLayout();
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getActiveTab(location.pathname);
  const { isSignedIn } = useUserProfile();
  const { data: accessData, isLoading: accessLoading } = useFightClubAccess();

  const handleTabClick = (tab: Tab) => {
    navigate(tab.path);
  };

  // Show connect wallet prompt if not signed in
  if (!isSignedIn) {
    return <ConnectWalletPrompt />;
  }

  // Show loading state while checking access
  if (accessLoading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
          <div className="spinner" />
        </div>
      </PageTransition>
    );
  }

  // Show gate if no Farmers Plot
  if (!accessData?.hasAccess) {
    return <FightClubGate />;
  }

  return (
    <PageTransition>
      <div
        style={{
          padding: contentPadding,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100%',
        }}
      >
        {/* Tab Bar */}
        <div className="fight-club-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`fight-club-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabClick(tab)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, marginTop: '16px' }}>
          {activeTab === 'battle' && (
            <>
              {accessData?.wojakCount === 0 && <MintFighterBanner />}
              <GameErrorBoundary gameName="Combat Arena">
                <Suspense fallback={<GameLoading gameName="Combat Arena" />}>
                  <CombatArena />
                </Suspense>
              </GameErrorBoundary>
            </>
          )}
          {activeTab === 'vote' && (
            <GameProvider>
              <SwipeAutoRegister />
              <Suspense fallback={<PageSkeleton type="media" />}>
                <GameVoting />
              </Suspense>
            </GameProvider>
          )}
          {activeTab === 'rankings' && <FightClubRankings />}
          {activeTab === 'burn' && (
            <Suspense fallback={<PageSkeleton type="media" />}>
              <BurnTab />
            </Suspense>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
