import { describe, it, expect, vi } from 'vitest';
import {
  roundRect,
  circle,
  ellipse,
  polygon,
  star,
  arrow,
  withShadow,
  withGlow,
  textWithOutline,
  withRotation,
  withScale,
  withAlpha,
  withComposite,
  clearCanvas,
  canvasToImage,
} from './drawing';

// ============================================
// CANVAS MOCK
// ============================================

const createMockCtx = () => {
  const calls: string[] = [];
  const ctx = {
    beginPath: vi.fn(() => calls.push('beginPath')),
    closePath: vi.fn(() => calls.push('closePath')),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    strokeText: vi.fn(),
    fillText: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
    canvas: {
      width: 800,
      height: 600,
    },
    _calls: calls,
  };
  return ctx as unknown as CanvasRenderingContext2D & { _calls: string[] };
};

// ============================================
// SHAPES
// ============================================

describe('roundRect', () => {
  it('calls beginPath and closePath', () => {
    const ctx = createMockCtx();
    roundRect(ctx, 0, 0, 100, 50, 10);
    expect(ctx.beginPath).toHaveBeenCalledTimes(1);
    expect(ctx.closePath).toHaveBeenCalledTimes(1);
  });

  it('accepts numeric radius', () => {
    const ctx = createMockCtx();
    expect(() => roundRect(ctx, 0, 0, 100, 50, 5)).not.toThrow();
  });

  it('accepts object radius with individual corners', () => {
    const ctx = createMockCtx();
    expect(() =>
      roundRect(ctx, 0, 0, 100, 50, { tl: 5, tr: 10, br: 15, bl: 20 })
    ).not.toThrow();
  });

  it('calls moveTo to start path', () => {
    const ctx = createMockCtx();
    roundRect(ctx, 0, 0, 100, 50, 10);
    expect(ctx.moveTo).toHaveBeenCalled();
  });

  it('calls quadraticCurveTo for each corner', () => {
    const ctx = createMockCtx();
    roundRect(ctx, 0, 0, 100, 50, 10);
    expect(ctx.quadraticCurveTo).toHaveBeenCalledTimes(4);
  });
});

describe('circle', () => {
  it('calls beginPath and closePath', () => {
    const ctx = createMockCtx();
    circle(ctx, 50, 50, 25);
    expect(ctx.beginPath).toHaveBeenCalledTimes(1);
    expect(ctx.closePath).toHaveBeenCalledTimes(1);
  });

  it('calls arc with full circle (0 to 2PI)', () => {
    const ctx = createMockCtx();
    circle(ctx, 50, 50, 25);
    expect(ctx.arc).toHaveBeenCalledWith(50, 50, 25, 0, Math.PI * 2);
  });

  it('handles zero radius', () => {
    const ctx = createMockCtx();
    expect(() => circle(ctx, 0, 0, 0)).not.toThrow();
  });
});

describe('ellipse', () => {
  it('calls beginPath and closePath', () => {
    const ctx = createMockCtx();
    ellipse(ctx, 50, 50, 30, 20);
    expect(ctx.beginPath).toHaveBeenCalledTimes(1);
    expect(ctx.closePath).toHaveBeenCalledTimes(1);
  });

  it('calls ellipse on ctx with correct params', () => {
    const ctx = createMockCtx();
    ellipse(ctx, 50, 50, 30, 20);
    expect(ctx.ellipse).toHaveBeenCalledWith(50, 50, 30, 20, 0, 0, Math.PI * 2);
  });

  it('passes rotation when provided', () => {
    const ctx = createMockCtx();
    ellipse(ctx, 50, 50, 30, 20, Math.PI / 4);
    expect(ctx.ellipse).toHaveBeenCalledWith(50, 50, 30, 20, Math.PI / 4, 0, Math.PI * 2);
  });
});

describe('polygon', () => {
  it('calls beginPath and closePath', () => {
    const ctx = createMockCtx();
    polygon(ctx, 50, 50, 30, 6);
    expect(ctx.beginPath).toHaveBeenCalledTimes(1);
    expect(ctx.closePath).toHaveBeenCalledTimes(1);
  });

  it('calls moveTo once for the first vertex', () => {
    const ctx = createMockCtx();
    polygon(ctx, 50, 50, 30, 5);
    expect(ctx.moveTo).toHaveBeenCalledTimes(1);
  });

  it('calls lineTo for remaining vertices', () => {
    const ctx = createMockCtx();
    const sides = 6;
    polygon(ctx, 50, 50, 30, sides);
    expect(ctx.lineTo).toHaveBeenCalledTimes(sides - 1);
  });

  it('accepts rotation parameter', () => {
    const ctx = createMockCtx();
    expect(() => polygon(ctx, 50, 50, 30, 4, Math.PI / 4)).not.toThrow();
  });
});

describe('star', () => {
  it('calls beginPath and closePath', () => {
    const ctx = createMockCtx();
    star(ctx, 50, 50, 30, 15, 5);
    expect(ctx.beginPath).toHaveBeenCalledTimes(1);
    expect(ctx.closePath).toHaveBeenCalledTimes(1);
  });

  it('calls moveTo once for the first point', () => {
    const ctx = createMockCtx();
    star(ctx, 50, 50, 30, 15, 5);
    expect(ctx.moveTo).toHaveBeenCalledTimes(1);
  });

  it('creates correct number of points (2 * points - 1 lineTo calls)', () => {
    const ctx = createMockCtx();
    const points = 5;
    star(ctx, 50, 50, 30, 15, points);
    // points * 2 total vertices, first uses moveTo, rest uses lineTo
    expect(ctx.lineTo).toHaveBeenCalledTimes(points * 2 - 1);
  });
});

describe('arrow', () => {
  it('calls stroke for the line', () => {
    const ctx = createMockCtx();
    arrow(ctx, 0, 0, 100, 100);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('calls fill for the arrowhead', () => {
    const ctx = createMockCtx();
    arrow(ctx, 0, 0, 100, 100);
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('uses custom head length', () => {
    const ctx = createMockCtx();
    expect(() => arrow(ctx, 0, 0, 100, 0, 20, 12)).not.toThrow();
  });
});

// ============================================
// SHADOWS & GLOW
// ============================================

describe('withShadow', () => {
  it('calls save and restore', () => {
    const ctx = createMockCtx();
    const drawFn = vi.fn();
    withShadow(ctx, 'black', 10, 2, 2, drawFn);
    expect(ctx.save).toHaveBeenCalledTimes(1);
    expect(ctx.restore).toHaveBeenCalledTimes(1);
  });

  it('sets shadow properties before calling drawFn', () => {
    const ctx = createMockCtx();
    let colorWhenCalled = '';
    withShadow(ctx, 'red', 15, 3, 3, () => {
      colorWhenCalled = (ctx as unknown as { shadowColor: string }).shadowColor;
    });
    expect(colorWhenCalled).toBe('red');
  });

  it('calls drawFn exactly once', () => {
    const ctx = createMockCtx();
    const drawFn = vi.fn();
    withShadow(ctx, 'blue', 5, 0, 0, drawFn);
    expect(drawFn).toHaveBeenCalledTimes(1);
  });
});

describe('withGlow', () => {
  it('calls save and restore', () => {
    const ctx = createMockCtx();
    const drawFn = vi.fn();
    withGlow(ctx, 'orange', 20, drawFn);
    expect(ctx.save).toHaveBeenCalledTimes(1);
    expect(ctx.restore).toHaveBeenCalledTimes(1);
  });

  it('calls drawFn exactly once', () => {
    const ctx = createMockCtx();
    const drawFn = vi.fn();
    withGlow(ctx, 'cyan', 10, drawFn);
    expect(drawFn).toHaveBeenCalledTimes(1);
  });
});

describe('textWithOutline', () => {
  it('calls save and restore', () => {
    const ctx = createMockCtx();
    textWithOutline(ctx, 'Hello', 10, 20, 'white', 'black');
    expect(ctx.save).toHaveBeenCalledTimes(1);
    expect(ctx.restore).toHaveBeenCalledTimes(1);
  });

  it('calls strokeText before fillText', () => {
    const ctx = createMockCtx();
    const order: string[] = [];
    (ctx as unknown as { strokeText: ReturnType<typeof vi.fn> }).strokeText = vi.fn(() => order.push('stroke'));
    (ctx as unknown as { fillText: ReturnType<typeof vi.fn> }).fillText = vi.fn(() => order.push('fill'));
    textWithOutline(ctx, 'Hi', 0, 0, 'white', 'black');
    expect(order).toEqual(['stroke', 'fill']);
  });
});

// ============================================
// TRANSFORMS
// ============================================

describe('withRotation', () => {
  it('calls save and restore', () => {
    const ctx = createMockCtx();
    withRotation(ctx, 50, 50, Math.PI / 4, vi.fn());
    expect(ctx.save).toHaveBeenCalledTimes(1);
    expect(ctx.restore).toHaveBeenCalledTimes(1);
  });

  it('translates to center, rotates, translates back', () => {
    const ctx = createMockCtx();
    withRotation(ctx, 100, 200, Math.PI, vi.fn());
    expect(ctx.translate).toHaveBeenNthCalledWith(1, 100, 200);
    expect(ctx.rotate).toHaveBeenCalledWith(Math.PI);
    expect(ctx.translate).toHaveBeenNthCalledWith(2, -100, -200);
  });

  it('calls drawFn exactly once', () => {
    const ctx = createMockCtx();
    const drawFn = vi.fn();
    withRotation(ctx, 0, 0, 0, drawFn);
    expect(drawFn).toHaveBeenCalledTimes(1);
  });
});

describe('withScale', () => {
  it('calls save and restore', () => {
    const ctx = createMockCtx();
    withScale(ctx, 50, 50, 2, 2, vi.fn());
    expect(ctx.save).toHaveBeenCalledTimes(1);
    expect(ctx.restore).toHaveBeenCalledTimes(1);
  });

  it('translates to center, scales, translates back', () => {
    const ctx = createMockCtx();
    withScale(ctx, 100, 200, 2, 3, vi.fn());
    expect(ctx.translate).toHaveBeenNthCalledWith(1, 100, 200);
    expect(ctx.scale).toHaveBeenCalledWith(2, 3);
    expect(ctx.translate).toHaveBeenNthCalledWith(2, -100, -200);
  });

  it('calls drawFn exactly once', () => {
    const ctx = createMockCtx();
    const drawFn = vi.fn();
    withScale(ctx, 0, 0, 1, 1, drawFn);
    expect(drawFn).toHaveBeenCalledTimes(1);
  });
});

describe('withAlpha', () => {
  it('calls save and restore', () => {
    const ctx = createMockCtx();
    withAlpha(ctx, 0.5, vi.fn());
    expect(ctx.save).toHaveBeenCalledTimes(1);
    expect(ctx.restore).toHaveBeenCalledTimes(1);
  });

  it('sets globalAlpha before drawFn', () => {
    const ctx = createMockCtx();
    let alphaWhenCalled = -1;
    withAlpha(ctx, 0.3, () => {
      alphaWhenCalled = (ctx as unknown as { globalAlpha: number }).globalAlpha;
    });
    expect(alphaWhenCalled).toBe(0.3);
  });
});

describe('withComposite', () => {
  it('calls save and restore', () => {
    const ctx = createMockCtx();
    withComposite(ctx, 'lighter', vi.fn());
    expect(ctx.save).toHaveBeenCalledTimes(1);
    expect(ctx.restore).toHaveBeenCalledTimes(1);
  });

  it('sets composite operation before drawFn', () => {
    const ctx = createMockCtx();
    let opWhenCalled = '';
    withComposite(ctx, 'multiply', () => {
      opWhenCalled = (ctx as unknown as { globalCompositeOperation: string }).globalCompositeOperation;
    });
    expect(opWhenCalled).toBe('multiply');
  });
});

// ============================================
// CANVAS SETUP
// ============================================

describe('clearCanvas', () => {
  it('calls clearRect when no color is given', () => {
    const ctx = createMockCtx();
    clearCanvas(ctx);
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it('calls fillRect when color is given', () => {
    const ctx = createMockCtx();
    clearCanvas(ctx, '#000000');
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
    expect(ctx.clearRect).not.toHaveBeenCalled();
  });

  it('sets fillStyle before fillRect', () => {
    const ctx = createMockCtx();
    let styleWhenFilled = '';
    (ctx as unknown as { fillRect: ReturnType<typeof vi.fn> }).fillRect = vi.fn(() => {
      styleWhenFilled = (ctx as unknown as { fillStyle: string }).fillStyle;
    });
    clearCanvas(ctx, 'red');
    expect(styleWhenFilled).toBe('red');
  });
});

describe('canvasToImage', () => {
  it('calls toDataURL with default mime type', () => {
    const mockCanvas = {
      toDataURL: vi.fn(() => 'data:image/png;base64,abc'),
    } as unknown as HTMLCanvasElement;
    const result = canvasToImage(mockCanvas);
    expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png', 0.92);
    expect(result).toBe('data:image/png;base64,abc');
  });

  it('passes custom mime type and quality', () => {
    const mockCanvas = {
      toDataURL: vi.fn(() => 'data:image/jpeg;base64,xyz'),
    } as unknown as HTMLCanvasElement;
    canvasToImage(mockCanvas, 'image/jpeg', 0.8);
    expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.8);
  });
});
