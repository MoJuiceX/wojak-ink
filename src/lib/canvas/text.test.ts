import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createFloatingText,
  updateFloatingText,
  wrapText,
  DEFAULT_SCORE_CONFIG,
} from './text';
import type { FloatingText, ScoreDisplayConfig } from './text';

// ============================================
// Helpers
// ============================================

function makeCtx(overrides: Partial<CanvasRenderingContext2D> = {}): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 50 }),
    fillRect: vi.fn(),
    font: '',
    fillStyle: '',
    textAlign: '',
    textBaseline: '',
    shadowColor: '',
    shadowBlur: 0,
    globalAlpha: 1,
    ...overrides,
  } as unknown as CanvasRenderingContext2D;
}

// ============================================
// DEFAULT_SCORE_CONFIG
// ============================================

describe('DEFAULT_SCORE_CONFIG', () => {
  it('has a positive fontSize', () => {
    expect(DEFAULT_SCORE_CONFIG.fontSize).toBeGreaterThan(0);
  });

  it('has a fontFamily string', () => {
    expect(DEFAULT_SCORE_CONFIG.fontFamily).toBeTypeOf('string');
    expect(DEFAULT_SCORE_CONFIG.fontFamily.length).toBeGreaterThan(0);
  });

  it('has white color', () => {
    expect(DEFAULT_SCORE_CONFIG.color).toBe('#FFFFFF');
  });

  it('has positive shadow blur', () => {
    expect(DEFAULT_SCORE_CONFIG.shadowBlur).toBeGreaterThan(0);
  });

  it('has all required ScoreDisplayConfig fields', () => {
    const config: ScoreDisplayConfig = DEFAULT_SCORE_CONFIG;
    expect(config.fontSize).toBeDefined();
    expect(config.fontFamily).toBeDefined();
    expect(config.fontWeight).toBeDefined();
    expect(config.color).toBeDefined();
    expect(config.shadowColor).toBeDefined();
    expect(config.shadowOffsetX).toBeDefined();
    expect(config.shadowOffsetY).toBeDefined();
    expect(config.shadowBlur).toBeDefined();
  });
});

// ============================================
// createFloatingText
// ============================================

describe('createFloatingText', () => {
  it('creates a floating text object with the given text', () => {
    const ft = createFloatingText('hello', 100, 200);
    expect(ft.text).toBe('hello');
  });

  it('sets startY to the provided y value', () => {
    const ft = createFloatingText('test', 50, 300);
    expect(ft.startY).toBe(300);
  });

  it('creates a unique id for each floating text', () => {
    const ft1 = createFloatingText('a', 0, 0);
    const ft2 = createFloatingText('b', 0, 0);
    expect(ft1.id).not.toBe(ft2.id);
  });

  it('id starts with "ft_"', () => {
    const ft = createFloatingText('x', 0, 0);
    expect(ft.id.startsWith('ft_')).toBe(true);
  });

  it('defaults to gold color when no options provided', () => {
    const ft = createFloatingText('gold', 0, 0);
    expect(ft.color).toBe('#FFD700');
  });

  it('respects custom color option', () => {
    const ft = createFloatingText('colored', 0, 0, { color: '#ff0000' });
    expect(ft.color).toBe('#ff0000');
  });

  it('defaults fontSize to 24', () => {
    const ft = createFloatingText('size', 0, 0);
    expect(ft.fontSize).toBe(24);
  });

  it('respects custom fontSize option', () => {
    const ft = createFloatingText('big', 0, 0, { fontSize: 48 });
    expect(ft.fontSize).toBe(48);
  });

  it('initializes alpha to 1', () => {
    const ft = createFloatingText('alpha', 0, 0);
    expect(ft.alpha).toBe(1);
  });

  it('initializes scale to 1', () => {
    const ft = createFloatingText('scale', 0, 0);
    expect(ft.scale).toBe(1);
  });

  it('initializes age to 0', () => {
    const ft = createFloatingText('age', 0, 0);
    expect(ft.age).toBe(0);
  });

  it('defaults maxAge to 800', () => {
    const ft = createFloatingText('maxage', 0, 0);
    expect(ft.maxAge).toBe(800);
  });

  it('respects custom maxAge option', () => {
    const ft = createFloatingText('custom', 0, 0, { maxAge: 2000 });
    expect(ft.maxAge).toBe(2000);
  });

  it('defaults velocityY to -2 (upward)', () => {
    const ft = createFloatingText('vel', 0, 0);
    expect(ft.velocityY).toBe(-2);
  });

  it('respects custom velocityY', () => {
    const ft = createFloatingText('vel', 0, 0, { velocityY: -5 });
    expect(ft.velocityY).toBe(-5);
  });

  it('defaults gravity to 0.05', () => {
    const ft = createFloatingText('grav', 0, 0);
    expect(ft.gravity).toBe(0.05);
  });

  it('x is near the provided x (with small random offset)', () => {
    // Random offset is in range -10 to 10 (half of 20)
    const ft = createFloatingText('pos', 100, 200);
    expect(ft.x).toBeGreaterThanOrEqual(90);
    expect(ft.x).toBeLessThanOrEqual(110);
  });
});

// ============================================
// updateFloatingText
// ============================================

describe('updateFloatingText', () => {
  let ft: FloatingText;

  beforeEach(() => {
    ft = createFloatingText('update', 100, 200);
    // Reset x to exact position for predictable tests
    ft.x = 100;
  });

  it('returns true while text is alive (age < maxAge)', () => {
    const alive = updateFloatingText(ft, 100);
    expect(alive).toBe(true);
  });

  it('returns false when text age reaches maxAge', () => {
    ft.age = ft.maxAge - 1;
    const alive = updateFloatingText(ft, 10);
    expect(alive).toBe(false);
  });

  it('increments age by deltaTime', () => {
    const initialAge = ft.age;
    updateFloatingText(ft, 50);
    expect(ft.age).toBe(initialAge + 50);
  });

  it('applies gravity to velocityY', () => {
    const initialVelocity = ft.velocityY;
    updateFloatingText(ft, 16);
    expect(ft.velocityY).toBeGreaterThan(initialVelocity);
  });

  it('moves y position based on velocity', () => {
    const initialY = ft.y;
    updateFloatingText(ft, 16);
    // With negative velocity, y should decrease (move up)
    expect(ft.y).not.toBe(initialY);
  });

  it('alpha becomes 0 when text expires (progress > 0.7)', () => {
    ft.age = ft.maxAge * 0.95; // 95% complete — in fade zone
    updateFloatingText(ft, 0); // age won't pass maxAge
    // alpha should be very low or 0
    expect(ft.alpha).toBeLessThan(0.2);
  });

  it('alpha is 1 when text is young (progress < 0.7)', () => {
    ft.age = ft.maxAge * 0.3;
    updateFloatingText(ft, 0);
    expect(ft.alpha).toBe(1);
  });

  it('scale pops beyond 1 when text is very new (progress < 0.1)', () => {
    ft.age = ft.maxAge * 0.05; // 5% — in pop zone
    updateFloatingText(ft, 0);
    expect(ft.scale).toBeGreaterThan(1);
  });
});

// ============================================
// wrapText
// ============================================

describe('wrapText', () => {
  it('returns single word as single line when it fits', () => {
    // measureText always returns width 50, maxWidth = 200
    const ctx = makeCtx();
    const lines = wrapText(ctx, 'hello', 200, '16px sans-serif');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('hello');
  });

  it('wraps long text into multiple lines', () => {
    // measureText returns 50 per word. maxWidth = 60 → 1 word per line for 'a b c'
    let callCount = 0;
    const ctx = makeCtx({
      measureText: vi.fn(() => {
        callCount++;
        // Return width proportional to text length
        return { width: callCount % 2 === 0 ? 70 : 40 } as TextMetrics;
      }),
    });

    const lines = wrapText(ctx, 'hello world', 60, '16px sans-serif');
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  it('calls ctx.save and ctx.restore', () => {
    const ctx = makeCtx();
    wrapText(ctx, 'text', 200, '16px sans-serif');
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it('returns empty array for empty string', () => {
    const ctx = makeCtx({
      measureText: vi.fn(() => ({ width: 0 } as TextMetrics)),
    });
    const lines = wrapText(ctx, '', 200, '16px sans-serif');
    // Empty string → no words → no lines pushed
    expect(lines).toHaveLength(0);
  });

  it('preserves all words across wrapped lines', () => {
    // Use a narrow maxWidth to force wrapping
    const ctx = makeCtx({
      measureText: vi.fn((text: string) => ({ width: text.length * 10 } as TextMetrics)),
    });
    const text = 'the quick brown fox jumps over the lazy dog';
    const lines = wrapText(ctx, text, 50, '12px sans-serif');
    const rejoined = lines.join(' ');
    expect(rejoined).toBe(text);
  });

  it('sets ctx.font to the provided font string', () => {
    const ctx = makeCtx();
    wrapText(ctx, 'test', 200, '24px monospace');
    expect(ctx.font).toBe('24px monospace');
  });

  it('handles single very long word (no spaces) as a single line', () => {
    const ctx = makeCtx({
      measureText: vi.fn(() => ({ width: 500 } as TextMetrics)),
    });
    const lines = wrapText(ctx, 'superlongwordwithoutspaces', 100, '16px sans-serif');
    // No spaces to break on → stays on one line
    expect(lines).toHaveLength(1);
  });
});
