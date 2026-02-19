/**
 * Fight Club Page
 *
 * Unified hub for combat features: Battle, Vote, and Rankings.
 * Uses URL-based tab navigation.
 */

import { useLocation, useNavigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { PageTransition } from '@/components/layout/PageTransition';
import { PageSkeleton } from '@/components/layout/PageSkeleton';
import { useLayout } from '@/hooks/useLayout';
import { GameProvider } from '@/contexts/GameContext';
import { SwipeAutoRegister } from '@/components/game/SwipeAutoRegister';
import { GameErrorBoundary } from '@/components/games/GameError';
import { GameLoading } from '@/components/games/GameLoading';

// Lazy load tab content
const CombatArena = lazy(() => import('./CombatArena'));
const GameVoting = lazy(() => import('./GameVoting'));

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

  const handleTabClick = (tab: Tab) => {
    navigate(tab.path);
  };

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
          {activeTab === 'rankings' && (
            <div className="card p-6 text-center">
              <h2 className="text-xl font-semibold mb-2">Rankings</h2>
              <p className="text-secondary">Coming soon - Power rankings for players and Wojaks</p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
