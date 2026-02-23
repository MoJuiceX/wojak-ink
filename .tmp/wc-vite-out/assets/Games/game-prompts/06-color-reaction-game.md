# Claude Code Prompt: Color Reaction Game

## Overview
Build a color matching reaction/reflex game for wojak.ink. Players tap when their indicator color matches the target color. Score is based on reaction time speed. Simple DOM/CSS implementation (no Canvas needed).

---

## TECH STACK & ARCHITECTURE

```
Framework: React + TypeScript + Ionic Framework
Rendering: Pure DOM/CSS (no Canvas)
Animation: CSS animations + React state
Timing: performance.now() for high-precision
Styling: CSS file (ColorReaction.css)
Sound: useGameSounds() hook
Leaderboard: useLeaderboard('color-reaction') hook
Mobile Detection: useIsMobile() hook
```

**File Structure:**
```
src/pages/ColorReaction.tsx        # Main game component
src/pages/ColorReaction.css        # All styles + effects
src/components/media/games/GameModal.tsx  # Add lazy import
src/config/query/queryKeys.ts      # Add 'color-reaction' to GameId type
```

---

## GAME SPECIFICATIONS

### Colors (4 colors, fruit-themed)
```typescript
const COLORS = [
  { name: 'orange', hex: '#FF6B00', emoji: '🍊' },
  { name: 'lime',   hex: '#32CD32', emoji: '🍋' },
  { name: 'grape', hex: '#8B5CF6', emoji: '🍇' },
  { name: 'berry',  hex: '#3B82F6', emoji: '🫐' },
];
```

### Gameplay
- Target color displays prominently
- Player indicator cycles through colors OR stays fixed
- Player taps when their indicator matches target
- Score based on reaction time
- Miss penalty: -50 points + break streak
- 3 misses = game over

### Timing
- Target color changes at random intervals: 0.8 - 2.5 seconds
- Unpredictability is key to difficulty

### Scoring (Based on Reaction Time)
```typescript
const calculateScore = (reactionTimeMs: number): { points: number; rating: string } => {
  if (reactionTimeMs < 200) return { points: 100, rating: 'PERFECT' };
  if (reactionTimeMs < 300) return { points: 75, rating: 'GREAT' };
  if (reactionTimeMs < 400) return { points: 50, rating: 'GOOD' };
  if (reactionTimeMs < 600) return { points: 25, rating: 'OK' };
  return { points: 10, rating: 'SLOW' };
};
```

### Leaderboard Metrics
- **Primary**: High score (total points)
- **Secondary**: Best reaction time (ms)

---

## COMPONENT STRUCTURE

```typescript
interface GameState {
  status: 'idle' | 'playing' | 'gameover';
  targetColor: number; // Index into COLORS array
  playerColor: number;
  score: number;
  streak: number;
  misses: number;
  bestReactionTime: number;
  roundStartTime: number | null; // When target color changed
  isMatchWindow: boolean; // True when colors match and player can tap
}

const ColorReaction: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    status: 'idle',
    targetColor: 0,
    playerColor: 1,
    score: 0,
    streak: 0,
    misses: 0,
    bestReactionTime: Infinity,
    roundStartTime: null,
    isMatchWindow: false
  });

  const [feedback, setFeedback] = useState<{
    type: 'correct' | 'wrong' | 'miss' | null;
    text: string;
    reactionTime?: number;
  }>({ type: null, text: '' });

  const roundTimeoutRef = useRef<NodeJS.Timeout>();
  const matchTimeoutRef = useRef<NodeJS.Timeout>();

  // ... implementation
};
```

---

## CORE GAME LOGIC

### Start Game
```typescript
const startGame = () => {
  setGameState({
    status: 'playing',
    targetColor: Math.floor(Math.random() * COLORS.length),
    playerColor: Math.floor(Math.random() * COLORS.length),
    score: 0,
    streak: 0,
    misses: 0,
    bestReactionTime: Infinity,
    roundStartTime: null,
    isMatchWindow: false
  });

  startNewRound();
};
```

### Round Management
```typescript
const startNewRound = () => {
  // Clear existing timers
  if (roundTimeoutRef.current) clearTimeout(roundTimeoutRef.current);
  if (matchTimeoutRef.current) clearTimeout(matchTimeoutRef.current);

  // Random delay before changing target color
  const delay = 800 + Math.random() * 1700; // 0.8 - 2.5 seconds

  roundTimeoutRef.current = setTimeout(() => {
    // Change to a NEW color (not the same)
    let newTargetColor: number;
    do {
      newTargetColor = Math.floor(Math.random() * COLORS.length);
    } while (newTargetColor === gameState.playerColor);

    // 50% chance the new target matches player color (creates match opportunity)
    if (Math.random() < 0.5) {
      newTargetColor = gameState.playerColor;
    }

    setGameState(prev => ({
      ...prev,
      targetColor: newTargetColor,
      roundStartTime: performance.now(),
      isMatchWindow: newTargetColor === prev.playerColor
    }));

    // If colors match, start timeout for miss
    if (newTargetColor === gameState.playerColor) {
      matchTimeoutRef.current = setTimeout(() => {
        handleMiss();
      }, 1500); // 1.5 second window to tap
    } else {
      // Start next round after a brief pause
      startNewRound();
    }
  }, delay);
};

const handleMiss = () => {
  const newMisses = gameState.misses + 1;

  setFeedback({ type: 'miss', text: 'MISSED!' });
  setTimeout(() => setFeedback({ type: null, text: '' }), 500);

  playGameOver(); // Miss sound

  if (newMisses >= 3) {
    handleGameOver();
  } else {
    setGameState(prev => ({
      ...prev,
      misses: newMisses,
      streak: 0,
      isMatchWindow: false
    }));
    startNewRound();
  }
};
```

### Tap Handler
```typescript
const handleTap = () => {
  if (gameState.status !== 'playing') return;

  // Clear match timeout
  if (matchTimeoutRef.current) clearTimeout(matchTimeoutRef.current);

  // Check if colors match
  if (gameState.targetColor === gameState.playerColor && gameState.isMatchWindow) {
    // CORRECT TAP!
    const reactionTime = performance.now() - gameState.roundStartTime!;
    const { points, rating } = calculateScore(reactionTime);

    // Update best reaction time
    const newBestTime = Math.min(gameState.bestReactionTime, reactionTime);

    // Update streak
    const newStreak = gameState.streak + 1;

    // Streak bonus
    let streakBonus = 0;
    if (newStreak >= 5) streakBonus = 50;
    if (newStreak >= 10) streakBonus = 100;
    if (newStreak >= 20) streakBonus = 200;

    const totalPoints = points + streakBonus;

    setGameState(prev => ({
      ...prev,
      score: prev.score + totalPoints,
      streak: newStreak,
      bestReactionTime: newBestTime,
      isMatchWindow: false
    }));

    // Show feedback
    setFeedback({
      type: 'correct',
      text: rating + (streakBonus > 0 ? ` +${streakBonus} STREAK!` : ''),
      reactionTime: Math.round(reactionTime)
    });

    // Trigger effects
    onCorrectTap(rating, newStreak, reactionTime);

    setTimeout(() => setFeedback({ type: null, text: '' }), 800);

    // Generate new player color and start next round
    const newPlayerColor = Math.floor(Math.random() * COLORS.length);
    setGameState(prev => ({ ...prev, playerColor: newPlayerColor }));
    startNewRound();

  } else {
    // WRONG TAP!
    const newMisses = gameState.misses + 1;

    setFeedback({ type: 'wrong', text: 'WRONG!' });
    setTimeout(() => setFeedback({ type: null, text: '' }), 500);

    setGameState(prev => ({
      ...prev,
      score: Math.max(0, prev.score - 50),
      streak: 0,
      misses: newMisses
    }));

    playBlockLand(); // Error sound
    triggerScreenShake();

    if (newMisses >= 3) {
      handleGameOver();
    }
  }
};
```

---

## EXTREME EFFECTS PHILOSOPHY

### Correct Tap Effects
```typescript
const onCorrectTap = (rating: string, streak: number, reactionTime: number) => {
  // PRIMARY: Visual feedback (handled by feedback state)
  playBlockLand();

  // SECONDARY: Based on rating
  if (rating === 'PERFECT') {
    triggerScreenShake(100);
    spawnFloatingEmojis(['⚡', '🔥']);
    showEpicCallout('PERFECT!');
    playPerfectBonus();
  } else if (rating === 'GREAT') {
    triggerScreenShake(50);
    spawnFloatingEmojis(['✨']);
  }

  // TERTIARY: Streak milestones
  if (streak === 5) {
    showEpicCallout('5 STREAK!');
    playCombo();
  }
  if (streak === 10) {
    showEpicCallout('🔥 10 STREAK! 🔥');
    triggerConfetti();
    playCombo();
  }
  if (streak === 20) {
    showEpicCallout('⚡ UNSTOPPABLE! ⚡');
    triggerLightning();
    flashVignette();
  }
  if (streak === 30) {
    showEpicCallout('👑 GOD MODE! 👑');
    triggerFullChaos();
    playWinSound();
  }

  // Super fast reaction bonus
  if (reactionTime < 150) {
    showEpicCallout('LIGHTNING FAST!');
    triggerLightning();
  }
};
```

---

## UI LAYOUT

```tsx
<IonPage>
  <IonContent>
    <div
      className={`color-reaction-container ${screenShake ? 'shaking' : ''}`}
      onClick={handleTap}
      onTouchStart={(e) => { e.preventDefault(); handleTap(); }}
    >
      {/* Score & Stats */}
      <div className="stats-panel">
        <div className="score">Score: {gameState.score}</div>
        <div className="streak">Streak: {gameState.streak}</div>
        <div className="misses">
          {Array(3).fill(null).map((_, i) => (
            <span key={i} className={i < gameState.misses ? 'miss-used' : 'miss-available'}>
              ❤️
            </span>
          ))}
        </div>
      </div>

      {/* Target Color */}
      <div className="target-section">
        <div className="label">MATCH THIS COLOR</div>
        <div
          className="target-display"
          style={{ backgroundColor: COLORS[gameState.targetColor].hex }}
        >
          <span className="emoji">{COLORS[gameState.targetColor].emoji}</span>
        </div>
      </div>

      {/* Player Indicator */}
      <div className="player-section">
        <div className="label">YOUR COLOR</div>
        <div
          className={`player-display ${gameState.isMatchWindow ? 'matching' : ''}`}
          style={{ backgroundColor: COLORS[gameState.playerColor].hex }}
        >
          <span className="emoji">{COLORS[gameState.playerColor].emoji}</span>
        </div>
      </div>

      {/* Tap Area */}
      <div className="tap-area">
        <div className="tap-instruction">
          {gameState.isMatchWindow ? 'TAP NOW!' : 'Wait for match...'}
        </div>
      </div>

      {/* Feedback Overlay */}
      {feedback.type && (
        <div className={`feedback-overlay ${feedback.type}`}>
          <div className="feedback-text">{feedback.text}</div>
          {feedback.reactionTime && (
            <div className="reaction-time">{feedback.reactionTime}ms</div>
          )}
        </div>
      )}

      {/* Game Over Overlay */}
      {gameState.status === 'gameover' && (
        <div className="gameover-overlay">
          <h2>GAME OVER</h2>
          <div className="final-score">{gameState.score}</div>
          <div className="best-time">Best: {Math.round(gameState.bestReactionTime)}ms</div>
          <button onClick={startGame}>Play Again</button>
        </div>
      )}
    </div>
  </IonContent>
</IonPage>
```

---

## CSS STYLING

```css
.color-reaction-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 20px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  user-select: none;
  cursor: pointer;
}

/* Target & Player displays */
.target-display,
.player-display {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
}

.target-display {
  border: 4px solid rgba(255, 255, 255, 0.3);
}

.player-display.matching {
  animation: pulse-match 0.5s ease-in-out infinite;
  box-shadow: 0 0 40px currentColor;
}

@keyframes pulse-match {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.emoji {
  font-size: 48px;
}

/* Labels */
.label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 15px;
}

/* Tap area */
.tap-area {
  padding: 30px;
  text-align: center;
}

.tap-instruction {
  font-size: 24px;
  font-weight: bold;
  color: white;
}

/* Feedback overlay */
.feedback-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  animation: feedback-pop 0.5s ease-out;
}

.feedback-overlay.correct .feedback-text {
  color: #00ff88;
  font-size: 48px;
  font-weight: bold;
  text-shadow: 0 0 20px #00ff88;
}

.feedback-overlay.wrong .feedback-text,
.feedback-overlay.miss .feedback-text {
  color: #ff4444;
  font-size: 48px;
  font-weight: bold;
  text-shadow: 0 0 20px #ff4444;
}

.reaction-time {
  font-size: 24px;
  color: #ffd700;
  margin-top: 10px;
}

@keyframes feedback-pop {
  0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
  50% { transform: translate(-50%, -50%) scale(1.2); }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}

/* Screen shake */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.color-reaction-container.shaking {
  animation: shake 0.3s ease-in-out;
}

/* Stats panel */
.stats-panel {
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding: 10px 20px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
}

.score, .streak {
  font-size: 18px;
  font-weight: bold;
  color: white;
}

.misses {
  font-size: 18px;
}

.miss-used {
  opacity: 0.3;
}

/* Game over */
.gameover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
}

.gameover-overlay h2 {
  font-size: 48px;
  color: #ff6b00;
}

.final-score {
  font-size: 72px;
  font-weight: bold;
  color: #ffd700;
}

.best-time {
  font-size: 24px;
  color: rgba(255, 255, 255, 0.7);
  margin: 20px 0;
}

.gameover-overlay button {
  padding: 15px 40px;
  font-size: 20px;
  background: #ff6b00;
  border: none;
  border-radius: 10px;
  color: white;
  cursor: pointer;
  margin-top: 20px;
}
```

---

## LEADERBOARD INTEGRATION

```typescript
const { leaderboard, submitScore, isSignedIn } = useLeaderboard('color-reaction');

const handleGameOver = async () => {
  setGameState(prev => ({ ...prev, status: 'gameover' }));
  playGameOver();

  if (roundTimeoutRef.current) clearTimeout(roundTimeoutRef.current);
  if (matchTimeoutRef.current) clearTimeout(matchTimeoutRef.current);

  if (isSignedIn) {
    await submitScore(gameState.score, null, {
      bestReactionTime: Math.round(gameState.bestReactionTime),
      maxStreak: maxStreak, // Track separately
      totalCorrect: totalCorrect
    });
  }
};
```

---

## SOUND INTEGRATION

```typescript
const {
  playBlockLand,    // Correct tap / wrong tap
  playPerfectBonus, // Perfect timing
  playCombo,        // Streak milestones
  playWinSound,     // 30+ streak
  playGameOver      // Game over / miss
} = useGameSounds();
```

---

## MOBILE CONSIDERATIONS

```typescript
const isMobile = useIsMobile();

// Larger touch targets on mobile
const displaySize = isMobile ? 180 : 150;

// Prevent scrolling on touch
<div
  className="color-reaction-container"
  onTouchStart={(e) => {
    e.preventDefault();
    handleTap();
  }}
  style={{ touchAction: 'none' }}
>
```

---

## TESTING CHECKLIST

- [ ] Target color changes at random intervals
- [ ] Match window activates when colors align
- [ ] Tap during match = correct + points
- [ ] Tap during non-match = wrong + penalty
- [ ] Missing match window = miss
- [ ] 3 misses = game over
- [ ] Reaction time calculated correctly
- [ ] Score based on reaction speed
- [ ] Streak tracking works
- [ ] Streak bonuses apply
- [ ] All visual effects trigger
- [ ] Sounds play correctly
- [ ] Best reaction time tracked
- [ ] Leaderboard submission works
- [ ] Mobile touch works

---

**IMPORTANT**: The game should feel TENSE. The random timing creates anticipation. When colors match, the player display should pulse/glow to signal "TAP NOW!" Perfect reactions should feel INCREDIBLE with big callouts and effects. Fast fingers should be rewarded heavily.
