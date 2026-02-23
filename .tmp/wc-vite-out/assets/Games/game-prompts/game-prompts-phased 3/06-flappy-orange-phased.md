# Flappy Orange Game - Phased Build Guide

> **Game ID**: `flappy-orange`
> **Rendering**: Canvas (requestAnimationFrame game loop)
> **Complexity**: Medium
> **Prerequisites**: Run `00-MASTER-INDEX.md` setup first

---

## PHASE 1: Canvas Setup & Orange Character

### Prompt for Claude Code:

```
Create the Flappy Orange game with Canvas rendering for wojak.ink.

GAME OVERVIEW:
- Tap to fly/flap, avoid pipes
- Gravity pulls orange down
- Pass through pipe gaps to score
- One hit = game over
- Simple but addictive

REQUIREMENTS:
1. Create file: src/games/FlappyOrange/FlappyOrangeGame.tsx
2. Use Canvas with requestAnimationFrame
3. Orange theme (#ff6b00 primary)
4. Mobile-first responsive

CANVAS SETUP:
const FlappyOrangeGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { width, height } = useDimensions();
  const isMobile = useIsMobile();

  // Game dimensions
  const gameWidth = isMobile ? width : 400;
  const gameHeight = isMobile ? height - 105 : 600;

  // Game state refs (for animation loop)
  const gameStateRef = useRef({
    isPlaying: false,
    isGameOver: false,
    score: 0,
    orange: {
      x: gameWidth * 0.2,
      y: gameHeight / 2,
      velocity: 0,
      rotation: 0,
      radius: 25,
    },
    pipes: [] as Pipe[],
    frameCount: 0,
  });

  // UI state (triggers re-renders)
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  // Animation frame ref
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Start game loop
    const gameLoop = () => {
      update();
      render(ctx);
      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="flappy-container">
      {/* Score Display */}
      <div className="score-display">{score}</div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={gameWidth}
        height={gameHeight}
        onClick={handleTap}
        onTouchStart={handleTap}
      />

      {/* Start Screen */}
      {!isPlaying && !isGameOver && (
        <div className="start-screen">
          <h1>🍊 Flappy Orange</h1>
          <p>Tap to fly!</p>
          <button onClick={startGame}>START</button>
        </div>
      )}

      {/* Game Over Screen */}
      {isGameOver && (
        <div className="game-over-screen">
          <h2>Game Over!</h2>
          <p>Score: {score}</p>
          <button onClick={restartGame}>Try Again</button>
        </div>
      )}
    </div>
  );
};

GAME CONSTANTS:
const GRAVITY = 0.5;
const FLAP_STRENGTH = -10;
const TERMINAL_VELOCITY = 12;
const ORANGE_RADIUS = 25;

ORANGE PHYSICS (basic):
interface Orange {
  x: number;
  y: number;
  velocity: number;
  rotation: number;
  radius: number;
}

// In update function:
const updateOrange = () => {
  const state = gameStateRef.current;
  if (!state.isPlaying) return;

  // Apply gravity
  state.orange.velocity += GRAVITY;
  state.orange.velocity = Math.min(state.orange.velocity, TERMINAL_VELOCITY);

  // Update position
  state.orange.y += state.orange.velocity;

  // Update rotation based on velocity
  state.orange.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, state.orange.velocity * 0.05));
};

TAP HANDLER:
const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
  e.preventDefault();

  const state = gameStateRef.current;

  if (!state.isPlaying) {
    startGame();
    return;
  }

  if (state.isGameOver) return;

  // Flap!
  state.orange.velocity = FLAP_STRENGTH;
  playFlapSound();
};

RENDER ORANGE:
const renderOrange = (ctx: CanvasRenderingContext2D) => {
  const { orange } = gameStateRef.current;

  ctx.save();
  ctx.translate(orange.x, orange.y);
  ctx.rotate(orange.rotation);

  // Orange body (circle)
  ctx.beginPath();
  ctx.arc(0, 0, orange.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#ff6b00';
  ctx.fill();

  // Orange highlight (shine)
  ctx.beginPath();
  ctx.arc(-8, -8, 8, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fill();

  // Orange stem
  ctx.beginPath();
  ctx.moveTo(0, -orange.radius);
  ctx.lineTo(0, -orange.radius - 8);
  ctx.strokeStyle = '#228B22';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Leaf
  ctx.beginPath();
  ctx.ellipse(6, -orange.radius - 4, 8, 4, Math.PI / 4, 0, Math.PI * 2);
  ctx.fillStyle = '#228B22';
  ctx.fill();

  ctx.restore();
};

RENDER BACKGROUND:
const renderBackground = (ctx: CanvasRenderingContext2D) => {
  // Sky gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, gameHeight);
  gradient.addColorStop(0, '#87CEEB'); // Light blue
  gradient.addColorStop(1, '#E0F7FA'); // Lighter blue

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, gameWidth, gameHeight);

  // Ground
  ctx.fillStyle = '#8B4513'; // Brown
  ctx.fillRect(0, gameHeight - 50, gameWidth, 50);

  // Grass
  ctx.fillStyle = '#228B22';
  ctx.fillRect(0, gameHeight - 50, gameWidth, 10);
};

MAIN RENDER FUNCTION:
const render = (ctx: CanvasRenderingContext2D) => {
  // Clear canvas
  ctx.clearRect(0, 0, gameWidth, gameHeight);

  // Draw layers
  renderBackground(ctx);
  // renderPipes(ctx); // Phase 2
  renderOrange(ctx);
  // renderScore(ctx); // Optional: draw score on canvas
};

GROUND COLLISION (basic):
const checkGroundCollision = (): boolean => {
  const { orange } = gameStateRef.current;
  const groundY = gameHeight - 50;

  // Hit ground
  if (orange.y + orange.radius >= groundY) {
    return true;
  }

  // Hit ceiling
  if (orange.y - orange.radius <= 0) {
    return true;
  }

  return false;
};

DO NOT add pipes yet - just get the orange flying with gravity and tap.
```

### ✅ Phase 1 Checkpoint

**Test these manually:**
- [ ] Canvas renders with sky background
- [ ] Ground renders at bottom
- [ ] Orange character renders with stem and leaf
- [ ] Orange falls due to gravity
- [ ] Tapping makes orange jump up
- [ ] Orange rotates based on velocity (down when falling)
- [ ] Orange can't go above canvas top
- [ ] Hitting ground triggers game over
- [ ] Responsive canvas size on mobile

**Debug Prompt if issues:**
```
The Flappy Orange canvas or physics aren't working. Issues: [describe]

Check:
1. Is canvas getting correct width/height?
2. Is the game loop running (add console.log in update)?
3. Is gameStateRef being mutated correctly?
4. Is gravity being applied every frame?
5. Is the tap handler attached to canvas?

Log: console.log('Orange position:', state.orange.y, 'velocity:', state.orange.velocity);

Show me the update function and the tap handler.
```

---

## PHASE 2: Pipes & Collision Detection

### Prompt for Claude Code:

```
Add pipes and collision detection to Flappy Orange.

CURRENT STATE: Orange flies with tap, but no obstacles.

PIPE INTERFACE:
interface Pipe {
  x: number;
  gapY: number;      // Center of gap
  gapHeight: number; // Size of gap
  width: number;
  passed: boolean;   // For scoring
  id: number;
}

PIPE CONSTANTS:
const PIPE_WIDTH = 60;
const PIPE_GAP = 150;     // Gap height
const PIPE_SPEED = 3;
const PIPE_SPAWN_INTERVAL = 100; // frames between spawns
const MIN_GAP_Y = 100;
const MAX_GAP_Y = gameHeight - 150;

PIPE SPAWNING:
const spawnPipe = () => {
  const state = gameStateRef.current;

  const gapY = MIN_GAP_Y + Math.random() * (MAX_GAP_Y - MIN_GAP_Y);

  const pipe: Pipe = {
    x: gameWidth + PIPE_WIDTH,
    gapY,
    gapHeight: PIPE_GAP,
    width: PIPE_WIDTH,
    passed: false,
    id: Date.now(),
  };

  state.pipes.push(pipe);
};

// In update, spawn pipes at interval
const updatePipes = () => {
  const state = gameStateRef.current;
  if (!state.isPlaying) return;

  state.frameCount++;

  // Spawn new pipe
  if (state.frameCount % PIPE_SPAWN_INTERVAL === 0) {
    spawnPipe();
  }

  // Move pipes
  state.pipes.forEach(pipe => {
    pipe.x -= PIPE_SPEED;

    // Check if passed (for scoring)
    if (!pipe.passed && pipe.x + pipe.width < state.orange.x) {
      pipe.passed = true;
      state.score++;
      setScore(state.score);
      playScoreSound();
    }
  });

  // Remove off-screen pipes
  state.pipes = state.pipes.filter(pipe => pipe.x > -PIPE_WIDTH);
};

RENDER PIPES:
const renderPipes = (ctx: CanvasRenderingContext2D) => {
  const { pipes } = gameStateRef.current;

  pipes.forEach(pipe => {
    // Top pipe (from top to gap)
    const topPipeHeight = pipe.gapY - pipe.gapHeight / 2;

    ctx.fillStyle = '#228B22'; // Green pipes
    ctx.fillRect(pipe.x, 0, pipe.width, topPipeHeight);

    // Top pipe cap
    ctx.fillStyle = '#1B5E20';
    ctx.fillRect(pipe.x - 5, topPipeHeight - 20, pipe.width + 10, 20);

    // Bottom pipe (from gap to ground)
    const bottomPipeY = pipe.gapY + pipe.gapHeight / 2;
    const bottomPipeHeight = gameHeight - 50 - bottomPipeY;

    ctx.fillStyle = '#228B22';
    ctx.fillRect(pipe.x, bottomPipeY, pipe.width, bottomPipeHeight);

    // Bottom pipe cap
    ctx.fillStyle = '#1B5E20';
    ctx.fillRect(pipe.x - 5, bottomPipeY, pipe.width + 10, 20);
  });
};

COLLISION DETECTION:
const checkPipeCollision = (): boolean => {
  const state = gameStateRef.current;
  const { orange, pipes } = state;

  for (const pipe of pipes) {
    // Check if orange is within pipe's x range
    if (orange.x + orange.radius > pipe.x && orange.x - orange.radius < pipe.x + pipe.width) {
      // Check if orange is outside the gap
      const topPipeBottom = pipe.gapY - pipe.gapHeight / 2;
      const bottomPipeTop = pipe.gapY + pipe.gapHeight / 2;

      if (orange.y - orange.radius < topPipeBottom || orange.y + orange.radius > bottomPipeTop) {
        return true; // Collision!
      }
    }
  }

  return false;
};

// More precise circle-rect collision (optional enhancement)
const circleRectCollision = (
  circleX: number,
  circleY: number,
  radius: number,
  rectX: number,
  rectY: number,
  rectWidth: number,
  rectHeight: number
): boolean => {
  const closestX = Math.max(rectX, Math.min(circleX, rectX + rectWidth));
  const closestY = Math.max(rectY, Math.min(circleY, rectY + rectHeight));

  const distanceX = circleX - closestX;
  const distanceY = circleY - closestY;

  return (distanceX * distanceX + distanceY * distanceY) < (radius * radius);
};

UPDATE FUNCTION:
const update = () => {
  const state = gameStateRef.current;

  if (!state.isPlaying || state.isGameOver) return;

  updateOrange();
  updatePipes();

  // Check collisions
  if (checkGroundCollision() || checkPipeCollision()) {
    triggerGameOver();
  }
};

GAME OVER:
const triggerGameOver = () => {
  const state = gameStateRef.current;
  state.isPlaying = false;
  state.isGameOver = true;
  setIsPlaying(false);
  setIsGameOver(true);
  playGameOverSound();
};

RESTART GAME:
const restartGame = () => {
  const state = gameStateRef.current;
  state.orange = {
    x: gameWidth * 0.2,
    y: gameHeight / 2,
    velocity: 0,
    rotation: 0,
    radius: ORANGE_RADIUS,
  };
  state.pipes = [];
  state.score = 0;
  state.frameCount = 0;
  state.isPlaying = true;
  state.isGameOver = false;

  setScore(0);
  setIsPlaying(true);
  setIsGameOver(false);
};

DIFFICULTY SCALING (optional):
Increase difficulty as score increases:

const getDifficultyParams = (score: number) => {
  const speedMultiplier = 1 + Math.min(score * 0.02, 1); // Up to 2x speed
  const gapReduction = Math.min(score * 2, 40); // Gap shrinks

  return {
    pipeSpeed: PIPE_SPEED * speedMultiplier,
    pipeGap: PIPE_GAP - gapReduction,
  };
};
```

### ✅ Phase 2 Checkpoint

**Test these manually:**
- [ ] Pipes spawn from the right
- [ ] Pipes move left continuously
- [ ] Pipes have visible gap in the middle
- [ ] Hitting a pipe triggers game over
- [ ] Passing through gap increases score
- [ ] Score displays correctly
- [ ] Pipes are removed when off-screen
- [ ] Pipe spawn rate feels balanced
- [ ] Gap size is reasonable (not too hard/easy)

**Debug Prompt if issues:**
```
Pipes or collision aren't working in Flappy Orange.

Issue: [describe - e.g., "pipes don't appear" or "collision triggers too early"]

For pipes not appearing:
1. Is spawnPipe being called? (check frameCount)
2. Is pipe x position starting off-screen?
3. Is renderPipes being called in render()?

For collision issues:
1. Log: console.log('Orange Y:', orange.y, 'Gap:', pipe.gapY - pipe.gapHeight/2, 'to', pipe.gapY + pipe.gapHeight/2);
2. Is radius being accounted for correctly?
3. Is the pipe x range check correct?

Show me the checkPipeCollision function.
```

---

## PHASE 3: Visual Polish & Animations

### Prompt for Claude Code:

```
Add visual polish, animations, and particle effects to Flappy Orange.

CURRENT STATE: Gameplay works, needs visual juice.

DEATH ANIMATION:
When game over, orange falls dramatically:

const [deathAnimation, setDeathAnimation] = useState(false);

const triggerGameOver = () => {
  const state = gameStateRef.current;
  state.isPlaying = false;
  setDeathAnimation(true);

  // Let orange fall with spinning
  const fallInterval = setInterval(() => {
    state.orange.velocity += GRAVITY * 2;
    state.orange.y += state.orange.velocity;
    state.orange.rotation += 0.3; // Spin

    if (state.orange.y > gameHeight + 100) {
      clearInterval(fallInterval);
      state.isGameOver = true;
      setIsGameOver(true);
      setDeathAnimation(false);
    }
  }, 16);

  playGameOverSound();
};

PARTICLE TRAIL:
Orange leaves a subtle trail while flying:

interface Particle {
  x: number;
  y: number;
  alpha: number;
  size: number;
}

const particlesRef = useRef<Particle[]>([]);

// In update:
const updateParticles = () => {
  const { orange } = gameStateRef.current;

  // Spawn trail particle every few frames
  if (gameStateRef.current.frameCount % 3 === 0) {
    particlesRef.current.push({
      x: orange.x - 10,
      y: orange.y,
      alpha: 0.5,
      size: 8,
    });
  }

  // Update existing particles
  particlesRef.current = particlesRef.current
    .map(p => ({ ...p, alpha: p.alpha - 0.02, size: p.size * 0.95 }))
    .filter(p => p.alpha > 0);
};

// In render:
const renderParticles = (ctx: CanvasRenderingContext2D) => {
  particlesRef.current.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 107, 0, ${p.alpha})`;
    ctx.fill();
  });
};

SCORE POPUP:
When passing a pipe, show +1 animation:

const [scorePopups, setScorePopups] = useState<{id: number, x: number, y: number}[]>([]);

// When scoring:
setScorePopups(prev => [...prev, {
  id: Date.now(),
  x: pipe.x,
  y: gameHeight / 2,
}]);

setTimeout(() => {
  setScorePopups(prev => prev.filter(p => p.id !== Date.now()));
}, 500);

// Render on canvas:
const renderScorePopups = (ctx: CanvasRenderingContext2D) => {
  scorePopups.forEach((popup, idx) => {
    const age = (Date.now() - popup.id) / 500;
    const y = popup.y - age * 50;
    const alpha = 1 - age;

    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = `rgba(255, 107, 0, ${alpha})`;
    ctx.textAlign = 'center';
    ctx.fillText('+1', popup.x, y);
  });
};

PIPE SHINE/HIGHLIGHT:
Add shine to pipes to make them look 3D:

const renderPipe = (ctx: CanvasRenderingContext2D, pipe: Pipe) => {
  // Main pipe body
  const gradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0);
  gradient.addColorStop(0, '#1B5E20');
  gradient.addColorStop(0.3, '#4CAF50');
  gradient.addColorStop(0.7, '#4CAF50');
  gradient.addColorStop(1, '#1B5E20');

  ctx.fillStyle = gradient;

  // Top pipe
  const topHeight = pipe.gapY - pipe.gapHeight / 2;
  ctx.fillRect(pipe.x, 0, pipe.width, topHeight);

  // Bottom pipe
  const bottomY = pipe.gapY + pipe.gapHeight / 2;
  ctx.fillRect(pipe.x, bottomY, pipe.width, gameHeight - 50 - bottomY);

  // Caps with darker shade
  ctx.fillStyle = '#1B5E20';
  ctx.fillRect(pipe.x - 5, topHeight - 25, pipe.width + 10, 25);
  ctx.fillRect(pipe.x - 5, bottomY, pipe.width + 10, 25);
};

SCROLLING BACKGROUND:
Add parallax clouds:

interface Cloud {
  x: number;
  y: number;
  size: number;
  speed: number;
}

const cloudsRef = useRef<Cloud[]>([
  { x: 100, y: 80, size: 40, speed: 0.5 },
  { x: 300, y: 120, size: 50, speed: 0.3 },
  { x: 500, y: 60, size: 35, speed: 0.4 },
]);

const updateClouds = () => {
  cloudsRef.current.forEach(cloud => {
    cloud.x -= cloud.speed;
    if (cloud.x < -100) {
      cloud.x = gameWidth + 50;
      cloud.y = 50 + Math.random() * 100;
    }
  });
};

const renderClouds = (ctx: CanvasRenderingContext2D) => {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  cloudsRef.current.forEach(cloud => {
    // Draw cloud (3 circles)
    ctx.beginPath();
    ctx.arc(cloud.x, cloud.y, cloud.size * 0.6, 0, Math.PI * 2);
    ctx.arc(cloud.x + cloud.size * 0.5, cloud.y, cloud.size * 0.8, 0, Math.PI * 2);
    ctx.arc(cloud.x + cloud.size, cloud.y, cloud.size * 0.6, 0, Math.PI * 2);
    ctx.fill();
  });
};

SCROLLING GROUND:
Add ground texture that moves:

const groundOffsetRef = useRef(0);

const updateGround = () => {
  groundOffsetRef.current -= PIPE_SPEED;
  if (groundOffsetRef.current <= -50) {
    groundOffsetRef.current = 0;
  }
};

const renderGround = (ctx: CanvasRenderingContext2D) => {
  // Dirt
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(0, gameHeight - 50, gameWidth, 50);

  // Grass with pattern
  ctx.fillStyle = '#228B22';
  ctx.fillRect(0, gameHeight - 50, gameWidth, 12);

  // Grass blades (moving pattern)
  ctx.fillStyle = '#1B5E20';
  for (let x = groundOffsetRef.current; x < gameWidth; x += 25) {
    ctx.beginPath();
    ctx.moveTo(x, gameHeight - 50);
    ctx.lineTo(x + 5, gameHeight - 58);
    ctx.lineTo(x + 10, gameHeight - 50);
    ctx.fill();
  }
};

FLAP EFFECT:
Show a small burst when orange flaps:

const handleTap = () => {
  // ... existing flap code ...

  // Visual flap effect
  spawnFlapBurst();
};

const spawnFlapBurst = () => {
  const { orange } = gameStateRef.current;
  const burstParticles = Array(5).fill(null).map((_, i) => ({
    x: orange.x,
    y: orange.y + orange.radius,
    vx: (Math.random() - 0.5) * 3,
    vy: Math.random() * 3 + 2,
    alpha: 0.6,
    size: 4,
  }));
  particlesRef.current.push(...burstParticles);
};

SCREEN FLASH ON HIT:
Brief red flash when dying:

const [hitFlash, setHitFlash] = useState(false);

const triggerGameOver = () => {
  setHitFlash(true);
  setTimeout(() => setHitFlash(false), 100);
  // ... rest of game over code
};

{hitFlash && <div className="hit-flash" />}

.hit-flash {
  position: absolute;
  inset: 0;
  background: rgba(255, 0, 0, 0.3);
  pointer-events: none;
}
```

### ✅ Phase 3 Checkpoint

**Test these manually:**
- [ ] Orange leaves a trail of particles
- [ ] Clouds move slowly in background
- [ ] Ground appears to scroll
- [ ] Pipes have 3D gradient effect
- [ ] "+1" popup appears when scoring
- [ ] Flap creates small burst effect
- [ ] Death animation shows orange falling/spinning
- [ ] Red flash on collision
- [ ] All animations run at 60fps
- [ ] No visual glitches

**Debug Prompt if issues:**
```
Visual effects aren't working in Flappy Orange.

Issue: [describe - e.g., "particles not showing" or "death animation stuck"]

For particles:
1. Is particlesRef being updated?
2. Is renderParticles called in render()?
3. Are particles being filtered out too quickly?

For death animation:
1. Is the interval being set up correctly?
2. Is the orange position being updated during fall?
3. Is the interval being cleared when orange goes off screen?

Show me the particle update/render code or death animation.
```

---

## PHASE 4: Game States & UI

### Prompt for Claude Code:

```
Add proper game states, UI screens, and transitions to Flappy Orange.

CURRENT STATE: Gameplay works with effects, needs proper state management.

GAME STATES:
enum GameState {
  MENU,      // Title screen
  READY,     // About to start (tap to begin)
  PLAYING,   // Active gameplay
  DYING,     // Death animation
  GAME_OVER  // Game over screen
}

const [gameState, setGameState] = useState<GameState>(GameState.MENU);

STATE TRANSITIONS:

// MENU → READY
const showReady = () => {
  setGameState(GameState.READY);
  // Reset position
  resetOrange();
};

// READY → PLAYING (on tap)
const startPlaying = () => {
  setGameState(GameState.PLAYING);
  gameStateRef.current.isPlaying = true;
};

// PLAYING → DYING (on collision)
const startDying = () => {
  setGameState(GameState.DYING);
  gameStateRef.current.isPlaying = false;
  // Start death animation
  // After animation: setGameState(GameState.GAME_OVER)
};

// GAME_OVER → READY (on tap/button)
const restart = () => {
  resetGame();
  setGameState(GameState.READY);
};

TAP HANDLER BY STATE:
const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
  e.preventDefault();

  switch (gameState) {
    case GameState.MENU:
      showReady();
      break;
    case GameState.READY:
      startPlaying();
      flap();
      break;
    case GameState.PLAYING:
      flap();
      break;
    case GameState.DYING:
      // Ignore taps during death
      break;
    case GameState.GAME_OVER:
      restart();
      break;
  }
};

MENU SCREEN:
{gameState === GameState.MENU && (
  <div className="menu-screen">
    <div className="logo">
      <span className="orange-emoji">🍊</span>
      <h1>Flappy Orange</h1>
    </div>
    <div className="best-score">
      Best: {highScore}
    </div>
    <button className="play-btn" onClick={showReady}>
      PLAY
    </button>
    <div className="credits">
      wojak.ink
    </div>
  </div>
)}

.menu-screen {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
}

.logo {
  text-align: center;
  margin-bottom: 30px;
}

.orange-emoji {
  font-size: 80px;
  animation: bounce 1s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

.logo h1 {
  color: #ff6b00;
  font-size: 36px;
  text-shadow: 2px 2px 0 #000;
  margin-top: 10px;
}

READY SCREEN:
{gameState === GameState.READY && (
  <div className="ready-screen">
    <div className="tap-hint">
      <span className="hand">👆</span>
      <p>TAP TO FLY</p>
    </div>
  </div>
)}

.ready-screen {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.tap-hint {
  text-align: center;
  animation: pulse 1s ease-in-out infinite;
}

.hand {
  font-size: 60px;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(0.95); }
}

GAME OVER SCREEN:
{gameState === GameState.GAME_OVER && (
  <div className="game-over-screen">
    <h2>GAME OVER</h2>

    <div className="score-board">
      <div className="score-row">
        <span>Score</span>
        <span className="value">{score}</span>
      </div>
      <div className="score-row">
        <span>Best</span>
        <span className="value">{highScore}</span>
      </div>
    </div>

    {score > prevHighScore && (
      <div className="new-best">🎉 NEW BEST! 🎉</div>
    )}

    {/* Medal based on score */}
    <div className="medal">
      {getMedal(score)}
    </div>

    <div className="buttons">
      <button onClick={restart}>
        🔄 RETRY
      </button>
      <button onClick={submitScore}>
        🏆 LEADERBOARD
      </button>
      <button onClick={shareScore}>
        📤 SHARE
      </button>
    </div>
  </div>
)}

MEDAL SYSTEM:
const getMedal = (score: number): string => {
  if (score >= 40) return '🥇 Gold Medal!';
  if (score >= 20) return '🥈 Silver Medal!';
  if (score >= 10) return '🥉 Bronze Medal!';
  return '';
};

SHARE FUNCTIONALITY:
const shareScore = async () => {
  const text = `🍊 I scored ${score} in Flappy Orange! Can you beat me?\n\nPlay at wojak.ink`;

  if (navigator.share) {
    await navigator.share({ text });
  } else {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!');
  }
};

PAUSE WHEN TAB HIDDEN:
useEffect(() => {
  const handleVisibility = () => {
    if (document.hidden && gameState === GameState.PLAYING) {
      // Pause the game
      gameStateRef.current.isPlaying = false;
      setGameState(GameState.READY); // Or show pause menu
    }
  };

  document.addEventListener('visibilitychange', handleVisibility);
  return () => document.removeEventListener('visibilitychange', handleVisibility);
}, [gameState]);

COUNTDOWN BEFORE START (optional):
Show 3-2-1 before starting:

const [countdown, setCountdown] = useState<number | null>(null);

const showReady = () => {
  setCountdown(3);
  const interval = setInterval(() => {
    setCountdown(prev => {
      if (prev === 1) {
        clearInterval(interval);
        setGameState(GameState.READY);
        return null;
      }
      return prev! - 1;
    });
  }, 1000);
};

{countdown !== null && (
  <div className="countdown">{countdown}</div>
)}
```

### ✅ Phase 4 Checkpoint

**Test these manually:**
- [ ] Menu screen shows on load
- [ ] Orange bounces on menu screen
- [ ] Best score displays on menu
- [ ] PLAY button transitions to ready state
- [ ] "TAP TO FLY" hint pulses
- [ ] First tap starts game
- [ ] Game over screen shows after death
- [ ] Score and best score display correctly
- [ ] New best indicator appears when beating high score
- [ ] Medal displays based on score
- [ ] Retry button works
- [ ] Share copies text to clipboard
- [ ] Game pauses when tab hidden

**Debug Prompt if issues:**
```
Game state transitions aren't working in Flappy Orange.

Issue: [describe - e.g., "stuck on menu" or "can't restart"]

Check:
1. Is gameState being updated correctly?
2. Is the tap handler checking the right state?
3. Is resetGame clearing all refs and state?

Log: console.log('Game state:', gameState);
Log: console.log('Tap in state:', gameState);

Show me the handleTap function and state transition functions.
```

---

## PHASE 5: Audio, Leaderboard & Final Polish

### Prompt for Claude Code:

```
Add Howler.js audio, leaderboard, and final polish to Flappy Orange.

CURRENT STATE: Full game with UI, needs audio and leaderboard.

AUDIO INTEGRATION:

Sounds needed:
- Flap (wing sound)
- Score (point gained)
- Hit (collision)
- Die (fall)
- Swoosh (menu transition)
- Medal (achievement)

const {
  playFlap,
  playScore,
  playHit,
  playDie,
  playSwoosh,
  playMedal,
  setMuted
} = useHowlerSounds();

// Triggers:
// On flap:
playFlap();

// On scoring:
playScore();

// On collision:
playHit();

// Death animation complete:
playDie();

// Menu transitions:
playSwoosh();

// Show medal:
if (getMedal(score)) {
  setTimeout(playMedal, 500); // Delay for effect
}

MUTE TOGGLE:
const [isMuted, setIsMuted] = useState(false);

<button
  className="mute-btn"
  onClick={() => {
    setIsMuted(!isMuted);
    setMuted(!isMuted);
  }}
>
  {isMuted ? '🔇' : '🔊'}
</button>

LEADERBOARD INTEGRATION:

import { useLeaderboard } from '../../hooks/useLeaderboard';

const { submitScore: submitToLeaderboard, getTopScores, getUserRank } = useLeaderboard('flappy-orange');

const submitScore = async () => {
  if (score > 0) {
    const rank = await submitToLeaderboard(score);
    setUserRank(rank);
    setShowLeaderboard(true);
  }
};

// Leaderboard modal
{showLeaderboard && (
  <LeaderboardModal
    gameId="flappy-orange"
    userScore={score}
    userRank={userRank}
    onClose={() => setShowLeaderboard(false)}
  />
)}

HIGH SCORE PERSISTENCE:
const [highScore, setHighScore] = useState(() =>
  parseInt(localStorage.getItem('flappy-high') || '0', 10)
);

useEffect(() => {
  if (score > highScore) {
    setHighScore(score);
    localStorage.setItem('flappy-high', score.toString());
  }
}, [score]);

MOBILE OPTIMIZATIONS:

1. Prevent double-tap zoom:
canvas {
  touch-action: manipulation;
}

2. Full-screen mode (optional):
const requestFullscreen = () => {
  const elem = document.documentElement;
  if (elem.requestFullscreen) {
    elem.requestFullscreen();
  }
};

3. Orientation lock hint:
{!isMobile && (
  <div className="rotate-hint">
    📱 Rotate for best experience
  </div>
)}

4. Performance: Use offscreen canvas for complex renders:
const offscreenCanvas = useRef<HTMLCanvasElement>();

useEffect(() => {
  offscreenCanvas.current = document.createElement('canvas');
  // Pre-render static elements
}, []);

HAPTIC FEEDBACK:
const vibrate = (pattern: number | number[]) => {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

// On flap:
vibrate(10);

// On hit:
vibrate([50, 50, 50]);

PERFORMANCE OPTIMIZATIONS:

1. Object pooling for pipes:
const pipePool: Pipe[] = [];

const getPipe = () => pipePool.pop() || createPipe();
const returnPipe = (pipe: Pipe) => pipePool.push(pipe);

2. Reduce particle count on low-end devices:
const isLowEnd = navigator.hardwareConcurrency <= 2;
const particleCount = isLowEnd ? 3 : 8;

3. Skip frames on lag:
let lastTime = 0;
const gameLoop = (time: number) => {
  const delta = time - lastTime;
  if (delta < 32) { // Skip if more than ~30fps
    update(delta / 16.67); // Normalize to 60fps
  }
  lastTime = time;
  render(ctx);
  requestAnimationFrame(gameLoop);
};

FINAL POLISH:

1. Loading screen while assets load
2. Smooth fade transitions between states
3. Canvas resolution for retina displays:
const dpr = window.devicePixelRatio || 1;
canvas.width = gameWidth * dpr;
canvas.height = gameHeight * dpr;
ctx.scale(dpr, dpr);

4. Day/Night mode based on time:
const isNight = new Date().getHours() >= 20 || new Date().getHours() < 6;
// Adjust sky gradient accordingly

5. Achievements (optional):
- First point
- Score 10
- Score 25
- Score 50
- Play 10 games

ACCESSIBILITY:
- Keyboard support (Space to flap)
- Reduced motion option
- High contrast mode
```

### ✅ Phase 5 Final Checklist

**Audio:**
- [ ] Flap sound plays on tap
- [ ] Score sound plays when passing pipe
- [ ] Hit sound on collision
- [ ] Die sound when falling off screen
- [ ] Swoosh on menu transitions
- [ ] Medal sound when earning medal
- [ ] Mute button works

**Leaderboard:**
- [ ] Score submits correctly
- [ ] Leaderboard displays top players
- [ ] User's rank shown
- [ ] High score persists locally

**Mobile:**
- [ ] No zoom on double-tap
- [ ] Smooth touch response
- [ ] Haptic feedback (if supported)
- [ ] Retina display looks sharp
- [ ] Performance stays at 60fps

**Polish:**
- [ ] Transitions are smooth
- [ ] No memory leaks (canvas cleanup)
- [ ] Space bar works as alternative to tap
- [ ] Game pauses when tab hidden
- [ ] Share generates correct text

**Debug Prompt if audio issues:**
```
Audio isn't working in Flappy Orange.

Issue: [describe]

For iOS:
1. Audio requires user interaction first
2. Add touch handler that calls Howler.ctx?.resume()
3. Check that sounds are loaded before playing

For performance:
1. Are sounds being played too frequently?
2. Consider using audio sprites for rapid sounds

Show me where playFlap is called and the Howler setup.
```

---

## Complete File Structure

```
src/games/FlappyOrange/
├── FlappyOrangeGame.tsx   # Main component
├── FlappyOrangeGame.css   # Styles
├── types.ts               # Interfaces (Orange, Pipe, Particle, GameState)
├── constants.ts           # Game physics values
├── renderer.ts            # Canvas rendering functions
└── utils.ts               # Collision detection, etc.

public/assets/sounds/
├── flap.mp3
├── score.mp3
├── hit.mp3
├── die.mp3
├── swoosh.mp3
└── medal.mp3
```

---

## Physics Constants Reference

```typescript
// constants.ts
export const PHYSICS = {
  GRAVITY: 0.5,
  FLAP_STRENGTH: -10,
  TERMINAL_VELOCITY: 12,
  ORANGE_RADIUS: 25,
} as const;

export const PIPES = {
  WIDTH: 60,
  GAP: 150,          // Start gap (can decrease with difficulty)
  SPEED: 3,          // Start speed (can increase)
  SPAWN_INTERVAL: 100, // Frames between spawns
  MIN_GAP_Y: 100,
  MAX_GAP_Y_OFFSET: 150, // From bottom
} as const;

export const DIFFICULTY = {
  SPEED_INCREASE_PER_SCORE: 0.02,
  MAX_SPEED_MULTIPLIER: 2,
  GAP_DECREASE_PER_SCORE: 2,
  MIN_GAP: 110,
} as const;
```
