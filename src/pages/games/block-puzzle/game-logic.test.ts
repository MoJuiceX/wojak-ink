import { describe, it, expect } from 'vitest';
import {
  createEmptyGrid,
  countFilledCells,
  checkPerfectClear,
  generateRandomPiece,
  generateThreePieces,
  canPlacePiece,
  canPlaceAnywhere,
  countValidMoves,
  placePiece,
  clearLines,
  isGameOver,
  getPreviewCells,
  checkSameColorLines,
  calculatePlacementPoints,
  calculateLineClearPoints,
  applyStreakBonus,
  decodeChallenge,
} from './game-logic';
import { GRID_SIZE, BLOCK_SHAPES, BLOCK_COLORS } from './config';
import type { Grid, DraggablePiece } from './types';

// Helper to create a specific grid with certain cells filled
const makeGridWithRow = (rowIdx: number, color = '#ff0000'): Grid => {
  const grid = createEmptyGrid();
  for (let col = 0; col < GRID_SIZE; col++) {
    grid[rowIdx][col] = { filled: true, color, blockId: 'test' };
  }
  return grid;
};

const makeGridWithCol = (colIdx: number, color = '#ff0000'): Grid => {
  const grid = createEmptyGrid();
  for (let row = 0; row < GRID_SIZE; row++) {
    grid[row][colIdx] = { filled: true, color, blockId: 'test' };
  }
  return grid;
};

const makePiece = (shape: number[][], color = BLOCK_COLORS[0]): DraggablePiece => ({
  id: 'test-piece',
  shape,
  color,
});

describe('createEmptyGrid', () => {
  it('creates an 8x8 grid', () => {
    const grid = createEmptyGrid();
    expect(grid.length).toBe(GRID_SIZE);
    grid.forEach(row => expect(row.length).toBe(GRID_SIZE));
  });

  it('all cells are empty initially', () => {
    const grid = createEmptyGrid();
    grid.flat().forEach(cell => {
      expect(cell.filled).toBe(false);
      expect(cell.color).toBeNull();
      expect(cell.blockId).toBeNull();
    });
  });
});

describe('countFilledCells', () => {
  it('returns 0 for empty grid', () => {
    expect(countFilledCells(createEmptyGrid())).toBe(0);
  });

  it('counts correctly with one filled row', () => {
    const grid = makeGridWithRow(0);
    expect(countFilledCells(grid)).toBe(GRID_SIZE);
  });

  it('counts correctly with multiple filled cells', () => {
    const grid = createEmptyGrid();
    grid[0][0] = { filled: true, color: '#f00', blockId: 'a' };
    grid[1][1] = { filled: true, color: '#f00', blockId: 'b' };
    expect(countFilledCells(grid)).toBe(2);
  });
});

describe('checkPerfectClear', () => {
  it('returns true for empty grid', () => {
    expect(checkPerfectClear(createEmptyGrid())).toBe(true);
  });

  it('returns false when any cell is filled', () => {
    const grid = createEmptyGrid();
    grid[0][0] = { filled: true, color: '#f00', blockId: 'a' };
    expect(checkPerfectClear(grid)).toBe(false);
  });
});

describe('generateRandomPiece', () => {
  it('returns a piece with id, shape, and color', () => {
    const piece = generateRandomPiece();
    expect(piece).toHaveProperty('id');
    expect(piece).toHaveProperty('shape');
    expect(piece).toHaveProperty('color');
  });

  it('shape is a 2D array of 0s and 1s', () => {
    const piece = generateRandomPiece();
    piece.shape.flat().forEach(cell => {
      expect([0, 1]).toContain(cell);
    });
  });

  it('color is from BLOCK_COLORS', () => {
    const piece = generateRandomPiece();
    expect(BLOCK_COLORS).toContain(piece.color as typeof BLOCK_COLORS[number]);
  });
});

describe('generateThreePieces', () => {
  it('returns exactly three pieces', () => {
    expect(generateThreePieces()).toHaveLength(3);
  });

  it('all pieces have unique ids', () => {
    const pieces = generateThreePieces();
    const ids = pieces.map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(3);
  });
});

describe('canPlacePiece', () => {
  it('returns true for a single block on empty grid', () => {
    const grid = createEmptyGrid();
    expect(canPlacePiece(grid, [[1]], 0, 0)).toBe(true);
  });

  it('returns false if out of bounds (row)', () => {
    const grid = createEmptyGrid();
    expect(canPlacePiece(grid, [[1]], GRID_SIZE, 0)).toBe(false);
  });

  it('returns false if out of bounds (col)', () => {
    const grid = createEmptyGrid();
    expect(canPlacePiece(grid, [[1]], 0, GRID_SIZE)).toBe(false);
  });

  it('returns false if cell is occupied', () => {
    const grid = createEmptyGrid();
    grid[0][0] = { filled: true, color: '#f00', blockId: 'a' };
    expect(canPlacePiece(grid, [[1]], 0, 0)).toBe(false);
  });

  it('returns true for a 2x2 block in corner', () => {
    const grid = createEmptyGrid();
    expect(canPlacePiece(grid, BLOCK_SHAPES.square2, 0, 0)).toBe(true);
  });

  it('skips 0 cells in shape', () => {
    const grid = createEmptyGrid();
    // L-shape: first row only has [1, 0], second row has [1, 1]
    // Can place at corner even though second col of first row is 0
    expect(canPlacePiece(grid, BLOCK_SHAPES.lShape1, 0, 0)).toBe(true);
  });
});

describe('canPlaceAnywhere', () => {
  it('returns true for empty grid with any piece', () => {
    const grid = createEmptyGrid();
    const piece = makePiece([[1]]);
    expect(canPlaceAnywhere(grid, piece)).toBe(true);
  });

  it('returns false when grid is too full for piece', () => {
    // Fill the entire grid
    const grid = createEmptyGrid();
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        grid[r][c] = { filled: true, color: '#f00', blockId: 'full' };
      }
    }
    const piece = makePiece([[1]]);
    expect(canPlaceAnywhere(grid, piece)).toBe(false);
  });
});

describe('countValidMoves', () => {
  it('returns positive count for empty grid', () => {
    const grid = createEmptyGrid();
    const pieces = [makePiece([[1]])];
    expect(countValidMoves(grid, pieces)).toBeGreaterThan(0);
  });

  it('returns 0 for full grid', () => {
    const grid = createEmptyGrid();
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        grid[r][c] = { filled: true, color: '#f00', blockId: 'x' };
      }
    }
    const pieces = [makePiece([[1]])];
    expect(countValidMoves(grid, pieces)).toBe(0);
  });
});

describe('placePiece', () => {
  it('places a single cell piece correctly', () => {
    const grid = createEmptyGrid();
    const { newGrid, placedCells } = placePiece(grid, [[1]], 2, 3, '#ff0000');
    expect(newGrid[2][3].filled).toBe(true);
    expect(newGrid[2][3].color).toBe('#ff0000');
    expect(placedCells).toContain('2-3');
  });

  it('does not mutate the original grid', () => {
    const grid = createEmptyGrid();
    placePiece(grid, [[1]], 0, 0, '#ff0000');
    expect(grid[0][0].filled).toBe(false);
  });

  it('places a 2x2 block correctly', () => {
    const grid = createEmptyGrid();
    const { newGrid, placedCells } = placePiece(grid, BLOCK_SHAPES.square2, 0, 0, '#blue');
    expect(newGrid[0][0].filled).toBe(true);
    expect(newGrid[0][1].filled).toBe(true);
    expect(newGrid[1][0].filled).toBe(true);
    expect(newGrid[1][1].filled).toBe(true);
    expect(placedCells.length).toBe(4);
  });

  it('does not place cells where shape has 0', () => {
    const grid = createEmptyGrid();
    // lShape1: [[1, 0], [1, 0], [1, 1]]
    const { newGrid } = placePiece(grid, BLOCK_SHAPES.lShape1, 0, 0, '#blue');
    expect(newGrid[0][1].filled).toBe(false); // 0 in shape
  });
});

describe('clearLines', () => {
  it('clears a complete row', () => {
    const grid = makeGridWithRow(0);
    const { clearedGrid, linesCleared } = clearLines(grid);
    expect(linesCleared).toBe(1);
    for (let col = 0; col < GRID_SIZE; col++) {
      expect(clearedGrid[0][col].filled).toBe(false);
    }
  });

  it('clears a complete column', () => {
    const grid = makeGridWithCol(0);
    const { clearedGrid, linesCleared } = clearLines(grid);
    expect(linesCleared).toBe(1);
    for (let row = 0; row < GRID_SIZE; row++) {
      expect(clearedGrid[row][0].filled).toBe(false);
    }
  });

  it('returns 0 lines cleared for incomplete grid', () => {
    const grid = createEmptyGrid();
    grid[0][0] = { filled: true, color: '#f00', blockId: 'x' };
    const { linesCleared } = clearLines(grid);
    expect(linesCleared).toBe(0);
  });

  it('clears multiple rows at once', () => {
    const grid = createEmptyGrid();
    for (let row of [0, 1]) {
      makeGridWithRow(row, '#f00').forEach((r) => {
        grid[row] = r;
      });
    }
    // Fill two rows
    for (let c = 0; c < GRID_SIZE; c++) {
      grid[0][c] = { filled: true, color: '#f00', blockId: 'x' };
      grid[1][c] = { filled: true, color: '#f00', blockId: 'y' };
    }
    const { linesCleared } = clearLines(grid);
    expect(linesCleared).toBe(2);
  });

  it('returns the set of cleared cells', () => {
    const grid = makeGridWithRow(0);
    const { cellsCleared } = clearLines(grid);
    expect(cellsCleared.size).toBe(GRID_SIZE);
    for (let col = 0; col < GRID_SIZE; col++) {
      expect(cellsCleared.has(`0-${col}`)).toBe(true);
    }
  });
});

describe('isGameOver', () => {
  it('returns false when a single-cell piece can be placed', () => {
    const grid = createEmptyGrid();
    const pieces = [makePiece([[1]])];
    expect(isGameOver(grid, pieces)).toBe(false);
  });

  it('returns true when no pieces can be placed', () => {
    const grid = createEmptyGrid();
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        grid[r][c] = { filled: true, color: '#f00', blockId: 'x' };
      }
    }
    const pieces = [makePiece([[1]])];
    expect(isGameOver(grid, pieces)).toBe(true);
  });
});

describe('getPreviewCells', () => {
  it('returns empty set when piece is undefined', () => {
    const cells = getPreviewCells(0, 0, undefined);
    expect(cells.size).toBe(0);
  });

  it('returns correct cells for a single block piece', () => {
    const piece = makePiece([[1]]);
    const cells = getPreviewCells(2, 3, piece);
    expect(cells.has('2-3')).toBe(true);
    expect(cells.size).toBe(1);
  });

  it('returns correct cells for a 1x3 piece', () => {
    const piece = makePiece([[1, 1, 1]]);
    const cells = getPreviewCells(0, 0, piece);
    expect(cells.has('0-0')).toBe(true);
    expect(cells.has('0-1')).toBe(true);
    expect(cells.has('0-2')).toBe(true);
    expect(cells.size).toBe(3);
  });
});

describe('checkSameColorLines', () => {
  it('detects a same-color full row', () => {
    const grid = makeGridWithRow(0, '#ff0000');
    const result = checkSameColorLines(grid);
    expect(result.sameColorRows).toContain(0);
    expect(result.totalSameColorLines).toBeGreaterThanOrEqual(1);
  });

  it('detects a same-color full column', () => {
    const grid = makeGridWithCol(0, '#00ff00');
    const result = checkSameColorLines(grid);
    expect(result.sameColorCols).toContain(0);
  });

  it('returns no same-color lines for mixed color row', () => {
    const grid = createEmptyGrid();
    // Fill row 0 with alternating colors
    for (let c = 0; c < GRID_SIZE; c++) {
      grid[0][c] = { filled: true, color: c % 2 === 0 ? '#f00' : '#00f', blockId: 'x' };
    }
    const result = checkSameColorLines(grid);
    expect(result.sameColorRows).not.toContain(0);
  });

  it('returns empty arrays for empty grid', () => {
    const result = checkSameColorLines(createEmptyGrid());
    expect(result.sameColorRows).toHaveLength(0);
    expect(result.sameColorCols).toHaveLength(0);
    expect(result.totalSameColorLines).toBe(0);
  });
});

describe('calculatePlacementPoints', () => {
  it('returns 10 points per block', () => {
    expect(calculatePlacementPoints([[1]])).toBe(10);
    expect(calculatePlacementPoints([[1, 1], [1, 1]])).toBe(40);
  });

  it('only counts cells with value 1', () => {
    // lShape1: [[1,0],[1,0],[1,1]] = 4 blocks
    expect(calculatePlacementPoints(BLOCK_SHAPES.lShape1)).toBe(40);
  });

  it('line4h has 40 points', () => {
    expect(calculatePlacementPoints(BLOCK_SHAPES.line4h)).toBe(40);
  });
});

describe('calculateLineClearPoints', () => {
  it('returns 100 points for single line, no combo', () => {
    expect(calculateLineClearPoints(1, 0)).toBe(100);
  });

  it('returns doubled points for 2 lines', () => {
    // 2 lines * 100 = 200, lineComboMultiplier = 2, comboBonus = 1
    expect(calculateLineClearPoints(2, 0)).toBe(400);
  });

  it('combo bonus applies for comboCount >= 2', () => {
    const base = calculateLineClearPoints(1, 0); // 100
    const withCombo = calculateLineClearPoints(1, 3); // comboBonus = 3
    expect(withCombo).toBeGreaterThan(base);
  });

  it('combo bonus is capped at 5', () => {
    const withCombo5 = calculateLineClearPoints(1, 5);
    const withCombo10 = calculateLineClearPoints(1, 10);
    expect(withCombo5).toBe(withCombo10);
  });
});

describe('applyStreakBonus', () => {
  it('returns base score when streak is not active', () => {
    expect(applyStreakBonus(1000, false, 2)).toBe(1000);
  });

  it('applies multiplier when streak is active', () => {
    expect(applyStreakBonus(1000, true, 2)).toBe(2000);
  });

  it('floors the result', () => {
    expect(applyStreakBonus(100, true, 1.5)).toBe(150);
    // 100 * 1.7 = 170 (no rounding needed), but with a fractional case:
    expect(applyStreakBonus(100, true, 1.3)).toBe(130);
  });
});

describe('decodeChallenge', () => {
  it('returns null for invalid encoded string', () => {
    expect(decodeChallenge('not-base64!')).toBeNull();
    expect(decodeChallenge('')).toBeNull();
  });

  it('decodes a valid encoded challenge', () => {
    const challenge = { s: 42 };
    const encoded = btoa(JSON.stringify(challenge));
    expect(decodeChallenge(encoded)).toBe(42);
  });

  it('returns null when encoded object has no s field', () => {
    const encoded = btoa(JSON.stringify({ other: 10 }));
    expect(decodeChallenge(encoded)).toBeNull();
  });
});
