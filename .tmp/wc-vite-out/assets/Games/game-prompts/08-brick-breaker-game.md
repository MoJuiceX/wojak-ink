# Claude Code Prompt: Orange Brick Breaker Game

## Overview
Build a classic Brick Breaker / Breakout game for wojak.ink with Canvas rendering, satisfying physics, powerups, and level progression.

---

## TECH STACK & ARCHITECTURE

```
Framework: React + TypeScript + Ionic Framework
Rendering: HTML5 Canvas
Physics: Custom ball physics (no library needed)
Animation: requestAnimationFrame game loop
Styling: CSS for UI overlays
Sound: useGameSounds() hook
Leaderboard: useLeaderboard('brick-breaker') hook
Mobile Detection: useIsMobile() hook
```

**File Structure:**
```
src/pages/BrickBreaker.tsx         # Main game component
src/pages/BrickBreaker.css         # UI styles + overlay effects
src/pages/brickLevels.ts           # Level definitions
src/components/media/games/GameModal.tsx  # Add lazy import
src/config/query/queryKeys.ts      # Add 'brick-breaker' to GameId type
```

---

## GAME SPECIFICATIONS

### Game Area
- **Desktop**: 650px wide x 500px tall
- **Mobile**: Full screen width x (height - 105px)

### Paddle
- **Width**: 100px (expandable with powerup)
- **Height**: 15px
- **Color**: Orange gradient
- **Position**: 30px from bottom
- **Control**: Follows mouse/finger horizontally

### Ball
- **Radius**: 8px
- **Color**: Orange with glow trail
- **Speed**: Starts at 5, increases 5% per level
- **Angle**: Variable based on paddle contact position

### Bricks
- **Grid**: 10 columns, varies by level
- **Brick Size**: (game_width - padding) / 10 x 25px
- **Types**:
  - Normal (1 hit) - Orange
  - Strong (2 hits) - Red
  - Unbreakable - Gray (part of level design)

### Lives
- **Starting**: 3 lives
- **Lose life**: Ball falls below paddle
- **Extra life**: Powerup or milestone

### Levels
- 10 designed levels, then endless random
- Speed increases 5% per level
- More bricks per level

### Scoring
- **Primary**: Total score
- **Secondary**: Highest level reached
- **Points**:
  - Normal brick: 10 points
  - Strong brick: 25 points
  - Multi-brick combo: Bonus multiplier

---

## DATA STRUCTURES

```typescript
interface Ball {
  x: number;
  y: number;
  vx: number; // Velocity X
  vy: number; // Velocity Y
  radius: number;
  speed: number;
}

interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'normal' | 'strong' | 'unbreakable';
  hits: number; // Remaining hits
  color: string;
}

interface Powerup {
  x: number;
  y: number;
  type: 'expand' | 'multiball' | 'fireball' | 'extralife' | 'slow';
  vy: number; // Falls downward
}

interface GameState {
  balls: Ball[];
  paddle: Paddle;
  bricks: Brick[];
  powerups: Powerup[];
  score: number;
  lives: number;
  level: number;
  status: 'idle' | 'playing' | 'paused' | 'levelComplete' | 'gameover';
}
```

---

## LEVEL DEFINITIONS

```typescript
// brickLevels.ts

// 0 = empty, 1 = normal, 2 = strong, 9 = unbreakable
export const LEVELS: number[][][] = [
  // Level 1 - Simple intro
  [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ],

  // Level 2 - Introduce strong bricks
  [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 2, 1, 1, 2, 2, 1, 1, 2, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ],

  // Level 3 - Pyramid
  [
    [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
    [0, 0, 1, 1, 2, 2, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ],

  // Level 4 - Walls
  [
    [1, 9, 1, 1, 1, 1, 1, 1, 9, 1],
    [1, 9, 1, 1, 1, 1, 1, 1, 9, 1],
    [1, 9, 2, 2, 2, 2, 2, 2, 9, 1],
    [1, 9, 1, 1, 1, 1, 1, 1, 9, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ],

  // Level 5 - Checker
  [
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    [2, 0, 2, 0, 2, 0, 2, 0, 2, 0],
    [0, 2, 0, 2, 0, 2, 0, 2, 0, 2],
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  ],

  // ... more levels

  // Level 10 - Final challenge
  [
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    [2, 9, 9, 2, 2, 2, 2, 9, 9, 2],
    [2, 9, 9, 2, 2, 2, 2, 9, 9, 2],
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ],
];

export const generateRandomLevel = (): number[][] => {
  const rows = 4 + Math.floor(Math.random() * 3);
  const level: number[][] = [];

  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < 10; c++) {
      const rand = Math.random();
      if (rand < 0.1) row.push(0);      // 10% empty
      else if (rand < 0.3) row.push(2); // 20% strong
      else if (rand < 0.35) row.push(9);// 5% unbreakable
      else row.push(1);                  // 65% normal
    }
    level.push(row);
  }

  return level;
};
```

---

## PHYSICS & COLLISION

### Ball Movement
```typescript
const INITIAL_BALL_SPEED = 5;

const updateBall = (ball: Ball, deltaTime: number = 1) => {
  ball.x += ball.vx * deltaTime;
  ball.y += ball.vy * deltaTime;
};
```

### Wall Collision
```typescript
const checkWallCollision = (ball: Ball, gameWidth: number, gameHeight: number) => {
  // Left wall
  if (ball.x - ball.radius < 0) {
    ball.x = ball.radius;
    ball.vx = -ball.vx;
    playBlockLand();
  }

  // Right wall
  if (ball.x + ball.radius > gameWidth) {
    ball.x = gameWidth - ball.radius;
    ball.vx = -ball.vx;
    playBlockLand();
  }

  // Top wall
  if (ball.y - ball.radius < 0) {
    ball.y = ball.radius;
    ball.vy = -ball.vy;
    playBlockLand();
  }
};
```

### Paddle Collision (with angle control)
```typescript
const checkPaddleCollision = (ball: Ball, paddle: Paddle) => {
  // Check if ball is at paddle level
  if (ball.y + ball.radius >= paddle.y &&
      ball.y - ball.radius <= paddle.y + paddle.height &&
      ball.x >= paddle.x &&
      ball.x <= paddle.x + paddle.width) {

    // Calculate where on paddle the ball hit (0 = left edge, 1 = right edge)
    const hitPosition = (ball.x - paddle.x) / paddle.width;

    // Convert to angle: left edge = 150°, center = 90°, right edge = 30°
    // (angles in radians, measured from positive X axis)
    const minAngle = Math.PI / 6;   // 30 degrees
    const maxAngle = Math.PI * 5/6; // 150 degrees
    const angle = maxAngle - hitPosition * (maxAngle - minAngle);

    // Set new velocity based on angle
    ball.vx = ball.speed * Math.cos(angle);
    ball.vy = -ball.speed * Math.sin(angle); // Negative = upward

    // Ensure ball is above paddle
    ball.y = paddle.y - ball.radius;

    playBlockLand();
    triggerScreenShake(20);
  }
};
```

### Brick Collision
```typescript
const checkBrickCollision = (
  ball: Ball,
  bricks: Brick[]
): { hitBrick: Brick | null; destroyed: boolean } => {

  for (const brick of bricks) {
    if (brick.hits <= 0) continue; // Already destroyed

    // AABB collision check
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

      if (minOverlapX < minOverlapY) {
        ball.vx = -ball.vx; // Horizontal bounce
      } else {
        ball.vy = -ball.vy; // Vertical bounce
      }

      // Damage brick (unless unbreakable)
      if (brick.type !== 'unbreakable') {
        brick.hits--;

        if (brick.hits <= 0) {
          return { hitBrick: brick, destroyed: true };
        } else {
          // Crack effect for strong bricks
          brick.color = '#FF4444'; // Turn red when damaged
          return { hitBrick: brick, destroyed: false };
        }
      }

      return { hitBrick: null, destroyed: false };
    }
  }

  return { hitBrick: null, destroyed: false };
};
```

### Ball Lost Detection
```typescript
const checkBallLost = (ball: Ball, gameHeight: number): boolean => {
  return ball.y - ball.radius > gameHeight;
};
```

---

## POWERUP SYSTEM

```typescript
const POWERUP_CHANCE = 0.15; // 15% chance on brick destroy
const POWERUP_SPEED = 2;

const POWERUP_TYPES: PowerupType[] = ['expand', 'multiball', 'fireball', 'slow', 'extralife'];

const maybeSpawnPowerup = (brick: Brick) => {
  if (Math.random() < POWERUP_CHANCE) {
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    const powerup: Powerup = {
      x: brick.x + brick.width / 2,
      y: brick.y + brick.height / 2,
      type,
      vy: POWERUP_SPEED
    };
    gameState.powerups.push(powerup);
  }
};

const updatePowerups = () => {
  gameState.powerups.forEach(powerup => {
    powerup.y += powerup.vy;
  });

  // Remove off-screen powerups
  gameState.powerups = gameState.powerups.filter(p => p.y < GAME_HEIGHT);
};

const checkPowerupCollision = (paddle: Paddle) => {
  gameState.powerups.forEach((powerup, index) => {
    if (powerup.y + 10 >= paddle.y &&
        powerup.x >= paddle.x &&
        powerup.x <= paddle.x + paddle.width) {

      applyPowerup(powerup.type);
      gameState.powerups.splice(index, 1);
    }
  });
};

const applyPowerup = (type: PowerupType) => {
  playPerfectBonus();
  showEpicCallout(type.toUpperCase() + '!');

  switch (type) {
    case 'expand':
      gameState.paddle.width = Math.min(200, gameState.paddle.width * 1.5);
      setTimeout(() => {
        gameState.paddle.width = 100;
      }, 10000);
      break;

    case 'multiball':
      const currentBall = gameState.balls[0];
      gameState.balls.push({
        ...currentBall,
        vx: -currentBall.vx // Opposite direction
      });
      gameState.balls.push({
        ...currentBall,
        vx: currentBall.vx * 0.5,
        vy: -currentBall.vy
      });
      break;

    case 'fireball':
      gameState.balls.forEach(ball => {
        ball.isFireball = true;
      });
      setTimeout(() => {
        gameState.balls.forEach(ball => {
          ball.isFireball = false;
        });
      }, 8000);
      break;

    case 'slow':
      gameState.balls.forEach(ball => {
        ball.speed *= 0.7;
        ball.vx *= 0.7;
        ball.vy *= 0.7;
      });
      setTimeout(() => {
        gameState.balls.forEach(ball => {
          ball.speed /= 0.7;
          // Velocities will normalize on next paddle hit
        });
      }, 8000);
      break;

    case 'extralife':
      gameState.lives++;
      break;
  }
};
```

---

## CANVAS RENDERING

```typescript
const render = (ctx: CanvasRenderingContext2D) => {
  // Clear canvas
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // Draw bricks
  drawBricks(ctx);

  // Draw paddle
  drawPaddle(ctx);

  // Draw balls
  gameState.balls.forEach(ball => drawBall(ctx, ball));

  // Draw powerups
  drawPowerups(ctx);

  // Draw UI
  drawUI(ctx);
};

const drawBricks = (ctx: CanvasRenderingContext2D) => {
  gameState.bricks.forEach(brick => {
    if (brick.hits <= 0) return;

    // Brick gradient
    const gradient = ctx.createLinearGradient(
      brick.x, brick.y,
      brick.x, brick.y + brick.height
    );

    if (brick.type === 'normal') {
      gradient.addColorStop(0, '#FF8533');
      gradient.addColorStop(1, '#FF6B00');
    } else if (brick.type === 'strong') {
      gradient.addColorStop(0, brick.hits === 2 ? '#FF6666' : '#FF3333');
      gradient.addColorStop(1, brick.hits === 2 ? '#FF4444' : '#CC0000');
    } else {
      gradient.addColorStop(0, '#666666');
      gradient.addColorStop(1, '#444444');
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(brick.x, brick.y, brick.width - 2, brick.height - 2);

    // Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(brick.x, brick.y, brick.width - 2, brick.height / 3);

    // Crack effect for damaged strong bricks
    if (brick.type === 'strong' && brick.hits === 1) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(brick.x + brick.width * 0.3, brick.y);
      ctx.lineTo(brick.x + brick.width * 0.5, brick.y + brick.height * 0.5);
      ctx.lineTo(brick.x + brick.width * 0.7, brick.y + brick.height);
      ctx.stroke();
    }
  });
};

const drawPaddle = (ctx: CanvasRenderingContext2D) => {
  const { paddle } = gameState;

  // Paddle gradient
  const gradient = ctx.createLinearGradient(
    paddle.x, paddle.y,
    paddle.x, paddle.y + paddle.height
  );
  gradient.addColorStop(0, '#FF8533');
  gradient.addColorStop(1, '#FF6B00');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 5);
  ctx.fill();

  // Glow effect
  ctx.shadowColor = '#FF6B00';
  ctx.shadowBlur = 15;
  ctx.fill();
  ctx.shadowBlur = 0;
};

const drawBall = (ctx: CanvasRenderingContext2D, ball: Ball) => {
  // Trail effect
  const trailLength = 5;
  for (let i = trailLength; i > 0; i--) {
    const alpha = 0.15 * (1 - i / trailLength);
    ctx.beginPath();
    ctx.arc(
      ball.x - ball.vx * i * 0.5,
      ball.y - ball.vy * i * 0.5,
      ball.radius - i,
      0, Math.PI * 2
    );
    ctx.fillStyle = ball.isFireball
      ? `rgba(255, 100, 0, ${alpha})`
      : `rgba(255, 107, 0, ${alpha})`;
    ctx.fill();
  }

  // Main ball
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);

  if (ball.isFireball) {
    ctx.fillStyle = '#FF4400';
    ctx.shadowColor = '#FF0000';
    ctx.shadowBlur = 20;
  } else {
    ctx.fillStyle = '#FF6B00';
    ctx.shadowColor = '#FF6B00';
    ctx.shadowBlur = 10;
  }

  ctx.fill();
  ctx.shadowBlur = 0;
};

const drawPowerups = (ctx: CanvasRenderingContext2D) => {
  const POWERUP_COLORS = {
    expand: '#00FF00',
    multiball: '#FF00FF',
    fireball: '#FF4400',
    slow: '#00FFFF',
    extralife: '#FF0000'
  };

  gameState.powerups.forEach(powerup => {
    ctx.beginPath();
    ctx.arc(powerup.x, powerup.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = POWERUP_COLORS[powerup.type];
    ctx.fill();

    ctx.fillStyle = '#FFF';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(powerup.type[0].toUpperCase(), powerup.x, powerup.y + 4);
  });
};

const drawUI = (ctx: CanvasRenderingContext2D) => {
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 18px Arial';

  // Score
  ctx.textAlign = 'left';
  ctx.fillText(`Score: ${gameState.score}`, 10, 25);

  // Level
  ctx.textAlign = 'center';
  ctx.fillText(`Level ${gameState.level}`, GAME_WIDTH / 2, 25);

  // Lives
  ctx.textAlign = 'right';
  ctx.fillText(`❤️ x ${gameState.lives}`, GAME_WIDTH - 10, 25);
};
```

---

## GAME LOOP

```typescript
const gameLoop = () => {
  if (gameState.status !== 'playing') return;

  // Update paddle position (follows mouse)
  // (handled by event listener)

  // Update balls
  gameState.balls.forEach(ball => {
    updateBall(ball);
    checkWallCollision(ball, GAME_WIDTH, GAME_HEIGHT);
    checkPaddleCollision(ball, gameState.paddle);

    const { hitBrick, destroyed } = checkBrickCollision(ball, gameState.bricks);
    if (hitBrick) {
      onBrickHit(hitBrick, destroyed);
    }
  });

  // Check for lost balls
  gameState.balls = gameState.balls.filter(ball => !checkBallLost(ball, GAME_HEIGHT));

  if (gameState.balls.length === 0) {
    handleBallLost();
  }

  // Update powerups
  updatePowerups();
  checkPowerupCollision(gameState.paddle);

  // Check level complete
  const breakableBricks = gameState.bricks.filter(
    b => b.type !== 'unbreakable' && b.hits > 0
  );
  if (breakableBricks.length === 0) {
    handleLevelComplete();
  }

  // Render
  render(ctx);

  requestAnimationFrame(gameLoop);
};
```

---

## EXTREME EFFECTS PHILOSOPHY

### Brick Destruction Effects
```typescript
const onBrickHit = (brick: Brick, destroyed: boolean) => {
  playBlockLand();

  if (destroyed) {
    // Add points
    const points = brick.type === 'strong' ? 25 : 10;
    gameState.score += points;

    // Show score popup
    showScorePopup(`+${points}`, brick.x + brick.width / 2, brick.y);

    // Particle burst
    spawnBrickParticles(brick);

    // Maybe spawn powerup
    maybeSpawnPowerup(brick);

    // Combo tracking
    comboCount++;
    if (comboCount >= 3) {
      showEpicCallout('COMBO x' + comboCount);
      playCombo();
    }
    if (comboCount >= 5) {
      triggerScreenShake();
      spawnFloatingEmojis(['🔥', '💥']);
    }
    if (comboCount >= 10) {
      showEpicCallout('🔥 UNSTOPPABLE! 🔥');
      triggerConfetti();
    }

    // Reset combo after delay
    clearTimeout(comboTimeout);
    comboTimeout = setTimeout(() => comboCount = 0, 500);
  }
};

const spawnBrickParticles = (brick: Brick) => {
  const particleCount = 8;
  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2;
    particles.push({
      x: brick.x + brick.width / 2,
      y: brick.y + brick.height / 2,
      vx: Math.cos(angle) * 3,
      vy: Math.sin(angle) * 3,
      color: brick.color,
      life: 1
    });
  }
};
```

### Level Complete
```typescript
const handleLevelComplete = () => {
  gameState.status = 'levelComplete';

  playWinSound();
  showEpicCallout(`LEVEL ${gameState.level} COMPLETE!`);
  triggerConfetti();

  // Bonus for remaining lives
  const lifeBonus = gameState.lives * 100;
  gameState.score += lifeBonus;
  showScorePopup(`+${lifeBonus} LIFE BONUS`, GAME_WIDTH / 2, GAME_HEIGHT / 2);

  setTimeout(() => {
    loadLevel(gameState.level + 1);
  }, 2000);
};
```

---

## PADDLE CONTROL

```typescript
const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;

  // Clamp paddle to game area
  gameState.paddle.x = Math.max(
    0,
    Math.min(mouseX - gameState.paddle.width / 2, GAME_WIDTH - gameState.paddle.width)
  );
};

const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
  e.preventDefault();
  const canvas = canvasRef.current;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const touchX = e.touches[0].clientX - rect.left;

  gameState.paddle.x = Math.max(
    0,
    Math.min(touchX - gameState.paddle.width / 2, GAME_WIDTH - gameState.paddle.width)
  );
};
```

---

## LEADERBOARD INTEGRATION

```typescript
const { leaderboard, submitScore, isSignedIn } = useLeaderboard('brick-breaker');

const handleGameOver = async () => {
  gameState.status = 'gameover';
  playGameOver();
  triggerScreenShake();

  if (isSignedIn) {
    await submitScore(gameState.score, gameState.level, {
      highestLevel: gameState.level,
      bricksDestroyed: totalBricksDestroyed
    });
  }
};
```

---

## TESTING CHECKLIST

- [ ] Ball bounces off walls correctly
- [ ] Ball angle changes based on paddle contact position
- [ ] Brick collision detection works
- [ ] Strong bricks take 2 hits
- [ ] Unbreakable bricks don't break
- [ ] Powerups fall and can be collected
- [ ] All powerup effects work correctly
- [ ] Lives decrease when ball is lost
- [ ] Game over at 0 lives
- [ ] Level completes when all breakable bricks gone
- [ ] Speed increases per level
- [ ] Particle effects on brick destruction
- [ ] Combo system works
- [ ] Leaderboard submission works
- [ ] Mobile touch controls work

---

**IMPORTANT**: The ball physics must feel SATISFYING. The angle off the paddle should give the player control. Brick destruction should feel impactful with particles, screen shake, and sounds. Combos should build excitement with escalating effects. Powerups should feel powerful and fun!
