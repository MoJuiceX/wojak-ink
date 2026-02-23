# Brick Breaker Game - Phased Build Guide

> **Game ID**: `brick-breaker`
> **Rendering**: Canvas (requestAnimationFrame game loop)
> **Complexity**: Medium
> **Prerequisites**: Run `00-MASTER-INDEX.md` setup first

---

## PHASE 1: Canvas Setup & Ball/Paddle

### Prompt for Claude Code:

```
Create the Brick Breaker game with Canvas rendering for wojak.ink.

GAME OVERVIEW:
- Classic Breakout/Arkanoid style
- Ball bounces off paddle to break bricks
- Don't let ball fall below paddle
- Clear all bricks to win level
- Orange citrus theme

REQUIREMENTS:
1. Create file: src/games/BrickBreaker/BrickBreakerGame.tsx
2. Use Canvas with requestAnimationFrame
3. Orange theme (#ff6b00 primary)
4. Mobile-first with touch/swipe paddle control

CANVAS SETUP:
const BrickBreakerGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { width, height } = useDimensions();
  const isMobile = useIsMobile();

  // Game dimensions
  const gameWidth = isMobile ? width : 480;
  const gameHeight = isMobile ? height - 105 : 640;

  // Paddle constants
  const PADDLE_WIDTH = 100;
  const PADDLE_HEIGHT = 15;
  const PADDLE_Y = gameHeight - 40;

  // Ball constants
  const BALL_RADIUS = 10;
  const BALL_SPEED = 6;

  // Game state ref
  const gameStateRef = useRef({
    isPlaying: false,
    isGameOver: false,
    isPaused: false,
    score: 0,
    lives: 3,
    level: 1,
    paddle: {
      x: gameWidth / 2 - PADDLE_WIDTH / 2,
      y: PADDLE_Y,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
    },
    ball: {
      x: gameWidth / 2,
      y: PADDLE_Y - BALL_RADIUS - 5,
      vx: 0,
      vy: 0,
      radius: BALL_RADIUS,
      isLaunched: false,
    },
    bricks: [] as Brick[],
  });

  // UI state
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const animationRef = useRef<number>();

  return (
    <div className="brick-breaker-container">
      {/* HUD */}
      <div className="game-hud">
        <div className="score">Score: {score}</div>
        <div className="lives">
          {Array(lives).fill('🍊').join('')}
        </div>
        <div className="level">Level {level}</div>
      </div>

      <canvas
        ref={canvasRef}
        width={gameWidth}
        height={gameHeight}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
      />

      {/* Overlays... */}
    </div>
  );
};

INTERFACES:
interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isLaunched: boolean;
}

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  hits: number;      // Hits remaining to break
  points: number;
  isDestroyed: boolean;
  type: 'normal' | 'hard' | 'unbreakable' | 'powerup';
}

PADDLE CONTROL:
// Mouse control (desktop)
const handleMouseMove = (e: React.MouseEvent) => {
  const rect = canvasRef.current!.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  movePaddle(mouseX);
};

// Touch control (mobile)
const handleTouchMove = (e: React.TouchEvent) => {
  e.preventDefault();
  const rect = canvasRef.current!.getBoundingClientRect();
  const touchX = e.touches[0].clientX - rect.left;
  movePaddle(touchX);
};

const movePaddle = (targetX: number) => {
  const state = gameStateRef.current;
  const paddle = state.paddle;

  // Center paddle on target X
  let newX = targetX - paddle.width / 2;

  // Clamp to canvas bounds
  newX = Math.max(0, Math.min(gameWidth - paddle.width, newX));

  paddle.x = newX;

  // If ball not launched, ball follows paddle
  if (!state.ball.isLaunched) {
    state.ball.x = newX + paddle.width / 2;
  }
};

BALL LAUNCH:
const handleClick = () => {
  const state = gameStateRef.current;

  if (!state.isPlaying) {
    startGame();
    return;
  }

  if (!state.ball.isLaunched) {
    launchBall();
  }
};

const launchBall = () => {
  const state = gameStateRef.current;
  const ball = state.ball;

  // Random angle between -45 and -135 degrees (upward)
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 3;

  ball.vx = Math.cos(angle) * BALL_SPEED;
  ball.vy = Math.sin(angle) * BALL_SPEED;
  ball.isLaunched = true;

  playLaunchSound();
};

RENDER PADDLE:
const renderPaddle = (ctx: CanvasRenderingContext2D) => {
  const { paddle } = gameStateRef.current;

  // Paddle body (orange gradient)
  const gradient = ctx.createLinearGradient(
    paddle.x, paddle.y,
    paddle.x, paddle.y + paddle.height
  );
  gradient.addColorStop(0, '#ff8c00');
  gradient.addColorStop(1, '#ff6b00');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 5);
  ctx.fill();

  // Shine on top
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.beginPath();
  ctx.roundRect(paddle.x + 5, paddle.y + 2, paddle.width - 10, 4, 2);
  ctx.fill();
};

RENDER BALL:
const renderBall = (ctx: CanvasRenderingContext2D) => {
  const { ball } = gameStateRef.current;

  // Orange ball
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);

  const gradient = ctx.createRadialGradient(
    ball.x - 3, ball.y - 3, 0,
    ball.x, ball.y, ball.radius
  );
  gradient.addColorStop(0, '#ffcc00');
  gradient.addColorStop(1, '#ff6b00');

  ctx.fillStyle = gradient;
  ctx.fill();

  // Shine
  ctx.beginPath();
  ctx.arc(ball.x - 3, ball.y - 3, 3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fill();
};

RENDER BACKGROUND:
const renderBackground = (ctx: CanvasRenderingContext2D) => {
  // Dark blue background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, gameWidth, gameHeight);

  // Subtle grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;

  for (let x = 0; x <= gameWidth; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, gameHeight);
    ctx.stroke();
  }
  for (let y = 0; y <= gameHeight; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(gameWidth, y);
    ctx.stroke();
  }
};

BALL PHYSICS (basic movement):
const updateBall = () => {
  const state = gameStateRef.current;
  if (!state.ball.isLaunched || !state.isPlaying) return;

  const ball = state.ball;

  // Move ball
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Wall collisions (left/right)
  if (ball.x - ball.radius <= 0) {
    ball.x = ball.radius;
    ball.vx = -ball.vx;
    playBounceSound();
  }
  if (ball.x + ball.radius >= gameWidth) {
    ball.x = gameWidth - ball.radius;
    ball.vx = -ball.vx;
    playBounceSound();
  }

  // Ceiling collision
  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius;
    ball.vy = -ball.vy;
    playBounceSound();
  }

  // Check ball lost (below paddle)
  if (ball.y > gameHeight + ball.radius) {
    loseLife();
  }
};

DO NOT add bricks or paddle collision yet - just get ball/paddle working.
```

### ✅ Phase 1 Checkpoint

**Test these manually:**
- [ ] Canvas renders with dark background
- [ ] Paddle renders as orange rectangle
- [ ] Ball renders on top of paddle
- [ ] Moving mouse/touch moves paddle
- [ ] Ball follows paddle before launch
- [ ] Clicking/tapping launches ball upward
- [ ] Ball bounces off walls and ceiling
- [ ] Ball falls off bottom (life loss - just detect for now)
- [ ] HUD shows score, lives, level

**Debug Prompt if issues:**
```
The Brick Breaker paddle/ball aren't working. Issues: [describe]

Check:
1. Is canvasRef attached correctly?
2. Is the game loop running?
3. Is movePaddle clamping to bounds correctly?
4. Is ball velocity being applied in updateBall?

Log: console.log('Paddle x:', paddle.x, 'Ball:', ball.x, ball.y);

Show me the movePaddle and updateBall functions.
```

---

## PHASE 2: Paddle Collision & Bricks

### Prompt for Claude Code:

```
Add paddle-ball collision and brick setup to Brick Breaker.

CURRENT STATE: Ball moves, paddle moves, but no collision.

PADDLE-BALL COLLISION:
const checkPaddleCollision = () => {
  const state = gameStateRef.current;
  const { ball, paddle } = state;

  // Check if ball is at paddle level
  if (ball.y + ball.radius >= paddle.y &&
      ball.y - ball.radius <= paddle.y + paddle.height &&
      ball.vy > 0) { // Only when moving down

    // Check horizontal overlap
    if (ball.x + ball.radius >= paddle.x &&
        ball.x - ball.radius <= paddle.x + paddle.width) {

      // Calculate bounce angle based on hit position
      const hitPos = (ball.x - paddle.x) / paddle.width; // 0 to 1
      const angle = (hitPos - 0.5) * Math.PI * 0.7; // -70 to +70 degrees from vertical

      // Set new velocity
      const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      ball.vx = Math.sin(angle) * speed;
      ball.vy = -Math.abs(Math.cos(angle) * speed); // Always upward

      // Prevent ball from getting stuck in paddle
      ball.y = paddle.y - ball.radius;

      playPaddleHitSound();
    }
  }
};

BRICK SETUP:
const BRICK_ROWS = 6;
const BRICK_COLS = 8;
const BRICK_WIDTH = (gameWidth - 40) / BRICK_COLS;
const BRICK_HEIGHT = 25;
const BRICK_PADDING = 4;
const BRICK_TOP_OFFSET = 80;

BRICK COLORS BY ROW:
const BRICK_COLORS = [
  { color: '#ff0000', points: 60, hits: 1 }, // Red (top)
  { color: '#ff6b00', points: 50, hits: 1 }, // Orange
  { color: '#ffcc00', points: 40, hits: 1 }, // Yellow
  { color: '#00ff00', points: 30, hits: 1 }, // Green
  { color: '#0088ff', points: 20, hits: 1 }, // Blue
  { color: '#8800ff', points: 10, hits: 1 }, // Purple (bottom)
];

CREATE BRICKS:
const createBricks = (level: number): Brick[] => {
  const bricks: Brick[] = [];

  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      const colorConfig = BRICK_COLORS[row % BRICK_COLORS.length];

      const brick: Brick = {
        x: 20 + col * BRICK_WIDTH + BRICK_PADDING / 2,
        y: BRICK_TOP_OFFSET + row * (BRICK_HEIGHT + BRICK_PADDING),
        width: BRICK_WIDTH - BRICK_PADDING,
        height: BRICK_HEIGHT,
        color: colorConfig.color,
        hits: colorConfig.hits,
        points: colorConfig.points,
        isDestroyed: false,
        type: 'normal',
      };

      bricks.push(brick);
    }
  }

  return bricks;
};

// Initialize on game start
const startGame = () => {
  const state = gameStateRef.current;
  state.bricks = createBricks(1);
  state.score = 0;
  state.lives = 3;
  state.isPlaying = true;
  state.isGameOver = false;

  setScore(0);
  setLives(3);
  setIsPlaying(true);
  setIsGameOver(false);

  resetBall();
};

RENDER BRICKS:
const renderBricks = (ctx: CanvasRenderingContext2D) => {
  const { bricks } = gameStateRef.current;

  bricks.forEach(brick => {
    if (brick.isDestroyed) return;

    // Brick body
    const gradient = ctx.createLinearGradient(
      brick.x, brick.y,
      brick.x, brick.y + brick.height
    );
    gradient.addColorStop(0, brick.color);
    gradient.addColorStop(1, adjustBrightness(brick.color, -30));

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 3);
    ctx.fill();

    // Shine on top
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.roundRect(brick.x + 3, brick.y + 2, brick.width - 6, 4, 2);
    ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  });
};

// Helper to darken color
const adjustBrightness = (hex: string, amount: number): string => {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
};

BRICK COLLISION:
const checkBrickCollision = () => {
  const state = gameStateRef.current;
  const { ball, bricks } = state;

  for (const brick of bricks) {
    if (brick.isDestroyed) continue;

    // Check collision with brick
    if (ball.x + ball.radius > brick.x &&
        ball.x - ball.radius < brick.x + brick.width &&
        ball.y + ball.radius > brick.y &&
        ball.y - ball.radius < brick.y + brick.height) {

      // Determine collision side
      const overlapLeft = (ball.x + ball.radius) - brick.x;
      const overlapRight = (brick.x + brick.width) - (ball.x - ball.radius);
      const overlapTop = (ball.y + ball.radius) - brick.y;
      const overlapBottom = (brick.y + brick.height) - (ball.y - ball.radius);

      const minOverlapX = Math.min(overlapLeft, overlapRight);
      const minOverlapY = Math.min(overlapTop, overlapBottom);

      // Bounce based on which side was hit
      if (minOverlapX < minOverlapY) {
        ball.vx = -ball.vx;
      } else {
        ball.vy = -ball.vy;
      }

      // Damage brick
      brick.hits--;
      if (brick.hits <= 0) {
        brick.isDestroyed = true;
        state.score += brick.points;
        setScore(state.score);
        spawnBrickParticles(brick);
      }

      playBrickHitSound();

      // Only hit one brick per frame
      break;
    }
  }
};

CHECK WIN:
const checkWin = () => {
  const state = gameStateRef.current;
  const remainingBricks = state.bricks.filter(b => !b.isDestroyed && b.type !== 'unbreakable');

  if (remainingBricks.length === 0) {
    // Level complete!
    nextLevel();
  }
};

LOSE LIFE:
const loseLife = () => {
  const state = gameStateRef.current;
  state.lives--;
  setLives(state.lives);

  if (state.lives <= 0) {
    triggerGameOver();
  } else {
    resetBall();
    playLoseLifeSound();
  }
};

const resetBall = () => {
  const state = gameStateRef.current;
  const { paddle, ball } = state;

  ball.x = paddle.x + paddle.width / 2;
  ball.y = PADDLE_Y - BALL_RADIUS - 5;
  ball.vx = 0;
  ball.vy = 0;
  ball.isLaunched = false;
};

UPDATE FUNCTION:
const update = () => {
  const state = gameStateRef.current;
  if (!state.isPlaying || state.isPaused) return;

  updateBall();
  checkPaddleCollision();
  checkBrickCollision();
  checkWin();
};
```

### ✅ Phase 2 Checkpoint

**Test these manually:**
- [ ] Bricks render in rows at top
- [ ] Bricks have gradient coloring
- [ ] Ball bounces off paddle
- [ ] Angle changes based on paddle hit position
- [ ] Ball hitting brick destroys it
- [ ] Score increases when brick destroyed
- [ ] Ball bounces correctly off bricks
- [ ] Particles spawn when brick breaks (if implemented)
- [ ] Level completes when all bricks destroyed
- [ ] Life is lost when ball falls
- [ ] Game over when lives = 0

**Debug Prompt if issues:**
```
Brick/paddle collision not working in Brick Breaker.

Issue: [describe - e.g., "ball goes through paddle" or "wrong bounce angle"]

For paddle collision:
1. Is ball.vy > 0 check correct (moving downward)?
2. Is the hit position calculation (0 to 1) correct?
3. Is ball.y being set above paddle to prevent sticking?

For brick collision:
1. Is the AABB check correct?
2. Is the side detection determining correct bounce direction?
3. Is brick.isDestroyed being checked/set?

Log: console.log('Ball pos:', ball.x, ball.y, 'vel:', ball.vx, ball.vy);
Log: console.log('Brick collision:', brick, 'overlaps:', overlapLeft, overlapRight, overlapTop, overlapBottom);

Show me checkPaddleCollision or checkBrickCollision.
```

---

## PHASE 3: Power-ups & Special Bricks

### Prompt for Claude Code:

```
Add power-ups and special brick types to Brick Breaker.

CURRENT STATE: Basic gameplay works, need more variety.

POWER-UP TYPES:
interface PowerUp {
  id: number;
  x: number;
  y: number;
  type: PowerUpType;
  vy: number; // Falling speed
}

type PowerUpType =
  | 'expand'      // Wider paddle
  | 'shrink'      // Narrower paddle (bad)
  | 'multiball'   // 3 balls
  | 'fireball'    // Ball goes through bricks
  | 'slowdown'    // Slower ball
  | 'speedup'     // Faster ball (bad)
  | 'extralife'   // +1 life
  | 'laser';      // Paddle shoots

const POWERUP_CONFIG: Record<PowerUpType, { color: string, emoji: string, probability: number }> = {
  expand: { color: '#00ff00', emoji: '↔️', probability: 0.2 },
  shrink: { color: '#ff0000', emoji: '↕️', probability: 0.1 },
  multiball: { color: '#ffcc00', emoji: '⚪', probability: 0.15 },
  fireball: { color: '#ff6b00', emoji: '🔥', probability: 0.1 },
  slowdown: { color: '#00ffff', emoji: '🐢', probability: 0.15 },
  speedup: { color: '#ff00ff', emoji: '⚡', probability: 0.1 },
  extralife: { color: '#ff69b4', emoji: '❤️', probability: 0.05 },
  laser: { color: '#ff0000', emoji: '🔫', probability: 0.15 },
};

SPAWN POWER-UP:
const spawnPowerUp = (brick: Brick) => {
  // Random chance to spawn
  if (Math.random() > 0.2) return; // 20% chance

  // Pick random type based on probability
  const rand = Math.random();
  let cumulative = 0;
  let type: PowerUpType = 'expand';

  for (const [t, config] of Object.entries(POWERUP_CONFIG)) {
    cumulative += config.probability;
    if (rand < cumulative) {
      type = t as PowerUpType;
      break;
    }
  }

  const powerUp: PowerUp = {
    id: Date.now(),
    x: brick.x + brick.width / 2,
    y: brick.y + brick.height / 2,
    type,
    vy: 2,
  };

  gameStateRef.current.powerUps.push(powerUp);
};

// Add to gameStateRef:
powerUps: [] as PowerUp[],
activePowerUps: [] as { type: PowerUpType, expiresAt: number }[],
extraBalls: [] as Ball[],

UPDATE POWER-UPS:
const updatePowerUps = () => {
  const state = gameStateRef.current;
  const { paddle, powerUps } = state;

  state.powerUps = powerUps.filter(pu => {
    // Move down
    pu.y += pu.vy;

    // Check paddle collision
    if (pu.y >= paddle.y &&
        pu.y <= paddle.y + paddle.height &&
        pu.x >= paddle.x &&
        pu.x <= paddle.x + paddle.width) {

      activatePowerUp(pu.type);
      return false; // Remove
    }

    // Remove if off screen
    return pu.y < gameHeight + 20;
  });
};

ACTIVATE POWER-UP:
const activatePowerUp = (type: PowerUpType) => {
  const state = gameStateRef.current;
  const { paddle, ball } = state;

  playPowerUpSound();

  switch (type) {
    case 'expand':
      paddle.width = Math.min(200, paddle.width * 1.5);
      addTimedPowerUp(type, 10000); // 10 seconds
      break;

    case 'shrink':
      paddle.width = Math.max(50, paddle.width * 0.7);
      addTimedPowerUp(type, 8000);
      break;

    case 'multiball':
      // Clone current ball with different angles
      const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      state.extraBalls.push({
        ...ball,
        vx: Math.cos(-Math.PI / 3) * speed,
        vy: -Math.abs(Math.sin(-Math.PI / 3) * speed),
      });
      state.extraBalls.push({
        ...ball,
        vx: Math.cos(-2 * Math.PI / 3) * speed,
        vy: -Math.abs(Math.sin(-2 * Math.PI / 3) * speed),
      });
      break;

    case 'fireball':
      state.ball.fireball = true;
      addTimedPowerUp(type, 8000);
      break;

    case 'slowdown':
      ball.vx *= 0.7;
      ball.vy *= 0.7;
      state.extraBalls.forEach(b => { b.vx *= 0.7; b.vy *= 0.7; });
      break;

    case 'speedup':
      ball.vx *= 1.3;
      ball.vy *= 1.3;
      state.extraBalls.forEach(b => { b.vx *= 1.3; b.vy *= 1.3; });
      break;

    case 'extralife':
      state.lives++;
      setLives(state.lives);
      break;

    case 'laser':
      paddle.hasLaser = true;
      addTimedPowerUp(type, 15000);
      break;
  }
};

const addTimedPowerUp = (type: PowerUpType, duration: number) => {
  gameStateRef.current.activePowerUps.push({
    type,
    expiresAt: Date.now() + duration,
  });
};

// Check expiration in update
const updateActivePowerUps = () => {
  const state = gameStateRef.current;
  const now = Date.now();

  state.activePowerUps = state.activePowerUps.filter(pu => {
    if (now >= pu.expiresAt) {
      deactivatePowerUp(pu.type);
      return false;
    }
    return true;
  });
};

const deactivatePowerUp = (type: PowerUpType) => {
  const { paddle, ball } = gameStateRef.current;

  switch (type) {
    case 'expand':
    case 'shrink':
      paddle.width = PADDLE_WIDTH; // Reset to default
      break;
    case 'fireball':
      ball.fireball = false;
      break;
    case 'laser':
      paddle.hasLaser = false;
      break;
  }
};

RENDER POWER-UPS:
const renderPowerUps = (ctx: CanvasRenderingContext2D) => {
  gameStateRef.current.powerUps.forEach(pu => {
    const config = POWERUP_CONFIG[pu.type];

    // Capsule shape
    ctx.fillStyle = config.color;
    ctx.beginPath();
    ctx.roundRect(pu.x - 15, pu.y - 8, 30, 16, 8);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Emoji/icon
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(config.emoji, pu.x, pu.y);
  });
};

FIREBALL EFFECT:
When fireball active, ball doesn't bounce off bricks:

const checkBrickCollision = () => {
  const { ball, bricks } = gameStateRef.current;

  for (const brick of bricks) {
    if (brick.isDestroyed) continue;

    if (/* collision detected */) {
      // Fireball goes through without bouncing
      if (!ball.fireball) {
        // Normal bounce
        if (minOverlapX < minOverlapY) {
          ball.vx = -ball.vx;
        } else {
          ball.vy = -ball.vy;
        }
      }

      brick.hits--;
      if (brick.hits <= 0) {
        brick.isDestroyed = true;
        // ... rest of destruction logic
      }

      // Fireball continues through multiple bricks
      if (!ball.fireball) break;
    }
  }
};

RENDER FIREBALL:
const renderBall = (ctx: CanvasRenderingContext2D) => {
  const { ball } = gameStateRef.current;

  if (ball.fireball) {
    // Fiery glow
    const gradient = ctx.createRadialGradient(
      ball.x, ball.y, 0,
      ball.x, ball.y, ball.radius * 2
    );
    gradient.addColorStop(0, '#ffcc00');
    gradient.addColorStop(0.5, '#ff6b00');
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius * 2, 0, Math.PI * 2);
    ctx.fill();

    // Fire trail
    // ...
  }

  // Normal ball rendering
  // ...
};

LASER SHOOTING:
const lasersRef = useRef<{ x: number, y: number, vy: number }[]>([]);

const shootLaser = () => {
  const { paddle } = gameStateRef.current;
  if (!paddle.hasLaser) return;

  lasersRef.current.push(
    { x: paddle.x + 10, y: paddle.y, vy: -10 },
    { x: paddle.x + paddle.width - 10, y: paddle.y, vy: -10 }
  );

  playLaserSound();
};

// Shoot on tap when laser active
const handleClick = () => {
  if (gameStateRef.current.paddle.hasLaser && gameStateRef.current.ball.isLaunched) {
    shootLaser();
  }
  // ... existing launch logic
};

SPECIAL BRICK TYPES:
// In createBricks, add special bricks:
if (level >= 2 && Math.random() < 0.1) {
  brick.type = 'hard';
  brick.hits = 2;
  brick.color = '#888888';
}

if (level >= 3 && Math.random() < 0.05) {
  brick.type = 'unbreakable';
  brick.hits = Infinity;
  brick.color = '#444444';
}

if (Math.random() < 0.15) {
  brick.type = 'powerup';
  brick.color = '#00ffff';
  // Guaranteed power-up drop
}
```

### ✅ Phase 3 Checkpoint

**Test these manually:**
- [ ] Power-ups drop from destroyed bricks
- [ ] Power-ups fall down slowly
- [ ] Catching power-up activates effect
- [ ] Expand power-up widens paddle
- [ ] Shrink power-up narrows paddle
- [ ] Multiball creates extra balls
- [ ] Fireball goes through bricks
- [ ] Slowdown slows ball
- [ ] Speedup speeds ball
- [ ] Extra life adds heart
- [ ] Timed power-ups expire correctly
- [ ] Laser shoots when tapping (if active)
- [ ] Hard bricks take 2 hits
- [ ] Unbreakable bricks can't be destroyed

**Debug Prompt if issues:**
```
Power-ups aren't working correctly in Brick Breaker.

Issue: [describe - e.g., "power-ups don't fall" or "expand doesn't work"]

For power-up spawning:
1. Is spawnPowerUp being called when brick is destroyed?
2. Is the random chance check correct?

For activation:
1. Is paddle collision being detected for power-ups?
2. Is activatePowerUp being called?
3. Are state changes being applied?

Log: console.log('Power-up spawned:', type, 'at', x, y);
Log: console.log('Activated power-up:', type, 'paddle width:', paddle.width);

Show me the activatePowerUp function.
```

---

## PHASE 4: Levels & Visual Polish

### Prompt for Claude Code:

```
Add level progression, particles, and visual polish to Brick Breaker.

CURRENT STATE: Power-ups work, need levels and effects.

LEVEL PROGRESSION:
const nextLevel = () => {
  const state = gameStateRef.current;
  state.level++;
  setLevel(state.level);

  // Generate new brick layout
  state.bricks = createBricksForLevel(state.level);

  // Reset ball
  resetBall();

  // Increase difficulty
  increaseDifficulty(state.level);

  // Clear power-ups
  state.powerUps = [];
  state.extraBalls = [];

  playLevelCompleteSound();
  showLevelBanner(state.level);
};

LEVEL-SPECIFIC LAYOUTS:
const createBricksForLevel = (level: number): Brick[] => {
  const bricks: Brick[] = [];

  switch (level) {
    case 1:
      // Simple rows
      return createStandardBricks(6, 8);

    case 2:
      // Pyramid shape
      for (let row = 0; row < 6; row++) {
        const cols = 8 - row;
        const startCol = row / 2;
        for (let col = 0; col < cols; col++) {
          bricks.push(createBrick(row, Math.floor(startCol) + col, level));
        }
      }
      return bricks;

    case 3:
      // Checkerboard with hard bricks
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 8; col++) {
          if ((row + col) % 2 === 0) {
            const brick = createBrick(row, col, level);
            if (Math.random() < 0.3) {
              brick.type = 'hard';
              brick.hits = 2;
            }
            bricks.push(brick);
          }
        }
      }
      return bricks;

    case 4:
      // Diamond pattern
      // ... custom layout
      return bricks;

    default:
      // Random challenging layouts
      return createRandomLevel(level);
  }
};

DIFFICULTY SCALING:
const increaseDifficulty = (level: number) => {
  const state = gameStateRef.current;

  // Ball speed increases
  const baseSpeed = BALL_SPEED;
  const speedMultiplier = 1 + (level - 1) * 0.1; // +10% per level
  state.ballSpeedMultiplier = Math.min(speedMultiplier, 2); // Cap at 2x
};

BRICK BREAK PARTICLES:
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
  gravity: number;
}

const particlesRef = useRef<Particle[]>([]);

const spawnBrickParticles = (brick: Brick) => {
  const count = 12;
  const particles: Particle[] = Array(count).fill(null).map(() => ({
    x: brick.x + Math.random() * brick.width,
    y: brick.y + Math.random() * brick.height,
    vx: (Math.random() - 0.5) * 8,
    vy: (Math.random() - 0.5) * 8 - 2,
    color: brick.color,
    alpha: 1,
    size: 4 + Math.random() * 6,
    gravity: 0.2,
  }));

  particlesRef.current.push(...particles);
};

const updateParticles = () => {
  particlesRef.current = particlesRef.current
    .map(p => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      vy: p.vy + p.gravity,
      alpha: p.alpha - 0.02,
      size: p.size * 0.98,
    }))
    .filter(p => p.alpha > 0);
};

const renderParticles = (ctx: CanvasRenderingContext2D) => {
  particlesRef.current.forEach(p => {
    ctx.fillStyle = p.color + Math.floor(p.alpha * 255).toString(16).padStart(2, '0');
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
};

SCREEN SHAKE:
const [shaking, setShaking] = useState(false);
const shakeIntensity = useRef(0);

const triggerShake = (intensity: number = 5) => {
  shakeIntensity.current = intensity;
  setShaking(true);
  setTimeout(() => setShaking(false), 200);
};

// Apply shake in render
const render = (ctx: CanvasRenderingContext2D) => {
  ctx.save();

  if (shaking) {
    const dx = (Math.random() - 0.5) * shakeIntensity.current * 2;
    const dy = (Math.random() - 0.5) * shakeIntensity.current * 2;
    ctx.translate(dx, dy);
  }

  // ... render everything ...

  ctx.restore();
};

BALL TRAIL:
const ballTrailRef = useRef<Point[]>([]);

const updateBallTrail = () => {
  const { ball } = gameStateRef.current;
  if (!ball.isLaunched) return;

  ballTrailRef.current.unshift({ x: ball.x, y: ball.y });
  if (ballTrailRef.current.length > 15) {
    ballTrailRef.current.pop();
  }
};

const renderBallTrail = (ctx: CanvasRenderingContext2D) => {
  ballTrailRef.current.forEach((point, idx) => {
    const alpha = 1 - idx / ballTrailRef.current.length;
    const size = BALL_RADIUS * (1 - idx / ballTrailRef.current.length);

    ctx.beginPath();
    ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 107, 0, ${alpha * 0.3})`;
    ctx.fill();
  });
};

LEVEL BANNER:
const [levelBanner, setLevelBanner] = useState<number | null>(null);

const showLevelBanner = (level: number) => {
  setLevelBanner(level);
  setTimeout(() => setLevelBanner(null), 2000);
};

{levelBanner && (
  <div className="level-banner">
    <h2>LEVEL {levelBanner}</h2>
  </div>
)}

.level-banner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 48px;
  font-weight: bold;
  color: #ff6b00;
  text-shadow: 0 0 30px rgba(255, 107, 0, 0.8);
  animation: level-banner 2s ease-out forwards;
}

@keyframes level-banner {
  0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
  20% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
  80% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
}

COMBO SCORING:
const comboRef = useRef({ count: 0, timer: 0 });

// On brick hit
comboRef.current.count++;
comboRef.current.timer = 120; // 2 seconds at 60fps

const comboMultiplier = Math.min(comboRef.current.count, 10);
const points = brick.points * comboMultiplier;

// Decay combo
const updateCombo = () => {
  if (comboRef.current.timer > 0) {
    comboRef.current.timer--;
    if (comboRef.current.timer === 0) {
      comboRef.current.count = 0;
    }
  }
};

SCORE POPUPS:
const [scorePopups, setScorePopups] = useState<{id: number, x: number, y: number, value: number}[]>([]);

// On brick destroy
setScorePopups(prev => [...prev, {
  id: Date.now(),
  x: brick.x + brick.width / 2,
  y: brick.y,
  value: points,
}]);

HIT FLASH ON BRICK:
When brick takes damage but isn't destroyed:

const hitFlashRef = useRef<Map<Brick, number>>(new Map());

// On brick hit (not destroyed):
hitFlashRef.current.set(brick, Date.now() + 100);

// In renderBricks:
const flashEnd = hitFlashRef.current.get(brick);
if (flashEnd && Date.now() < flashEnd) {
  ctx.fillStyle = '#fff';
} else {
  ctx.fillStyle = gradient;
}
```

### ✅ Phase 4 Checkpoint

**Test these manually:**
- [ ] Completing level shows banner
- [ ] Next level has different brick layout
- [ ] Ball speed increases each level
- [ ] Brick particles spawn on destruction
- [ ] Particles fall with gravity and fade
- [ ] Screen shakes on impacts
- [ ] Ball has trailing effect
- [ ] Combo multiplier increases score
- [ ] Score popups appear on brick break
- [ ] Hit flash shows when brick takes damage
- [ ] Level 2+ has hard/unbreakable bricks

**Debug Prompt if issues:**
```
Level progression or effects not working in Brick Breaker.

Issue: [describe]

For level progression:
1. Is checkWin detecting all bricks destroyed?
2. Is nextLevel being called?
3. Is createBricksForLevel generating bricks?

For particles:
1. Is spawnBrickParticles called when brick.isDestroyed?
2. Are particles being updated in the game loop?
3. Is renderParticles being called?

Log: console.log('Remaining bricks:', bricks.filter(b => !b.isDestroyed).length);
Log: console.log('Particles:', particlesRef.current.length);

Show me the nextLevel function or particle code.
```

---

## PHASE 5: Audio, Leaderboard & Final Polish

### Prompt for Claude Code:

```
Add Howler.js audio, leaderboard, and final polish to Brick Breaker.

CURRENT STATE: Full game with levels and effects, needs audio and leaderboard.

AUDIO INTEGRATION:

Sounds needed:
- Paddle hit (bounce)
- Brick hit (impact)
- Brick break (satisfying break)
- Wall bounce
- Power-up catch
- Laser shoot
- Lose life
- Level complete
- Game over
- High score

const {
  playPaddleHit,
  playBrickHit,
  playBrickBreak,
  playWallBounce,
  playPowerUp,
  playLaser,
  playLoseLife,
  playLevelComplete,
  playGameOver,
  playHighScore,
  setMuted
} = useHowlerSounds();

// Triggers:
// Paddle bounce:
playPaddleHit();

// Brick hit (not destroyed):
playBrickHit();

// Brick break:
playBrickBreak();

// Wall/ceiling bounce:
playWallBounce();

// Catch power-up:
playPowerUp();

// Shoot laser:
playLaser();

// Lose life:
playLoseLife();

// Level complete:
playLevelComplete();

// Game over:
if (score > highScore) {
  playHighScore();
} else {
  playGameOver();
}

PITCH VARIATION:
Add variety to sounds:

const playBrickHitWithPitch = () => {
  const pitch = 0.9 + Math.random() * 0.2; // 0.9 to 1.1
  brickHitSound.rate(pitch);
  brickHitSound.play();
};

COMBO SOUNDS:
Play escalating sounds for combos:

const playComboSound = (combo: number) => {
  const pitch = 1 + (combo - 1) * 0.05; // Pitch up with combo
  comboSound.rate(Math.min(pitch, 1.5));
  comboSound.play();
};

LEADERBOARD INTEGRATION:

import { useLeaderboard } from '../../hooks/useLeaderboard';

const { submitScore, getTopScores } = useLeaderboard('brick-breaker');

const handleSubmitScore = async () => {
  if (score > 0) {
    await submitScore(score);
    setShowLeaderboard(true);
  }
};

HIGH SCORE PERSISTENCE:
const [highScore, setHighScore] = useState(() =>
  parseInt(localStorage.getItem('brick-breaker-high') || '0', 10)
);

useEffect(() => {
  if (score > highScore && isGameOver) {
    setHighScore(score);
    localStorage.setItem('brick-breaker-high', score.toString());
  }
}, [score, isGameOver]);

MOBILE POLISH:

1. Touch feedback:
// Visual ripple on paddle when hit
const [paddleRipple, setPaddleRipple] = useState(false);

// In checkPaddleCollision:
setPaddleRipple(true);
setTimeout(() => setPaddleRipple(false), 200);

// In renderPaddle:
if (paddleRipple) {
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.strokeRect(paddle.x - 2, paddle.y - 2, paddle.width + 4, paddle.height + 4);
}

2. Haptic feedback:
const vibrate = (pattern: number | number[]) => {
  if (navigator.vibrate) navigator.vibrate(pattern);
};

// On paddle hit:
vibrate(20);

// On brick break:
vibrate([30, 10, 30]);

// On lose life:
vibrate([100, 50, 100, 50, 100]);

3. Prevent scroll:
canvas {
  touch-action: none;
}

4. Double-tap launch prevention:
// Use pointerdown instead of click for more reliable touch

PAUSE FUNCTIONALITY:
const [isPaused, setIsPaused] = useState(false);

const togglePause = () => {
  setIsPaused(prev => !prev);
  gameStateRef.current.isPaused = !gameStateRef.current.isPaused;
};

// Pause button
<button className="pause-btn" onClick={togglePause}>
  {isPaused ? '▶️' : '⏸️'}
</button>

// Pause overlay
{isPaused && (
  <div className="pause-overlay">
    <h2>PAUSED</h2>
    <button onClick={togglePause}>Resume</button>
    <button onClick={quitGame}>Quit</button>
  </div>
)}

// Auto-pause when tab hidden
useEffect(() => {
  const handleVisibility = () => {
    if (document.hidden && isPlaying && !isPaused) {
      togglePause();
    }
  };
  document.addEventListener('visibilitychange', handleVisibility);
  return () => document.removeEventListener('visibilitychange', handleVisibility);
}, [isPlaying, isPaused]);

GAME OVER SCREEN:
{isGameOver && (
  <div className="game-over-overlay">
    <div className="game-over-modal">
      <h2>{lives > 0 ? 'YOU WIN!' : 'GAME OVER'}</h2>

      <div className="stats">
        <div className="stat">
          <span>Final Score</span>
          <span className="value">{score}</span>
        </div>
        <div className="stat">
          <span>Level Reached</span>
          <span className="value">{level}</span>
        </div>
        <div className="stat">
          <span>High Score</span>
          <span className="value">{highScore}</span>
        </div>
      </div>

      {score > prevHighScore && (
        <div className="new-record">🎉 NEW HIGH SCORE! 🎉</div>
      )}

      <div className="buttons">
        <button onClick={restartGame}>Play Again</button>
        <button onClick={handleSubmitScore}>Leaderboard</button>
        <button onClick={shareScore}>Share</button>
      </div>
    </div>
  </div>
)}

SHARE FUNCTIONALITY:
const shareScore = async () => {
  const text = `🧱 I scored ${score} on Level ${level} in Brick Breaker!\n\nPlay at wojak.ink`;

  if (navigator.share) {
    await navigator.share({ text });
  } else {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!');
  }
};

KEYBOARD CONTROLS:
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isPlaying) return;

    const { paddle } = gameStateRef.current;
    const moveSpeed = 20;

    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
        paddle.x = Math.max(0, paddle.x - moveSpeed);
        break;
      case 'ArrowRight':
      case 'd':
        paddle.x = Math.min(gameWidth - paddle.width, paddle.x + moveSpeed);
        break;
      case ' ':
        if (!gameStateRef.current.ball.isLaunched) {
          launchBall();
        } else if (paddle.hasLaser) {
          shootLaser();
        }
        break;
      case 'Escape':
      case 'p':
        togglePause();
        break;
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [isPlaying]);

FINAL POLISH:

1. Loading screen while assets load
2. Fade transitions between states
3. Canvas retina support
4. FPS counter (debug mode)
5. Accessibility: screen reader announcements

RETINA SUPPORT:
const dpr = window.devicePixelRatio || 1;
canvas.width = gameWidth * dpr;
canvas.height = gameHeight * dpr;
canvas.style.width = `${gameWidth}px`;
canvas.style.height = `${gameHeight}px`;
ctx.scale(dpr, dpr);
```

### ✅ Phase 5 Final Checklist

**Audio:**
- [ ] Paddle hit sound
- [ ] Brick hit sound (when damaged)
- [ ] Brick break sound (when destroyed)
- [ ] Wall bounce sound
- [ ] Power-up catch sound
- [ ] Laser sound (if applicable)
- [ ] Lose life sound
- [ ] Level complete fanfare
- [ ] Game over sound
- [ ] High score fanfare
- [ ] Mute toggle works

**Leaderboard:**
- [ ] Score submits correctly
- [ ] Leaderboard displays
- [ ] High score persists locally

**Controls:**
- [ ] Touch/mouse moves paddle smoothly
- [ ] Arrow keys / A/D move paddle
- [ ] Space launches ball
- [ ] Space fires laser (when active)
- [ ] Escape/P pauses game

**Polish:**
- [ ] Pause works correctly
- [ ] Auto-pause when tab hidden
- [ ] Game over shows stats
- [ ] Share generates correct text
- [ ] Haptic feedback (if available)
- [ ] Smooth 60fps performance

**Debug Prompt if issues:**
```
Audio or final features not working in Brick Breaker.

Issue: [describe]

For audio:
1. Are sound files loaded correctly?
2. Is the correct trigger being called?
3. Check browser console for audio errors

For controls:
1. Is the keydown listener being added?
2. Is paddle.x being updated correctly?
3. Is event.key matching expected values?

Show me the audio setup or control handlers.
```

---

## Complete File Structure

```
src/games/BrickBreaker/
├── BrickBreakerGame.tsx   # Main component
├── BrickBreakerGame.css   # Styles
├── types.ts               # Interfaces
├── constants.ts           # Game values
├── levels.ts              # Level layouts
├── powerups.ts            # Power-up config
└── renderer.ts            # Canvas rendering

public/assets/sounds/
├── paddle-hit.mp3
├── brick-hit.mp3
├── brick-break.mp3
├── wall-bounce.mp3
├── power-up.mp3
├── laser.mp3
├── lose-life.mp3
├── level-complete.mp3
├── game-over.mp3
└── high-score.mp3
```

---

## Constants Reference

```typescript
// constants.ts
export const PADDLE = {
  WIDTH: 100,
  HEIGHT: 15,
  Y_OFFSET: 40, // From bottom
  SPEED: 20,    // For keyboard
} as const;

export const BALL = {
  RADIUS: 10,
  SPEED: 6,
  MAX_SPEED: 12,
} as const;

export const BRICK = {
  ROWS: 6,
  COLS: 8,
  WIDTH: 52, // Calculated from game width
  HEIGHT: 25,
  PADDING: 4,
  TOP_OFFSET: 80,
} as const;

export const POWERUP_TYPES = {
  expand: { color: '#00ff00', emoji: '↔️', duration: 10000 },
  shrink: { color: '#ff0000', emoji: '↕️', duration: 8000 },
  multiball: { color: '#ffcc00', emoji: '⚪', duration: null },
  fireball: { color: '#ff6b00', emoji: '🔥', duration: 8000 },
  slowdown: { color: '#00ffff', emoji: '🐢', duration: null },
  speedup: { color: '#ff00ff', emoji: '⚡', duration: null },
  extralife: { color: '#ff69b4', emoji: '❤️', duration: null },
  laser: { color: '#ff0000', emoji: '🔫', duration: 15000 },
} as const;
```
