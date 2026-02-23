# Claude Code Prompt: Wojak Whack-a-Mole Game

## Overview
Build a Whack-a-Mole style game for wojak.ink featuring Wojak characters. Players tap characters as they pop up from holes during a 60-second round. Different character types give different points. Pure DOM/CSS implementation.

---

## TECH STACK & ARCHITECTURE

```
Framework: React + TypeScript + Ionic Framework
Rendering: Pure DOM/CSS (no Canvas)
Animation: CSS animations for pop-up/down
Styling: CSS file (WojakWhack.css)
Sound: useGameSounds() hook
Leaderboard: useLeaderboard('wojak-whack') hook
Mobile Detection: useIsMobile() hook
```

**File Structure:**
```
src/pages/WojakWhack.tsx           # Main game component
src/pages/WojakWhack.css           # All styles + effects
src/components/media/games/GameModal.tsx  # Add lazy import
src/config/query/queryKeys.ts      # Add 'wojak-whack' to GameId type
```

---

## GAME SPECIFICATIONS

### Grid
- **Layout**: 3x3 grid (9 holes)
- **Hole Style**: Dark circular holes with dirt/ground texture

### Characters (Pop from holes)
```typescript
const CHARACTERS = {
  regular: {
    type: 'regular',
    points: 10,
    emoji: '😐',      // Or Wojak image
    color: '#FFD700',
    chance: 0.6,      // 60% spawn chance
    description: 'Regular Wojak'
  },
  happy: {
    type: 'happy',
    points: 25,
    emoji: '😊',      // Golden/happy Wojak
    color: '#00FF88',
    chance: 0.2,      // 20% spawn chance
    description: 'Happy Wojak - Bonus!'
  },
  golden: {
    type: 'golden',
    points: 50,
    emoji: '🌟',      // Rare golden
    color: '#FFD700',
    chance: 0.1,      // 10% spawn chance
    description: 'Golden Wojak - Rare!'
  },
  bad: {
    type: 'bad',
    points: -30,
    emoji: '😈',      // Scammer/bad character
    color: '#FF4444',
    chance: 0.1,      // 10% spawn chance
    description: 'Scammer - Don\'t hit!'
  }
};
```

### Timing
- **Game Duration**: 60 seconds
- **Character Visible Time**: Starts at 1.5s, decreases to 0.5s
- **Spawn Rate**: Starts slow, increases with time
- **Max Simultaneous**: 1 at start, up to 3 near end

### Scoring
- **Primary**: Total points in 60 seconds
- **Secondary**: Accuracy percentage (hits / total spawns)

---

## DATA STRUCTURES

```typescript
interface Character {
  type: 'regular' | 'happy' | 'golden' | 'bad';
  points: number;
  emoji: string;
  color: string;
}

interface Hole {
  id: number;
  character: Character | null;
  isActive: boolean;
  showTime: number; // When character appeared
  hitAnimating: boolean;
}

interface GameState {
  status: 'idle' | 'playing' | 'gameover';
  holes: Hole[];
  score: number;
  timeLeft: number;
  totalSpawns: number;
  totalHits: number;
  combo: number;
  difficulty: number; // 1-3, increases over time
}
```

---

## COMPONENT STRUCTURE

```typescript
const WojakWhack: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    status: 'idle',
    holes: Array(9).fill(null).map((_, i) => ({
      id: i,
      character: null,
      isActive: false,
      showTime: 0,
      hitAnimating: false
    })),
    score: 0,
    timeLeft: 60,
    totalSpawns: 0,
    totalHits: 0,
    combo: 0,
    difficulty: 1
  });

  const gameLoopRef = useRef<NodeJS.Timeout>();
  const timerRef = useRef<NodeJS.Timeout>();
  const spawnTimeoutRef = useRef<NodeJS.Timeout>();

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
    holes: Array(9).fill(null).map((_, i) => ({
      id: i,
      character: null,
      isActive: false,
      showTime: 0,
      hitAnimating: false
    })),
    score: 0,
    timeLeft: 60,
    totalSpawns: 0,
    totalHits: 0,
    combo: 0,
    difficulty: 1
  });

  // Start timer
  startTimer();

  // Start spawning
  scheduleNextSpawn();
};
```

### Timer
```typescript
const startTimer = () => {
  timerRef.current = setInterval(() => {
    setGameState(prev => {
      const newTimeLeft = prev.timeLeft - 1;

      // Increase difficulty over time
      let newDifficulty = 1;
      if (newTimeLeft <= 40) newDifficulty = 2;
      if (newTimeLeft <= 20) newDifficulty = 3;

      if (newTimeLeft <= 0) {
        handleGameOver();
        return { ...prev, timeLeft: 0, status: 'gameover' };
      }

      return { ...prev, timeLeft: newTimeLeft, difficulty: newDifficulty };
    });
  }, 1000);
};
```

### Character Spawning
```typescript
const getRandomCharacter = (): Character => {
  const rand = Math.random();
  let cumulative = 0;

  for (const char of Object.values(CHARACTERS)) {
    cumulative += char.chance;
    if (rand < cumulative) {
      return char;
    }
  }

  return CHARACTERS.regular;
};

const getAvailableHole = (): number | null => {
  const availableHoles = gameState.holes
    .filter(hole => !hole.isActive)
    .map(hole => hole.id);

  if (availableHoles.length === 0) return null;
  return availableHoles[Math.floor(Math.random() * availableHoles.length)];
};

const spawnCharacter = () => {
  const holeId = getAvailableHole();
  if (holeId === null) return;

  const character = getRandomCharacter();

  setGameState(prev => {
    const newHoles = [...prev.holes];
    newHoles[holeId] = {
      ...newHoles[holeId],
      character,
      isActive: true,
      showTime: Date.now()
    };
    return {
      ...prev,
      holes: newHoles,
      totalSpawns: prev.totalSpawns + 1
    };
  });

  // Schedule character hiding
  const visibleTime = getVisibleTime();
  setTimeout(() => {
    hideCharacter(holeId);
  }, visibleTime);
};

const hideCharacter = (holeId: number) => {
  setGameState(prev => {
    const newHoles = [...prev.holes];
    if (newHoles[holeId].isActive && !newHoles[holeId].hitAnimating) {
      // Missed! Reset combo
      newHoles[holeId] = {
        ...newHoles[holeId],
        character: null,
        isActive: false
      };
      return { ...prev, holes: newHoles, combo: 0 };
    }
    return prev;
  });
};

const scheduleNextSpawn = () => {
  if (gameState.status !== 'playing') return;

  const delay = getSpawnDelay();
  spawnTimeoutRef.current = setTimeout(() => {
    spawnCharacter();
    scheduleNextSpawn();
  }, delay);
};
```

### Difficulty Scaling
```typescript
const getVisibleTime = (): number => {
  // Decreases as difficulty increases
  const baseTimes = {
    1: 1500, // 1.5 seconds
    2: 1000, // 1 second
    3: 600   // 0.6 seconds
  };
  return baseTimes[gameState.difficulty] || 1500;
};

const getSpawnDelay = (): number => {
  // Faster spawns at higher difficulty
  const baseDelays = {
    1: { min: 800, max: 1500 },
    2: { min: 500, max: 1000 },
    3: { min: 300, max: 700 }
  };
  const { min, max } = baseDelays[gameState.difficulty] || baseDelays[1];
  return min + Math.random() * (max - min);
};

const getMaxSimultaneous = (): number => {
  return gameState.difficulty; // 1, 2, or 3
};
```

### Hit Detection
```typescript
const handleHoleClick = (holeId: number) => {
  if (gameState.status !== 'playing') return;

  const hole = gameState.holes[holeId];
  if (!hole.isActive || !hole.character) return;

  const character = hole.character;
  const points = character.points;
  const newCombo = points > 0 ? gameState.combo + 1 : 0;

  // Update state
  setGameState(prev => {
    const newHoles = [...prev.holes];
    newHoles[holeId] = {
      ...newHoles[holeId],
      hitAnimating: true,
      isActive: false
    };

    // Clear hit animation after delay
    setTimeout(() => {
      setGameState(p => {
        const h = [...p.holes];
        h[holeId] = { ...h[holeId], character: null, hitAnimating: false };
        return { ...p, holes: h };
      });
    }, 300);

    return {
      ...prev,
      holes: newHoles,
      score: Math.max(0, prev.score + points),
      totalHits: prev.totalHits + 1,
      combo: newCombo
    };
  });

  // Trigger effects
  onCharacterHit(character, holeId, newCombo);
};
```

---

## EXTREME EFFECTS PHILOSOPHY

### Hit Effects
```typescript
const onCharacterHit = (character: Character, holeId: number, combo: number) => {
  const holeElement = document.getElementById(`hole-${holeId}`);
  const rect = holeElement?.getBoundingClientRect();

  // PRIMARY: Score popup
  showScorePopup(
    character.points > 0 ? `+${character.points}` : `${character.points}`,
    rect?.left || 0,
    rect?.top || 0
  );

  // SECONDARY: Sound
  if (character.type === 'bad') {
    playGameOver(); // Error sound
    triggerScreenShake();
    showEpicCallout('OOPS!');
  } else {
    playBlockLand();
  }

  // TERTIARY: Character-specific effects
  if (character.type === 'golden') {
    showEpicCallout('GOLDEN! +50');
    triggerConfetti();
    spawnFloatingEmojis(['🌟', '✨', '💰']);
    playPerfectBonus();
  } else if (character.type === 'happy') {
    showEpicCallout('BONUS!');
    spawnFloatingEmojis(['😊', '✨']);
    playCombo();
  }

  // COMBO EFFECTS
  if (combo >= 3) {
    showEpicCallout('COMBO x' + combo);
  }
  if (combo >= 5) {
    triggerScreenShake();
    showEpicCallout('🔥 COMBO x' + combo);
  }
  if (combo >= 10) {
    showEpicCallout('⚡ UNSTOPPABLE!');
    triggerConfetti();
    triggerLightning();
  }
  if (combo >= 15) {
    showEpicCallout('👑 GOD MODE!');
    triggerFullChaos();
  }
};
```

### Time Warning Effects
```typescript
useEffect(() => {
  if (gameState.timeLeft === 10) {
    showEpicCallout('10 SECONDS!');
    triggerScreenShake();
  }
  if (gameState.timeLeft === 5) {
    showEpicCallout('FINAL 5!');
  }
}, [gameState.timeLeft]);
```

---

## UI LAYOUT

```tsx
<IonPage>
  <IonContent>
    <div className={`wojak-whack-container ${screenShake ? 'shaking' : ''}`}>
      {/* Header */}
      <div className="game-header">
        <div className="score-display">
          <span className="score-label">Score</span>
          <span className="score-value">{gameState.score}</span>
        </div>
        <div className="timer-display">
          <span className={`timer-value ${gameState.timeLeft <= 10 ? 'urgent' : ''}`}>
            {gameState.timeLeft}
          </span>
        </div>
        <div className="combo-display">
          {gameState.combo >= 3 && (
            <span className="combo-value">🔥 x{gameState.combo}</span>
          )}
        </div>
      </div>

      {/* Game Grid */}
      <div className="holes-grid">
        {gameState.holes.map(hole => (
          <Hole
            key={hole.id}
            hole={hole}
            onClick={() => handleHoleClick(hole.id)}
          />
        ))}
      </div>

      {/* Character Legend */}
      <div className="character-legend">
        <div className="legend-item good">😐 +10</div>
        <div className="legend-item bonus">😊 +25</div>
        <div className="legend-item golden">🌟 +50</div>
        <div className="legend-item bad">😈 -30</div>
      </div>

      {/* Game Over Overlay */}
      {gameState.status === 'gameover' && (
        <GameOverModal
          score={gameState.score}
          accuracy={Math.round((gameState.totalHits / gameState.totalSpawns) * 100)}
          onPlayAgain={startGame}
        />
      )}
    </div>
  </IonContent>
</IonPage>
```

### Hole Component
```tsx
interface HoleProps {
  hole: Hole;
  onClick: () => void;
}

const Hole: React.FC<HoleProps> = ({ hole, onClick }) => {
  return (
    <div
      id={`hole-${hole.id}`}
      className={`hole ${hole.isActive ? 'active' : ''} ${hole.hitAnimating ? 'hit' : ''}`}
      onClick={onClick}
    >
      <div className="hole-bg" />
      {hole.character && (
        <div
          className={`character ${hole.character.type} ${hole.isActive ? 'popping' : 'hiding'}`}
          style={{ color: hole.character.color }}
        >
          <span className="character-emoji">{hole.character.emoji}</span>
        </div>
      )}
      {hole.hitAnimating && (
        <div className="hit-effect">💥</div>
      )}
    </div>
  );
};
```

---

## CSS STYLING

```css
/* Container */
.wojak-whack-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #2d1f0f 0%, #1a1a2e 100%);
  min-height: 100%;
}

/* Header */
.game-header {
  display: flex;
  justify-content: space-between;
  width: 100%;
  max-width: 400px;
  margin-bottom: 20px;
  padding: 15px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 15px;
}

.score-display, .timer-display, .combo-display {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.score-value, .timer-value {
  font-size: 32px;
  font-weight: bold;
  color: #FFD700;
}

.timer-value.urgent {
  color: #FF4444;
  animation: pulse 0.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* Holes Grid */
.holes-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  max-width: 400px;
  width: 100%;
}

/* Individual Hole */
.hole {
  position: relative;
  width: 100%;
  padding-bottom: 100%; /* Square aspect ratio */
  cursor: pointer;
  overflow: hidden;
}

.hole-bg {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  height: 40%;
  background: radial-gradient(ellipse at center, #3d2817 0%, #1a0f08 100%);
  border-radius: 50%;
  box-shadow: inset 0 5px 15px rgba(0, 0, 0, 0.8);
}

/* Character */
.character {
  position: absolute;
  bottom: 10%;
  left: 50%;
  transform: translateX(-50%) translateY(100%);
  font-size: 60px;
  transition: transform 0.15s ease-out;
  z-index: 2;
}

.character.popping {
  transform: translateX(-50%) translateY(0%);
  animation: pop-up 0.15s ease-out;
}

.character.hiding {
  transform: translateX(-50%) translateY(100%);
  animation: pop-down 0.15s ease-in;
}

@keyframes pop-up {
  0% { transform: translateX(-50%) translateY(100%); }
  70% { transform: translateX(-50%) translateY(-10%); }
  100% { transform: translateX(-50%) translateY(0%); }
}

@keyframes pop-down {
  0% { transform: translateX(-50%) translateY(0%); }
  100% { transform: translateX(-50%) translateY(100%); }
}

/* Hit effect */
.hit-effect {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 48px;
  animation: hit-burst 0.3s ease-out forwards;
  z-index: 10;
}

@keyframes hit-burst {
  0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
}

/* Character type colors */
.character.regular { filter: none; }
.character.happy { filter: drop-shadow(0 0 10px #00FF88); }
.character.golden { filter: drop-shadow(0 0 15px #FFD700); animation: golden-glow 0.5s ease-in-out infinite; }
.character.bad { filter: drop-shadow(0 0 10px #FF4444); }

@keyframes golden-glow {
  0%, 100% { filter: drop-shadow(0 0 15px #FFD700); }
  50% { filter: drop-shadow(0 0 30px #FFD700); }
}

/* Screen shake */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.wojak-whack-container.shaking {
  animation: shake 0.3s ease-in-out;
}

/* Legend */
.character-legend {
  display: flex;
  justify-content: space-around;
  width: 100%;
  max-width: 400px;
  margin-top: 20px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
}

.legend-item {
  font-size: 14px;
  color: white;
}

.legend-item.good { color: #FFD700; }
.legend-item.bonus { color: #00FF88; }
.legend-item.golden { color: #FFD700; }
.legend-item.bad { color: #FF4444; }

/* Game Over */
.gameover-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.gameover-overlay h2 {
  font-size: 48px;
  color: #FF6B00;
  margin-bottom: 20px;
}

.final-score {
  font-size: 72px;
  font-weight: bold;
  color: #FFD700;
}

.accuracy {
  font-size: 24px;
  color: rgba(255, 255, 255, 0.7);
  margin: 10px 0 30px;
}

.play-again-btn {
  padding: 15px 40px;
  font-size: 20px;
  background: #FF6B00;
  border: none;
  border-radius: 10px;
  color: white;
  cursor: pointer;
}
```

---

## LEADERBOARD INTEGRATION

```typescript
const { leaderboard, submitScore, isSignedIn } = useLeaderboard('wojak-whack');

const handleGameOver = async () => {
  setGameState(prev => ({ ...prev, status: 'gameover' }));

  // Clear all timers
  if (timerRef.current) clearInterval(timerRef.current);
  if (spawnTimeoutRef.current) clearTimeout(spawnTimeoutRef.current);

  // Calculate accuracy
  const accuracy = gameState.totalSpawns > 0
    ? Math.round((gameState.totalHits / gameState.totalSpawns) * 100)
    : 0;

  if (isSignedIn) {
    await submitScore(gameState.score, null, {
      accuracy,
      totalHits: gameState.totalHits,
      maxCombo: maxComboAchieved
    });
  }
};
```

---

## SOUND INTEGRATION

```typescript
const {
  playBlockLand,    // Hit regular/happy character
  playPerfectBonus, // Hit golden character
  playCombo,        // Combo milestones
  playWinSound,     // High score achievement
  playGameOver      // Hit bad character / game over
} = useGameSounds();
```

---

## MOBILE CONSIDERATIONS

```typescript
const isMobile = useIsMobile();

// Adjust sizes for mobile
const holeSize = isMobile ? '30vw' : '100px';
const characterSize = isMobile ? '50px' : '60px';

// Touch feedback
const handleHoleTouch = (holeId: number) => {
  if (navigator.vibrate) {
    navigator.vibrate(50); // Haptic feedback
  }
  handleHoleClick(holeId);
};
```

---

## TESTING CHECKLIST

- [ ] Characters pop up from holes correctly
- [ ] Characters hide after visible time
- [ ] Tapping active character registers hit
- [ ] Tapping inactive hole does nothing
- [ ] Score updates correctly for each character type
- [ ] Bad character gives negative points
- [ ] Timer counts down from 60
- [ ] Difficulty increases (faster spawns, shorter visible time)
- [ ] Combo tracking works
- [ ] All effects trigger correctly
- [ ] Game over triggers at 0 seconds
- [ ] Accuracy calculated correctly
- [ ] Leaderboard submission works
- [ ] Mobile touch controls work

---

**IMPORTANT**: The pop-up animation is KEY to making the game feel responsive and fun. Characters should pop up with a slight bounce and hide quickly. Hitting a character should feel IMPACTFUL with the hit burst effect and sound. The escalating difficulty should create tension as time runs out. Golden characters should feel SPECIAL with extra glow and celebration effects when hit!
