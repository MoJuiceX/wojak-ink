/**
 * Wojak Merge 2048
 *
 * 4x4 merge game where tiles display real Wojak NFT images.
 * Merging two same-badge tiles produces the next rarer badge.
 * Progression: Phunky → High Council → Bepe Army → Honk Gang →
 *   Pirate → Super Saiyan → Ronin → Neckbeard → Royal Club →
 *   Hellspawn → Namekian (WIN!)
 *
 * Layout: Left sidebar (badge progression) | Right (board + controls)
 *
 * Architecture based on Bram Cohen's tile-array design:
 * tiles[] is source of truth, grid derived on demand, CSS transitions animate.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useLeaderboard } from '@/hooks/data/useLeaderboard';
import { GameShell } from '@/systems/game-ui';
import { useEffects } from '@/systems/effects';
import { useGameSounds } from '@/hooks/useGameSounds';
import { useHaptic } from '@/hooks/useHaptic';
import { useArcadeLights } from '@/contexts/ArcadeLightsContext';
import type { GameEvent } from '@/config/arcade-light-mappings';
import ArcadeGameOverScreen from '@/components/media/games/ArcadeGameOverScreen';
import { generateGameScorecard } from '@/systems/sharing/GameScorecard';
import { captureGameArea } from '@/systems/sharing/captureDOM';
import { getNftImageUrl as getCollectionNftImageUrl } from '@/services/constants';
import BADGE_NFTS from '../NFT2048/badgeNfts.json';
import './Merge2048Game.css';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROWS = 4;
const COLS = 4;
const WIN_VALUE = 2048;
const SLIDE_DURATION = 150; // ms — matches CSS transition

const TILE_BADGES: Record<number, string> = {
  2: 'Phunky',
  4: 'High Council',
  8: 'Bepe Army',
  16: 'Honk Gang',
  32: 'Pirate',
  64: 'Super Saiyan',
  128: 'Ronin',
  256: 'Neckbeard',
  512: 'Royal Club',
  1024: 'Hellspawn',
  2048: 'Namekian',
};

/** Ordered progression from lowest to highest value */
const BADGE_ORDER = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];

/**
 * Snake layout: 2 columns, 6 rows.
 * Even rows go left→right, odd rows go right→left.
 * Arrows connect badges showing the merge progression path.
 *
 * Row 0: Phunky    →  High Council
 *                           ↓
 * Row 1: Honk Gang ← Bepe Army
 *   ↓
 * Row 2: Pirate    →  Super Saiyan
 *                           ↓
 * Row 3: Neckbeard ← Ronin
 *   ↓
 * Row 4: Royal Club → Hellspawn
 *                           ↓
 * Row 5:              Namekian
 */
const SNAKE_GRID: { val: number; row: number; col: number }[] = [
  { val: 2, row: 0, col: 0 },
  { val: 4, row: 0, col: 1 },
  { val: 8, row: 1, col: 1 },
  { val: 16, row: 1, col: 0 },
  { val: 32, row: 2, col: 0 },
  { val: 64, row: 2, col: 1 },
  { val: 128, row: 3, col: 1 },
  { val: 256, row: 3, col: 0 },
  { val: 512, row: 4, col: 0 },
  { val: 1024, row: 4, col: 1 },
  { val: 2048, row: 5, col: 1 },
];

/** Arrow direction between each consecutive pair */
type ArrowDir = 'right' | 'left' | 'uturn-right' | 'uturn-left';
const SNAKE_ARROWS: { afterIndex: number; dir: ArrowDir }[] = [
  { afterIndex: 0, dir: 'right' },        // Phunky → High Council
  { afterIndex: 1, dir: 'uturn-right' },   // High Council ↓ Bepe Army (col 1, goes right)
  { afterIndex: 2, dir: 'left' },          // Bepe Army → Honk Gang
  { afterIndex: 3, dir: 'uturn-left' },    // Honk Gang ↓ Pirate (col 0, goes left)
  { afterIndex: 4, dir: 'right' },         // Pirate → Super Saiyan
  { afterIndex: 5, dir: 'uturn-right' },   // Super Saiyan ↓ Ronin (col 1, goes right)
  { afterIndex: 6, dir: 'left' },          // Ronin → Neckbeard
  { afterIndex: 7, dir: 'uturn-left' },    // Neckbeard ↓ Royal Club (col 0, goes left)
  { afterIndex: 8, dir: 'right' },         // Royal Club → Hellspawn
  { afterIndex: 9, dir: 'uturn-right' },   // Hellspawn ↓ Namekian (col 1, goes right)
];

/** Rarity tier colors for sidebar badges */
const BADGE_COLORS: Record<number, string> = {
  2: 'rgba(255,255,255,0.5)',
  4: 'rgba(255,255,255,0.5)',
  8: 'rgba(255,255,255,0.5)',
  16: '#4ade80',
  32: '#4ade80',
  64: '#f59e0b',
  128: '#f59e0b',
  256: '#8b5cf6',
  512: '#8b5cf6',
  1024: '#ec4899',
  2048: '#10b981',
};

type Direction = 'up' | 'down' | 'left' | 'right';
type GameState = 'playing' | 'won' | 'over';

// ---------------------------------------------------------------------------
// Tutorial steps
// ---------------------------------------------------------------------------

interface TutorialStepDef {
  title: string;
  message: string;
  setupTiles?: { row: number; col: number; value: number }[];
  spawnAfterPrev?: { row: number; col: number; value: number };
  targetValue: number; // 0 = any move, -1 = final (overlay)
}

const TUTORIAL_STEPS: TutorialStepDef[] = [
  {
    title: 'WELCOME TO WOJAK MERGE',
    message: 'Use the arrow keys or swipe to move the tiles.',
    setupTiles: [
      { row: 1, col: 1, value: 2 },
      { row: 3, col: 3, value: 2 },
    ],
    targetValue: 0,
  },
  {
    title: 'MAKE A MATCH',
    message: 'The tiles all moved and a new one appeared. Try moving the Phunky tiles towards each other.',
    spawnAfterPrev: { row: 0, col: 0, value: 2 },
    targetValue: 4,
  },
  {
    title: 'BOOM!',
    message: 'NFTs with the same badge merge when they touch! Keep going — merge two High Council into a Bepe Army.',
    spawnAfterPrev: { row: 0, col: 3, value: 4 },
    targetValue: 8,
  },
  {
    title: 'NICE!',
    message: "You're getting the hang of it! Merge two Bepe Army tiles into a Honk Gang.",
    spawnAfterPrev: { row: 3, col: 0, value: 8 },
    targetValue: 16,
  },
  {
    title: "YOU'RE READY",
    message: 'Keep merging NFTs to reach the legendary Namekian! Each merge creates a rarer badge. Good luck!',
    targetValue: -1,
  },
];

interface Tile {
  id: number;
  row: number;
  col: number;
  value: number;
  nftId: number;
  badge: string;
  isNew: boolean;
  isMerged: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Pick one random NFT per tile value.
 * If a previous map is provided, only re-randomize badges the player
 * actually reached (value <= highestReached). Unreached badges keep
 * their images — avoids unnecessary loads and gives visual continuity.
 */
function pickNftMap(
  prev?: Record<number, number>,
  highestReached?: number,
): Record<number, number> {
  const map: Record<number, number> = {};
  for (const [val, badge] of Object.entries(TILE_BADGES)) {
    const v = Number(val);
    const ids = (BADGE_NFTS as Record<string, number[]>)[badge] || [1];
    if (prev && highestReached && v > highestReached) {
      // Player never reached this badge — keep the previous NFT
      map[v] = prev[v] ?? ids[Math.floor(Math.random() * ids.length)];
    } else {
      map[v] = ids[Math.floor(Math.random() * ids.length)];
    }
  }
  return map;
}

/** Preload images for the NFT map so tiles render instantly */
function preloadNftImages(nftMapObj: Record<number, number>) {
  for (const nftId of Object.values(nftMapObj)) {
    const img = new Image();
    img.src = getCollectionNftImageUrl(nftId);
  }
}

/** Derive 2D grid (value only) from tile array */
function getGrid(tiles: Tile[]): number[][] {
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  for (const t of tiles) grid[t.row][t.col] = t.value;
  return grid;
}

/**
 * Safety guard: remove duplicate tiles at the same cell.
 * Keeps the tile with the higher value (or higher id if equal).
 * Prevents ghost-tile data corruption from the flat-array design.
 */
function dedupeTiles(tiles: Tile[]): Tile[] {
  const seen = new Map<string, Tile>();
  for (const t of tiles) {
    const key = `${t.row},${t.col}`;
    const prev = seen.get(key);
    if (!prev || t.value > prev.value || (t.value === prev.value && t.id > prev.id)) {
      seen.set(key, t);
    }
  }
  return seen.size === tiles.length ? tiles : Array.from(seen.values());
}

function checkGameOver(tiles: Tile[]): boolean {
  const grid = getGrid(tiles);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === 0) return false;
      if (c < COLS - 1 && grid[r][c] === grid[r][c + 1]) return false;
      if (r < ROWS - 1 && grid[r][c] === grid[r + 1][c]) return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Board sizing
// ---------------------------------------------------------------------------

function calculateSizes(containerW?: number, containerH?: number) {
  const cw = containerW || window.innerWidth;
  const ch = containerH || window.innerHeight;
  const showSidebar = cw >= 560;
  // Both sides flex:1 — reserve minimum content width for each
  const sideReserve = showSidebar ? 240 : 32;
  const maxW = cw - sideReserve;
  const maxH = ch;
  const maxBoard = Math.min(maxW, maxH);
  const gap = Math.floor(maxBoard * 0.02);
  const padding = gap;
  const cellSize = Math.floor((maxBoard - padding * 2 - gap * (COLS - 1)) / COLS);
  const boardW = cellSize * COLS + gap * (COLS - 1) + padding * 2;
  const boardH = cellSize * ROWS + gap * (ROWS - 1) + padding * 2;
  return { cellSize, gap, padding, boardW, boardH, showSidebar };
}

function getPosition(
  row: number,
  col: number,
  cellSize: number,
  gap: number,
  padding: number,
) {
  return {
    top: padding + row * (cellSize + gap),
    left: padding + col * (cellSize + gap),
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Merge2048Game: React.FC = () => {
  // Layout
  const [sizes, setSizes] = useState(calculateSizes);

  // Game state
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    const saved = localStorage.getItem('merge2048-best');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [gameState, setGameState] = useState<GameState>('playing');
  const [keepPlaying, setKeepPlaying] = useState(false);

  // Tutorial
  const [isTutorial, setIsTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const tutorialStepRef = useRef(0); // mirror for use inside move() closure

  // Fixed NFT per tile value (regenerated each new game)
  const nftMap = useRef<Record<number, number>>(pickNftMap());

  // Refs
  const nextId = useRef(0);
  const isAnimating = useRef(false);
  const totalMerges = useRef(0);
  const highestTile = useRef(0);
  const touchStart = useRef({ x: 0, y: 0 });
  const boardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Juice systems
  const effects = useEffects();
  const { playMatchFound, playWinSound, playMergeTile, playTileSpawn, playInvalidMove, playMergeGameOver } = useGameSounds();
  const haptic = useHaptic();
  const { triggerEvent, setGameId } = useArcadeLights();

  // Register game for per-game light profile
  useEffect(() => {
    setGameId('merge-2048');
  }, [setGameId]);

  // Juice tracking refs
  const pendingMerges = useRef<{ value: number; row: number; col: number }[]>([]);
  const moveCombo = useRef(0);
  const milestonesReached = useRef(new Set<number>());
  const [dangerLevel, setDangerLevel] = useState<'safe' | 'warning' | 'critical'>('safe');
  const [displayScore, setDisplayScore] = useState(0);
  const animatingScoreRef = useRef<number | null>(null);
  const undoSnapshot = useRef<{ tiles: Tile[]; score: number } | null>(null);
  const [undoUsed, setUndoUsed] = useState(false);

  // Leaderboard
  const { leaderboard: globalLeaderboard, submitScore, isSignedIn, userDisplayName, isSubmitting } = useLeaderboard('merge-2048');
  const scoreSubmitted = useRef(false);
  const [scoreSubmittedState, setScoreSubmittedState] = useState(false);
  const [isNewPersonalBest, setIsNewPersonalBest] = useState(false);
  const [gameScreenshot, setGameScreenshot] = useState<string | null>(null);

  // ------------------------------------------------------------------
  // Tile creation
  // ------------------------------------------------------------------

  const makeTile = useCallback(
    (row: number, col: number, value: number, isNew = false): Tile => {
      const badge = TILE_BADGES[value] || 'Phunky';
      return {
        id: nextId.current++,
        row,
        col,
        value,
        nftId: nftMap.current[value] || 1,
        badge,
        isNew,
        isMerged: false,
      };
    },
    [],
  );

  // ------------------------------------------------------------------
  // New game
  // ------------------------------------------------------------------

  const newGame = useCallback(() => {
    nextId.current = 0;
    isAnimating.current = false;
    totalMerges.current = 0;
    scoreSubmitted.current = false;
    setScoreSubmittedState(false);
    setIsNewPersonalBest(false);
    setGameScreenshot(null);
    // Only re-randomize badges the player actually reached
    nftMap.current = pickNftMap(nftMap.current, highestTile.current);
    highestTile.current = 0;
    preloadNftImages(nftMap.current);
    setScore(0);
    setDisplayScore(0);
    setGameState('playing');
    setKeepPlaying(false);

    // Reset juice state
    milestonesReached.current = new Set();
    pendingMerges.current = [];
    moveCombo.current = 0;
    setDangerLevel('safe');
    undoSnapshot.current = null;
    setUndoUsed(false);

    // Spawn two random tiles
    const emptyCells: { r: number; c: number }[] = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) emptyCells.push({ r, c });

    const first = emptyCells.splice(
      Math.floor(Math.random() * emptyCells.length),
      1,
    )[0];
    const second = emptyCells.splice(
      Math.floor(Math.random() * emptyCells.length),
      1,
    )[0];

    setTiles([
      makeTile(first.r, first.c, 2, true),
      makeTile(second.r, second.c, 2, true),
    ]);

    // Arcade lights: game started
    triggerEvent('play:active');
  }, [makeTile, triggerEvent]);

  // ------------------------------------------------------------------
  // Tutorial
  // ------------------------------------------------------------------

  const startTutorial = useCallback(() => {
    nextId.current = 0;
    isAnimating.current = false;
    totalMerges.current = 0;
    scoreSubmitted.current = false;
    nftMap.current = pickNftMap(nftMap.current, highestTile.current);
    highestTile.current = 0;
    preloadNftImages(nftMap.current);
    setScore(0);
    setDisplayScore(0);
    setGameState('playing');
    setKeepPlaying(false);
    setDangerLevel('safe');
    undoSnapshot.current = null;
    setUndoUsed(false);
    milestonesReached.current = new Set();
    setIsTutorial(true);
    setTutorialStep(0);
    tutorialStepRef.current = 0;

    // Place step-0 tiles
    const step0 = TUTORIAL_STEPS[0];
    if (step0.setupTiles) {
      setTiles(step0.setupTiles.map((t) => makeTile(t.row, t.col, t.value, true)));
    }
  }, [makeTile]);

  const endTutorial = useCallback(() => {
    setIsTutorial(false);
    setTutorialStep(0);
    tutorialStepRef.current = 0;
    newGame();
  }, [newGame]);

  const handleUndo = useCallback(() => {
    if (undoUsed || !undoSnapshot.current || isAnimating.current) return;
    const snap = undoSnapshot.current;
    setTiles(snap.tiles);
    setScore(snap.score);
    setUndoUsed(true);
    undoSnapshot.current = null;
    setDangerLevel('safe');
    setGameState('playing');
  }, [undoUsed]);

  // Init on mount
  useEffect(() => {
    newGame();
  }, [newGame]);

  // Measure the arcade screen container to get real available space.
  // Walk up past GameShell's .game-shell div (which has min-height: 100vh)
  // to the actual constrained arcade frame area.
  useEffect(() => {
    const el = containerRef.current;
    // Walk up: .nft-merge-game → .nft-merge-wrapper → .game-shell → arcade container
    let target = el?.parentElement || el; // .nft-merge-wrapper
    if (target?.parentElement?.classList.contains('game-shell')) {
      target = target.parentElement.parentElement || target;
    }
    if (!target) return;
    const measure = () => {
      const rect = target.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSizes(calculateSizes(rect.width, rect.height));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(target);
    return () => ro.disconnect();
  }, []);

  // ------------------------------------------------------------------
  // Move logic (Bram Cohen's direction-agnostic line iterator)
  // ------------------------------------------------------------------

  const move = useCallback(
    (direction: Direction) => {
      if (isAnimating.current) return;
      if (gameState === 'over') return;
      if (gameState === 'won' && !keepPlaying) return;

      setTiles((prevTiles) => {
        // Save undo snapshot (before any changes)
        if (!undoUsed) {
          undoSnapshot.current = { tiles: prevTiles.map(t => ({ ...t })), score };
        }

        // Reset per-move juice counters
        pendingMerges.current = [];
        moveCombo.current = 0;

        // Direction mapping
        const isHorizontal = direction === 'left' || direction === 'right';
        const isReversed = direction === 'right' || direction === 'down';
        const primarySize = isHorizontal ? ROWS : COLS;
        const secondarySize = isHorizontal ? COLS : ROWS;

        const getRC = (i: number, j: number) => {
          const jj = isReversed ? secondarySize - 1 - j : j;
          return isHorizontal ? { row: i, col: jj } : { row: jj, col: i };
        };

        const newTiles = prevTiles.map((t) => ({
          ...t,
          isNew: false,
          isMerged: false,
        }));
        let moved = false;
        let scoreGain = 0;
        const toRemove: number[] = [];
        const toAdd: Tile[] = [];

        for (let i = 0; i < primarySize; i++) {
          // Collect tiles in this line, in order
          const line: Tile[] = [];
          for (let j = 0; j < secondarySize; j++) {
            const { row, col } = getRC(i, j);
            const tile = newTiles.find(
              (t) => t.row === row && t.col === col && !toRemove.includes(t.id),
            );
            if (tile) line.push(tile);
          }

          let targetJ = 0;
          let skip = false;

          for (let idx = 0; idx < line.length; idx++) {
            if (skip) {
              skip = false;
              continue;
            }

            const tile = line[idx];
            const nextTile = line[idx + 1];
            const { row: tR, col: tC } = getRC(i, targetJ);

            if (nextTile && tile.value === nextTile.value) {
              // Merge
              const newValue = tile.value * 2;
              scoreGain += newValue;
              totalMerges.current++;
              if (newValue > highestTile.current) highestTile.current = newValue;

              toRemove.push(tile.id, nextTile.id);
              // Move both toward target during slide
              tile.row = tR;
              tile.col = tC;
              nextTile.row = tR;
              nextTile.col = tC;

              const merged = makeTile(tR, tC, newValue);
              merged.isMerged = true;
              toAdd.push(merged);

              // Track for juice effects
              pendingMerges.current.push({ value: newValue, row: tR, col: tC });
              moveCombo.current++;

              skip = true;
              moved = true;
            } else {
              // Slide
              if (tile.row !== tR || tile.col !== tC) {
                tile.row = tR;
                tile.col = tC;
                moved = true;
              }
            }
            targetJ++;
          }
        }

        if (!moved) {
          // Invalid move — sound + haptic
          playInvalidMove();
          haptic.tap();
          triggerEvent('miss:light');
          return prevTiles;
        }

        isAnimating.current = true;

        // Freeze frame: add 50ms weight to big merges (256+)
        const hasBigMerge = pendingMerges.current.some(m => m.value >= 256);
        const freezeDelay = hasBigMerge ? 50 : 0;

        // Phase 1: slide (CSS transition handles visual).
        // Return tiles with updated positions (merged tiles not yet swapped).
        // After SLIDE_DURATION, swap in merged tiles + spawn.
        setTimeout(() => {
          let gameEnded = false;

          setTiles((current) => {
            const removeSet = new Set(toRemove);
            const afterMerge = current.filter((t) => !removeSet.has(t.id));
            afterMerge.push(...toAdd);

            const curStep = tutorialStepRef.current;
            const inTutorial = curStep >= 0 && curStep < TUTORIAL_STEPS.length;

            if (inTutorial && isTutorial) {
              // ── Tutorial spawn logic ──
              const step = TUTORIAL_STEPS[curStep];

              // Check if step target is met
              const targetMet =
                step.targetValue === 0 || // any move
                (step.targetValue > 0 &&
                  afterMerge.some((t) => t.value >= step.targetValue));

              if (targetMet) {
                const nextStep = curStep + 1;
                tutorialStepRef.current = nextStep;
                setTutorialStep(nextStep);

                // Spawn the next step's guided tile (if defined and cell is empty)
                if (nextStep < TUTORIAL_STEPS.length) {
                  const ns = TUTORIAL_STEPS[nextStep];
                  if (ns.spawnAfterPrev) {
                    const grid = getGrid(afterMerge);
                    const { row: sr, col: sc, value: sv } = ns.spawnAfterPrev;
                    if (grid[sr][sc] === 0) {
                      afterMerge.push(makeTile(sr, sc, sv, true));
                    } else {
                      // Fallback: find an empty cell for the guided tile
                      const empty: { r: number; c: number }[] = [];
                      for (let r = 0; r < ROWS; r++)
                        for (let c = 0; c < COLS; c++)
                          if (grid[r][c] === 0) empty.push({ r, c });
                      if (empty.length > 0) {
                        const { r, c } = empty[Math.floor(Math.random() * empty.length)];
                        afterMerge.push(makeTile(r, c, sv, true));
                      }
                    }
                  }
                }
              } else {
                // Step not met yet — spawn a random Phunky (value 2) to keep board playable
                const grid = getGrid(afterMerge);
                const empty: { r: number; c: number }[] = [];
                for (let r = 0; r < ROWS; r++)
                  for (let c = 0; c < COLS; c++)
                    if (grid[r][c] === 0) empty.push({ r, c });
                if (empty.length > 0) {
                  const { r, c } = empty[Math.floor(Math.random() * empty.length)];
                  afterMerge.push(makeTile(r, c, 2, true));
                }
              }
            } else {
              // ── Normal spawn logic ──
              const grid = getGrid(afterMerge);
              const empty: { r: number; c: number }[] = [];
              for (let r = 0; r < ROWS; r++)
                for (let c = 0; c < COLS; c++)
                  if (grid[r][c] === 0) empty.push({ r, c });

              if (empty.length > 0) {
                const { r, c } =
                  empty[Math.floor(Math.random() * empty.length)];
                const spawnValue = Math.random() < 0.9 ? 2 : 4;
                afterMerge.push(makeTile(r, c, spawnValue, true));
              }

              // Check win
              const hasWinTile = afterMerge.some((t) => t.value >= WIN_VALUE);
              if (hasWinTile && !keepPlaying) {
                setGameState('won');
              }

              // Check game over
              if (checkGameOver(afterMerge)) {
                gameEnded = true;
                // Capture screenshot before visual changes
                if (boardRef.current) {
                  captureGameArea(boardRef.current).then(setGameScreenshot).catch(() => {});
                }
                setGameState('over');
              }
            }

            isAnimating.current = false;
            return dedupeTiles(afterMerge);
          });

          // Update score (skip in tutorial)
          if (scoreGain > 0 && !isTutorial) {
            setScore((prev) => {
              const newScore = prev + scoreGain;
              setBestScore((best) => {
                const updated = Math.max(best, newScore);
                localStorage.setItem('merge2048-best', String(updated));
                return updated;
              });
              return newScore;
            });
          }

          // Skip juice if game just ended — only the game-over effect should play
          if (gameEnded) return;

          // ── Juice: fire effects after tiles arrive ──
          const boardEl = boardRef.current;
          const boardRect = boardEl?.getBoundingClientRect();

          for (const m of pendingMerges.current) {
            // Sound — pitch scales with tile value
            playMergeTile(m.value);

            // Haptic — intensity scales with tile value
            // Arcade lights — escalating merge events
            if (m.value >= 512) {
              haptic.celebration();
              triggerEvent('score:large');
            } else if (m.value >= 128) {
              haptic.success();
              triggerEvent('score:medium');
            } else if (m.value >= 64) {
              haptic.success();
              triggerEvent('score:small');
            } else {
              haptic.tap();
            }

            // Visual effects at merge position
            if (boardRect) {
              const pos = getPosition(m.row, m.col, cellSize, gap, padding);
              const screenX = boardRect.left + pos.left + cellSize / 2;
              const screenY = boardRect.top + pos.top + cellSize / 2;

              effects.trigger({
                type: 'shockwave',
                intensity: m.value >= 256 ? 'strong' : 'normal',
                position: { x: screenX, y: screenY },
              });
              effects.trigger({
                type: 'scorePopup',
                data: { score: m.value },
                position: { x: screenX, y: screenY },
              });
              if (m.value >= 256) {
                effects.trigger({
                  type: 'sparks',
                  intensity: m.value >= 512 ? 'strong' : 'normal',
                  position: { x: screenX, y: screenY },
                });
              }
            }

            // Milestone celebrations (512, 1024, 2048)
            if (
              (m.value === 512 || m.value === 1024 || m.value === 2048) &&
              !milestonesReached.current.has(m.value)
            ) {
              milestonesReached.current.add(m.value);
              effects.trigger({ type: 'confetti', intensity: 'strong' });
              haptic.celebration();
              if (m.value === 2048) {
                playWinSound();
                triggerEvent('game:win');
              } else {
                playMatchFound();
                triggerEvent('progress:complete');
              }
            }
          }

          // Combo counter (visual, no score change)
          if (moveCombo.current >= 2) {
            effects.trigger({
              type: 'comboText',
              data: { combo: moveCombo.current },
            });
            // Arcade lights: combo chain
            const comboTier = moveCombo.current >= 5 ? 'max' : moveCombo.current >= 4 ? 'high' : moveCombo.current >= 3 ? 'mid' : 'low';
            triggerEvent(`combo:${comboTier}` as GameEvent);
          }

          // Spawn sound
          playTileSpawn();

          // Danger state — count empty cells after this move
          setTiles((afterAll) => {
            const grid = getGrid(afterAll);
            let empties = 0;
            for (let r = 0; r < ROWS; r++)
              for (let c = 0; c < COLS; c++)
                if (grid[r][c] === 0) empties++;
            if (empties <= 2) {
              setDangerLevel('critical');
              triggerEvent('damage:light');
            } else if (empties <= 4) {
              setDangerLevel('warning');
              triggerEvent('damage:light');
            } else {
              setDangerLevel('safe');
            }
            return afterAll; // no change
          });
        }, SLIDE_DURATION + freezeDelay);

        return newTiles;
      });
    },
    // `move` is intentionally stable for input handlers and animation timing; exhaustive deps would cause heavy callback churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gameState, keepPlaying, makeTile, isTutorial],
  );

  // ------------------------------------------------------------------
  // Leaderboard submission on game over
  // ------------------------------------------------------------------

  useEffect(() => {
    if (
      gameState === 'over' &&
      isSignedIn &&
      !scoreSubmitted.current &&
      totalMerges.current >= 3
    ) {
      scoreSubmitted.current = true;
      setScoreSubmittedState(true);
      submitScore(score, undefined, {
        highestTile: highestTile.current,
        totalMerges: totalMerges.current,
      }).then((result) => {
        if (result?.success && result.isNewHighScore) {
          setIsNewPersonalBest(true);
        }
      });
    }
  }, [gameState, isSignedIn, score, submitScore]);

  // Game over / win juice — keep it positive, encourage replay
  useEffect(() => {
    if (gameState === 'over' && !isTutorial) {
      playMergeGameOver();
      haptic.tap();
      triggerEvent('game:over');
    }
  }, [gameState, isTutorial, playMergeGameOver, haptic, triggerEvent]);

  // Share handler — generates scorecard image, triggers download + native share
  const handleShare = useCallback(async () => {
    try {
      const blob = await generateGameScorecard({
        gameName: 'Wojak Merge',
        gameNameParts: ['WOJAK', 'MERGE'],
        score,
        scoreLabel: 'points',
        bestScore: bestScore,
        isNewRecord: isNewPersonalBest,
        screenshot: gameScreenshot,
        accentColor: '#10b981',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `wojak-merge-${score}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);

      if (navigator.share && navigator.canShare) {
        const file = new File([blob], 'wojak-merge-score.png', { type: 'image/png' });
        const shareData = {
          title: 'Wojak Merge Score',
          text: `🔢 I scored ${score} points in Wojak Merge! Can you beat me?`,
          files: [file],
        };
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
        }
      }
    } catch {
      const text = `🔢 Wojak Merge: ${score} points!\n\nCan you beat my score?\n\nhttps://wojak.ink/games`;
      if (navigator.share) {
        await navigator.share({ title: 'Wojak Merge', text });
      } else {
        await navigator.clipboard.writeText(text);
      }
    }
  }, [score, bestScore, isNewPersonalBest, gameScreenshot]);

  // Animated score counter
  useEffect(() => {
    if (score === displayScore) return;
    const start = displayScore;
    const startTime = performance.now();
    const animate = (now: number) => {
      const t = Math.min((now - startTime) / 300, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplayScore(Math.floor(start + (score - start) * eased));
      if (t < 1) {
        animatingScoreRef.current = requestAnimationFrame(animate);
      }
    };
    animatingScoreRef.current = requestAnimationFrame(animate);
    return () => {
      if (animatingScoreRef.current) cancelAnimationFrame(animatingScoreRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  // ------------------------------------------------------------------
  // Keyboard input
  // ------------------------------------------------------------------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        move(dir);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move]);

  // ------------------------------------------------------------------
  // Touch / swipe input
  // ------------------------------------------------------------------

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const onTouchStart = (e: TouchEvent) => {
      touchStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    };

    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStart.current.x;
      const dy = e.changedTouches[0].clientY - touchStart.current.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (Math.max(absDx, absDy) < 30) return; // too short

      if (absDx > absDy) {
        move(dx > 0 ? 'right' : 'left');
      } else {
        move(dy > 0 ? 'down' : 'up');
      }
    };

    board.addEventListener('touchstart', onTouchStart, { passive: true });
    board.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      board.removeEventListener('touchstart', onTouchStart);
      board.removeEventListener('touchend', onTouchEnd);
    };
  }, [move]);

  // ------------------------------------------------------------------
  // Clear isNew/isMerged flags after animation
  // ------------------------------------------------------------------

  useEffect(() => {
    const hasAnim = tiles.some((t) => t.isNew || t.isMerged);
    if (!hasAnim) return;
    const timer = setTimeout(() => {
      setTiles((prev) =>
        prev.map((t) =>
          t.isNew || t.isMerged ? { ...t, isNew: false, isMerged: false } : t,
        ),
      );
    }, 200);
    return () => clearTimeout(timer);
  }, [tiles]);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  const { cellSize, gap, padding, boardW, boardH, showSidebar } = sizes;

  // Background grid cells
  const gridCells = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const pos = getPosition(r, c, cellSize, gap, padding);
      gridCells.push(
        <div
          key={`cell-${r}-${c}`}
          className="nft-merge-cell"
          style={{
            width: cellSize,
            height: cellSize,
            top: pos.top,
            left: pos.left,
          }}
        />,
      );
    }
  }

  // Build snake arrow SVGs
  const arrowSvg = (dir: ArrowDir) => {
    const stroke = 'rgba(255,255,255,0.35)';
    if (dir === 'right')
      return (
        <svg width="18" height="14" viewBox="0 0 12 10" fill="none">
          <path d="M1 5H11M8 2L11 5L8 8" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    if (dir === 'left')
      return (
        <svg width="18" height="14" viewBox="0 0 12 10" fill="none">
          <path d="M11 5H1M4 2L1 5L4 8" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    if (dir === 'uturn-right')
      return (
        <svg width="100%" height="100%" viewBox="0 0 18 100" fill="none" preserveAspectRatio="none">
          <path d="M0 0 H13 V100 H0" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M4 96 L0 100" stroke={stroke} strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
      );
    // uturn-left
    return (
      <svg width="100%" height="100%" viewBox="0 0 18 100" fill="none" preserveAspectRatio="none">
        <path d="M18 0 H5 V100 H18" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M14 96 L18 100" stroke={stroke} strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    );
  };

  // Tutorial banner — rendered outside the game canvas, pinned to bottom
  const tutorialBanner = isTutorial && tutorialStep < TUTORIAL_STEPS.length - 1 && (
    <div className="tutorial-banner">
      <strong className="tutorial-banner-title">
        {TUTORIAL_STEPS[tutorialStep].title}
      </strong>
      <p className="tutorial-banner-message">
        {TUTORIAL_STEPS[tutorialStep].message}
      </p>
    </div>
  );

  const boardElement = (
    <div
      ref={boardRef}
      className={`nft-merge-board${dangerLevel !== 'safe' ? ` danger-${dangerLevel}` : ''}`}
      style={{ width: boardW, height: boardH }}
    >
      {gridCells}

      {tiles.map((tile) => {
        const pos = getPosition(tile.row, tile.col, cellSize, gap, padding);
        return (
          <div
            key={tile.id}
            className={[
              'nft-tile',
              `nft-tile-${tile.value}`,
              tile.isNew ? 'nft-tile-new' : '',
              tile.isMerged ? 'nft-tile-merged' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              width: cellSize,
              height: cellSize,
              top: pos.top,
              left: pos.left,
            }}
          >
            <img
              src={getCollectionNftImageUrl(tile.nftId)}
              alt={`${tile.badge} #${tile.nftId}`}
              className="nft-tile-image"
              draggable={false}
            />
          </div>
        );
      })}

      {/* Win overlay */}
      {gameState === 'won' && !isTutorial && (
        <div className="nft-merge-overlay nft-merge-win">
          <div className="nft-merge-overlay-content">
            <img
              src={getCollectionNftImageUrl(nftMap.current[2048] || 3703)}
              alt="Namekian"
              className="nft-merge-win-nft"
            />
            <h3>NAMEKIAN!</h3>
            <p>Only 7 exist. You reached the top.</p>
            <div className="nft-merge-overlay-buttons">
              <button
                type="button"
                onClick={() => {
                  setKeepPlaying(true);
                  setGameState('playing');
                }}
              >
                Keep Going
              </button>
              <button type="button" onClick={newGame}>
                New Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial complete overlay */}
      {isTutorial && tutorialStep >= TUTORIAL_STEPS.length - 1 && (
        <div className="nft-merge-overlay tutorial-complete-overlay">
          <div className="nft-merge-overlay-content">
            <h3>You're Ready</h3>
            <p>
              Keep merging NFTs to reach the legendary Namekian!
              <br />
              Each merge creates a rarer badge. Good luck!
            </p>
            <button type="button" onClick={endTutorial}>
              Start Playing
            </button>
          </div>
        </div>
      )}

      {/* Game over — handled by ArcadeGameOverScreen at wrapper level */}
    </div>
  );

  // Shared game over screen (used in both desktop and mobile layouts)
  const gameOverScreen = gameState === 'over' && !isTutorial ? (
    <ArcadeGameOverScreen
      score={score}
      highScore={bestScore}
      scoreLabel="points"
      isNewPersonalBest={isNewPersonalBest}
      isSignedIn={isSignedIn}
      isSubmitting={isSubmitting}
      scoreSubmitted={scoreSubmittedState}
      userDisplayName={userDisplayName ?? undefined}
      leaderboard={globalLeaderboard}
      onPlayAgain={newGame}
      onShare={handleShare}
      accentColor="#10b981"
      meetsMinimumActions={totalMerges.current >= 3}
      minimumActionsMessage="Make at least 3 merges to be on the leaderboard"
    />
  ) : null;

  // ── Desktop: sidebar | board | controls (row) ──
  if (showSidebar) {
    return (
      <div className="nft-merge-wrapper">
        <div ref={containerRef} className="nft-merge-game">
          <div className="nft-merge-sidebar" style={{ height: boardH }}>
            <div className="snake-grid">
              {SNAKE_GRID.map((item, idx) => (
                <div
                  key={item.val}
                  className={`snake-cell snake-r${item.row} snake-c${item.col} ${
                    highestTile.current >= item.val ? 'snake-reached' : ''
                  }`}
                >
                  <img
                    src={getCollectionNftImageUrl(nftMap.current[item.val] || 1)}
                    alt={TILE_BADGES[item.val]}
                    className="snake-badge-img"
                    draggable={false}
                  />
                  <span
                    className="snake-badge-name"
                    style={{ color: BADGE_COLORS[item.val] }}
                  >
                    {TILE_BADGES[item.val]}
                  </span>
                  {idx < SNAKE_ARROWS.length && (
                    <div className={`snake-arrow snake-arrow-${SNAKE_ARROWS[idx].dir}`}>
                      {arrowSvg(SNAKE_ARROWS[idx].dir)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="nft-merge-center">
            {boardElement}
            {tutorialBanner}
          </div>

          <div className="nft-merge-controls">
            <div className="nft-merge-title">
              <h2>Wojak Merge</h2>
              <span className="nft-merge-subtitle">Phunky to Namekian</span>
            </div>

            <div className="score-box">
              <span className="score-label">Score</span>
              <span className="score-value">{displayScore}</span>
            </div>
            <div className="score-box">
              <span className="score-label">Best</span>
              <span className="score-value">{bestScore}</span>
            </div>

            <button
              type="button"
              className="nft-merge-new-game"
              onClick={isTutorial ? endTutorial : newGame}
            >
              New Game
            </button>
            <button
              type="button"
              className="nft-merge-tutorial-btn"
              onClick={startTutorial}
              style={isTutorial ? { visibility: 'hidden' } : undefined}
            >
              Tutorial
            </button>
            <button
              type="button"
              className="nft-merge-tutorial-btn"
              onClick={handleUndo}
              disabled={undoUsed || !undoSnapshot.current || isTutorial}
              style={{
                opacity: undoUsed || !undoSnapshot.current || isTutorial ? 0.3 : 1,
              }}
            >
              Undo
            </button>
          </div>
          {gameOverScreen}
        </div>
      </div>
    );
  }

  // ── Mobile: stacked column layout ──
  return (
    <div className="nft-merge-wrapper">
      <div ref={containerRef} className="nft-merge-game nft-merge-game-mobile">
        <div className="nft-merge-mobile-header">
          <div className="nft-merge-scores">
            <div className="score-box">
              <span className="score-label">Score</span>
              <span className="score-value">{displayScore}</span>
            </div>
            <div className="score-box">
              <span className="score-label">Best</span>
              <span className="score-value">{bestScore}</span>
            </div>
          </div>
          <div className="nft-merge-buttons">
            <button
              type="button"
              className="nft-merge-new-game"
              onClick={isTutorial ? endTutorial : newGame}
            >
              New Game
            </button>
            <button
              type="button"
              className="nft-merge-tutorial-btn"
              onClick={startTutorial}
              style={isTutorial ? { visibility: 'hidden' } : undefined}
            >
              Tutorial
            </button>
          </div>
        </div>

        <div className="nft-merge-legend-mobile">
          {BADGE_ORDER.map((val, idx) => (
            <span key={val} className="legend-mobile-item">
              <img
                src={getCollectionNftImageUrl(nftMap.current[val] || 1)}
                alt={TILE_BADGES[val]}
                className="legend-mobile-img"
                draggable={false}
              />
              {idx < BADGE_ORDER.length - 1 && (
                <span className="legend-mobile-arrow">&rsaquo;</span>
              )}
            </span>
          ))}
        </div>

        <div className="nft-merge-center">
          {boardElement}
          {tutorialBanner}
        </div>
        {gameOverScreen}
      </div>
    </div>
  );
};

const Merge2048Wrapped: React.FC = () => (
  <GameShell gameId="merge-2048">
    <Merge2048Game />
  </GameShell>
);

export default Merge2048Wrapped;
