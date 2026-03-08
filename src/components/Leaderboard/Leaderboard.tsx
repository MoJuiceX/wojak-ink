/**
 * Leaderboard Component
 *
 * Premium Leaderboard with industry-standard design:
 * - Filter bar on top (time tabs left, player filter + countdown right)
 * - Podium as full-width hero section
 * - Clean list for remaining entries
 *
 * Layout:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  [Today] [This Week] [All Time]        [All Players v]  Resets in 2d   │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │                    🥈        👑        🥉                               │
 * │                    #2        #1        #3                               │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │  #4, #5, #6, #7...                                                      │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronDown, Trophy, Gamepad2, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useFriends } from '../../contexts/FriendsContext';
import { LeaderboardEntry } from './LeaderboardEntry';
import { MobilePodium } from './MobilePodium';
import { NFTGatePrompt } from './NFTGatePrompt';
import { CountdownTimer } from './CountdownTimer';
import { YourPositionBar } from './YourPositionBar';
import { YourPositionPeek } from './YourPositionPeek';
import { PersonalStatsPanel } from './PersonalStatsPanel';
import { useIsMobile } from '../../hooks/useMediaQuery';
import type { GameId } from '../../types/leaderboard';
import { GAME_NAMES, ACTIVE_GAME_IDS, DISABLED_GAME_IDS } from '../../types/leaderboard';
import { CombatLeaderboard } from '../combat';
import './Leaderboard.css';
import './MobilePodium.css';

// Type for leaderboard entry from API
interface LeaderboardEntryData {
  rank: number;
  userId: string;
  displayName: string;
  avatar: {
    type: 'emoji' | 'nft';
    value: string;
    source: 'default' | 'user' | 'wallet';
  };
  score: number;
  level?: number;
  createdAt: string;
  isCurrentUser?: boolean;
  equipped?: {
    nameEffect?: {
      id: string;
      css_class: string;
    };
    frame?: {
      id: string;
      css_class: string;
    };
    title?: {
      id: string;
      name: string;
    };
  };
}

// Type for user position from API
interface UserPosition {
  rank: number;
  score: number;
  totalPlayers: number;
  nextRival?: {
    userId: string;
    displayName: string;
    avatar: {
      type: 'emoji' | 'nft';
      value: string;
    };
    score: number;
    pointsAhead: number;
  };
}

// Game emojis for selector
const GAME_EMOJIS: Record<GameId, string> = {
  'orange-stack': '🧱',
  'memory-match': '🧠',
  'orange-pong': '🏓',
  'wojak-runner': '🏃',
  'orange-juggle': '🤹',
  'knife-game': '🔪',
  'color-reaction': '🎨',
  'merge-2048': '🔢',
  'orange-wordle': '🔤',
  'block-puzzle': '🧩',
  'flappy-orange': '🍊',
  'citrus-drop': '🍋',
  'orange-snake': '🐍',
  'brick-breaker': '🎯',
  'wojak-whack': '🔨',
  'brick-by-brick': '🧱',
  'combat': '⚔️',
};

interface LeaderboardProps {
  gameId: GameId;
  showGameSelector?: boolean;
  excludeGames?: string[];
}

type TimeframeType = 'all-time' | 'weekly';

const TIME_FILTERS: { value: TimeframeType; label: string }[] = [
  { value: 'weekly', label: 'This Week' },
  { value: 'all-time', label: 'All Time' },
];

export const Leaderboard: React.FC<LeaderboardProps> = ({
  gameId: initialGameId,
  showGameSelector = false,
  excludeGames = [],
}) => {
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { friends, isFriend } = useFriends();
  // Filter out excluded games from the available game lists
  const filteredActiveGames = ACTIVE_GAME_IDS.filter(id => !excludeGames.includes(id));
  const filteredDisabledGames = DISABLED_GAME_IDS.filter(id => !excludeGames.includes(id));

  // If initial game is excluded, default to the first available game
  const safeInitialGame = excludeGames.includes(initialGameId) && filteredActiveGames.length > 0
    ? filteredActiveGames[0]
    : initialGameId;

  const [selectedGame, setSelectedGame] = useState<GameId>(safeInitialGame);
  const [timeframe, setTimeframe] = useState<TimeframeType>('weekly');
  const [filter, setFilter] = useState<'all' | 'friends'>('all');
  const [isGameDropdownOpen, setIsGameDropdownOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const gameDropdownRef = useRef<HTMLDivElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Server-side leaderboard state
  const [entries, setEntries] = useState<LeaderboardEntryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [, setResetTime] = useState<string | undefined>(undefined);
  const requestIdRef = useRef(0);
  const requestAbortRef = useRef<AbortController | null>(null);
  const hasLoadedOnceRef = useRef(false);

  // Fetch leaderboard from server API
  const fetchLeaderboard = useCallback(async (gameId: GameId, tf: TimeframeType) => {
    requestAbortRef.current?.abort();
    const requestId = ++requestIdRef.current;

    // Combat leaderboard is rendered by CombatLeaderboard component — skip fetch
    if (gameId === 'combat') {
      setError(null);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    const showBlockingLoader = !hasLoadedOnceRef.current;
    if (showBlockingLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);
    const controller = new AbortController();
    requestAbortRef.current = controller;

    try {
      const response = await fetch(`/api/leaderboard/${gameId}?limit=100&timeframe=${tf}`, {
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      const data = await response.json();

      if (requestId !== requestIdRef.current) {
        return;
      }

      const entriesWithUser = (data.entries || []).map((entry: LeaderboardEntryData) => ({
        ...entry,
        isCurrentUser: user?.id === entry.userId,
      }));

      setEntries(entriesWithUser);
      setUserPosition(data.userPosition || null);
      setResetTime(data.resetTime);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      if (requestId !== requestIdRef.current) {
        return;
      }
      console.error('[Leaderboard] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      if (requestId === requestIdRef.current) {
        hasLoadedOnceRef.current = true;
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [user?.id]);

  // Filter entries based on selected tab
  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    if (filter === 'friends') {
      return entries.filter(entry => isFriend(entry.userId));
    }
    return entries;
  }, [entries, filter, isFriend]);

  // Check if current user is in the visible list
  const isUserInVisibleList = useMemo(() => {
    if (!user?.id) return false;
    return filteredEntries.some(entry => entry.userId === user.id);
  }, [filteredEntries, user?.id]);

  useEffect(() => {
    fetchLeaderboard(selectedGame, timeframe);
  }, [selectedGame, timeframe, fetchLeaderboard]);

  useEffect(() => () => {
    requestAbortRef.current?.abort();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (gameDropdownRef.current && !gameDropdownRef.current.contains(event.target as Node)) {
        setIsGameDropdownOpen(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isNftHolder = !!user && !!user.walletAddress && user.avatar.type === 'nft';
  const activeFilterIndex = TIME_FILTERS.findIndex(f => f.value === timeframe);
  const hasBlockingError = !!error && entries.length === 0;
  const hasRefreshError = !!error && entries.length > 0;

  const handleGameSelect = (gameId: GameId) => {
    setSelectedGame(gameId);
    setIsGameDropdownOpen(false);
  };

  return (
    <div className={`leaderboard-wrapper ${showGameSelector && !isMobile ? 'with-sidebar' : ''} ${!isMobile ? 'with-stats' : ''}`}>
      {/* Game Selector - Desktop Sidebar */}
      {showGameSelector && !isMobile && (
        <motion.div
          className="game-sidebar-desktop"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="game-sidebar-header">
            <Gamepad2 size={18} />
            <span>Games</span>
          </div>
          <div className="game-sidebar-list">
            {filteredActiveGames.map((id) => (
              <button
                key={id}
                className={`game-sidebar-item ${selectedGame === id ? 'selected' : ''}`}
                onClick={() => handleGameSelect(id)}
              >
                <span className="game-sidebar-emoji">{GAME_EMOJIS[id]}</span>
                <span className="game-sidebar-name">{GAME_NAMES[id]}</span>
              </button>
            ))}
            {filteredDisabledGames.map((id) => (
              <button
                key={id}
                className={`game-sidebar-item disabled ${selectedGame === id ? 'selected' : ''}`}
                disabled
                aria-disabled="true"
                title={`${GAME_NAMES[id]} is coming soon`}
              >
                <span className="game-sidebar-emoji">{GAME_EMOJIS[id]}</span>
                <span className="game-sidebar-name">{GAME_NAMES[id]}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Main Leaderboard Content */}
      <div className="leaderboard-container">
        
        {/* ===== MOBILE: Game Selector Dropdown ===== */}
        {showGameSelector && isMobile && (
          <div
            ref={gameDropdownRef}
            className={`game-selector-premium ${isGameDropdownOpen ? 'open' : ''}`}
          >
            <button
              className="game-selector-button"
              onClick={() => setIsGameDropdownOpen(!isGameDropdownOpen)}
            >
              <div className="selected-game">
                <span className="game-emoji">{GAME_EMOJIS[selectedGame]}</span>
                <span className="game-name-text">{GAME_NAMES[selectedGame]}</span>
              </div>
              <motion.div
                animate={{ rotate: isGameDropdownOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="dropdown-arrow" size={20} />
              </motion.div>
            </button>

            <AnimatePresence>
              {isGameDropdownOpen && (
                <motion.div
                  className="game-dropdown-menu"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  {filteredActiveGames.map((id, index) => (
                    <motion.button
                      type="button"
                      key={id}
                      className={`game-option ${selectedGame === id ? 'selected' : ''}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => handleGameSelect(id)}
                    >
                      <span className="game-emoji">{GAME_EMOJIS[id]}</span>
                      <span className="game-option-name">{GAME_NAMES[id]}</span>
                    </motion.button>
                  ))}
                  {filteredDisabledGames.length > 0 && (
                    <div className="game-dropdown-divider">
                      <span>Coming Soon</span>
                    </div>
                  )}
                  {filteredDisabledGames.map((id, index) => (
                    <motion.button
                      type="button"
                      key={id}
                      className={`game-option disabled ${selectedGame === id ? 'selected' : ''}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (filteredActiveGames.length + index) * 0.03 }}
                      disabled
                      aria-disabled="true"
                      title={`${GAME_NAMES[id]} is coming soon`}
                    >
                      <span className="game-emoji">{GAME_EMOJIS[id]}</span>
                      <span className="game-option-name">{GAME_NAMES[id]}</span>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ===== COMBAT: Custom Leaderboard ===== */}
        {selectedGame === 'combat' ? (
          <CombatLeaderboard />
        ) : (
        <>
        {/* ===== FILTER BAR ===== */}
        <motion.div
          className="leaderboard-filter-bar"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Left: Time Filter Tabs */}
          <div className="filter-bar-left">
            <div className="time-filters">
              <motion.div
                className="filter-indicator"
                layoutId="timeFilterIndicator"
                style={{ width: `${100 / TIME_FILTERS.length}%` }}
                animate={{ left: `${activeFilterIndex * (100 / TIME_FILTERS.length)}%` }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
              {TIME_FILTERS.map((f) => (
                <button
                  key={f.value}
                  className={`time-filter ${timeframe === f.value ? 'active' : ''}`}
                  onClick={() => setTimeframe(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Player Filter Dropdown + Countdown */}
          <div className="filter-bar-right">
            {/* Player Filter Dropdown */}
            <div
              ref={filterDropdownRef}
              className={`player-filter-dropdown ${isFilterDropdownOpen ? 'open' : ''}`}
            >
              <button
                className="player-filter-button"
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              >
                <Users size={14} />
                <span>{filter === 'all' ? 'All Players' : 'Friends'}</span>
                {filter === 'friends' && friends.length > 0 && (
                  <span className="filter-count">{friends.length}</span>
                )}
                <ChevronDown size={14} className={`dropdown-chevron ${isFilterDropdownOpen ? 'open' : ''}`} />
              </button>

              <AnimatePresence>
                {isFilterDropdownOpen && (
                  <motion.div
                    className="player-filter-menu"
                    initial={{ opacity: 0, y: -5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                  >
                    <button
                      className={`player-filter-option ${filter === 'all' ? 'selected' : ''}`}
                      onClick={() => { setFilter('all'); setIsFilterDropdownOpen(false); }}
                    >
                      All Players
                    </button>
                    <button
                      className={`player-filter-option ${filter === 'friends' ? 'selected' : ''}`}
                      onClick={() => { setFilter('friends'); setIsFilterDropdownOpen(false); }}
                    >
                      Friends
                      {friends.length > 0 && <span className="option-count">{friends.length}</span>}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Countdown Timer */}
            <CountdownTimer timeframe={timeframe} />
          </div>
        </motion.div>

        <div className="leaderboard-status-slot" aria-live="polite" aria-atomic="true">
          {!isLoading && isRefreshing && (
            <motion.div
              className="leaderboard-refresh-indicator"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span>Updating leaderboard...</span>
            </motion.div>
          )}

          {!isLoading && !isRefreshing && hasRefreshError && (
            <motion.div
              className="leaderboard-refresh-error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Couldn&apos;t refresh. Showing latest available rankings.
            </motion.div>
          )}
        </div>

        {/* ===== MOBILE: Podium + List Layout ===== */}
        {isMobile && (
          <>
            {/* Loading State - Mobile */}
            {isLoading && (
              <motion.div
                className="mobile-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                role="status"
                aria-label="Loading rankings"
              >
                <motion.div
                  className="loading-trophy"
                  animate={prefersReducedMotion ? {} : {
                    rotate: [0, 10, -10, 0],
                    y: [0, -5, 0],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Trophy size={40} />
                </motion.div>
                <p>Loading rankings...</p>
              </motion.div>
            )}

            {/* Mobile Podium - Top 3 (champion + runners-up) */}
            {!isLoading && !hasBlockingError && filteredEntries.length > 0 && (
              <MobilePodium
                entries={filteredEntries.slice(0, 3)}
                timeframe={timeframe}
              />
            )}

            {/* List starting from #4 - Mobile */}
            {!isLoading && !hasBlockingError && filteredEntries.length > 3 && (
              <motion.div
                className="leaderboard-list mobile-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {filteredEntries.slice(3).map((entry, index) => (
                  <LeaderboardEntry
                    key={`${entry.userId}-${entry.rank}`}
                    entry={entry}
                    index={index + 3}
                    isFriend={isFriend(entry.userId)}
                  />
                ))}
              </motion.div>
            )}

            {/* Empty State - Mobile */}
            {!isLoading && !hasBlockingError && filteredEntries.length === 0 && (
              <motion.div
                className="mobile-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="trophy-container">
                  <span className="trophy-icon">{filter === 'friends' ? '👥' : '🏆'}</span>
                </div>
                <h2 className="empty-title">
                  {filter === 'friends' ? 'No Friends Playing Yet' : 'The Arena Awaits'}
                </h2>
                <p className="empty-subtitle">
                  {filter === 'friends'
                    ? friends.length === 0
                      ? 'Add friends to see their scores here!'
                      : 'None of your friends have played this game yet.'
                    : timeframe === 'weekly'
                    ? 'No scores this week. Claim your glory!'
                    : 'Be the first to set a record!'}
                </p>
                <motion.button
                  type="button"
                  className="play-now-btn"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    window.location.href = filter === 'friends' && friends.length === 0 ? '/friends' : '/games';
                  }}
                >
                  <Gamepad2 size={18} />
                  {filter === 'friends' && friends.length === 0 ? 'Find Friends' : 'Start Playing'}
                </motion.button>
              </motion.div>
            )}

            {/* Error State - Mobile */}
            {!isLoading && hasBlockingError && (
              <motion.div
                className="mobile-error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <p>Failed to load leaderboard</p>
                <button type="button" onClick={() => fetchLeaderboard(selectedGame, timeframe)}>
                  Retry
                </button>
              </motion.div>
            )}
          </>
        )}

        {/* ===== DESKTOP: Original Podium Hero Section ===== */}
        {!isMobile && (
          <div className="leaderboard-podium-hero">
            <AnimatePresence mode="wait" initial={false}>
              {isLoading && (
                <motion.div
                  key="loading"
                  className="podium-loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  role="status"
                  aria-label="Loading rankings"
                >
                  <motion.div
                    className="loading-trophy"
                    animate={prefersReducedMotion ? {} : {
                      rotate: [0, 10, -10, 0],
                      y: [0, -5, 0],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Trophy size={48} />
                  </motion.div>
                  <p>Loading rankings...</p>
                </motion.div>
              )}

              {!isLoading && !hasBlockingError && filteredEntries.length >= 3 && (
                <motion.div
                  key="podium"
                  className="podium"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="podium-entry second"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.08 }}
                  >
                    <LeaderboardEntry
                      entry={filteredEntries[1]}
                      isPodium
                      podiumPosition={2}
                      index={1}
                      isFriend={isFriend(filteredEntries[1].userId)}
                    />
                  </motion.div>
                  <motion.div
                    className="podium-entry first"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.04 }}
                  >
                    <LeaderboardEntry
                      entry={filteredEntries[0]}
                      isPodium
                      podiumPosition={1}
                      index={0}
                      isFriend={isFriend(filteredEntries[0].userId)}
                    />
                  </motion.div>
                  <motion.div
                    className="podium-entry third"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.12 }}
                  >
                    <LeaderboardEntry
                      entry={filteredEntries[2]}
                      isPodium
                      podiumPosition={3}
                      index={2}
                      isFriend={isFriend(filteredEntries[2].userId)}
                    />
                  </motion.div>
                </motion.div>
              )}

              {!isLoading && !hasBlockingError && filteredEntries.length > 0 && filteredEntries.length < 3 && (
                <motion.div
                  key="partial-podium"
                  className="podium partial"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {filteredEntries.map((entry, index) => (
                    <motion.div
                      key={entry.userId}
                      className={`podium-entry ${index === 0 ? 'first' : index === 1 ? 'second' : 'third'}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.05 * (index + 1) }}
                    >
                      <LeaderboardEntry
                        entry={entry}
                        isPodium
                        podiumPosition={(index + 1) as 1 | 2 | 3}
                        index={index}
                        isFriend={isFriend(entry.userId)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {!isLoading && !hasBlockingError && filteredEntries.length === 0 && (
                <motion.div
                  key="empty"
                  className="podium podium-empty-shell"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="podium-entry second">
                    <div className="podium-card podium-card-placeholder position-2">
                      <div className="podium-rank">🥈</div>
                      <div className="podium-avatar-placeholder" />
                      <div className="podium-line-placeholder" />
                      <div className="podium-line-placeholder short" />
                    </div>
                  </div>
                  <div className="podium-entry first">
                    <div className="podium-card podium-card-placeholder position-1">
                      <div className="podium-rank">🥇</div>
                      <div className="podium-avatar-placeholder" />
                      <div className="podium-line-placeholder" />
                      <div className="podium-line-placeholder short" />
                    </div>
                  </div>
                  <div className="podium-entry third">
                    <div className="podium-card podium-card-placeholder position-3">
                      <div className="podium-rank">🥉</div>
                      <div className="podium-avatar-placeholder" />
                      <div className="podium-line-placeholder" />
                      <div className="podium-line-placeholder short" />
                    </div>
                  </div>
                </motion.div>
              )}

              {!isLoading && hasBlockingError && (
                <motion.div
                  key="error"
                  className="podium-error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <p>Failed to load leaderboard</p>
                  <button type="button" onClick={() => fetchLeaderboard(selectedGame, timeframe)}>
                    Retry
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* NFT Gate Prompt */}
        {user && !isNftHolder && <NFTGatePrompt />}

        {/* ===== DESKTOP: List (#4 onwards) ===== */}
        {!isMobile && !isLoading && !hasBlockingError && filteredEntries.length > 3 && (
          <motion.div
            className="leaderboard-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            {filteredEntries.slice(3).map((entry, index) => (
              <LeaderboardEntry
                key={`${entry.userId}-${entry.rank}`}
                entry={entry}
                index={index + 3}
                isFriend={isFriend(entry.userId)}
              />
            ))}
          </motion.div>
        )}

        {/* Keep desktop panel footprint visually stable when a timeframe has < 4 entries */}
        {!isMobile && !isLoading && !hasBlockingError && filteredEntries.length === 0 && (
          <div className="leaderboard-list leaderboard-list-empty-shell">
            <div className="leaderboard-empty-inline">
              <span className="leaderboard-empty-inline-icon">{filter === 'friends' ? '👥' : '🏆'}</span>
              <h2 className="empty-title">
                {filter === 'friends' ? 'No Friends Playing Yet' : 'The Arena Awaits'}
              </h2>
              <p className="empty-subtitle">
                {filter === 'friends'
                  ? friends.length === 0
                    ? 'Add friends to see their scores here!'
                    : 'None of your friends have played this game yet.'
                  : timeframe === 'weekly'
                  ? 'No scores this week. Claim your glory!'
                  : 'Be the first to set a record!'}
              </p>
              <motion.button
                type="button"
                className="play-now-btn"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  window.location.href = filter === 'friends' && friends.length === 0 ? '/friends' : '/games';
                }}
              >
                <Gamepad2 size={18} />
                {filter === 'friends' && friends.length === 0 ? 'Find Friends' : 'Start Playing'}
              </motion.button>
            </div>

            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={`leaderboard-empty-shell-row-${index}`}
                className="leaderboard-row leaderboard-row-shell"
              />
            ))}
          </div>
        )}

        {!isMobile && !isLoading && !hasBlockingError && filteredEntries.length > 0 && filteredEntries.length <= 3 && (
          <div className="leaderboard-list leaderboard-list-empty-shell leaderboard-list-empty-shell-passive" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`leaderboard-short-shell-row-${index}`}
                className="leaderboard-row leaderboard-row-shell"
              />
            ))}
          </div>
        )}

        {/* Position Indicator - Desktop */}
        {!isLoading && !hasBlockingError && userPosition && !isMobile && (
          <YourPositionBar
            userPosition={userPosition}
            isInVisibleList={isUserInVisibleList}
          />
        )}

        {/* Position Indicator - Mobile */}
        {!isLoading && !hasBlockingError && userPosition && isMobile && (
          <YourPositionPeek userPosition={userPosition} />
        )}

        {/* Personal Stats - Mobile */}
        {isMobile && user && (
          <PersonalStatsPanel className="mobile-stats" />
        )}
        </>
        )}
      </div>

      {/* Personal Stats - Desktop Sidebar */}
      {!isMobile && user && (
        <PersonalStatsPanel className="desktop-sidebar" />
      )}
    </div>
  );
};

export default Leaderboard;
