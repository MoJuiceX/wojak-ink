# Block Puzzle Game - Phased Build Guide

> **Game ID**: `block-puzzle`
> **Rendering**: DOM/CSS (no Canvas needed)
> **Complexity**: Medium-High
> **Prerequisites**: Run `00-MASTER-INDEX.md` setup first

---

## PHASE 1: Component Structure & Grid Setup

### Prompt for Claude Code:

```
Create the Block Puzzle (Block Blast style) game component structure for wojak.ink.

GAME OVERVIEW:
- 8x8 grid where you place tetris-like shapes
- Drag shapes from tray onto grid
- Clear rows/columns when filled
- Game over when no shapes can be placed
- No time limit - pure puzzle strategy

REQUIREMENTS:
1. Create file: src/games/BlockPuzzle/BlockPuzzleGame.tsx
2. Use TypeScript with proper interfaces
3. 8x8 grid
4. Orange theme (#ff6b00 primary)

INTERFACES NEEDED:
interface Cell {
  filled: boolean;
  color: string;
  isClearing: boolean;  // Animation state
}

interface Shape {
  id: number;
  pattern: boolean[][];  // 2D array representing shape
  color: string;
  width: number;
  height: number;
}

interface GameState {
  grid: Cell[][];        // 8x8 grid
  shapes: (Shape | null)[];  // 3 shape slots
  score: number;
  isGameOver: boolean;
  selectedShape: number | null;
}

SHAPE DEFINITIONS:
const SHAPES: boolean[][][] = [
  // Single block
  [[true]],

  // 2-block horizontal
  [[true, true]],

  // 2-block vertical
  [[true], [true]],

  // 3-block horizontal
  [[true, true, true]],

  // 3-block vertical
  [[true], [true], [true]],

  // L-shape
  [[true, false], [true, false], [true, true]],

  // Reverse L
  [[false, true], [false, true], [true, true]],

  // T-shape
  [[true, true, true], [false, true, false]],

  // Square 2x2
  [[true, true], [true, true]],

  // Square 3x3
  [[true, true, true], [true, true, true], [true, true, true]],

  // 4-block horizontal
  [[true, true, true, true]],

  // Z-shape
  [[true, true, false], [false, true, true]],

  // S-shape
  [[false, true, true], [true, true, false]],
];

COLORS (citrus palette):
const SHAPE_COLORS = [
  '#ff6b00', // Orange
  '#ff8c00', // Dark orange
  '#ffa500', // Light orange
  '#ffcc00', // Golden
  '#ff5500', // Red-orange
  '#ff9933', // Tangerine
];

GRID INITIALIZATION:
const GRID_SIZE = 8;

const createEmptyGrid = (): Cell[][] =>
  Array(GRID_SIZE).fill(null).map(() =>
    Array(GRID_SIZE).fill(null).map(() => ({
      filled: false,
      color: '',
      isClearing: false,
    }))
  );

COMPONENT STRUCTURE:
const BlockPuzzleGame: React.FC = () => {
  const { width, height } = useDimensions();
  const isMobile = useIsMobile();

  // Grid dimensions
  const gameWidth = isMobile ? width - 32 : 450;
  const cellSize = gameWidth / GRID_SIZE;

  const [grid, setGrid] = useState<Cell[][]>(createEmptyGrid);
  const [shapes, setShapes] = useState<(Shape | null)[]>([null, null, null]);
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [selectedShape, setSelectedShape] = useState<number | null>(null);

  // Generate initial shapes
  useEffect(() => {
    generateNewShapes();
  }, []);

  return (
    <div className="block-puzzle-container">
      {/* Header */}
      <div className="game-header">
        <div className="score">Score: {score}</div>
        <button onClick={resetGame}>New Game</button>
      </div>

      {/* Game Grid */}
      <div
        className="puzzle-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          width: gameWidth,
          height: gameWidth,
          gap: '2px',
        }}
      >
        {grid.flat().map((cell, idx) => {
          const row = Math.floor(idx / GRID_SIZE);
          const col = idx % GRID_SIZE;
          return (
            <div
              key={idx}
              className={`grid-cell ${cell.filled ? 'filled' : ''} ${cell.isClearing ? 'clearing' : ''}`}
              style={{
                backgroundColor: cell.filled ? cell.color : '#2a2a2a',
              }}
              data-row={row}
              data-col={col}
            />
          );
        })}
      </div>

      {/* Shape Tray */}
      <div className="shape-tray">
        {shapes.map((shape, idx) => (
          <ShapeSlot
            key={idx}
            shape={shape}
            index={idx}
            isSelected={selectedShape === idx}
            onSelect={() => setSelectedShape(idx)}
            cellSize={cellSize * 0.6}
          />
        ))}
      </div>
    </div>
  );
};

SHAPE SLOT COMPONENT:
interface ShapeSlotProps {
  shape: Shape | null;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  cellSize: number;
}

const ShapeSlot: React.FC<ShapeSlotProps> = ({ shape, index, isSelected, onSelect, cellSize }) => {
  if (!shape) return <div className="shape-slot empty" />;

  return (
    <div
      className={`shape-slot ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div
        className="shape-preview"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${shape.width}, ${cellSize}px)`,
          gap: '2px',
        }}
      >
        {shape.pattern.flat().map((filled, idx) => (
          <div
            key={idx}
            className={`shape-cell ${filled ? 'filled' : 'empty'}`}
            style={{
              width: cellSize,
              height: cellSize,
              backgroundColor: filled ? shape.color : 'transparent',
            }}
          />
        ))}
      </div>
    </div>
  );
};

STYLING:
.puzzle-grid {
  background: #1a1a1a;
  border-radius: 8px;
  padding: 4px;
}

.grid-cell {
  border-radius: 4px;
  transition: background-color 0.1s;
}

.grid-cell.clearing {
  animation: cell-clear 0.3s ease-out forwards;
}

@keyframes cell-clear {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); }
  100% { transform: scale(0); opacity: 0; }
}

.shape-tray {
  display: flex;
  justify-content: space-around;
  padding: 16px;
  margin-top: 20px;
}

.shape-slot {
  padding: 10px;
  border-radius: 8px;
  background: #2a2a2a;
  cursor: pointer;
  transition: transform 0.2s;
}

.shape-slot.selected {
  transform: scale(1.1);
  box-shadow: 0 0 20px rgba(255, 107, 0, 0.5);
}

.shape-slot.empty {
  opacity: 0.3;
}

SHAPE GENERATION:
const generateShape = (): Shape => {
  const pattern = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  const color = SHAPE_COLORS[Math.floor(Math.random() * SHAPE_COLORS.length)];
  return {
    id: Date.now() + Math.random(),
    pattern,
    color,
    width: pattern[0].length,
    height: pattern.length,
  };
};

const generateNewShapes = () => {
  setShapes([generateShape(), generateShape(), generateShape()]);
};

DO NOT implement drag-and-drop or placement yet - just the visual grid and shapes.
```

### ✅ Phase 1 Checkpoint

**Test these manually:**
- [ ] 8x8 grid renders with empty cells
- [ ] Three shapes display in tray below grid
- [ ] Shapes show correct patterns (L, T, squares, etc.)
- [ ] Shapes have different colors
- [ ] Clicking a shape in tray highlights it
- [ ] Score displays (0 initially)
- [ ] Grid cells are square and evenly spaced
- [ ] Responsive on mobile

**Debug Prompt if issues:**
```
The Block Puzzle grid or shapes aren't rendering correctly. Issues: [describe]

Check:
1. Is the grid using CSS Grid with correct columns?
2. Are shape patterns being flattened correctly for rendering?
3. Is cellSize calculated based on container width?
4. Are keys unique for grid cells and shape cells?

Show me the grid rendering code and the ShapeSlot component.
```

---

## PHASE 2: Drag and Drop Placement

### Prompt for Claude Code:

```
Add drag-and-drop shape placement to Block Puzzle.

CURRENT STATE: Grid and shapes render, but can't place shapes.

APPROACH: Use both mouse drag and touch drag.

DRAG STATE:
interface DragState {
  shape: Shape | null;
  shapeIndex: number | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
}

const [dragState, setDragState] = useState<DragState>({
  shape: null,
  shapeIndex: null,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  isDragging: false,
});

MOUSE DRAG HANDLERS:
const handleMouseDown = (e: React.MouseEvent, shapeIndex: number) => {
  const shape = shapes[shapeIndex];
  if (!shape) return;

  setDragState({
    shape,
    shapeIndex,
    startX: e.clientX,
    startY: e.clientY,
    currentX: e.clientX,
    currentY: e.clientY,
    isDragging: true,
  });
};

const handleMouseMove = (e: MouseEvent) => {
  if (!dragState.isDragging) return;

  setDragState(prev => ({
    ...prev,
    currentX: e.clientX,
    currentY: e.clientY,
  }));
};

const handleMouseUp = (e: MouseEvent) => {
  if (!dragState.isDragging) return;

  // Try to place the shape
  const gridPosition = getGridPositionFromCoords(e.clientX, e.clientY);
  if (gridPosition) {
    attemptPlacement(gridPosition.row, gridPosition.col);
  }

  setDragState(prev => ({ ...prev, isDragging: false, shape: null }));
};

// Add listeners
useEffect(() => {
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
  return () => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };
}, [dragState.isDragging]);

TOUCH DRAG HANDLERS:
const handleTouchStart = (e: React.TouchEvent, shapeIndex: number) => {
  const shape = shapes[shapeIndex];
  if (!shape) return;

  const touch = e.touches[0];
  setDragState({
    shape,
    shapeIndex,
    startX: touch.clientX,
    startY: touch.clientY,
    currentX: touch.clientX,
    currentY: touch.clientY,
    isDragging: true,
  });
};

const handleTouchMove = (e: TouchEvent) => {
  if (!dragState.isDragging) return;
  e.preventDefault(); // Prevent scroll

  const touch = e.touches[0];
  setDragState(prev => ({
    ...prev,
    currentX: touch.clientX,
    currentY: touch.clientY,
  }));
};

const handleTouchEnd = (e: TouchEvent) => {
  if (!dragState.isDragging) return;

  const touch = e.changedTouches[0];
  const gridPosition = getGridPositionFromCoords(touch.clientX, touch.clientY);
  if (gridPosition) {
    attemptPlacement(gridPosition.row, gridPosition.col);
  }

  setDragState(prev => ({ ...prev, isDragging: false, shape: null }));
};

GRID POSITION FROM COORDINATES:
const gridRef = useRef<HTMLDivElement>(null);

const getGridPositionFromCoords = (x: number, y: number): { row: number, col: number } | null => {
  if (!gridRef.current) return null;

  const rect = gridRef.current.getBoundingClientRect();
  const relX = x - rect.left;
  const relY = y - rect.top;

  // Account for shape offset (place from top-left of shape)
  const col = Math.floor(relX / cellSize);
  const row = Math.floor(relY / cellSize);

  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
    return null;
  }

  return { row, col };
};

PLACEMENT VALIDATION:
const canPlaceShape = (shape: Shape, startRow: number, startCol: number): boolean => {
  for (let r = 0; r < shape.height; r++) {
    for (let c = 0; c < shape.width; c++) {
      if (shape.pattern[r][c]) {
        const gridRow = startRow + r;
        const gridCol = startCol + c;

        // Check bounds
        if (gridRow >= GRID_SIZE || gridCol >= GRID_SIZE) return false;
        if (gridRow < 0 || gridCol < 0) return false;

        // Check if cell is already filled
        if (grid[gridRow][gridCol].filled) return false;
      }
    }
  }
  return true;
};

ATTEMPT PLACEMENT:
const attemptPlacement = (row: number, col: number) => {
  if (!dragState.shape || dragState.shapeIndex === null) return;

  if (!canPlaceShape(dragState.shape, row, col)) {
    // Invalid placement - show feedback
    playInvalidSound();
    return;
  }

  // Place the shape
  placeShape(dragState.shape, row, col, dragState.shapeIndex);
};

const placeShape = (shape: Shape, startRow: number, startCol: number, shapeIndex: number) => {
  // Update grid
  setGrid(prev => {
    const newGrid = prev.map(row => row.map(cell => ({ ...cell })));
    for (let r = 0; r < shape.height; r++) {
      for (let c = 0; c < shape.width; c++) {
        if (shape.pattern[r][c]) {
          newGrid[startRow + r][startCol + c] = {
            filled: true,
            color: shape.color,
            isClearing: false,
          };
        }
      }
    }
    return newGrid;
  });

  // Remove shape from tray
  setShapes(prev => {
    const newShapes = [...prev];
    newShapes[shapeIndex] = null;
    return newShapes;
  });

  // Add points for placing (basic: count blocks)
  const blockCount = shape.pattern.flat().filter(Boolean).length;
  setScore(prev => prev + blockCount);

  // Check for line clears (implement in next phase)
  // checkAndClearLines();

  // If all shapes used, generate new ones
  // checkForNewShapes();
};

DRAGGING GHOST (visual feedback):
{dragState.isDragging && dragState.shape && (
  <div
    className="drag-ghost"
    style={{
      position: 'fixed',
      left: dragState.currentX - (dragState.shape.width * cellSize) / 2,
      top: dragState.currentY - (dragState.shape.height * cellSize) / 2,
      pointerEvents: 'none',
      opacity: 0.8,
      zIndex: 1000,
    }}
  >
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${dragState.shape.width}, ${cellSize}px)`,
        gap: '2px',
      }}
    >
      {dragState.shape.pattern.flat().map((filled, idx) => (
        <div
          key={idx}
          style={{
            width: cellSize,
            height: cellSize,
            backgroundColor: filled ? dragState.shape!.color : 'transparent',
            borderRadius: 4,
          }}
        />
      ))}
    </div>
  </div>
)}

HOVER PREVIEW (show where shape will land):
const [hoverPosition, setHoverPosition] = useState<{ row: number, col: number } | null>(null);

// Update during drag
const handleMouseMove = (e: MouseEvent) => {
  // ... existing code ...
  if (dragState.isDragging && dragState.shape) {
    const pos = getGridPositionFromCoords(e.clientX, e.clientY);
    setHoverPosition(pos);
  }
};

// Render preview on grid
{hoverPosition && dragState.shape && (
  <div className="placement-preview">
    {/* Overlay showing valid/invalid placement */}
  </div>
)}
```

### ✅ Phase 2 Checkpoint

**Test these manually:**
- [ ] Can drag shapes from tray with mouse
- [ ] Can drag shapes from tray with touch
- [ ] Ghost shape follows cursor while dragging
- [ ] Dropping on empty cells places the shape
- [ ] Can't place on occupied cells
- [ ] Can't place outside grid bounds
- [ ] Shape disappears from tray after placing
- [ ] Score increases when placing shapes
- [ ] Invalid placement shows feedback

**Debug Prompt if issues:**
```
Drag and drop isn't working in Block Puzzle.

Issue: [describe - e.g., "shape doesn't follow cursor" or "can't drop on grid"]

Check:
1. Is isDragging being set correctly on mousedown/touchstart?
2. Is getGridPositionFromCoords returning correct row/col?
3. Is the gridRef attached to the grid element?
4. Is canPlaceShape checking all cells in the shape pattern?

Log: console.log('Drag position:', dragState.currentX, dragState.currentY);
Log: console.log('Grid position:', gridPosition);
Log: console.log('Can place:', canPlaceShape(shape, row, col));

Show me the handleMouseDown/handleTouchStart and getGridPositionFromCoords functions.
```

---

## PHASE 3: Line Clearing & Scoring

### Prompt for Claude Code:

```
Add line clearing logic and combo scoring to Block Puzzle.

CURRENT STATE: Can place shapes, but lines don't clear.

LINE CLEARING LOGIC:

const checkAndClearLines = () => {
  const rowsToClear: number[] = [];
  const colsToClear: number[] = [];

  // Check each row
  for (let r = 0; r < GRID_SIZE; r++) {
    if (grid[r].every(cell => cell.filled)) {
      rowsToClear.push(r);
    }
  }

  // Check each column
  for (let c = 0; c < GRID_SIZE; c++) {
    if (grid.every(row => row[c].filled)) {
      colsToClear.push(c);
    }
  }

  if (rowsToClear.length === 0 && colsToClear.length === 0) {
    return;
  }

  // Mark cells as clearing (for animation)
  setGrid(prev => {
    const newGrid = prev.map(row => row.map(cell => ({ ...cell })));
    rowsToClear.forEach(r => {
      for (let c = 0; c < GRID_SIZE; c++) {
        newGrid[r][c].isClearing = true;
      }
    });
    colsToClear.forEach(c => {
      for (let r = 0; r < GRID_SIZE; r++) {
        newGrid[r][c].isClearing = true;
      }
    });
    return newGrid;
  });

  // Calculate score
  const linesCleared = rowsToClear.length + colsToClear.length;
  const cellsCleared = calculateClearedCells(rowsToClear, colsToClear);
  const bonus = calculateClearBonus(linesCleared);
  const points = cellsCleared * 10 + bonus;

  setScore(prev => prev + points);
  triggerClearEffects(linesCleared);

  // After animation, actually clear the cells
  setTimeout(() => {
    setGrid(prev => {
      const newGrid = prev.map(row => row.map(cell => ({ ...cell })));
      rowsToClear.forEach(r => {
        for (let c = 0; c < GRID_SIZE; c++) {
          newGrid[r][c] = { filled: false, color: '', isClearing: false };
        }
      });
      colsToClear.forEach(c => {
        for (let r = 0; r < GRID_SIZE; r++) {
          if (!rowsToClear.includes(r)) { // Don't double-clear
            newGrid[r][c] = { filled: false, color: '', isClearing: false };
          }
        }
      });
      return newGrid;
    });
  }, 300); // Match animation duration
};

CELL COUNT (accounting for overlap):
const calculateClearedCells = (rows: number[], cols: number[]): number => {
  // Total cells = rows*8 + cols*8 - overlaps
  const overlaps = rows.length * cols.length;
  return (rows.length * GRID_SIZE) + (cols.length * GRID_SIZE) - overlaps;
};

BONUS SCORING:
const calculateClearBonus = (linesCleared: number): number => {
  // Bonus for clearing multiple lines at once
  switch (linesCleared) {
    case 1: return 0;
    case 2: return 50;   // Double
    case 3: return 150;  // Triple
    case 4: return 300;  // Quad
    default: return linesCleared * 100; // Epic clear
  }
};

COMBO TRACKING:
Track consecutive moves that clear lines.

const [combo, setCombo] = useState(0);

// In placeShape, after checkAndClearLines:
if (linesCleared > 0) {
  setCombo(prev => prev + 1);
  const comboBonus = combo * 25;
  setScore(prev => prev + comboBonus);
} else {
  setCombo(0);
}

CLEAR EFFECTS:
const triggerClearEffects = (linesCleared: number) => {
  // Sound
  if (linesCleared >= 3) {
    playEpicClearSound();
  } else if (linesCleared >= 2) {
    playDoubleClearSound();
  } else {
    playClearSound();
  }

  // Visual
  if (linesCleared >= 2) {
    triggerScreenShake();
    showClearCallout(linesCleared);
  }

  // Particles for cleared cells
  spawnClearParticles(rowsToClear, colsToClear);
};

CLEAR CALLOUTS:
const getClearCallout = (linesCleared: number): string | null => {
  if (linesCleared >= 4) return 'MEGA CLEAR!';
  if (linesCleared >= 3) return 'TRIPLE!';
  if (linesCleared >= 2) return 'DOUBLE!';
  return null;
};

CLEAR ANIMATION CSS:
.grid-cell.clearing {
  animation: cell-clear 0.3s ease-out forwards;
}

@keyframes cell-clear {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    background-color: #fff !important;
  }
  100% {
    transform: scale(0);
    opacity: 0;
  }
}

HIGHLIGHT COMPLETED LINES:
Before clearing, briefly highlight the lines:

.grid-cell.complete-row,
.grid-cell.complete-col {
  animation: line-flash 0.15s ease-out;
}

@keyframes line-flash {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.5); }
}

CHECK NEW SHAPES:
After placing, if all 3 shapes are used, generate new ones.

useEffect(() => {
  if (shapes.every(s => s === null)) {
    generateNewShapes();
  }
}, [shapes]);

INTEGRATE WITH PLACEMENT:
// In placeShape function, after updating grid:
setTimeout(() => {
  checkAndClearLines();
}, 50); // Small delay for visual feedback
```

### ✅ Phase 3 Checkpoint

**Test these manually:**
- [ ] Filling a complete row clears it
- [ ] Filling a complete column clears it
- [ ] Clearing multiple lines at once gives bonus
- [ ] Score shows correct points for clears
- [ ] Combo builds on consecutive clears
- [ ] Clear animation plays (cells scale and fade)
- [ ] Callouts appear for double/triple clears
- [ ] Screen shakes on big clears
- [ ] New shapes generate when all 3 used
- [ ] Grid cells reset to empty after clear

**Debug Prompt if issues:**
```
Line clearing isn't working correctly in Block Puzzle.

Issue: [describe - e.g., "row doesn't clear when full" or "wrong cells cleared"]

Check:
1. Is every() correctly checking all cells in row/column?
2. Is isClearing being set before the timeout?
3. Is the timeout clearing the correct cells after animation?
4. Are overlapping cells (row+col) being handled?

Log: console.log('Rows to clear:', rowsToClear);
Log: console.log('Cols to clear:', colsToClear);
Log: console.log('Grid state:', grid.map(r => r.map(c => c.filled ? 'X' : '.')));

Show me the checkAndClearLines function.
```

---

## PHASE 4: Game Over Detection & Effects

### Prompt for Claude Code:

```
Add game over detection, visual polish, and more effects to Block Puzzle.

CURRENT STATE: Game plays but never ends.

GAME OVER DETECTION:
Game is over when no remaining shape can be placed anywhere.

const checkGameOver = (): boolean => {
  // For each non-null shape
  for (const shape of shapes) {
    if (!shape) continue;

    // Check every possible position
    for (let row = 0; row <= GRID_SIZE - shape.height; row++) {
      for (let col = 0; col <= GRID_SIZE - shape.width; col++) {
        if (canPlaceShape(shape, row, col)) {
          return false; // At least one valid placement exists
        }
      }
    }
  }

  // No valid placements for any shape
  return true;
};

// Check after each placement AND after generating new shapes
useEffect(() => {
  if (shapes.some(s => s !== null)) {
    const timeout = setTimeout(() => {
      if (checkGameOver()) {
        triggerGameOver();
      }
    }, 500); // Delay to let player see the state
    return () => clearTimeout(timeout);
  }
}, [shapes, grid]);

GAME OVER HANDLING:
const triggerGameOver = () => {
  setIsGameOver(true);
  playGameOverSound();

  // Dramatic grid fill animation
  animateGridFill();
};

const animateGridFill = () => {
  // Fill grid with gray from bottom to top
  for (let row = GRID_SIZE - 1; row >= 0; row--) {
    setTimeout(() => {
      setGrid(prev => {
        const newGrid = prev.map(r => r.map(c => ({ ...c })));
        for (let col = 0; col < GRID_SIZE; col++) {
          if (!newGrid[row][col].filled) {
            newGrid[row][col] = { filled: true, color: '#4a4a4a', isClearing: false };
          }
        }
        return newGrid;
      });
    }, (GRID_SIZE - 1 - row) * 100);
  }
};

GAME OVER UI:
{isGameOver && (
  <div className="game-over-overlay">
    <div className="game-over-modal">
      <h2>Game Over!</h2>
      <div className="final-score">
        <span>Final Score</span>
        <span className="score-value">{score}</span>
      </div>
      {score > highScore && (
        <div className="new-record">🎉 NEW HIGH SCORE! 🎉</div>
      )}
      <div className="stats">
        <div>Lines Cleared: {totalLinesCleared}</div>
        <div>Best Combo: {bestCombo}x</div>
      </div>
      <div className="buttons">
        <button onClick={resetGame}>Play Again</button>
        <button onClick={submitScore}>Submit Score</button>
      </div>
    </div>
  </div>
)}

HOVER PREVIEW (valid/invalid indicator):
Show a preview on the grid where the shape would land.

const [previewCells, setPreviewCells] = useState<{row: number, col: number, valid: boolean}[]>([]);

// During drag, calculate preview
useEffect(() => {
  if (!dragState.isDragging || !dragState.shape || !hoverPosition) {
    setPreviewCells([]);
    return;
  }

  const shape = dragState.shape;
  const { row: startRow, col: startCol } = hoverPosition;
  const cells: {row: number, col: number, valid: boolean}[] = [];
  const isValid = canPlaceShape(shape, startRow, startCol);

  for (let r = 0; r < shape.height; r++) {
    for (let c = 0; c < shape.width; c++) {
      if (shape.pattern[r][c]) {
        cells.push({
          row: startRow + r,
          col: startCol + c,
          valid: isValid,
        });
      }
    }
  }

  setPreviewCells(cells);
}, [hoverPosition, dragState.shape]);

// Render preview overlay
{previewCells.map((cell, idx) => (
  <div
    key={idx}
    className={`preview-cell ${cell.valid ? 'valid' : 'invalid'}`}
    style={{
      position: 'absolute',
      left: cell.col * cellSize + 4, // Account for padding
      top: cell.row * cellSize + 4,
      width: cellSize - 2,
      height: cellSize - 2,
    }}
  />
))}

.preview-cell {
  pointer-events: none;
  border-radius: 4px;
}

.preview-cell.valid {
  background: rgba(255, 107, 0, 0.4);
  border: 2px solid #ff6b00;
}

.preview-cell.invalid {
  background: rgba(255, 0, 0, 0.3);
  border: 2px solid #ff0000;
}

PARTICLE EFFECTS FOR CLEARS:
const spawnClearParticles = (rows: number[], cols: number[]) => {
  const particles: Particle[] = [];

  rows.forEach(row => {
    for (let col = 0; col < GRID_SIZE; col++) {
      particles.push(...createParticlesAt(row, col, grid[row][col].color));
    }
  });

  cols.forEach(col => {
    for (let row = 0; row < GRID_SIZE; row++) {
      if (!rows.includes(row)) {
        particles.push(...createParticlesAt(row, col, grid[row][col].color));
      }
    }
  });

  setParticles(prev => [...prev, ...particles]);
};

const createParticlesAt = (row: number, col: number, color: string): Particle[] => {
  const centerX = col * cellSize + cellSize / 2;
  const centerY = row * cellSize + cellSize / 2;

  return Array(4).fill(null).map((_, i) => ({
    id: Date.now() + row * 100 + col * 10 + i,
    x: centerX,
    y: centerY,
    color,
    velocity: {
      x: (Math.random() - 0.5) * 10,
      y: -Math.random() * 8 - 2,
    },
  }));
};

SCORE ANIMATIONS:
const [scoreAnimations, setScoreAnimations] = useState<{id: number, value: number, x: number, y: number}[]>([]);

// When clearing lines, show score popup
const showScorePopup = (value: number, row: number, col: number) => {
  const x = col * cellSize + cellSize / 2;
  const y = row * cellSize;

  setScoreAnimations(prev => [...prev, { id: Date.now(), value, x, y }]);
  setTimeout(() => {
    setScoreAnimations(prev => prev.filter(a => a.id !== Date.now()));
  }, 1000);
};

{scoreAnimations.map(anim => (
  <div
    key={anim.id}
    className="score-popup"
    style={{ left: anim.x, top: anim.y }}
  >
    +{anim.value}
  </div>
))}

STATISTICS TRACKING:
const [stats, setStats] = useState({
  totalLinesCleared: 0,
  bestCombo: 0,
  shapesPlaced: 0,
});

// Update during gameplay
```

### ✅ Phase 4 Checkpoint

**Test these manually:**
- [ ] Game over triggers when no shapes can be placed
- [ ] Grid fills with gray on game over (animation)
- [ ] Game over modal shows final score
- [ ] New high score indicator appears when applicable
- [ ] Statistics show (lines cleared, best combo)
- [ ] Preview shows where shape will land during drag
- [ ] Valid placement shows orange preview
- [ ] Invalid placement shows red preview
- [ ] Particles spawn when lines clear
- [ ] Play Again resets everything

**Debug Prompt if issues:**
```
Game over detection or effects aren't working in Block Puzzle.

Issue: [describe - e.g., "game over triggers too early" or "preview not showing"]

For game over:
1. Is checkGameOver checking ALL remaining shapes?
2. Is it checking EVERY valid starting position?
3. Is the delay giving time for state to settle?

For preview:
1. Is hoverPosition being updated during drag?
2. Is previewCells being calculated in the useEffect?
3. Are preview divs positioned correctly over the grid?

Log: console.log('Remaining shapes:', shapes.filter(Boolean).length);
Log: console.log('Valid placements:', countValidPlacements());

Show me the checkGameOver function.
```

---

## PHASE 5: Audio, Leaderboard & Final Polish

### Prompt for Claude Code:

```
Add Howler.js audio, leaderboard, and final polish to Block Puzzle.

CURRENT STATE: Full game with effects, needs audio and leaderboard.

AUDIO INTEGRATION:

Sounds needed:
- Shape pickup (start drag)
- Shape place (successful drop)
- Invalid placement (error sound)
- Line clear (satisfying clear)
- Multi-line clear (bigger sound)
- Combo sound
- Game over

const {
  playPickup,
  placeSound,
  playInvalid,
  playClear,
  playMultiClear,
  playCombo,
  playGameOver,
  setMuted
} = useHowlerSounds();

// Triggers:
// Start drag:
playPickup();

// Successful placement:
playPlace();

// Invalid drop:
playInvalid();

// Line clear (based on count):
if (linesCleared >= 3) {
  playMultiClear();
} else if (linesCleared >= 1) {
  playClear();
}

// Combo milestone:
if (combo >= 3 && combo % 2 === 1) { // 3, 5, 7...
  playCombo();
}

// Game over:
playGameOver();

LEADERBOARD INTEGRATION:

import { useLeaderboard } from '../../hooks/useLeaderboard';

const { submitScore, getTopScores } = useLeaderboard('block-puzzle');

const handleSubmitScore = async () => {
  if (score > 0) {
    await submitScore(score);
    // Show leaderboard
  }
};

HIGH SCORE PERSISTENCE:
const [highScore, setHighScore] = useState(() =>
  parseInt(localStorage.getItem('block-puzzle-high') || '0', 10)
);

useEffect(() => {
  if (score > highScore) {
    setHighScore(score);
    localStorage.setItem('block-puzzle-high', score.toString());
  }
}, [score]);

MOBILE POLISH:

1. Touch drag offset:
// Lift shape above finger so user can see it
const touchOffset = isMobile ? -80 : 0;

style={{
  top: dragState.currentY + touchOffset,
}}

2. Prevent scroll during drag:
useEffect(() => {
  if (dragState.isDragging) {
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  } else {
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  }
}, [dragState.isDragging]);

3. Haptic feedback:
const vibrate = (pattern: number | number[]) => {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

// On place:
vibrate(50);

// On clear:
vibrate([50, 50, 100]);

// On invalid:
vibrate([20, 20, 20]);

ALTERNATIVE TAP-TO-PLACE MODE:
For accessibility / preference:

const [tapMode, setTapMode] = useState(false);

// If tapMode enabled:
// 1. Tap shape to select
// 2. Tap grid cell to place

const handleGridCellTap = (row: number, col: number) => {
  if (!tapMode || selectedShape === null) return;

  const shape = shapes[selectedShape];
  if (shape && canPlaceShape(shape, row, col)) {
    placeShape(shape, row, col, selectedShape);
    setSelectedShape(null);
  }
};

// Toggle in settings
<button onClick={() => setTapMode(!tapMode)}>
  {tapMode ? 'Drag Mode' : 'Tap Mode'}
</button>

HINT SYSTEM (optional):
Show where a shape can be placed:

const showHint = () => {
  const shape = shapes.find(s => s !== null);
  if (!shape) return;

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (canPlaceShape(shape, row, col)) {
        highlightPosition(row, col, shape);
        return;
      }
    }
  }
};

UNDO (optional):
Store previous state for undo:

const [history, setHistory] = useState<{grid: Cell[][], shapes: Shape[], score: number}[]>([]);

// Before each placement, save state
const saveState = () => {
  setHistory(prev => [...prev, { grid: [...grid], shapes: [...shapes], score }]);
};

// Undo button
const undo = () => {
  if (history.length === 0) return;
  const prev = history[history.length - 1];
  setGrid(prev.grid);
  setShapes(prev.shapes);
  setScore(prev.score);
  setHistory(h => h.slice(0, -1));
};

FINAL POLISH:

1. Loading state
2. Instructions/tutorial
3. Daily challenge mode
4. Difficulty modes (grid size 6x6, 10x10)
5. Themes (dark, light, colorblind)

RESPONSIVE LAYOUT:
const gameWidth = Math.min(
  isMobile ? width - 32 : 450,
  height * 0.5 // Don't take more than half the height
);

// Ensure tray doesn't overflow
.shape-tray {
  max-width: 100%;
  overflow-x: auto;
  justify-content: center;
  flex-wrap: wrap;
}
```

### ✅ Phase 5 Final Checklist

**Audio:**
- [ ] Pickup sound on drag start
- [ ] Place sound on successful drop
- [ ] Error sound on invalid placement
- [ ] Clear sound when lines clear
- [ ] Bigger sound for multi-line clears
- [ ] Combo sounds work
- [ ] Game over sound plays
- [ ] Mute toggle works

**Leaderboard:**
- [ ] Score submits correctly
- [ ] Leaderboard displays
- [ ] High score persists locally

**Mobile:**
- [ ] Touch drag works smoothly
- [ ] Shape visible above finger while dragging
- [ ] No page scroll during drag
- [ ] Haptic feedback (if available)
- [ ] Responsive layout on all screens

**Polish:**
- [ ] Tap mode alternative (if implemented)
- [ ] Hint system (if implemented)
- [ ] Undo functionality (if implemented)
- [ ] Smooth 60fps performance
- [ ] No memory leaks

**Debug Prompt if audio issues:**
```
Audio isn't working correctly in Block Puzzle.

Issue: [describe]

Check:
1. Are sounds preloaded before first use?
2. Is the correct sound triggered for each action?
3. For rapid actions (dragging), is sound spam prevented?

Show me where each sound is triggered and the Howler setup.
```

---

## Complete File Structure

```
src/games/BlockPuzzle/
├── BlockPuzzleGame.tsx    # Main component
├── BlockPuzzleGame.css    # Styles
├── ShapeSlot.tsx          # Shape tray item
├── GameOverModal.tsx      # End screen
├── types.ts               # TypeScript interfaces
├── shapes.ts              # Shape definitions
└── constants.ts           # Colors, sizes, etc.

public/assets/sounds/
├── pickup.mp3
├── place.mp3
├── invalid.mp3
├── clear.mp3
├── multi-clear.mp3
├── combo.mp3
└── game-over.mp3
```

---

## Shape Reference

```typescript
// shapes.ts
export const SHAPES: boolean[][][] = [
  // 1-block
  [[true]],

  // 2-blocks
  [[true, true]],
  [[true], [true]],

  // 3-blocks line
  [[true, true, true]],
  [[true], [true], [true]],

  // 3-blocks L
  [[true, false], [true, true]],
  [[true, true], [false, true]],
  [[true, true], [true, false]],
  [[false, true], [true, true]],

  // 4-blocks
  [[true, true, true, true]],
  [[true], [true], [true], [true]],

  // T-shape
  [[true, true, true], [false, true, false]],
  [[true, false], [true, true], [true, false]],

  // Square 2x2
  [[true, true], [true, true]],

  // Square 3x3
  [[true, true, true], [true, true, true], [true, true, true]],

  // Z/S shapes
  [[true, true, false], [false, true, true]],
  [[false, true, true], [true, true, false]],
];

export const SHAPE_COLORS = [
  '#ff6b00', // Primary orange
  '#ff8c00', // Dark orange
  '#ffa500', // Orange
  '#ffcc00', // Gold
  '#ff5500', // Red-orange
  '#ff9933', // Tangerine
];
```
