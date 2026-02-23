# Claude Code Prompt: Orange Wordle Game

## Overview
Build a Wordle clone for wojak.ink with an orange/gold color scheme, virtual keyboard, and animated tile reveals. Pure DOM/CSS implementation.

---

## TECH STACK & ARCHITECTURE

```
Framework: React + TypeScript + Ionic Framework
Rendering: Pure DOM/CSS (no Canvas)
Animation: CSS animations for tile flips
Styling: CSS file (OrangeWordle.css)
Sound: useGameSounds() hook
Leaderboard: useLeaderboard('orange-wordle') hook
Mobile Detection: useIsMobile() hook
```

**File Structure:**
```
src/pages/OrangeWordle.tsx         # Main game component
src/pages/OrangeWordle.css         # All styles + effects
src/pages/wordlist.ts              # Word lists
src/components/media/games/GameModal.tsx  # Add lazy import
src/config/query/queryKeys.ts      # Add 'orange-wordle' to GameId type
```

---

## GAME SPECIFICATIONS

### Grid
- 6 rows (attempts)
- 5 columns (letters)
- Current row accepts input
- Previous rows show results

### Letter States
```typescript
type LetterState = 'empty' | 'filled' | 'correct' | 'present' | 'absent';

// Colors (orange theme)
const STATE_COLORS = {
  empty: 'transparent',
  filled: '#3a3a4a',      // Dark gray (unsubmitted)
  correct: '#FF6B00',     // Orange (correct position)
  present: '#FFD700',     // Gold (wrong position)
  absent: '#2a2a3a'       // Dark (not in word)
};
```

### Controls
- Virtual on-screen keyboard (NOT device keyboard)
- Keyboard shows letter states (green/yellow/gray)
- Enter to submit, Backspace to delete

### Scoring (Leaderboard)
- **Primary**: Win streak (consecutive wins)
- **Secondary**: Average guesses per win

### Game Modes
- **Unlimited Play**: New word each game (random from list)
- Future: Daily puzzle mode (everyone gets same word)

---

## WORD LISTS

```typescript
// wordlist.ts

// Solution words (~2300 common 5-letter words)
export const SOLUTION_WORDS: string[] = [
  'ABOUT', 'ABOVE', 'ABUSE', 'ACTOR', 'ACUTE', 'ADMIT', 'ADOPT', 'ADULT',
  'AFTER', 'AGAIN', 'AGENT', 'AGREE', 'AHEAD', 'ALARM', 'ALBUM', 'ALERT',
  // ... include full list (see resources below)
];

// Valid guesses (~10000 additional valid words)
export const VALID_GUESSES: string[] = [
  ...SOLUTION_WORDS,
  'AAHED', 'AALII', 'AARGH', 'ABACA', 'ABACI', 'ABACK',
  // ... include full list
];

export const isValidWord = (word: string): boolean => {
  return VALID_GUESSES.includes(word.toUpperCase());
};

export const getRandomWord = (): string => {
  return SOLUTION_WORDS[Math.floor(Math.random() * SOLUTION_WORDS.length)];
};
```

**Word List Resources:**
- https://gist.github.com/cfreshman/a03ef2cba789d8cf00c08f767e0fad7b (solution words)
- https://gist.github.com/cfreshman/cdcdf777450c5b5301e439061d29694c (valid guesses)

---

## COMPONENT STRUCTURE

```typescript
interface GameState {
  answer: string;
  guesses: string[];        // Array of submitted words
  currentGuess: string;     // Current input
  currentRow: number;       // 0-5
  gameStatus: 'playing' | 'won' | 'lost';
  letterStates: Map<string, LetterState>; // Keyboard letter states
  revealingRow: number | null; // Which row is currently animating
}

const OrangeWordle: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    answer: getRandomWord(),
    guesses: [],
    currentGuess: '',
    currentRow: 0,
    gameStatus: 'playing',
    letterStates: new Map(),
    revealingRow: null
  });

  const [stats, setStats] = useState({
    winStreak: 0,
    gamesPlayed: 0,
    totalGuesses: 0,
    wins: 0
  });

  // ... implementation
};
```

---

## CORE GAME LOGIC

### Letter Checking Algorithm
```typescript
interface LetterResult {
  letter: string;
  state: LetterState;
}

const checkGuess = (guess: string, answer: string): LetterResult[] => {
  const results: LetterResult[] = Array(5).fill(null).map((_, i) => ({
    letter: guess[i],
    state: 'absent' as LetterState
  }));

  const answerLetters = answer.split('');
  const guessLetters = guess.split('');

  // First pass: Mark correct positions (green)
  for (let i = 0; i < 5; i++) {
    if (guessLetters[i] === answerLetters[i]) {
      results[i].state = 'correct';
      answerLetters[i] = '#'; // Mark as used
      guessLetters[i] = '*';  // Mark as matched
    }
  }

  // Second pass: Mark present letters (yellow)
  for (let i = 0; i < 5; i++) {
    if (guessLetters[i] === '*') continue; // Already matched

    const answerIndex = answerLetters.indexOf(guessLetters[i]);
    if (answerIndex !== -1) {
      results[i].state = 'present';
      answerLetters[answerIndex] = '#'; // Mark as used
    }
  }

  return results;
};
```

### Submit Guess
```typescript
const submitGuess = () => {
  const { currentGuess, answer, currentRow, guesses } = gameState;

  // Validate
  if (currentGuess.length !== 5) {
    showError('Not enough letters');
    triggerRowShake(currentRow);
    return;
  }

  if (!isValidWord(currentGuess)) {
    showError('Not in word list');
    triggerRowShake(currentRow);
    return;
  }

  // Check the guess
  const results = checkGuess(currentGuess, answer);

  // Update letter states for keyboard
  const newLetterStates = new Map(gameState.letterStates);
  results.forEach(({ letter, state }) => {
    const currentState = newLetterStates.get(letter);
    // Only upgrade state (absent -> present -> correct)
    if (!currentState ||
        (currentState === 'absent' && state !== 'absent') ||
        (currentState === 'present' && state === 'correct')) {
      newLetterStates.set(letter, state);
    }
  });

  // Add to guesses
  const newGuesses = [...guesses, currentGuess];

  // Check win/lose
  let newStatus: 'playing' | 'won' | 'lost' = 'playing';
  if (currentGuess === answer) {
    newStatus = 'won';
  } else if (currentRow === 5) {
    newStatus = 'lost';
  }

  // Trigger reveal animation
  setGameState(prev => ({
    ...prev,
    revealingRow: currentRow
  }));

  // After animation, update state
  setTimeout(() => {
    setGameState(prev => ({
      ...prev,
      guesses: newGuesses,
      currentGuess: '',
      currentRow: prev.currentRow + 1,
      gameStatus: newStatus,
      letterStates: newLetterStates,
      revealingRow: null
    }));

    // Handle win/lose
    if (newStatus === 'won') {
      handleWin(currentRow + 1);
    } else if (newStatus === 'lost') {
      handleLose();
    }
  }, 5 * 300 + 500); // Wait for all tiles to flip
};
```

### Keyboard Input
```typescript
const handleKeyPress = (key: string) => {
  if (gameState.gameStatus !== 'playing') return;
  if (gameState.revealingRow !== null) return; // Block input during animation

  if (key === 'ENTER') {
    submitGuess();
  } else if (key === 'BACKSPACE' || key === '⌫') {
    setGameState(prev => ({
      ...prev,
      currentGuess: prev.currentGuess.slice(0, -1)
    }));
  } else if (key.length === 1 && /^[A-Z]$/.test(key)) {
    if (gameState.currentGuess.length < 5) {
      setGameState(prev => ({
        ...prev,
        currentGuess: prev.currentGuess + key
      }));
      playBlockLand(); // Subtle key press sound
    }
  }
};

// Physical keyboard support
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleKeyPress('ENTER');
    } else if (e.key === 'Backspace') {
      handleKeyPress('BACKSPACE');
    } else if (/^[a-zA-Z]$/.test(e.key)) {
      handleKeyPress(e.key.toUpperCase());
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [gameState]);
```

---

## UI COMPONENTS

### Game Grid
```tsx
const GameGrid: React.FC = () => {
  return (
    <div className="wordle-grid">
      {Array(6).fill(null).map((_, rowIndex) => (
        <div key={rowIndex} className="wordle-row">
          {Array(5).fill(null).map((_, colIndex) => (
            <Tile
              key={colIndex}
              rowIndex={rowIndex}
              colIndex={colIndex}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
```

### Tile Component
```tsx
interface TileProps {
  rowIndex: number;
  colIndex: number;
}

const Tile: React.FC<TileProps> = ({ rowIndex, colIndex }) => {
  const { guesses, currentGuess, currentRow, answer, revealingRow } = gameState;

  let letter = '';
  let state: LetterState = 'empty';

  if (rowIndex < guesses.length) {
    // Submitted row
    letter = guesses[rowIndex][colIndex];
    const results = checkGuess(guesses[rowIndex], answer);
    state = results[colIndex].state;
  } else if (rowIndex === currentRow) {
    // Current input row
    letter = currentGuess[colIndex] || '';
    state = letter ? 'filled' : 'empty';
  }

  // Animation
  const isRevealing = revealingRow === rowIndex;
  const revealDelay = colIndex * 300; // Stagger 300ms per tile

  return (
    <div
      className={`wordle-tile ${state} ${isRevealing ? 'revealing' : ''}`}
      style={{
        animationDelay: isRevealing ? `${revealDelay}ms` : '0ms',
        backgroundColor: STATE_COLORS[state]
      }}
    >
      <span className="tile-letter">{letter}</span>
    </div>
  );
};
```

### Virtual Keyboard
```tsx
const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
];

const Keyboard: React.FC = () => {
  return (
    <div className="wordle-keyboard">
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="keyboard-row">
          {row.map(key => (
            <button
              key={key}
              className={`keyboard-key ${getKeyState(key)}`}
              onClick={() => handleKeyPress(key)}
              style={{
                backgroundColor: getKeyColor(key)
              }}
            >
              {key}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};

const getKeyState = (key: string): string => {
  if (key === 'ENTER' || key === '⌫') return 'action';
  return gameState.letterStates.get(key) || 'unused';
};

const getKeyColor = (key: string): string => {
  if (key === 'ENTER' || key === '⌫') return '#4a4a5a';
  const state = gameState.letterStates.get(key);
  if (!state) return '#5a5a6a';
  return STATE_COLORS[state];
};
```

---

## CSS ANIMATIONS

```css
/* Tile styles */
.wordle-tile {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #3a3a4a;
  font-size: 32px;
  font-weight: bold;
  color: white;
  text-transform: uppercase;
  transition: background-color 0.1s;
}

.wordle-tile.filled {
  border-color: #6a6a7a;
  animation: tile-pop 0.1s ease;
}

@keyframes tile-pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

/* Tile flip reveal */
.wordle-tile.revealing {
  animation: tile-flip 0.5s ease forwards;
  animation-delay: var(--reveal-delay, 0ms);
}

@keyframes tile-flip {
  0% {
    transform: rotateX(0deg);
  }
  50% {
    transform: rotateX(90deg);
  }
  100% {
    transform: rotateX(0deg);
  }
}

/* Row shake for invalid input */
@keyframes row-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-10px); }
  40% { transform: translateX(10px); }
  60% { transform: translateX(-10px); }
  80% { transform: translateX(10px); }
}

.wordle-row.shaking {
  animation: row-shake 0.5s ease;
}

/* Tile colors */
.wordle-tile.correct {
  background: #FF6B00 !important;
  border-color: #FF6B00;
}

.wordle-tile.present {
  background: #FFD700 !important;
  border-color: #FFD700;
}

.wordle-tile.absent {
  background: #2a2a3a !important;
  border-color: #2a2a3a;
}

/* Keyboard */
.wordle-keyboard {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 20px;
}

.keyboard-row {
  display: flex;
  justify-content: center;
  gap: 6px;
}

.keyboard-key {
  min-width: 40px;
  height: 55px;
  border: none;
  border-radius: 5px;
  font-size: 14px;
  font-weight: bold;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
}

.keyboard-key:active {
  transform: scale(0.95);
}

.keyboard-key.action {
  min-width: 65px;
  font-size: 12px;
}

.keyboard-key.correct { background: #FF6B00; }
.keyboard-key.present { background: #FFD700; }
.keyboard-key.absent { background: #2a2a3a; }

/* Win celebration */
@keyframes win-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

.wordle-row.win-row .wordle-tile {
  animation: win-bounce 0.5s ease;
}

.wordle-row.win-row .wordle-tile:nth-child(1) { animation-delay: 0ms; }
.wordle-row.win-row .wordle-tile:nth-child(2) { animation-delay: 100ms; }
.wordle-row.win-row .wordle-tile:nth-child(3) { animation-delay: 200ms; }
.wordle-row.win-row .wordle-tile:nth-child(4) { animation-delay: 300ms; }
.wordle-row.win-row .wordle-tile:nth-child(5) { animation-delay: 400ms; }
```

---

## EXTREME EFFECTS PHILOSOPHY

### Win Effects
```typescript
const handleWin = (guessCount: number) => {
  playWinSound();

  // Update streak
  const newStreak = stats.winStreak + 1;
  updateStats({ win: true, guesses: guessCount });

  // Effects based on performance
  if (guessCount === 1) {
    // First try!
    showEpicCallout('🏆 GENIUS! 🏆');
    triggerFullChaos();
  } else if (guessCount === 2) {
    showEpicCallout('⚡ MAGNIFICENT! ⚡');
    triggerLightning();
    triggerConfetti();
  } else if (guessCount === 3) {
    showEpicCallout('🔥 IMPRESSIVE! 🔥');
    triggerConfetti();
  } else if (guessCount === 4) {
    showEpicCallout('SPLENDID!');
    spawnFloatingEmojis(['🎉', '✨']);
  } else if (guessCount === 5) {
    showEpicCallout('GREAT!');
    spawnFloatingEmojis(['👍']);
  } else {
    showEpicCallout('PHEW!');
  }

  // Streak milestones
  if (newStreak === 5) {
    showEpicCallout('5 WIN STREAK!');
    playCombo();
  }
  if (newStreak === 10) {
    showEpicCallout('🔥 10 STREAK! 🔥');
    triggerLightning();
  }
};

const handleLose = () => {
  playGameOver();
  triggerScreenShake();

  // Show the answer
  showEpicCallout(`The word was: ${gameState.answer}`);

  // Reset streak
  updateStats({ win: false });
};
```

### Row Reveal Effects
```typescript
// During tile reveal animation
const onTileReveal = (rowIndex: number, colIndex: number, state: LetterState) => {
  playBlockLand(); // Satisfying flip sound

  // Extra effect for correct letters
  if (state === 'correct') {
    // Small screen shake on correct
    triggerScreenShake(30);
  }
};
```

---

## LEADERBOARD INTEGRATION

```typescript
const { leaderboard, submitScore, isSignedIn } = useLeaderboard('orange-wordle');

const handleWin = async (guessCount: number) => {
  // ... effects ...

  if (isSignedIn) {
    await submitScore(stats.winStreak + 1, null, {
      averageGuesses: calculateAverageGuesses(),
      gamesPlayed: stats.gamesPlayed + 1,
      lastGuessCount: guessCount
    });
  }
};
```

---

## NEW GAME

```typescript
const startNewGame = () => {
  setGameState({
    answer: getRandomWord(),
    guesses: [],
    currentGuess: '',
    currentRow: 0,
    gameStatus: 'playing',
    letterStates: new Map(),
    revealingRow: null
  });
};
```

---

## MOBILE LAYOUT

```tsx
<IonPage>
  <IonContent>
    <div className={`wordle-container ${isMobile ? 'mobile' : 'desktop'}`}>
      {/* Header */}
      <div className="wordle-header">
        <h1>WORDLE</h1>
        <div className="streak-display">🔥 {stats.winStreak}</div>
      </div>

      {/* Game Grid */}
      <GameGrid />

      {/* Error message */}
      {errorMessage && (
        <div className="error-toast">{errorMessage}</div>
      )}

      {/* Keyboard */}
      <Keyboard />

      {/* Game Over Modal */}
      {gameState.gameStatus !== 'playing' && (
        <GameOverModal
          won={gameState.gameStatus === 'won'}
          answer={gameState.answer}
          guesses={gameState.guesses.length}
          onPlayAgain={startNewGame}
        />
      )}
    </div>
  </IonContent>
</IonPage>
```

---

## TESTING CHECKLIST

- [ ] Virtual keyboard works (all keys)
- [ ] Physical keyboard works
- [ ] Only valid 5-letter words accepted
- [ ] Invalid word shows error + shake
- [ ] Tile flip animation works (staggered)
- [ ] Letter states calculated correctly (green/yellow/gray)
- [ ] Keyboard updates with letter states
- [ ] Duplicate letters handled correctly
- [ ] Win detected on correct guess
- [ ] Loss detected after 6 wrong guesses
- [ ] Win streak tracked
- [ ] All celebration effects work
- [ ] New game resets properly
- [ ] Leaderboard submission works
- [ ] Mobile layout responsive

---

**IMPORTANT**: The tile flip animation is the heart of Wordle's appeal. Each tile should flip individually with a satisfying delay. The suspense of watching each letter reveal creates tension. Winning should feel INCREDIBLE with effects matching how impressive the win was (1 guess = GOD MODE effects).
