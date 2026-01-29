/**
 * Orange 2048 - Migrated to Shared Systems
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { GameShell } from '@/systems/game-ui';
import { useEffects, EffectsLayer } from '@/systems/effects';
import { ORANGE_2048_CONFIG, GRID_SIZE, TILE_EMOJI } from './config';
import './Orange2048.game.css';

type Grid = (number | null)[][];

// Helper function moved outside component to avoid hoisting issues
function createEmptyGrid(): Grid {
  return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
}

const Orange2048Game: React.FC = () => {
  const effects = useEffects();
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'won'>('idle');
  const [grid, setGrid] = useState<Grid>(() => createEmptyGrid());
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('orange2048HighScore') || '0', 10);
  });
  // Reserved for info modal: const [showInfo, setShowInfo] = useState(false);

  const touchStartRef = useRef({ x: 0, y: 0 });
  const lastMergeValueRef = useRef(0);

  const addRandomTile = useCallback((currentGrid: Grid): Grid => {
    const emptyCells: { row: number; col: number }[] = [];

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (currentGrid[row][col] === null) {
          emptyCells.push({ row, col });
        }
      }
    }

    if (emptyCells.length === 0) return currentGrid;

    const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const newGrid = currentGrid.map(r => [...r]);
    newGrid[row][col] = Math.random() < 0.9 ? 2 : 4;

    return newGrid;
  }, []);

  const startGame = () => {
    let newGrid = createEmptyGrid();
    newGrid = addRandomTile(newGrid);
    newGrid = addRandomTile(newGrid);
    setGrid(newGrid);
    setScore(0);
    setGameState('playing');
    lastMergeValueRef.current = 0;
  };

  // Auto-start - runs only once on mount
  useEffect(() => {
    if (gameState === 'idle') {
      queueMicrotask(() => startGame());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentional: only run on mount, not on state changes
  }, []);

  const slide = (row: (number | null)[]): { row: (number | null)[]; score: number } => {
    const arr = row.filter((x): x is number => x !== null);
    let scoreGained = 0;

    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] = arr[i]! * 2;
        scoreGained += arr[i]!;
        arr.splice(i + 1, 1);
      }
    }

    while (arr.length < GRID_SIZE) {
      arr.push(null as unknown as number);
    }

    return { row: arr, score: scoreGained };
  };

  const move = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (gameState !== 'playing') return;

    let newGrid = grid.map(r => [...r]);
    let totalScore = 0;
    let moved = false;

    const rotateGrid = (g: Grid, times: number): Grid => {
      let result = g;
      for (let i = 0; i < times; i++) {
        const rotated: Grid = createEmptyGrid();
        for (let row = 0; row < GRID_SIZE; row++) {
          for (let col = 0; col < GRID_SIZE; col++) {
            rotated[col][GRID_SIZE - 1 - row] = result[row][col];
          }
        }
        result = rotated;
      }
      return result;
    };

    const rotations: { [key: string]: number } = {
      left: 0,
      up: 1,
      right: 2,
      down: 3,
    };

    newGrid = rotateGrid(newGrid, rotations[direction]);

    for (let row = 0; row < GRID_SIZE; row++) {
      const oldRow = [...newGrid[row]];
      const { row: newRow, score: rowScore } = slide(newGrid[row]);
      newGrid[row] = newRow;
      totalScore += rowScore;

      if (JSON.stringify(oldRow) !== JSON.stringify(newRow)) {
        moved = true;
      }
    }

    newGrid = rotateGrid(newGrid, (4 - rotations[direction]) % 4);

    if (!moved) return;

    // Effects for merges
    if (totalScore > 0) {
      effects.trigger({ type: 'shockwave', intensity: totalScore >= 128 ? 'strong' : 'normal' });

      if (totalScore >= 64) {
        effects.trigger({ type: 'sparks', intensity: 'medium' });
      }

      if (totalScore > lastMergeValueRef.current) {
        effects.trigger({ type: 'scorePopup', data: { score: totalScore } });
      }
      lastMergeValueRef.current = totalScore;
    }

    newGrid = addRandomTile(newGrid);

    const newScore = score + totalScore;
    setGrid(newGrid);
    setScore(newScore);

    if (newScore > highScore) {
      setHighScore(newScore);
      localStorage.setItem('orange2048HighScore', String(newScore));
    }

    // Check for 2048 win
    for (const row of newGrid) {
      for (const cell of row) {
        if (cell === 2048) {
          setGameState('won');
          effects.trigger({ type: 'confetti', intensity: 'strong', duration: 5000 });
          return;
        }
      }
    }

    // Check for game over
    let hasMove = false;
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (newGrid[row][col] === null) hasMove = true;
        if (col < GRID_SIZE - 1 && newGrid[row][col] === newGrid[row][col + 1]) hasMove = true;
        if (row < GRID_SIZE - 1 && newGrid[row][col] === newGrid[row + 1][col]) hasMove = true;
      }
    }

    if (!hasMove) {
      setGameState('gameover');
    }
  }, [gameState, grid, score, highScore, addRandomTile, effects]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          move('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          move('down');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          move('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          move('right');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, move]);

  // Touch controls
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (gameState !== 'playing') return;

      const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
      const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;

      const minSwipe = 30;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (Math.abs(deltaX) > minSwipe) {
          move(deltaX > 0 ? 'right' : 'left');
        }
      } else {
        if (Math.abs(deltaY) > minSwipe) {
          move(deltaY > 0 ? 'down' : 'up');
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [gameState, move]);

  return (
    <div className="game-2048-page">
      <div className="game-2048-content">
        <div className="game-2048-container">
          <EffectsLayer />

          <div className="game-header-2048">
            <div className="score-box">
              <span className="score-label">Score</span>
              <span className="score-value">{score}</span>
            </div>
            <div className="score-box">
              <span className="score-label">Best</span>
              <span className="score-value">{highScore}</span>
            </div>
          </div>

          <div className="grid-container">
            <div className="grid-background">
              {Array(GRID_SIZE * GRID_SIZE).fill(null).map((_, i) => (
                <div key={i} className="grid-cell-bg" />
              ))}
            </div>

            <div className="grid-tiles">
              {grid.map((row, rowIndex) =>
                row.map((cell, colIndex) =>
                  cell !== null ? (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={`tile tile-${cell}`}
                      style={{
                        transform: `translate(${colIndex * 100}%, ${rowIndex * 100}%)`,
                      }}
                    >
                      <span className="tile-content">
                        {TILE_EMOJI[cell] || cell}
                      </span>
                    </div>
                  ) : null
                )
              )}
            </div>
          </div>

          {(gameState === 'gameover' || gameState === 'won') && (
            <div className="game-over-overlay">
              <div className="game-over-message">
                <h2>{gameState === 'won' ? 'You Win!' : 'Game Over!'}</h2>
                <p>Score: {score}</p>
                <button className="btn btn-primary" onClick={startGame}>Play Again</button>
              </div>
            </div>
          )}

          <div className="game-instructions">
            Swipe or use arrow keys to merge tiles!
          </div>
        </div>
      </div>
    </div>
  );
};

const Orange2048: React.FC = () => (
  <GameShell gameId={ORANGE_2048_CONFIG.id}>
    <Orange2048Game />
  </GameShell>
);

export default Orange2048;
