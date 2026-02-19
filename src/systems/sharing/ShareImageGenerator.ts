/**
 * Share Image Generator - SPEC 31 Implementation
 *
 * Canvas-based image generation for shareable score cards.
 * Horizontal layout (1200x630) optimized for social media sharing.
 *
 * Design Philosophy (from Wordle & Brawl Stars):
 * - Score is THE HERO - biggest, boldest element
 * - Tell a story, not just show a result
 * - Create FOMO - make others want to play
 * - High energy visuals with purposeful decorations
 */

import type { ScoreShareData } from './types';

// ============================================
// PHASE 1: FOUNDATION LAYOUT
// ============================================

// Industry standard social media dimensions (1.91:1 ratio)
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 630;

// Layout constants - SPEC 31 Phase 1
const SCREENSHOT_WIDTH = 420;
const SCREENSHOT_MAX_HEIGHT = 460;
const GAP = 48;
const PADDING = 40;
const ACCENT_LINE_HEIGHT = 4;
const BRANDING_HEIGHT = 56;

// Calculate content positioning
const CONTENT_TOP = ACCENT_LINE_HEIGHT + PADDING;
const CONTENT_HEIGHT = CANVAS_HEIGHT - CONTENT_TOP - BRANDING_HEIGHT - PADDING;
const SCREENSHOT_LEFT = PADDING + 40; // Left margin for screenshot

interface BrandColors {
  primary: string;
  secondary: string;
  background: string;
  backgroundDark: string;
  text: string;
  textMuted: string;
}

const BRAND_COLORS: BrandColors = {
  primary: '#FF6B00',
  secondary: '#FF8C00',
  background: '#1a1f3c',
  backgroundDark: '#0f1225',
  text: '#ffffff',
  textMuted: 'rgba(255, 255, 255, 0.5)'
};

// ============================================
// PHASE 3: VISUAL EFFECTS - GAME ICONS
// ============================================

const GAME_ICONS: Record<string, Array<{ emoji: string; top: number; right: number; size: number; opacity: number; rotate: number }>> = {
  'flappy-orange': [
    { emoji: '🍊', top: 0.15, right: 20, size: 32, opacity: 0.2, rotate: 12 },
    { emoji: '🌳', top: 0.68, right: 50, size: 26, opacity: 0.15, rotate: -8 },
    { emoji: '☁️', top: 0.08, right: 180, size: 22, opacity: 0.12, rotate: 0 },
  ],
  'block-puzzle': [
    { emoji: '🟦', top: 0.12, right: 30, size: 30, opacity: 0.2, rotate: 8 },
    { emoji: '🟨', top: 0.55, right: 40, size: 26, opacity: 0.18, rotate: -12 },
    { emoji: '🟩', top: 0.35, right: 160, size: 22, opacity: 0.15, rotate: 15 },
  ],
  'citrus-drop': [
    { emoji: '🍊', top: 0.12, right: 25, size: 30, opacity: 0.2, rotate: 10 },
    { emoji: '🍋', top: 0.50, right: 45, size: 26, opacity: 0.18, rotate: -8 },
    { emoji: '🍎', top: 0.30, right: 150, size: 22, opacity: 0.15, rotate: 5 },
  ],
  'orange-snake': [
    { emoji: '🍊', top: 0.15, right: 30, size: 28, opacity: 0.2, rotate: 15 },
    { emoji: '🐍', top: 0.60, right: 40, size: 26, opacity: 0.18, rotate: -5 },
    { emoji: '⭐', top: 0.35, right: 160, size: 20, opacity: 0.15, rotate: 0 },
  ],
  'memory-match': [
    { emoji: '🃏', top: 0.12, right: 25, size: 30, opacity: 0.2, rotate: 8 },
    { emoji: '🧠', top: 0.55, right: 50, size: 26, opacity: 0.18, rotate: -10 },
    { emoji: '✨', top: 0.32, right: 155, size: 22, opacity: 0.15, rotate: 0 },
  ],
  'wojak-runner': [
    { emoji: '🏃', top: 0.15, right: 28, size: 28, opacity: 0.2, rotate: 10 },
    { emoji: '💨', top: 0.58, right: 45, size: 24, opacity: 0.18, rotate: -5 },
    { emoji: '🔥', top: 0.35, right: 160, size: 22, opacity: 0.15, rotate: 0 },
  ],
  'merge-2048': [
    { emoji: '🔢', top: 0.12, right: 30, size: 28, opacity: 0.2, rotate: 8 },
    { emoji: '➕', top: 0.55, right: 45, size: 24, opacity: 0.18, rotate: 0 },
    { emoji: '💯', top: 0.32, right: 155, size: 22, opacity: 0.15, rotate: -5 },
  ],
  'color-reaction': [
    { emoji: '🔴', top: 0.12, right: 25, size: 26, opacity: 0.2, rotate: 0 },
    { emoji: '🟢', top: 0.52, right: 50, size: 24, opacity: 0.18, rotate: 0 },
    { emoji: '🔵', top: 0.32, right: 155, size: 22, opacity: 0.15, rotate: 0 },
  ],
  'default': [
    { emoji: '🎮', top: 0.15, right: 25, size: 30, opacity: 0.2, rotate: 12 },
    { emoji: '⭐', top: 0.55, right: 45, size: 26, opacity: 0.18, rotate: -8 },
    { emoji: '🏆', top: 0.32, right: 155, size: 22, opacity: 0.15, rotate: 5 },
  ],
};

// ============================================
// PHASE 3: SPARKLES DECORATION
// ============================================

const SPARKLES = [
  { char: '✦', top: 0.10, right: 0.04, size: 22, opacity: 0.5 },
  { char: '✧', top: 0.20, right: 0.18, size: 16, opacity: 0.35 },
  { char: '·', top: 0.32, right: 0.08, size: 14, opacity: 0.5 },
  { char: '✦', top: 0.48, right: 0.03, size: 18, opacity: 0.4 },
  { char: '✧', top: 0.62, right: 0.14, size: 14, opacity: 0.3 },
  { char: '·', top: 0.75, right: 0.06, size: 12, opacity: 0.4 },
];

// ============================================
// PHASE 4: BADGE SYSTEM
// ============================================

interface ScoreBadge {
  text: string;
  icon: string;
  bg: string;
  glow: string;
}

/**
 * Get achievement badge based on score performance - SPEC 31 Phase 4
 */
function getScoreBadge(score: number, bestScore: number, isNewHighScore?: boolean): ScoreBadge | null {
  if (isNewHighScore && score > 0 && score >= bestScore) {
    return { text: 'NEW RECORD!', icon: '🏆', bg: '#FFD700', glow: 'rgba(255, 215, 0, 0.4)' };
  }
  if (score >= 100) {
    return { text: 'LEGENDARY', icon: '🔥', bg: '#FF4500', glow: 'rgba(255, 69, 0, 0.4)' };
  }
  if (score >= 50) {
    return { text: 'AMAZING', icon: '⚡', bg: '#9B59B6', glow: 'rgba(155, 89, 182, 0.4)' };
  }
  if (score >= 25) {
    return { text: 'NICE RUN', icon: '💪', bg: '#3498DB', glow: 'rgba(52, 152, 219, 0.4)' };
  }
  if (score >= 10) {
    return { text: 'GOOD TRY', icon: '👍', bg: '#2ECC71', glow: 'rgba(46, 204, 113, 0.4)' };
  }
  if (score >= 1) {
    return { text: 'KEEP GOING', icon: '🎮', bg: '#6B7280', glow: 'rgba(107, 114, 128, 0.3)' };
  }
  return null;
}

/**
 * Get CTA message based on score - SPEC 31 Phase 4
 */
function getCTA(score: number, bestScore: number, isNewHighScore?: boolean): string {
  if (score === 0) {
    return "Think you can do better? 😏";
  }
  if (isNewHighScore && score > 0 && score >= bestScore) {
    return "Can you beat my NEW record? 🏆";
  }
  if (score >= 50) {
    return "Can you beat my score? 🔥";
  }
  if (score >= 25) {
    return "Can you beat my score? 💪";
  }
  return "Can you beat my score? 🎮";
}

/**
 * Get score label for each game
 */
function getScoreLabel(gameId: string): string {
  const labels: Record<string, string> = {
    'flappy-orange': 'pipes passed',
    'block-puzzle': 'points',
    'citrus-drop': 'points',
    'orange-snake': 'length',
    'brick-breaker': 'points',
    'wojak-whack': 'whacks',
    'orange-stack': 'height',
    'memory-match': 'points',
    'orange-pong': 'points',
    'wojak-runner': 'distance',
    'orange-juggle': 'juggles',
    'color-reaction': 'points',
    'merge-2048': 'points',
  };
  return labels[gameId] || 'points';
}

/**
 * Load an image from a data URL
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

// ============================================
// MAIN GENERATOR FUNCTION
// ============================================

/**
 * Generate a horizontal composite shareable image with game screenshot
 * Layout: Screenshot on left, stats on right (1200x630)
 * Implements SPEC 31 Phases 1-5
 */
export async function generateScoreImageWithScreenshot(
  data: ScoreShareData,
  screenshot: string | null
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d')!;

  // PHASE 1: Draw background
  drawBackground(ctx);

  // PHASE 1: Orange accent line at top
  drawAccentLine(ctx);

  // PHASE 3: Gradient orbs (background blur elements)
  drawGradientOrbs(ctx);

  // PHASE 3: Decorative circles
  drawDecorativeCircles(ctx);

  // PHASE 3: Sparkles
  drawSparkles(ctx);

  // PHASE 3: Game-specific icons
  drawGameIcons(ctx, data.gameId);

  // PHASE 5: Draw screenshot section (left side) - uses object-fit: contain
  const screenshotEndX = await drawScreenshotSection(ctx, screenshot);

  // PHASE 2: Draw stats section (right side) - vertically centered
  drawStatsSection(ctx, data, screenshotEndX);

  // PHASE 1: Branding bar at bottom
  drawBrandingBar(ctx);

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to generate composite image'));
      }
    }, 'image/png', 0.95);
  });
}

// ============================================
// PHASE 1: FOUNDATION DRAWING FUNCTIONS
// ============================================

/**
 * Draw background with subtle dot pattern - SPEC 31 Phase 1 & 3
 */
function drawBackground(ctx: CanvasRenderingContext2D): void {
  // Main gradient (145deg angle)
  const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH * 0.7, CANVAS_HEIGHT);
  gradient.addColorStop(0, BRAND_COLORS.background);
  gradient.addColorStop(0.6, BRAND_COLORS.backgroundDark);
  gradient.addColorStop(1, BRAND_COLORS.background);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Subtle dot pattern overlay
  ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
  const dotSpacing = 20;
  for (let x = 0; x < CANVAS_WIDTH; x += dotSpacing) {
    for (let y = 0; y < CANVAS_HEIGHT; y += dotSpacing) {
      ctx.beginPath();
      ctx.arc(x + 1, y + 1, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Draw orange accent line at top - SPEC 31 Phase 1
 */
function drawAccentLine(ctx: CanvasRenderingContext2D): void {
  const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0);
  gradient.addColorStop(0, BRAND_COLORS.primary);
  gradient.addColorStop(0.5, BRAND_COLORS.secondary);
  gradient.addColorStop(1, BRAND_COLORS.primary);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, ACCENT_LINE_HEIGHT);
}

/**
 * Draw branding bar at bottom - SPEC 31 Phase 1
 */
function drawBrandingBar(ctx: CanvasRenderingContext2D): void {
  const y = CANVAS_HEIGHT - BRANDING_HEIGHT;

  // Background with subtle transparency
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(0, y, CANVAS_WIDTH, BRANDING_HEIGHT);

  // Top border line
  ctx.fillStyle = 'var(--color-white-8)';
  ctx.fillRect(0, y, CANVAS_WIDTH, 1);

  // Brand left
  ctx.fillStyle = BRAND_COLORS.primary;
  ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('🍊 WOJAK.INK', PADDING, y + BRANDING_HEIGHT / 2);

  // Brand right
  ctx.font = '18px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('🍊 Tang Grove Gaming 🍊', CANVAS_WIDTH - PADDING, y + BRANDING_HEIGHT / 2);
}

// ============================================
// PHASE 3: VISUAL EFFECTS DRAWING FUNCTIONS
// ============================================

/**
 * Draw blurred gradient orbs - SPEC 31 Phase 3B
 */
function drawGradientOrbs(ctx: CanvasRenderingContext2D): void {
  // Orange orb top-right
  const gradient1 = ctx.createRadialGradient(
    CANVAS_WIDTH - 100, 80, 0,
    CANVAS_WIDTH - 100, 80, 280
  );
  gradient1.addColorStop(0, 'rgba(255, 107, 0, 0.08)');
  gradient1.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient1;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Purple orb bottom-right
  const gradient2 = ctx.createRadialGradient(
    CANVAS_WIDTH - 200, CANVAS_HEIGHT - 200, 0,
    CANVAS_WIDTH - 200, CANVAS_HEIGHT - 200, 180
  );
  gradient2.addColorStop(0, 'rgba(99, 102, 241, 0.05)');
  gradient2.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient2;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

/**
 * Draw decorative circles in top-right - SPEC 31 Phase 3C
 */
function drawDecorativeCircles(ctx: CanvasRenderingContext2D): void {
  // Large outer circle
  ctx.strokeStyle = 'rgba(255, 107, 0, 0.1)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(CANVAS_WIDTH - 20 - 90, 50 + 90, 90, 0, Math.PI * 2);
  ctx.stroke();

  // Medium circle
  ctx.strokeStyle = 'rgba(255, 107, 0, 0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(CANVAS_WIDTH - 60 - 60, 80 + 60, 60, 0, Math.PI * 2);
  ctx.stroke();

  // Small accent circle
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(CANVAS_WIDTH - 10 - 30, 160 + 30, 30, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * Draw sparkles - SPEC 31 Phase 3D
 */
function drawSparkles(ctx: CanvasRenderingContext2D): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const sparkle of SPARKLES) {
    const x = CANVAS_WIDTH - (sparkle.right * CANVAS_WIDTH);
    const y = sparkle.top * CANVAS_HEIGHT;

    ctx.globalAlpha = sparkle.opacity;
    ctx.fillStyle = BRAND_COLORS.primary;
    ctx.font = `${sparkle.size}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(sparkle.char, x, y);
  }

  ctx.globalAlpha = 1;
}

/**
 * Draw game-specific icons - SPEC 31 Phase 3E
 */
function drawGameIcons(ctx: CanvasRenderingContext2D, gameId: string): void {
  const icons = GAME_ICONS[gameId] || GAME_ICONS['default'];

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const icon of icons) {
    const x = CANVAS_WIDTH - icon.right;
    const y = icon.top * CANVAS_HEIGHT;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((icon.rotate * Math.PI) / 180);
    ctx.globalAlpha = icon.opacity;
    ctx.font = `${icon.size}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(icon.emoji, 0, 0);
    ctx.restore();
  }

  ctx.globalAlpha = 1;
}

// ============================================
// PHASE 5: SCREENSHOT SECTION (object-fit: contain)
// ============================================

/**
 * Draw screenshot section - SPEC 31 Phase 5
 * Uses object-fit: contain to preserve aspect ratio (NO CROPPING)
 */
async function drawScreenshotSection(
  ctx: CanvasRenderingContext2D,
  screenshot: string | null
): Promise<number> {
  const x = SCREENSHOT_LEFT;
  const y = CONTENT_TOP;
  const maxWidth = SCREENSHOT_WIDTH;
  const maxHeight = Math.min(SCREENSHOT_MAX_HEIGHT, CONTENT_HEIGHT);
  const radius = 16;

  if (screenshot) {
    try {
      const img = await loadImage(screenshot);

      // CRITICAL: Use object-fit: contain logic (preserve aspect ratio, no crop)
      const imgAspect = img.width / img.height;
      const containerAspect = maxWidth / maxHeight;
      let drawWidth: number, drawHeight: number;

      if (imgAspect > containerAspect) {
        // Image is wider than container - fit to width
        drawWidth = maxWidth;
        drawHeight = maxWidth / imgAspect;
      } else {
        // Image is taller than container - fit to height
        drawHeight = maxHeight;
        drawWidth = maxHeight * imgAspect;
      }

      // Center the image in the container
      const offsetX = x + (maxWidth - drawWidth) / 2;
      const offsetY = y + (maxHeight - drawHeight) / 2;

      // Draw black background for letterboxing
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.roundRect(x, y, maxWidth, maxHeight, radius);
      ctx.fill();

      // Draw the screenshot with rounded corners (clipped)
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, maxWidth, maxHeight, radius);
      ctx.clip();
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      ctx.restore();

      // Subtle border/shadow
      ctx.shadowColor = 'var(--color-black-50)';
      ctx.shadowBlur = 48;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 16;
      ctx.strokeStyle = 'var(--color-white-15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, maxWidth, maxHeight, radius);
      ctx.stroke();
      ctx.shadowBlur = 0;

    } catch (e) {
      console.warn('[ShareImageGenerator] Failed to load screenshot:', e);
      drawPlaceholderScreenshot(ctx, x, y, maxWidth, maxHeight, radius);
    }
  } else {
    drawPlaceholderScreenshot(ctx, x, y, maxWidth, maxHeight, radius);
  }

  return x + maxWidth + GAP; // Return where stats should start
}

/**
 * Draw placeholder when no screenshot available
 */
function drawPlaceholderScreenshot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  // Draw rounded rectangle background
  ctx.fillStyle = 'rgba(255, 107, 0, 0.08)';
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();

  // Draw border
  ctx.strokeStyle = 'rgba(255, 107, 0, 0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw game emoji placeholder
  ctx.font = '100px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 107, 0, 0.4)';
  ctx.fillText('🎮', x + width / 2, y + height / 2);
}

// ============================================
// PHASE 2: STATS SECTION (vertically centered)
// ============================================

/**
 * Draw stats section - SPEC 31 Phase 2
 * Content is VERTICALLY CENTERED in the available space
 */
function drawStatsSection(
  ctx: CanvasRenderingContext2D,
  data: ScoreShareData,
  startX: number
): void {
  const x = startX;

  // Calculate total content height for vertical centering
  // Title: ~80px, Divider: 24px, Score: 140px, Label: 30px, Divider: 24px, Meta: 40px, CTA: 40px
  const totalContentHeight = 80 + 24 + 140 + 30 + 24 + 40 + 40;
  const startY = CONTENT_TOP + (CONTENT_HEIGHT - totalContentHeight) / 2;

  let currentY = startY;

  // Split game title into words for stacked display
  const titleWords = data.gameName.toUpperCase().split(' ');

  // PHASE 2: Game title - stacked words
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.font = '900 38px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '6px';

  for (const word of titleWords) {
    ctx.fillText(word, x, currentY);
    currentY += 42; // Line height for stacked words
  }
  currentY += 8;

  // PHASE 2: Thin divider line
  drawDividerLine(ctx, x, currentY, 80, 'thin');
  currentY += 24;

  // PHASE 2: Score glow effect behind the number
  drawScoreGlow(ctx, x + 100, currentY + 70);

  // PHASE 2: HUGE score number (THE HERO) - 160px
  ctx.fillStyle = BRAND_COLORS.primary;
  ctx.font = '900 160px system-ui, -apple-system, sans-serif';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(255, 107, 0, 0.35)';
  ctx.shadowBlur = 60;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;
  ctx.fillText(formatScore(data.score), x, currentY);
  ctx.shadowBlur = 0;
  currentY += 140;

  // PHASE 2: Score label
  ctx.fillStyle = BRAND_COLORS.textMuted;
  ctx.font = '500 26px system-ui, -apple-system, sans-serif';
  ctx.fillText(getScoreLabel(data.gameId), x, currentY);
  currentY += 36;

  // PHASE 2: Thick divider line
  drawDividerLine(ctx, x, currentY, 140, 'thick');
  currentY += 28;

  // PHASE 2: Best score + Badge row
  const bestScore = data.highScore ?? 0;
  ctx.fillStyle = BRAND_COLORS.primary;
  ctx.font = '700 22px system-ui, -apple-system, sans-serif';
  const bestText = `🍊 Best: ${bestScore.toLocaleString()}`;
  ctx.fillText(bestText, x, currentY);

  // PHASE 4: Achievement badge
  const badge = getScoreBadge(data.score, bestScore, data.isNewHighScore);
  if (badge) {
    const bestTextWidth = ctx.measureText(bestText).width;
    drawBadge(ctx, badge, x + bestTextWidth + 16, currentY - 4);
  }
  currentY += 44;

  // PHASE 2: CTA message
  const cta = getCTA(data.score, bestScore, data.isNewHighScore);
  ctx.fillStyle = 'var(--color-white-40)';
  ctx.font = 'italic 500 18px system-ui, -apple-system, sans-serif';
  ctx.fillText(cta, x, currentY);
}

/**
 * Draw divider line - SPEC 31 Phase 2
 */
function drawDividerLine(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  type: 'thin' | 'thick'
): void {
  if (type === 'thin') {
    ctx.fillStyle = 'rgba(255, 107, 0, 0.4)';
    ctx.fillRect(x, y, width, 2);
  } else {
    const gradient = ctx.createLinearGradient(x, y, x + width, y);
    gradient.addColorStop(0, BRAND_COLORS.primary);
    gradient.addColorStop(1, 'rgba(255, 107, 0, 0.2)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, 3);
  }
}

/**
 * Draw radial glow behind score - SPEC 31 Phase 3F
 */
function drawScoreGlow(ctx: CanvasRenderingContext2D, centerX: number, centerY: number): void {
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 180);
  gradient.addColorStop(0, 'rgba(255, 107, 0, 0.12)');
  gradient.addColorStop(0.5, 'rgba(255, 107, 0, 0.04)');
  gradient.addColorStop(0.7, 'transparent');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, 280, 180, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw achievement badge - SPEC 31 Phase 4
 */
function drawBadge(
  ctx: CanvasRenderingContext2D,
  badge: ScoreBadge,
  x: number,
  y: number
): void {
  const text = `${badge.icon} ${badge.text}`;
  ctx.font = '800 14px system-ui, -apple-system, sans-serif';
  const textWidth = ctx.measureText(text).width;

  const paddingX = 16;
  const badgeWidth = textWidth + paddingX * 2;
  const badgeHeight = 28;
  const radius = 14;

  // Badge background with glow
  ctx.shadowColor = badge.glow;
  ctx.shadowBlur = 12;
  ctx.fillStyle = badge.bg;
  ctx.beginPath();
  ctx.roundRect(x, y, badgeWidth, badgeHeight, radius);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Badge text
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + badgeWidth / 2, y + badgeHeight / 2);
  ctx.textAlign = 'left';
}

/**
 * Format score for display (handles large numbers)
 */
function formatScore(score: number): string {
  if (score >= 1000000) {
    return `${(score / 1000000).toFixed(1)}M`;
  }
  if (score >= 100000) {
    return `${(score / 1000).toFixed(0)}K`;
  }
  return score.toLocaleString();
}

// ============================================
// HELPER EXPORTS
// ============================================

/**
 * Generate a shareable image without screenshot (fallback)
 */
export async function generateScoreImage(data: ScoreShareData): Promise<Blob> {
  return generateScoreImageWithScreenshot(data, null);
}

/**
 * Generate a simpler text-based share (for platforms without image support)
 */
export function generateShareText(data: ScoreShareData): string {
  const emoji = data.isNewHighScore ? '🏆' : '🎮';
  const rankText = data.rank ? ` (Rank #${data.rank})` : '';

  return `${emoji} I just scored ${data.score.toLocaleString()} in ${data.gameName}${rankText}!\n\nCan you beat me? 🍊\n\nPlay now: ${getShareUrl(data.gameId)}`;
}

/**
 * Get the share URL for a game
 */
export function getShareUrl(gameId: string, referrer?: string): string {
  const baseUrl = `${window.location.origin}/games`;
  if (referrer) {
    return `${baseUrl}?ref=${referrer}&game=${gameId}`;
  }
  return `${baseUrl}?game=${gameId}`;
}
