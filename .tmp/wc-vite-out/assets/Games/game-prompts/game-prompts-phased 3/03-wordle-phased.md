# Orange Wordle Game - Phased Build Guide

> **Game ID**: `orange-wordle`
> **Rendering**: DOM/CSS (no Canvas needed)
> **Complexity**: Medium
> **Prerequisites**: Run `00-MASTER-INDEX.md` setup first

---

## PHASE 1: Component Structure & Grid Setup

### Prompt for Claude Code:

```
Create the Orange Wordle game component structure for wojak.ink.

GAME OVERVIEW:
- 5-letter word guessing game (citrus/orange themed words)
- 6 attempts to guess the word
- Tile flip animations reveal letter states
- Virtual keyboard for mobile

REQUIREMENTS:
1. Create file: src/games/OrangeWordle/OrangeWordleGame.tsx
2. Use TypeScript with proper interfaces
3. Orange theme (#ff6b00 primary)

INTERFACES NEEDED:
interface Letter {
  char: string;
  state: 'empty' | 'tbd' | 'correct' | 'present' | 'absent';
}

interface GameState {
  board: Letter[][];      // 6 rows x 5 columns
  currentRow: number;
  currentCol: number;
  targetWord: string;
  gameStatus: 'playing' | 'won' | 'lost';
  usedLetters: Record<string, 'correct' | 'present' | 'absent'>;
}

WORD LIST (citrus/orange themed):
const WORD_LIST = [
  'JUICE', 'ZESTY', 'SWEET', 'TANGY', 'RIPER',
  'GROVE', 'PULLY', 'WEDGE', 'SLICE', 'PEELS',
  'FRUIT', 'RINDS', 'SEEDS', 'VITAL', 'FRESH',
  'SUNNY', 'TANGO', 'BLOOD', 'NAVEL', 'CITRO',
  'LEMON', 'MELON', 'MANGO', 'JUICY', 'BLEND',
  'PRESS', 'TREES', 'LEAFY', 'DRINK', 'PULPS',
  // Add more 5-letter words
];

// Also need a valid words list for validation
// Can use a subset or API for checking

INITIAL STATE:
- 6 rows of 5 empty letters
- currentRow: 0
- currentCol: 0
- Random target word from WORD_LIST

GRID LAYOUT:
const ROWS = 6;
const COLS = 5;

const [board, setBoard] = useState<Letter[][]>(() =>
  Array(ROWS).fill(null).map(() =>
    Array(COLS).fill(null).map(() => ({ char: '', state: 'empty' }))
  )
);

COMPONENT STRUCTURE:
const OrangeWordleGame: React.FC = () => {
  const isMobile = useIsMobile();

  const [board, setBoard] = useState<Letter[][]>([...]);
  const [currentRow, setCurrentRow] = useState(0);
  const [currentCol, setCurrentCol] = useState(0);
  const [targetWord, setTargetWord] = useState('');
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [usedLetters, setUsedLetters] = useState<Record<string, string>>({});

  useEffect(() => {
    // Pick random word on mount
    const word = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
    setTargetWord(word);
  }, []);

  return (
    <div className="wordle-container">
      <h1>🍊 Orange Wordle</h1>

      {/* Game Board */}
      <div className="wordle-board">
        {board.map((row, rowIdx) => (
          <div key={rowIdx} className="wordle-row">
            {row.map((letter, colIdx) => (
              <div
                key={colIdx}
                className={`wordle-tile ${letter.state}`}
              >
                {letter.char}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Virtual Keyboard */}
      <Keyboard
        onKeyPress={handleKeyPress}
        usedLetters={usedLetters}
      />

      {/* Game Status Messages */}
      {gameStatus !== 'playing' && (
        <GameOverModal
          won={gameStatus === 'won'}
          targetWord={targetWord}
          attempts={currentRow}
          onPlayAgain={resetGame}
        />
      )}
    </div>
  );
};

TILE STYLING:
.wordle-tile {
  width: 58px;
  height: 58px;
  border: 2px solid #3a3a3c;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: bold;
  text-transform: uppercase;
  margin: 2px;
  background: transparent;
  color: white;
}

.wordle-tile.tbd {
  border-color: #565758;
}

.wordle-tile.correct {
  background: #ff6b00; /* Orange for correct! */
  border-color: #ff6b00;
}

.wordle-tile.present {
  background: #b59f3b; /* Yellow-ish for present */
  border-color: #b59f3b;
}

.wordle-tile.absent {
  background: #3a3a3c;
  border-color: #3a3a3c;
}

VIRTUAL KEYBOARD COMPONENT (basic structure):
const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
];

interface KeyboardProps {
  onKeyPress: (key: string) => void;
  usedLetters: Record<string, string>;
}

DO NOT implement input handling or game logic yet - just render the grid and keyboard.
```

### ✅ Phase 1 Checkpoint

**Test these manually:**
- [ ] 6x5 grid renders with empty tiles
- [ ] Virtual keyboard renders below grid
- [ ] Keyboard has all letters plus ENTER and backspace
- [ ] Tiles have correct initial styling (borders visible)
- [ ] Layout is centered and responsive
- [ ] Random target word is selected (check console.log)
- [ ] Title displays with orange emoji

**Debug Prompt if issues:**
```
The Wordle grid isn't rendering correctly. Issues: [describe]

Check:
1. Is the board state initialized with 6 rows of 5 letters?
2. Are you using nested map() for rows then columns?
3. Is the CSS grid/flexbox set up correctly for the rows?
4. Are keys unique (using rowIdx and colIdx)?

Show me the board state initialization and the render logic.
```

---

## PHASE 2: Input Handling & Letter Entry

### Prompt for Claude Code:

```
Add keyboard input handling to Orange Wordle.

CURRENT STATE: Grid and virtual keyboard render, but no input works.

INPUT HANDLING:

1. PHYSICAL KEYBOARD (Desktop):
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (gameStatus !== 'playing') return;

    const key = e.key.toUpperCase();

    if (key === 'ENTER') {
      submitGuess();
    } else if (key === 'BACKSPACE' || key === 'DELETE') {
      deleteLetter();
    } else if (/^[A-Z]$/.test(key)) {
      addLetter(key);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [gameStatus, currentRow, currentCol]);

2. VIRTUAL KEYBOARD (Mobile):
const handleKeyPress = (key: string) => {
  if (gameStatus !== 'playing') return;

  if (key === 'ENTER') {
    submitGuess();
  } else if (key === '⌫' || key === 'BACKSPACE') {
    deleteLetter();
  } else {
    addLetter(key);
  }
};

LETTER MANAGEMENT:

const addLetter = (letter: string) => {
  if (currentCol >= 5) return; // Row full

  setBoard(prev => {
    const newBoard = prev.map(row => row.map(l => ({ ...l })));
    newBoard[currentRow][currentCol] = {
      char: letter,
      state: 'tbd' // Typed but not submitted
    };
    return newBoard;
  });

  setCurrentCol(prev => prev + 1);
};

const deleteLetter = () => {
  if (currentCol <= 0) return; // Row empty

  setBoard(prev => {
    const newBoard = prev.map(row => row.map(l => ({ ...l })));
    newBoard[currentRow][currentCol - 1] = {
      char: '',
      state: 'empty'
    };
    return newBoard;
  });

  setCurrentCol(prev => prev - 1);
};

TILE ANIMATION ON INPUT:
When a letter is typed, add a quick pop animation:

.wordle-tile.pop {
  animation: tile-pop 100ms ease-out;
}

@keyframes tile-pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

// Track which tile just changed for animation
const [lastTyped, setLastTyped] = useState<{row: number, col: number} | null>(null);

// In addLetter:
setLastTyped({ row: currentRow, col: currentCol });
setTimeout(() => setLastTyped(null), 100);

// In render:
<div
  className={`wordle-tile ${letter.state} ${
    lastTyped?.row === rowIdx && lastTyped?.col === colIdx ? 'pop' : ''
  }`}
>

VIRTUAL KEYBOARD UPDATES:
const Keyboard: React.FC<KeyboardProps> = ({ onKeyPress, usedLetters }) => {
  const getKeyClass = (key: string) => {
    if (key === 'ENTER' || key === '⌫') return 'key-wide';
    const state = usedLetters[key];
    if (state) return `key-${state}`;
    return '';
  };

  return (
    <div className="keyboard">
      {KEYBOARD_ROWS.map((row, rowIdx) => (
        <div key={rowIdx} className="keyboard-row">
          {row.map(key => (
            <button
              key={key}
              className={`key ${getKeyClass(key)}`}
              onClick={() => onKeyPress(key)}
            >
              {key}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};

KEYBOARD STYLING:
.key {
  background: #818384;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 16px 12px;
  margin: 3px;
  font-weight: bold;
  cursor: pointer;
  min-width: 40px;
}

.key-wide {
  min-width: 65px;
  font-size: 12px;
}

.key-correct {
  background: #ff6b00;
}

.key-present {
  background: #b59f3b;
}

.key-absent {
  background: #3a3a3c;
}

DO NOT implement guess validation/submission yet - just letter entry and deletion.
```

### ✅ Phase 2 Checkpoint

**Test these manually:**
- [ ] Physical keyboard types letters into current row
- [ ] Virtual keyboard types letters when tapped
- [ ] Can't type more than 5 letters per row
- [ ] Backspace/delete removes last letter
- [ ] Can't delete when row is empty
- [ ] Tile border changes when letter is typed
- [ ] Pop animation plays on letter entry
- [ ] ENTER key doesn't do anything yet (expected)

**Debug Prompt if issues:**
```
Keyboard input isn't working correctly in Wordle.

Issue: [describe - e.g., "letters appear in wrong tile" or "can type 6+ letters"]

Check:
1. Is currentCol being updated after addLetter?
2. Is the boundary check (currentCol >= 5) before adding?
3. Are you spreading the board array correctly to avoid mutation?
4. Is the keydown listener being added/removed properly?

Log: console.log('addLetter', letter, currentRow, currentCol);
Show me the addLetter and deleteLetter functions.
```

---

## PHASE 3: Guess Validation & Tile Flip Animation

### Prompt for Claude Code:

```
Add guess submission, validation, and tile flip animations to Wordle.

CURRENT STATE: Can type letters, need to validate guesses.

GUESS SUBMISSION LOGIC:

const submitGuess = () => {
  // Must have 5 letters
  if (currentCol !== 5) {
    showToast('Not enough letters');
    shakeRow(currentRow);
    return;
  }

  const guess = board[currentRow].map(l => l.char).join('');

  // Check if valid word (optional: can skip for MVP)
  // if (!isValidWord(guess)) {
  //   showToast('Not in word list');
  //   shakeRow(currentRow);
  //   return;
  // }

  // Evaluate the guess
  const result = evaluateGuess(guess, targetWord);

  // Animate tiles flipping, then update state
  animateReveal(currentRow, result);
};

EVALUATE GUESS FUNCTION:
const evaluateGuess = (guess: string, target: string): Letter['state'][] => {
  const result: Letter['state'][] = Array(5).fill('absent');
  const targetChars = target.split('');
  const guessChars = guess.split('');

  // Track which target letters have been "used"
  const used = Array(5).fill(false);

  // First pass: mark correct letters (exact position)
  for (let i = 0; i < 5; i++) {
    if (guessChars[i] === targetChars[i]) {
      result[i] = 'correct';
      used[i] = true;
    }
  }

  // Second pass: mark present letters (wrong position)
  for (let i = 0; i < 5; i++) {
    if (result[i] === 'correct') continue;

    for (let j = 0; j < 5; j++) {
      if (!used[j] && guessChars[i] === targetChars[j]) {
        result[i] = 'present';
        used[j] = true;
        break;
      }
    }
  }

  return result;
};

TILE FLIP ANIMATION:
Each tile flips to reveal its state with staggered timing.

CSS:
.wordle-tile {
  transition: transform 0.3s;
  transform-style: preserve-3d;
}

.wordle-tile.flip {
  animation: tile-flip 0.6s ease forwards;
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

ANIMATION SEQUENCING:
const animateReveal = (row: number, result: Letter['state'][]) => {
  // Flip tiles one by one with 300ms delay each
  result.forEach((state, col) => {
    setTimeout(() => {
      setBoard(prev => {
        const newBoard = prev.map(r => r.map(l => ({ ...l })));
        newBoard[row][col].state = state;
        return newBoard;
      });

      // Update keyboard after each reveal
      const letter = board[row][col].char;
      updateUsedLetters(letter, state);

    }, col * 300); // 0ms, 300ms, 600ms, 900ms, 1200ms
  });

  // After all tiles revealed, check win/lose
  setTimeout(() => {
    checkGameEnd(result);
  }, 5 * 300 + 100);
};

UPDATE KEYBOARD COLORS:
const updateUsedLetters = (letter: string, state: Letter['state']) => {
  setUsedLetters(prev => {
    // Don't downgrade: correct > present > absent
    if (prev[letter] === 'correct') return prev;
    if (prev[letter] === 'present' && state === 'absent') return prev;
    return { ...prev, [letter]: state };
  });
};

CHECK WIN/LOSE:
const checkGameEnd = (result: Letter['state'][]) => {
  const isWin = result.every(state => state === 'correct');

  if (isWin) {
    setGameStatus('won');
  } else if (currentRow >= 5) {
    setGameStatus('lost');
  } else {
    // Move to next row
    setCurrentRow(prev => prev + 1);
    setCurrentCol(0);
  }
};

ROW SHAKE (for invalid input):
const [shakingRow, setShakingRow] = useState<number | null>(null);

const shakeRow = (row: number) => {
  setShakingRow(row);
  setTimeout(() => setShakingRow(null), 500);
};

// In render:
<div className={`wordle-row ${shakingRow === rowIdx ? 'shake' : ''}`}>

.wordle-row.shake {
  animation: row-shake 0.5s ease;
}

@keyframes row-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-10px); }
  40% { transform: translateX(10px); }
  60% { transform: translateX(-10px); }
  80% { transform: translateX(10px); }
}

TOAST NOTIFICATIONS:
const [toast, setToast] = useState<string | null>(null);

const showToast = (message: string) => {
  setToast(message);
  setTimeout(() => setToast(null), 2000);
};

{toast && <div className="toast">{toast}</div>}

.toast {
  position: absolute;
  top: 80px;
  background: white;
  color: black;
  padding: 12px 24px;
  border-radius: 4px;
  font-weight: bold;
}
```

### ✅ Phase 3 Checkpoint

**Test these manually:**
- [ ] Pressing ENTER with <5 letters shows "Not enough letters"
- [ ] Row shakes when submitting invalid guess
- [ ] After valid guess, tiles flip one by one
- [ ] Correct letters turn orange (#ff6b00)
- [ ] Present letters turn yellow/gold
- [ ] Absent letters turn gray
- [ ] Keyboard keys update colors after reveal
- [ ] Move to next row after reveal animation
- [ ] Win detected when all 5 tiles are correct
- [ ] Lose detected after 6 failed guesses

**Debug Prompt if issues:**
```
The Wordle evaluation/animation isn't working correctly.

Issue: [describe - e.g., "wrong letters marked correct" or "flip animation not showing"]

For evaluation issues:
1. Are you handling duplicate letters correctly? (e.g., target "APPLE", guess "PAPAL")
2. Is the first pass finding exact matches BEFORE the second pass?
3. Is the "used" array preventing double-counting?

For animation issues:
1. Is the state update happening at the right point in the flip (50%)?
2. Are the timeouts staggered correctly (col * 300)?
3. Is the CSS animation applied when state changes?

Log: console.log('Guess:', guess, 'Target:', targetWord, 'Result:', result);
```

---

## PHASE 4: Win/Lose States & Visual Effects

### Prompt for Claude Code:

```
Add win/lose states, celebrations, and visual effects to Wordle.

CURRENT STATE: Game logic works, needs proper end game handling.

WIN STATE:

When the user wins:
1. Show victory message based on attempt count
2. Trigger celebration effects
3. Tiles do a wave animation

const WIN_MESSAGES = [
  'Genius!',     // 1 guess
  'Magnificent!', // 2 guesses
  'Impressive!', // 3 guesses
  'Splendid!',   // 4 guesses
  'Great!',      // 5 guesses
  'Phew!',       // 6 guesses
];

// On win:
if (isWin) {
  const message = WIN_MESSAGES[currentRow] || 'You Won!';
  showToast(message);
  triggerWinAnimation();
  triggerConfetti();
  setGameStatus('won');
}

WIN TILE ANIMATION (bounce/wave):
.wordle-tile.win {
  animation: tile-win 0.5s ease forwards;
}

@keyframes tile-win {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

const triggerWinAnimation = () => {
  // Stagger the bounce for each tile in winning row
  for (let col = 0; col < 5; col++) {
    setTimeout(() => {
      // Add 'win' class to tile
      // Remove after animation
    }, col * 100);
  }
};

LOSE STATE:
When user loses:
1. Reveal the target word
2. Show "The word was: XXXXX"
3. Subtle shake or red flash

// On lose:
if (currentRow >= 5 && !isWin) {
  showToast(`The word was: ${targetWord}`);
  setGameStatus('lost');
}

GAME OVER MODAL:
const GameOverModal: React.FC<{
  won: boolean;
  targetWord: string;
  attempts: number;
  onPlayAgain: () => void;
  onShare: () => void;
}> = ({ won, targetWord, attempts, onPlayAgain, onShare }) => (
  <div className="modal-overlay">
    <div className="modal-content">
      <h2>{won ? '🍊 Victory!' : '😔 Game Over'}</h2>
      {won ? (
        <p>You got it in {attempts + 1} {attempts === 0 ? 'try' : 'tries'}!</p>
      ) : (
        <p>The word was: <strong>{targetWord}</strong></p>
      )}
      <div className="modal-buttons">
        <button onClick={onPlayAgain}>Play Again</button>
        <button onClick={onShare}>Share Result</button>
      </div>
    </div>
  </div>
);

SHARE FUNCTIONALITY:
Generate shareable grid like original Wordle:

const generateShareText = () => {
  const title = `🍊 Orange Wordle`;
  const score = gameStatus === 'won' ? currentRow + 1 : 'X';
  const grid = board.slice(0, currentRow + 1).map(row =>
    row.map(tile => {
      if (tile.state === 'correct') return '🟧'; // Orange for correct
      if (tile.state === 'present') return '🟨';
      return '⬛';
    }).join('')
  ).join('\n');

  return `${title} ${score}/6\n\n${grid}`;
};

const handleShare = async () => {
  const text = generateShareText();

  if (navigator.share) {
    await navigator.share({ text });
  } else {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!');
  }
};

CONFETTI EFFECT:
// Simple confetti using divs
const [confetti, setConfetti] = useState<{id: number, x: number, color: string}[]>([]);

const triggerConfetti = () => {
  const pieces = Array(50).fill(null).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: ['#ff6b00', '#ffa500', '#ffcc00', '#fff'][Math.floor(Math.random() * 4)]
  }));
  setConfetti(pieces);
  setTimeout(() => setConfetti([]), 3000);
};

{confetti.length > 0 && (
  <div className="confetti-container">
    {confetti.map(piece => (
      <div
        key={piece.id}
        className="confetti-piece"
        style={{
          left: `${piece.x}%`,
          backgroundColor: piece.color,
          animationDelay: `${Math.random() * 0.5}s`
        }}
      />
    ))}
  </div>
)}

.confetti-piece {
  position: absolute;
  width: 10px;
  height: 10px;
  top: -20px;
  animation: confetti-fall 3s ease-out forwards;
}

@keyframes confetti-fall {
  to {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
}

STATISTICS TRACKING (optional):
Track games played, win rate, streak, etc. in localStorage.

interface Stats {
  gamesPlayed: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: number[]; // Index 0-5 for 1-6 guesses
}

RESET GAME:
const resetGame = () => {
  const newWord = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
  setTargetWord(newWord);
  setBoard(Array(6).fill(null).map(() =>
    Array(5).fill(null).map(() => ({ char: '', state: 'empty' as const }))
  ));
  setCurrentRow(0);
  setCurrentCol(0);
  setGameStatus('playing');
  setUsedLetters({});
};
```

### ✅ Phase 4 Checkpoint

**Test these manually:**
- [ ] Win shows appropriate message based on attempts
- [ ] Win triggers tile bounce animation
- [ ] Confetti appears on win
- [ ] Lose reveals the target word
- [ ] Game over modal appears with results
- [ ] "Play Again" resets everything
- [ ] Share generates correct emoji grid
- [ ] Share copies to clipboard (or native share)
- [ ] 🟧 is used for correct (not green)
- [ ] Statistics update after each game (if implemented)

**Debug Prompt if issues:**
```
The Wordle win/lose state or effects aren't working.

Issue: [describe - e.g., "confetti not appearing" or "wrong win message"]

For win/lose detection:
1. Is checkGameEnd called AFTER animations complete?
2. Is currentRow 0-indexed (so row 5 = 6th attempt)?
3. Is gameStatus being set correctly?

For effects:
1. Is confetti container positioned absolute/fixed?
2. Are animation keyframes defined?
3. Is the win class being added to tiles?

Show me the checkGameEnd function and the win animation trigger.
```

---

## PHASE 5: Audio, Leaderboard & Polish

### Prompt for Claude Code:

```
Add Howler.js audio, leaderboard, and final polish to Orange Wordle.

CURRENT STATE: Full game works, needs audio and leaderboard.

AUDIO INTEGRATION:

Sound effects needed:
- Tile type: quick click sound
- Tile delete: softer click
- Row submit: whoosh sound
- Tile reveal: flip sound (play staggered)
- Correct letter: bright ding
- Wrong letter: subtle thud
- Win: celebration fanfare
- Lose: sad sound

const {
  playClick,        // Letter typed
  playDelete,       // Letter deleted
  playFlip,         // Tile flipping
  playCorrect,      // Correct letter revealed
  playWrong,        // Wrong letter revealed
  playWinSound,
  playLoseSound,
  setMuted
} = useHowlerSounds();

// In addLetter:
playClick();

// In deleteLetter:
playDelete();

// In animateReveal:
setTimeout(() => {
  playFlip();
  // ... update state ...
  if (state === 'correct') playCorrect();
}, col * 300);

// On win:
playWinSound();

// On lose:
playLoseSound();

LEADERBOARD INTEGRATION:

For Wordle, leaderboard can track:
- Fastest solve time
- Best average guesses
- Longest streak
- Games won

import { useLeaderboard } from '../../hooks/useLeaderboard';

const { submitScore, getTopScores } = useLeaderboard('orange-wordle');

// Score calculation: lower is better
// Could be: (attempts * 1000) + timeInSeconds
// Or just track wins by attempt count

const calculateScore = () => {
  if (gameStatus !== 'won') return 0;
  // Reward fewer guesses (1 guess = 6000, 6 guesses = 1000)
  const guessScore = (7 - (currentRow + 1)) * 1000;
  return guessScore;
};

const handleSubmitScore = async () => {
  const score = calculateScore();
  if (score > 0) {
    await submitScore(score);
  }
};

DAILY CHALLENGE MODE (optional):
Use the date to seed the word:

const getDailyWord = () => {
  const today = new Date().toISOString().split('T')[0];
  const hash = hashString(today);
  return WORD_LIST[hash % WORD_LIST.length];
};

const hashString = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
};

HARD MODE (optional toggle):
- Any revealed hints MUST be used in subsequent guesses
- Green letters must stay in position
- Yellow letters must be included

MOBILE POLISH:

1. Keyboard sizing:
- Larger keys on mobile for easier tapping
- Responsive key sizing based on screen width

2. Prevent zoom on input:
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">

3. Touch feedback:
.key:active {
  transform: scale(0.95);
  opacity: 0.8;
}

4. Safe area for notched phones:
.wordle-container {
  padding-bottom: env(safe-area-inset-bottom);
}

FINAL POLISH:

1. Help modal explaining the game
2. Settings: toggle sounds, toggle hard mode
3. Color blind mode (use shapes or different colors)
4. Keyboard layout options (QWERTY vs alphabetical)

ACCESSIBILITY:
- aria-label on tiles: "Row 1, Column 1, Letter A, Correct"
- Screen reader announcements for reveals
- High contrast mode option

PERSISTENCE:
// Save current game state
useEffect(() => {
  localStorage.setItem('wordle-state', JSON.stringify({
    board,
    currentRow,
    currentCol,
    targetWord,
    gameStatus,
    usedLetters
  }));
}, [board, currentRow, currentCol, gameStatus]);

// Load on mount
useEffect(() => {
  const saved = localStorage.getItem('wordle-state');
  if (saved) {
    const state = JSON.parse(saved);
    // Restore state...
  }
}, []);
```

### ✅ Phase 5 Final Checklist

**Audio:**
- [ ] Click sound on letter type
- [ ] Delete sound on backspace
- [ ] Flip sound staggered during reveal
- [ ] Win fanfare plays
- [ ] Lose sound plays
- [ ] Mute toggle works
- [ ] Audio works on iOS (user interaction unlock)

**Leaderboard:**
- [ ] Score calculated correctly (fewer guesses = higher score)
- [ ] Score submits on win
- [ ] Leaderboard displays top players
- [ ] User's rank shown after submission

**Polish:**
- [ ] Game state persists on refresh
- [ ] Mobile keyboard sized appropriately
- [ ] No zoom on double-tap
- [ ] Responsive on all screen sizes
- [ ] Help/instructions available
- [ ] Share works on mobile native share

**Debug Prompt if audio issues:**
```
Audio isn't working correctly in Wordle.

Issue: [describe - e.g., "flip sounds not staggered" or "no sound on iOS"]

For staggered sounds:
1. Is playFlip() called inside the setTimeout with correct delay?
2. Are multiple Howl instances being created or reused?

For iOS:
1. Has user interacted with the page first?
2. Is Howler.ctx?.resume() being called on first tap?

Show me where sounds are triggered and the useHowlerSounds implementation.
```

---

## Complete File Structure

```
src/games/OrangeWordle/
├── OrangeWordleGame.tsx    # Main component
├── OrangeWordleGame.css    # Styles
├── Keyboard.tsx            # Virtual keyboard component
├── GameOverModal.tsx       # End game modal
├── types.ts                # TypeScript interfaces
├── wordList.ts             # Word lists
└── utils.ts                # evaluateGuess, generateShare, etc.

public/assets/sounds/
├── click.mp3
├── delete.mp3
├── flip.mp3
├── correct.mp3
├── wrong.mp3
├── wordle-win.mp3
└── wordle-lose.mp3
```

---

## Word List Reference

```typescript
// wordList.ts
export const ANSWER_WORDS = [
  // Citrus/Orange themed (curated list)
  'JUICE', 'ZESTY', 'SWEET', 'TANGY', 'RIPER',
  'GROVE', 'PULPY', 'WEDGE', 'SLICE', 'PEELS',
  'FRUIT', 'RINDS', 'SEEDS', 'VITAL', 'FRESH',
  'SUNNY', 'TANGO', 'BLOOD', 'NAVEL', 'LEMON',
  'MELON', 'MANGO', 'JUICY', 'BLEND', 'PRESS',
  'TREES', 'LEAFY', 'DRINK', 'PULPS', 'ACIDS',
  'BLEND', 'SHARP', 'TANGS', 'BURST', 'PICKY',
  // Add more for variety...
];

// Optional: larger list for validation
export const VALID_WORDS = [
  ...ANSWER_WORDS,
  // Common 5-letter words for valid guesses
  'ABOUT', 'ABOVE', 'ABUSE', 'ACTOR', 'ACUTE',
  // ... extensive list ...
];
```
