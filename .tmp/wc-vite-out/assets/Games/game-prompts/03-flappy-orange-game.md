# Claude Code Prompt: Flappy Orange Game

## Overview
Build a Flappy Bird style tap-to-fly game for wojak.ink featuring a flying orange character. Uses Canvas for smooth physics-based gameplay with extreme visual effects.

---

## TECH STACK & ARCHITECTURE

```
Framework: React + TypeScript + Ionic Framework
Rendering: HTML5 Canvas (required for physics/performance)
Physics: Custom gravity + jump (no library needed for this simplicity)
Animation: requestAnimationFrame game loop
Styling: CSS for UI elements, Canvas for game graphics
Sound: useGameSounds() hook
Leaderboard: useLeaderboard('flappy-orange') hook
Mobile Detection: useIsMobile() hook
```

**File Structure:**
```
src/pages/FlappyOrange.tsx         # Main game component
src/pages/FlappyOrange.css         # UI styles + overlay effects
src/components/media/games/GameModal.tsx  # Add lazy import
src/config/query/queryKeys.ts      # Add 'flappy-orange' to GameId type
```

---

## GAME SPECIFICATIONS

### Character
- **Visual**: Orange with wings/cape (drawn on canvas)
- **Size**: 30px radius circle
- **Rotation**: Tilts based on velocity (nose up when jumping, nose down when falling)

### Physics (SNAPPY, NOT FLOATY)
```typescript
const PHYSICS = {
  GRAVITY: 0.6,           // Pulls down fast
  JUMP_VELOCITY: -12,     // Strong upward burst
  MAX_FALL_SPEED: 15,     // Terminal velocity
  ROTATION_SPEED: 0.1     // How fast it tilts
};
```

### Obstacles
- **Style**: Citrus trees, orange crates, farm-themed obstacles
- **Gap Size**: 150px (forgiving start, can narrow over time)
- **Width**: 60px
- **Spacing**: 200px between pipe pairs
- **Speed**: 3px per frame (can increase with score)

### Scoring
- **Primary**: Pipes passed (1 point per pipe pair)
- **No secondary tracking needed**

### Environment Progression
- **0-10 pipes**: Day sky (light blue)
- **11-25 pipes**: Sunset (orange/pink gradient)
- **26-50 pipes**: Night (dark blue with stars)
- **50+ pipes**: Storm (dark clouds, lightning flashes)

### Game States
```typescript
type GameState = 'idle' | 'playing' | 'gameover';
```

---

## CANVAS SETUP IN REACT

```typescript
const FlappyOrange: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef({
    bird: { y: 200, velocity: 0, rotation: 0 },
    pipes: [] as Pipe[],
    score: 0,
    gameState: 'idle' as GameState,
    frameCount: 0
  });

  const isMobile = useIsMobile();

  const CANVAS_WIDTH = isMobile ? window.innerWidth : 650;
  const CANVAS_HEIGHT = isMobile ? window.innerHeight - 105 : 500;
  const BIRD_X = CANVAS_WIDTH * 0.2; // Bird stays at 20% from left

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    let animationId: number;

    const gameLoop = () => {
      update();
      render(ctx);
      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);

    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <IonPage>
      <IonContent>
        <div className="flappy-container">
          <canvas
            ref={canvasRef}
            onClick={handleTap}
            onTouchStart={handleTap}
          />
          {/* UI overlays rendered with React */}
        </div>
      </IonContent>
    </IonPage>
  );
};
```

---

## CORE GAME LOGIC

### Bird Physics
```typescript
interface Bird {
  y: number;
  velocity: number;
  rotation: number;
}

const updateBird = (bird: Bird): Bird => {
  // Apply gravity
  let newVelocity = bird.velocity + PHYSICS.GRAVITY;

  // Cap fall speed
  if (newVelocity > PHYSICS.MAX_FALL_SPEED) {
    newVelocity = PHYSICS.MAX_FALL_SPEED;
  }

  // Update position
  const newY = bird.y + newVelocity;

  // Update rotation based on velocity
  // Positive velocity (falling) = rotate clockwise
  // Negative velocity (jumping) = rotate counter-clockwise
  let newRotation = bird.rotation + (newVelocity > 0 ? PHYSICS.ROTATION_SPEED : -PHYSICS.ROTATION_SPEED * 2);
  newRotation = Math.max(-0.5, Math.min(newRotation, Math.PI / 2)); // Clamp rotation

  return { y: newY, velocity: newVelocity, rotation: newRotation };
};

const jump = () => {
  const state = gameStateRef.current;

  if (state.gameState === 'idle') {
    state.gameState = 'playing';
  }

  if (state.gameState === 'playing') {
    state.bird.velocity = PHYSICS.JUMP_VELOCITY;
    state.bird.rotation = -0.3; // Tilt up immediately
    playBlockLand(); // Jump sound
  }
};
```

### Pipe Generation
```typescript
interface Pipe {
  x: number;
  gapY: number; // Center of gap
  passed: boolean;
}

const PIPE_WIDTH = 60;
const PIPE_GAP = 150;
const PIPE_SPACING = 200;

const generatePipe = (): Pipe => {
  const minGapY = PIPE_GAP / 2 + 50;
  const maxGapY = CANVAS_HEIGHT - PIPE_GAP / 2 - 50;
  const gapY = Math.random() * (maxGapY - minGapY) + minGapY;

  return {
    x: CANVAS_WIDTH + PIPE_WIDTH,
    gapY,
    passed: false
  };
};

const updatePipes = (pipes: Pipe[], score: number): { pipes: Pipe[]; newScore: number } => {
  let newScore = score;

  // Move pipes left
  const speed = 3 + Math.floor(score / 20) * 0.5; // Speed increases
  pipes.forEach(pipe => {
    pipe.x -= speed;
  });

  // Remove off-screen pipes
  const filteredPipes = pipes.filter(pipe => pipe.x > -PIPE_WIDTH);

  // Add new pipe if needed
  if (filteredPipes.length === 0 || filteredPipes[filteredPipes.length - 1].x < CANVAS_WIDTH - PIPE_SPACING) {
    filteredPipes.push(generatePipe());
  }

  // Check for score (pipe passed)
  filteredPipes.forEach(pipe => {
    if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
      pipe.passed = true;
      newScore++;
      onScorePoint(newScore);
    }
  });

  return { pipes: filteredPipes, newScore };
};
```

### Collision Detection
```typescript
const BIRD_RADIUS = 15;

const checkCollision = (bird: Bird, pipes: Pipe[]): boolean => {
  // Ground collision
  if (bird.y + BIRD_RADIUS > CANVAS_HEIGHT) return true;

  // Ceiling collision
  if (bird.y - BIRD_RADIUS < 0) return true;

  // Pipe collision
  for (const pipe of pipes) {
    // Only check pipes near bird
    if (pipe.x > BIRD_X + BIRD_RADIUS + PIPE_WIDTH || pipe.x + PIPE_WIDTH < BIRD_X - BIRD_RADIUS) {
      continue;
    }

    const topPipeBottom = pipe.gapY - PIPE_GAP / 2;
    const bottomPipeTop = pipe.gapY + PIPE_GAP / 2;

    // Check if bird is within pipe X range
    if (BIRD_X + BIRD_RADIUS > pipe.x && BIRD_X - BIRD_RADIUS < pipe.x + PIPE_WIDTH) {
      // Check if bird hits top or bottom pipe
      if (bird.y - BIRD_RADIUS < topPipeBottom || bird.y + BIRD_RADIUS > bottomPipeTop) {
        return true;
      }
    }
  }

  return false;
};
```

---

## CANVAS RENDERING

### Draw Function
```typescript
const render = (ctx: CanvasRenderingContext2D) => {
  const state = gameStateRef.current;

  // Clear canvas
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Draw background (changes with score)
  drawBackground(ctx, state.score);

  // Draw pipes
  drawPipes(ctx, state.pipes);

  // Draw bird
  drawBird(ctx, state.bird);

  // Draw score (on canvas for consistency)
  drawScore(ctx, state.score);

  // Draw effects
  drawEffects(ctx);
};

const drawBackground = (ctx: CanvasRenderingContext2D, score: number) => {
  let gradient: CanvasGradient;

  if (score < 10) {
    // Day
    gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
  } else if (score < 25) {
    // Sunset
    gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#FF6B00');
    gradient.addColorStop(0.5, '#FF8C33');
    gradient.addColorStop(1, '#FFD700');
  } else if (score < 50) {
    // Night
    gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#0D1B2A');
    gradient.addColorStop(1, '#1B263B');
    // Draw stars
    drawStars(ctx);
  } else {
    // Storm
    gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#2C3E50');
    gradient.addColorStop(1, '#1A252F');
    // Random lightning flash
    if (Math.random() < 0.01) {
      triggerLightningFlash();
    }
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
};

const drawBird = (ctx: CanvasRenderingContext2D, bird: Bird) => {
  ctx.save();
  ctx.translate(BIRD_X, bird.y);
  ctx.rotate(bird.rotation);

  // Orange body
  ctx.beginPath();
  ctx.arc(0, 0, BIRD_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = '#FF6B00';
  ctx.fill();
  ctx.strokeStyle = '#CC5500';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Orange highlight
  ctx.beginPath();
  ctx.arc(-3, -3, BIRD_RADIUS * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fill();

  // Leaf on top
  ctx.beginPath();
  ctx.ellipse(0, -BIRD_RADIUS - 5, 4, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#228B22';
  ctx.fill();

  // Eye
  ctx.beginPath();
  ctx.arc(8, -3, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#FFF';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(9, -3, 2, 0, Math.PI * 2);
  ctx.fillStyle = '#000';
  ctx.fill();

  // Wing
  ctx.beginPath();
  ctx.ellipse(-5, 5, 8, 5, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = '#FF8533';
  ctx.fill();

  ctx.restore();
};

const drawPipes = (ctx: CanvasRenderingContext2D, pipes: Pipe[]) => {
  pipes.forEach(pipe => {
    const topPipeBottom = pipe.gapY - PIPE_GAP / 2;
    const bottomPipeTop = pipe.gapY + PIPE_GAP / 2;

    // Top pipe
    ctx.fillStyle = '#228B22'; // Green for citrus tree
    ctx.fillRect(pipe.x, 0, PIPE_WIDTH, topPipeBottom);

    // Top pipe cap
    ctx.fillStyle = '#1B5E20';
    ctx.fillRect(pipe.x - 5, topPipeBottom - 20, PIPE_WIDTH + 10, 20);

    // Bottom pipe
    ctx.fillStyle = '#228B22';
    ctx.fillRect(pipe.x, bottomPipeTop, PIPE_WIDTH, CANVAS_HEIGHT - bottomPipeTop);

    // Bottom pipe cap
    ctx.fillStyle = '#1B5E20';
    ctx.fillRect(pipe.x - 5, bottomPipeTop, PIPE_WIDTH + 10, 20);
  });
};
```

---

## EXTREME EFFECTS PHILOSOPHY

### Score Point Effects
```typescript
const onScorePoint = (newScore: number) => {
  // PRIMARY: Score increment (visual update)
  showScorePopup('+1');

  // SECONDARY: Sound
  playBlockLand();

  // TERTIARY: Effects based on milestones
  if (newScore % 5 === 0) {
    triggerScreenShake();
    showEpicCallout('NICE!');
    playCombo();
  }

  if (newScore % 10 === 0) {
    showEpicCallout('SKY HIGH!');
    spawnFloatingEmojis(['🍊', '✨', '🔥']);
    triggerConfetti();
    playPerfectBonus();
  }

  if (newScore % 25 === 0) {
    showEpicCallout('CLOUD DANCER!');
    triggerLightning();
    flashVignette();
  }

  if (newScore === 50) {
    showEpicCallout('🏆 LEGENDARY! 🏆');
    triggerFullChaos();
    playWinSound();
  }
};
```

### Visual Effects on Canvas
```typescript
// Trail effect behind bird
const drawBirdTrail = (ctx: CanvasRenderingContext2D, bird: Bird) => {
  const trailLength = 5;
  for (let i = 0; i < trailLength; i++) {
    const alpha = 0.3 - (i * 0.05);
    const offset = i * 8;
    ctx.beginPath();
    ctx.arc(BIRD_X - offset, bird.y, BIRD_RADIUS - i * 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 107, 0, ${alpha})`;
    ctx.fill();
  }
};

// Speed lines during fast fall
const drawSpeedLines = (ctx: CanvasRenderingContext2D, velocity: number) => {
  if (velocity < 8) return;

  const intensity = Math.min((velocity - 8) / 7, 1);
  const lineCount = Math.floor(intensity * 10);

  ctx.strokeStyle = `rgba(255, 255, 255, ${intensity * 0.3})`;
  ctx.lineWidth = 2;

  for (let i = 0; i < lineCount; i++) {
    const x = Math.random() * CANVAS_WIDTH;
    const y = Math.random() * CANVAS_HEIGHT;
    const length = 30 + Math.random() * 50;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + length, y - length * 0.5);
    ctx.stroke();
  }
};
```

### CSS Overlay Effects
```css
/* Screen shake (applied to container) */
@keyframes flappy-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px) translateY(2px); }
  50% { transform: translateX(3px) translateY(-2px); }
  75% { transform: translateX(-2px) translateY(1px); }
}

.flappy-container.shaking {
  animation: flappy-shake 0.3s ease-in-out;
}

/* Vignette flash */
.vignette-flash {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  box-shadow: inset 0 0 100px rgba(255, 107, 0, 0.5);
  animation: vignette-pulse 0.3s ease-out forwards;
}

@keyframes vignette-pulse {
  0% { opacity: 1; }
  100% { opacity: 0; }
}

/* Score popup */
@keyframes score-fly {
  0% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translateY(-60px) scale(1.5);
    opacity: 0;
  }
}

.score-popup {
  position: absolute;
  font-size: 24px;
  font-weight: bold;
  color: #FFD700;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  animation: score-fly 0.8s ease-out forwards;
}
```

---

## TAP HANDLING

```typescript
const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
  e.preventDefault();
  const state = gameStateRef.current;

  if (state.gameState === 'gameover') {
    // Restart game
    resetGame();
    return;
  }

  jump();
};
```

---

## GAME OVER & LEADERBOARD

```typescript
const { leaderboard, submitScore, isSignedIn } = useLeaderboard('flappy-orange');

const handleGameOver = async () => {
  const state = gameStateRef.current;
  state.gameState = 'gameover';

  playGameOver();
  triggerScreenShake();

  // Show game over UI overlay
  setShowGameOverUI(true);

  if (isSignedIn && state.score > 0) {
    await submitScore(state.score, null, {
      playTime: Date.now() - gameStartTime
    });
  }
};

const resetGame = () => {
  gameStateRef.current = {
    bird: { y: CANVAS_HEIGHT / 2, velocity: 0, rotation: 0 },
    pipes: [],
    score: 0,
    gameState: 'idle',
    frameCount: 0
  };
  setShowGameOverUI(false);
};
```

---

## MOBILE-FIRST CONSIDERATIONS

```typescript
// Full-screen canvas on mobile
const CANVAS_WIDTH = isMobile ? window.innerWidth : 650;
const CANVAS_HEIGHT = isMobile ? window.innerHeight - 105 : 500;

// Touch anywhere to play
<canvas
  ref={canvasRef}
  onClick={handleTap}
  onTouchStart={(e) => {
    e.preventDefault();
    handleTap(e);
  }}
  style={{
    touchAction: 'none', // Prevent scrolling
    width: '100%',
    height: isMobile ? '100%' : '500px'
  }}
/>
```

---

## SOUND INTEGRATION

```typescript
const {
  playBlockLand,    // Jump / pipe passed
  playPerfectBonus, // Milestone (every 10)
  playCombo,        // Every 5 pipes
  playWinSound,     // Reach 50 pipes
  playGameOver      // Death
} = useGameSounds();
```

---

## COMPLETE UPDATE LOOP

```typescript
const update = () => {
  const state = gameStateRef.current;

  if (state.gameState !== 'playing') return;

  // Update bird
  state.bird = updateBird(state.bird);

  // Update pipes and score
  const { pipes, newScore } = updatePipes(state.pipes, state.score);
  state.pipes = pipes;
  state.score = newScore;

  // Check collision
  if (checkCollision(state.bird, state.pipes)) {
    handleGameOver();
  }

  state.frameCount++;
};
```

---

## TESTING CHECKLIST

- [ ] Tap/click causes immediate jump
- [ ] Physics feels snappy (quick gravity, strong jump)
- [ ] Bird rotates based on velocity
- [ ] Pipes generate and scroll correctly
- [ ] Collision detection works (top, bottom, pipes)
- [ ] Score increments when passing pipes
- [ ] Background changes with score progression
- [ ] All milestone effects trigger correctly
- [ ] Game over shows final score
- [ ] Tap to restart works
- [ ] Leaderboard submission works
- [ ] Mobile full-screen works
- [ ] Desktop contained size works

---

**IMPORTANT**: The physics must feel SNAPPY - quick tap response, fast gravity pull. The bird should feel responsive, not floaty. Every pipe passed should feel rewarding with visual/audio feedback. Milestone achievements (5, 10, 25, 50) should be CELEBRATED with escalating effects.
