# Claude Code Prompt: Block Puzzle Game (Block Blast Style)

## Overview
Build a Block Blast style puzzle game for wojak.ink. This is NOT Tetris - pieces don't fall. Players drag-and-drop blocks onto a grid to clear rows and columns.

---

## TECH STACK & ARCHITECTURE

```
Framework: React + TypeScript + Ionic Framework
Styling: CSS file (BlockPuzzle.css) with @keyframes animations
Animation: CSS animations for effects
State: React hooks (useState, useRef, useEffect)
Sound: useGameSounds() hook
Leaderboard: useLeaderboard('block-puzzle') hook
Mobile Detection: useIsMobile() hook
Rendering: Pure DOM/CSS (no Canvas needed)
```

**File Structure:**
```
src/pages/BlockPuzzle.tsx          # Main game component
src/pages/BlockPuzzle.css          # All styles + effects
src/components/media/games/GameModal.tsx  # Add lazy import
src/config/query/queryKeys.ts      # Add 'block-puzzle' to GameId type
```

---

## GAME SPECIFICATIONS

### Grid
- **Size**: 8x8 grid (64 cells)
- **Cell State**: Empty or filled with color
- **Visual**: Orange-tinted blocks with slight color variety

### Block Pieces
- Player always has 3 pieces available at bottom
- When a piece is placed, a new random piece replaces it
- Pieces cannot be rotated

### Block Shapes (10-15 shapes)
```typescript
const BLOCK_SHAPES = {
  // Singles and lines
  single: [[1]],
  line2h: [[1, 1]],
  line3h: [[1, 1, 1]],
  line4h: [[1, 1, 1, 1]],
  line5h: [[1, 1, 1, 1, 1]],
  line2v: [[1], [1]],
  line3v: [[1], [1], [1]],
  line4v: [[1], [1], [1], [1]],

  // Squares
  square2: [[1, 1], [1, 1]],
  square3: [[1, 1, 1], [1, 1, 1], [1, 1, 1]],

  // L shapes
  lShape1: [[1, 0], [1, 0], [1, 1]],
  lShape2: [[0, 1], [0, 1], [1, 1]],
  lShape3: [[1, 1], [1, 0], [1, 0]],
  lShape4: [[1, 1], [0, 1], [0, 1]],

  // T shape
  tShape: [[1, 1, 1], [0, 1, 0]],

  // Corner
  corner: [[1, 1], [1, 0]],
};
```

### Clearing Mechanics
- Complete ANY row OR column to clear it
- Multiple rows/columns can clear simultaneously
- Clearing grants bonus points for combos

### Scoring
- **Primary**: Total points
- **Base Points**: 10 points per block placed
- **Line Clear**: 100 points per line (row or column)
- **Combo Bonus**: Multiple clears = multiplier (2x, 3x, etc.)
- **Secondary Tracked**: Total lines cleared

### Game Over
- Game ends when none of the 3 available pieces can be placed anywhere on the grid

---

## DRAG AND DROP IMPLEMENTATION

### Piece Component
```typescript
interface DraggablePiece {
  id: string;
  shape: number[][];
  color: string;
}

const PiecePreview: React.FC<{ piece: DraggablePiece }> = ({ piece }) => {
  const cellSize = 25; // Preview size

  return (
    <div
      className="piece-preview"
      draggable
      onDragStart={(e) => handleDragStart(e, piece.id)}
      onTouchStart={(e) => handleTouchDragStart(e, piece.id)}
    >
      {piece.shape.map((row, rowIdx) => (
        <div key={rowIdx} className="piece-row">
          {row.map((cell, colIdx) => (
            <div
              key={colIdx}
              className={`piece-cell ${cell ? 'filled' : 'empty'}`}
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: cell ? piece.color : 'transparent'
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
```

### Touch Drag Implementation (Mobile)
```typescript
const [draggedPiece, setDraggedPiece] = useState<string | null>(null);
const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
const [previewPosition, setPreviewPosition] = useState<{ row: number; col: number } | null>(null);

const handleTouchDragStart = (e: React.TouchEvent, pieceId: string) => {
  e.preventDefault();
  setDraggedPiece(pieceId);
  const touch = e.touches[0];
  setDragPosition({ x: touch.clientX, y: touch.clientY });
};

const handleTouchMove = (e: React.TouchEvent) => {
  if (!draggedPiece) return;
  e.preventDefault();

  const touch = e.touches[0];
  setDragPosition({ x: touch.clientX, y: touch.clientY });

  // Calculate grid position under finger
  const gridElement = gridRef.current;
  if (gridElement) {
    const rect = gridElement.getBoundingClientRect();
    const col = Math.floor((touch.clientX - rect.left) / CELL_SIZE);
    const row = Math.floor((touch.clientY - rect.top) / CELL_SIZE);

    if (row >= 0 && row < 8 && col >= 0 && col < 8) {
      setPreviewPosition({ row, col });
    }
  }
};

const handleTouchEnd = () => {
  if (draggedPiece && previewPosition) {
    attemptPlacement(draggedPiece, previewPosition.row, previewPosition.col);
  }
  setDraggedPiece(null);
  setPreviewPosition(null);
};
```

---

## CORE GAME LOGIC

### Grid State
```typescript
type GridCell = {
  filled: boolean;
  color: string | null;
  blockId: string | null;
};

type Grid = GridCell[][];

const createEmptyGrid = (): Grid =>
  Array(8).fill(null).map(() =>
    Array(8).fill(null).map(() => ({
      filled: false,
      color: null,
      blockId: null
    }))
  );
```

### Placement Validation
```typescript
const canPlacePiece = (
  grid: Grid,
  shape: number[][],
  startRow: number,
  startCol: number
): boolean => {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c] === 0) continue;

      const gridRow = startRow + r;
      const gridCol = startCol + c;

      // Out of bounds
      if (gridRow < 0 || gridRow >= 8 || gridCol < 0 || gridCol >= 8) {
        return false;
      }

      // Cell occupied
      if (grid[gridRow][gridCol].filled) {
        return false;
      }
    }
  }
  return true;
};
```

### Place Piece
```typescript
const placePiece = (
  grid: Grid,
  shape: number[][],
  startRow: number,
  startCol: number,
  color: string
): Grid => {
  const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
  const blockId = `block-${Date.now()}`;

  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c] === 1) {
        newGrid[startRow + r][startCol + c] = {
          filled: true,
          color,
          blockId
        };
      }
    }
  }

  return newGrid;
};
```

### Clear Lines (Rows AND Columns)
```typescript
const clearLines = (grid: Grid): {
  clearedGrid: Grid;
  linesCleared: number;
  cellsCleared: Set<string>;
} => {
  const cellsToClear = new Set<string>();

  // Check rows
  for (let row = 0; row < 8; row++) {
    if (grid[row].every(cell => cell.filled)) {
      for (let col = 0; col < 8; col++) {
        cellsToClear.add(`${row}-${col}`);
      }
    }
  }

  // Check columns
  for (let col = 0; col < 8; col++) {
    let columnFull = true;
    for (let row = 0; row < 8; row++) {
      if (!grid[row][col].filled) {
        columnFull = false;
        break;
      }
    }
    if (columnFull) {
      for (let row = 0; row < 8; row++) {
        cellsToClear.add(`${row}-${col}`);
      }
    }
  }

  // Clear cells
  const clearedGrid = grid.map((row, rowIdx) =>
    row.map((cell, colIdx) => {
      if (cellsToClear.has(`${rowIdx}-${colIdx}`)) {
        return { filled: false, color: null, blockId: null };
      }
      return cell;
    })
  );

  return {
    clearedGrid,
    linesCleared: Math.floor(cellsToClear.size / 8), // Approximate lines
    cellsCleared: cellsToClear
  };
};
```

### Game Over Check
```typescript
const isGameOver = (grid: Grid, pieces: DraggablePiece[]): boolean => {
  for (const piece of pieces) {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (canPlacePiece(grid, piece.shape, row, col)) {
          return false; // Found valid placement
        }
      }
    }
  }
  return true; // No valid placements
};
```

---

## EXTREME EFFECTS PHILOSOPHY

### Visual Effects for Line Clears
```typescript
const onLinesClear = (cellsCleared: Set<string>, linesCount: number) => {
  // PRIMARY: Cells flash and disappear
  cellsCleared.forEach(cellKey => {
    triggerCellClearAnimation(cellKey);
  });

  // SECONDARY: Score popup + sound
  const points = linesCount * 100;
  showScorePopup(`+${points}`);
  playBlockLand();

  // TERTIARY: Based on lines cleared
  if (linesCount >= 2) {
    triggerScreenShake();
    showEpicCallout('DOUBLE!');
    playCombo();
  }

  if (linesCount >= 3) {
    showEpicCallout('TRIPLE!');
    spawnFloatingEmojis(['🔥', '💥', '⚡']);
    triggerConfetti();
    playPerfectBonus();
  }

  if (linesCount >= 4) {
    showEpicCallout('QUAD CLEAR!');
    triggerLightning();
    flashVignette();
  }
};
```

### CSS Animations
```css
/* Cell clear animation */
@keyframes cell-clear {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.3);
    background: #fff;
    box-shadow: 0 0 20px #ff6b00;
  }
  100% {
    transform: scale(0);
    opacity: 0;
  }
}

.cell.clearing {
  animation: cell-clear 0.4s ease-out forwards;
}

/* Piece placement */
@keyframes piece-land {
  0% { transform: scale(1.1); }
  50% { transform: scale(0.95); }
  100% { transform: scale(1); }
}

.cell.just-placed {
  animation: piece-land 0.2s ease-out;
}

/* Row/column highlight before clear */
@keyframes line-flash {
  0%, 100% { background: var(--cell-color); }
  50% { background: #fff; box-shadow: 0 0 15px #ff6b00; }
}

.cell.about-to-clear {
  animation: line-flash 0.3s ease-in-out 2;
}

/* Ghost preview */
.cell.preview {
  background: rgba(255, 107, 0, 0.3);
  border: 2px dashed #ff6b00;
}

.cell.preview-invalid {
  background: rgba(255, 0, 0, 0.2);
  border: 2px dashed #ff0000;
}
```

### Block Colors (Orange Variety)
```css
.block-color-1 { background: linear-gradient(135deg, #ff8533, #ff6b00); }
.block-color-2 { background: linear-gradient(135deg, #ffad5c, #ff8c1a); }
.block-color-3 { background: linear-gradient(135deg, #ffc266, #ffad33); }
.block-color-4 { background: linear-gradient(135deg, #ff944d, #ff7519); }
```

---

## MOBILE-FIRST LAYOUT

### Container Dimensions
```typescript
const isMobile = useIsMobile();

const CONTAINER_WIDTH = isMobile ? window.innerWidth - 20 : 650;
const GRID_SIZE = isMobile ? window.innerWidth - 40 : 400;
const CELL_SIZE = GRID_SIZE / 8;
const PIECE_PREVIEW_CELL = isMobile ? 20 : 25;
```

### Layout Structure
```tsx
<IonPage>
  <IonContent>
    <div className={`block-puzzle-container ${isMobile ? 'mobile' : 'desktop'}`}>
      {/* Score panel */}
      <div className="score-panel">
        <div className="score">{score}</div>
        <div className="lines-cleared">Lines: {totalLinesCleared}</div>
      </div>

      {/* Game grid */}
      <div
        ref={gridRef}
        className="game-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(8, ${CELL_SIZE}px)`,
          gap: '2px'
        }}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {grid.map((row, rowIdx) =>
          row.map((cell, colIdx) => (
            <div
              key={`${rowIdx}-${colIdx}`}
              className={`grid-cell ${cell.filled ? 'filled' : ''} ${
                isPreviewCell(rowIdx, colIdx) ? 'preview' : ''
              }`}
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                backgroundColor: cell.color || 'rgba(255, 107, 0, 0.1)'
              }}
            />
          ))
        )}
      </div>

      {/* Piece rack */}
      <div className="piece-rack">
        {pieces.map(piece => (
          <PiecePreview
            key={piece.id}
            piece={piece}
            disabled={!canPlaceAnywhere(piece)}
          />
        ))}
      </div>

      {/* Floating drag preview */}
      {draggedPiece && (
        <div
          className="drag-preview"
          style={{
            position: 'fixed',
            left: dragPosition.x - 40,
            top: dragPosition.y - 40,
            pointerEvents: 'none'
          }}
        >
          <PiecePreview piece={getPieceById(draggedPiece)} />
        </div>
      )}
    </div>
  </IonContent>
</IonPage>
```

---

## LEADERBOARD INTEGRATION

```typescript
const { leaderboard, submitScore, isSignedIn } = useLeaderboard('block-puzzle');

const handleGameOver = async () => {
  setGameState('gameover');
  playGameOver();

  if (isSignedIn) {
    await submitScore(score, null, {
      linesCleared: totalLinesCleared,
      blocksPlaced: totalBlocksPlaced,
      playTime: Date.now() - gameStartTime
    });
  }
};
```

---

## SOUND INTEGRATION

```typescript
const {
  playBlockLand,    // Piece placed
  playPerfectBonus, // Multi-line clear (3+)
  playCombo,        // Double clear
  playGameOver      // Game over
} = useGameSounds();
```

---

## PIECE GENERATION

```typescript
const SHAPE_KEYS = Object.keys(BLOCK_SHAPES);

const generateRandomPiece = (): DraggablePiece => {
  const shapeKey = SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
  const colorIndex = Math.floor(Math.random() * 4) + 1;

  return {
    id: `piece-${Date.now()}-${Math.random()}`,
    shape: BLOCK_SHAPES[shapeKey],
    color: `var(--block-color-${colorIndex})`
  };
};

const generateThreePieces = (): DraggablePiece[] => {
  return [generateRandomPiece(), generateRandomPiece(), generateRandomPiece()];
};
```

---

## TESTING CHECKLIST

- [ ] Drag and drop works on desktop (mouse)
- [ ] Touch drag works on mobile
- [ ] Ghost preview shows valid/invalid placement
- [ ] Pieces placed correctly on grid
- [ ] Rows clear when complete
- [ ] Columns clear when complete
- [ ] Multiple clears work simultaneously
- [ ] Score calculates correctly
- [ ] Game over triggers when no moves available
- [ ] New pieces replace placed pieces
- [ ] All visual effects trigger correctly
- [ ] Sounds play at correct moments
- [ ] Leaderboard submission works

---

**IMPORTANT**: The drag-and-drop experience must feel smooth on mobile. Show a ghost preview on the grid as the user drags. Make line clears feel SATISFYING with flash animations, shake, and celebratory effects.
