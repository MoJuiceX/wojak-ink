# Claude Code Prompt: 2048 Merge Game

## Overview
Build a 2048 Merge puzzle game for wojak.ink with extreme visual effects, mobile-first design, and global leaderboard integration.

---

## TECH STACK & ARCHITECTURE

```
Framework: React + TypeScript + Ionic Framework
Styling: CSS file (Game2048.css) with @keyframes animations
Animation: CSS animations (NOT Framer Motion for gameplay)
State: React hooks (useState, useRef, useEffect)
Sound: useGameSounds() hook
Leaderboard: useLeaderboard('2048-merge') hook
Mobile Detection: useIsMobile() hook
```

**File Structure:**
```
src/pages/Game2048.tsx          # Main game component
src/pages/Game2048.css          # All styles + effects
src/components/media/games/GameModal.tsx  # Add lazy import
src/config/query/queryKeys.ts   # Add '2048-merge' to GameId type
```

---

## GAME SPECIFICATIONS

### Grid & Tiles
- **Grid Size**: 4x4 (16 cells)
- **Tile Values**: 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048+
- **New Tiles**: Spawn 2 (90%) or 4 (10%) after each move
- **Visual Theme**: Orange-tinted tiles with numbers prominently displayed
- **Win Condition**: Reach 2048 tile (option to continue playing)

### Controls
- **Mobile**: Swipe gestures (up/down/left/right)
- **Desktop**: Arrow keys + swipe support
- **Swipe Threshold**: 50px minimum

### Scoring
- **Primary Score**: Total points (sum of merged tile values)
- **Secondary**: Highest tile achieved (tracked in metadata)
- **Merge Points**: When two 4s merge into 8, add 8 to score

### Game States
```typescript
type GameState = 'idle' | 'playing' | 'gameover';
```

---

## SWIPE DETECTION IMPLEMENTATION

```typescript
const touchStart = useRef({ x: 0, y: 0 });
const SWIPE_THRESHOLD = 50;

const handleTouchStart = (e: React.TouchEvent) => {
  touchStart.current = {
    x: e.touches[0].clientX,
    y: e.touches[0].clientY
  };
};

const handleTouchEnd = (e: React.TouchEvent) => {
  const dx = e.changedTouches[0].clientX - touchStart.current.x;
  const dy = e.changedTouches[0].clientY - touchStart.current.y;

  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
    dx > 0 ? move('right') : move('left');
  } else if (Math.abs(dy) > SWIPE_THRESHOLD) {
    dy > 0 ? move('down') : move('up');
  }
};
```

---

## CORE GAME LOGIC

### Grid Data Structure
```typescript
type Cell = number | null; // null = empty, number = tile value
type Grid = Cell[][];

const createEmptyGrid = (): Grid =>
  Array(4).fill(null).map(() => Array(4).fill(null));
```

### Move Algorithm
```typescript
const move = (direction: 'up' | 'down' | 'left' | 'right') => {
  // 1. Transpose grid if vertical move
  // 2. Reverse rows if right/down
  // 3. Slide tiles left (remove gaps)
  // 4. Merge adjacent equal tiles (left to right, once per tile)
  // 5. Slide again after merge
  // 6. Reverse back if needed
  // 7. Transpose back if needed
  // 8. Spawn new tile if grid changed
  // 9. Check for game over
};

const slideRow = (row: Cell[]): Cell[] => {
  const filtered = row.filter(cell => cell !== null);
  const empty = Array(4 - filtered.length).fill(null);
  return [...filtered, ...empty];
};

const mergeRow = (row: Cell[]): { merged: Cell[], points: number } => {
  let points = 0;
  const result = [...row];

  for (let i = 0; i < 3; i++) {
    if (result[i] !== null && result[i] === result[i + 1]) {
      result[i] = result[i]! * 2;
      points += result[i]!;
      result[i + 1] = null;
    }
  }

  return { merged: result, points };
};
```

### Game Over Detection
```typescript
const isGameOver = (grid: Grid): boolean => {
  // Check for empty cells
  for (let row of grid) {
    if (row.includes(null)) return false;
  }

  // Check for possible merges
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const current = grid[i][j];
      if (j < 3 && current === grid[i][j + 1]) return false; // Horizontal
      if (i < 3 && current === grid[i + 1][j]) return false; // Vertical
    }
  }

  return true;
};
```

---

## EXTREME EFFECTS PHILOSOPHY

### Tile Color Gradient (Orange Theme)
```css
.tile-2    { background: #ffedcc; color: #776e65; }
.tile-4    { background: #ffdb99; color: #776e65; }
.tile-8    { background: #ffb366; color: #f9f6f2; }
.tile-16   { background: #ff9933; color: #f9f6f2; }
.tile-32   { background: #ff8000; color: #f9f6f2; }
.tile-64   { background: #ff6600; color: #f9f6f2; }
.tile-128  { background: #ff4d00; color: #f9f6f2; box-shadow: 0 0 30px #ff6b00; }
.tile-256  { background: #ff3300; color: #f9f6f2; box-shadow: 0 0 40px #ff6b00; }
.tile-512  { background: #ff1a00; color: #f9f6f2; box-shadow: 0 0 50px #ff6b00; }
.tile-1024 { background: #e60000; color: #f9f6f2; box-shadow: 0 0 60px #ff6b00; }
.tile-2048 { background: #cc0000; color: #f9f6f2; box-shadow: 0 0 80px gold; }
```

### Animation Keyframes
```css
/* Tile appearing */
@keyframes tile-pop {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}

/* Tile merging */
@keyframes tile-merge {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

/* Tile sliding */
@keyframes tile-slide {
  from { transform: translateX(var(--slide-from-x)) translateY(var(--slide-from-y)); }
  to { transform: translateX(0) translateY(0); }
}

/* Screen shake */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px) rotate(-1deg); }
  75% { transform: translateX(5px) rotate(1deg); }
}

/* Epic merge glow pulse */
@keyframes epic-glow {
  0%, 100% { box-shadow: 0 0 20px var(--glow-color); }
  50% { box-shadow: 0 0 60px var(--glow-color), 0 0 100px var(--glow-color); }
}
```

### Layered Effect Triggers
```typescript
const onMerge = (newValue: number, combo: number) => {
  // PRIMARY: Score popup
  showScorePopup(`+${newValue}`);

  // SECONDARY: Tile animation
  triggerMergeAnimation(newValue);
  playBlockLand();

  // TERTIARY: Based on tile value
  if (newValue >= 128) {
    triggerScreenShake();
    spawnFloatingEmojis(['🔥', '✨']);
  }

  if (newValue >= 512) {
    showEpicCallout('MERGE MASTER!');
    triggerConfetti();
    playPerfectBonus();
  }

  if (newValue >= 1024) {
    showEpicCallout('TILE TITAN!');
    triggerLightning();
    flashVignette();
  }

  if (newValue === 2048) {
    showEpicCallout('🏆 2048! 🏆');
    triggerFullChaos();
    playWinSound();
  }
};
```

### Combo System
```typescript
const COMBO_TIERS = {
  2: { callout: null, effects: ['scorePopup'] },
  3: { callout: 'NICE!', effects: ['scorePopup', 'shake'] },
  5: { callout: 'GREAT!', effects: ['scorePopup', 'shake', 'emojis'] },
  10: { callout: 'AMAZING!', effects: ['all', 'slowMoTrigger'] },
  15: { callout: 'UNSTOPPABLE!', effects: ['all', 'confetti'] },
  20: { callout: 'LEGENDARY!', effects: ['all', 'lightning'] },
  25: { callout: 'GOD MODE!', effects: ['fullChaos'] }
};
```

---

## MOBILE-FIRST RESPONSIVE DESIGN

### Container Dimensions
```typescript
const isMobile = useIsMobile();
const CONTAINER_WIDTH = isMobile ? window.innerWidth - 20 : 400;
const CONTAINER_HEIGHT = isMobile ? window.innerWidth - 20 : 400; // Square
const TILE_SIZE = (CONTAINER_WIDTH - 50) / 4; // 4 tiles + gaps
const GAP = 10;
```

### Layout Structure
```tsx
<IonPage>
  <IonContent>
    <div className={`game-2048-container ${isMobile ? 'mobile' : 'desktop'}`}>
      {/* Score display */}
      <div className="score-panel">
        <div className="score">Score: {score}</div>
        <div className="best-tile">Best: {highestTile}</div>
      </div>

      {/* Game grid */}
      <div
        className="grid-container"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Background cells */}
        {Array(16).fill(null).map((_, i) => (
          <div key={i} className="grid-cell" />
        ))}

        {/* Active tiles (positioned absolutely) */}
        {tiles.map(tile => (
          <Tile key={tile.id} {...tile} />
        ))}
      </div>

      {/* HUD overlay on mobile */}
      {isMobile && <div className="mobile-hud">...</div>}
    </div>
  </IonContent>
</IonPage>
```

---

## LEADERBOARD INTEGRATION

```typescript
const { leaderboard, submitScore, isSignedIn } = useLeaderboard('2048-merge');

const handleGameOver = async () => {
  setGameState('gameover');
  playGameOver();

  if (isSignedIn) {
    await submitScore(score, highestTile, {
      highestTile,
      totalMoves,
      playTime: Date.now() - gameStartTime
    });
  }
};
```

---

## SOUND INTEGRATION

```typescript
const {
  playBlockLand,    // Normal merge
  playPerfectBonus, // High-value merge (256+)
  playCombo,        // Combo milestones
  playWinSound,     // Reach 2048
  playGameOver      // No moves left
} = useGameSounds();
```

---

## COMPLETE COMPONENT STRUCTURE

```typescript
interface Tile {
  id: string;
  value: number;
  row: number;
  col: number;
  isNew: boolean;
  isMerged: boolean;
}

const Game2048: React.FC = () => {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [score, setScore] = useState(0);
  const [highestTile, setHighestTile] = useState(2);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [combo, setCombo] = useState(0);

  // Effects state
  const [screenShake, setScreenShake] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [epicCallout, setEpicCallout] = useState<string | null>(null);
  const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);

  // ... game logic implementation

  return (
    <IonPage>
      {/* Full implementation */}
    </IonPage>
  );
};

export default Game2048;
```

---

## ACCESSIBILITY

- **Reduced Motion**: Check `usePrefersReducedMotion()` - disable shake, confetti, particles
- **Touch Targets**: Minimum 44px for all interactive elements
- **Color Contrast**: High contrast numbers on all tile colors
- **Keyboard Support**: Arrow keys for desktop play

---

## TESTING CHECKLIST

- [ ] Swipe detection works on mobile (all 4 directions)
- [ ] Arrow keys work on desktop
- [ ] Tiles merge correctly (only once per move)
- [ ] Score calculates correctly
- [ ] Game over detection works
- [ ] New tiles spawn after valid moves
- [ ] All visual effects trigger at correct thresholds
- [ ] Sounds play at correct moments
- [ ] Leaderboard submission works
- [ ] Mobile layout is responsive
- [ ] Desktop layout shows leaderboard sidebar

---

**IMPORTANT**: Follow the "extreme effects" philosophy - every merge should feel powerful. If a 256+ tile merges, the player should FEEL it through shake, glow, sound, and callouts. Layer multiple effects for high-value merges.
