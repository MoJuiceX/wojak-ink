# Citrus Drop (Suika) Game - Phased Build Guide

> **Game ID**: `citrus-drop`
> **Rendering**: Canvas + Matter.js Physics
> **Complexity**: High (requires physics engine)
> **Prerequisites**: Run `00-MASTER-INDEX.md` setup first, install Matter.js

---

## PHASE 1: Matter.js Setup & Basic Dropping

### Prompt for Claude Code:

```
Create the Citrus Drop (Suika/Watermelon game) with Matter.js physics for wojak.ink.

GAME OVERVIEW:
- Drop citrus fruits into container
- Same-size fruits merge into larger fruit when touching
- Chain reaction merges = high scores
- Game over when fruits overflow container
- Uses real physics for realistic fruit behavior

REQUIREMENTS:
1. Create file: src/games/CitrusDrop/CitrusDropGame.tsx
2. Install Matter.js: npm install matter-js @types/matter-js
3. Orange/citrus theme
4. Mobile-first tap to drop

MATTER.JS SETUP:
import Matter from 'matter-js';

const { Engine, Render, Runner, Bodies, Composite, Events, Body, Vector } = Matter;

const CitrusDropGame: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { width, height } = useDimensions();
  const isMobile = useIsMobile();

  // Game dimensions
  const gameWidth = isMobile ? width : 400;
  const gameHeight = isMobile ? height - 105 : 600;

  // Physics refs
  const engineRef = useRef<Matter.Engine>();
  const renderRef = useRef<Matter.Render>();
  const runnerRef = useRef<Matter.Runner>();

  // Game state
  const [score, setScore] = useState(0);
  const [nextFruit, setNextFruit] = useState<FruitType>('cherry');
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Fruit tracking
  const fruitsRef = useRef<Map<number, FruitData>>(new Map());
  const dropXRef = useRef(gameWidth / 2);

  return (
    <div className="citrus-drop-container" ref={containerRef}>
      {/* HUD */}
      <div className="game-hud">
        <div className="score">Score: {score}</div>
        <div className="next-fruit">
          Next: <FruitIcon type={nextFruit} />
        </div>
      </div>

      {/* Drop indicator line */}
      <div
        className="drop-indicator"
        style={{ left: dropXRef.current }}
      />

      {/* Canvas (Matter.js renders here) */}
      <canvas ref={canvasRef} />

      {/* Touch area */}
      <div
        className="touch-area"
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        onClick={handleDrop}
        onTouchEnd={handleDrop}
      />

      {/* Overlays */}
    </div>
  );
};

FRUIT TYPES (small to large):
interface FruitData {
  bodyId: number;
  type: FruitType;
  body: Matter.Body;
}

type FruitType =
  | 'cherry'      // Level 1 (smallest)
  | 'strawberry'  // Level 2
  | 'grape'       // Level 3
  | 'clementine'  // Level 4
  | 'orange'      // Level 5
  | 'apple'       // Level 6
  | 'pear'        // Level 7
  | 'peach'       // Level 8
  | 'pineapple'   // Level 9
  | 'melon'       // Level 10
  | 'watermelon'; // Level 11 (largest)

// Citrus-themed names for our version
const FRUIT_CONFIG: Record<FruitType, { radius: number, color: string, points: number, level: number }> = {
  cherry: { radius: 15, color: '#ff4444', points: 1, level: 1 },
  strawberry: { radius: 20, color: '#ff6b6b', points: 2, level: 2 },
  grape: { radius: 25, color: '#9b59b6', points: 4, level: 3 },
  clementine: { radius: 32, color: '#ff9500', points: 8, level: 4 },
  orange: { radius: 40, color: '#ff6b00', points: 16, level: 5 },
  apple: { radius: 50, color: '#ff0000', points: 32, level: 6 },
  pear: { radius: 58, color: '#9acd32', points: 64, level: 7 },
  peach: { radius: 68, color: '#ffb6c1', points: 128, level: 8 },
  pineapple: { radius: 78, color: '#ffd700', points: 256, level: 9 },
  melon: { radius: 90, color: '#98fb98', points: 512, level: 10 },
  watermelon: { radius: 105, color: '#32cd32', points: 1024, level: 11 },
};

const FRUIT_ORDER: FruitType[] = [
  'cherry', 'strawberry', 'grape', 'clementine', 'orange',
  'apple', 'pear', 'peach', 'pineapple', 'melon', 'watermelon'
];

INITIALIZE MATTER.JS:
useEffect(() => {
  if (!containerRef.current || !canvasRef.current) return;

  // Create engine
  const engine = Engine.create({
    gravity: { x: 0, y: 1 }
  });
  engineRef.current = engine;

  // Create renderer (using canvas)
  const render = Render.create({
    canvas: canvasRef.current,
    engine: engine,
    options: {
      width: gameWidth,
      height: gameHeight,
      wireframes: false,
      background: '#1a1a2e',
    }
  });
  renderRef.current = render;

  // Create runner
  const runner = Runner.create();
  runnerRef.current = runner;

  // Create container walls
  const wallThickness = 20;
  const walls = [
    // Left wall
    Bodies.rectangle(
      -wallThickness / 2,
      gameHeight / 2,
      wallThickness,
      gameHeight,
      { isStatic: true, render: { fillStyle: '#333' } }
    ),
    // Right wall
    Bodies.rectangle(
      gameWidth + wallThickness / 2,
      gameHeight / 2,
      wallThickness,
      gameHeight,
      { isStatic: true, render: { fillStyle: '#333' } }
    ),
    // Bottom
    Bodies.rectangle(
      gameWidth / 2,
      gameHeight + wallThickness / 2,
      gameWidth,
      wallThickness,
      { isStatic: true, render: { fillStyle: '#333' } }
    ),
  ];

  Composite.add(engine.world, walls);

  // Start
  Render.run(render);
  Runner.run(runner, engine);

  // Cleanup
  return () => {
    Render.stop(render);
    Runner.stop(runner);
    Engine.clear(engine);
  };
}, [gameWidth, gameHeight]);

DROP POSITION CONTROL:
const handleMouseMove = (e: React.MouseEvent) => {
  const rect = containerRef.current!.getBoundingClientRect();
  const x = e.clientX - rect.left;
  updateDropPosition(x);
};

const handleTouchMove = (e: React.TouchEvent) => {
  const rect = containerRef.current!.getBoundingClientRect();
  const x = e.touches[0].clientX - rect.left;
  updateDropPosition(x);
};

const updateDropPosition = (x: number) => {
  // Clamp to container bounds with padding for fruit radius
  const padding = FRUIT_CONFIG[nextFruit].radius + 10;
  dropXRef.current = Math.max(padding, Math.min(gameWidth - padding, x));
  // Update indicator position (force re-render or use ref)
};

DROP FRUIT:
const canDropRef = useRef(true);
const DROP_COOLDOWN = 500; // ms between drops

const handleDrop = () => {
  if (!canDropRef.current || isGameOver || !isPlaying) return;

  canDropRef.current = false;
  setTimeout(() => { canDropRef.current = true; }, DROP_COOLDOWN);

  dropFruit(nextFruit, dropXRef.current);

  // Pick next fruit (random from first 5 types)
  const nextTypes = FRUIT_ORDER.slice(0, 5);
  const randomNext = nextTypes[Math.floor(Math.random() * nextTypes.length)];
  setNextFruit(randomNext);
};

const dropFruit = (type: FruitType, x: number) => {
  const config = FRUIT_CONFIG[type];
  const dropY = config.radius + 10; // Just below top

  // Create physics body
  const body = Bodies.circle(x, dropY, config.radius, {
    restitution: 0.3, // Bounciness
    friction: 0.1,
    frictionAir: 0.01,
    render: {
      fillStyle: config.color,
    },
    label: type, // Store fruit type in label
  });

  // Add to world
  Composite.add(engineRef.current!.world, body);

  // Track fruit
  fruitsRef.current.set(body.id, {
    bodyId: body.id,
    type,
    body,
  });

  playDropSound();
};

CUSTOM FRUIT RENDERING (instead of default circles):
Instead of using Matter.js default render, we'll use custom canvas rendering.

// Disable default rendering
options: {
  wireframes: false,
  background: 'transparent', // We'll draw our own
}

// Custom render loop
useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const customRender = () => {
    ctx.clearRect(0, 0, gameWidth, gameHeight);

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, gameWidth, gameHeight);

    // Draw container outline
    ctx.strokeStyle = '#ff6b00';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 50, gameWidth, gameHeight - 50);

    // Draw fruits
    fruitsRef.current.forEach(fruit => {
      const { body, type } = fruit;
      const config = FRUIT_CONFIG[type];
      const { x, y } = body.position;

      // Draw fruit circle
      ctx.beginPath();
      ctx.arc(x, y, config.radius, 0, Math.PI * 2);

      // Gradient fill
      const gradient = ctx.createRadialGradient(
        x - config.radius * 0.3, y - config.radius * 0.3, 0,
        x, y, config.radius
      );
      gradient.addColorStop(0, lightenColor(config.color, 30));
      gradient.addColorStop(1, config.color);

      ctx.fillStyle = gradient;
      ctx.fill();

      // Outline
      ctx.strokeStyle = darkenColor(config.color, 30);
      ctx.lineWidth = 2;
      ctx.stroke();

      // Shine
      ctx.beginPath();
      ctx.arc(x - config.radius * 0.3, y - config.radius * 0.3, config.radius * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fill();
    });

    requestAnimationFrame(customRender);
  };

  const animationId = requestAnimationFrame(customRender);
  return () => cancelAnimationFrame(animationId);
}, []);

DO NOT implement merging yet - just get fruits dropping with physics.
```

### ✅ Phase 1 Checkpoint

**Test these manually:**
- [ ] Matter.js engine initializes
- [ ] Canvas renders game area
- [ ] Container walls are visible
- [ ] Tap/click drops a fruit
- [ ] Fruit falls with gravity
- [ ] Fruit bounces off walls
- [ ] Fruit bounces off floor
- [ ] Fruits stack on each other
- [ ] Moving finger/mouse changes drop position
- [ ] Drop indicator shows current position
- [ ] Next fruit preview updates
- [ ] Cooldown prevents rapid drops

**Debug Prompt if issues:**
```
Matter.js physics not working in Citrus Drop. Issues: [describe]

Check:
1. Is Matter.js installed? (npm install matter-js)
2. Is the engine being created correctly?
3. Is Composite.add adding bodies to world?
4. Is Runner.run starting the physics loop?

Log: console.log('Engine:', engineRef.current);
Log: console.log('Bodies in world:', Composite.allBodies(engine.world).length);

For rendering issues:
1. Is the canvas sized correctly?
2. Is Render.run being called?

Show me the Matter.js initialization code.
```

---

## PHASE 2: Fruit Merging

### Prompt for Claude Code:

```
Add fruit merging mechanic to Citrus Drop.

CURRENT STATE: Fruits drop and stack, but don't merge.

COLLISION DETECTION:
Set up Matter.js collision events to detect when same-size fruits touch.

useEffect(() => {
  const engine = engineRef.current;
  if (!engine) return;

  const collisionHandler = (event: Matter.IEventCollision<Matter.Engine>) => {
    const pairs = event.pairs;

    for (const pair of pairs) {
      const bodyA = pair.bodyA;
      const bodyB = pair.bodyB;

      // Skip if either is a wall (static)
      if (bodyA.isStatic || bodyB.isStatic) continue;

      // Get fruit data
      const fruitA = fruitsRef.current.get(bodyA.id);
      const fruitB = fruitsRef.current.get(bodyB.id);

      if (!fruitA || !fruitB) continue;

      // Check if same type
      if (fruitA.type === fruitB.type) {
        // Merge them!
        mergeFruits(fruitA, fruitB);
      }
    }
  };

  Events.on(engine, 'collisionStart', collisionHandler);

  return () => {
    Events.off(engine, 'collisionStart', collisionHandler);
  };
}, []);

MERGE FRUITS:
const mergeQueueRef = useRef<Set<number>>(new Set()); // Prevent double merges

const mergeFruits = (fruitA: FruitData, fruitB: FruitData) => {
  // Prevent merging if either is already queued for merge
  if (mergeQueueRef.current.has(fruitA.bodyId) ||
      mergeQueueRef.current.has(fruitB.bodyId)) {
    return;
  }

  // Mark as merging
  mergeQueueRef.current.add(fruitA.bodyId);
  mergeQueueRef.current.add(fruitB.bodyId);

  // Get current type and next type
  const currentType = fruitA.type;
  const currentLevel = FRUIT_CONFIG[currentType].level;
  const nextLevel = currentLevel + 1;

  // If already max level, don't merge (or give bonus)
  if (nextLevel > 11) {
    // Watermelon explosion bonus!
    triggerWatermelonBonus(fruitA.body.position);
    return;
  }

  const nextType = FRUIT_ORDER[nextLevel - 1];
  const nextConfig = FRUIT_CONFIG[nextType];

  // Calculate merge position (midpoint)
  const mergeX = (fruitA.body.position.x + fruitB.body.position.x) / 2;
  const mergeY = (fruitA.body.position.y + fruitB.body.position.y) / 2;

  // Remove old fruits
  const engine = engineRef.current!;
  Composite.remove(engine.world, fruitA.body);
  Composite.remove(engine.world, fruitB.body);
  fruitsRef.current.delete(fruitA.bodyId);
  fruitsRef.current.delete(fruitB.bodyId);

  // Create new larger fruit
  const newBody = Bodies.circle(mergeX, mergeY, nextConfig.radius, {
    restitution: 0.3,
    friction: 0.1,
    frictionAir: 0.01,
    render: { fillStyle: nextConfig.color },
    label: nextType,
  });

  // Give it a small upward impulse (satisfying pop)
  Body.setVelocity(newBody, { x: 0, y: -3 });

  // Add to world
  Composite.add(engine.world, newBody);

  // Track new fruit
  fruitsRef.current.set(newBody.id, {
    bodyId: newBody.id,
    type: nextType,
    body: newBody,
  });

  // Clear merge queue
  mergeQueueRef.current.delete(fruitA.bodyId);
  mergeQueueRef.current.delete(fruitB.bodyId);

  // Score
  const points = nextConfig.points;
  setScore(prev => prev + points);

  // Effects
  spawnMergeParticles(mergeX, mergeY, FRUIT_CONFIG[currentType].color);
  playMergeSound(currentLevel);
  triggerMergeEffect(mergeX, mergeY, nextConfig.radius);
};

MERGE PARTICLES:
const particlesRef = useRef<Particle[]>([]);

const spawnMergeParticles = (x: number, y: number, color: string) => {
  const count = 12;
  const particles: Particle[] = Array(count).fill(null).map((_, i) => {
    const angle = (i / count) * Math.PI * 2;
    return {
      x,
      y,
      vx: Math.cos(angle) * 5,
      vy: Math.sin(angle) * 5 - 2,
      color,
      alpha: 1,
      size: 6,
    };
  });

  particlesRef.current.push(...particles);
};

// Update particles in render loop
const updateParticles = () => {
  particlesRef.current = particlesRef.current
    .map(p => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      vy: p.vy + 0.2, // Gravity
      alpha: p.alpha - 0.03,
      size: p.size * 0.97,
    }))
    .filter(p => p.alpha > 0);
};

MERGE EFFECT (expanding ring):
const [mergeEffects, setMergeEffects] = useState<{id: number, x: number, y: number, radius: number}[]>([]);

const triggerMergeEffect = (x: number, y: number, finalRadius: number) => {
  const effect = { id: Date.now(), x, y, radius: 0 };
  setMergeEffects(prev => [...prev, effect]);

  // Animate ring expanding
  let radius = 0;
  const animate = () => {
    radius += 5;
    setMergeEffects(prev =>
      prev.map(e => e.id === effect.id ? { ...e, radius } : e)
    );

    if (radius < finalRadius * 2) {
      requestAnimationFrame(animate);
    } else {
      setMergeEffects(prev => prev.filter(e => e.id !== effect.id));
    }
  };
  requestAnimationFrame(animate);
};

// Render in custom render loop
mergeEffects.forEach(effect => {
  ctx.beginPath();
  ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255, 255, 255, ${1 - effect.radius / 100})`;
  ctx.lineWidth = 3;
  ctx.stroke();
});

CHAIN REACTION TRACKING:
Track consecutive merges for combo bonus.

const comboRef = useRef({ count: 0, timer: 0 });

const mergeFruits = (...) => {
  // ... existing merge code ...

  // Track combo
  comboRef.current.count++;
  comboRef.current.timer = 60; // 1 second

  const comboBonus = Math.pow(2, comboRef.current.count - 1) * 10;
  setScore(prev => prev + points + comboBonus);

  if (comboRef.current.count >= 3) {
    showComboCallout(comboRef.current.count);
  }
};

// Decay combo in update loop
useEffect(() => {
  const interval = setInterval(() => {
    if (comboRef.current.timer > 0) {
      comboRef.current.timer--;
      if (comboRef.current.timer === 0) {
        comboRef.current.count = 0;
      }
    }
  }, 16);

  return () => clearInterval(interval);
}, []);

MERGE SOUND WITH PITCH:
Play higher pitched sound for higher level merges.

const playMergeSound = (level: number) => {
  const pitch = 0.8 + (level * 0.1); // Higher pitch for bigger fruits
  mergeSoundRef.current.rate(Math.min(pitch, 1.5));
  mergeSoundRef.current.play();
};
```

### ✅ Phase 2 Checkpoint

**Test these manually:**
- [ ] Two same-size fruits touching triggers merge
- [ ] Merged fruit is one level larger
- [ ] Merged fruit appears at midpoint
- [ ] Old fruits are removed cleanly
- [ ] Score increases on merge
- [ ] Merge particles spawn
- [ ] Expanding ring effect shows
- [ ] Merge sound plays
- [ ] Chain merges (A+A=B, then B+B=C) work
- [ ] Combo counter tracks rapid merges
- [ ] Combo callouts appear (3+)
- [ ] Can't double-merge same fruit

**Debug Prompt if issues:**
```
Fruit merging not working in Citrus Drop.

Issue: [describe - e.g., "fruits don't merge" or "double merge happens"]

For merges not happening:
1. Is the collision event handler attached?
2. Is fruitA.type === fruitB.type check correct?
3. Are both fruits tracked in fruitsRef?

For double merge:
1. Is mergeQueueRef preventing re-processing?
2. Are bodyIds being added before merge logic?

Log: console.log('Collision:', fruitA?.type, fruitB?.type);
Log: console.log('Merge queue:', mergeQueueRef.current);

Show me the collision handler and mergeFruits function.
```

---

## PHASE 3: Game Over Detection

### Prompt for Claude Code:

```
Add game over detection and danger zone to Citrus Drop.

CURRENT STATE: Fruits merge but game never ends.

DANGER ZONE:
Game over when fruits stay above a certain line for too long.

const DANGER_LINE_Y = 100; // Pixels from top
const DANGER_DURATION = 3000; // 3 seconds before game over

const dangerTimerRef = useRef<NodeJS.Timeout | null>(null);
const [isInDanger, setIsInDanger] = useState(false);

CHECK DANGER ZONE:
const checkDangerZone = () => {
  const fruits = Array.from(fruitsRef.current.values());

  // Check if any fruit is above danger line
  const inDanger = fruits.some(fruit => {
    const topOfFruit = fruit.body.position.y - FRUIT_CONFIG[fruit.type].radius;
    return topOfFruit < DANGER_LINE_Y;
  });

  if (inDanger && !isInDanger) {
    // Just entered danger
    setIsInDanger(true);
    startDangerTimer();
  } else if (!inDanger && isInDanger) {
    // Escaped danger
    setIsInDanger(false);
    clearDangerTimer();
  }
};

const startDangerTimer = () => {
  if (dangerTimerRef.current) return;

  dangerTimerRef.current = setTimeout(() => {
    triggerGameOver();
  }, DANGER_DURATION);
};

const clearDangerTimer = () => {
  if (dangerTimerRef.current) {
    clearTimeout(dangerTimerRef.current);
    dangerTimerRef.current = null;
  }
};

// Check every frame
useEffect(() => {
  const interval = setInterval(checkDangerZone, 100);
  return () => clearInterval(interval);
}, [isInDanger]);

RENDER DANGER LINE:
In custom render loop:

// Danger line
ctx.beginPath();
ctx.moveTo(0, DANGER_LINE_Y);
ctx.lineTo(gameWidth, DANGER_LINE_Y);
ctx.strokeStyle = isInDanger ? '#ff0000' : 'rgba(255, 0, 0, 0.3)';
ctx.lineWidth = isInDanger ? 3 : 1;
ctx.setLineDash(isInDanger ? [] : [10, 10]);
ctx.stroke();
ctx.setLineDash([]);

// Danger zone fill (when active)
if (isInDanger) {
  ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
  ctx.fillRect(0, 0, gameWidth, DANGER_LINE_Y);
}

DANGER WARNING UI:
{isInDanger && (
  <div className="danger-warning">
    <span className="warning-icon">⚠️</span>
    <span className="warning-text">DANGER!</span>
    <div className="danger-timer">
      <div className="timer-fill" style={{ animation: `shrink ${DANGER_DURATION}ms linear` }} />
    </div>
  </div>
)}

.danger-warning {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 0, 0, 0.9);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: pulse 0.5s infinite;
}

.danger-timer {
  width: 50px;
  height: 6px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  overflow: hidden;
}

.timer-fill {
  height: 100%;
  background: white;
  width: 100%;
}

@keyframes shrink {
  from { width: 100%; }
  to { width: 0%; }
}

@keyframes pulse {
  0%, 100% { transform: translateX(-50%) scale(1); }
  50% { transform: translateX(-50%) scale(1.05); }
}

GAME OVER:
const triggerGameOver = () => {
  setIsGameOver(true);
  setIsPlaying(false);

  // Stop physics
  if (runnerRef.current) {
    Runner.stop(runnerRef.current);
  }

  playGameOverSound();

  // Dramatic effect: all fruits fall and fade
  triggerGameOverEffect();
};

const triggerGameOverEffect = () => {
  // Remove all fruits with explosion effect
  fruitsRef.current.forEach(fruit => {
    spawnMergeParticles(fruit.body.position.x, fruit.body.position.y, FRUIT_CONFIG[fruit.type].color);
  });

  // Screen shake
  triggerScreenShake();
};

SCREEN SHAKE:
const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 });

const triggerScreenShake = () => {
  let duration = 500;
  const intensity = 10;

  const shake = () => {
    duration -= 16;
    if (duration <= 0) {
      setShakeOffset({ x: 0, y: 0 });
      return;
    }

    const x = (Math.random() - 0.5) * intensity * (duration / 500);
    const y = (Math.random() - 0.5) * intensity * (duration / 500);
    setShakeOffset({ x, y });

    requestAnimationFrame(shake);
  };

  shake();
};

// Apply to container
<div
  className="citrus-drop-container"
  style={{ transform: `translate(${shakeOffset.x}px, ${shakeOffset.y}px)` }}
>

GAME OVER UI:
{isGameOver && (
  <div className="game-over-overlay">
    <div className="game-over-modal">
      <h2>Game Over!</h2>

      <div className="final-score">
        <span>Score</span>
        <span className="value">{score}</span>
      </div>

      {score > highScore && (
        <div className="new-record">🎉 NEW HIGH SCORE! 🎉</div>
      )}

      <div className="stats">
        <div>Largest Fruit: {getLargestFruitName()}</div>
        <div>Total Merges: {totalMerges}</div>
        <div>Best Combo: {bestCombo}x</div>
      </div>

      <div className="buttons">
        <button onClick={restartGame}>Play Again</button>
        <button onClick={submitScore}>Leaderboard</button>
        <button onClick={shareScore}>Share</button>
      </div>
    </div>
  </div>
)}

RESTART GAME:
const restartGame = () => {
  // Clear all fruits
  const engine = engineRef.current!;
  fruitsRef.current.forEach(fruit => {
    Composite.remove(engine.world, fruit.body);
  });
  fruitsRef.current.clear();

  // Reset state
  setScore(0);
  setIsGameOver(false);
  setIsInDanger(false);
  clearDangerTimer();
  comboRef.current = { count: 0, timer: 0 };

  // Pick new starting fruit
  const startTypes = FRUIT_ORDER.slice(0, 5);
  setNextFruit(startTypes[Math.floor(Math.random() * startTypes.length)]);

  // Restart physics
  if (runnerRef.current && engineRef.current) {
    Runner.run(runnerRef.current, engineRef.current);
  }

  setIsPlaying(true);
};
```

### ✅ Phase 3 Checkpoint

**Test these manually:**
- [ ] Danger line is visible at top
- [ ] Warning appears when fruit crosses line
- [ ] Timer counts down during danger
- [ ] Escaping danger zone cancels timer
- [ ] Game over triggers after 3 seconds in danger
- [ ] Screen shakes on game over
- [ ] Fruits explode on game over
- [ ] Game over modal shows stats
- [ ] New high score indicator works
- [ ] Play Again resets everything
- [ ] Physics restarts properly

**Debug Prompt if issues:**
```
Game over detection not working in Citrus Drop.

Issue: [describe - e.g., "danger zone doesn't trigger" or "game over too early"]

For danger detection:
1. Is checkDangerZone being called regularly?
2. Is the fruit top position calculated correctly (position.y - radius)?
3. Is DANGER_LINE_Y set appropriately?

For timer:
1. Is startDangerTimer creating the timeout?
2. Is clearDangerTimer being called when escaping?
3. Is the timeout actually firing triggerGameOver?

Log: console.log('Fruits above line:', fruitsAboveLine.length);
Log: console.log('Is in danger:', isInDanger, 'Timer:', dangerTimerRef.current);

Show me the checkDangerZone and startDangerTimer functions.
```

---

## PHASE 4: Visual Polish & Effects

### Prompt for Claude Code:

```
Add visual polish, fruit faces, and effects to Citrus Drop.

CURRENT STATE: Gameplay works, needs visual refinement.

FRUIT FACES (Suika-style):
Add cute faces to fruits for character.

const renderFruitFace = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, type: FruitType) => {
  const eyeRadius = radius * 0.1;
  const eyeOffsetX = radius * 0.25;
  const eyeOffsetY = radius * 0.15;

  // Eyes (white)
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(x - eyeOffsetX, y - eyeOffsetY, eyeRadius, 0, Math.PI * 2);
  ctx.arc(x + eyeOffsetX, y - eyeOffsetY, eyeRadius, 0, Math.PI * 2);
  ctx.fill();

  // Pupils (black)
  ctx.fillStyle = 'black';
  const pupilRadius = eyeRadius * 0.5;
  ctx.beginPath();
  ctx.arc(x - eyeOffsetX, y - eyeOffsetY, pupilRadius, 0, Math.PI * 2);
  ctx.arc(x + eyeOffsetX, y - eyeOffsetY, pupilRadius, 0, Math.PI * 2);
  ctx.fill();

  // Smile or expression based on fruit type
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  // Different expressions for different sizes
  const level = FRUIT_CONFIG[type].level;

  if (level <= 3) {
    // Small smile
    ctx.beginPath();
    ctx.arc(x, y + eyeOffsetY, radius * 0.15, 0, Math.PI);
    ctx.stroke();
  } else if (level <= 6) {
    // Bigger smile
    ctx.beginPath();
    ctx.arc(x, y + eyeOffsetY * 0.5, radius * 0.2, 0, Math.PI);
    ctx.stroke();
  } else if (level <= 9) {
    // Open mouth smile
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(x, y + eyeOffsetY * 0.5, radius * 0.15, 0, Math.PI);
    ctx.fill();
  } else {
    // Big happy face for largest fruits
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(x, y + eyeOffsetY * 0.3, radius * 0.2, 0, Math.PI);
    ctx.fill();

    // Blush
    ctx.fillStyle = 'rgba(255, 100, 100, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x - radius * 0.35, y + eyeOffsetY * 0.3, radius * 0.1, radius * 0.05, 0, 0, Math.PI * 2);
    ctx.ellipse(x + radius * 0.35, y + eyeOffsetY * 0.3, radius * 0.1, radius * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
  }
};

FRUIT TEXTURES:
Add subtle texture to make fruits look more organic.

const renderFruitTexture = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) => {
  // Citrus segment lines (for orange-type fruits)
  const segments = 8;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;

  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(
      x + Math.cos(angle) * radius * 0.8,
      y + Math.sin(angle) * radius * 0.8
    );
    ctx.stroke();
  }
};

IMPROVED FRUIT RENDERING:
const renderFruit = (ctx: CanvasRenderingContext2D, fruit: FruitData) => {
  const { body, type } = fruit;
  const config = FRUIT_CONFIG[type];
  const { x, y } = body.position;
  const angle = body.angle;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Main body with gradient
  const gradient = ctx.createRadialGradient(
    -config.radius * 0.3, -config.radius * 0.3, 0,
    0, 0, config.radius
  );
  gradient.addColorStop(0, lightenColor(config.color, 40));
  gradient.addColorStop(0.7, config.color);
  gradient.addColorStop(1, darkenColor(config.color, 20));

  ctx.beginPath();
  ctx.arc(0, 0, config.radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Outline
  ctx.strokeStyle = darkenColor(config.color, 40);
  ctx.lineWidth = 3;
  ctx.stroke();

  // Inner highlight ring
  ctx.beginPath();
  ctx.arc(0, 0, config.radius * 0.85, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Big shine
  ctx.beginPath();
  ctx.ellipse(
    -config.radius * 0.35,
    -config.radius * 0.35,
    config.radius * 0.25,
    config.radius * 0.15,
    -Math.PI / 4,
    0, Math.PI * 2
  );
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fill();

  // Face (rotated back to upright)
  ctx.rotate(-angle);
  renderFruitFace(ctx, 0, 0, config.radius, type);

  ctx.restore();
};

MERGE ANIMATION:
const [mergeAnimations, setMergeAnimations] = useState<{id: number, x: number, y: number, scale: number, type: FruitType}[]>([]);

const triggerMergeAnimation = (x: number, y: number, type: FruitType) => {
  const anim = { id: Date.now(), x, y, scale: 0.5, type };
  setMergeAnimations(prev => [...prev, anim]);

  // Animate scale from 0.5 to 1.2 to 1
  let scale = 0.5;
  let growing = true;

  const animate = () => {
    if (growing) {
      scale += 0.1;
      if (scale >= 1.2) growing = false;
    } else {
      scale -= 0.05;
      if (scale <= 1) {
        setMergeAnimations(prev => prev.filter(a => a.id !== anim.id));
        return;
      }
    }

    setMergeAnimations(prev =>
      prev.map(a => a.id === anim.id ? { ...a, scale } : a)
    );

    requestAnimationFrame(animate);
  };

  animate();
};

SCORE POPUP ANIMATION:
const [scorePopups, setScorePopups] = useState<{id: number, x: number, y: number, value: number, age: number}[]>([]);

// In mergeFruits:
setScorePopups(prev => [...prev, {
  id: Date.now(),
  x: mergeX,
  y: mergeY,
  value: points + comboBonus,
  age: 0,
}]);

// Animate popups
useEffect(() => {
  const interval = setInterval(() => {
    setScorePopups(prev =>
      prev
        .map(p => ({ ...p, age: p.age + 1, y: p.y - 2 }))
        .filter(p => p.age < 30)
    );
  }, 33);

  return () => clearInterval(interval);
}, []);

// Render popups
scorePopups.forEach(popup => {
  const alpha = 1 - popup.age / 30;
  ctx.font = 'bold 24px Arial';
  ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
  ctx.textAlign = 'center';
  ctx.fillText(`+${popup.value}`, popup.x, popup.y);
});

COMBO CALLOUT:
const [comboCallout, setComboCallout] = useState<{text: string, color: string} | null>(null);

const showComboCallout = (combo: number) => {
  let text = '';
  let color = '#fff';

  if (combo >= 10) { text = 'LEGENDARY!'; color = '#ff00ff'; }
  else if (combo >= 7) { text = 'AMAZING!'; color = '#ff6b00'; }
  else if (combo >= 5) { text = 'GREAT!'; color = '#ffcc00'; }
  else if (combo >= 3) { text = 'NICE!'; color = '#fff'; }

  if (text) {
    setComboCallout({ text, color });
    setTimeout(() => setComboCallout(null), 1500);
  }
};

{comboCallout && (
  <div
    className="combo-callout"
    style={{ color: comboCallout.color }}
  >
    {comboCallout.text}
  </div>
)}

BACKGROUND ANIMATION:
Subtle floating particles in background.

const bgParticlesRef = useRef<{x: number, y: number, size: number, speed: number}[]>(
  Array(20).fill(null).map(() => ({
    x: Math.random() * gameWidth,
    y: Math.random() * gameHeight,
    size: 2 + Math.random() * 3,
    speed: 0.2 + Math.random() * 0.3,
  }))
);

const renderBackground = (ctx: CanvasRenderingContext2D) => {
  // Gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, gameHeight);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#16213e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, gameWidth, gameHeight);

  // Floating particles
  bgParticlesRef.current.forEach(p => {
    p.y -= p.speed;
    if (p.y < -10) {
      p.y = gameHeight + 10;
      p.x = Math.random() * gameWidth;
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 107, 0, ${0.1 + p.size / 10})`;
    ctx.fill();
  });
};

FRUIT PREVIEW IMPROVEMENTS:
const renderNextFruit = () => {
  const config = FRUIT_CONFIG[nextFruit];
  const previewSize = 40;
  const scale = previewSize / config.radius;

  return (
    <div className="next-preview">
      <canvas
        width={previewSize * 2}
        height={previewSize * 2}
        ref={previewCanvasRef}
      />
    </div>
  );
};
```

### ✅ Phase 4 Checkpoint

**Test these manually:**
- [ ] Fruits have cute faces
- [ ] Faces stay upright as fruits rotate
- [ ] Different expressions for different sizes
- [ ] Fruits have gradient/shine effects
- [ ] Merge animation shows scale pulse
- [ ] Score popups float up and fade
- [ ] Combo callouts appear (NICE!, GREAT!, etc.)
- [ ] Background has floating particles
- [ ] Next fruit preview looks polished
- [ ] Overall visual quality feels premium

**Debug Prompt if issues:**
```
Visual effects not rendering correctly in Citrus Drop.

Issue: [describe]

For faces:
1. Is ctx.rotate(-angle) un-rotating for face drawing?
2. Are eye/mouth positions calculated relative to center?

For gradients:
1. Is createRadialGradient using correct coordinates?
2. Are color stops in correct order?

For animations:
1. Is requestAnimationFrame being called recursively?
2. Are state updates triggering re-renders?

Show me the renderFruit function or the specific effect code.
```

---

## PHASE 5: Audio, Leaderboard & Final Polish

### Prompt for Claude Code:

```
Add Howler.js audio, leaderboard, and final polish to Citrus Drop.

CURRENT STATE: Full game with visuals, needs audio and leaderboard.

AUDIO INTEGRATION:

Sounds needed:
- Drop fruit (plop)
- Merge (satisfying pop, pitched by level)
- Combo milestone
- Danger warning
- Game over
- High score

const {
  playDrop,
  playMerge,
  playCombo,
  playDangerLoop,
  stopDangerLoop,
  playGameOver,
  playHighScore,
  setMuted
} = useHowlerSounds();

// Triggers:
// Drop fruit:
playDrop();

// Merge (with pitch based on level):
const playMerge = (level: number) => {
  const pitch = 0.7 + (level * 0.08); // Higher pitch for bigger merges
  mergeSoundRef.current.rate(Math.min(pitch, 1.4));
  mergeSoundRef.current.play();
};

// Combo milestone:
if (comboRef.current.count === 3 || comboRef.current.count === 5 || comboRef.current.count >= 7) {
  playCombo();
}

// Danger zone:
if (isInDanger) {
  playDangerLoop();
} else {
  stopDangerLoop();
}

// Game over:
if (score > highScore) {
  playHighScore();
} else {
  playGameOver();
}

DANGER LOOP AUDIO:
const dangerSoundRef = useRef<Howl | null>(null);

const playDangerLoop = () => {
  if (!dangerSoundRef.current) {
    dangerSoundRef.current = new Howl({
      src: ['/assets/sounds/danger-loop.mp3'],
      loop: true,
      volume: 0.4,
    });
  }
  if (!dangerSoundRef.current.playing()) {
    dangerSoundRef.current.play();
  }
};

const stopDangerLoop = () => {
  dangerSoundRef.current?.stop();
};

BACKGROUND MUSIC (optional):
const bgMusicRef = useRef<Howl | null>(null);

useEffect(() => {
  bgMusicRef.current = new Howl({
    src: ['/assets/sounds/citrus-bgm.mp3'],
    loop: true,
    volume: 0.2,
  });

  return () => bgMusicRef.current?.unload();
}, []);

const startGame = () => {
  // ...
  bgMusicRef.current?.play();
};

const stopGame = () => {
  bgMusicRef.current?.stop();
};

LEADERBOARD INTEGRATION:

import { useLeaderboard } from '../../hooks/useLeaderboard';

const { submitScore, getTopScores } = useLeaderboard('citrus-drop');

const handleSubmitScore = async () => {
  if (score > 0) {
    await submitScore(score);
    setShowLeaderboard(true);
  }
};

HIGH SCORE PERSISTENCE:
const [highScore, setHighScore] = useState(() =>
  parseInt(localStorage.getItem('citrus-drop-high') || '0', 10)
);

useEffect(() => {
  if (score > highScore && isGameOver) {
    setHighScore(score);
    localStorage.setItem('citrus-drop-high', score.toString());
  }
}, [score, isGameOver]);

MOBILE POLISH:

1. Smooth drop indicator:
// Use CSS transition instead of instant position
.drop-indicator {
  transition: left 0.1s ease-out;
}

2. Haptic feedback:
const vibrate = (pattern: number | number[]) => {
  if (navigator.vibrate) navigator.vibrate(pattern);
};

// On drop:
vibrate(20);

// On merge:
vibrate([30, 20, 40]);

// On danger:
vibrate([50]);

// On game over:
vibrate([100, 50, 100, 50, 200]);

3. Prevent scroll/zoom:
.citrus-drop-container {
  touch-action: none;
  user-select: none;
}

4. Hold to preview drop:
// Show ghost fruit at drop position
const [showGhost, setShowGhost] = useState(false);

onTouchStart={() => setShowGhost(true)}
onTouchEnd={() => {
  setShowGhost(false);
  handleDrop();
}}

// Render ghost
if (showGhost) {
  ctx.globalAlpha = 0.5;
  renderFruitAt(dropXRef.current, FRUIT_CONFIG[nextFruit].radius + 10, nextFruit);
  ctx.globalAlpha = 1;
}

STATISTICS TRACKING:
interface GameStats {
  gamesPlayed: number;
  highScore: number;
  totalMerges: number;
  largestFruit: FruitType;
  bestCombo: number;
}

const updateStats = () => {
  const stats: GameStats = JSON.parse(localStorage.getItem('citrus-stats') || '{}');

  stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
  stats.highScore = Math.max(stats.highScore || 0, score);
  stats.totalMerges = (stats.totalMerges || 0) + totalMergesThisGame;

  const currentLargest = getLargestFruit();
  if (!stats.largestFruit || FRUIT_CONFIG[currentLargest].level > FRUIT_CONFIG[stats.largestFruit].level) {
    stats.largestFruit = currentLargest;
  }

  stats.bestCombo = Math.max(stats.bestCombo || 0, bestComboThisGame);

  localStorage.setItem('citrus-stats', JSON.stringify(stats));
};

SHARE FUNCTIONALITY:
const shareScore = async () => {
  const largest = getLargestFruit();
  const text = `🍊 I scored ${score} in Citrus Drop!\n\n` +
    `🏆 Largest: ${capitalizeFirst(largest)}\n` +
    `⛓️ Best Combo: ${bestComboThisGame}x\n\n` +
    `Play at wojak.ink`;

  if (navigator.share) {
    await navigator.share({ text });
  } else {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!');
  }
};

TUTORIAL (first time):
const [showTutorial, setShowTutorial] = useState(() =>
  !localStorage.getItem('citrus-tutorial-seen')
);

{showTutorial && (
  <div className="tutorial-overlay">
    <div className="tutorial-content">
      <h2>How to Play</h2>
      <div className="tutorial-steps">
        <div className="step">
          <span className="icon">👆</span>
          <p>Tap to drop fruits</p>
        </div>
        <div className="step">
          <span className="icon">🍊🍊</span>
          <p>Same fruits merge into bigger ones</p>
        </div>
        <div className="step">
          <span className="icon">⚠️</span>
          <p>Don't let fruits overflow!</p>
        </div>
      </div>
      <button onClick={() => {
        setShowTutorial(false);
        localStorage.setItem('citrus-tutorial-seen', 'true');
        startGame();
      }}>
        Got it!
      </button>
    </div>
  </div>
)}

PHYSICS OPTIMIZATION:
// Limit body count for performance
const MAX_FRUITS = 50;

const dropFruit = () => {
  if (fruitsRef.current.size >= MAX_FRUITS) {
    // Remove oldest/smallest fruit
    // Or prevent drop
    return;
  }
  // ...
};

// Sleep bodies that aren't moving
Engine.update(engine) // Matter.js auto-sleeps still bodies

FINAL POLISH:

1. Loading indicator while Matter.js initializes
2. Smooth transitions between states
3. Confetti on high score
4. Achievement system (first watermelon, 10k score, etc.)
5. Color themes (day/night mode)
```

### ✅ Phase 5 Final Checklist

**Audio:**
- [ ] Drop sound plays
- [ ] Merge sound with pitch variation
- [ ] Combo milestone sounds
- [ ] Danger loop plays/stops correctly
- [ ] Game over sound
- [ ] High score fanfare
- [ ] Mute toggle works

**Leaderboard:**
- [ ] Score submits correctly
- [ ] Leaderboard displays
- [ ] High score persists locally
- [ ] Stats tracking works

**Mobile:**
- [ ] Smooth drop indicator movement
- [ ] Haptic feedback on actions
- [ ] No scroll during gameplay
- [ ] Ghost fruit preview (if implemented)

**Polish:**
- [ ] Tutorial shows on first play
- [ ] Share generates correct text
- [ ] Performance stays smooth with many fruits
- [ ] All state resets properly on restart

**Debug Prompt if audio issues:**
```
Audio not working correctly in Citrus Drop.

Issue: [describe]

For looping sounds (danger):
1. Is the Howl instance checking .playing() before play()?
2. Is stop() being called when danger clears?

For pitched merges:
1. Is .rate() being called before .play()?
2. Is the pitch calculation correct?

Show me the audio setup and trigger points.
```

---

## Complete File Structure

```
src/games/CitrusDrop/
├── CitrusDropGame.tsx     # Main component
├── CitrusDropGame.css     # Styles
├── types.ts               # Interfaces
├── constants.ts           # Fruit config, physics values
├── renderer.ts            # Canvas rendering helpers
└── physics.ts             # Matter.js setup helpers

public/assets/sounds/
├── drop.mp3
├── merge.mp3
├── combo.mp3
├── danger-loop.mp3
├── game-over.mp3
├── high-score.mp3
└── citrus-bgm.mp3 (optional)
```

---

## Fruit Configuration Reference

```typescript
// constants.ts
export const FRUIT_CONFIG: Record<FruitType, FruitConfig> = {
  cherry:     { radius: 15,  color: '#ff4444', points: 1,    level: 1  },
  strawberry: { radius: 20,  color: '#ff6b6b', points: 2,    level: 2  },
  grape:      { radius: 25,  color: '#9b59b6', points: 4,    level: 3  },
  clementine: { radius: 32,  color: '#ff9500', points: 8,    level: 4  },
  orange:     { radius: 40,  color: '#ff6b00', points: 16,   level: 5  },
  apple:      { radius: 50,  color: '#ff0000', points: 32,   level: 6  },
  pear:       { radius: 58,  color: '#9acd32', points: 64,   level: 7  },
  peach:      { radius: 68,  color: '#ffb6c1', points: 128,  level: 8  },
  pineapple:  { radius: 78,  color: '#ffd700', points: 256,  level: 9  },
  melon:      { radius: 90,  color: '#98fb98', points: 512,  level: 10 },
  watermelon: { radius: 105, color: '#32cd32', points: 1024, level: 11 },
};

export const PHYSICS = {
  GRAVITY: { x: 0, y: 1 },
  RESTITUTION: 0.3,
  FRICTION: 0.1,
  FRICTION_AIR: 0.01,
} as const;

export const GAME = {
  DANGER_LINE_Y: 100,
  DANGER_DURATION: 3000,
  DROP_COOLDOWN: 500,
  MAX_FRUITS: 50,
} as const;
```

---

## Matter.js Quick Reference

```typescript
// Creating bodies
const circle = Bodies.circle(x, y, radius, options);
const rectangle = Bodies.rectangle(x, y, width, height, options);

// Adding to world
Composite.add(engine.world, body);

// Removing from world
Composite.remove(engine.world, body);

// Setting velocity
Body.setVelocity(body, { x: 0, y: -5 });

// Applying force
Body.applyForce(body, body.position, { x: 0.01, y: 0 });

// Collision events
Events.on(engine, 'collisionStart', (event) => {
  event.pairs.forEach(pair => {
    const { bodyA, bodyB } = pair;
    // Handle collision
  });
});

// Getting all bodies
const bodies = Composite.allBodies(engine.world);

// Body properties
body.position.x
body.position.y
body.angle
body.velocity
body.label // Custom data
body.isStatic
```
