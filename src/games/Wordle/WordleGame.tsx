/**
 * Orange Wordle Game
 *
 * A 5-letter word guessing game with a citrus/orange theme.
 * - 6 attempts to guess the word
 * - Tiles reveal: correct (orange), present (yellow), absent (gray)
 * - On-screen QWERTY keyboard
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { getRandomSolution, isValidWord } from './words';
import { loadStats, updateStatsAfterGame, type WordleStats } from './stats';
import { useGameEffects, GameEffects } from '@/components/media';
import StatsModal from './StatsModal';
import './WordleGame.css';

// ============================================================================
// CONSTANTS
// ============================================================================

const ROWS = 6;
const COLS = 5;

// Keyboard layout
const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫'],
];

// ============================================================================
// INTERFACES
// ============================================================================

export interface Letter {
  char: string;
  state: 'empty' | 'tbd' | 'correct' | 'present' | 'absent';
}

export interface GameState {
  board: Letter[][];
  currentRow: number;
  currentCol: number;
  targetWord: string;
  gameStatus: 'playing' | 'won' | 'lost';
  usedLetters: Record<string, 'correct' | 'present' | 'absent'>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create an empty game board
 */
const createEmptyBoard = (): Letter[][] => {
  return Array(ROWS)
    .fill(null)
    .map(() =>
      Array(COLS)
        .fill(null)
        .map(() => ({ char: '', state: 'empty' as const }))
    );
};

/**
 * Evaluate a guess against the solution
 * Returns array of states: 'correct', 'present', or 'absent' for each letter
 */
const evaluateGuess = (
  guess: string,
  solution: string
): Array<'correct' | 'present' | 'absent'> => {
  const result: Array<'correct' | 'present' | 'absent'> = Array(COLS).fill('absent');
  const solutionArr = solution.split('');
  const guessArr = guess.split('');

  // Track which solution letters have been "used"
  const used: boolean[] = Array(COLS).fill(false);

  // First pass: mark correct (exact position matches)
  for (let i = 0; i < COLS; i++) {
    if (guessArr[i] === solutionArr[i]) {
      result[i] = 'correct';
      used[i] = true;
    }
  }

  // Second pass: mark present (letter exists but wrong position)
  for (let i = 0; i < COLS; i++) {
    if (result[i] === 'correct') continue; // Already marked correct

    // Look for this letter in unused positions of solution
    for (let j = 0; j < COLS; j++) {
      if (!used[j] && guessArr[i] === solutionArr[j]) {
        result[i] = 'present';
        used[j] = true;
        break;
      }
    }
  }

  return result;
};

// ============================================================================
// KEYBOARD COMPONENT
// ============================================================================

interface KeyboardProps {
  onKeyPress: (key: string) => void;
  usedLetters: Record<string, 'correct' | 'present' | 'absent'>;
}

const Keyboard: React.FC<KeyboardProps> = ({ onKeyPress, usedLetters }) => {
  const getKeyClass = (key: string): string => {
    const classes = ['wordle-key'];

    if (key === 'ENTER' || key === '⌫') {
      classes.push('key-wide');
    }

    const state = usedLetters[key];
    if (state) {
      classes.push(`key-${state}`);
    }

    return classes.join(' ');
  };

  return (
    <div className="wordle-keyboard">
      {KEYBOARD_ROWS.map((row, rowIdx) => (
        <div key={rowIdx} className="keyboard-row">
          {row.map((key) => (
            <button
              key={key}
              className={getKeyClass(key)}
              onClick={() => onKeyPress(key)}
              aria-label={key === '⌫' ? 'Backspace' : key}
            >
              {key}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const WordleGame: React.FC = () => {
  const isMobile = useIsMobile();

  // Game state
  const [board, setBoard] = useState<Letter[][]>(createEmptyBoard);
  const [currentRow, setCurrentRow] = useState(0);
  const [currentCol, setCurrentCol] = useState(0);
  const [targetWord, setTargetWord] = useState('');
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [usedLetters, setUsedLetters] = useState<Record<string, 'correct' | 'present' | 'absent'>>({});

  // Animation state
  const [lastTyped, setLastTyped] = useState<{ row: number; col: number } | null>(null);
  const [shakingRow, setShakingRow] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [revealingRow, setRevealingRow] = useState<number | null>(null);
  const [revealedCols, setRevealedCols] = useState<Set<number>>(new Set());
  const [winningRow, setWinningRow] = useState<number | null>(null);

  // Stats state
  const [stats, setStats] = useState<WordleStats>(loadStats);
  const [showStats, setShowStats] = useState(false);
  const [lastGameWon, setLastGameWon] = useState<boolean | null>(null);
  const [lastGuessCount, setLastGuessCount] = useState<number | undefined>(undefined);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const isRevealingRef = useRef(false); // Block input during reveal animation

  // Universal visual effects system
  const {
    effects,
    triggerShockwave,
    triggerSparks,
    triggerVignette,
    triggerScreenShake,
    addFloatingEmoji,
    showEpicCallout,
    triggerConfetti,
    updateCombo,
    resetCombo,
    resetAllEffects,
  } = useGameEffects();

  // Initialize game on mount
  useEffect(() => {
    const word = getRandomSolution();
    setTargetWord(word);
  }, []);

  /**
   * Show a toast message
   */
  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  }, []);

  /**
   * Shake a row (invalid input feedback)
   */
  const shakeRow = useCallback((row: number) => {
    setShakingRow(row);
    setTimeout(() => setShakingRow(null), 500);
  }, []);

  /**
   * Add a letter to the current position
   */
  const addLetter = useCallback(
    (letter: string) => {
      // Block input during reveal animation
      if (isRevealingRef.current) return;
      if (currentCol >= COLS || gameStatus !== 'playing') return;

      setBoard((prev) => {
        const newBoard = prev.map((row) => row.map((l) => ({ ...l })));
        newBoard[currentRow][currentCol] = {
          char: letter,
          state: 'tbd',
        };
        return newBoard;
      });

      // Trigger pop animation
      setLastTyped({ row: currentRow, col: currentCol });
      setTimeout(() => setLastTyped(null), 100);

      setCurrentCol((prev) => prev + 1);
    },
    [currentCol, currentRow, gameStatus]
  );

  /**
   * Delete the last letter
   */
  const deleteLetter = useCallback(() => {
    // Block input during reveal animation
    if (isRevealingRef.current) return;
    if (currentCol <= 0 || gameStatus !== 'playing') return;

    setBoard((prev) => {
      const newBoard = prev.map((row) => row.map((l) => ({ ...l })));
      newBoard[currentRow][currentCol - 1] = {
        char: '',
        state: 'empty',
      };
      return newBoard;
    });

    setCurrentCol((prev) => prev - 1);
  }, [currentCol, currentRow, gameStatus]);

  /**
   * Reveal tiles with flip animation
   */
  const revealTiles = useCallback(
    async (
      rowIdx: number,
      guess: string,
      results: Array<'correct' | 'present' | 'absent'>
    ): Promise<boolean> => {
      const FLIP_DURATION = 300; // ms per tile
      const FLIP_DELAY = 300; // ms between tiles

      isRevealingRef.current = true;
      setRevealingRow(rowIdx);
      setRevealedCols(new Set());

      let correctCount = 0;

      // Reveal each tile with staggered animation
      for (let i = 0; i < COLS; i++) {
        // Start flip animation for this tile
        setRevealedCols((prev) => new Set([...prev, i]));

        // Wait for flip to reach midpoint, then change color
        await new Promise((resolve) => setTimeout(resolve, FLIP_DURATION / 2));

        // Update tile state at midpoint of flip
        setBoard((prev) => {
          const newBoard = prev.map((row) => row.map((l) => ({ ...l })));
          newBoard[rowIdx][i].state = results[i];
          return newBoard;
        });

        // Update keyboard color for this letter
        const letter = guess[i];
        const state = results[i];
        setUsedLetters((prev) => {
          const currentState = prev[letter];
          // Priority: correct > present > absent (never downgrade)
          if (currentState === 'correct') return prev;
          if (currentState === 'present' && state === 'absent') return prev;
          return { ...prev, [letter]: state };
        });

        // Trigger effects based on result
        if (state === 'correct') {
          correctCount++;
          triggerSparks('#ff6b00');
          addFloatingEmoji('🍊');
          updateCombo();
        } else if (state === 'present') {
          triggerSparks('#FFD700');
          addFloatingEmoji('🟡');
        }

        // Wait for flip to complete before next tile
        await new Promise((resolve) => setTimeout(resolve, FLIP_DURATION / 2 + FLIP_DELAY));
      }

      // Bonus effects for multiple correct letters
      if (correctCount >= 3) {
        triggerShockwave('#ff6b00', 0.5);
        showEpicCallout(correctCount === 5 ? '' : `${correctCount} CORRECT!`);
      }

      // Clear revealing state
      setRevealingRow(null);
      setRevealedCols(new Set());
      isRevealingRef.current = false;

      // Check if won
      return results.every((r) => r === 'correct');
    },
    [triggerSparks, addFloatingEmoji, updateCombo, triggerShockwave, showEpicCallout]
  );

  /**
   * Submit the current guess
   */
  const submitGuess = useCallback(async () => {
    // Block if already revealing or game over
    if (isRevealingRef.current) return;
    if (gameStatus !== 'playing') return;

    // Check if we have 5 letters
    if (currentCol !== COLS) {
      showToast('Not enough letters');
      shakeRow(currentRow);
      triggerScreenShake(200);
      return;
    }

    // Get the current guess from the board
    const guess = board[currentRow].map((l) => l.char).join('');

    // Validate the word is in the word list
    if (!isValidWord(guess)) {
      showToast('Not in word list');
      shakeRow(currentRow);
      triggerVignette('#ff4444');
      triggerScreenShake(300);
      resetCombo();
      return;
    }

    // Evaluate the guess
    const results = evaluateGuess(guess, targetWord);

    // Store current row for closure
    const submittedRow = currentRow;

    // Reveal tiles with animation
    const isWin = await revealTiles(submittedRow, guess, results);

    // Check for win
    if (isWin) {
      setWinningRow(submittedRow);
      const numGuesses = submittedRow + 1; // Row is 0-indexed, guesses are 1-indexed

      // Victory effects
      triggerConfetti();
      triggerShockwave('#FFD700', 1.0);
      showEpicCallout(numGuesses === 1 ? 'GENIUS!' : numGuesses <= 3 ? 'BRILLIANT!' : 'VICTORY!');
      addFloatingEmoji('🎉');

      setTimeout(() => {
        setGameStatus('won');
        // Update stats after win
        const updatedStats = updateStatsAfterGame(true, numGuesses);
        setStats(updatedStats);
        setLastGameWon(true);
        setLastGuessCount(numGuesses);
        // Show stats modal after brief delay for win celebration
        setTimeout(() => setShowStats(true), 300);
      }, 500); // Brief delay for win animation
      return;
    }

    // Check for loss (used all 6 rows)
    if (submittedRow >= ROWS - 1) {
      setGameStatus('lost');
      showToast(targetWord);
      // Loss effects
      triggerVignette('#ff0000');
      triggerScreenShake(500);
      addFloatingEmoji('😔');
      resetCombo();
      // Update stats after loss
      const updatedStats = updateStatsAfterGame(false, 6);
      setStats(updatedStats);
      setLastGameWon(false);
      setLastGuessCount(undefined);
      // Show stats modal after toast
      setTimeout(() => setShowStats(true), 1500);
      return;
    }

    // Move to next row
    setCurrentRow(submittedRow + 1);
    setCurrentCol(0);
  }, [
    gameStatus,
    currentCol,
    currentRow,
    board,
    targetWord,
    showToast,
    shakeRow,
    revealTiles,
    triggerScreenShake,
    triggerVignette,
    resetCombo,
    triggerConfetti,
    triggerShockwave,
    showEpicCallout,
    addFloatingEmoji,
  ]);

  /**
   * Handle virtual keyboard press
   */
  const handleKeyPress = useCallback(
    (key: string) => {
      if (gameStatus !== 'playing') return;

      if (key === 'ENTER') {
        submitGuess();
      } else if (key === '⌫' || key === 'BACKSPACE') {
        deleteLetter();
      } else if (/^[A-Z]$/.test(key)) {
        addLetter(key);
      }
    },
    [gameStatus, submitGuess, deleteLetter, addLetter]
  );

  /**
   * Handle physical keyboard input
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStatus !== 'playing') return;

      const key = e.key.toUpperCase();

      if (key === 'ENTER') {
        e.preventDefault();
        submitGuess();
      } else if (key === 'BACKSPACE' || key === 'DELETE') {
        e.preventDefault();
        deleteLetter();
      } else if (/^[A-Z]$/.test(key) && key.length === 1) {
        e.preventDefault();
        addLetter(key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStatus, submitGuess, deleteLetter, addLetter]);

  /**
   * Reset the game
   */
  const resetGame = useCallback(() => {
    const word = getRandomSolution();
    setTargetWord(word);
    setBoard(createEmptyBoard());
    setCurrentRow(0);
    setCurrentCol(0);
    setGameStatus('playing');
    setUsedLetters({});
    setToast(null);
    setRevealingRow(null);
    setRevealedCols(new Set());
    setWinningRow(null);
    setShowStats(false);
    setLastGameWon(null);
    setLastGuessCount(undefined);
    isRevealingRef.current = false;
    resetAllEffects();
  }, [resetAllEffects]);

  /**
   * Get tile classes
   */
  const getTileClass = (rowIdx: number, colIdx: number, letter: Letter): string => {
    const classes = ['wordle-tile', letter.state];

    // Pop animation for last typed
    if (lastTyped?.row === rowIdx && lastTyped?.col === colIdx) {
      classes.push('pop');
    }

    // Flip animation during reveal
    if (revealingRow === rowIdx && revealedCols.has(colIdx)) {
      classes.push('flip');
    }

    // Win bounce animation
    if (winningRow === rowIdx) {
      classes.push('win');
    }

    return classes.join(' ');
  };

  /**
   * Get row classes
   */
  const getRowClass = (rowIdx: number): string => {
    const classes = ['wordle-row'];

    if (shakingRow === rowIdx) {
      classes.push('shake');
    }

    if (winningRow === rowIdx) {
      classes.push('win');
    }

    return classes.join(' ');
  };

  return (
    <div ref={containerRef} className={`wordle-container ${effects.screenShake ? 'screen-shake' : ''}`}>
      {/* Universal Game Effects Layer */}
      <GameEffects effects={effects} accentColor="#ff6b00" />

      {/* Header */}
      <div className="wordle-header">
        <div className="wordle-header-left" />
        <div className="wordle-header-center">
          <h1 className="wordle-title">WORDLE</h1>
          <span className="wordle-subtitle">Citrus Edition</span>
        </div>
        <div className="wordle-header-right">
          <button
            className="wordle-stats-btn"
            onClick={() => setShowStats(true)}
            aria-label="View statistics"
          >
            📊
          </button>
        </div>
      </div>

      {/* Toast notification */}
      {toast && <div className="wordle-toast">{toast}</div>}

      {/* Game Board */}
      <div className="wordle-board">
        {board.map((row, rowIdx) => (
          <div key={rowIdx} className={getRowClass(rowIdx)}>
            {row.map((letter, colIdx) => (
              <div
                key={colIdx}
                className={getTileClass(rowIdx, colIdx, letter)}
                style={{ '--tile-index': colIdx } as React.CSSProperties}
                aria-label={`Row ${rowIdx + 1}, Column ${colIdx + 1}${letter.char ? `, Letter ${letter.char}` : ''}`}
              >
                {letter.char}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Virtual Keyboard */}
      <Keyboard onKeyPress={handleKeyPress} usedLetters={usedLetters} />

      {/* Instructions (mobile hint) */}
      {isMobile && (
        <div className="wordle-instructions">
          <p>Guess the 5-letter word in 6 tries!</p>
        </div>
      )}

      {/* Game Over Overlay */}
      {gameStatus !== 'playing' && !showStats && (
        <div className="wordle-overlay">
          <div className="wordle-modal">
            <h2>{gameStatus === 'won' ? '🍊 Victory!' : '😔 Game Over'}</h2>
            {gameStatus === 'lost' && (
              <p>
                The word was: <strong>{targetWord}</strong>
              </p>
            )}
            <div className="wordle-modal-buttons">
              <button className="wordle-btn" onClick={resetGame}>
                Play Again
              </button>
              <button className="wordle-btn secondary" onClick={() => setShowStats(true)}>
                View Stats
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      <StatsModal
        isOpen={showStats}
        onClose={() => setShowStats(false)}
        stats={stats}
        gameWon={lastGameWon}
        numGuesses={lastGuessCount}
      />
    </div>
  );
};

export default WordleGame;
