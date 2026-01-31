import { useState, useEffect, useCallback, useRef } from 'react';
import { Info, X } from 'lucide-react';
import { useGameEffects, GameEffects } from '@/components/media';
import { ArcadeGameOverScreen } from '@/components/media/games/ArcadeGameOverScreen';
import { GameSEO } from '@/components/seo/GameSEO';
import { generateGameScorecard } from '@/systems/sharing/GameScorecard';
import { GameButton } from '@/components/ui/GameButton';
import { useGameTouch } from '@/hooks/useGameTouch';
import { useIsMobile } from '@/hooks/useMediaQuery';
import './Orange2048.css';

type Grid = (number | null)[][];

const GRID_SIZE = 4;

// Emoji mapping for tile values
const TILE_EMOJI: { [key: number]: string } = {
  2: '🍊',      // Orange
  4: '🍋',      // Lemon
  8: '🍎',      // Apple
  16: '🍇',     // Grapes
  32: '🍓',     // Strawberry
  64: '🥭',     // Mango
  128: '🍑',    // Peach
  256: '🥝',    // Kiwi
  512: '🍍',    // Pineapple
  1024: '🌟',   // Star
  2048: '👑',   // Crown
};

// Helper functions moved outside component to avoid hoisting issues
function createEmptyGrid(): Grid {
  return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
}

function checkIsGameOver(currentGrid: Grid): boolean {
  // Check for empty cells
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (currentGrid[row][col] === null) return false;
    }
  }

  // Check for possible merges
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const current = currentGrid[row][col];
      if (col < GRID_SIZE - 1 && current === currentGrid[row][col + 1]) return false;
      if (row < GRID_SIZE - 1 && current === currentGrid[row + 1][col]) return false;
    }
  }

  return true;
}

const Orange2048: React.FC = () => {
  const isMobile = useIsMobile();
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'won'>('idle');
  const [grid, setGrid] = useState<Grid>(() => createEmptyGrid());
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('orange2048HighScore') || '0', 10);
  });
  const [showInfo, setShowInfo] = useState(false);

  const lastMergeValueRef = useRef(0);

  // Universal visual effects system
  const {
    effects,
    triggerShockwave,
    triggerSparks,
    triggerScreenShake,
    addFloatingEmoji,
    showEpicCallout,
    triggerConfetti,
    addScorePopup,
    updateCombo,
    resetAllEffects,
  } = useGameEffects();

  // Mobile fullscreen mode - hide header during gameplay
  useEffect(() => {
    if (isMobile && gameState === 'playing') {
      document.body.classList.add('game-fullscreen-mode');
    } else {
      document.body.classList.remove('game-fullscreen-mode');
    }
    return () => {
      document.body.classList.remove('game-fullscreen-mode');
    };
  }, [isMobile, gameState]);

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
    resetAllEffects();
  };

  // Share handler for game over scorecard
  const handleShare = useCallback(async () => {
    try {
      const blob = await generateGameScorecard({
        gameName: '2048 Merge',
        gameNameParts: ['2048', 'MERGE'],
        score: score,
        scoreLabel: 'points',
        bestScore: highScore,
        isNewRecord: score >= highScore && score > 0,
        screenshot: null, // No screenshot for this game
        accentColor: '#ff6b00', // Orange accent
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `2048-merge-${score}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);

      if (navigator.share && navigator.canShare) {
        const file = new File([blob], '2048-merge-score.png', { type: 'image/png' });
        const shareData = {
          title: '2048 Merge Score',
          text: `🍊 I scored ${score} points in 2048 Merge! Can you beat me?`,
          files: [file],
        };
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
        }
      }
    } catch (err) {
      console.error('Failed to generate share image:', err);
      const shareText = `🍊 2048 Merge: ${score} points!\n\nCan you beat my score?\n\nhttps://wojak.ink/games`;
      if (navigator.share) {
        await navigator.share({ title: '2048 Merge', text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
      }
    }
  }, [score, highScore]);

  const slide = (row: (number | null)[]): { row: (number | null)[]; score: number } => {
    // Remove nulls
    const arr = row.filter((x): x is number => x !== null);
    let scoreGained = 0;

    // Merge adjacent equal tiles
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] = arr[i]! * 2;
        scoreGained += arr[i]!;
        arr.splice(i + 1, 1);
      }
    }

    // Pad with nulls
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

    // Rotate grid so we always slide left
    const rotations: { [key: string]: number } = {
      left: 0,
      up: 1,
      right: 2,
      down: 3,
    };

    newGrid = rotateGrid(newGrid, rotations[direction]);

    // Slide each row left
    for (let row = 0; row < GRID_SIZE; row++) {
      const original = [...newGrid[row]];
      const { row: slid, score: gained } = slide(newGrid[row]);
      newGrid[row] = slid;
      totalScore += gained;

      if (JSON.stringify(original) !== JSON.stringify(slid)) {
        moved = true;
      }
    }

    // Rotate back
    newGrid = rotateGrid(newGrid, (4 - rotations[direction]) % 4);

    if (moved) {
      newGrid = addRandomTile(newGrid);
      setGrid(newGrid);

      // Trigger effects based on merge value
      if (totalScore > 0) {
        addScorePopup(`+${totalScore}`);
        updateCombo();

        // Find highest merged tile this move
        const highestMerge = Math.max(...newGrid.flat().filter((v): v is number => v !== null));

        if (highestMerge > lastMergeValueRef.current) {
          lastMergeValueRef.current = highestMerge;

          // Effects based on tile value achieved
          if (highestMerge >= 128) {
            triggerShockwave('#ff6b00', 0.6);
            triggerSparks('#ff6b00');
            addFloatingEmoji(TILE_EMOJI[highestMerge] || '🔥');
          }
          if (highestMerge >= 256) {
            triggerScreenShake(300);
            showEpicCallout(`${highestMerge}!`);
          }
          if (highestMerge >= 512) {
            triggerConfetti();
          }
        }
      }

      setScore(prev => {
        const newScore = prev + totalScore;
        if (newScore > highScore) {
          setHighScore(newScore);
          localStorage.setItem('orange2048HighScore', String(newScore));
        }
        return newScore;
      });

      // Check for win
      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          if (newGrid[row][col] === 2048) {
            setGameState('won');
            showEpicCallout('YOU WIN!');
            triggerConfetti();
            triggerShockwave('#FFD700', 1.0);
            return;
          }
        }
      }

      // Check for game over
      if (checkIsGameOver(newGrid)) {
        setGameState('gameover');
        triggerScreenShake(500);
      }
    }
  }, [gameState, grid, addRandomTile, highScore, addScorePopup, updateCombo, triggerShockwave, triggerSparks, addFloatingEmoji, triggerScreenShake, showEpicCallout, triggerConfetti]);

  // Touch controls using shared hook
  const touchHandlers = useGameTouch({
    onSwipe: (direction) => {
      if (gameState === 'playing') {
        move(direction);
      }
    },
    swipeThreshold: 30,
  });

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

  return (
    <div className="game2048-page">
      <GameSEO
        gameName="Wojak Merge"
        gameSlug="merge-2048"
        description="Slide and merge tiles to reach 2048! Strategic puzzle gameplay with satisfying combinations and endless replayability."
        genre="Puzzle"
        difficulty="Medium"
      />
      <header className="game2048-header">
        <div className="game2048-toolbar">
          <button className="btn btn-ghost" onClick={() => setShowInfo(true)}>
            <Info size={20} />
          </button>
          <h1 className="game2048-header-title">2048 Oranges</h1>
        </div>
      </header>
      <div className="game2048-content">
        {gameState === 'playing' && (
          <div className="game2048-hud">
            <div className="hud-item">
              <span className="hud-label">Score</span>
              <span className="hud-value">{score}</span>
            </div>
            <div className="hud-item">
              <span className="hud-label">Best</span>
              <span className="hud-value">{highScore}</span>
            </div>
          </div>
        )}

        <div
          className={`game2048-area ${effects.screenShake ? 'screen-shake' : ''}`}
          {...touchHandlers}
        >
          {/* Universal Game Effects Layer */}
          <GameEffects effects={effects} accentColor="#ff6b00" />
          {gameState === 'idle' && (
            <div className="game-menu">
              <div className="game-title">2048 Oranges</div>
              <div className="game-emoji">&#x1F34A;</div>
              <p className="game-desc">Swipe to merge fruits!</p>
              <p className="game-desc">Get to the 👑 to win</p>
              {highScore > 0 && (
                <p className="high-score">High Score: {highScore}</p>
              )}
              <GameButton onClick={startGame} className="play-btn" size="lg">
                Play
              </GameButton>
            </div>
          )}

          {(gameState === 'gameover' || gameState === 'won') && (
            <ArcadeGameOverScreen
              score={score}
              highScore={highScore}
              scoreLabel="points"
              isNewPersonalBest={score >= highScore && score > 0}
              onPlayAgain={startGame}
              onShare={handleShare}
              title={gameState === 'won' ? 'You Win!' : 'Game Over!'}
              accentColor="#ff6b00"
            />
          )}

          {gameState === 'playing' && (
            <div className="grid-container">
              <div className="grid-2048">
                {grid.map((row, rowIndex) =>
                  row.map((cell, colIndex) => (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={`cell ${cell ? `cell-${cell}` : 'cell-empty'}`}
                    >
                      {cell && (
                        <>
                          <span className="cell-emoji">{TILE_EMOJI[cell] || '🔥'}</span>
                          <span className="cell-value">{cell}</span>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="swipe-hint">Swipe or use arrow keys</div>
            </div>
          )}
        </div>

        {/* Info Modal */}
        {showInfo && (
          <div className="info-overlay" onClick={() => setShowInfo(false)}>
            <div className="info-modal" onClick={(e) => e.stopPropagation()}>
              <button className="info-close" onClick={() => setShowInfo(false)}>
                <X size={24} />
              </button>
              <h2>How to Play</h2>
              <div className="info-content">
                <p><strong>Goal:</strong> Merge tiles to reach 2048 (👑)!</p>
                <p><strong>Controls:</strong> Swipe in any direction to move all tiles.</p>
                <p><strong>Rules:</strong></p>
                <ul>
                  <li>Tiles with the same value merge</li>
                  <li>Each merge doubles the value</li>
                  <li>New tiles appear after each move</li>
                  <li>Game ends when no moves left</li>
                </ul>
                <p><strong>Progression:</strong> 🍊→🍋→🍎→🍇→🍓→🥭→🍑→🥝→🍍→🌟→👑</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orange2048;
