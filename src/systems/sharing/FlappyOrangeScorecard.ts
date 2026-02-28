/**
 * Flappy Orange Scorecard Generator
 *
 * Generates a 1200x630 share card following the exact design specifications
 * from the Flappy Orange Scorecard Design Specifications PDF.
 *
 * This design will be adapted for all other games as well.
 *
 * Key Design Elements:
 * - Radial gradient background with warm tones
 * - Orange accent bar at top (7px)
 * - Screenshot section (left, 620px)
 * - Stats section (right) with score, badges, CTA
 * - Branding bar at bottom (90px) with orange circles
 */

// ============================================
// CANVAS DIMENSIONS (Social Media Standard)
// ============================================
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 630;

// ============================================
// LAYOUT CONSTANTS
// ============================================
const LAYOUT = {
  // Top accent bar
  ACCENT_HEIGHT: 7,

  // Screenshot section (left)
  SCREENSHOT_WIDTH: 620,
  SCREENSHOT_PADDING: 24,
  SCREENSHOT_RADIUS: 16,
  SCREENSHOT_BORDER: '#2A2A2A',
  SCREENSHOT_BG: '#0C0C0C',

  // Right side stats section
  STATS_PADDING: { top: 40, right: 48, bottom: 40, left: 24 },
  STATS_GAP: 24,

  // Branding bar (bottom)
  BRANDING_HEIGHT: 90,
  BRANDING_PADDING_X: 48,
  BRANDING_BORDER: '#1A1A1A',

  // Orange circles in branding
  CIRCLE_SIZE: 32,
  CIRCLE_GAP: 16,
};

// ============================================
// COLOR PALETTE (from PDF spec)
// ============================================
const COLORS = {
  PRIMARY_ORANGE: '#FF6B00',
  SECONDARY_ORANGE: '#FF8C00',
  DARK_ORANGE: '#CC5500',
  GOLD: '#FFD700',
  WHITE: '#FFFFFF',
  GRAY_400: '#404040',
  GRAY_600: '#606060',
  DARK_BG: '#0C0C0C',
  CARD_BG: '#080808',
  BADGE_BG: '#161616',
  BORDER: '#1A1A1A',
  BADGE_BORDER: '#252525',

  // Record badge colors
  RECORD_BG: '#1A1500',
  RECORD_BORDER: '#3D3000',

  // Streak badge colors
  STREAK_BG: '#1A0A00',
  STREAK_BORDER: '#3D1D00',
};

// ============================================
// TYPOGRAPHY (from PDF spec)
// ============================================
const FONTS = {
  TITLE: {
    family: 'Sora, system-ui, sans-serif',
    size: 48,
    weight: 800,
    letterSpacing: -1,
  },
  SCORE: {
    family: 'Sora, system-ui, sans-serif',
    size: 120,
    weight: 700,
    letterSpacing: -6,
  },
  SCORE_LABEL: {
    family: 'Inter, system-ui, sans-serif',
    size: 28,
    weight: 500,
  },
  BADGE: {
    family: 'Inter, system-ui, sans-serif',
    size: 20,
    weight: 700,
  },
  RECORD_BADGE: {
    family: 'Inter, system-ui, sans-serif',
    size: 18,
    weight: 800,
    letterSpacing: 1,
  },
  CTA: {
    family: 'Inter, system-ui, sans-serif',
    size: 36,
    weight: 600,
    style: 'italic',
  },
  BRAND_LEFT: {
    family: 'Sora, system-ui, sans-serif',
    size: 32,
    weight: 800,
    letterSpacing: 4,
  },
  BRAND_RIGHT: {
    family: 'Sora, system-ui, sans-serif',
    size: 24,
    weight: 800,
    letterSpacing: 3,
  },
};

// ============================================
// SCORECARD DATA INTERFACE
// ============================================
export interface FlappyScorecardData {
  score: number;
  bestScore: number;
  isNewRecord: boolean;
  streak?: number;
  gamesPlayed?: number;
  screenshot: string | null; // Base64 data URL from canvas.toDataURL()
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Load an image from a data URL
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

/**
 * Draw a rounded rectangle
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

// ============================================
// MAIN SCORECARD GENERATOR
// ============================================

/**
 * Generate the Flappy Orange scorecard image
 * Returns a Blob that can be downloaded or shared
 */
export async function generateFlappyOrangeScorecard(
  data: FlappyScorecardData
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d')!;

  // 1. Draw background
  drawBackground(ctx);

  // 2. Draw top accent bar
  drawAccentBar(ctx);

  // 3. Draw main content (screenshot + stats)
  await drawMainContent(ctx, data);

  // 4. Draw branding bar
  drawBrandingBar(ctx);

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to generate scorecard image'));
        }
      },
      'image/png',
      1.0
    );
  });
}

// ============================================
// BACKGROUND
// ============================================

function drawBackground(ctx: CanvasRenderingContext2D): void {
  // Radial gradient: ellipse 150% 150% at 70% 30%
  const centerX = CANVAS_WIDTH * 0.7;
  const centerY = CANVAS_HEIGHT * 0.3;
  const radiusX = CANVAS_WIDTH * 1.5;
  const radiusY = CANVAS_HEIGHT * 1.5;

  // Create radial gradient (approximate ellipse with radial)
  const gradient = ctx.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    Math.max(radiusX, radiusY) * 0.7
  );
  gradient.addColorStop(0, '#1A1000');
  gradient.addColorStop(0.7, COLORS.DARK_BG);
  gradient.addColorStop(1, COLORS.CARD_BG);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

// ============================================
// TOP ACCENT BAR
// ============================================

function drawAccentBar(ctx: CanvasRenderingContext2D): void {
  const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0);
  gradient.addColorStop(0, COLORS.PRIMARY_ORANGE);
  gradient.addColorStop(1, COLORS.SECONDARY_ORANGE);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, LAYOUT.ACCENT_HEIGHT);
}

// ============================================
// MAIN CONTENT (Screenshot + Stats)
// ============================================

async function drawMainContent(
  ctx: CanvasRenderingContext2D,
  data: FlappyScorecardData
): Promise<void> {
  const contentTop = LAYOUT.ACCENT_HEIGHT;
  const contentHeight = CANVAS_HEIGHT - LAYOUT.ACCENT_HEIGHT - LAYOUT.BRANDING_HEIGHT;

  // Screenshot section (left)
  await drawScreenshotSection(ctx, data.screenshot, contentTop, contentHeight);

  // Stats section (right)
  drawStatsSection(ctx, data, contentTop, contentHeight);
}

// ============================================
// SCREENSHOT SECTION (Left)
// ============================================

async function drawScreenshotSection(
  ctx: CanvasRenderingContext2D,
  screenshot: string | null,
  contentTop: number,
  contentHeight: number
): Promise<void> {
  const x = 0;
  const y = contentTop;
  const width = LAYOUT.SCREENSHOT_WIDTH;
  const height = contentHeight;
  const padding = LAYOUT.SCREENSHOT_PADDING;
  const radius = LAYOUT.SCREENSHOT_RADIUS;

  // Background
  ctx.fillStyle = LAYOUT.SCREENSHOT_BG;
  ctx.fillRect(x, y, width, height);

  // Screenshot frame area
  const frameX = x + padding;
  const frameY = y + padding;
  const frameWidth = width - padding * 2;
  const frameHeight = height - padding * 2;

  if (screenshot) {
    try {
      const img = await loadImage(screenshot);

      // Calculate object-fit: cover dimensions
      const imgAspect = img.width / img.height;
      const frameAspect = frameWidth / frameHeight;
      let drawWidth: number, drawHeight: number, drawX: number, drawY: number;

      if (imgAspect > frameAspect) {
        // Image is wider - fit to height, crop sides
        drawHeight = frameHeight;
        drawWidth = frameHeight * imgAspect;
        drawX = frameX - (drawWidth - frameWidth) / 2;
        drawY = frameY;
      } else {
        // Image is taller - fit to width, crop top/bottom
        drawWidth = frameWidth;
        drawHeight = frameWidth / imgAspect;
        drawX = frameX;
        drawY = frameY - (drawHeight - frameHeight) / 2;
      }

      // Clip to rounded rectangle
      ctx.save();
      roundRect(ctx, frameX, frameY, frameWidth, frameHeight, radius);
      ctx.clip();
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      ctx.restore();

      // Border
      ctx.strokeStyle = LAYOUT.SCREENSHOT_BORDER;
      ctx.lineWidth = 1;
      roundRect(ctx, frameX, frameY, frameWidth, frameHeight, radius);
      ctx.stroke();
    } catch {
      // Screenshot load failed, use placeholder
      drawScreenshotPlaceholder(ctx, frameX, frameY, frameWidth, frameHeight, radius);
    }
  } else {
    drawScreenshotPlaceholder(ctx, frameX, frameY, frameWidth, frameHeight, radius);
  }
}

function drawScreenshotPlaceholder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  // Dark background
  ctx.fillStyle = '#1A1A1A';
  roundRect(ctx, x, y, width, height, radius);
  ctx.fill();

  // Border
  ctx.strokeStyle = LAYOUT.SCREENSHOT_BORDER;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Placeholder text
  ctx.fillStyle = COLORS.GRAY_600;
  ctx.font = '24px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Game Screenshot', x + width / 2, y + height / 2);
}

// ============================================
// STATS SECTION (Right)
// ============================================

function drawStatsSection(
  ctx: CanvasRenderingContext2D,
  data: FlappyScorecardData,
  contentTop: number,
  contentHeight: number
): void {
  // Mark as used for API consistency
  void contentHeight;
  const x = LAYOUT.SCREENSHOT_WIDTH + LAYOUT.STATS_PADDING.left;
  const rightPadding = LAYOUT.STATS_PADDING.right;
  const availableWidth = CANVAS_WIDTH - x - rightPadding;
  let currentY = contentTop + LAYOUT.STATS_PADDING.top;

  // Title: FLAPPY ORANGE
  drawTitle(ctx, x, currentY);
  currentY += 67 + LAYOUT.STATS_GAP;

  // Score section
  currentY = drawScoreSection(ctx, x, currentY, data.score);
  currentY += LAYOUT.STATS_GAP;

  // Stats row (Best + New Record badges)
  currentY = drawStatsRow(ctx, x, currentY, availableWidth, data);
  currentY += LAYOUT.STATS_GAP;

  // CTA text
  drawCTA(ctx, x, currentY, data.score, data.isNewRecord);
  currentY += 50 + LAYOUT.STATS_GAP;

  // Bottom row (Streak + Games badges)
  if (data.streak || data.gamesPlayed) {
    drawBottomRow(ctx, x, currentY, availableWidth, data);
  }
}

function drawTitle(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // "FLAPPY" with glow
  ctx.save();
  ctx.shadowColor = 'rgba(255, 107, 0, 0.5)';
  ctx.shadowBlur = 40;
  ctx.fillStyle = COLORS.PRIMARY_ORANGE;
  ctx.font = `${FONTS.TITLE.weight} ${FONTS.TITLE.size}px ${FONTS.TITLE.family}`;
  ctx.fillText('FLAPPY', x, y);
  const flappyWidth = ctx.measureText('FLAPPY').width;
  ctx.restore();

  // "ORANGE"
  ctx.fillStyle = COLORS.WHITE;
  ctx.font = `${FONTS.TITLE.weight} ${FONTS.TITLE.size}px ${FONTS.TITLE.family}`;
  ctx.fillText('ORANGE', x + flappyWidth + 16, y);
}

function drawScoreSection(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  score: number
): number {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Score number with glow
  ctx.save();
  ctx.shadowColor = 'rgba(255, 107, 0, 0.3)';
  ctx.shadowBlur = 60;
  ctx.fillStyle = COLORS.PRIMARY_ORANGE;
  ctx.font = `${FONTS.SCORE.weight} ${FONTS.SCORE.size}px ${FONTS.SCORE.family}`;

  const scoreText = score.toLocaleString();
  const baselineY = y + FONTS.SCORE.size * 0.85; // Approximate baseline
  ctx.fillText(scoreText, x, baselineY);
  const scoreWidth = ctx.measureText(scoreText).width;
  ctx.restore();

  // "pipes" label
  ctx.fillStyle = COLORS.GRAY_400;
  ctx.font = `${FONTS.SCORE_LABEL.weight} ${FONTS.SCORE_LABEL.size}px ${FONTS.SCORE_LABEL.family}`;
  ctx.fillText('pipes', x + scoreWidth + 16, baselineY);

  return y + FONTS.SCORE.size;
}

function drawStatsRow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  availableWidth: number,
  data: FlappyScorecardData
): number {
  const badgeHeight = 52;
  const badgeGap = 16;
  const badgeRadius = 16;

  // Calculate badge widths (equal distribution)
  const badgeCount = data.isNewRecord ? 2 : 1;
  const badgeWidth = (availableWidth - badgeGap * (badgeCount - 1)) / badgeCount;

  // Best Score badge
  drawBadge(
    ctx,
    x,
    y,
    data.isNewRecord ? badgeWidth : availableWidth,
    badgeHeight,
    badgeRadius,
    `🍊  Best: ${data.bestScore.toLocaleString()}`,
    COLORS.WHITE,
    COLORS.BADGE_BG,
    COLORS.BADGE_BORDER,
    FONTS.BADGE
  );

  // New Record badge (if applicable)
  if (data.isNewRecord) {
    drawBadge(
      ctx,
      x + badgeWidth + badgeGap,
      y,
      badgeWidth,
      badgeHeight,
      badgeRadius,
      '🏆  NEW RECORD!',
      COLORS.GOLD,
      COLORS.RECORD_BG,
      COLORS.RECORD_BORDER,
      FONTS.RECORD_BADGE
    );
  }

  return y + badgeHeight;
}

function drawBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  text: string,
  textColor: string,
  bgColor: string,
  borderColor: string,
  font: typeof FONTS.BADGE
): void {
  // Background
  ctx.fillStyle = bgColor;
  roundRect(ctx, x, y, width, height, radius);
  ctx.fill();

  // Border
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Text
  ctx.fillStyle = textColor;
  ctx.font = `${font.weight} ${font.size}px ${font.family}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + width / 2, y + height / 2);
}

function drawCTA(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  score: number,
  isNewRecord: boolean
): void {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = COLORS.WHITE;
  ctx.font = `${FONTS.CTA.style} ${FONTS.CTA.weight} ${FONTS.CTA.size}px ${FONTS.CTA.family}`;

  const ctaText = isNewRecord
    ? 'Can you beat my record? 🔥'
    : score >= 50
    ? 'Can you beat my score? 🔥'
    : 'Can you beat my score? 🔥';

  ctx.fillText(ctaText, x, y);
}

function drawBottomRow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  availableWidth: number,
  data: FlappyScorecardData
): void {
  const badgeHeight = 52;
  const badgeGap = 16;
  const badgeRadius = 16;

  const hasStreak = data.streak && data.streak > 0;
  const hasGames = data.gamesPlayed && data.gamesPlayed > 0;
  const badgeCount = (hasStreak ? 1 : 0) + (hasGames ? 1 : 0);

  if (badgeCount === 0) return;

  const badgeWidth = (availableWidth - badgeGap * (badgeCount - 1)) / badgeCount;
  let currentX = x;

  // Streak badge
  if (hasStreak) {
    drawBadge(
      ctx,
      currentX,
      y,
      badgeWidth,
      badgeHeight,
      badgeRadius,
      `🔥  ${data.streak}-day streak`,
      COLORS.PRIMARY_ORANGE,
      COLORS.STREAK_BG,
      COLORS.STREAK_BORDER,
      FONTS.BADGE
    );
    currentX += badgeWidth + badgeGap;
  }

  // Games badge
  if (hasGames) {
    drawBadge(
      ctx,
      currentX,
      y,
      badgeWidth,
      badgeHeight,
      badgeRadius,
      `🎮  ${data.gamesPlayed} games`,
      COLORS.GRAY_600,
      COLORS.BADGE_BG,
      COLORS.BADGE_BORDER,
      FONTS.BADGE
    );
  }
}

// ============================================
// BRANDING BAR (Bottom)
// ============================================

/**
 * Draw an orange emoji at the specified position
 */
function drawOrangeEmoji(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  ctx.font = `${size}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🍊', x, y);
}

function drawBrandingBar(ctx: CanvasRenderingContext2D): void {
  const y = CANVAS_HEIGHT - LAYOUT.BRANDING_HEIGHT;
  const height = LAYOUT.BRANDING_HEIGHT;
  const paddingX = LAYOUT.BRANDING_PADDING_X;

  // Background gradient
  const gradient = ctx.createLinearGradient(0, y, CANVAS_WIDTH, y);
  gradient.addColorStop(0, '#0A0A0A');
  gradient.addColorStop(1, '#111111');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, y, CANVAS_WIDTH, height);

  // Top border
  ctx.fillStyle = LAYOUT.BRANDING_BORDER;
  ctx.fillRect(0, y, CANVAS_WIDTH, 1);

  const centerY = y + height / 2;
  const emojiSize = 28; // Emoji size in pixels
  const emojiGap = 8;   // Gap between emojis

  // Calculate positions for text elements first
  ctx.font = `${FONTS.BRAND_LEFT.weight} ${FONTS.BRAND_LEFT.size}px ${FONTS.BRAND_LEFT.family}`;
  const wojakWidth = ctx.measureText('WOJAK.INK').width;

  ctx.font = `${FONTS.BRAND_RIGHT.weight} ${FONTS.BRAND_RIGHT.size}px ${FONTS.BRAND_RIGHT.family}`;
  const twoGroveWidth = ctx.measureText('TWO GROVE GAMING').width;

  // Layout: [🍊🍊] WOJAK.INK [🍊🍊🍊🍊🍊🍊🍊] TWO GROVE GAMING [🍊🍊]

  // Left section positioning
  const leftStartX = paddingX;
  let currentX = leftStartX;

  // Left emojis (2)
  drawOrangeEmoji(ctx, currentX + emojiSize / 2, centerY, emojiSize);
  currentX += emojiSize + emojiGap;
  drawOrangeEmoji(ctx, currentX + emojiSize / 2, centerY, emojiSize);
  currentX += emojiSize + emojiGap * 2;

  // WOJAK.INK text with glow
  ctx.save();
  ctx.shadowColor = 'rgba(255, 255, 255, 0.125)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = COLORS.WHITE;
  ctx.font = `${FONTS.BRAND_LEFT.weight} ${FONTS.BRAND_LEFT.size}px ${FONTS.BRAND_LEFT.family}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('WOJAK.INK', currentX, centerY);
  const wojakEndX = currentX + wojakWidth;
  ctx.restore();

  // Right section positioning (from right edge)
  let rightX = CANVAS_WIDTH - paddingX;

  // Right emojis (2) - positioned from right to left
  rightX -= emojiSize / 2;
  drawOrangeEmoji(ctx, rightX, centerY, emojiSize);
  rightX -= emojiSize + emojiGap;
  drawOrangeEmoji(ctx, rightX, centerY, emojiSize);
  rightX -= emojiSize / 2 + emojiGap * 2;

  // TWO GROVE GAMING text with glow
  ctx.save();
  ctx.shadowColor = 'rgba(255, 107, 0, 0.375)';
  ctx.shadowBlur = 25;
  ctx.fillStyle = COLORS.PRIMARY_ORANGE;
  ctx.font = `${FONTS.BRAND_RIGHT.weight} ${FONTS.BRAND_RIGHT.size}px ${FONTS.BRAND_RIGHT.family}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText('TWO GROVE GAMING', rightX, centerY);
  const twoGroveStartX = rightX - twoGroveWidth;
  ctx.restore();

  // Fill the center gap with orange emojis
  // Calculate available space between WOJAK.INK and TWO GROVE GAMING
  const gapStartX = wojakEndX + emojiGap * 2;
  const gapEndX = twoGroveStartX - emojiGap * 2;
  const gapWidth = gapEndX - gapStartX;

  // Calculate how many emojis can fit in the gap
  const emojiSpacing = emojiSize + emojiGap;
  const numEmojis = Math.floor(gapWidth / emojiSpacing);

  // Center the emojis in the gap
  const totalEmojisWidth = numEmojis * emojiSize + (numEmojis - 1) * emojiGap;
  let emojiStartX = gapStartX + (gapWidth - totalEmojisWidth) / 2 + emojiSize / 2;

  for (let i = 0; i < numEmojis; i++) {
    drawOrangeEmoji(ctx, emojiStartX, centerY, emojiSize);
    emojiStartX += emojiSpacing;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Download the scorecard as a PNG file
 */
export async function downloadFlappyOrangeScorecard(
  data: FlappyScorecardData,
  filename?: string
): Promise<void> {
  const blob = await generateFlappyOrangeScorecard(data);
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `flappy-orange-score-${data.score}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Get the scorecard as a data URL for preview
 */
export async function getFlappyOrangeScorecardDataUrl(
  data: FlappyScorecardData
): Promise<string> {
  const blob = await generateFlappyOrangeScorecard(data);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
