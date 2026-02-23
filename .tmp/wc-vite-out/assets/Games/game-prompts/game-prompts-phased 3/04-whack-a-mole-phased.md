# Wojak Whack Game - Phased Build Guide

> **Game ID**: `wojak-whack`
> **Rendering**: DOM/CSS (no Canvas needed)
> **Complexity**: Easy-Medium
> **Prerequisites**: Run `00-MASTER-INDEX.md` setup first

---

## PHASE 1: Component Structure & Grid Setup

### Prompt for Claude Code:

```
Create the Wojak Whack (Whack-a-Mole) game component structure for wojak.ink.

GAME OVERVIEW:
- Classic whack-a-mole with wojak/meme characters
- Tap moles before they disappear
- Score points based on speed
- Avoid hitting bombs/bad moles

REQUIREMENTS:
1. Create file: src/games/WojakWhack/WojakWhackGame.tsx
2. Use TypeScript with proper interfaces
3. 3x3 grid of holes (9 total)
4. Orange theme (#ff6b00 primary)

INTERFACES NEEDED:
interface Mole {
  id: number;
  type: 'wojak' | 'pepe' | 'doge' | 'bomb';
  position: number;      // 0-8 grid position
  isVisible: boolean;
  isPeeking: boolean;    // Animation state: peeking up
  isHit: boolean;        // Just been whacked
  points: number;        // Points for hitting (negative for bomb)
  visibleDuration: number; // How long it stays up
}

interface GameState {
  score: number;
  timeLeft: number;      // Seconds remaining
  activeMoles: Mole[];
  isPlaying: boolean;
  combo: number;
  highScore: number;
}

MOLE TYPES & POINTS:
const MOLE_TYPES = {
  wojak: { points: 10, probability: 0.5, duration: 1200 },
  pepe: { points: 25, probability: 0.25, duration: 900 },   // Faster, more points
  doge: { points: 50, probability: 0.15, duration: 600 },   // Very fast, bonus
  bomb: { points: -50, probability: 0.1, duration: 1500 },  // Don't hit!
};

GRID LAYOUT:
- 3x3 holes
- Each hole has a "ground" and a mole slot
- Moles pop up from holes

COMPONENT STRUCTURE:
const WojakWhackGame: React.FC = () => {
  const { width, height } = useDimensions();
  const isMobile = useIsMobile();

  const GRID_SIZE = 3;
  const GAME_DURATION = 60; // seconds

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeMoles, setActiveMoles] = useState<Map<number, Mole>>(new Map());
  const [combo, setCombo] = useState(0);

  // Grid dimensions
  const gameWidth = isMobile ? width - 32 : 500;
  const holeSize = (gameWidth - 40) / GRID_SIZE;

  return (
    <div className="whack-container">
      {/* Header */}
      <div className="game-header">
        <div className="score">Score: {score}</div>
        <div className="timer">Time: {timeLeft}s</div>
        <div className="combo">{combo > 1 && `${combo}x COMBO!`}</div>
      </div>

      {/* Game Grid */}
      <div
        className="whack-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          gap: '16px',
          width: gameWidth,
        }}
      >
        {Array(GRID_SIZE * GRID_SIZE).fill(null).map((_, idx) => (
          <Hole
            key={idx}
            position={idx}
            mole={activeMoles.get(idx)}
            onWhack={handleWhack}
            holeSize={holeSize}
          />
        ))}
      </div>

      {/* Start Button / Game Over */}
      {!isPlaying && (
        <button className="start-btn" onClick={startGame}>
          {timeLeft === GAME_DURATION ? 'START' : 'PLAY AGAIN'}
        </button>
      )}
    </div>
  );
};

HOLE COMPONENT:
interface HoleProps {
  position: number;
  mole: Mole | undefined;
  onWhack: (position: number) => void;
  holeSize: number;
}

const Hole: React.FC<HoleProps> = ({ position, mole, onWhack, holeSize }) => {
  return (
    <div
      className="hole"
      style={{ width: holeSize, height: holeSize * 1.2 }}
      onClick={() => mole?.isVisible && onWhack(position)}
    >
      {/* Ground/dirt background */}
      <div className="hole-ground" />

      {/* Mole character */}
      {mole && (
        <div
          className={`mole mole-${mole.type} ${mole.isVisible ? 'up' : 'down'} ${mole.isHit ? 'hit' : ''}`}
        >
          {/* Character face/image */}
          <MoleCharacter type={mole.type} />
        </div>
      )}
    </div>
  );
};

HOLE STYLING:
.hole {
  position: relative;
  cursor: pointer;
  overflow: hidden;
}

.hole-ground {
  position: absolute;
  bottom: 0;
  width: 100%;
  height: 40%;
  background: #8B4513; /* Brown dirt */
  border-radius: 50%;
}

.mole {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%) translateY(100%);
  transition: transform 0.15s ease-out;
  width: 80%;
  height: 80%;
}

.mole.up {
  transform: translateX(-50%) translateY(20%);
}

.mole.hit {
  animation: mole-bonk 0.3s ease-out;
}

@keyframes mole-bonk {
  0% { transform: translateX(-50%) translateY(20%) scale(1); }
  50% { transform: translateX(-50%) translateY(20%) scale(0.8); }
  100% { transform: translateX(-50%) translateY(100%) scale(1); }
}

MOLE CHARACTER STYLING:
.mole-wojak { background: url('/assets/moles/wojak.png'); }
.mole-pepe { background: url('/assets/moles/pepe.png'); }
.mole-doge { background: url('/assets/moles/doge.png'); }
.mole-bomb { background: url('/assets/moles/bomb.png'); }

/* Or use emoji/icons for MVP */
const MoleCharacter: React.FC<{type: string}> = ({ type }) => {
  const chars = {
    wojak: '😐',
    pepe: '🐸',
    doge: '🐕',
    bomb: '💣',
  };
  return <span className="mole-emoji">{chars[type]}</span>;
};

DO NOT implement game loop or mole spawning yet - just the visual grid.
```

### ✅ Phase 1 Checkpoint

**Test these manually:**
- [ ] 3x3 grid renders with 9 holes
- [ ] Each hole has a "dirt/ground" visual
- [ ] Holes are evenly spaced
- [ ] Start button displays
- [ ] Score and timer display in header
- [ ] Grid is centered and responsive
- [ ] Clicking holes doesn't crash (nothing happens yet)

**Debug Prompt if issues:**
```
The Whack-a-Mole grid isn't rendering correctly. Issues: [describe]

Check:
1. Is CSS grid set up with gridTemplateColumns: repeat(3, 1fr)?
2. Is each hole component rendering with correct key?
3. Is the overflow: hidden on .hole to clip moles?
4. Are dimensions calculated correctly for mobile?

Show me the grid CSS and the Hole component render.
```

---

## PHASE 2: Game Timer & Mole Spawning

### Prompt for Claude Code:

```
Add game timer and mole spawning logic to Wojak Whack.

CURRENT STATE: Grid renders but no moles spawn.

GAME TIMER:

const timerRef = useRef<NodeJS.Timeout | null>(null);

const startGame = () => {
  setScore(0);
  setCombo(0);
  setTimeLeft(GAME_DURATION);
  setActiveMoles(new Map());
  setIsPlaying(true);
};

// Countdown timer
useEffect(() => {
  if (!isPlaying) return;

  timerRef.current = setInterval(() => {
    setTimeLeft(prev => {
      if (prev <= 1) {
        endGame();
        return 0;
      }
      return prev - 1;
    });
  }, 1000);

  return () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };
}, [isPlaying]);

const endGame = () => {
  setIsPlaying(false);
  if (timerRef.current) clearInterval(timerRef.current);
  if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
  // Clear all moles
  setActiveMoles(new Map());
};

MOLE SPAWNING:

const spawnTimerRef = useRef<NodeJS.Timeout | null>(null);
const moleIdRef = useRef(0);

// Spawn moles at intervals
useEffect(() => {
  if (!isPlaying) return;

  const spawnMole = () => {
    // Find empty positions
    const occupiedPositions = new Set(activeMoles.keys());
    const emptyPositions = [];
    for (let i = 0; i < 9; i++) {
      if (!occupiedPositions.has(i)) {
        emptyPositions.push(i);
      }
    }

    if (emptyPositions.length === 0) return;

    // Pick random empty position
    const position = emptyPositions[Math.floor(Math.random() * emptyPositions.length)];

    // Pick mole type based on probability
    const type = pickMoleType();
    const config = MOLE_TYPES[type];

    const newMole: Mole = {
      id: moleIdRef.current++,
      type,
      position,
      isVisible: true,
      isPeeking: false,
      isHit: false,
      points: config.points,
      visibleDuration: config.duration,
    };

    // Add mole
    setActiveMoles(prev => new Map(prev).set(position, newMole));

    // Remove mole after duration (if not hit)
    setTimeout(() => {
      setActiveMoles(prev => {
        const current = prev.get(position);
        if (current && current.id === newMole.id && !current.isHit) {
          const next = new Map(prev);
          next.delete(position);
          return next;
        }
        return prev;
      });
    }, config.duration);
  };

  // Spawn rate: starts slow, gets faster
  const getSpawnInterval = () => {
    // Faster spawning as game progresses
    const progress = 1 - (timeLeft / GAME_DURATION);
    const baseInterval = 800;
    const minInterval = 300;
    return Math.max(minInterval, baseInterval - (progress * 400));
  };

  spawnTimerRef.current = setInterval(() => {
    spawnMole();
  }, getSpawnInterval());

  return () => {
    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
  };
}, [isPlaying, timeLeft]);

PICK MOLE TYPE:
const pickMoleType = (): Mole['type'] => {
  const rand = Math.random();
  let cumulative = 0;

  for (const [type, config] of Object.entries(MOLE_TYPES)) {
    cumulative += config.probability;
    if (rand < cumulative) {
      return type as Mole['type'];
    }
  }
  return 'wojak'; // Fallback
};

DIFFICULTY SCALING:
As time passes:
- Spawn rate increases
- More fast moles (pepe, doge) appear
- Bomb probability increases slightly

// Adjust probabilities based on time
const getDynamicMoleTypes = () => {
  const progress = 1 - (timeLeft / GAME_DURATION);
  return {
    wojak: { points: 10, probability: 0.5 - (progress * 0.1), duration: 1200 - (progress * 300) },
    pepe: { points: 25, probability: 0.25 + (progress * 0.05), duration: 900 - (progress * 200) },
    doge: { points: 50, probability: 0.15 + (progress * 0.05), duration: 600 - (progress * 100) },
    bomb: { points: -50, probability: 0.1 + (progress * 0.05), duration: 1500 },
  };
};

MOLE ANIMATION STATES:
The mole should:
1. Pop up (0.15s transition)
2. Stay visible (visibleDuration)
3. Hide back down (0.15s transition)

// When mole is added, briefly set isPeeking for animation hook
.mole.peeking {
  animation: mole-peek 0.15s ease-out;
}

@keyframes mole-peek {
  0% { transform: translateX(-50%) translateY(100%); }
  100% { transform: translateX(-50%) translateY(20%); }
}
```

### ✅ Phase 2 Checkpoint

**Test these manually:**
- [ ] Click START to begin game
- [ ] Timer counts down from 60
- [ ] Moles start appearing randomly
- [ ] Different mole types appear (wojak, pepe, doge, bomb)
- [ ] Moles disappear after their duration
- [ ] Multiple moles can be on screen
- [ ] Spawning gets faster over time
- [ ] Game ends when timer hits 0
- [ ] No moles visible after game ends

**Debug Prompt if issues:**
```
Mole spawning isn't working correctly in Wojak Whack.

Issue: [describe - e.g., "moles don't appear" or "moles stay forever"]

Check:
1. Is spawnTimerRef being set when isPlaying becomes true?
2. Is the position lookup finding empty spots correctly?
3. Is setTimeout for removal using the correct mole.id check?
4. Are moles being added to the Map correctly?

Log: console.log('Spawn mole at position', position, 'type', type);
Log: console.log('Active moles:', activeMoles.size);

Show me the spawnMole function and the removal timeout.
```

---

## PHASE 3: Whack Handling & Scoring

### Prompt for Claude Code:

```
Add whack handling, scoring, and combo system to Wojak Whack.

CURRENT STATE: Moles spawn and disappear, but tapping does nothing.

WHACK HANDLER:

const handleWhack = (position: number) => {
  const mole = activeMoles.get(position);
  if (!mole || !mole.isVisible || mole.isHit) return;

  // Mark as hit
  setActiveMoles(prev => {
    const next = new Map(prev);
    next.set(position, { ...mole, isHit: true, isVisible: false });
    return next;
  });

  // Calculate points
  if (mole.type === 'bomb') {
    // Hit a bomb!
    handleBombHit(mole);
  } else {
    // Good hit!
    handleGoodHit(mole);
  }

  // Remove mole after hit animation
  setTimeout(() => {
    setActiveMoles(prev => {
      const next = new Map(prev);
      next.delete(position);
      return next;
    });
  }, 300);
};

GOOD HIT HANDLING:
const handleGoodHit = (mole: Mole) => {
  // Increase combo
  setCombo(prev => prev + 1);

  // Calculate points with combo multiplier
  const comboMultiplier = Math.min(combo + 1, 5); // Max 5x
  const points = mole.points * comboMultiplier;

  // Update score
  setScore(prev => prev + points);

  // Visual feedback
  showPointsPopup(mole.position, points, true);
  triggerHitEffect(mole.type);

  // Combo callouts
  if (combo >= 2) showComboCallout(combo + 1);
};

BOMB HIT HANDLING:
const handleBombHit = (mole: Mole) => {
  // Reset combo
  setCombo(0);

  // Lose points
  setScore(prev => Math.max(0, prev + mole.points)); // Can't go negative

  // Visual feedback
  showPointsPopup(mole.position, mole.points, false);
  triggerExplosionEffect();
  shakeScreen();
};

COMBO SYSTEM:
const [comboTimer, setComboTimer] = useState<NodeJS.Timeout | null>(null);

// Reset combo if no hit within 2 seconds
useEffect(() => {
  if (combo === 0) return;

  if (comboTimer) clearTimeout(comboTimer);

  const timer = setTimeout(() => {
    setCombo(0);
  }, 2000);

  setComboTimer(timer);

  return () => {
    if (timer) clearTimeout(timer);
  };
}, [combo]);

COMBO TIERS & CALLOUTS:
const getComboCallout = (combo: number) => {
  if (combo >= 20) return { text: 'GOD MODE!', color: '#ff0000' };
  if (combo >= 15) return { text: 'LEGENDARY!', color: '#ff6b00' };
  if (combo >= 10) return { text: 'UNSTOPPABLE!', color: '#ffa500' };
  if (combo >= 5) return { text: 'AMAZING!', color: '#ffcc00' };
  if (combo >= 3) return { text: 'NICE!', color: '#ffffff' };
  return null;
};

POINTS POPUP:
const [pointsPopups, setPointsPopups] = useState<{id: number, position: number, points: number, isGood: boolean}[]>([]);

const showPointsPopup = (position: number, points: number, isGood: boolean) => {
  const popup = {
    id: Date.now(),
    position,
    points,
    isGood
  };

  setPointsPopups(prev => [...prev, popup]);

  setTimeout(() => {
    setPointsPopups(prev => prev.filter(p => p.id !== popup.id));
  }, 800);
};

// Render popups over holes
{pointsPopups.map(popup => {
  const row = Math.floor(popup.position / 3);
  const col = popup.position % 3;
  return (
    <div
      key={popup.id}
      className={`points-popup ${popup.isGood ? 'good' : 'bad'}`}
      style={{
        left: `${col * 33 + 16}%`,
        top: `${row * 33}%`,
      }}
    >
      {popup.points > 0 ? '+' : ''}{popup.points}
    </div>
  );
})}

POPUP STYLING:
.points-popup {
  position: absolute;
  font-size: 24px;
  font-weight: bold;
  pointer-events: none;
  animation: popup-rise 0.8s ease-out forwards;
  z-index: 100;
}

.points-popup.good {
  color: #ff6b00;
  text-shadow: 0 0 10px #ff6b00;
}

.points-popup.bad {
  color: #ff0000;
  text-shadow: 0 0 10px #ff0000;
}

@keyframes popup-rise {
  0% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translateY(-60px) scale(1.5);
    opacity: 0;
  }
}

HIT ANIMATION ON MOLE:
.mole.hit {
  animation: mole-squash 0.3s ease-out forwards;
}

@keyframes mole-squash {
  0% {
    transform: translateX(-50%) translateY(20%) scale(1);
  }
  30% {
    transform: translateX(-50%) translateY(20%) scale(1.2, 0.6);
  }
  100% {
    transform: translateX(-50%) translateY(100%) scale(1);
  }
}

SCREEN SHAKE (on bomb hit):
const [isShaking, setIsShaking] = useState(false);

const shakeScreen = () => {
  setIsShaking(true);
  setTimeout(() => setIsShaking(false), 300);
};

<div className={`whack-grid ${isShaking ? 'shake' : ''}`}>

.shake {
  animation: screen-shake 0.3s ease;
}

@keyframes screen-shake {
  0%, 100% { transform: translate(0); }
  25% { transform: translate(-10px, 5px); }
  50% { transform: translate(10px, -5px); }
  75% { transform: translate(-5px, 10px); }
}
```

### ✅ Phase 3 Checkpoint

**Test these manually:**
- [ ] Tapping a mole scores points
- [ ] Points popup appears over hit mole
- [ ] Correct points based on mole type
- [ ] Combo counter increases on consecutive hits
- [ ] Combo multiplier affects points
- [ ] Combo resets after 2 seconds of no hits
- [ ] Hitting bomb loses points
- [ ] Hitting bomb resets combo
- [ ] Screen shakes on bomb hit
- [ ] Mole squash animation on hit
- [ ] Can't hit same mole twice

**Debug Prompt if issues:**
```
Whack handling or scoring isn't working in Wojak Whack.

Issue: [describe - e.g., "points not adding" or "combo not increasing"]

Check:
1. Is handleWhack receiving the correct position?
2. Is the mole found in activeMoles at that position?
3. Is the isHit flag being set before calculating points?
4. Is comboMultiplier being calculated correctly?

Log: console.log('Whack!', position, mole?.type, 'combo:', combo);
Log: console.log('Points:', points, 'New score:', score + points);

Show me the handleWhack and handleGoodHit functions.
```

---

## PHASE 4: Effects & Polish

### Prompt for Claude Code:

```
Add visual effects, particles, and polish to Wojak Whack.

CURRENT STATE: Game plays correctly, needs more juice!

EFFECT 1 - HIT PARTICLES:
When a mole is whacked, spawn particles:

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  velocity: { x: number, y: number };
}

const [particles, setParticles] = useState<Particle[]>([]);

const spawnHitParticles = (position: number, type: string) => {
  const row = Math.floor(position / 3);
  const col = position % 3;
  const centerX = (col + 0.5) * (gameWidth / 3);
  const centerY = (row + 0.5) * (gameHeight / 3);

  const colors = {
    wojak: ['#ffcc00', '#fff'],
    pepe: ['#00ff00', '#90ee90'],
    doge: ['#ffa500', '#ffcc00'],
    bomb: ['#ff0000', '#ff6600', '#000'],
  };

  const newParticles = Array(12).fill(null).map((_, i) => ({
    id: Date.now() + i,
    x: centerX,
    y: centerY,
    color: colors[type][i % colors[type].length],
    size: 6 + Math.random() * 8,
    velocity: {
      x: (Math.random() - 0.5) * 15,
      y: -Math.random() * 10 - 5,
    },
  }));

  setParticles(prev => [...prev, ...newParticles]);

  setTimeout(() => {
    setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
  }, 600);
};

// Render particles
{particles.map(p => (
  <div
    key={p.id}
    className="particle"
    style={{
      left: p.x,
      top: p.y,
      width: p.size,
      height: p.size,
      backgroundColor: p.color,
    }}
  />
))}

.particle {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  animation: particle-fly 0.6s ease-out forwards;
}

@keyframes particle-fly {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(var(--vx), var(--vy)) scale(0);
    opacity: 0;
  }
}

EFFECT 2 - EXPLOSION (Bomb hit):
const triggerExplosion = (position: number) => {
  // Flash red overlay
  setExplosionFlash(true);
  setTimeout(() => setExplosionFlash(false), 150);

  // Spawn fire particles
  spawnHitParticles(position, 'bomb');
};

{explosionFlash && <div className="explosion-overlay" />}

.explosion-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 0, 0, 0.3);
  pointer-events: none;
  animation: flash 0.15s ease-out;
}

EFFECT 3 - COMBO CALLOUTS:
const [callout, setCallout] = useState<{text: string, color: string} | null>(null);

const showComboCallout = (combo: number) => {
  const data = getComboCallout(combo);
  if (!data) return;

  setCallout(data);
  setTimeout(() => setCallout(null), 1000);
};

{callout && (
  <div
    className="combo-callout"
    style={{ color: callout.color }}
  >
    {callout.text}
  </div>
)}

.combo-callout {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 48px;
  font-weight: bold;
  text-shadow: 0 0 20px currentColor;
  animation: callout-pop 1s ease-out forwards;
  pointer-events: none;
  z-index: 200;
}

@keyframes callout-pop {
  0% {
    transform: translate(-50%, -50%) scale(0.5);
    opacity: 0;
  }
  20% {
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0;
  }
}

EFFECT 4 - MOLE EXPRESSIONS:
Different expressions based on state:

const getMoleExpression = (mole: Mole) => {
  if (mole.isHit) return '😵'; // Hit
  if (mole.type === 'bomb') return '💣';
  if (mole.type === 'doge') return '🐕';
  if (mole.type === 'pepe') return '🐸';
  // Wojak expression changes
  const timeVisible = Date.now() - mole.spawnTime;
  if (timeVisible > mole.visibleDuration * 0.7) return '😏'; // About to escape
  return '😐';
};

EFFECT 5 - MISS PENALTY (optional):
Clicking empty hole:

const handleMissClick = (position: number) => {
  const mole = activeMoles.get(position);
  if (mole) return; // Has mole, don't penalize

  // Small penalty for missing
  setCombo(0);
  showMissIndicator(position);
};

const showMissIndicator = (position: number) => {
  // Show X or poof animation
};

EFFECT 6 - TIMER WARNING:
When time is low, create urgency:

const isTimeWarning = timeLeft <= 10;

<div className={`timer ${isTimeWarning ? 'warning' : ''}`}>
  Time: {timeLeft}s
</div>

.timer.warning {
  color: #ff0000;
  animation: timer-pulse 0.5s infinite;
}

@keyframes timer-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

GAME OVER SCREEN:
{!isPlaying && timeLeft === 0 && (
  <div className="game-over-modal">
    <h2>TIME'S UP!</h2>
    <div className="final-score">
      <span>Score</span>
      <span className="score-value">{score}</span>
    </div>
    {score > highScore && <div className="new-record">NEW RECORD! 🎉</div>}
    <div className="stats">
      <div>Best Combo: {maxCombo}x</div>
      <div>Moles Whacked: {totalHits}</div>
    </div>
    <button onClick={startGame}>PLAY AGAIN</button>
    <button onClick={submitScore}>SUBMIT SCORE</button>
  </div>
)}
```

### ✅ Phase 4 Checkpoint

**Test these manually:**
- [ ] Hit particles spawn and animate
- [ ] Different colored particles for each mole type
- [ ] Explosion flash on bomb hit
- [ ] Combo callouts appear (NICE!, AMAZING!, etc.)
- [ ] Timer turns red when <10 seconds
- [ ] Timer pulses during warning
- [ ] Game over modal shows final score
- [ ] New record indicator when beating high score
- [ ] Stats display (combo, hits)
- [ ] Play Again button works

**Debug Prompt if issues:**
```
Effects aren't displaying correctly in Wojak Whack.

Issue: [describe - e.g., "particles not animating" or "callout not showing"]

Check:
1. Are particles being added to state array?
2. Is the particle container positioned absolute?
3. Are z-indexes correct for layering?
4. Is the animation duration matching the setTimeout cleanup?

For callouts:
1. Is getComboCallout returning the right tier?
2. Is setCallout being called?
3. Is the callout container visible (check positioning)?

Show me the particle spawn code and the CSS animations.
```

---

## PHASE 5: Audio, Leaderboard & Final Polish

### Prompt for Claude Code:

```
Add Howler.js audio, leaderboard, and final polish to Wojak Whack.

CURRENT STATE: Full game with effects, needs audio and leaderboard.

AUDIO INTEGRATION:

Sounds needed:
- Whack hit (for each mole type)
- Bomb explosion
- Mole pop up
- Combo sounds
- Timer warning beeps
- Game over
- High score fanfare

const {
  playWhack,        // Basic hit sound
  playBonusHit,     // Rare mole (doge) hit
  playExplosion,    // Bomb hit
  playPopUp,        // Mole appearing
  playComboSound,   // Combo tier reached
  playWarningBeep,  // Timer warning
  playGameOver,
  playHighScore,
  setMuted
} = useHowlerSounds();

// In handleGoodHit:
if (mole.type === 'doge') {
  playBonusHit();
} else {
  playWhack();
}

if (newCombo >= 5 && newCombo % 5 === 0) {
  playComboSound();
}

// In handleBombHit:
playExplosion();

// On mole spawn:
playPopUp();

// Timer warning (every second when <10):
useEffect(() => {
  if (timeLeft <= 10 && timeLeft > 0 && isPlaying) {
    playWarningBeep();
  }
}, [timeLeft]);

// Game over:
if (score > highScore) {
  playHighScore();
} else {
  playGameOver();
}

LEADERBOARD INTEGRATION:

import { useLeaderboard } from '../../hooks/useLeaderboard';

const { submitScore, getTopScores, getUserRank } = useLeaderboard('wojak-whack');

const handleSubmitScore = async () => {
  if (score > 0) {
    const rank = await submitScore(score);
    setUserRank(rank);
    setShowLeaderboard(true);
  }
};

// Show leaderboard modal
{showLeaderboard && (
  <LeaderboardModal
    scores={topScores}
    userRank={userRank}
    userScore={score}
    onClose={() => setShowLeaderboard(false)}
  />
)}

HIGH SCORE TRACKING:
const [highScore, setHighScore] = useState(() => {
  return parseInt(localStorage.getItem('wojak-whack-high') || '0', 10);
});

useEffect(() => {
  if (score > highScore) {
    setHighScore(score);
    localStorage.setItem('wojak-whack-high', score.toString());
  }
}, [score, highScore]);

MOBILE POLISH:

1. Touch feedback:
.hole:active .hole-ground {
  transform: scale(0.95);
}

2. Prevent accidental zooming:
<div style={{ touchAction: 'manipulation' }}>

3. Haptic feedback (if available):
const vibrateOnHit = () => {
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
};

4. Larger hit areas on mobile:
.hole {
  min-height: 100px;
  min-width: 100px;
}

STATISTICS TRACKING:
interface GameStats {
  gamesPlayed: number;
  totalScore: number;
  highScore: number;
  bestCombo: number;
  totalMolesWhacked: number;
}

// Track during game
const [stats, setStats] = useState({
  molesWhacked: 0,
  bombsHit: 0,
  maxCombo: 0,
});

// Update on each hit
if (combo > stats.maxCombo) {
  setStats(prev => ({ ...prev, maxCombo: combo }));
}
setStats(prev => ({ ...prev, molesWhacked: prev.molesWhacked + 1 }));

FINAL POLISH:

1. Countdown before start:
const [countdown, setCountdown] = useState<number | null>(null);

const startGame = () => {
  setCountdown(3);
  // Count down 3, 2, 1, GO!
  const interval = setInterval(() => {
    setCountdown(prev => {
      if (prev === 1) {
        clearInterval(interval);
        actuallyStartGame();
        return null;
      }
      return prev! - 1;
    });
  }, 1000);
};

{countdown !== null && (
  <div className="countdown">{countdown === 0 ? 'GO!' : countdown}</div>
)}

2. Pause functionality (optional):
// Pause when tab loses focus
useEffect(() => {
  const handleVisibility = () => {
    if (document.hidden && isPlaying) {
      pauseGame();
    }
  };
  document.addEventListener('visibilitychange', handleVisibility);
  return () => document.removeEventListener('visibilitychange', handleVisibility);
}, [isPlaying]);

3. Difficulty modes:
const DIFFICULTY = {
  easy: { duration: 90, spawnRate: 1000 },
  normal: { duration: 60, spawnRate: 800 },
  hard: { duration: 45, spawnRate: 500 },
};

ACCESSIBILITY:
- aria-label on moles: "Mole appeared in hole 5"
- Sound toggle clearly visible
- High contrast mode for mole types
```

### ✅ Phase 5 Final Checklist

**Audio:**
- [ ] Whack sound plays on hit
- [ ] Different sound for bonus mole (doge)
- [ ] Explosion sound for bomb
- [ ] Pop sound when moles appear
- [ ] Combo milestone sounds
- [ ] Warning beeps in last 10 seconds
- [ ] Game over / high score fanfare
- [ ] Mute toggle works

**Leaderboard:**
- [ ] Score submits correctly
- [ ] Leaderboard shows top players
- [ ] User's rank displayed
- [ ] High score saved locally

**Polish:**
- [ ] Countdown before game starts
- [ ] Responsive on all screen sizes
- [ ] Touch targets large enough on mobile
- [ ] Haptic feedback (if supported)
- [ ] Smooth 60fps performance
- [ ] No memory leaks (timers cleaned up)

**Debug Prompt if audio issues:**
```
Audio isn't working correctly in Wojak Whack.

Issue: [describe]

For rapid-fire sounds (like whack):
1. Is a new Howl instance created for each sound, or reusing one?
2. Consider using sprite audio for rapid sounds
3. Make sure sounds can overlap

For timing issues:
1. Is playPopUp called when mole spawns?
2. Are warning beeps firing every second?

Show me the audio trigger points and the useHowlerSounds setup.
```

---

## Complete File Structure

```
src/games/WojakWhack/
├── WojakWhackGame.tsx     # Main component
├── WojakWhackGame.css     # Styles
├── Hole.tsx               # Individual hole component
├── MoleCharacter.tsx      # Mole visuals
├── GameOverModal.tsx      # End screen
├── types.ts               # TypeScript interfaces
└── constants.ts           # Mole types, difficulty settings

public/assets/
├── sounds/
│   ├── whack.mp3
│   ├── bonus-hit.mp3
│   ├── explosion.mp3
│   ├── pop-up.mp3
│   ├── combo.mp3
│   ├── warning-beep.mp3
│   ├── game-over.mp3
│   └── high-score.mp3
└── moles/
    ├── wojak.png
    ├── pepe.png
    ├── doge.png
    └── bomb.png
```

---

## Mole Type Reference

```typescript
// constants.ts
export const MOLE_TYPES = {
  wojak: {
    points: 10,
    probability: 0.5,
    baseDuration: 1200,
    emoji: '😐',
    colors: ['#ffcc00', '#fff'],
  },
  pepe: {
    points: 25,
    probability: 0.25,
    baseDuration: 900,
    emoji: '🐸',
    colors: ['#00ff00', '#90ee90'],
  },
  doge: {
    points: 50,
    probability: 0.15,
    baseDuration: 600,
    emoji: '🐕',
    colors: ['#ffa500', '#ffcc00'],
  },
  bomb: {
    points: -50,
    probability: 0.1,
    baseDuration: 1500,
    emoji: '💣',
    colors: ['#ff0000', '#ff6600', '#000'],
  },
} as const;

export const COMBO_TIERS = {
  3: { callout: 'NICE!', color: '#ffffff' },
  5: { callout: 'GREAT!', color: '#ffcc00' },
  10: { callout: 'AMAZING!', color: '#ffa500' },
  15: { callout: 'UNSTOPPABLE!', color: '#ff6b00' },
  20: { callout: 'LEGENDARY!', color: '#ff0000' },
  25: { callout: 'GOD MODE!', color: '#ff00ff' },
} as const;
```
