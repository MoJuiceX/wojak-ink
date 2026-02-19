/**
 * FlappyOrange Weather Rendering Functions
 *
 * Pure rendering functions extracted from FlappyOrange.tsx.
 * Each function takes canvas context as first parameter and data as additional parameters.
 * No internal state - all state is passed in from the main component.
 */

import type {
  RainDrop,
  RainSplash,
  Snowflake,
  Pipe,
  BackgroundBird,
  FallingLeaf,
  LightningBolt,
  TouchRipple,
  Cloud,
  Tree,
  Bird,
  Coin,
} from './types';
import type { TimeOfDay } from './config';
import { PIPE_WIDTH, PIPE_GAP, BIRD_RADIUS } from './config';

/**
 * Draw rain splashes on ground impact
 */
export function drawRainSplashes(
  ctx: CanvasRenderingContext2D,
  rainSplashes: RainSplash[]
): void {
  if (rainSplashes.length === 0) return;
  ctx.save();
  rainSplashes.forEach(splash => {
    ctx.fillStyle = `rgba(150, 180, 210, ${splash.alpha})`;
    ctx.beginPath();
    ctx.arc(splash.x, splash.y, splash.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

/**
 * Draw rain drops
 * @param foregroundOnly - true = only foreground drops, false = only background, undefined = all
 */
export function drawRain(
  ctx: CanvasRenderingContext2D,
  rainDrops: RainDrop[],
  foregroundOnly?: boolean
): void {
  ctx.save();
  rainDrops.forEach(drop => {
    // Filter by layer
    if (foregroundOnly !== undefined && drop.foreground !== foregroundOnly) return;

    // Darker blue-gray color so rain is visible during day
    ctx.strokeStyle = `rgba(80, 100, 130, ${drop.opacity + 0.2})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(drop.x, drop.y);
    ctx.lineTo(drop.x - 3, drop.y + drop.length);
    ctx.stroke();
  });
  ctx.restore();
}

/**
 * Draw snowflakes
 * @param foregroundOnly - true = only foreground flakes, false = only background, undefined = all
 */
export function drawSnowflakes(
  ctx: CanvasRenderingContext2D,
  snowflakes: Snowflake[],
  foregroundOnly?: boolean
): void {
  ctx.save();
  snowflakes.forEach(flake => {
    // Filter by layer
    if (foregroundOnly !== undefined && flake.foreground !== foregroundOnly) return;

    ctx.fillStyle = `rgba(255, 255, 255, ${flake.opacity})`;
    ctx.beginPath();
    ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

/**
 * Draw fog effect overlay
 */
export function drawFog(
  ctx: CanvasRenderingContext2D,
  fogIntensity: number,
  canvasWidth: number,
  canvasHeight: number
): void {
  if (fogIntensity <= 0) return;

  ctx.save();

  // Main fog overlay - strong white/gray that actually reduces visibility
  ctx.fillStyle = `rgba(220, 220, 230, ${0.5 * fogIntensity})`;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Bottom fog (thicker near ground)
  const gradient1 = ctx.createLinearGradient(0, canvasHeight * 0.3, 0, canvasHeight);
  gradient1.addColorStop(0, 'rgba(200, 200, 210, 0)');
  gradient1.addColorStop(1, `rgba(180, 180, 195, ${0.6 * fogIntensity})`);
  ctx.fillStyle = gradient1;
  ctx.fillRect(0, canvasHeight * 0.3, canvasWidth, canvasHeight * 0.7);

  // Additional haze layer
  ctx.fillStyle = `rgba(230, 230, 240, ${0.3 * fogIntensity})`;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Layer 3: Wispy top (lighter)
  const gradient3 = ctx.createLinearGradient(0, 0, 0, canvasHeight * 0.5);
  gradient3.addColorStop(0, `rgba(220, 220, 230, ${fogIntensity * 0.5})`);
  gradient3.addColorStop(1, 'rgba(220, 220, 230, 0)');
  ctx.fillStyle = gradient3;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight * 0.5);
  ctx.restore();
}

/**
 * Draw snow accumulation on ground
 * Snow scrolls off from right to left when snow stops
 */
export function drawSnowAccumulation(
  ctx: CanvasRenderingContext2D,
  accumulation: number,
  snowEdge: number,
  canvasWidth: number,
  canvasHeight: number
): void {
  if (accumulation <= 0 || snowEdge <= 0) return;

  ctx.save();
  const groundY = canvasHeight - 20;
  const snowWidth = Math.min(snowEdge, canvasWidth); // Don't draw past screen

  // Snow layer on ground (white with slight blue tint) - only up to snow edge
  const snowHeight = 8 * accumulation; // Up to 8px of snow
  const snowGradient = ctx.createLinearGradient(0, groundY - snowHeight, 0, groundY);
  snowGradient.addColorStop(0, `rgba(255, 255, 255, ${0.95 * accumulation})`);
  snowGradient.addColorStop(1, `rgba(230, 240, 255, ${0.9 * accumulation})`);
  ctx.fillStyle = snowGradient;
  ctx.fillRect(0, groundY - snowHeight, snowWidth, snowHeight + 5);

  // Ice/frost shimmer on ground - only up to snow edge
  ctx.fillStyle = `rgba(200, 230, 255, ${0.3 * accumulation})`;
  ctx.fillRect(0, groundY, snowWidth, 20);

  // Small snow mounds (subtle bumps) - only up to snow edge
  ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * accumulation})`;
  for (let x = 20; x < snowWidth; x += 60) {
    const moundWidth = 25 + (x % 30);
    const moundHeight = 3 + (x % 5) * accumulation;
    ctx.beginPath();
    ctx.ellipse(x, groundY - snowHeight + 2, moundWidth, moundHeight, 0, Math.PI, 0);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draw frost/ice on pipes
 * Each pipe keeps its frost level from spawn time
 * Frost scrolls off naturally as pipes move left
 */
export function drawPipeFrost(
  ctx: CanvasRenderingContext2D,
  pipes: Pipe[],
  canvasHeight: number
): void {
  ctx.save();

  pipes.forEach(pipe => {
    // Use each pipe's individual frost level (set at spawn)
    const pipeFrost = pipe.frostLevel;
    if (pipeFrost <= 0.2) return; // Skip pipes with no significant frost

    const frostAlpha = (pipeFrost - 0.2) * 1.25;
    const gapSize = pipe.gapSize;
    const topPipeBottom = pipe.gapY - gapSize / 2;
    const bottomPipeTop = pipe.gapY + gapSize / 2;

    // Frost on top of bottom pipe cap (snow accumulation)
    ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * frostAlpha})`;
    ctx.fillRect(pipe.x - 5, bottomPipeTop, PIPE_WIDTH + 10, 6 * frostAlpha);

    // Icicles hanging from top pipe
    ctx.fillStyle = `rgba(200, 230, 255, ${0.7 * frostAlpha})`;
    const icicleCount = 4;
    for (let i = 0; i < icicleCount; i++) {
      const icicleX = pipe.x + (i + 0.5) * (PIPE_WIDTH / icicleCount);
      const icicleHeight = 8 + (i % 3) * 4;
      ctx.beginPath();
      ctx.moveTo(icicleX - 3, topPipeBottom);
      ctx.lineTo(icicleX + 3, topPipeBottom);
      ctx.lineTo(icicleX, topPipeBottom + icicleHeight * frostAlpha);
      ctx.closePath();
      ctx.fill();
    }

    // Frost/ice overlay on pipes (subtle blue tint)
    ctx.fillStyle = `rgba(200, 220, 255, ${0.15 * frostAlpha})`;
    ctx.fillRect(pipe.x, 0, PIPE_WIDTH, topPipeBottom);
    ctx.fillRect(pipe.x, bottomPipeTop, PIPE_WIDTH, canvasHeight - bottomPipeTop - 20);
  });

  ctx.restore();
}

/**
 * Draw lightning flash - blue-white for dramatic effect
 */
export function drawLightningFlash(
  ctx: CanvasRenderingContext2D,
  alpha: number,
  canvasWidth: number,
  canvasHeight: number
): void {
  if (alpha <= 0) return;
  ctx.save();
  // Main white flash
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  // Blue tint overlay for electric feel
  ctx.fillStyle = `rgba(200, 220, 255, ${alpha * 0.3})`;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.restore();
}

/**
 * Draw vignette effect - only for truly dark environments
 */
export function drawVignette(
  ctx: CanvasRenderingContext2D,
  env: TimeOfDay,
  canvasWidth: number
): void {
  // Only draw vignette for night - skip all other environments
  if (env !== 'night') return;

  ctx.save();
  // Subtle top darkening for atmosphere - use gradient for smooth fade
  const alpha = 0.15;
  const gradient = ctx.createLinearGradient(0, 0, 0, 40);
  gradient.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasWidth, 40);

  ctx.restore();
}

/**
 * Draw background birds (silhouettes)
 */
export function drawBackgroundBirds(
  ctx: CanvasRenderingContext2D,
  birds: BackgroundBird[]
): void {
  if (birds.length === 0) return;
  ctx.save();
  ctx.fillStyle = 'rgba(40, 40, 50, 0.6)';
  birds.forEach(bird => {
    const wingOffset = Math.sin(bird.wingPhase) * bird.size * 0.8;
    ctx.beginPath();
    // Body
    ctx.ellipse(bird.x, bird.y, bird.size, bird.size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Wings
    ctx.beginPath();
    ctx.moveTo(bird.x - bird.size, bird.y);
    ctx.quadraticCurveTo(bird.x - bird.size * 1.5, bird.y - wingOffset, bird.x - bird.size * 2.5, bird.y - wingOffset * 0.5);
    ctx.moveTo(bird.x + bird.size, bird.y);
    ctx.quadraticCurveTo(bird.x + bird.size * 1.5, bird.y - wingOffset, bird.x + bird.size * 2.5, bird.y - wingOffset * 0.5);
    ctx.stroke();
  });
  ctx.restore();
}

/**
 * Draw falling leaves
 */
export function drawFallingLeaves(
  ctx: CanvasRenderingContext2D,
  leaves: FallingLeaf[]
): void {
  if (leaves.length === 0) return;
  ctx.save();
  leaves.forEach(leaf => {
    ctx.save();
    ctx.translate(leaf.x, leaf.y);
    ctx.rotate(leaf.rotation);
    ctx.fillStyle = leaf.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, leaf.size, leaf.size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  ctx.restore();
}

/**
 * Draw lightning bolts
 */
export function drawLightningBolts(
  ctx: CanvasRenderingContext2D,
  bolts: LightningBolt[]
): void {
  if (bolts.length === 0) return;
  ctx.save();
  bolts.forEach(bolt => {
    ctx.strokeStyle = `rgba(255, 255, 220, ${bolt.alpha})`;
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(255, 255, 200, 0.8)';
    ctx.shadowBlur = 10;
    bolt.segments.forEach(seg => {
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();
    });
    // Inner bright line
    ctx.strokeStyle = `rgba(255, 255, 255, ${bolt.alpha})`;
    ctx.lineWidth = 1;
    bolt.segments.forEach(seg => {
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();
    });
  });
  ctx.restore();
}

/**
 * Draw touch ripples
 */
export function drawTouchRipples(
  ctx: CanvasRenderingContext2D,
  ripples: TouchRipple[]
): void {
  if (ripples.length === 0) return;
  ripples.forEach(ripple => {
    ctx.save();
    ctx.strokeStyle = `rgba(255, 140, 0, ${ripple.alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
}

/**
 * Draw pipe gap highlight (safe zone glow) - optimized for mobile (no gradient)
 */
export function drawPipeGapHighlight(
  ctx: CanvasRenderingContext2D,
  pipes: Pipe[],
  birdX: number
): void {
  // Only highlight the nearest pipe for performance
  const nearestPipe = pipes.find(pipe => {
    const distance = pipe.x - birdX;
    return distance > 0 && distance < 150;
  });

  if (!nearestPipe) return;

  const distance = nearestPipe.x - birdX;
  const intensity = 1 - (distance / 150);
  const gapTop = nearestPipe.gapY - PIPE_GAP / 2;

  // Simple semi-transparent overlay (no gradient)
  ctx.save();
  ctx.fillStyle = `rgba(100, 255, 100, ${0.15 * intensity})`;
  ctx.fillRect(nearestPipe.x - 5, gapTop, PIPE_WIDTH + 10, PIPE_GAP);
  ctx.strokeStyle = `rgba(100, 255, 100, ${0.4 * intensity})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(nearestPipe.x - 5, gapTop, PIPE_WIDTH + 10, PIPE_GAP);
  ctx.restore();
}

/**
 * Draw a single cloud
 */
export function drawCloud(
  ctx: CanvasRenderingContext2D,
  cloud: Cloud,
  color: string
): void {
  ctx.save();
  ctx.globalAlpha = cloud.opacity * 0.7;
  ctx.fillStyle = color;

  // Draw cloud as simple overlapping ellipses (no gradients for performance)
  const cx = cloud.x + cloud.width * 0.4;
  const cy = cloud.y;

  // Main body - single ellipse
  ctx.beginPath();
  ctx.ellipse(cx, cy, cloud.width * 0.5, cloud.height * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Top puff
  ctx.beginPath();
  ctx.ellipse(cx - cloud.width * 0.15, cy - cloud.height * 0.2, cloud.width * 0.3, cloud.height * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draw trees layer - simplified for performance (single circle per tree)
 */
export function drawTrees(
  ctx: CanvasRenderingContext2D,
  trees: Tree[],
  foliageColor: string,
  trunkColor: string,
  offset: number,
  isFar: boolean,
  canvasWidth: number,
  canvasHeight: number,
  orangeColor: string = '#FF8C00'
): void {
  ctx.save();

  trees.forEach(tree => {
    const x = ((tree.x + offset) % (canvasWidth * 1.5)) - canvasWidth * 0.25;
    const groundY = canvasHeight - 20;
    const trunkHeight = tree.height * 0.3;
    const trunkWidth = tree.width * 0.15;
    const canopyRadius = tree.width * 0.5;
    const canopyX = x + (tree.canopyOffset || 0) * canopyRadius;
    const canopyY = groundY - trunkHeight - canopyRadius * 0.8;

    // Draw trunk
    ctx.fillStyle = trunkColor;
    ctx.fillRect(x - trunkWidth / 2, groundY - trunkHeight, trunkWidth, trunkHeight);

    // Simplified foliage - single circle (was 3-4 circles per tree)
    ctx.fillStyle = foliageColor;
    ctx.beginPath();
    ctx.arc(canopyX, canopyY, canopyRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw oranges on near trees only (max 3 oranges)
    if (tree.hasOranges && !isFar && tree.orangeOffsets) {
      ctx.fillStyle = orangeColor;
      const orangeSize = canopyRadius * 0.15;
      const maxOranges = Math.min(3, tree.orangeOffsets.length);
      for (let i = 0; i < maxOranges; i++) {
        const pos = tree.orangeOffsets[i];
        ctx.beginPath();
        ctx.arc(canopyX + pos.dx * canopyRadius, canopyY + pos.dy * canopyRadius, orangeSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

  ctx.restore();
}

/**
 * Draw coin - shiny gold coin with rotation effect and pulsing glow
 */
export function drawCoin(
  ctx: CanvasRenderingContext2D,
  coin: Coin,
  performanceMode: boolean
): void {
  if (coin.collected) return;

  ctx.save();
  ctx.translate(coin.x, coin.y);

  // Simulate 3D rotation by varying width
  const rotationScale = Math.abs(Math.cos(coin.rotation));
  const coinRadius = 12;

  // Pulsing glow effect (skip in performance modes)
  if (!performanceMode) {
    const pulsePhase = Math.sin(Date.now() / 300) * 0.5 + 0.5; // 0-1 pulsing
    const glowRadius = coinRadius * (1.8 + pulsePhase * 0.6);
    const glowAlpha = 0.3 + pulsePhase * 0.2;

    // Outer glow - radial gradient
    const glow = ctx.createRadialGradient(0, 0, coinRadius * 0.8, 0, 0, glowRadius);
    glow.addColorStop(0, `rgba(255, 215, 0, ${glowAlpha})`);
    glow.addColorStop(0.5, `rgba(255, 180, 0, ${glowAlpha * 0.5})`);
    glow.addColorStop(1, 'rgba(255, 150, 0, 0)');

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Outer gold ring
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.ellipse(0, 0, coinRadius * rotationScale, coinRadius, 0, 0, Math.PI * 2);
  ctx.fill();

  // Inner darker gold
  ctx.fillStyle = '#FFA500';
  ctx.beginPath();
  ctx.ellipse(0, 0, coinRadius * 0.7 * rotationScale, coinRadius * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shine highlight
  if (rotationScale > 0.3) {
    ctx.fillStyle = 'var(--color-white-60)';
    ctx.beginPath();
    ctx.ellipse(-coinRadius * 0.3 * rotationScale, -coinRadius * 0.3, coinRadius * 0.2 * rotationScale, coinRadius * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draw fireflies for night mode (simplified for performance)
 */
export function drawFireflies(
  ctx: CanvasRenderingContext2D,
  fireflies: Array<{ x: number; y: number; phase: number; speed: number }>
): void {
  if (fireflies.length === 0) return;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 200, 0.8)';

  fireflies.forEach(firefly => {
    // Simple static fireflies - no per-frame Math.sin
    ctx.beginPath();
    ctx.arc(firefly.x, firefly.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

/**
 * Draw bird - performance mode uses minimal drawing
 */
export function drawBird(
  ctx: CanvasRenderingContext2D,
  bird: Bird,
  birdX: number,
  xOffset: number = 0
): void {
  ctx.save();

  ctx.translate(birdX + xOffset, bird.y);
  // Base rotation offset (-45 degrees) + game rotation
  const baseRotation = -0.78; // ~45 degrees counter-clockwise
  ctx.rotate(bird.rotation + baseRotation);
  ctx.scale(bird.scaleX * -1, bird.scaleY); // Mirror horizontally so leaf points left

  // Draw orange emoji
  const emojiSize = BIRD_RADIUS * 2.5; // Size to match hitbox
  ctx.font = `${emojiSize}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('\u{1F34A}', 0, 0);

  ctx.restore();
}

/**
 * Draw pipes - ultra minimal in performance mode
 */
export function drawPipes(
  ctx: CanvasRenderingContext2D,
  pipes: Pipe[],
  canvasHeight: number,
  performanceMode: boolean
): void {
  pipes.forEach(pipe => {
    // Use the pipe's own gapSize (set at creation time)
    const gapSize = pipe.gapSize;
    const topPipeBottom = pipe.gapY - gapSize / 2;
    const bottomPipeTop = pipe.gapY + gapSize / 2;

    // Use slightly different color for moving pipes
    ctx.fillStyle = pipe.isMoving ? '#1E8B1E' : '#228B22';

    // Top pipe
    ctx.fillRect(pipe.x, 0, PIPE_WIDTH, topPipeBottom);

    // Bottom pipe
    ctx.fillRect(pipe.x, bottomPipeTop, PIPE_WIDTH, canvasHeight - bottomPipeTop - 20);

    // Caps only if not in performance mode
    if (!performanceMode) {
      ctx.fillStyle = pipe.isMoving ? '#145A14' : '#1B5E20';
      ctx.fillRect(pipe.x - 5, topPipeBottom - 25, PIPE_WIDTH + 10, 25);
      ctx.fillRect(pipe.x - 5, bottomPipeTop, PIPE_WIDTH + 10, 25);
      ctx.fillStyle = '#228B22';
    }
  });
}

/**
 * Draw score on canvas
 */
export function drawScore(
  ctx: CanvasRenderingContext2D,
  currentScore: number,
  canvasWidth: number
): void {
  ctx.save();
  // Main score
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFF';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.strokeText(String(currentScore), canvasWidth / 2, 60);
  ctx.fillText(String(currentScore), canvasWidth / 2, 60);

  ctx.restore();
}

/**
 * Draw particles
 */
export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Array<{ x: number; y: number; rotation: number; alpha: number; color: string; size: number }>
): void {
  particles.forEach(p => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(0, 0, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

/**
 * Draw impact flash overlay
 */
export function drawImpactFlash(
  ctx: CanvasRenderingContext2D,
  alpha: number,
  canvasWidth: number,
  canvasHeight: number
): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.restore();
}

/**
 * Draw near-miss flash overlay - optimized (simple overlay, no gradient)
 */
export function drawNearMissFlash(
  ctx: CanvasRenderingContext2D,
  alpha: number,
  canvasWidth: number,
  canvasHeight: number
): void {
  if (alpha <= 0) return;
  ctx.save();
  // Simple yellow flash (no gradient for performance)
  ctx.fillStyle = `rgba(255, 215, 0, ${alpha * 0.3})`;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.restore();
}

/**
 * Draw leaderboard countdown (top right corner)
 */
export function drawLeaderboardCountdown(
  ctx: CanvasRenderingContext2D,
  currentScore: number,
  canvasWidth: number,
  nextTarget: { rank: number; score: number; name: string } | null
): void {
  if (!nextTarget) return;

  const pipesNeeded = nextTarget.score - currentScore;

  // Only show when within 10 pipes of beating someone
  if (pipesNeeded > 10 || pipesNeeded <= 0) return;

  ctx.save();
  ctx.textAlign = 'right';

  // Background pill
  const text = pipesNeeded === 1 ? `1 more to beat #${nextTarget.rank}` : `${pipesNeeded} more to beat #${nextTarget.rank}`;
  ctx.font = 'bold 14px Arial';
  const textWidth = ctx.measureText(text).width;

  const pillX = canvasWidth - 10;
  const pillY = 20;
  const pillPadding = 8;
  const pillHeight = 24;

  // Draw pill background
  ctx.fillStyle = 'var(--color-black-60)';
  ctx.beginPath();
  ctx.roundRect(pillX - textWidth - pillPadding * 2, pillY - pillHeight / 2, textWidth + pillPadding * 2, pillHeight, 12);
  ctx.fill();

  // Draw text
  ctx.fillStyle = pipesNeeded <= 3 ? '#FFD700' : '#FFFFFF'; // Gold when close!
  ctx.fillText(text, pillX - pillPadding, pillY + 5);

  ctx.restore();
}

/**
 * Draw "took spot" celebration message
 */
export function drawTookSpotMessage(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  tookSpotMessage: string | null
): void {
  if (!tookSpotMessage) return;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = 'bold 18px Arial';

  const text = tookSpotMessage;
  const textWidth = ctx.measureText(text).width;

  const x = canvasWidth / 2;
  const y = 100;
  const padding = 12;
  const height = 30;

  // Draw background
  ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
  ctx.beginPath();
  ctx.roundRect(x - textWidth / 2 - padding, y - height / 2, textWidth + padding * 2, height, 15);
  ctx.fill();

  // Draw text
  ctx.fillStyle = '#000';
  ctx.fillText(text, x, y + 6);

  ctx.restore();
}

/**
 * Draw idle screen
 */
export function drawIdleScreen(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number
): void {
  ctx.save();

  // Semi-transparent overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Title
  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FF6B00';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.strokeText('Flappy Orange', canvasWidth / 2, canvasHeight / 2 - 40);
  ctx.fillText('Flappy Orange', canvasWidth / 2, canvasHeight / 2 - 40);

  // Tap instruction
  ctx.font = 'bold 20px Arial';
  ctx.fillStyle = '#FFF';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.strokeText('Tap to Start', canvasWidth / 2, canvasHeight / 2 + 20);
  ctx.fillText('Tap to Start', canvasWidth / 2, canvasHeight / 2 + 20);

  // Animated tap indicator
  const bounce = Math.sin(Date.now() * 0.005) * 10;
  ctx.font = '30px Arial';
  ctx.fillText('\u{1F446}', canvasWidth / 2, canvasHeight / 2 + 70 + bounce);

  ctx.restore();
}
