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
  'block-puzzle': '🧩',
  'flappy-orange': '🍊',
  'citrus-drop': '🍋',
  'orange-snake': '🐍',
  'brick-breaker': '🎯',
  'wojak-whack': '🔨',
  'combat': '⚔️',
};

interface LeaderboardProps {
  gameId: GameId;
  showGameSelector?: boolean;
}

type TimeframeType = 'all-time' | 'weekly';

const TIME_FILTERS: { value: TimeframeType; label: string }[] = [
  { value: 'weekly', label: 'This Week' },
  { value: 'all-time', label: 'All Time' },
];

export const Leaderboard: React.FC<LeaderboardProps> = ({
  gameId: initialGameId,
  showGameSelector = false,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { friends, isFriend } = useFriends();
  const [selectedGame, setSelectedGame] = useState<GameId>(initialGameId);
  const [timeframe, setTimeframe] = useState<TimeframeType>('weekly');
  const [filter, setFilter] = useState<'all' | 'friends'>('all');
  const [isGameDropdownOpen, setIsGameDropdownOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const gameDropdownRef = useRef<HTMLDivElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Server-side leaderboard state
  const [entries, setEntries] = useState<LeaderboardEntryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [, setResetTime] = useState<string | undefined>(undefined);

  // Fetch leaderboard from server API
  const fetchLeaderboard = useCallback(async (gameId: GameId, tf: TimeframeType) => {
    // Combat leaderboard is rendered by CombatLeaderboard component — skip fetch
    if (gameId === 'combat') {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/leaderboard/${gameId}?limit=100&timeframe=${tf}`);
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      const data = await response.json();

      const entriesWithUser = (data.entries || []).map((entry: LeaderboardEntryData) => ({
        ...entry,
        isCurrentUser: user?.id === entry.userId,
      }));

      setEntries(entriesWithUser);
      setUserPosition(data.userPosition || null);
      setResetTime(data.resetTime);
    } catch (err) {
      console.error('[Leaderboard] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setIsLoading(false);
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

  const isNftHolder = !!user;
  const activeFilterIndex = TIME_FILTERS.findIndex(f => f.value === timeframe);

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
            {ACTIVE_GAME_IDS.map((id) => (
              <button
                key={id}
                className={`game-sidebar-item ${selectedGame === id ? 'selected' : ''}`}
                onClick={() => handleGameSelect(id)}
              >
                <span className="game-sidebar-emoji">{GAME_EMOJIS[id]}</span>
                <span className="game-sidebar-name">{GAME_NAMES[id]}</span>
              </button>
            ))}
            {DISABLED_GAME_IDS.map((id) => (
              <button
                key={id}
                className={`game-sidebar-item disabled ${selectedGame === id ? 'selected' : ''}`}
                onClick={() => handleGameSelect(id)}
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
                  {ACTIVE_GAME_IDS.map((id, index) => (
                    <motion.button
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
                  <div className="game-dropdown-divider">
                    <span>Coming Soon</span>
                  </div>
                  {DISABLED_GAME_IDS.map((id, index) => (
                    <motion.button
                      key={id}
                      className={`game-option disabled ${selectedGame === id ? 'selected' : ''}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (ACTIVE_GAME_IDS.length + index) * 0.03 }}
                      onClick={() => handleGameSelect(id)}
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

        {/* ===== MOBILE: Podium + List Layout ===== */}
        {isMobile && (
          <>
            {/* Loading State - Mobile */}
            {isLoading && (
              <motion.div
                className="mobile-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
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
            {!isLoading && !error && filteredEntries.length > 0 && (
              <MobilePodium
                entries={filteredEntries.slice(0, 3)}
                timeframe={timeframe}
              />
            )}

            {/* List starting from #4 - Mobile */}
            {!isLoading && !error && filteredEntries.length > 3 && (
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
            {!isLoading && !error && filteredEntries.length === 0 && (
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
            {!isLoading && error && (
              <motion.div
                className="mobile-error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <p>Failed to load leaderboard</p>
                <button onClick={() => fetchLeaderboard(selectedGame, timeframe)}>
                  Retry
                </button>
              </motion.div>
            )}
          </>
        )}

        {/* ===== DESKTOP: Original Podium Hero Section ===== */}
        {!isMobile && (
          <div className="leaderboard-podium-hero">
            <AnimatePresence mode="wait">
              {isLoading && (
                <motion.div
                  key="loading"
                  className="podium-loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
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

              {!isLoading && !error && filteredEntries.length >= 3 && (
                <motion.div
                  key="podium"
                  className="podium"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="podium-entry second"
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
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
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
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
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
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

              {!isLoading && !error && filteredEntries.length > 0 && filteredEntries.length < 3 && (
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
                      initial={{ y: 40, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.1 * (index + 1) }}
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

              {!isLoading && !error && filteredEntries.length === 0 && (
                <motion.div
                  key="empty"
                  className="podium-empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="trophy-container"
                    animate={prefersReducedMotion ? {} : {
                      y: [0, -15, 0],
                      rotateY: [0, 10, 0, -10, 0],
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <span className="trophy-icon">{filter === 'friends' ? '👥' : '🏆'}</span>
                    {!prefersReducedMotion && (
                      <>
                        <motion.span className="sparkle sparkle-1" animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>✨</motion.span>
                        <motion.span className="sparkle sparkle-2" animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity, delay: 0.7 }}>✨</motion.span>
                        <motion.span className="sparkle sparkle-3" animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity, delay: 1.4 }}>✨</motion.span>
                      </>
                    )}
                  </motion.div>
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

              {!isLoading && error && (
                <motion.div
                  key="error"
                  className="podium-error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <p>Failed to load leaderboard</p>
                  <button onClick={() => fetchLeaderboard(selectedGame, timeframe)}>
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
        {!isMobile && !isLoading && !error && filteredEntries.length > 3 && (
          <motion.div
            className="leaderboard-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
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

        {/* Position Indicator - Desktop */}
        {!isLoading && !error && userPosition && !isMobile && (
          <YourPositionBar
            userPosition={userPosition}
            isInVisibleList={isUserInVisibleList}
          />
        )}

        {/* Position Indicator - Mobile */}
        {!isLoading && !error && userPosition && isMobile && (
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
