/**
 * Fight Club Page
 *
 * Unified hub for combat features: Battle, Vote, and Rankings.
 * Uses URL-based tab navigation.
 * Requires holding at least 1 Farmers Plot NFT to access.
 */

import { useLocation, useNavigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Swords, Trophy, Heart, ExternalLink, Lock } from 'lucide-react';
import { PageTransition } from '@/components/layout/PageTransition';
import { PageSkeleton } from '@/components/layout/PageSkeleton';
import { useLayout } from '@/hooks/useLayout';
import { GameProvider } from '@/contexts/GameContext';
import { SwipeAutoRegister } from '@/components/game/SwipeAutoRegister';
import { GameErrorBoundary } from '@/components/games/GameError';
import { GameLoading } from '@/components/games/GameLoading';
import { FightClubRankings } from '@/components/combat/FightClubRankings';
import { useUserProfile } from '@/contexts/UserProfileContext';

// Lazy load tab content
const CombatArena = lazy(() => import('./CombatArena'));
const GameVoting = lazy(() => import('./GameVoting'));

// Check if user has access to Fight Club (holds Farmers Plot NFT)
function useFightClubAccess() {
  const { isSignedIn, profile } = useUserProfile();
  const walletAddress = profile?.walletAddress;

  return useQuery({
    queryKey: ['fight-club-gate', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return { hasAccess: false, farmersPlotCount: 0 };
      const res = await fetch(`/api/combat/gate?wallet=${encodeURIComponent(walletAddress)}`);
      if (!res.ok) throw new Error('Failed to check access');
      return res.json() as Promise<{ hasAccess: boolean; farmersPlotCount: number }>;
    },
    enabled: isSignedIn && !!walletAddress,
    staleTime: 60000, // 1 minute
  });
}

// Gated view shown when user doesn't have access
function FightClubGate() {
  const { contentPadding } = useLayout();

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
              <Lock size={32} className="text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Fight Club Access</h1>
          <p className="text-secondary mb-6">
            Hold a Wojak Farmers Plot NFT to unlock Fight Club features.
          </p>

          {/* Feature preview */}
          <div className="flex flex-col gap-3 mb-6 text-left">
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--color-white-5)' }}>
              <Swords size={20} className="text-primary" />
              <div>
                <p className="font-medium">Battle</p>
                <p className="text-sm text-secondary">Turn-based combat with your Wojaks</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--color-white-5)' }}>
              <Heart size={20} className="text-error" />
              <div>
                <p className="font-medium">Vote</p>
                <p className="text-sm text-secondary">Rate NFTs and earn Power</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--color-white-5)' }}>
              <Trophy size={20} className="text-gold" />
              <div>
                <p className="font-medium">Rankings</p>
                <p className="text-sm text-secondary">Compete for top spots on the leaderboard</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <a
            href="https://mintgarden.io/collections/wojak-farmers-plot-col1fgqe3rl99t6vdv5cykqq0ngrpx93wzw4ufvf3awsv67mkvxw8qsu9g53e"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            Get a Farmers Plot
            <ExternalLink size={16} />
          </a>
        </div>
      </div>
    </PageTransition>
  );
}

type TabId = 'battle' | 'vote' | 'rankings';

interface Tab {
  id: TabId;
  label: string;
  path: string;
}

const TABS: Tab[] = [
  { id: 'battle', label: 'Battle', path: '/fight-club/battle' },
  { id: 'vote', label: 'Vote', path: '/fight-club/vote' },
  { id: 'rankings', label: 'Rankings', path: '/fight-club/rankings' },
];

function getActiveTab(pathname: string): TabId {
  if (pathname.includes('/battle')) return 'battle';
  if (pathname.includes('/vote')) return 'vote';
  if (pathname.includes('/rankings')) return 'rankings';
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

  // Show loading state while checking access
  if (isSignedIn && accessLoading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
          <div className="spinner" />
        </div>
      </PageTransition>
    );
  }

  // Show gate if not signed in or no access
  if (!isSignedIn || !accessData?.hasAccess) {
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
            <GameErrorBoundary gameName="Combat Arena">
              <Suspense fallback={<GameLoading gameName="Combat Arena" />}>
                <CombatArena />
              </Suspense>
            </GameErrorBoundary>
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
        </div>
      </div>
    </PageTransition>
  );
}
