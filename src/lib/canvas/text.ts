/**
 * Text Rendering Utilities
 * Score displays, floating text, and typography helpers
 */

// ============================================
// TYPES
// ============================================

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  startY: number;
  color: string;
  fontSize: number;
  alpha: number;
  scale: number;
  age: number;
  maxAge: number;
  velocityY: number;
  gravity: number;
}

export interface ScoreDisplayConfig {
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  color: string;
  shadowColor: string;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowBlur: number;
  glowColor?: string;
  glowBlur?: number;
}

// ============================================
// FLOATING TEXT SYSTEM
// ============================================

/**
 * Create floating text
 */
export const createFloatingText = (
  text: string,
  x: number,
  y: number,
  options?: {
    color?: string;
    fontSize?: number;
    maxAge?: number;
    velocityY?: number;
    gravity?: number;
  }
): FloatingText => ({
  id: `ft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  text,
  x: x + (Math.random() - 0.5) * 20,
  y,
  startY: y,
  color: options?.color ?? '#FFD700',
  fontSize: options?.fontSize ?? 24,
  alpha: 1,
  scale: 1,
  age: 0,
  maxAge: options?.maxAge ?? 800,
  velocityY: options?.velocityY ?? -2,
  gravity: options?.gravity ?? 0.05,
});

/**
 * Update floating text
 */
export const updateFloatingText = (
  text: FloatingText,
  deltaTime: number
): boolean => {
  text.age += deltaTime;

  if (text.age >= text.maxAge) {
    return false; // Should be removed
  }

  const progress = text.age / text.maxAge;

  // Movement with gravity
  text.velocityY += text.gravity;
  text.y += text.velocityY * (deltaTime / 16);

  // Scale pop effect (grow then shrink)
  if (progress < 0.1) {
    text.scale = 1 + progress * 3; // Pop in
  } else {
    text.scale = 1.3 - (progress - 0.1) * 0.5; // Shrink
  }

  // Fade out
  text.alpha = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;

  return true;
};

/**
 * Draw floating text
 */
export const drawFloatingText = (
  ctx: CanvasRenderingContext2D,
  text: FloatingText
): void => {
  ctx.save();
  ctx.globalAlpha = text.alpha;
  ctx.font = `bold ${text.fontSize * text.scale}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Glow
  ctx.shadowColor = text.color;
  ctx.shadowBlur = 8;

  // Shadow
  ctx.fillStyle = 'var(--color-black-50)';
  ctx.fillText(text.text, text.x + 2, text.y + 2);

  // Main text
  ctx.fillStyle = text.color;
  ctx.fillText(text.text, text.x, text.y);

  ctx.restore();
};

// ============================================
// SCORE DISPLAY
// ============================================

export const DEFAULT_SCORE_CONFIG: ScoreDisplayConfig = {
  fontSize: 56,
  fontFamily: 'Arial, sans-serif',
  fontWeight: 'bold',
  color: '#FFFFFF',
  shadowColor: 'rgba(0, 0, 0, 0.4)',
  shadowOffsetX: 3,
  shadowOffsetY: 3,
  shadowBlur: 4,
};

/**
 * Draw score with shadow
 */
export const drawScore = (
  ctx: CanvasRenderingContext2D,
  score: number,
  x: number,
  y: number,
  config: Partial<ScoreDisplayConfig> = {}
): void => {
  const cfg = { ...DEFAULT_SCORE_CONFIG, ...config };
  const scoreText = score.toString();

  ctx.save();
  ctx.font = `${cfg.fontWeight} ${cfg.fontSize}px ${cfg.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Glow (optional)
  if (cfg.glowColor && cfg.glowBlur) {
    ctx.shadowColor = cfg.glowColor;
    ctx.shadowBlur = cfg.glowBlur;
  }

  // Shadow
  ctx.fillStyle = cfg.shadowColor;
  ctx.fillText(scoreText, x + cfg.shadowOffsetX, y + cfg.shadowOffsetY);

  // Main text
  ctx.shadowBlur = 0;
  ctx.fillStyle = cfg.color;
  ctx.fillText(scoreText, x, y);

  ctx.restore();
};

/**
 * Draw score with milestone effect (glow + scale)
 */
export const drawMilestoneScore = (
  ctx: CanvasRenderingContext2D,
  score: number,
  x: number,
  y: number,
  animProgress: number = 1, // 0-1 for animation
  config: Partial<ScoreDisplayConfig> = {}
): void => {
  const cfg = {
    ...DEFAULT_SCORE_CONFIG,
    glowColor: '#FFD700',
    glowBlur: 20,
    ...config,
  };

  // Scale animation
  const scale = 1 + Math.sin(animProgress * Math.PI) * 0.2;
  const scaledSize = cfg.fontSize * scale;

  drawScore(ctx, score, x, y, { ...cfg, fontSize: scaledSize });
};

// ============================================
// COMBO/STREAK DISPLAY
// ============================================

export interface ComboDisplayConfig {
  fontSize: number;
  fontFamily: string;
  colors: string[]; // Different colors for combo levels
  pulseSpeed: number;
}

export const DEFAULT_COMBO_CONFIG: ComboDisplayConfig = {
  fontSize: 32,
  fontFamily: 'Arial, sans-serif',
  colors: ['#FFD700', '#FF6B00', '#FF4500', '#FF0000'],
  pulseSpeed: 0.01,
};

/**
 * Draw combo counter with intensity based on count
 */
export const drawCombo = (
  ctx: CanvasRenderingContext2D,
  combo: number,
  x: number,
  y: number,
  time: number,
  config: Partial<ComboDisplayConfig> = {}
): void => {
  if (combo < 2) return;

  const cfg = { ...DEFAULT_COMBO_CONFIG, ...config };

  // Color based on combo level
  const colorIndex = Math.min(
    Math.floor((combo - 2) / 3),
    cfg.colors.length - 1
  );
  const color = cfg.colors[colorIndex];

  // Pulse effect
  const pulse = 1 + Math.sin(time * cfg.pulseSpeed * Math.PI * 2) * 0.1;
  const fontSize = cfg.fontSize * pulse;

  ctx.save();
  ctx.font = `bold ${fontSize}px ${cfg.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;

  // Text
  ctx.fillStyle = color;
  ctx.fillText(`${combo}x`, x, y);

  // Fire emoji for high combos
  if (combo >= 5) {
    ctx.font = `${fontSize * 0.8}px sans-serif`;
    ctx.fillText('🔥', x + 50, y);
  }

  ctx.restore();
};

// ============================================
// TEXT EFFECTS
// ============================================

/**
 * Draw text with typewriter effect
 */
export const drawTypewriterText = (
  ctx: CanvasRenderingContext2D,
  fullText: string,
  x: number,
  y: number,
  progress: number, // 0-1
  options?: {
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    cursorBlink?: boolean;
  }
): void => {
  const opts = {
    fontSize: 24,
    fontFamily: 'monospace',
    color: '#FFFFFF',
    cursorBlink: true,
    ...options,
  };

  const charCount = Math.floor(fullText.length * progress);
  const displayText = fullText.substring(0, charCount);

  ctx.save();
  ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
  ctx.fillStyle = opts.color;
  ctx.fillText(displayText, x, y);

  // Cursor
  if (opts.cursorBlink && progress < 1) {
    const cursorVisible = Math.floor(Date.now() / 500) % 2 === 0;
    if (cursorVisible) {
      const textWidth = ctx.measureText(displayText).width;
      ctx.fillRect(x + textWidth + 2, y - opts.fontSize * 0.8, 2, opts.fontSize);
    }
  }

  ctx.restore();
};

/**
 * Draw text with wave effect
 */
export const drawWaveText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  time: number,
  options?: {
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    amplitude?: number;
    frequency?: number;
  }
): void => {
  const opts = {
    fontSize: 32,
    fontFamily: 'sans-serif',
    color: '#FFFFFF',
    amplitude: 5,
    frequency: 0.3,
    ...options,
  };

  ctx.save();
  ctx.font = `bold ${opts.fontSize}px ${opts.fontFamily}`;
  ctx.fillStyle = opts.color;
  ctx.textBaseline = 'middle';

  let currentX = x;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const yOffset =
      Math.sin((time * opts.frequency + i * 0.5) * Math.PI * 2) * opts.amplitude;

    ctx.fillText(char, currentX, y + yOffset);
    currentX += ctx.measureText(char).width;
  }

  ctx.restore();
};

/**
 * Draw text with rainbow effect
 */
export const drawRainbowText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  time: number,
  options?: {
    fontSize?: number;
    fontFamily?: string;
    speed?: number;
  }
): void => {
  const opts = {
    fontSize: 32,
    fontFamily: 'sans-serif',
    speed: 0.001,
    ...options,
  };

  ctx.save();
  ctx.font = `bold ${opts.fontSize}px ${opts.fontFamily}`;
  ctx.textBaseline = 'middle';

  let currentX = x;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const hue = ((time * opts.speed + i * 30) % 360);
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;

    ctx.fillText(char, currentX, y);
    currentX += ctx.measureText(char).width;
  }

  ctx.restore();
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get text width
 */
export const getTextWidth = (
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string
): number => {
  ctx.save();
  ctx.font = font;
  const width = ctx.measureText(text).width;
  ctx.restore();
  return width;
};

/**
 * Wrap text to fit width
 */
export const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  font: string
): string[] => {
  ctx.save();
  ctx.font = font;

  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = ctx.measureText(testLine).width;

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  ctx.restore();
  return lines;
};
