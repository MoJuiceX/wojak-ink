/**
 * Fight Club Page
 *
 * Unified hub for combat features: Battle, Vote, and Rankings.
 * Uses URL-based tab navigation.
 * Requires holding at least 1 Farmers Plot NFT to access.
 */

import { useLocation, useNavigate, Link } from 'react-router-dom';
import { MINTGARDEN_COLLECTION_URL } from '@/services/constants';
import { lazy, Suspense, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Swords, ExternalLink, Wallet, Palette, RefreshCw, Info } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { PageTransition } from '@/components/layout/PageTransition';
import { PageSkeleton } from '@/components/layout/PageSkeleton';
import { useLayout } from '@/hooks/useLayout';
import { GameProvider } from '@/contexts/GameContext';
import { SwipeAutoRegister } from '@/components/game/SwipeAutoRegister';
import { GameErrorBoundary } from '@/components/games/GameError';
import { GameLoading } from '@/components/games/GameLoading';
import { FightClubRankings } from '@/components/combat/FightClubRankings';
import { SubscriptionBanner } from '@/components/combat/SubscriptionBanner';
import { FightClubGuideModal } from '@/components/combat/FightClubGuideModal';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useSageWallet } from '@/sage-wallet';

// Lazy load tab content
const CombatArena = lazy(() => import('./CombatArena'));
const GameVoting = lazy(() => import('./GameVoting'));
const BurnTab = lazy(() => import('@/components/combat/BurnTab'));
const DemoBattle = lazy(() => import('@/components/combat/DemoBattle').then(m => ({ default: m.DemoBattle })));

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

// Refresh DID holdings button
function RefreshButton({ did }: { did: string }) {
  const [refreshing, setRefreshing] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);

    try {
      const res = await fetch('/api/profile/refresh-did', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did }),
      });

      const data = await res.json();

      if (res.status === 429) {
        toast.error(data.error || 'Please wait between refreshes');
      } else if (!res.ok) {
        toast.error(data.error || 'Refresh failed');
      } else {
        toast.success(`Synced! Found ${data.nftsFound} NFTs`);
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['fight-club-gate'] });
        queryClient.invalidateQueries({ queryKey: ['fighters'] });
        queryClient.invalidateQueries({ queryKey: ['burn-eligible'] });
      }
    } catch {
      toast.error('Refresh failed');
    } finally {
      setRefreshing(false);
    }
  }, [did, refreshing, toast, queryClient]);

  return (
    <button
      type="button"
      className="btn btn-ghost"
      onClick={handleRefresh}
      disabled={refreshing}
      title="Sync NFT holdings"
      style={{ padding: '6px 10px', minWidth: 'auto' }}
    >
      <RefreshCw
        size={16}
        className={refreshing ? 'animate-spin' : ''}
        style={{ opacity: refreshing ? 0.5 : 1 }}
      />
    </button>
  );
}

// Prompt shown when user hasn't connected wallet
function ConnectWalletPrompt() {
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

// Inline gate shown inside tab content when user doesn't have access
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

// Banner shown on Battle tab when user has no Wojaks
function MintFighterBanner() {
  return (
    <div
      className="card flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-4 mb-4"
      style={{
        borderColor: 'var(--color-primary)',
        borderWidth: 1,
        borderStyle: 'solid',
      }}
    >
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-primary-15)',
          }}
        >
          <Palette size={24} className="text-primary" />
        </div>
        <div className="flex-1 sm:flex-initial">
          <p className="font-bold" style={{ fontSize: 15 }}>Mint your first fighter!</p>
          <p className="text-secondary" style={{ fontSize: 13 }}>
            Create a Wojak in the Generator to enter the arena.
          </p>
        </div>
      </div>
      <Link to="/generator" className="btn btn-primary w-full sm:w-auto shrink-0">
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
  { id: 'vote', label: 'Vote', path: '/fight-club/vote' },
  { id: 'battle', label: 'Battle', path: '/fight-club/battle' },
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

export default function FightClub() {
  const { contentPadding } = useLayout();
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getActiveTab(location.pathname);
  const [guideOpen, setGuideOpen] = useState(false);
  const { profile } = useUserProfile();
  const { address: walletAddress, status: walletStatus } = useSageWallet();
  const isWalletConnected = walletStatus === 'connected' && !!walletAddress;
  const { data: accessData, isLoading: accessLoading } = useFightClubAccess(walletAddress);
  const { data: playerDid } = usePlayerDid(walletAddress ?? profile?.walletAddress ?? null);

  const handleTabClick = (tab: Tab) => {
    navigate(tab.path);
  };

  // Determine if current tab requires wallet/access
  const isGatedTab = activeTab === 'battle' || activeTab === 'burn';

  // Show connect wallet prompt only for gated tabs when wallet not connected
  if (!isWalletConnected && isGatedTab) {
    return <ConnectWalletPrompt />;
  }

  // Check if we should show gated content loading or gate
  const showGateLoading = accessLoading && isGatedTab;
  const showGate = !accessLoading && !accessData?.hasAccess && isGatedTab;

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
          {playerDid && <RefreshButton did={playerDid} />}
        </div>

        {/* Subscription Banner */}
        <SubscriptionBanner playerDid={playerDid ?? null} />

        {/* Tab Content */}
        <div style={{ flex: 1, marginTop: '16px' }}>
          {/* Show loading skeleton for gated tabs while checking access */}
          {showGateLoading && (
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

          {/* Show gate when user doesn't have access to gated tabs */}
          {showGate && <FightClubGateInline />}

          {/* Regular tab content when not loading/gated */}
          {!showGateLoading && !showGate && (
            <>
              {activeTab === 'battle' && (
                <>
                  {accessData?.wojakCount === 0 && <MintFighterBanner />}
                  <GameErrorBoundary gameName="Combat Arena">
                    <Suspense fallback={<GameLoading gameName="Combat Arena" />}>
                      {/* Show demo when user has no fighters, real arena when they do */}
                      {accessData?.wojakCount === 0 ? (
                        <DemoBattle />
                      ) : (
                        <CombatArena />
                      )}
                    </Suspense>
                  </GameErrorBoundary>
                </>
              )}
              {activeTab === 'burn' && (
                <Suspense fallback={<PageSkeleton type="media" />}>
                  <BurnTab />
                </Suspense>
              )}
            </>
          )}

          {/* Non-gated tabs always render immediately */}
          {activeTab === 'vote' && (
            <GameProvider>
              <SwipeAutoRegister />
              <Suspense fallback={<PageSkeleton type="media" />}>
                <GameVoting />
              </Suspense>
            </GameProvider>
          )}
          {activeTab === 'rankings' && <FightClubRankings currentUserDid={playerDid} />}
        </div>
      </div>

      {/* Guide Modal */}
      <FightClubGuideModal isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
    </PageTransition>
  );
}
