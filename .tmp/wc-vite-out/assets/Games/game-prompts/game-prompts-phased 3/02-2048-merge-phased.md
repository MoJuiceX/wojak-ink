# 2048 Merge Game - Phased Build Guide

> **Game ID**: `2048-merge`
> **Rendering**: DOM/CSS (no Canvas needed)
> **Complexity**: Medium
> **Prerequisites**: Run `00-MASTER-INDEX.md` setup first

---

## PHASE 1: Component Structure & Grid State

### Prompt for Claude Code:

```
Create the 2048 Merge game component structure for wojak.ink.

REQUIREMENTS:
1. Create file: src/games/Merge2048/Merge2048Game.tsx
2. Use TypeScript with proper interfaces
3. 4x4 grid (16 cells)
4. Orange citrus theme (#ff6b00 primary)

INTERFACES NEEDED:
interface Tile {
  id: number;
  value: number;     // 2, 4, 8, 16... (citrus sizes)
  row: number;
  col: number;
  isNew?: boolean;   // for spawn animation
  isMerged?: boolean; // for merge animation
}

interface GameState {
  tiles: Tile[];
  score: number;
  bestScore: number;
  isGameOver: boolean;
  hasWon: boolean;  // reached 2048
}

STATE TO IMPLEMENT:
- tiles: Tile[] - array of active tiles
- score: number - current score
- gameOver: boolean
- nextTileId: number - for unique keys

INITIAL RENDER:
- 4x4 grid with empty cell backgrounds
- Score display at top
- "New Game" button
- Grid should be centered, responsive

GRID STYLING:
- Grid background: #bbada0 (classic 2048 style but can adjust)
- Empty cells: slightly darker
- Cell size: calc based on container
- Gap between cells: 12px
- Border radius on cells: 6px

TILE VALUE → COLOR MAPPING (citrus theme):
2: #eee4da (seed)
4: #ede0c8 (small citrus)
8: #f2b179 (orange slice)
16: #f59563 (mandarin)
32: #f67c5f (blood orange)
64: #f65e3b (tangerine)
128: #edcf72 (lemon)
256: #edcc61 (grapefruit)
512: #edc850 (pomelo)
1024: #edc53f (golden citrus)
2048: #ff6b00 (THE ORANGE - victory!)

COMPONENT STRUCTURE:
const Merge2048Game: React.FC = () => {
  const { width, height } = useDimensions();
  const isMobile = useIsMobile();

  // Grid dimensions
  const GRID_SIZE = 4;
  const CELL_GAP = 12;
  const gridWidth = isMobile ? width - 32 : 400;
  const cellSize = (gridWidth - (CELL_GAP * (GRID_SIZE + 1))) / GRID_SIZE;

  const [tiles, setTiles] = useState<Tile[]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // Initialize with 2 random tiles
  useEffect(() => {
    initGame();
  }, []);

  return (
    <div className="merge-2048-container">
      <div className="game-header">
        <div className="score-box">
          <span>SCORE</span>
          <span>{score}</span>
        </div>
        <button onClick={initGame}>New Game</button>
      </div>
      <div className="grid-container">
        {/* Background cells */}
        {/* Tiles rendered absolutely positioned */}
      </div>
    </div>
  );
};

HELPER FUNCTIONS NEEDED:
- getEmptyCells(): returns array of {row, col} for empty positions
- spawnTile(): adds new tile (90% chance of 2, 10% chance of 4)
- initGame(): clears board, spawns 2 tiles

DO NOT implement swipe/move logic yet - just the visual grid and initial spawn.
```

### ✅ Phase 1 Checkpoint

**Test these manually:**
- [ ] Grid renders as 4x4 with visible cell backgrounds
- [ ] Two tiles appear on initial load
- [ ] Tiles show correct numbers (2 or 4)
- [ ] Tiles have correct colors based on value
- [ ] "New Game" button resets the board
- [ ] Score displays (should be 0 initially)
- [ ] Grid is centered and responsive

**Debug Prompt if issues:**
```
The 2048 grid isn't rendering correctly. Current issues: [describe]

Check:
1. Is gridWidth calculated correctly for mobile?
2. Are tiles positioned with position: absolute inside a relative container?
3. Is the tile transform using: translate(${col * (cellSize + gap)}px, ${row * (cellSize + gap)}px)?
4. Are empty background cells rendering behind the tiles?

Show me the current CSS and the tile positioning logic.
```

---

## PHASE 2: Swipe Detection & Move Logic

### Prompt for Claude Code:

```
Add swipe/keyboard controls and move logic to the 2048 game.

CURRENT STATE: Grid renders, tiles spawn, but no movement.

CONTROLS TO ADD:

1. KEYBOARD (Desktop):
- ArrowUp / W: move up
- ArrowDown / S: move down
- ArrowLeft / A: move left
- ArrowRight / D: move right

2. TOUCH SWIPE (Mobile):
- Detect swipe direction with minimum threshold (50px)
- Prevent default scroll behavior during game

SWIPE DETECTION:
const touchStartRef = useRef<{x: number, y: number} | null>(null);

const handleTouchStart = (e: TouchEvent) => {
  const touch = e.touches[0];
  touchStartRef.current = { x: touch.clientX, y: touch.clientY };
};

const handleTouchEnd = (e: TouchEvent) => {
  if (!touchStartRef.current) return;
  const touch = e.changedTouches[0];
  const deltaX = touch.clientX - touchStartRef.current.x;
  const deltaY = touch.clientY - touchStartRef.current.y;
  const minSwipe = 50;

  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    if (Math.abs(deltaX) > minSwipe) {
      deltaX > 0 ? move('right') : move('left');
    }
  } else {
    if (Math.abs(deltaY) > minSwipe) {
      deltaY > 0 ? move('down') : move('up');
    }
  }
  touchStartRef.current = null;
};

MOVE LOGIC (this is the tricky part):

type Direction = 'up' | 'down' | 'left' | 'right';

const move = (direction: Direction) => {
  // 1. Create a 2D grid representation from tiles
  // 2. For each row/column in move direction:
  //    - Collect non-empty tiles
  //    - Slide them (remove gaps)
  //    - Merge adjacent same-value tiles (only once per tile per move)
  //    - Track score from merges
  // 3. Update tile positions
  // 4. If anything moved, spawn new tile
  // 5. Check for game over
};

MERGE RULES:
- Tiles merge when two of same value collide
- Merged tile = 2x the value
- Each tile can only merge ONCE per move
- Score += merged tile value
- Example: [2,2,4,4] sliding right → [_,4,_,8] (two merges)

GRID HELPER:
// Convert tiles array to 2D grid
const tilesToGrid = (tiles: Tile[]): (Tile | null)[][] => {
  const grid: (Tile | null)[][] = Array(4).fill(null).map(() => Array(4).fill(null));
  tiles.forEach(tile => {
    grid[tile.row][tile.col] = tile;
  });
  return grid;
};

// Slide and merge a single row/column
const slideAndMerge = (line: (Tile | null)[]): { tiles: Tile[], scoreGained: number } => {
  // Filter out nulls
  let filtered = line.filter(t => t !== null) as Tile[];
  let scoreGained = 0;
  let merged: Tile[] = [];

  for (let i = 0; i < filtered.length; i++) {
    if (i < filtered.length - 1 && filtered[i].value === filtered[i + 1].value) {
      // Merge
      merged.push({
        ...filtered[i],
        value: filtered[i].value * 2,
        isMerged: true
      });
      scoreGained += filtered[i].value * 2;
      i++; // Skip next tile (it was merged)
    } else {
      merged.push({ ...filtered[i], isMerged: false });
    }
  }

  return { tiles: merged, scoreGained };
};

AFTER MOVE:
- If any tile moved/merged → spawn new tile (after animation delay ~150ms)
- Reset isNew and isMerged flags after animation

DO NOT add game over detection yet, just movement and spawning.
```

### ✅ Phase 2 Checkpoint

**Test these manually:**
- [ ] Keyboard arrows move tiles
- [ ] WASD keys also work
- [ ] Swipe on mobile moves tiles
- [ ] Tiles slide to edge in swipe direction
- [ ] Same-value tiles merge (2+2=4, 4+4=8, etc.)
- [ ] Score increases by merged value
- [ ] New tile spawns after valid move
- [ ] If no tiles move (blocked), no new tile spawns
- [ ] [2,2,2,2] in a row becomes [4,4] not [8] (each tile merges once)

**Debug Prompt if issues:**
```
The 2048 move/merge logic isn't working correctly.

Current behavior: [describe what's happening]
Expected behavior: [describe what should happen]

Common issues:
1. Are tiles merging multiple times in one move? (Check isMerged flag)
2. Is the move direction logic correct? (up: row decreasing, down: row increasing)
3. Are new positions being calculated correctly after slide?
4. Is the board comparison checking if anything actually moved?

Show me the slideAndMerge function and how you're applying it to each row/column.
```

---

## PHASE 3: Animations & Tile Transitions

### Prompt for Claude Code:

```
Add smooth animations to the 2048 game tiles.

CURRENT STATE: Movement works but tiles jump instantly.

ANIMATIONS NEEDED:

1. SLIDE ANIMATION (tiles moving):
- Duration: 150ms
- Easing: ease-out
- Use CSS transform for performance

2. SPAWN ANIMATION (new tiles):
- Scale from 0 to 1
- Duration: 200ms
- Slight bounce effect

3. MERGE ANIMATION (tiles combining):
- Quick scale pulse: 1 → 1.2 → 1
- Duration: 200ms

CSS FOR TILES:
.tile {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  border-radius: 6px;
  transition: transform 150ms ease-out;
  /* Size and position set via style prop */
}

.tile.is-new {
  animation: tile-spawn 200ms ease-out;
}

.tile.is-merged {
  animation: tile-merge 200ms ease-out;
}

@keyframes tile-spawn {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes tile-merge {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

TILE RENDERING:
{tiles.map(tile => (
  <div
    key={tile.id}
    className={`tile ${tile.isNew ? 'is-new' : ''} ${tile.isMerged ? 'is-merged' : ''}`}
    style={{
      width: cellSize,
      height: cellSize,
      transform: `translate(${tile.col * (cellSize + CELL_GAP) + CELL_GAP}px, ${tile.row * (cellSize + CELL_GAP) + CELL_GAP}px)`,
      backgroundColor: getTileColor(tile.value),
      color: tile.value <= 4 ? '#776e65' : '#f9f6f2',
      fontSize: tile.value >= 1000 ? '24px' : tile.value >= 100 ? '32px' : '40px',
    }}
  >
    {tile.value}
  </div>
))}

ANIMATION TIMING:
After a move:
1. Immediately update tile positions (CSS transition handles slide)
2. Wait 150ms (slide duration)
3. Spawn new tile with isNew: true
4. After 200ms, clear isNew flag
5. For merged tiles, set isMerged: true, clear after 200ms

ANIMATION STATE MANAGEMENT:
const [animating, setAnimating] = useState(false);

// Prevent moves during animation
const move = (direction: Direction) => {
  if (animating || gameOver) return;

  setAnimating(true);
  // ... move logic ...

  setTimeout(() => {
    // Spawn new tile
    spawnTile();
    setTimeout(() => {
      // Clear animation flags
      setAnimating(false);
    }, 200);
  }, 150);
};

ENSURE smooth 60fps animations - no jank!
```

### ✅ Phase 3 Checkpoint

**Test these manually:**
- [ ] Tiles slide smoothly (not instant)
- [ ] New tiles pop in with scale animation
- [ ] Merged tiles pulse briefly
- [ ] No visual glitches during rapid moves
- [ ] Animation timing feels snappy (~150ms slide)
- [ ] Can't spam moves during animation
- [ ] Animations work on mobile (no lag)

**Debug Prompt if issues:**
```
The 2048 animations aren't smooth. Issues: [describe]

Check:
1. Is position set via transform (not top/left)?
2. Is the transition property on the tile class?
3. Are you using requestAnimationFrame for timing?
4. Is will-change: transform set for performance?
5. Are tile keys stable (using tile.id not index)?

Show me the tile CSS and the move timing logic.
```

---

## PHASE 4: Game Over, Win State & Effects

### Prompt for Claude Code:

```
Add game over detection, win state, and visual effects to 2048.

CURRENT STATE: Game plays smoothly but never ends.

GAME OVER DETECTION:
const checkGameOver = (tiles: Tile[]): boolean => {
  // Game over if:
  // 1. All 16 cells are filled AND
  // 2. No adjacent tiles can merge

  if (tiles.length < 16) return false;

  const grid = tilesToGrid(tiles);

  // Check for any possible merges
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const current = grid[row][col];
      if (!current) return false; // Empty cell exists

      // Check right neighbor
      if (col < 3 && grid[row][col + 1]?.value === current.value) {
        return false; // Can merge right
      }
      // Check bottom neighbor
      if (row < 3 && grid[row + 1][col]?.value === current.value) {
        return false; // Can merge down
      }
    }
  }

  return true; // No moves possible
};

WIN DETECTION:
const checkWin = (tiles: Tile[]): boolean => {
  return tiles.some(tile => tile.value === 2048);
};

GAME OVER OVERLAY:
{gameOver && (
  <div className="game-overlay game-over">
    <h2>Game Over!</h2>
    <p>Final Score: {score}</p>
    <button onClick={initGame}>Try Again</button>
    <button onClick={submitScore}>Submit Score</button>
  </div>
)}

WIN OVERLAY:
{hasWon && !dismissedWin && (
  <div className="game-overlay win">
    <h2>🍊 YOU WIN! 🍊</h2>
    <p>You reached 2048!</p>
    <button onClick={() => setDismissedWin(true)}>Keep Playing</button>
    <button onClick={submitScore}>Submit Score</button>
  </div>
)}

VISUAL EFFECTS TO ADD:

1. SCORE POP:
When score increases, show floating +X:
const [scorePop, setScorePop] = useState<number | null>(null);

// On merge:
setScorePop(gainedScore);
setTimeout(() => setScorePop(null), 600);

{scorePop && (
  <div className="score-pop">+{scorePop}</div>
)}

2. COMBO EFFECTS (optional enhancement):
Track consecutive moves with merges:
- 3+ merge moves in a row: "NICE!" callout
- 5+ merge moves: screen shake
- Big merge (256+): special celebration

3. TILE GLOW:
High-value tiles (512+) get a subtle glow:
.tile.high-value {
  box-shadow: 0 0 20px rgba(255, 107, 0, 0.5);
}

4. SCREEN SHAKE (on big merges):
const [shaking, setShaking] = useState(false);

// When creating 256+ tile:
setShaking(true);
setTimeout(() => setShaking(false), 300);

<div className={`grid-container ${shaking ? 'shake' : ''}`}>

.shake {
  animation: shake 0.3s ease-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

OVERLAY STYLING:
.game-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(238, 228, 218, 0.9);
  border-radius: 6px;
  z-index: 100;
}

.game-overlay.win {
  background: rgba(255, 107, 0, 0.9);
  color: white;
}
```

### ✅ Phase 4 Checkpoint

**Test these manually:**
- [ ] Game detects when no moves are possible
- [ ] Game over overlay appears with final score
- [ ] Win overlay appears when 2048 is reached
- [ ] "Keep Playing" allows continuing after win
- [ ] Score pop animation shows on merges
- [ ] Screen shake on big merges (256+)
- [ ] High-value tiles have visual distinction
- [ ] New Game button works from game over state

**Debug Prompt if issues:**
```
The 2048 game over / win detection isn't working correctly.

Issue: [describe - e.g., "game over triggers too early" or "win not detected"]

Check:
1. Is checkGameOver running after each move completes (after spawn)?
2. Is the grid correctly checking ALL adjacent pairs?
3. Is win check looking for value === 2048 (not >= 2048)?
4. Are the overlays positioned correctly with z-index?

Log the game state when issues occur: console.log('Tiles:', tiles.length, 'GameOver:', checkGameOver(tiles));
```

---

## PHASE 5: Audio, Leaderboard & Polish

### Prompt for Claude Code:

```
Add Howler.js audio, leaderboard integration, and final polish to 2048.

CURRENT STATE: Game is playable with effects, needs audio and leaderboard.

AUDIO INTEGRATION:
Import and use the useHowlerSounds hook (from 00-MASTER-INDEX setup).

Add these sound triggers:
- Tile slide: subtle whoosh on any valid move
- Tile merge: satisfying pop sound
- Big merge (128+): emphasis sound
- Win (2048): celebration fanfare
- Game over: sad trombone / gentle sound

// In component:
const {
  playSlide,      // On valid move
  playMerge,      // On any merge
  playBigMerge,   // On 128+ tile creation
  playWinSound,   // On reaching 2048
  playGameOver,   // On game over
  setMuted
} = useHowlerSounds();

// Trigger in move logic:
const move = (direction: Direction) => {
  // ... move logic ...

  if (moved) {
    playSlide();

    if (mergeOccurred) {
      if (maxMergedValue >= 128) {
        playBigMerge();
      } else {
        playMerge();
      }
    }
  }
};

// On win:
useEffect(() => {
  if (hasWon && !dismissedWin) {
    playWinSound();
  }
}, [hasWon]);

// On game over:
useEffect(() => {
  if (gameOver) {
    playGameOver();
  }
}, [gameOver]);

MUTE TOGGLE:
<button onClick={() => setMuted(!isMuted)}>
  {isMuted ? '🔇' : '🔊'}
</button>

LEADERBOARD INTEGRATION:
import { useLeaderboard } from '../../hooks/useLeaderboard';

const { submitScore, getTopScores, getUserRank } = useLeaderboard('2048-merge');

// On game over or when user clicks submit:
const handleSubmitScore = async () => {
  if (score > 0) {
    await submitScore(score);
    // Show rank or leaderboard modal
  }
};

BEST SCORE (local):
// Load from localStorage
const [bestScore, setBestScore] = useState(() => {
  return parseInt(localStorage.getItem('2048-best') || '0', 10);
});

// Update when score exceeds best
useEffect(() => {
  if (score > bestScore) {
    setBestScore(score);
    localStorage.setItem('2048-best', score.toString());
  }
}, [score]);

// Display
<div className="best-score">
  BEST: {bestScore}
</div>

RESPONSIVE POLISH:

1. Header layout:
- Mobile: stack score boxes vertically or use smaller font
- Desktop: side by side

2. Touch improvements:
- Prevent pull-to-refresh: touch-action: none on game container
- Larger touch targets

3. Font scaling:
- Tile numbers scale with tile size
- Smaller font for 1000+ values

4. Accessibility:
- aria-labels on tiles
- Keyboard focus visible
- Screen reader: announce moves and score

FINAL POLISH:
1. Loading state while initializing
2. Undo button (store previous state)
3. Persist game state to localStorage
4. Instructions/how-to-play modal
5. Share score button

MOBILE-SPECIFIC:
const isMobile = useIsMobile();

<div
  className="merge-2048-container"
  style={{
    touchAction: 'none', // Prevent scroll interference
    userSelect: 'none',
  }}
>

// Prevent zoom on double tap
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
```

### ✅ Phase 5 Final Checklist

**Audio:**
- [ ] Slide sound plays on valid moves
- [ ] Merge sound plays when tiles combine
- [ ] Different sound for big merges (128+)
- [ ] Win fanfare plays on 2048
- [ ] Game over sound plays
- [ ] Mute button works
- [ ] Audio works on iOS Safari (may need user interaction first)

**Leaderboard:**
- [ ] Score submits correctly
- [ ] User's rank displays after submission
- [ ] Leaderboard shows top scores
- [ ] Best score persists locally

**Polish:**
- [ ] Game state persists on refresh (optional)
- [ ] Undo button works (optional)
- [ ] Responsive on all screen sizes
- [ ] No scroll interference on mobile swipes
- [ ] No accidental zooms on mobile
- [ ] Smooth 60fps performance

**Debug Prompt if audio issues:**
```
Audio isn't working in the 2048 game.

Platform: [iOS Safari / Chrome / etc.]
Issue: [no sound at all / sounds cut off / delayed / etc.]

For iOS Safari specifically:
1. Is Howler being initialized after user interaction?
2. Try: Howler.ctx?.resume() in a click handler
3. Are audio files loaded before playing? (check preload: true)

For general issues:
1. Are sound files in /public/assets/sounds/?
2. Is the path correct in SOUNDS object?
3. Check browser console for 404 errors on audio files

Show me the useHowlerSounds hook and where sounds are triggered.
```

---

## Complete File Structure

```
src/games/Merge2048/
├── Merge2048Game.tsx      # Main component
├── Merge2048Game.css      # Styles
├── types.ts               # TypeScript interfaces
└── utils.ts               # Helper functions (slideAndMerge, etc.)

public/assets/sounds/
├── slide.mp3
├── merge.mp3
├── big-merge.mp3
├── win-2048.mp3
└── game-over.mp3
```

---

## Quick Reference: Tile Colors

```typescript
const TILE_COLORS: Record<number, string> = {
  2: '#eee4da',
  4: '#ede0c8',
  8: '#f2b179',
  16: '#f59563',
  32: '#f67c5f',
  64: '#f65e3b',
  128: '#edcf72',
  256: '#edcc61',
  512: '#edc850',
  1024: '#edc53f',
  2048: '#ff6b00',
  4096: '#ff5500',
  8192: '#ff4400',
};

const getTileColor = (value: number): string => {
  return TILE_COLORS[value] || '#3c3a32'; // Default for super high values
};

const getTileTextColor = (value: number): string => {
  return value <= 4 ? '#776e65' : '#f9f6f2';
};
```
