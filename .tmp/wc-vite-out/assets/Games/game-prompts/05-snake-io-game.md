# Claude Code Prompt: Orange Snake.io Game

## Overview
Build a Slither.io style snake game for wojak.ink with smooth continuous movement (NOT grid-based). The player snake follows mouse/finger position, competing against AI snakes in a bounded arena.

---

## TECH STACK & ARCHITECTURE

```
Framework: React + TypeScript + Ionic Framework
Rendering: HTML5 Canvas
Animation: requestAnimationFrame game loop
Physics: Custom (no library needed)
Styling: CSS for UI overlays
Sound: useGameSounds() hook
Leaderboard: useLeaderboard('orange-snake') hook
Mobile Detection: useIsMobile() hook
```

**File Structure:**
```
src/pages/OrangeSnake.tsx          # Main game component
src/pages/OrangeSnake.css          # UI styles + overlay effects
src/components/media/games/GameModal.tsx  # Add lazy import
src/config/query/queryKeys.ts      # Add 'orange-snake' to GameId type
```

---

## GAME SPECIFICATIONS

### Player Snake
- **Appearance**: Orange glowing segments
- **Starting Length**: 10 segments
- **Segment Size**: 12px radius (head), tapering to 8px (tail)
- **Movement**: Smooth following of mouse/finger position
- **Turn Speed**: Gradual turning (not instant)

### AI Snakes
- **Count**: 5-8 AI snakes
- **Behavior**: Wander + seek nearest food
- **Respawn**: 3-5 seconds after death
- **Appearance**: Different colors (green, blue, purple, etc.)

### Arena
- **Style**: Bounded (no wrap-around)
- **Size**: 800x600 (desktop) or fullscreen (mobile)
- **Background**: Dark with subtle grid pattern

### Food (Pellets)
- **Appearance**: Small orange dots
- **Count**: Maintain 30-50 pellets on screen
- **Value**: +1 length per pellet eaten

### Scoring
- **Primary**: Maximum length achieved
- **Secondary**: Time survived

### Game Over
- Snake head collides with:
  - Its own body
  - Another snake's body
  - Arena walls

---

## CORE DATA STRUCTURES

```typescript
interface Point {
  x: number;
  y: number;
}

interface Segment extends Point {
  radius: number;
}

interface Snake {
  id: string;
  segments: Segment[];
  color: string;
  glowColor: string;
  speed: number;
  direction: Point; // Unit vector
  isPlayer: boolean;
  targetFood: Point | null;
  isDead: boolean;
  score: number;
}

interface Food extends Point {
  id: string;
  radius: number;
}

interface GameState {
  playerSnake: Snake;
  aiSnakes: Snake[];
  food: Food[];
  gameStatus: 'idle' | 'playing' | 'gameover';
  mousePosition: Point;
  gameTime: number;
}
```

---

## SNAKE MOVEMENT SYSTEM

### Head Following Mouse/Finger
```typescript
const SNAKE_SPEED = 3; // Pixels per frame
const TURN_RATE = 0.15; // How quickly snake turns (0-1)

const updateSnakeDirection = (snake: Snake, targetX: number, targetY: number) => {
  const head = snake.segments[0];
  const dx = targetX - head.x;
  const dy = targetY - head.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < 5) return; // Too close, don't turn

  // Target direction (unit vector)
  const targetDir = {
    x: dx / distance,
    y: dy / distance
  };

  // Smoothly interpolate toward target direction
  snake.direction.x += (targetDir.x - snake.direction.x) * TURN_RATE;
  snake.direction.y += (targetDir.y - snake.direction.y) * TURN_RATE;

  // Normalize direction
  const len = Math.sqrt(snake.direction.x ** 2 + snake.direction.y ** 2);
  snake.direction.x /= len;
  snake.direction.y /= len;
};

const moveSnake = (snake: Snake) => {
  if (snake.isDead) return;

  // Move head
  const head = snake.segments[0];
  const newHead: Segment = {
    x: head.x + snake.direction.x * snake.speed,
    y: head.y + snake.direction.y * snake.speed,
    radius: head.radius
  };

  // Add new head position
  snake.segments.unshift(newHead);

  // Remove tail (unless growing)
  if (!snake.isGrowing) {
    snake.segments.pop();
  } else {
    snake.isGrowing = false;
  }

  // Update segment radii (tapering effect)
  const headRadius = 12;
  const tailRadius = 6;
  snake.segments.forEach((seg, i) => {
    const t = i / (snake.segments.length - 1);
    seg.radius = headRadius - (headRadius - tailRadius) * t;
  });
};
```

### Body Following Head (Smooth Trail)
```typescript
// Alternative: Each segment follows the one ahead
const updateSnakeBody = (snake: Snake) => {
  const SEGMENT_SPACING = 8; // Pixels between segment centers

  for (let i = 1; i < snake.segments.length; i++) {
    const current = snake.segments[i];
    const ahead = snake.segments[i - 1];

    const dx = ahead.x - current.x;
    const dy = ahead.y - current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > SEGMENT_SPACING) {
      const moveRatio = (distance - SEGMENT_SPACING) / distance;
      current.x += dx * moveRatio;
      current.y += dy * moveRatio;
    }
  }
};
```

---

## INPUT HANDLING

### Mouse (Desktop)
```typescript
const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  setMousePosition({
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  });
};
```

### Touch (Mobile)
```typescript
const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
  e.preventDefault();
  const canvas = canvasRef.current;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  setMousePosition({
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top
  });
};

// Boost on double-tap (optional Slither.io feature)
const handleDoubleTap = () => {
  if (gameState.playerSnake.segments.length > 15) {
    activateBoost();
  }
};
```

---

## COLLISION DETECTION

### Circle-Circle Collision
```typescript
const checkCircleCollision = (
  p1: Point, r1: number,
  p2: Point, r2: number
): boolean => {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < (r1 + r2);
};
```

### Snake Self-Collision
```typescript
const checkSelfCollision = (snake: Snake): boolean => {
  const head = snake.segments[0];

  // Skip first few segments (can't collide with itself immediately)
  for (let i = 10; i < snake.segments.length; i++) {
    const segment = snake.segments[i];
    if (checkCircleCollision(head, head.radius, segment, segment.radius)) {
      return true;
    }
  }
  return false;
};
```

### Snake vs Other Snake
```typescript
const checkSnakeCollision = (playerSnake: Snake, otherSnake: Snake): boolean => {
  const head = playerSnake.segments[0];

  // Check against all segments of other snake
  for (const segment of otherSnake.segments) {
    if (checkCircleCollision(head, head.radius, segment, segment.radius)) {
      return true;
    }
  }
  return false;
};
```

### Wall Collision
```typescript
const checkWallCollision = (snake: Snake, width: number, height: number): boolean => {
  const head = snake.segments[0];
  return (
    head.x - head.radius < 0 ||
    head.x + head.radius > width ||
    head.y - head.radius < 0 ||
    head.y + head.radius > height
  );
};
```

### Food Collection
```typescript
const checkFoodCollision = (snake: Snake, food: Food[]): Food | null => {
  const head = snake.segments[0];

  for (const f of food) {
    if (checkCircleCollision(head, head.radius, f, f.radius)) {
      return f;
    }
  }
  return null;
};
```

---

## AI SNAKE BEHAVIOR

```typescript
const updateAISnake = (
  aiSnake: Snake,
  food: Food[],
  allSnakes: Snake[],
  canvasWidth: number,
  canvasHeight: number
) => {
  if (aiSnake.isDead) return;

  const head = aiSnake.segments[0];

  // Find nearest food
  let nearestFood: Food | null = null;
  let nearestDist = Infinity;

  for (const f of food) {
    const dist = Math.hypot(f.x - head.x, f.y - head.y);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestFood = f;
    }
  }

  // Wander randomly sometimes
  if (Math.random() < 0.02 || !nearestFood) {
    aiSnake.targetFood = {
      x: Math.random() * canvasWidth,
      y: Math.random() * canvasHeight
    };
  } else {
    aiSnake.targetFood = nearestFood;
  }

  // Move toward target
  if (aiSnake.targetFood) {
    updateSnakeDirection(aiSnake, aiSnake.targetFood.x, aiSnake.targetFood.y);
  }

  // Avoid walls (simple boundary awareness)
  const margin = 50;
  if (head.x < margin) aiSnake.direction.x += 0.1;
  if (head.x > canvasWidth - margin) aiSnake.direction.x -= 0.1;
  if (head.y < margin) aiSnake.direction.y += 0.1;
  if (head.y > canvasHeight - margin) aiSnake.direction.y -= 0.1;

  // Normalize direction again
  const len = Math.sqrt(aiSnake.direction.x ** 2 + aiSnake.direction.y ** 2);
  aiSnake.direction.x /= len;
  aiSnake.direction.y /= len;

  moveSnake(aiSnake);
};
```

---

## FOOD SPAWNING

```typescript
const MIN_FOOD = 30;
const MAX_FOOD = 50;
const FOOD_RADIUS = 5;

const spawnFood = (count: number, width: number, height: number): Food[] => {
  const newFood: Food[] = [];
  const margin = 30;

  for (let i = 0; i < count; i++) {
    newFood.push({
      id: `food-${Date.now()}-${Math.random()}`,
      x: margin + Math.random() * (width - margin * 2),
      y: margin + Math.random() * (height - margin * 2),
      radius: FOOD_RADIUS
    });
  }

  return newFood;
};

// In game loop
if (food.length < MIN_FOOD) {
  setFood(prev => [...prev, ...spawnFood(5, CANVAS_WIDTH, CANVAS_HEIGHT)]);
}
```

---

## CANVAS RENDERING

```typescript
const render = (ctx: CanvasRenderingContext2D) => {
  const { playerSnake, aiSnakes, food, gameStatus } = gameStateRef.current;

  // Clear canvas
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Draw grid pattern
  drawGrid(ctx);

  // Draw food
  drawFood(ctx, food);

  // Draw AI snakes
  aiSnakes.forEach(snake => {
    if (!snake.isDead) {
      drawSnake(ctx, snake);
    }
  });

  // Draw player snake (on top)
  if (!playerSnake.isDead) {
    drawSnake(ctx, playerSnake);
  }

  // Draw UI
  drawScore(ctx, playerSnake.segments.length);
};

const drawGrid = (ctx: CanvasRenderingContext2D) => {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;

  const gridSize = 40;
  for (let x = 0; x < CANVAS_WIDTH; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y < CANVAS_HEIGHT; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }
};

const drawSnake = (ctx: CanvasRenderingContext2D, snake: Snake) => {
  // Draw glow effect for player
  if (snake.isPlayer) {
    ctx.shadowColor = snake.glowColor;
    ctx.shadowBlur = 15;
  }

  // Draw segments from tail to head
  for (let i = snake.segments.length - 1; i >= 0; i--) {
    const segment = snake.segments[i];
    const isHead = i === 0;

    ctx.beginPath();
    ctx.arc(segment.x, segment.y, segment.radius, 0, Math.PI * 2);
    ctx.fillStyle = snake.color;
    ctx.fill();

    // Head details
    if (isHead) {
      // Eyes
      const eyeOffset = segment.radius * 0.4;
      const eyeRadius = segment.radius * 0.25;

      // Left eye
      ctx.beginPath();
      ctx.arc(
        segment.x + snake.direction.x * eyeOffset - snake.direction.y * eyeOffset,
        segment.y + snake.direction.y * eyeOffset + snake.direction.x * eyeOffset,
        eyeRadius, 0, Math.PI * 2
      );
      ctx.fillStyle = '#fff';
      ctx.fill();

      // Right eye
      ctx.beginPath();
      ctx.arc(
        segment.x + snake.direction.x * eyeOffset + snake.direction.y * eyeOffset,
        segment.y + snake.direction.y * eyeOffset - snake.direction.x * eyeOffset,
        eyeRadius, 0, Math.PI * 2
      );
      ctx.fillStyle = '#fff';
      ctx.fill();
    }
  }

  ctx.shadowBlur = 0;
};

const drawFood = (ctx: CanvasRenderingContext2D, food: Food[]) => {
  ctx.fillStyle = '#FF6B00';
  ctx.shadowColor = '#FF6B00';
  ctx.shadowBlur = 8;

  food.forEach(f => {
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.shadowBlur = 0;
};
```

---

## EXTREME EFFECTS PHILOSOPHY

### Food Collection Effects
```typescript
const onFoodCollected = (snake: Snake) => {
  const length = snake.segments.length;

  // PRIMARY: Visual growth
  snake.isGrowing = true;

  // SECONDARY: Sound
  playBlockLand();

  // TERTIARY: Milestone celebrations
  if (length === 20) {
    showEpicCallout('GROWING!');
  }
  if (length === 50) {
    showEpicCallout('SNAKE KING!');
    triggerScreenShake();
    spawnFloatingEmojis(['🐍', '👑']);
  }
  if (length === 100) {
    showEpicCallout('🔥 SLITHER GOD! 🔥');
    triggerConfetti();
    triggerLightning();
    playPerfectBonus();
  }
  if (length === 150) {
    showEpicCallout('LEGENDARY!');
    triggerFullChaos();
    playWinSound();
  }
};
```

### AI Death Effects
```typescript
const onAISnakeDeath = (aiSnake: Snake, killer: Snake) => {
  // Convert snake body to food
  aiSnake.segments.forEach(segment => {
    food.push({
      id: `death-food-${Math.random()}`,
      x: segment.x + (Math.random() - 0.5) * 20,
      y: segment.y + (Math.random() - 0.5) * 20,
      radius: FOOD_RADIUS
    });
  });

  // Effects
  showEpicCallout('+' + aiSnake.segments.length);
  playCombo();
  spawnFloatingEmojis(['💀', '🍊']);
};
```

---

## GAME LOOP

```typescript
const gameLoop = () => {
  const state = gameStateRef.current;

  if (state.gameStatus !== 'playing') {
    return requestAnimationFrame(gameLoop);
  }

  // Update player direction
  updateSnakeDirection(state.playerSnake, state.mousePosition.x, state.mousePosition.y);

  // Move player
  moveSnake(state.playerSnake);

  // Update AI snakes
  state.aiSnakes.forEach(ai => {
    updateAISnake(ai, state.food, [state.playerSnake, ...state.aiSnakes], CANVAS_WIDTH, CANVAS_HEIGHT);
  });

  // Check player collisions
  if (checkSelfCollision(state.playerSnake) ||
      checkWallCollision(state.playerSnake, CANVAS_WIDTH, CANVAS_HEIGHT)) {
    handleGameOver();
    return;
  }

  state.aiSnakes.forEach(ai => {
    if (!ai.isDead && checkSnakeCollision(state.playerSnake, ai)) {
      handleGameOver();
    }
  });

  // Check food collection
  const collectedFood = checkFoodCollision(state.playerSnake, state.food);
  if (collectedFood) {
    state.food = state.food.filter(f => f.id !== collectedFood.id);
    onFoodCollected(state.playerSnake);
  }

  // AI food collection & death checks
  state.aiSnakes.forEach(ai => {
    if (ai.isDead) return;

    // Food
    const aiFood = checkFoodCollision(ai, state.food);
    if (aiFood) {
      state.food = state.food.filter(f => f.id !== aiFood.id);
      ai.isGrowing = true;
    }

    // AI vs AI collision
    state.aiSnakes.forEach(other => {
      if (other.id !== ai.id && !other.isDead && checkSnakeCollision(ai, other)) {
        ai.isDead = true;
        onAISnakeDeath(ai, other);
        scheduleAIRespawn(ai);
      }
    });

    // AI vs Player collision
    if (checkSnakeCollision(ai, state.playerSnake)) {
      ai.isDead = true;
      onAISnakeDeath(ai, state.playerSnake);
      scheduleAIRespawn(ai);
    }
  });

  // Respawn food
  if (state.food.length < MIN_FOOD) {
    state.food.push(...spawnFood(5, CANVAS_WIDTH, CANVAS_HEIGHT));
  }

  // Update game time
  state.gameTime = Date.now() - gameStartTime;

  // Render
  render(ctx);

  requestAnimationFrame(gameLoop);
};
```

---

## LEADERBOARD INTEGRATION

```typescript
const { leaderboard, submitScore, isSignedIn } = useLeaderboard('orange-snake');

const handleGameOver = async () => {
  setGameStatus('gameover');
  playGameOver();
  triggerScreenShake();

  const maxLength = gameStateRef.current.playerSnake.segments.length;
  const survivalTime = Math.floor(gameStateRef.current.gameTime / 1000);

  if (isSignedIn) {
    await submitScore(maxLength, null, {
      survivalTime,
      aiSnakesKilled: killCount
    });
  }
};
```

---

## SNAKE COLORS

```typescript
const SNAKE_COLORS = [
  { color: '#FF6B00', glow: '#FF8C33' }, // Player (orange)
  { color: '#4CAF50', glow: '#81C784' }, // AI - Green
  { color: '#2196F3', glow: '#64B5F6' }, // AI - Blue
  { color: '#9C27B0', glow: '#BA68C8' }, // AI - Purple
  { color: '#F44336', glow: '#E57373' }, // AI - Red
  { color: '#00BCD4', glow: '#4DD0E1' }, // AI - Cyan
  { color: '#FFEB3B', glow: '#FFF176' }, // AI - Yellow
  { color: '#E91E63', glow: '#F06292' }, // AI - Pink
];
```

---

## TESTING CHECKLIST

- [ ] Snake follows mouse smoothly (desktop)
- [ ] Snake follows touch smoothly (mobile)
- [ ] Turn rate feels natural (not instant, not sluggish)
- [ ] Snake body follows head correctly
- [ ] Food collection grows snake
- [ ] Self-collision detection works
- [ ] Wall collision detection works
- [ ] AI snakes move and seek food
- [ ] AI snakes respawn after death
- [ ] Player vs AI collision works both ways
- [ ] Death drops food pellets
- [ ] Milestone effects trigger
- [ ] Leaderboard submission works
- [ ] Performance is smooth (60fps)

---

**IMPORTANT**: The snake movement must feel SMOOTH and responsive. The player should feel in control but not be able to turn on a dime. AI snakes should feel alive - seeking food, avoiding walls, and posing a real threat. Deaths should feel impactful with the snake exploding into food.
