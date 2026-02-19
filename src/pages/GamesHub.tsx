/**
 * Games Hub Page
 *
 * Dedicated page for all mini-games with /games route.
 * Desktop: 3-column layout (Leaderboard | Games | Stats)
 * Mobile: Scrollable single column layout.
 *
 * UPDATED: Added emoji flick voting system
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useClerk, useAuth } from '@clerk/clerk-react';
import { Gamepad2, Trophy } from 'lucide-react';
import { PageTransition } from '@/components/layout/PageTransition';
import { useLayout } from '@/hooks/useLayout';
import { GamesGrid, GameModal } from '@/components/media';
import { LeaderboardPanel } from '@/components/media/games/LeaderboardPanel';
import { StatsPanel } from '@/components/media/games/StatsPanel';
import { Leaderboard } from '@/components/Leaderboard/Leaderboard';
import { useMediaContent } from '@/hooks/data/useMediaData';
import type { MiniGame } from '@/types/media';
import { useUserProfile } from '@/contexts/UserProfileContext';

// Voting imports
import {
  FlickModeToggle,
  FlyingEmoji,
  SplatterEffect,
  HeatmapRain,
} from '@/components/voting';
import { useFlickVoting } from '@/hooks/useFlickVoting';
import { SoundManager } from '@/systems/audio';
import '@/styles/voting.css';
import { PageSEO } from '@/components/seo';

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export default function GamesHub() {
  const { contentPadding, isDesktop } = useLayout();
  const { isSignedIn } = useUserProfile();
  // Always call the hook unconditionally
  const clerkResult = useClerk();
  const clerk = CLERK_ENABLED ? clerkResult : null;

  const handleSignInClick = useCallback(() => {
    if (clerk) {
      clerk.openSignIn();
    }
  }, [clerk]);

  const [selectedGame, setSelectedGame] = useState<MiniGame | null>(null);
  const [gameModalOpen, setGameModalOpen] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [activeTab, setActiveTab] = useState<'play' | 'scores'>('play');

  // Fetch games using TanStack Query
  const { games, isLoading } = useMediaContent('all');

  // === VOTING STATE ===
  const {
    activeMode,
    setActiveMode,
    addVote,
    fetchVotesForHeatmap,
    isLoading: isVotingLoading,
  } = useFlickVoting('games');

  // Track user's vote balances (consumables from the shop)
  const [donutBalance, setDonutBalance] = useState(0);
  const [poopBalance, setPoopBalance] = useState(0);
  // Always call hooks unconditionally (rules of hooks)
  const clerkAuth = useAuth();
  const authResult = CLERK_ENABLED ? clerkAuth : { getToken: async () => null };
  const { getToken } = authResult;

  // Fetch consumable balances from API when signed in
  useEffect(() => {
    const fetchConsumables = async () => {
      if (!isSignedIn) {
        setDonutBalance(0);
        setPoopBalance(0);
        return;
      }

      try {
        const token = await getToken();
        if (!token) return;

        const res = await fetch('/api/shop/consumables', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setDonutBalance(data.donuts || 0);
          setPoopBalance(data.poops || 0);
        }
      } catch (err) {
        console.error('[GamesHub] Failed to fetch consumables:', err);
      }
    };

    fetchConsumables();
  }, [isSignedIn, getToken]);

  const toggleRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Multi-throw support: arrays instead of single values
  const [flyingEmojis, setFlyingEmojis] = useState<Array<{
    id: string;
    type: 'donut' | 'poop';
    start: { x: number; y: number };
    end: { x: number; y: number };
    targetId: string;
    xPercent: number;
    yPercent: number;
  }>>([]);

  const [splatters, setSplatters] = useState<Array<{
    id: string;
    type: 'donut' | 'poop';
    position: { x: number; y: number };
  }>>([]);

  const [heatmapState, setHeatmapState] = useState<{
    isActive: boolean;
    type: 'donut' | 'poop';
    votes: Array<{
      id: string;
      xPercent: number;
      yPercent: number;
      targetId: string;
    }>;
  }>({
    isActive: false,
    type: 'donut',
    votes: [],
  });

  // Store user's actual votes locally for heatmap display
  const [localVotes, setLocalVotes] = useState<Array<{
    id: string;
    type: 'donut' | 'poop';
    xPercent: number;
    yPercent: number;
    targetId: string;
  }>>([]);

  // === HANDLERS ===
  const handleGameSelect = useCallback((game: MiniGame) => {
    // Don't open game if flick mode is active
    if (activeMode) return;
    setSelectedGame(game);
    setGameModalOpen(true);
  }, [activeMode]);

  const handleGameModalClose = useCallback(() => {
    setGameModalOpen(false);
    setSelectedGame(null);
  }, []);

  const getTogglePosition = useCallback(() => {
    if (!toggleRef.current) {
      return { x: window.innerWidth - 60, y: window.innerHeight - 60 };
    }
    const rect = toggleRef.current.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }, []);

  // Handle card flick (called from GameCard) - supports rapid-fire multi-throw
  const handleCardFlick = useCallback((
    gameId: string,
    clickX: number,
    clickY: number,
    cardRect: DOMRect
  ) => {
    if (!activeMode) return;

    // Check if user has balance (use current state for optimistic check)
    const balance = activeMode === 'donut' ? donutBalance : poopBalance;
    if (balance <= 0) return;

    const startPos = getTogglePosition();
    const xPercent = Math.max(0, Math.min(100, ((clickX - cardRect.left) / cardRect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, ((clickY - cardRect.top) / cardRect.height) * 100));

    // Generate unique ID for this throw
    const emojiId = `emoji-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    SoundManager.playVoteThrow();

    // Add to flying emojis array (no blocking - allows rapid fire!)
    setFlyingEmojis(prev => [...prev, {
      id: emojiId,
      type: activeMode,
      start: startPos,
      end: { x: clickX, y: clickY },
      targetId: gameId,
      xPercent,
      yPercent,
    }]);

    // Optimistic balance decrement
    if (activeMode === 'donut') {
      setDonutBalance(prev => Math.max(0, prev - 1));
    } else {
      setPoopBalance(prev => Math.max(0, prev - 1));
    }
  }, [activeMode, getTogglePosition, donutBalance, poopBalance]);

  // Handle emoji landing - accepts id to support multiple simultaneous emojis
  const handleEmojiLand = useCallback(async (emojiId: string) => {
    // Find the emoji that landed
    const landedEmoji = flyingEmojis.find(e => e.id === emojiId);
    if (!landedEmoji) return;

    const { type, end, targetId, xPercent, yPercent } = landedEmoji;

    SoundManager.playVoteImpact(type);

    // Remove from flying array
    setFlyingEmojis(prev => prev.filter(e => e.id !== emojiId));

    // Add splatter effect
    const splatterId = `splatter-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setSplatters(prev => [...prev, {
      id: splatterId,
      type,
      position: end,
    }]);

    // Save vote locally for heatmap display
    setLocalVotes(prev => [...prev, {
      id: `vote-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      xPercent,
      yPercent,
      targetId,
    }]);

    // Send vote to server (balance already optimistically decremented)
    const result = await addVote(targetId, type, xPercent, yPercent);

    if (result.success && result.newBalance !== undefined) {
      // Always reconcile with server's authoritative balance
      if (type === 'donut') {
        setDonutBalance(result.newBalance);
      } else {
        setPoopBalance(result.newBalance);
      }
    } else if (!result.success) {
      // Vote failed — re-fetch authoritative balance from server
      try {
        const token = await getToken();
        if (token) {
          const res = await fetch('/api/shop/consumables', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setDonutBalance(data.donuts || 0);
            setPoopBalance(data.poops || 0);
          }
        }
      } catch {
        // Fallback: simple revert
        if (type === 'donut') {
          setDonutBalance(prev => prev + 1);
        } else {
          setPoopBalance(prev => prev + 1);
        }
      }
    }
  }, [flyingEmojis, addVote, getToken]);

  // Handle splatter completion - remove specific splatter by id
  const handleSplatterComplete = useCallback((splatterId: string) => {
    setSplatters(prev => prev.filter(s => s.id !== splatterId));
  }, []);

  const handleShowHeatmap = useCallback(async (type: 'donut' | 'poop') => {
    // Toggle off if already showing
    if (heatmapState.isActive) {
      setHeatmapState({ isActive: false, type: 'donut', votes: [] });
      return;
    }

    // Fetch community votes from the API
    const apiVotes = await fetchVotesForHeatmap(type);

    // Merge with local votes from this session (in case API hasn't synced yet)
    const localForType = localVotes
      .filter(v => v.type === type)
      .map(v => ({
        id: v.id,
        xPercent: v.xPercent,
        yPercent: v.yPercent,
        targetId: v.targetId,
      }));

    // Combine: API votes first, then local votes not yet in API
    const apiIds = new Set(apiVotes.map(v => v.id));
    const merged = [
      ...apiVotes.map(v => ({
        id: v.id,
        xPercent: v.xPercent,
        yPercent: v.yPercent,
        targetId: v.targetId,
      })),
      ...localForType.filter(v => !apiIds.has(v.id)),
    ];

    if (merged.length === 0) {
      return;
    }

    SoundManager.play('vote-rain');
    setHeatmapState({ isActive: true, type, votes: merged });
  }, [localVotes, heatmapState.isActive, fetchVotesForHeatmap]);

  const handleCloseHeatmap = useCallback(() => {
    setHeatmapState(prev => ({ ...prev, isActive: false, votes: [] }));
  }, []);

  // Filter games into playable and coming soon
  const playableGames = games.filter(game => game.status === 'available' && !game.disabled);
  const comingSoonGames = games.filter(game => game.status === 'coming-soon' || game.disabled);

  // === RENDER ===
  const gamesGridWithVoting = (
    <>
      <GamesGrid
        games={playableGames}
        onGameSelect={handleGameSelect}
        isLoading={isLoading}
        flickModeActive={activeMode}
        onFlick={handleCardFlick}
      />
      {comingSoonGames.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <button
            type="button"
            className="stats-trigger"
            onClick={() => setShowComingSoon(prev => !prev)}
            style={{ justifyContent: 'space-between' }}
          >
            <span>More Games Coming Soon ({comingSoonGames.length})</span>
            <span style={{ transform: showComingSoon ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
              ▼
            </span>
          </button>
          {showComingSoon && (
            <div style={{ marginTop: '12px', opacity: 0.6 }}>
              <GamesGrid
                games={comingSoonGames}
                onGameSelect={handleGameSelect}
                isLoading={false}
                flickModeActive={null}
              />
            </div>
          )}
        </div>
      )}
    </>
  );

  const gameSEO = (
    <PageSEO
      title="Free Arcade Games - 15 Browser Games with Leaderboards"
      description="Play 15 free arcade games including Flappy Orange, Snake, 2048, Memory Match, and more. Compete on global leaderboards, earn rewards, and challenge friends. No download required!"
      path="/games"
      structuredData={{
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Wojak.ink Arcade Games',
        description: 'Collection of 15 free browser-based arcade games',
        numberOfItems: 15,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Flappy Orange', url: 'https://wojak.ink/games/flappy' },
          { '@type': 'ListItem', position: 2, name: 'Memory Match', url: 'https://wojak.ink/games/memory' },
          { '@type': 'ListItem', position: 3, name: 'Orange Snake', url: 'https://wojak.ink/games/snake' },
          { '@type': 'ListItem', position: 4, name: 'Block Puzzle', url: 'https://wojak.ink/games/block-puzzle' },
          { '@type': 'ListItem', position: 5, name: 'Brick Breaker', url: 'https://wojak.ink/games/brick-breaker' },
        ],
      }}
    />
  );

  // Tab bar for Play/Scores toggle — uses fight-club-tabs styling for consistency
  const tabBar = (
    <div className="fight-club-tabs" style={{ marginBottom: '16px', width: 'fit-content' }}>
      <button
        type="button"
        className={`fight-club-tab flex items-center gap-1.5 ${activeTab === 'play' ? 'active' : ''}`}
        onClick={() => setActiveTab('play')}
      >
        <Gamepad2 size={16} />
        Play
      </button>
      <button
        type="button"
        className={`fight-club-tab flex items-center gap-1.5 ${activeTab === 'scores' ? 'active' : ''}`}
        onClick={() => setActiveTab('scores')}
      >
        <Trophy size={16} />
        Scores
      </button>
    </div>
  );

  // Desktop: 3-column layout that fits viewport
  if (isDesktop) {
    return (
      <PageTransition>
        {gameSEO}
        <div
          ref={containerRef}
          data-section="games"
          className={activeMode ? 'flick-mode-active' : ''}
          style={{
            padding: contentPadding,
            // Use minHeight instead of height to prevent clipping when DevTools shrinks viewport
            minHeight: 'calc(100vh - 64px)',
            // Allow content to scroll if it doesn't fit (e.g., with DevTools open)
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: '220px 1fr 220px',
              gap: '20px',
              minHeight: 0,
              maxWidth: '1400px',
              margin: '0 auto',
              width: '100%',
              // Align content to start, not center, to prevent top clipping
              alignContent: 'start',
              // Create stacking context above noise overlay (z-index:1)
              position: 'relative',
              zIndex: 1,
            }}
          >
            {activeTab === 'play' && <LeaderboardPanel />}
            {/* Remove justifyContent: 'center' - causes top row to be pushed up when viewport shrinks */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', minHeight: 0, gridColumn: activeTab === 'scores' ? '1 / -1' : undefined }}>
              {tabBar}
              {activeTab === 'play' ? gamesGridWithVoting : (
                <Leaderboard gameId="flappy-orange" showGameSelector excludeGames={['combat']} />
              )}
            </div>
            {/* Right column: Stats + Voting Panel (only in Play mode) */}
            {activeTab === 'play' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'auto' }}>
                <StatsPanel />
                <FlickModeToggle
                  ref={toggleRef}
                  activeMode={activeMode}
                  onModeChange={setActiveMode}
                  donutBalance={donutBalance}
                  poopBalance={poopBalance}
                  onShowHeatmap={handleShowHeatmap}
                  isHeatmapActive={heatmapState.isActive}
                  isHeatmapLoading={isVotingLoading}
                  isDesktop={true}
                  isSignedIn={isSignedIn}
                  onSignInClick={handleSignInClick}
                />
              </div>
            )}
          </div>
        </div>

        {/* Game Modal */}
        <GameModal game={selectedGame} isOpen={gameModalOpen} onClose={handleGameModalClose} />

        {/* Multiple flying emojis for rapid-fire support */}
        {flyingEmojis.map(emoji => (
          <FlyingEmoji
            key={emoji.id}
            id={emoji.id}
            type={emoji.type}
            startPosition={emoji.start}
            endPosition={emoji.end}
            onComplete={handleEmojiLand}
          />
        ))}

        {/* Multiple splatters for simultaneous impacts */}
        {splatters.map(splatter => (
          <SplatterEffect
            key={splatter.id}
            id={splatter.id}
            type={splatter.type}
            position={splatter.position}
            onComplete={handleSplatterComplete}
          />
        ))}

        {heatmapState.isActive && (
          <HeatmapRain
            votes={heatmapState.votes}
            type={heatmapState.type}
            containerRef={containerRef}
            onComplete={handleCloseHeatmap}
          />
        )}

      </PageTransition>
    );
  }

  // Mobile: Scrollable single column
  return (
    <PageTransition>
      {gameSEO}
      <div
        ref={containerRef}
        data-section="games"
        className={activeMode ? 'flick-mode-active' : ''}
        style={{ padding: contentPadding, minHeight: '100%' }}
      >
        <div style={{ paddingBottom: '96px', paddingTop: '16px' }}>
          {tabBar}

          {activeTab === 'play' ? (
            <>
              {gamesGridWithVoting}

              {/* Voting UI - Mobile: Inline below games */}
              <div style={{ marginTop: '24px' }}>
                <FlickModeToggle
                  ref={toggleRef}
                  activeMode={activeMode}
                  onModeChange={setActiveMode}
                  donutBalance={donutBalance}
                  poopBalance={poopBalance}
                  onShowHeatmap={handleShowHeatmap}
                  isHeatmapActive={heatmapState.isActive}
                  isHeatmapLoading={isVotingLoading}
                  isDesktop={false}
                  isSignedIn={isSignedIn}
                  onSignInClick={handleSignInClick}
                />
              </div>
            </>
          ) : (
            <Leaderboard gameId="flappy-orange" showGameSelector excludeGames={['combat']} />
          )}
        </div>
      </div>

      <GameModal game={selectedGame} isOpen={gameModalOpen} onClose={handleGameModalClose} />

      {/* Multiple flying emojis for rapid-fire support */}
      {flyingEmojis.map(emoji => (
        <FlyingEmoji
          key={emoji.id}
          id={emoji.id}
          type={emoji.type}
          startPosition={emoji.start}
          endPosition={emoji.end}
          onComplete={handleEmojiLand}
        />
      ))}

      {/* Multiple splatters for simultaneous impacts */}
      {splatters.map(splatter => (
        <SplatterEffect
          key={splatter.id}
          id={splatter.id}
          type={splatter.type}
          position={splatter.position}
          onComplete={handleSplatterComplete}
        />
      ))}

      {heatmapState.isActive && (
        <HeatmapRain
          votes={heatmapState.votes}
          type={heatmapState.type}
          containerRef={containerRef}
          onComplete={handleCloseHeatmap}
        />
      )}

    </PageTransition>
  );
}
