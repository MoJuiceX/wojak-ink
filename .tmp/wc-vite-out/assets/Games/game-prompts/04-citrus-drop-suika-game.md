# Claude Code Prompt: Citrus Drop Game (Suika/Watermelon Style)

## Overview
Build a Suika/Watermelon game clone for wojak.ink with a citrus theme. Players drop fruits that merge into larger fruits when matching types collide. Uses Matter.js for realistic physics simulation.

---

## TECH STACK & ARCHITECTURE

```
Framework: React + TypeScript + Ionic Framework
Rendering: HTML5 Canvas
Physics: Matter.js (npm install matter-js @types/matter-js)
Animation: requestAnimationFrame + Matter.js physics
Styling: CSS for UI overlays
Sound: useGameSounds() hook
Leaderboard: useLeaderboard('citrus-drop') hook
Mobile Detection: useIsMobile() hook
```

**File Structure:**
```
src/pages/CitrusDrop.tsx           # Main game component
src/pages/CitrusDrop.css           # UI styles + overlay effects
src/components/media/games/GameModal.tsx  # Add lazy import
src/config/query/queryKeys.ts      # Add 'citrus-drop' to GameId type
```

**Install Matter.js:**
```bash
npm install matter-js
npm install --save-dev @types/matter-js
```

---

## GAME SPECIFICATIONS

### Citrus Fruit Progression (7 levels)
```typescript
const FRUITS = [
  { id: 0, name: 'seed',       radius: 15,  color: '#8B4513', points: 1,   emoji: '🫘' },
  { id: 1, name: 'kumquat',    radius: 20,  color: '#FFA500', points: 3,   emoji: '🍊' },
  { id: 2, name: 'clementine', radius: 28,  color: '#FF8C00', points: 6,   emoji: '🍊' },
  { id: 3, name: 'orange',     radius: 38,  color: '#FF6B00', points: 10,  emoji: '🍊' },
  { id: 4, name: 'grapefruit', radius: 50,  color: '#FF6347', points: 15,  emoji: '🍊' },
  { id: 5, name: 'pomelo',     radius: 65,  color: '#FFFF00', points: 21,  emoji: '🍈' },
  { id: 6, name: 'melon',      radius: 80,  color: '#90EE90', points: 28,  emoji: '🍈' },
];
```

### Merge Rules
- Two fruits of the same type touching = merge into next tier
- Two melons (max tier) merge = both disappear + bonus points
- Merged fruit spawns at midpoint of the two colliding fruits

### Container
- Wood crate/box aesthetic
- Walls on left, right, and bottom
- Open top for dropping fruits
- Game over line near top (if fruit stays above for 2+ seconds)

### Controls
- **Mobile**: Touch and drag horizontally to position, release to drop
- **Desktop**: Mouse move to position, click to drop
- **Drop Preview**: Show ghost fruit at drop position

### Scoring
- **Primary**: Total points (sum of merged fruit values)
- **Secondary**: Highest fruit achieved

---

## MATTER.JS SETUP

### Engine Initialization
```typescript
import Matter from 'matter-js';

const { Engine, World, Bodies, Body, Events, Render, Runner } = Matter;

const CitrusDrop: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const worldRef = useRef<Matter.World | null>(null);

  const isMobile = useIsMobile();
  const GAME_WIDTH = isMobile ? window.innerWidth - 20 : 400;
  const GAME_HEIGHT = isMobile ? window.innerHeight - 150 : 600;

  const WALL_THICKNESS = 15;
  const GAME_OVER_LINE = 80; // Y position for game over detection

  useEffect(() => {
    // Create engine
    const engine = Engine.create({
      gravity: { x: 0, y: 1.2 } // Slightly stronger gravity
    });
    engineRef.current = engine;
    worldRef.current = engine.world;

    // Create walls
    const wallOptions = {
      isStatic: true,
      friction: 0.3,
      restitution: 0.2,
      render: { fillStyle: '#8B4513' }
    };

    const leftWall = Bodies.rectangle(
      WALL_THICKNESS / 2,
      GAME_HEIGHT / 2,
      WALL_THICKNESS,
      GAME_HEIGHT,
      wallOptions
    );

    const rightWall = Bodies.rectangle(
      GAME_WIDTH - WALL_THICKNESS / 2,
      GAME_HEIGHT / 2,
      WALL_THICKNESS,
      GAME_HEIGHT,
      wallOptions
    );

    const floor = Bodies.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT - WALL_THICKNESS / 2,
      GAME_WIDTH,
      WALL_THICKNESS,
      wallOptions
    );

    World.add(engine.world, [leftWall, rightWall, floor]);

    // Setup collision detection
    setupCollisionEvents(engine);

    // Game loop
    let animationId: number;
    const gameLoop = () => {
      Engine.update(engine, 1000 / 60);
      render();
      checkGameOver();
      animationId = requestAnimationFrame(gameLoop);
    };
    animationId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationId);
      World.clear(engine.world, false);
      Engine.clear(engine);
    };
  }, []);
};
```

---

## FRUIT CREATION

```typescript
interface FruitBody extends Matter.Body {
  fruitType: number;
  fruitId: string;
}

const createFruit = (fruitType: number, x: number, y: number): FruitBody => {
  const fruit = FRUITS[fruitType];

  const body = Bodies.circle(x, y, fruit.radius, {
    restitution: 0.4,      // Bounce
    friction: 0.5,         // Surface friction
    frictionAir: 0.01,     // Air resistance
    density: 0.001,        // Mass
    label: `fruit_${fruitType}`,
    render: {
      fillStyle: fruit.color
    }
  }) as FruitBody;

  body.fruitType = fruitType;
  body.fruitId = `fruit-${Date.now()}-${Math.random()}`;

  return body;
};

// Add fruit to world
const dropFruit = () => {
  if (!canDrop || gameState !== 'playing') return;

  const fruit = createFruit(nextFruitType, dropX, 50);
  World.add(worldRef.current!, fruit);

  // Cooldown before next drop
  setCanDrop(false);
  setTimeout(() => setCanDrop(true), 500);

  // Generate next fruit (random from first 5 types)
  setNextFruitType(Math.floor(Math.random() * 5));

  playBlockLand();
};
```

---

## COLLISION & MERGE DETECTION

```typescript
const setupCollisionEvents = (engine: Matter.Engine) => {
  const mergedPairs = new Set<string>(); // Prevent double merges

  Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach((pair) => {
      const bodyA = pair.bodyA as FruitBody;
      const bodyB = pair.bodyB as FruitBody;

      // Check if both are fruits
      if (!bodyA.label?.startsWith('fruit_') || !bodyB.label?.startsWith('fruit_')) {
        return;
      }

      // Check if same type
      if (bodyA.fruitType !== bodyB.fruitType) return;

      // Prevent duplicate merges
      const pairKey = [bodyA.fruitId, bodyB.fruitId].sort().join('-');
      if (mergedPairs.has(pairKey)) return;
      mergedPairs.add(pairKey);

      // Schedule merge (async to avoid physics issues)
      setTimeout(() => {
        mergeFruits(bodyA, bodyB);
        mergedPairs.delete(pairKey);
      }, 10);
    });
  });
};

const mergeFruits = (fruitA: FruitBody, fruitB: FruitBody) => {
  const world = worldRef.current;
  if (!world) return;

  const fruitType = fruitA.fruitType;
  const nextType = fruitType + 1;

  // Calculate merge position
  const mergeX = (fruitA.position.x + fruitB.position.x) / 2;
  const mergeY = (fruitA.position.y + fruitB.position.y) / 2;

  // Remove old fruits
  World.remove(world, fruitA);
  World.remove(world, fruitB);

  // Add points
  const fruit = FRUITS[fruitType];
  setScore(prev => prev + fruit.points);

  // Create effects
  triggerMergeEffects(fruitType, mergeX, mergeY);

  // Create new fruit (if not max level)
  if (nextType < FRUITS.length) {
    const newFruit = createFruit(nextType, mergeX, mergeY);

    // Inherit some velocity from merged fruits
    const avgVelocity = {
      x: (fruitA.velocity.x + fruitB.velocity.x) / 2,
      y: (fruitA.velocity.y + fruitB.velocity.y) / 2
    };
    Body.setVelocity(newFruit, avgVelocity);

    World.add(world, newFruit);

    // Track highest fruit
    if (nextType > highestFruit) {
      setHighestFruit(nextType);
      if (nextType >= 4) {
        showEpicCallout(`${FRUITS[nextType].emoji} ${FRUITS[nextType].name.toUpperCase()}!`);
      }
    }
  } else {
    // Max level merge - bonus!
    setScore(prev => prev + 100);
    showEpicCallout('🎉 MELON EXPLOSION! 🎉');
    triggerFullChaos();
    playWinSound();
  }
};
```

---

## DROP POSITION CONTROL

```typescript
const [dropX, setDropX] = useState(GAME_WIDTH / 2);
const [canDrop, setCanDrop] = useState(true);

// Mouse/Touch position tracking
const handlePointerMove = (e: React.PointerEvent) => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;

  // Clamp to container bounds
  const fruit = FRUITS[nextFruitType];
  const minX = WALL_THICKNESS + fruit.radius;
  const maxX = GAME_WIDTH - WALL_THICKNESS - fruit.radius;
  const clampedX = Math.max(minX, Math.min(x, maxX));

  setDropX(clampedX);
};

const handlePointerDown = () => {
  dropFruit();
};

// Touch support
<canvas
  ref={canvasRef}
  onPointerMove={handlePointerMove}
  onPointerDown={handlePointerDown}
  style={{ touchAction: 'none' }}
/>
```

---

## GAME OVER DETECTION

```typescript
const checkGameOver = () => {
  const world = worldRef.current;
  if (!world || gameState !== 'playing') return;

  // Check if any fruit is above the game over line for too long
  const fruits = world.bodies.filter(b => b.label?.startsWith('fruit_'));

  for (const fruit of fruits) {
    if (fruit.position.y < GAME_OVER_LINE) {
      // Track time above line
      if (!fruit.aboveLineTime) {
        fruit.aboveLineTime = Date.now();
      } else if (Date.now() - fruit.aboveLineTime > 2000) {
        // Game over!
        handleGameOver();
        return;
      }
    } else {
      fruit.aboveLineTime = null;
    }
  }
};
```

---

## CANVAS RENDERING

```typescript
const render = () => {
  const canvas = canvasRef.current;
  const ctx = canvas?.getContext('2d');
  const world = worldRef.current;
  if (!canvas || !ctx || !world) return;

  // Clear
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // Background
  ctx.fillStyle = '#FFF8DC'; // Cream color
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // Game over line (dashed)
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.moveTo(WALL_THICKNESS, GAME_OVER_LINE);
  ctx.lineTo(GAME_WIDTH - WALL_THICKNESS, GAME_OVER_LINE);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw walls (wood texture)
  ctx.fillStyle = '#8B4513';
  // Left wall
  ctx.fillRect(0, 0, WALL_THICKNESS, GAME_HEIGHT);
  // Right wall
  ctx.fillRect(GAME_WIDTH - WALL_THICKNESS, 0, WALL_THICKNESS, GAME_HEIGHT);
  // Floor
  ctx.fillRect(0, GAME_HEIGHT - WALL_THICKNESS, GAME_WIDTH, WALL_THICKNESS);

  // Draw fruits
  const fruits = world.bodies.filter(b => b.label?.startsWith('fruit_'));
  fruits.forEach(body => {
    const fruitBody = body as FruitBody;
    const fruit = FRUITS[fruitBody.fruitType];

    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);

    // Main fruit circle
    ctx.beginPath();
    ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
    ctx.fillStyle = fruit.color;
    ctx.fill();
    ctx.strokeStyle = darkenColor(fruit.color, 20);
    ctx.lineWidth = 2;
    ctx.stroke();

    // Highlight
    ctx.beginPath();
    ctx.arc(-fruit.radius * 0.3, -fruit.radius * 0.3, fruit.radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fill();

    // Leaf (for citrus fruits)
    if (fruitBody.fruitType >= 1 && fruitBody.fruitType <= 4) {
      ctx.beginPath();
      ctx.ellipse(0, -fruit.radius * 0.9, fruit.radius * 0.15, fruit.radius * 0.3, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#228B22';
      ctx.fill();
    }

    ctx.restore();
  });

  // Draw drop preview
  if (canDrop && gameState === 'playing') {
    const fruit = FRUITS[nextFruitType];
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(dropX, 50, fruit.radius, 0, Math.PI * 2);
    ctx.fillStyle = fruit.color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Drop line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.moveTo(dropX, 50 + fruit.radius);
    ctx.lineTo(dropX, GAME_HEIGHT);
    ctx.stroke();
  }
};

// Helper to darken color
const darkenColor = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - percent);
  const g = Math.max(0, ((num >> 8) & 0x00FF) - percent);
  const b = Math.max(0, (num & 0x0000FF) - percent);
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
};
```

---

## EXTREME EFFECTS PHILOSOPHY

### Merge Effects
```typescript
const triggerMergeEffects = (fruitType: number, x: number, y: number) => {
  const fruit = FRUITS[fruitType];

  // PRIMARY: Score popup
  showScorePopup(`+${fruit.points}`, x, y);

  // SECONDARY: Sound + particles
  playBlockLand();
  spawnMergeParticles(x, y, fruit.color);

  // TERTIARY: Based on fruit tier
  if (fruitType >= 2) {
    triggerScreenShake(fruitType * 50); // Bigger fruit = bigger shake
  }

  if (fruitType >= 3) {
    showEpicCallout('NICE MERGE!');
    spawnFloatingEmojis([fruit.emoji]);
  }

  if (fruitType >= 4) {
    showEpicCallout('CITRUS MASTER!');
    triggerConfetti();
    playCombo();
  }

  if (fruitType >= 5) {
    showEpicCallout('POMELO POWER!');
    triggerLightning();
    flashVignette();
    playPerfectBonus();
  }
};

// Particle burst on merge
const spawnMergeParticles = (x: number, y: number, color: string) => {
  const particles: Particle[] = [];
  const count = 12;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    particles.push({
      x, y,
      vx: Math.cos(angle) * 5,
      vy: Math.sin(angle) * 5,
      color,
      life: 1,
      size: 8
    });
  }

  setMergeParticles(prev => [...prev, ...particles]);
};
```

### Combo System
```typescript
// Track consecutive merges within time window
const [combo, setCombo] = useState(0);
const comboTimeoutRef = useRef<NodeJS.Timeout>();

const onMerge = () => {
  // Reset combo timer
  if (comboTimeoutRef.current) {
    clearTimeout(comboTimeoutRef.current);
  }

  setCombo(prev => prev + 1);

  // Combo callouts
  if (combo >= 3) showEpicCallout('COMBO x3!');
  if (combo >= 5) {
    showEpicCallout('COMBO x5!');
    triggerConfetti();
  }
  if (combo >= 10) {
    showEpicCallout('🔥 UNSTOPPABLE! 🔥');
    triggerFullChaos();
  }

  // Reset combo after 2 seconds of no merges
  comboTimeoutRef.current = setTimeout(() => {
    setCombo(0);
  }, 2000);
};
```

---

## CSS OVERLAY EFFECTS

```css
/* Container */
.citrus-drop-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Score panel */
.score-panel {
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding: 10px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  font-weight: bold;
}

/* Next fruit preview */
.next-fruit-preview {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 10px;
  text-align: center;
}

.next-fruit-preview .fruit-icon {
  font-size: 32px;
}

/* Screen shake */
@keyframes citrus-shake {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  25% { transform: translate(-5px, 2px) rotate(-1deg); }
  50% { transform: translate(5px, -2px) rotate(1deg); }
  75% { transform: translate(-3px, 1px) rotate(-0.5deg); }
}

.citrus-drop-container.shaking {
  animation: citrus-shake 0.4s ease-in-out;
}

/* Merge particles */
@keyframes particle-fade {
  0% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0); }
}

.merge-particle {
  position: absolute;
  border-radius: 50%;
  animation: particle-fade 0.5s ease-out forwards;
}
```

---

## LEADERBOARD INTEGRATION

```typescript
const { leaderboard, submitScore, isSignedIn } = useLeaderboard('citrus-drop');

const handleGameOver = async () => {
  setGameState('gameover');
  playGameOver();

  // Stop physics
  if (engineRef.current) {
    engineRef.current.enabled = false;
  }

  if (isSignedIn) {
    await submitScore(score, null, {
      highestFruit: FRUITS[highestFruit].name,
      totalMerges,
      playTime: Date.now() - gameStartTime
    });
  }
};
```

---

## SOUND INTEGRATION

```typescript
const {
  playBlockLand,    // Fruit drop + small merges
  playPerfectBonus, // Big fruit merge (pomelo+)
  playCombo,        // Combo milestones
  playWinSound,     // Melon merge (max)
  playGameOver      // Game over
} = useGameSounds();
```

---

## TESTING CHECKLIST

- [ ] Matter.js physics engine initializes correctly
- [ ] Fruits drop and bounce realistically
- [ ] Horizontal positioning works (mouse/touch)
- [ ] Same fruits merge when colliding
- [ ] Merged fruit is correct next tier
- [ ] Points add correctly
- [ ] Highest fruit tracked
- [ ] Game over triggers when fruit stays above line
- [ ] All merge effects trigger based on tier
- [ ] Combo system works
- [ ] Leaderboard submission works
- [ ] Mobile touch controls work
- [ ] Performance is smooth (60fps)

---

**IMPORTANT**: Matter.js physics should feel satisfying - fruits should bounce, roll, and settle naturally. Merges should feel impactful with particle bursts, screen shake, and satisfying sounds. Higher tier merges = bigger celebrations!
