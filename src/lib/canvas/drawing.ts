/**
 * Canvas Drawing Utilities
 * Common drawing functions for canvas games
 */

// ============================================
// SHAPES
// ============================================

/**
 * Draw rounded rectangle
 */
export const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number | { tl: number; tr: number; br: number; bl: number }
): void => {
  const r =
    typeof radius === 'number'
      ? { tl: radius, tr: radius, br: radius, bl: radius }
      : radius;

  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + width - r.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r.tr);
  ctx.lineTo(x + width, y + height - r.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r.br, y + height);
  ctx.lineTo(x + r.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.quadraticCurveTo(x, y, x + r.tl, y);
  ctx.closePath();
};

/**
 * Draw circle
 */
export const circle = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number
): void => {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.closePath();
};

/**
 * Draw ellipse
 */
export const ellipse = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  rotation: number = 0
): void => {
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, rotation, 0, Math.PI * 2);
  ctx.closePath();
};

/**
 * Draw polygon
 */
export const polygon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  sides: number,
  rotation: number = 0
): void => {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 + rotation;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;

    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
};

/**
 * Draw star
 */
export const star = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  outerRadius: number,
  innerRadius: number,
  points: number,
  rotation: number = -Math.PI / 2
): void => {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i / (points * 2)) * Math.PI * 2 + rotation;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;

    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
};

/**
 * Draw arrow
 */
export const arrow = (
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  headLength: number = 10,
  _headWidth: number = 8
): void => {
  const angle = Math.atan2(toY - fromY, toX - fromX);

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  // Arrow head
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLength * Math.cos(angle - Math.PI / 6),
    toY - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    toX - headLength * Math.cos(angle + Math.PI / 6),
    toY - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
};

// ============================================
// GRADIENTS
// ============================================

/**
 * Create linear gradient from colors array
 */
export const createLinearGradient = (
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  colors: string[]
): CanvasGradient => {
  const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  colors.forEach((color, i) => {
    gradient.addColorStop(i / (colors.length - 1), color);
  });
  return gradient;
};

/**
 * Create radial gradient from colors array
 */
export const createRadialGradient = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  innerRadius: number,
  outerRadius: number,
  colors: string[]
): CanvasGradient => {
  const gradient = ctx.createRadialGradient(x, y, innerRadius, x, y, outerRadius);
  colors.forEach((color, i) => {
    gradient.addColorStop(i / (colors.length - 1), color);
  });
  return gradient;
};

/**
 * Create vertical gradient
 */
export const createVerticalGradient = (
  ctx: CanvasRenderingContext2D,
  y1: number,
  y2: number,
  _width: number,
  colors: string[]
): CanvasGradient => {
  return createLinearGradient(ctx, 0, y1, 0, y2, colors);
};

/**
 * Create horizontal gradient
 */
export const createHorizontalGradient = (
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  _height: number,
  colors: string[]
): CanvasGradient => {
  return createLinearGradient(ctx, x1, 0, x2, 0, colors);
};

// ============================================
// SHADOWS & GLOW
// ============================================

/**
 * Draw with shadow
 */
export const withShadow = (
  ctx: CanvasRenderingContext2D,
  color: string,
  blur: number,
  offsetX: number,
  offsetY: number,
  drawFn: () => void
): void => {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = offsetX;
  ctx.shadowOffsetY = offsetY;
  drawFn();
  ctx.restore();
};

/**
 * Draw with glow effect
 */
export const withGlow = (
  ctx: CanvasRenderingContext2D,
  color: string,
  blur: number,
  drawFn: () => void
): void => {
  withShadow(ctx, color, blur, 0, 0, drawFn);
};

/**
 * Draw text with outline
 */
export const textWithOutline = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fillColor: string,
  strokeColor: string,
  strokeWidth: number = 2
): void => {
  ctx.save();
  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = fillColor;
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
  ctx.restore();
};

// ============================================
// TRANSFORMS
// ============================================

/**
 * Draw with rotation around center point
 */
export const withRotation = (
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  angle: number,
  drawFn: () => void
): void => {
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(angle);
  ctx.translate(-centerX, -centerY);
  drawFn();
  ctx.restore();
};

/**
 * Draw with scale from center point
 */
export const withScale = (
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  scaleX: number,
  scaleY: number,
  drawFn: () => void
): void => {
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(scaleX, scaleY);
  ctx.translate(-centerX, -centerY);
  drawFn();
  ctx.restore();
};

/**
 * Draw with alpha
 */
export const withAlpha = (
  ctx: CanvasRenderingContext2D,
  alpha: number,
  drawFn: () => void
): void => {
  ctx.save();
  ctx.globalAlpha = alpha;
  drawFn();
  ctx.restore();
};

/**
 * Draw with composite operation
 */
export const withComposite = (
  ctx: CanvasRenderingContext2D,
  operation: GlobalCompositeOperation,
  drawFn: () => void
): void => {
  ctx.save();
  ctx.globalCompositeOperation = operation;
  drawFn();
  ctx.restore();
};

// ============================================
// CANVAS SETUP
// ============================================

/**
 * Set up canvas for high DPI displays
 */
export const setupHiDPICanvas = (
  canvas: HTMLCanvasElement,
  width: number,
  height: number
): CanvasRenderingContext2D => {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  return ctx;
};

/**
 * Clear canvas
 */
export const clearCanvas = (
  ctx: CanvasRenderingContext2D,
  color?: string
): void => {
  const canvas = ctx.canvas;

  if (color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
};

/**
 * Save canvas as image
 */
export const canvasToImage = (
  canvas: HTMLCanvasElement,
  type: string = 'image/png',
  quality: number = 0.92
): string => {
  return canvas.toDataURL(type, quality);
};

/**
 * Download canvas as image
 */
export const downloadCanvas = (
  canvas: HTMLCanvasElement,
  filename: string = 'screenshot.png',
  type: string = 'image/png',
  quality: number = 0.92
): void => {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL(type, quality);
  link.click();
};
