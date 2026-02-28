/**
 * Generic Game Scorecard Generator
 *
 * Generates a 1200x630 share card following the same design specifications
 * as the Flappy Orange Scorecard, but parameterized for any game.
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
  ACCENT_HEIGHT: 7,
  SCREENSHOT_WIDTH: 620,
  SCREENSHOT_PADDING: 24,
  SCREENSHOT_RADIUS: 16,
  SCREENSHOT_BORDER: '#2A2A2A',
  SCREENSHOT_BG: '#0C0C0C',
  STATS_PADDING: { top: 40, right: 48, bottom: 40, left: 24 },
  STATS_GAP: 24,
  BRANDING_HEIGHT: 90,
  BRANDING_PADDING_X: 48,
  BRANDING_BORDER: '#1A1A1A',
};

// ============================================
// COLOR PALETTE
// ============================================
const COLORS = {
  PRIMARY_ORANGE: '#FF6B00',
  SECONDARY_ORANGE: '#FF8C00',
  GOLD: '#FFD700',
  WHITE: '#FFFFFF',
  GRAY_400: '#404040',
  GRAY_600: '#606060',
  DARK_BG: '#0C0C0C',
  CARD_BG: '#080808',
  BADGE_BG: '#161616',
  BADGE_BORDER: '#252525',
  RECORD_BG: '#1A1500',
  RECORD_BORDER: '#3D3000',
};

// ============================================
// SCORECARD DATA INTERFACE
// ============================================
export interface GameScorecardData {
  gameName: string;        // e.g., "MEMORY MATCH"
  gameNameParts?: [string, string]; // e.g., ["MEMORY", "MATCH"] for two-tone title
  score: number;
  scoreLabel: string;      // e.g., "points", "pipes", "blocks"
  bestScore: number;
  isNewRecord: boolean;
  screenshot: string | null;
  accentColor?: string;    // Override primary color
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

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

export async function generateGameScorecard(
  data: GameScorecardData
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d')!;

  const accentColor = data.accentColor || COLORS.PRIMARY_ORANGE;

  // 1. Draw background
  drawBackground(ctx);

  // 2. Draw top accent bar
  drawAccentBar(ctx, accentColor);

  // 3. Draw main content
  await drawMainContent(ctx, data, accentColor);

  // 4. Draw branding bar
  drawBrandingBar(ctx, accentColor);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to generate scorecard'));
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
  const centerX = CANVAS_WIDTH * 0.7;
  const centerY = CANVAS_HEIGHT * 0.3;
  const radius = Math.max(CANVAS_WIDTH, CANVAS_HEIGHT) * 1.05;

  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  gradient.addColorStop(0, '#1A1000');
  gradient.addColorStop(0.7, COLORS.DARK_BG);
  gradient.addColorStop(1, COLORS.CARD_BG);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

// ============================================
// TOP ACCENT BAR
// ============================================

function drawAccentBar(ctx: CanvasRenderingContext2D, accentColor: string): void {
  const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0);
  gradient.addColorStop(0, accentColor);
  gradient.addColorStop(1, COLORS.SECONDARY_ORANGE);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, LAYOUT.ACCENT_HEIGHT);
}

// ============================================
// MAIN CONTENT
// ============================================

async function drawMainContent(
  ctx: CanvasRenderingContext2D,
  data: GameScorecardData,
  accentColor: string
): Promise<void> {
  const contentTop = LAYOUT.ACCENT_HEIGHT;
  const contentHeight = CANVAS_HEIGHT - LAYOUT.ACCENT_HEIGHT - LAYOUT.BRANDING_HEIGHT;

  await drawScreenshotSection(ctx, data.screenshot, contentTop, contentHeight);
  drawStatsSection(ctx, data, contentTop, contentHeight, accentColor);
}

// ============================================
// SCREENSHOT SECTION
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

  ctx.fillStyle = LAYOUT.SCREENSHOT_BG;
  ctx.fillRect(x, y, width, height);

  const frameX = x + padding;
  const frameY = y + padding;
  const frameWidth = width - padding * 2;
  const frameHeight = height - padding * 2;

  if (screenshot) {
    try {
      const img = await loadImage(screenshot);
      const imgAspect = img.width / img.height;
      const frameAspect = frameWidth / frameHeight;
      let drawWidth: number, drawHeight: number, drawX: number, drawY: number;

      // "Contain" mode — fit entire image within frame, no clipping
      if (imgAspect > frameAspect) {
        // Image is wider than frame — fit by width, center vertically
        drawWidth = frameWidth;
        drawHeight = frameWidth / imgAspect;
        drawX = frameX;
        drawY = frameY + (frameHeight - drawHeight) / 2;
      } else {
        // Image is taller than frame — fit by height, center horizontally
        drawHeight = frameHeight;
        drawWidth = frameHeight * imgAspect;
        drawX = frameX + (frameWidth - drawWidth) / 2;
        drawY = frameY;
      }

      ctx.save();
      roundRect(ctx, frameX, frameY, frameWidth, frameHeight, radius);
      ctx.clip();
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      ctx.restore();

      ctx.strokeStyle = LAYOUT.SCREENSHOT_BORDER;
      ctx.lineWidth = 1;
      roundRect(ctx, frameX, frameY, frameWidth, frameHeight, radius);
      ctx.stroke();
    } catch {
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
  ctx.fillStyle = '#1A1A1A';
  roundRect(ctx, x, y, width, height, radius);
  ctx.fill();

  ctx.strokeStyle = LAYOUT.SCREENSHOT_BORDER;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = COLORS.GRAY_600;
  ctx.font = '24px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Game Screenshot', x + width / 2, y + height / 2);
}

// ============================================
// STATS SECTION
// ============================================

function drawStatsSection(
  ctx: CanvasRenderingContext2D,
  data: GameScorecardData,
  contentTop: number,
  _contentHeight: number,
  accentColor: string
): void {
  const x = LAYOUT.SCREENSHOT_WIDTH + LAYOUT.STATS_PADDING.left;
  const rightPadding = LAYOUT.STATS_PADDING.right;
  const availableWidth = CANVAS_WIDTH - x - rightPadding;
  let currentY = contentTop + LAYOUT.STATS_PADDING.top;

  // Title
  drawTitle(ctx, x, currentY, data, accentColor);
  currentY += 67 + LAYOUT.STATS_GAP;

  // Score
  currentY = drawScoreSection(ctx, x, currentY, data.score, data.scoreLabel, accentColor);
  currentY += LAYOUT.STATS_GAP;

  // Stats row
  currentY = drawStatsRow(ctx, x, currentY, availableWidth, data);
  currentY += LAYOUT.STATS_GAP;

  // CTA
  drawCTA(ctx, x, currentY, data.isNewRecord);
}

function drawTitle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  data: GameScorecardData,
  accentColor: string
): void {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  if (data.gameNameParts && data.gameNameParts.length === 2) {
    // Two-part title (e.g., "MEMORY" "MATCH")
    ctx.save();
    ctx.shadowColor = `${accentColor}80`;
    ctx.shadowBlur = 40;
    ctx.fillStyle = accentColor;
    ctx.font = '800 48px Sora, system-ui, sans-serif';
    ctx.fillText(data.gameNameParts[0], x, y);
    const firstWidth = ctx.measureText(data.gameNameParts[0]).width;
    ctx.restore();

    ctx.fillStyle = COLORS.WHITE;
    ctx.font = '800 48px Sora, system-ui, sans-serif';
    ctx.fillText(data.gameNameParts[1], x + firstWidth + 16, y);
  } else {
    // Single title
    ctx.save();
    ctx.shadowColor = `${accentColor}80`;
    ctx.shadowBlur = 40;
    ctx.fillStyle = accentColor;
    ctx.font = '800 48px Sora, system-ui, sans-serif';
    ctx.fillText(data.gameName.toUpperCase(), x, y);
    ctx.restore();
  }
}

function drawScoreSection(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  score: number,
  scoreLabel: string,
  accentColor: string
): number {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  ctx.save();
  ctx.shadowColor = `${accentColor}4D`;
  ctx.shadowBlur = 60;
  ctx.fillStyle = accentColor;
  ctx.font = '700 120px Sora, system-ui, sans-serif';

  const scoreText = score.toLocaleString();
  const baselineY = y + 102;
  ctx.fillText(scoreText, x, baselineY);
  const scoreWidth = ctx.measureText(scoreText).width;
  ctx.restore();

  ctx.fillStyle = COLORS.GRAY_400;
  ctx.font = '500 28px Inter, system-ui, sans-serif';
  ctx.fillText(scoreLabel, x + scoreWidth + 16, baselineY);

  return y + 120;
}

function drawStatsRow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  availableWidth: number,
  data: GameScorecardData
): number {
  const badgeHeight = 52;
  const badgeGap = 16;
  const badgeRadius = 16;

  const badgeCount = data.isNewRecord ? 2 : 1;
  const badgeWidth = (availableWidth - badgeGap * (badgeCount - 1)) / badgeCount;

  // Best Score badge
  drawBadge(ctx, x, y, data.isNewRecord ? badgeWidth : availableWidth, badgeHeight, badgeRadius,
    `🍊  Best: ${data.bestScore.toLocaleString()}`, COLORS.WHITE, COLORS.BADGE_BG, COLORS.BADGE_BORDER);

  // New Record badge
  if (data.isNewRecord) {
    drawBadge(ctx, x + badgeWidth + badgeGap, y, badgeWidth, badgeHeight, badgeRadius,
      '🏆  NEW RECORD!', COLORS.GOLD, COLORS.RECORD_BG, COLORS.RECORD_BORDER);
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
  borderColor: string
): void {
  ctx.fillStyle = bgColor;
  roundRect(ctx, x, y, width, height, radius);
  ctx.fill();

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.font = '700 20px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + width / 2, y + height / 2);
}

function drawCTA(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  isNewRecord: boolean
): void {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = COLORS.WHITE;
  ctx.font = 'italic 600 36px Inter, system-ui, sans-serif';
  ctx.fillText(isNewRecord ? 'Can you beat my record? 🔥' : 'Can you beat my score? 🔥', x, y);
}

// ============================================
// BRANDING BAR
// ============================================

function drawBrandingBar(ctx: CanvasRenderingContext2D, accentColor: string): void {
  const y = CANVAS_HEIGHT - LAYOUT.BRANDING_HEIGHT;
  const height = LAYOUT.BRANDING_HEIGHT;
  const paddingX = LAYOUT.BRANDING_PADDING_X;

  const gradient = ctx.createLinearGradient(0, y, CANVAS_WIDTH, y);
  gradient.addColorStop(0, '#0A0A0A');
  gradient.addColorStop(1, '#111111');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, y, CANVAS_WIDTH, height);

  ctx.fillStyle = LAYOUT.BRANDING_BORDER;
  ctx.fillRect(0, y, CANVAS_WIDTH, 1);

  const centerY = y + height / 2;
  const emojiSize = 28;
  const emojiGap = 8;

  // Left: emojis + WOJAK.INK
  let currentX = paddingX;
  ctx.font = `${emojiSize}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🍊', currentX + emojiSize / 2, centerY);
  currentX += emojiSize + emojiGap;
  ctx.fillText('🍊', currentX + emojiSize / 2, centerY);
  currentX += emojiSize + emojiGap * 2;

  ctx.save();
  ctx.shadowColor = 'rgba(255, 255, 255, 0.125)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = COLORS.WHITE;
  ctx.font = '800 32px Sora, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('WOJAK.INK', currentX, centerY);
  ctx.restore();

  // Right: TWO GROVE GAMING + emojis
  let rightX = CANVAS_WIDTH - paddingX;
  ctx.font = `${emojiSize}px system-ui`;
  ctx.textAlign = 'center';
  rightX -= emojiSize / 2;
  ctx.fillText('🍊', rightX, centerY);
  rightX -= emojiSize + emojiGap;
  ctx.fillText('🍊', rightX, centerY);
  rightX -= emojiSize / 2 + emojiGap * 2;

  ctx.save();
  ctx.shadowColor = `${accentColor}60`;
  ctx.shadowBlur = 25;
  ctx.fillStyle = accentColor;
  ctx.font = '800 24px Sora, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('TWO GROVE GAMING', rightX, centerY);
  const tggWidth = ctx.measureText('TWO GROVE GAMING').width;
  ctx.restore();

  // Fill gap between WOJAK.INK and TWO GROVE GAMING with orange emojis
  ctx.font = '800 32px Sora, system-ui, sans-serif';
  const wojakInkWidth = ctx.measureText('WOJAK.INK').width;
  const leftEnd = currentX + wojakInkWidth + 20; // after "WOJAK.INK" + gap
  const rightStart = rightX - tggWidth - 20; // before "TWO GROVE GAMING" - gap
  const gapWidth = rightStart - leftEnd;

  if (gapWidth > emojiSize) {
    ctx.font = `${emojiSize}px system-ui`;
    ctx.textAlign = 'center';
    const orangeSpacing = emojiSize + emojiGap;
    const orangeCount = Math.floor(gapWidth / orangeSpacing);
    const totalOrangesWidth = orangeCount * orangeSpacing - emojiGap;
    const startX = leftEnd + (gapWidth - totalOrangesWidth) / 2;
    for (let i = 0; i < orangeCount; i++) {
      ctx.fillText('🍊', startX + i * orangeSpacing + emojiSize / 2, centerY);
    }
  }
}

// ============================================
// UTILITY EXPORTS
// ============================================

export async function downloadGameScorecard(
  data: GameScorecardData,
  filename?: string
): Promise<void> {
  const blob = await generateGameScorecard(data);
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${data.gameName.toLowerCase().replace(/\s+/g, '-')}-score-${data.score}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export async function getGameScorecardDataUrl(data: GameScorecardData): Promise<string> {
  const blob = await generateGameScorecard(data);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
