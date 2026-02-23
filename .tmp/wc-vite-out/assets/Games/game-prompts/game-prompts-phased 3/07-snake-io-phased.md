# Orange Snake.io Game - Phased Build Guide

> **Game ID**: `orange-snake`
> **Rendering**: Canvas (requestAnimationFrame game loop)
> **Complexity**: Medium-High
> **Prerequisites**: Run `00-MASTER-INDEX.md` setup first

---

## PHASE 1: Canvas Setup & Snake Movement

### Prompt for Claude Code:

```
Create the Orange Snake.io game with Canvas rendering for wojak.ink.

GAME OVERVIEW:
- Classic snake that grows when eating food
- Swipe/drag to change direction
- Hit walls or self = game over
- Continuous movement (not grid-based steps)
- Slither.io inspired smooth movement

REQUIREMENTS:
1. Create file: src/games/OrangeSnake/OrangeSnakeGame.tsx
2. Use Canvas with requestAnimationFrame
3. Orange theme (#ff6b00 primary)
4. Mobile-first with swipe controls

CANVAS SETUP:
const OrangeSnakeGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { width, height } = useDimensions();
  const isMobile = useIsMobile();

  // Game dimensions
  const gameWidth = isMobile ? width : 500;
  const gameHeight = isMobile ? height - 105 : 500;

  // Game state ref for animation loop
  const gameStateRef = useRef({
    isPlaying: false,
    isGameOver: false,
    score: 0,
    snake: {
      segments: [{ x: gameWidth / 2, y: gameHeight / 2 }] as Point[],
      direction: 0, // Angle in radians
      targetDirection: 0,
      speed: 3,
      segmentRadius: 15,
    },
    food: [] as Food[],
    frameCount: 0,
  });

  // UI state
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const animationRef = useRef<number>();

  return (
    <div className="snake-container">
      <div className="score-display">{score}</div>

      <canvas
        ref={canvasRef}
        width={gameWidth}
        height={gameHeight}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
      />

      {/* UI overlays... */}
    </div>
  );
};

INTERFACES:
interface Point {
  x: number;
  y: number;
}

interface Food {
  x: number;
  y: number;
  radius: number;
  color: string;
  points: number;
  id: number;
}

SNAKE CONSTANTS:
const SNAKE_SPEED = 3;
const SEGMENT_RADIUS = 15;
const SEGMENT_SPACING = 10; // Distance between segment centers
const TURN_SPEED = 0.15; // How fast snake can turn
const INITIAL_LENGTH = 5;

INITIAL SNAKE SETUP:
const initSnake = () => {
  const state = gameStateRef.current;
  const startX = gameWidth / 2;
  const startY = gameHeight / 2;

  // Create initial segments in a line
  const segments: Point[] = [];
  for (let i = 0; i < INITIAL_LENGTH; i++) {
    segments.push({
      x: startX - i * SEGMENT_SPACING,
      y: startY,
    });
  }

  state.snake = {
    segments,
    direction: 0, // Facing right
    targetDirection: 0,
    speed: SNAKE_SPEED,
    segmentRadius: SEGMENT_RADIUS,
  };
};

MOVEMENT (smooth slither style):
const updateSnake = () => {
  const state = gameStateRef.current;
  if (!state.isPlaying) return;

  const { snake } = state;

  // Smooth turn towards target direction
  let angleDiff = snake.targetDirection - snake.direction;

  // Normalize angle difference to -PI to PI
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

  // Apply turn speed
  if (Math.abs(angleDiff) < TURN_SPEED) {
    snake.direction = snake.targetDirection;
  } else {
    snake.direction += Math.sign(angleDiff) * TURN_SPEED;
  }

  // Move head
  const head = snake.segments[0];
  const newHead = {
    x: head.x + Math.cos(snake.direction) * snake.speed,
    y: head.y + Math.sin(snake.direction) * snake.speed,
  };

  // Add new head
  snake.segments.unshift(newHead);

  // Remove tail (unless growing - handled separately)
  if (snake.segments.length > getTargetLength()) {
    snake.segments.pop();
  }
};

// Segments follow the one in front
// (The unshift/pop method naturally creates following behavior)

DIRECTION CONTROL (touch/mouse):
const touchStartRef = useRef<Point | null>(null);

const handleTouchStart = (e: React.TouchEvent) => {
  const touch = e.touches[0];
  const rect = canvasRef.current!.getBoundingClientRect();
  touchStartRef.current = {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top,
  };
};

const handleTouchMove = (e: React.TouchEvent) => {
  if (!touchStartRef.current) return;
  e.preventDefault();

  const touch = e.touches[0];
  const rect = canvasRef.current!.getBoundingClientRect();
  const current = {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top,
  };

  // Calculate direction from touch start to current
  updateTargetDirection(touchStartRef.current, current);
};

// Alternative: Point towards finger
const handleTouchMoveFollow = (e: React.TouchEvent) => {
  const touch = e.touches[0];
  const rect = canvasRef.current!.getBoundingClientRect();
  const touchPoint = {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top,
  };

  const head = gameStateRef.current.snake.segments[0];
  const angle = Math.atan2(touchPoint.y - head.y, touchPoint.x - head.x);
  gameStateRef.current.snake.targetDirection = angle;
};

// Mouse controls (desktop)
const handleMouseMove = (e: React.MouseEvent) => {
  if (!gameStateRef.current.isPlaying) return;

  const rect = canvasRef.current!.getBoundingClientRect();
  const mousePoint = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };

  const head = gameStateRef.current.snake.segments[0];
  const angle = Math.atan2(mousePoint.y - head.y, mousePoint.x - head.x);
  gameStateRef.current.snake.targetDirection = angle;
};

RENDER SNAKE:
const renderSnake = (ctx: CanvasRenderingContext2D) => {
  const { snake } = gameStateRef.current;

  // Draw segments from tail to head
  snake.segments.slice().reverse().forEach((segment, idx) => {
    const actualIdx = snake.segments.length - 1 - idx;
    const isHead = actualIdx === 0;

    // Gradient from tail to head
    const ratio = actualIdx / snake.segments.length;
    const alpha = 0.5 + ratio * 0.5;

    ctx.beginPath();
    ctx.arc(segment.x, segment.y, snake.segmentRadius, 0, Math.PI * 2);

    if (isHead) {
      // Head is brighter
      ctx.fillStyle = '#ff6b00';
    } else {
      ctx.fillStyle = `rgba(255, 107, 0, ${alpha})`;
    }
    ctx.fill();

    // Outline
    ctx.strokeStyle = '#cc5500';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // Draw eyes on head
  const head = snake.segments[0];
  const eyeOffset = snake.segmentRadius * 0.4;
  const eyeRadius = 5;

  // Calculate eye positions based on direction
  const perpAngle = snake.direction + Math.PI / 2;

  const leftEye = {
    x: head.x + Math.cos(snake.direction) * eyeOffset + Math.cos(perpAngle) * eyeOffset * 0.6,
    y: head.y + Math.sin(snake.direction) * eyeOffset + Math.sin(perpAngle) * eyeOffset * 0.6,
  };

  const rightEye = {
    x: head.x + Math.cos(snake.direction) * eyeOffset - Math.cos(perpAngle) * eyeOffset * 0.6,
    y: head.y + Math.sin(snake.direction) * eyeOffset - Math.sin(perpAngle) * eyeOffset * 0.6,
  };

  // White of eyes
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(leftEye.x, leftEye.y, eyeRadius, 0, Math.PI * 2);
  ctx.arc(rightEye.x, rightEye.y, eyeRadius, 0, Math.PI * 2);
  ctx.fill();

  // Pupils
  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.arc(leftEye.x + Math.cos(snake.direction) * 2, leftEye.y + Math.sin(snake.direction) * 2, 3, 0, Math.PI * 2);
  ctx.arc(rightEye.x + Math.cos(snake.direction) * 2, rightEye.y + Math.sin(snake.direction) * 2, 3, 0, Math.PI * 2);
  ctx.fill();
};

RENDER BACKGROUND:
const renderBackground = (ctx: CanvasRenderingContext2D) => {
  // Dark background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, gameWidth, gameHeight);

  // Grid pattern
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;

  const gridSize = 40;
  for (let x = 0; x <= gameWidth; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, gameHeight);
    ctx.stroke();
  }
  for (let y = 0; y <= gameHeight; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(gameWidth, y);
    ctx.stroke();
  }
};

DO NOT add food or collisions yet - just get the snake moving smoothly.
```

### ✅ Phase 1 Checkpoint

**Test these manually:**
- [ ] Canvas renders with dark grid background
- [ ] Snake renders with multiple segments
- [ ] Snake head has visible eyes
- [ ] Snake moves continuously
- [ ] Touch/drag changes snake direction
- [ ] Mouse position controls direction on desktop
- [ ] Snake turns smoothly (not instant)
- [ ] Segments follow the head naturally
- [ ] Snake wraps at edges OR stays within bounds

**Debug Prompt if issues:**
```
The Snake movement isn't working correctly. Issues: [describe]

Check:
1. Is the game loop running? (add console.log in update)
2. Is targetDirection being set from input?
3. Is direction smoothly interpolating towards targetDirection?
4. Are segments being unshift/pop correctly?

Log: console.log('Head:', snake.segments[0], 'Direction:', snake.direction);

Show me the updateSnake function and input handlers.
```

---

## PHASE 2: Food & Eating Mechanics

### Prompt for Claude Code:

```
Add food spawning and eating mechanics to Orange Snake.io.

CURRENT STATE: Snake moves smoothly, but nothing to eat.

FOOD INTERFACE:
interface Food {
  x: number;
  y: number;
  radius: number;
  color: string;
  points: number;
  id: number;
  pulsePhase: number; // For animation
}

FOOD TYPES:
const FOOD_TYPES = [
  { color: '#ff6b00', radius: 8, points: 1, probability: 0.6 },   // Orange bit
  { color: '#ffa500', radius: 10, points: 2, probability: 0.25 }, // Mandarin
  { color: '#ffcc00', radius: 12, points: 5, probability: 0.1 },  // Golden orange
  { color: '#ff0000', radius: 15, points: 10, probability: 0.05 }, // Blood orange (rare)
];

FOOD SPAWNING:
const spawnFood = () => {
  const state = gameStateRef.current;

  // Don't spawn too much food
  if (state.food.length >= 15) return;

  // Pick random type based on probability
  const rand = Math.random();
  let cumulative = 0;
  let foodType = FOOD_TYPES[0];

  for (const type of FOOD_TYPES) {
    cumulative += type.probability;
    if (rand < cumulative) {
      foodType = type;
      break;
    }
  }

  // Random position (away from edges)
  const padding = 30;
  const food: Food = {
    x: padding + Math.random() * (gameWidth - padding * 2),
    y: padding + Math.random() * (gameHeight - padding * 2),
    radius: foodType.radius,
    color: foodType.color,
    points: foodType.points,
    id: Date.now() + Math.random(),
    pulsePhase: Math.random() * Math.PI * 2,
  };

  state.food.push(food);
};

// Spawn food periodically
const updateFood = () => {
  const state = gameStateRef.current;
  state.frameCount++;

  // Spawn new food every ~60 frames
  if (state.frameCount % 60 === 0) {
    spawnFood();
  }

  // Update pulse animation
  state.food.forEach(f => {
    f.pulsePhase += 0.1;
  });
};

INITIAL FOOD:
const startGame = () => {
  // ... existing setup ...

  // Spawn initial food
  for (let i = 0; i < 10; i++) {
    spawnFood();
  }
};

EATING DETECTION:
const checkFoodCollision = () => {
  const state = gameStateRef.current;
  const head = state.snake.segments[0];
  const eatDistance = state.snake.segmentRadius;

  state.food = state.food.filter(food => {
    const dist = Math.hypot(head.x - food.x, head.y - food.y);

    if (dist < eatDistance + food.radius) {
      // Eat the food!
      eatFood(food);
      return false; // Remove from array
    }
    return true;
  });
};

EATING HANDLER:
const targetLengthRef = useRef(INITIAL_LENGTH);

const eatFood = (food: Food) => {
  const state = gameStateRef.current;

  // Increase score
  state.score += food.points;
  setScore(state.score);

  // Grow snake
  targetLengthRef.current += food.points;

  // Effects
  playEatSound();
  spawnEatParticles(food);

  // Spawn replacement food
  spawnFood();
};

const getTargetLength = () => targetLengthRef.current;

RENDER FOOD:
const renderFood = (ctx: CanvasRenderingContext2D) => {
  const { food } = gameStateRef.current;

  food.forEach(f => {
    // Pulsing effect
    const pulse = 1 + Math.sin(f.pulsePhase) * 0.1;
    const radius = f.radius * pulse;

    // Glow effect
    const gradient = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, radius * 2);
    gradient.addColorStop(0, f.color);
    gradient.addColorStop(0.5, f.color + '80');
    gradient.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(f.x, f.y, radius * 2, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Main food circle
    ctx.beginPath();
    ctx.arc(f.x, f.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = f.color;
    ctx.fill();

    // Shine
    ctx.beginPath();
    ctx.arc(f.x - radius * 0.3, f.y - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();
  });
};

EAT PARTICLES:
const particlesRef = useRef<Particle[]>([]);

const spawnEatParticles = (food: Food) => {
  const count = food.points * 3;
  const particles: Particle[] = Array(count).fill(null).map(() => ({
    x: food.x,
    y: food.y,
    vx: (Math.random() - 0.5) * 8,
    vy: (Math.random() - 0.5) * 8,
    color: food.color,
    alpha: 1,
    size: 4 + Math.random() * 4,
  }));

  particlesRef.current.push(...particles);
};

const updateParticles = () => {
  particlesRef.current = particlesRef.current
    .map(p => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      vx: p.vx * 0.95,
      vy: p.vy * 0.95,
      alpha: p.alpha - 0.03,
      size: p.size * 0.98,
    }))
    .filter(p => p.alpha > 0);
};

const renderParticles = (ctx: CanvasRenderingContext2D) => {
  particlesRef.current.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = `${p.color}${Math.floor(p.alpha * 255).toString(16).padStart(2, '0')}`;
    ctx.fill();
  });
};

SCORE POPUP ON EAT:
const [scorePopups, setScorePopups] = useState<{id: number, x: number, y: number, value: number}[]>([]);

// In eatFood:
setScorePopups(prev => [...prev, {
  id: Date.now(),
  x: food.x,
  y: food.y,
  value: food.points,
}]);

setTimeout(() => {
  setScorePopups(prev => prev.filter(p => p.id !== Date.now()));
}, 600);
```

### ✅ Phase 2 Checkpoint

**Test these manually:**
- [ ] Food spawns on game start
- [ ] Food appears as glowing circles
- [ ] Food pulses (size animation)
- [ ] Different food colors/sizes appear
- [ ] Moving head over food "eats" it
- [ ] Score increases when eating
- [ ] Snake grows when eating
- [ ] Particles burst when eating
- [ ] Score popup shows points gained
- [ ] New food spawns after eating

**Debug Prompt if issues:**
```
Food or eating mechanics aren't working in Snake.io.

Issue: [describe - e.g., "food doesn't appear" or "can't eat food"]

For food spawning:
1. Is spawnFood being called?
2. Is food array being populated?
3. Is renderFood being called?

For eating:
1. Is checkFoodCollision in the update loop?
2. Is the distance calculation correct?
3. Is targetLength increasing?

Log: console.log('Food count:', state.food.length);
Log: console.log('Head pos:', head, 'Nearest food:', state.food[0]);

Show me checkFoodCollision and eatFood functions.
```

---

## PHASE 3: Collisions & Game Over

### Prompt for Claude Code:

```
Add wall collision, self collision, and game over to Orange Snake.io.

CURRENT STATE: Snake moves and eats, but never dies.

WALL COLLISION:
const checkWallCollision = (): boolean => {
  const { snake } = gameStateRef.current;
  const head = snake.segments[0];
  const r = snake.segmentRadius;

  // Check all four walls
  if (head.x - r < 0 || head.x + r > gameWidth ||
      head.y - r < 0 || head.y + r > gameHeight) {
    return true;
  }

  return false;
};

// Alternative: Wrap around edges (no wall death)
const wrapPosition = () => {
  const { snake } = gameStateRef.current;
  const head = snake.segments[0];

  if (head.x < 0) head.x = gameWidth;
  if (head.x > gameWidth) head.x = 0;
  if (head.y < 0) head.y = gameHeight;
  if (head.y > gameHeight) head.y = 0;
};

SELF COLLISION:
const checkSelfCollision = (): boolean => {
  const { snake } = gameStateRef.current;
  const head = snake.segments[0];
  const collisionRadius = snake.segmentRadius * 0.8;

  // Skip first few segments (can't collide with neck)
  for (let i = 10; i < snake.segments.length; i++) {
    const segment = snake.segments[i];
    const dist = Math.hypot(head.x - segment.x, head.y - segment.y);

    if (dist < collisionRadius * 2) {
      return true;
    }
  }

  return false;
};

COLLISION CHECK IN UPDATE:
const update = () => {
  const state = gameStateRef.current;
  if (!state.isPlaying || state.isGameOver) return;

  updateSnake();
  updateFood();
  checkFoodCollision();
  updateParticles();

  // Check death conditions
  if (checkWallCollision() || checkSelfCollision()) {
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
  triggerDeathEffect();
};

DEATH EFFECT (snake explodes into particles):
const triggerDeathEffect = () => {
  const { snake } = gameStateRef.current;

  // Each segment becomes particles
  snake.segments.forEach((segment, idx) => {
    setTimeout(() => {
      const count = 8;
      const particles: Particle[] = Array(count).fill(null).map(() => ({
        x: segment.x,
        y: segment.y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        color: '#ff6b00',
        alpha: 1,
        size: 6 + Math.random() * 6,
      }));
      particlesRef.current.push(...particles);
    }, idx * 20); // Stagger explosion
  });

  // Clear snake after explosion
  setTimeout(() => {
    gameStateRef.current.snake.segments = [];
  }, snake.segments.length * 20);
};

SCREEN FLASH ON DEATH:
const [deathFlash, setDeathFlash] = useState(false);

const triggerGameOver = () => {
  // ... existing code ...
  setDeathFlash(true);
  setTimeout(() => setDeathFlash(false), 150);
};

{deathFlash && <div className="death-flash" />}

.death-flash {
  position: absolute;
  inset: 0;
  background: rgba(255, 0, 0, 0.4);
  pointer-events: none;
  animation: flash 0.15s ease-out;
}

SCREEN SHAKE:
const [shaking, setShaking] = useState(false);

const triggerScreenShake = () => {
  setShaking(true);
  setTimeout(() => setShaking(false), 300);
};

<canvas className={shaking ? 'shake' : ''} ... />

.shake {
  animation: shake 0.3s ease-out;
}

@keyframes shake {
  0%, 100% { transform: translate(0); }
  20% { transform: translate(-8px, 4px); }
  40% { transform: translate(8px, -4px); }
  60% { transform: translate(-4px, 8px); }
  80% { transform: translate(4px, -8px); }
}

VISUALIZE COLLISION AREAS (debug mode):
const DEBUG = false;

const renderDebug = (ctx: CanvasRenderingContext2D) => {
  if (!DEBUG) return;

  const { snake } = gameStateRef.current;

  // Show collision radius
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
  ctx.lineWidth = 1;

  snake.segments.forEach((segment, idx) => {
    if (idx >= 10) {
      ctx.beginPath();
      ctx.arc(segment.x, segment.y, snake.segmentRadius * 0.8 * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  // Show wall boundaries
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
  ctx.strokeRect(
    snake.segmentRadius,
    snake.segmentRadius,
    gameWidth - snake.segmentRadius * 2,
    gameHeight - snake.segmentRadius * 2
  );
};

GAME OVER UI:
{isGameOver && (
  <div className="game-over-overlay">
    <div className="game-over-modal">
      <h2>Game Over!</h2>
      <div className="final-score">
        <span>Score</span>
        <span className="value">{score}</span>
      </div>
      <div className="length">
        Length: {targetLengthRef.current}
      </div>
      {score > highScore && (
        <div className="new-record">🎉 NEW BEST! 🎉</div>
      )}
      <div className="buttons">
        <button onClick={restartGame}>Play Again</button>
        <button onClick={submitScore}>Leaderboard</button>
      </div>
    </div>
  </div>
)}

RESTART GAME:
const restartGame = () => {
  const state = gameStateRef.current;

  // Reset snake
  targetLengthRef.current = INITIAL_LENGTH;
  initSnake();

  // Reset food
  state.food = [];
  for (let i = 0; i < 10; i++) {
    spawnFood();
  }

  // Reset particles
  particlesRef.current = [];

  // Reset score
  state.score = 0;
  setScore(0);

  // Reset state
  state.frameCount = 0;
  state.isPlaying = true;
  state.isGameOver = false;

  setIsPlaying(true);
  setIsGameOver(false);
};
```

### ✅ Phase 3 Checkpoint

**Test these manually:**
- [ ] Hitting wall triggers game over
- [ ] Hitting own tail triggers game over
- [ ] Can't collide with neck area (grace zone)
- [ ] Death explosion effect plays
- [ ] Screen flashes red on death
- [ ] Screen shakes on death
- [ ] Game over modal appears
- [ ] Final score shows correctly
- [ ] New high score indicator works
- [ ] Play Again restarts everything

**Debug Prompt if issues:**
```
Collision detection isn't working correctly in Snake.io.

Issue: [describe - e.g., "dies immediately" or "can go through self"]

For wall collision:
1. Is the head position being checked correctly?
2. Is segmentRadius being accounted for?

For self collision:
1. Is the skip count (10) enough to avoid neck?
2. Is the distance calculation correct?
3. Is collisionRadius set appropriately?

Log: console.log('Head:', head, 'Wall check:', checkWallCollision());
Log: console.log('Self collision check:', checkSelfCollision());

Show me checkWallCollision and checkSelfCollision functions.
```

---

## PHASE 4: Effects & Visual Polish

### Prompt for Claude Code:

```
Add visual polish, effects, and juice to Orange Snake.io.

CURRENT STATE: Gameplay complete, needs visual refinement.

IMPROVED SNAKE RENDERING (gradient body):
const renderSnake = (ctx: CanvasRenderingContext2D) => {
  const { snake } = gameStateRef.current;
  const segments = snake.segments;

  // Draw body segments with connected curves
  if (segments.length > 1) {
    ctx.beginPath();
    ctx.moveTo(segments[0].x, segments[0].y);

    // Create smooth curve through segments
    for (let i = 1; i < segments.length - 1; i++) {
      const xc = (segments[i].x + segments[i + 1].x) / 2;
      const yc = (segments[i].y + segments[i + 1].y) / 2;
      ctx.quadraticCurveTo(segments[i].x, segments[i].y, xc, yc);
    }

    ctx.strokeStyle = '#ff6b00';
    ctx.lineWidth = snake.segmentRadius * 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Outline
    ctx.strokeStyle = '#cc5500';
    ctx.lineWidth = snake.segmentRadius * 2 + 4;
    ctx.stroke();
  }

  // Draw head on top (more detailed)
  const head = segments[0];

  // Head circle
  ctx.beginPath();
  ctx.arc(head.x, head.y, snake.segmentRadius + 2, 0, Math.PI * 2);
  ctx.fillStyle = '#ff8c00';
  ctx.fill();
  ctx.strokeStyle = '#cc5500';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Eyes (same as before)
  // ...
};

SNAKE SKIN PATTERN (optional):
const renderSnakeSkin = (ctx: CanvasRenderingContext2D) => {
  const { snake } = gameStateRef.current;

  // Add subtle pattern on every few segments
  snake.segments.forEach((segment, idx) => {
    if (idx % 4 === 0 && idx > 0) {
      ctx.beginPath();
      ctx.arc(segment.x, segment.y, snake.segmentRadius * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 200, 100, 0.3)';
      ctx.fill();
    }
  });
};

MOVEMENT TRAIL:
const trailRef = useRef<Point[]>([]);

const updateTrail = () => {
  const head = gameStateRef.current.snake.segments[0];

  // Add current head position
  trailRef.current.unshift({ x: head.x, y: head.y });

  // Keep only recent positions
  if (trailRef.current.length > 30) {
    trailRef.current.pop();
  }
};

const renderTrail = (ctx: CanvasRenderingContext2D) => {
  trailRef.current.forEach((point, idx) => {
    const alpha = 1 - idx / trailRef.current.length;
    const size = 3 * (1 - idx / trailRef.current.length);

    ctx.beginPath();
    ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 107, 0, ${alpha * 0.3})`;
    ctx.fill();
  });
};

COMBO SYSTEM:
Track rapid food collection:

const comboRef = useRef({ count: 0, timer: 0 });

const eatFood = (food: Food) => {
  // ... existing code ...

  // Combo tracking
  comboRef.current.count++;
  comboRef.current.timer = 60; // 1 second at 60fps

  if (comboRef.current.count >= 3) {
    const bonus = comboRef.current.count * 5;
    state.score += bonus;
    setScore(state.score);
    showComboCallout(comboRef.current.count);
  }
};

const updateCombo = () => {
  if (comboRef.current.timer > 0) {
    comboRef.current.timer--;
    if (comboRef.current.timer === 0) {
      comboRef.current.count = 0;
    }
  }
};

COMBO CALLOUT:
const [comboCallout, setComboCallout] = useState<string | null>(null);

const showComboCallout = (combo: number) => {
  let text = '';
  if (combo >= 10) text = 'INSANE!';
  else if (combo >= 7) text = 'AMAZING!';
  else if (combo >= 5) text = 'GREAT!';
  else if (combo >= 3) text = 'NICE!';

  if (text) {
    setComboCallout(text);
    setTimeout(() => setComboCallout(null), 1000);
  }
};

{comboCallout && (
  <div className="combo-callout">{comboCallout}</div>
)}

.combo-callout {
  position: absolute;
  top: 30%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 48px;
  font-weight: bold;
  color: #ff6b00;
  text-shadow: 0 0 20px rgba(255, 107, 0, 0.8);
  animation: callout-pop 1s ease-out forwards;
}

SPEED BOOST (hold to boost):
const boostRef = useRef(false);

const handleTouchStart = (e: React.TouchEvent) => {
  // ... existing code ...
  boostRef.current = true;
};

const handleTouchEnd = () => {
  boostRef.current = false;
};

const updateSnake = () => {
  const { snake } = gameStateRef.current;

  // Speed boost
  const currentSpeed = boostRef.current ? snake.speed * 1.5 : snake.speed;

  // ... movement code using currentSpeed ...
};

// Visual indicator for boost
const renderBoostIndicator = (ctx: CanvasRenderingContext2D) => {
  if (boostRef.current) {
    const head = gameStateRef.current.snake.segments[0];

    // Speed lines behind head
    for (let i = 0; i < 5; i++) {
      const angle = gameStateRef.current.snake.direction + Math.PI + (Math.random() - 0.5) * 0.5;
      const dist = 20 + Math.random() * 20;
      const lineLength = 10 + Math.random() * 15;

      const startX = head.x + Math.cos(angle) * dist;
      const startY = head.y + Math.sin(angle) * dist;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + Math.cos(angle) * lineLength, startY + Math.sin(angle) * lineLength);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
};

WORLD BORDER INDICATOR:
Show warning when near edges:

const renderBorderWarning = (ctx: CanvasRenderingContext2D) => {
  const head = gameStateRef.current.snake.segments[0];
  const warningDist = 50;

  let warningAlpha = 0;

  if (head.x < warningDist) warningAlpha = Math.max(warningAlpha, 1 - head.x / warningDist);
  if (head.x > gameWidth - warningDist) warningAlpha = Math.max(warningAlpha, 1 - (gameWidth - head.x) / warningDist);
  if (head.y < warningDist) warningAlpha = Math.max(warningAlpha, 1 - head.y / warningDist);
  if (head.y > gameHeight - warningDist) warningAlpha = Math.max(warningAlpha, 1 - (gameHeight - head.y) / warningDist);

  if (warningAlpha > 0) {
    // Red vignette around edges
    const gradient = ctx.createRadialGradient(
      gameWidth / 2, gameHeight / 2, Math.min(gameWidth, gameHeight) * 0.3,
      gameWidth / 2, gameHeight / 2, Math.min(gameWidth, gameHeight) * 0.7
    );
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, `rgba(255, 0, 0, ${warningAlpha * 0.3})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, gameWidth, gameHeight);
  }
};

FOOD ATTRACTION (food moves towards snake):
const updateFood = () => {
  const { snake, food } = gameStateRef.current;
  const head = snake.segments[0];
  const attractDist = 80;

  food.forEach(f => {
    const dist = Math.hypot(head.x - f.x, head.y - f.y);
    if (dist < attractDist) {
      // Move towards head
      const angle = Math.atan2(head.y - f.y, head.x - f.x);
      const force = (attractDist - dist) / attractDist * 2;
      f.x += Math.cos(angle) * force;
      f.y += Math.sin(angle) * force;
    }
  });
};
```

### ✅ Phase 4 Checkpoint

**Test these manually:**
- [ ] Snake has smooth, curved body
- [ ] Snake has visible head details (eyes)
- [ ] Movement trail fades behind snake
- [ ] Combo counter works when eating rapidly
- [ ] Combo callouts appear (NICE!, GREAT!, etc.)
- [ ] Speed boost works when holding touch
- [ ] Speed lines show during boost
- [ ] Border warning appears near edges
- [ ] Food is attracted towards snake
- [ ] Overall visuals feel polished

**Debug Prompt if issues:**
```
Visual effects aren't working correctly in Snake.io.

Issue: [describe]

For smooth body:
1. Is quadraticCurveTo drawing properly?
2. Is lineWidth set to diameter (radius * 2)?

For combo:
1. Is comboRef.current being updated?
2. Is the timer counting down correctly?

For boost:
1. Is boostRef being set on touch start/end?
2. Is currentSpeed being calculated in updateSnake?

Show me the rendering code or the specific effect that's not working.
```

---

## PHASE 5: Audio, Leaderboard & Final Polish

### Prompt for Claude Code:

```
Add Howler.js audio, leaderboard, and final polish to Orange Snake.io.

CURRENT STATE: Full game with effects, needs audio and leaderboard.

AUDIO INTEGRATION:

Sounds needed:
- Eat food (satisfying pop)
- Eat rare food (special sound)
- Combo milestone
- Boost (whoosh while boosting)
- Death (explosion)
- High score

const {
  playEat,
  playRareEat,
  playCombo,
  playBoostLoop,
  stopBoostLoop,
  playDeath,
  playHighScore,
  setMuted
} = useHowlerSounds();

// Triggers:
// Normal eat:
playEat();

// Rare food (5+ points):
if (food.points >= 5) {
  playRareEat();
} else {
  playEat();
}

// Combo milestone:
if (comboRef.current.count === 3 || comboRef.current.count === 5 || comboRef.current.count === 10) {
  playCombo();
}

// Boost:
const handleTouchStart = () => {
  // ...
  playBoostLoop();
};

const handleTouchEnd = () => {
  // ...
  stopBoostLoop();
};

// Death:
playDeath();

// High score:
if (score > highScore) {
  playHighScore();
}

BOOST LOOP AUDIO:
// Special handling for looping audio
const boostSoundRef = useRef<Howl | null>(null);

const playBoostLoop = () => {
  if (!boostSoundRef.current) {
    boostSoundRef.current = new Howl({
      src: ['/assets/sounds/boost-loop.mp3'],
      loop: true,
      volume: 0.3,
    });
  }
  boostSoundRef.current.play();
};

const stopBoostLoop = () => {
  boostSoundRef.current?.stop();
};

LEADERBOARD INTEGRATION:

import { useLeaderboard } from '../../hooks/useLeaderboard';

const { submitScore: submitToLeaderboard, getTopScores } = useLeaderboard('orange-snake');

const submitScore = async () => {
  if (score > 0) {
    await submitToLeaderboard(score);
    setShowLeaderboard(true);
  }
};

HIGH SCORE PERSISTENCE:
const [highScore, setHighScore] = useState(() =>
  parseInt(localStorage.getItem('snake-high') || '0', 10)
);

useEffect(() => {
  if (score > highScore) {
    setHighScore(score);
    localStorage.setItem('snake-high', score.toString());
  }
}, [score]);

MOBILE CONTROLS (alternative modes):

1. JOYSTICK MODE:
interface Joystick {
  baseX: number;
  baseY: number;
  knobX: number;
  knobY: number;
  active: boolean;
}

const joystickRef = useRef<Joystick>({
  baseX: 0, baseY: 0, knobX: 0, knobY: 0, active: false
});

const handleTouchStart = (e: React.TouchEvent) => {
  const touch = e.touches[0];
  const rect = canvasRef.current!.getBoundingClientRect();

  joystickRef.current = {
    baseX: touch.clientX - rect.left,
    baseY: touch.clientY - rect.top,
    knobX: touch.clientX - rect.left,
    knobY: touch.clientY - rect.top,
    active: true,
  };
};

const handleTouchMove = (e: React.TouchEvent) => {
  const { current: joystick } = joystickRef;
  if (!joystick.active) return;

  const touch = e.touches[0];
  const rect = canvasRef.current!.getBoundingClientRect();

  const dx = touch.clientX - rect.left - joystick.baseX;
  const dy = touch.clientY - rect.top - joystick.baseY;

  // Limit knob distance
  const maxDist = 50;
  const dist = Math.min(maxDist, Math.hypot(dx, dy));
  const angle = Math.atan2(dy, dx);

  joystick.knobX = joystick.baseX + Math.cos(angle) * dist;
  joystick.knobY = joystick.baseY + Math.sin(angle) * dist;

  // Update snake direction
  if (dist > 10) {
    gameStateRef.current.snake.targetDirection = angle;
  }
};

// Render joystick overlay
const renderJoystick = (ctx: CanvasRenderingContext2D) => {
  const { current: joystick } = joystickRef;
  if (!joystick.active) return;

  // Base circle
  ctx.beginPath();
  ctx.arc(joystick.baseX, joystick.baseY, 50, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.stroke();

  // Knob
  ctx.beginPath();
  ctx.arc(joystick.knobX, joystick.knobY, 25, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 107, 0, 0.7)';
  ctx.fill();
};

2. SWIPE MODE:
// Already implemented in previous phases

CONTROL MODE TOGGLE:
const [controlMode, setControlMode] = useState<'swipe' | 'joystick' | 'follow'>('follow');

// In settings:
<select value={controlMode} onChange={e => setControlMode(e.target.value)}>
  <option value="follow">Follow Finger</option>
  <option value="joystick">Virtual Joystick</option>
  <option value="swipe">Swipe</option>
</select>

STATISTICS TRACKING:
interface GameStats {
  gamesPlayed: number;
  totalScore: number;
  highScore: number;
  maxLength: number;
  totalFoodEaten: number;
}

// Track and persist stats
const updateStats = () => {
  const stats = JSON.parse(localStorage.getItem('snake-stats') || '{}');
  stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
  stats.totalScore = (stats.totalScore || 0) + score;
  stats.highScore = Math.max(stats.highScore || 0, score);
  stats.maxLength = Math.max(stats.maxLength || 0, targetLengthRef.current);
  localStorage.setItem('snake-stats', JSON.stringify(stats));
};

PERFORMANCE OPTIMIZATIONS:

1. Segment culling (don't draw off-screen segments):
const renderSnake = (ctx: CanvasRenderingContext2D) => {
  const visibleSegments = snake.segments.filter(s =>
    s.x > -50 && s.x < gameWidth + 50 &&
    s.y > -50 && s.y < gameHeight + 50
  );
  // Render only visible
};

2. Food spatial hashing:
// For many food items, use spatial grid
const foodGrid = new Map<string, Food[]>();
const getCellKey = (x: number, y: number) => `${Math.floor(x / 50)},${Math.floor(y / 50)}`;

3. RequestAnimationFrame timing:
let lastTime = 0;
const gameLoop = (time: number) => {
  const delta = (time - lastTime) / (1000 / 60);
  lastTime = time;

  // Scale movement by delta for consistent speed
  update(delta);
  render(ctx);
  requestAnimationFrame(gameLoop);
};

FINAL POLISH:

1. Pause when tab hidden
2. Loading screen
3. Tutorial/first-time instructions
4. Skins/customization (future)
5. Achievements

ACCESSIBILITY:
- Colorblind mode (different shapes for food types)
- Keyboard controls (WASD or arrows)
- Reduced motion option
```

### ✅ Phase 5 Final Checklist

**Audio:**
- [ ] Eat sound plays
- [ ] Different sound for rare food
- [ ] Combo milestone sound
- [ ] Boost loop plays while holding
- [ ] Death explosion sound
- [ ] High score fanfare
- [ ] Mute toggle works

**Leaderboard:**
- [ ] Score submits correctly
- [ ] Leaderboard displays
- [ ] High score persists locally

**Controls:**
- [ ] Follow finger mode works
- [ ] Joystick mode works (if implemented)
- [ ] Control mode can be changed
- [ ] Desktop mouse controls work

**Performance:**
- [ ] Smooth 60fps with long snake
- [ ] No memory leaks
- [ ] Game pauses when tab hidden

**Debug Prompt if issues:**
```
Audio or final features not working in Snake.io.

Issue: [describe]

For boost loop:
1. Is the Howl instance being created correctly?
2. Is loop: true set?
3. Is stop() being called on touch end?

For leaderboard:
1. Is useLeaderboard hook returning functions?
2. Is score > 0 when submitting?

Show me the audio setup and leaderboard integration.
```

---

## Complete File Structure

```
src/games/OrangeSnake/
├── OrangeSnakeGame.tsx    # Main component
├── OrangeSnakeGame.css    # Styles
├── types.ts               # Interfaces
├── constants.ts           # Game values
├── renderer.ts            # Canvas rendering functions
├── physics.ts             # Movement, collision
└── controls.ts            # Input handling

public/assets/sounds/
├── eat.mp3
├── rare-eat.mp3
├── combo.mp3
├── boost-loop.mp3
├── death.mp3
└── high-score.mp3
```

---

## Constants Reference

```typescript
// constants.ts
export const SNAKE = {
  INITIAL_LENGTH: 5,
  SEGMENT_RADIUS: 15,
  SEGMENT_SPACING: 10,
  SPEED: 3,
  BOOST_MULTIPLIER: 1.5,
  TURN_SPEED: 0.15,
} as const;

export const FOOD_TYPES = [
  { color: '#ff6b00', radius: 8, points: 1, probability: 0.6 },
  { color: '#ffa500', radius: 10, points: 2, probability: 0.25 },
  { color: '#ffcc00', radius: 12, points: 5, probability: 0.1 },
  { color: '#ff0000', radius: 15, points: 10, probability: 0.05 },
] as const;

export const COMBO = {
  TIMEOUT_FRAMES: 60,  // 1 second at 60fps
  THRESHOLDS: [3, 5, 7, 10],
  BONUS_PER_LEVEL: 5,
} as const;
```
