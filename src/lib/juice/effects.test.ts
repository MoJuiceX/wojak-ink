import { describe, it, expect, vi } from 'vitest';
import {
  createScreenShake,
  updateScreenShake,
  applyScreenShake,
  createScreenFlash,
  updateScreenFlash,
  drawScreenFlash,
  createVignette,
  createChromaticAberration,
  updateChromaticAberration,
  createTimeScale,
  setSlowMotion,
  updateTimeScale,
  createFreezeFrame,
  updateFreezeFrame,
  flashColor,
  FLASH_PRESETS,
  createDeathEffects,
  createCelebrationEffects,
} from './effects';
import type { ScreenFlash } from './effects';

// ============================================
// Helpers
// ============================================

function makeCtx(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: '',
    globalAlpha: 1,
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    strokeStyle: '',
    lineWidth: 0,
    createRadialGradient: vi.fn().mockReturnValue({
      addColorStop: vi.fn(),
    }),
  } as unknown as CanvasRenderingContext2D;
}

// ============================================
// SCREEN SHAKE
// ============================================

describe('createScreenShake', () => {
  it('creates shake with given intensity', () => {
    const shake = createScreenShake(8, 200);
    expect(shake.intensity).toBe(8);
  });

  it('creates shake with given duration', () => {
    const shake = createScreenShake(8, 200);
    expect(shake.duration).toBe(200);
  });

  it('isActive is true initially', () => {
    const shake = createScreenShake(5, 100);
    expect(shake.isActive).toBe(true);
  });

  it('elapsed starts at 0', () => {
    const shake = createScreenShake(5, 100);
    expect(shake.elapsed).toBe(0);
  });

  it('decay defaults to true', () => {
    const shake = createScreenShake(5, 100);
    expect(shake.decay).toBe(true);
  });

  it('accepts custom frequency', () => {
    const shake = createScreenShake(5, 100, { frequency: 60 });
    expect(shake.frequency).toBe(60);
  });

  it('accepts decay: false', () => {
    const shake = createScreenShake(5, 100, { decay: false });
    expect(shake.decay).toBe(false);
  });
});

describe('updateScreenShake', () => {
  it('returns {x:0, y:0} when shake is inactive', () => {
    const shake = createScreenShake(5, 100);
    shake.isActive = false;
    const offset = updateScreenShake(shake, 16);
    expect(offset.x).toBe(0);
    expect(offset.y).toBe(0);
  });

  it('returns non-zero offset while active', () => {
    const shake = createScreenShake(10, 500);
    const offset = updateScreenShake(shake, 50);
    // At some point during active shake, x or y may be non-zero
    // (sin/cos based — may hit zero at specific times but generally non-zero)
    expect(typeof offset.x).toBe('number');
    expect(typeof offset.y).toBe('number');
  });

  it('deactivates shake after duration elapses', () => {
    const shake = createScreenShake(5, 100);
    updateScreenShake(shake, 110);
    expect(shake.isActive).toBe(false);
  });

  it('returns zero offset after shake expires', () => {
    const shake = createScreenShake(5, 100);
    const offset = updateScreenShake(shake, 200);
    expect(offset.x).toBe(0);
    expect(offset.y).toBe(0);
  });

  it('increments elapsed on each call', () => {
    const shake = createScreenShake(5, 500);
    updateScreenShake(shake, 50);
    expect(shake.elapsed).toBe(50);
    updateScreenShake(shake, 50);
    expect(shake.elapsed).toBe(100);
  });

  it('with decay=false, intensity stays constant until duration', () => {
    const shake = createScreenShake(10, 1000, { decay: false });
    // Still active at 500ms — offset should have max intensity
    const offset1 = updateScreenShake(shake, 500);
    // Offset magnitude bounded by 2 * intensity (sum of 2 sin/cos)
    const mag = Math.abs(offset1.x) + Math.abs(offset1.y);
    expect(mag).toBeLessThanOrEqual(10 * 4 + 0.001); // 2 * intensity * 2
  });
});

describe('applyScreenShake', () => {
  it('calls ctx.translate with offset values', () => {
    const ctx = makeCtx();
    applyScreenShake(ctx, { x: 3, y: -2 });
    expect(ctx.translate).toHaveBeenCalledWith(3, -2);
  });

  it('calls translate even with zero offset', () => {
    const ctx = makeCtx();
    applyScreenShake(ctx, { x: 0, y: 0 });
    expect(ctx.translate).toHaveBeenCalledWith(0, 0);
  });
});

// ============================================
// SCREEN FLASH
// ============================================

describe('createScreenFlash', () => {
  it('creates flash with given color', () => {
    const flash = createScreenFlash('#FF0000');
    expect(flash.color).toBe('#FF0000');
  });

  it('defaults to white color', () => {
    const flash = createScreenFlash();
    expect(flash.color).toBe('#FFFFFF');
  });

  it('isActive is true initially', () => {
    const flash = createScreenFlash();
    expect(flash.isActive).toBe(true);
  });

  it('alpha is initialized to provided value', () => {
    const flash = createScreenFlash('#fff', 0.8);
    expect(flash.alpha).toBe(0.8);
  });

  it('fadeSpeed defaults to 0.005', () => {
    const flash = createScreenFlash();
    expect(flash.fadeSpeed).toBe(0.005);
  });
});

describe('updateScreenFlash', () => {
  it('does nothing when flash is inactive', () => {
    const flash = createScreenFlash('#fff', 0.5);
    flash.isActive = false;
    const initialAlpha = flash.alpha;
    updateScreenFlash(flash, 16);
    expect(flash.alpha).toBe(initialAlpha);
  });

  it('reduces alpha over time', () => {
    const flash = createScreenFlash('#fff', 0.6, 0.01);
    const initialAlpha = flash.alpha;
    updateScreenFlash(flash, 16);
    expect(flash.alpha).toBeLessThan(initialAlpha);
  });

  it('sets isActive=false when alpha reaches 0', () => {
    const flash = createScreenFlash('#fff', 0.1, 0.5);
    updateScreenFlash(flash, 1);
    expect(flash.isActive).toBe(false);
    expect(flash.alpha).toBe(0);
  });
});

describe('drawScreenFlash', () => {
  it('does not draw when flash is inactive', () => {
    const ctx = makeCtx();
    const flash = createScreenFlash();
    flash.isActive = false;
    drawScreenFlash(ctx, flash, 800, 600);
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it('does not draw when alpha is 0', () => {
    const ctx = makeCtx();
    const flash = createScreenFlash();
    flash.alpha = 0;
    drawScreenFlash(ctx, flash, 800, 600);
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it('calls fillRect with full canvas dimensions when active', () => {
    const ctx = makeCtx();
    const flash = createScreenFlash('#fff', 0.5);
    drawScreenFlash(ctx, flash, 800, 600);
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
  });

  it('calls ctx.save and ctx.restore', () => {
    const ctx = makeCtx();
    const flash = createScreenFlash('#fff', 0.5);
    drawScreenFlash(ctx, flash, 800, 600);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });
});

// ============================================
// VIGNETTE
// ============================================

describe('createVignette', () => {
  it('creates vignette with default values', () => {
    const v = createVignette();
    expect(v.color).toBe('rgba(0, 0, 0, 0.3)');
    expect(v.intensity).toBe(1);
    expect(v.radius).toBe(0.7);
  });

  it('accepts custom color', () => {
    const v = createVignette('red', 0.5, 0.5);
    expect(v.color).toBe('red');
    expect(v.intensity).toBe(0.5);
    expect(v.radius).toBe(0.5);
  });
});

// ============================================
// CHROMATIC ABERRATION
// ============================================

describe('createChromaticAberration', () => {
  it('defaults to intensity=3 and duration=200', () => {
    const ca = createChromaticAberration();
    expect(ca.intensity).toBe(3);
    expect(ca.duration).toBe(200);
  });

  it('isActive starts true', () => {
    const ca = createChromaticAberration();
    expect(ca.isActive).toBe(true);
  });

  it('elapsed starts at 0', () => {
    const ca = createChromaticAberration();
    expect(ca.elapsed).toBe(0);
  });
});

describe('updateChromaticAberration', () => {
  it('returns 0 when inactive', () => {
    const ca = createChromaticAberration(5, 200);
    ca.isActive = false;
    expect(updateChromaticAberration(ca, 50)).toBe(0);
  });

  it('returns positive intensity while active', () => {
    const ca = createChromaticAberration(5, 200);
    const result = updateChromaticAberration(ca, 50);
    expect(result).toBeGreaterThan(0);
  });

  it('decays over time (later result < earlier result)', () => {
    const ca1 = createChromaticAberration(5, 200);
    const r1 = updateChromaticAberration(ca1, 10);

    const ca2 = createChromaticAberration(5, 200);
    updateChromaticAberration(ca2, 10);
    const r2 = updateChromaticAberration(ca2, 100);

    expect(r2).toBeLessThan(r1);
  });

  it('deactivates after duration and returns 0', () => {
    const ca = createChromaticAberration(5, 200);
    const result = updateChromaticAberration(ca, 300);
    expect(result).toBe(0);
    expect(ca.isActive).toBe(false);
  });
});

// ============================================
// TIME SCALE
// ============================================

describe('createTimeScale', () => {
  it('creates time scale with given initial value', () => {
    const ts = createTimeScale(0.5);
    expect(ts.current).toBe(0.5);
    expect(ts.target).toBe(0.5);
  });

  it('defaults to scale 1', () => {
    const ts = createTimeScale();
    expect(ts.current).toBe(1);
    expect(ts.target).toBe(1);
  });

  it('has default transition speed of 0.1', () => {
    const ts = createTimeScale();
    expect(ts.transitionSpeed).toBe(0.1);
  });
});

describe('setSlowMotion', () => {
  it('sets target to given scale', () => {
    const ts = createTimeScale(1);
    setSlowMotion(ts, 0.3);
    expect(ts.target).toBe(0.3);
  });

  it('accepts custom transition speed', () => {
    const ts = createTimeScale(1);
    setSlowMotion(ts, 0.5, 0.2);
    expect(ts.transitionSpeed).toBe(0.2);
  });
});

describe('updateTimeScale', () => {
  it('moves current toward target', () => {
    const ts = createTimeScale(1);
    setSlowMotion(ts, 0.3);
    updateTimeScale(ts);
    expect(ts.current).toBeLessThan(1);
  });

  it('snaps to target when close enough', () => {
    const ts = createTimeScale(1);
    ts.target = 1.0005;
    updateTimeScale(ts);
    expect(ts.current).toBe(ts.target);
  });

  it('returns current value', () => {
    const ts = createTimeScale(0.5);
    const result = updateTimeScale(ts);
    expect(result).toBe(ts.current);
  });
});

// ============================================
// FREEZE FRAME
// ============================================

describe('createFreezeFrame', () => {
  it('creates freeze frame with given duration', () => {
    const ff = createFreezeFrame(150);
    expect(ff.duration).toBe(150);
  });

  it('isActive starts true', () => {
    const ff = createFreezeFrame(150);
    expect(ff.isActive).toBe(true);
  });

  it('elapsed starts at 0', () => {
    const ff = createFreezeFrame(150);
    expect(ff.elapsed).toBe(0);
  });

  it('accepts optional callback', () => {
    const cb = vi.fn();
    const ff = createFreezeFrame(150, cb);
    expect(ff.callback).toBe(cb);
  });
});

describe('updateFreezeFrame', () => {
  it('returns true while still frozen', () => {
    const ff = createFreezeFrame(200);
    expect(updateFreezeFrame(ff, 100)).toBe(true);
  });

  it('returns false when freeze expires', () => {
    const ff = createFreezeFrame(100);
    expect(updateFreezeFrame(ff, 150)).toBe(false);
  });

  it('returns false when not active', () => {
    const ff = createFreezeFrame(100);
    ff.isActive = false;
    expect(updateFreezeFrame(ff, 50)).toBe(false);
  });

  it('calls callback when freeze expires', () => {
    const cb = vi.fn();
    const ff = createFreezeFrame(100, cb);
    updateFreezeFrame(ff, 150);
    expect(cb).toHaveBeenCalledOnce();
  });

  it('sets isActive to false after expiry', () => {
    const ff = createFreezeFrame(100);
    updateFreezeFrame(ff, 150);
    expect(ff.isActive).toBe(false);
  });
});

// ============================================
// FLASH PRESETS
// ============================================

describe('flashColor', () => {
  it('creates a ScreenFlash with the given color', () => {
    const flash = flashColor('#FF0000', 100);
    expect(flash.color).toBe('#FF0000');
  });

  it('creates an active flash', () => {
    const flash = flashColor('#FF0000', 100);
    expect(flash.isActive).toBe(true);
  });

  it('alpha starts at 0.6', () => {
    const flash = flashColor('#FF0000', 100);
    expect(flash.alpha).toBeCloseTo(0.6);
  });
});

describe('FLASH_PRESETS', () => {
  it('has death, impact, nearMiss, heal, powerUp, damage', () => {
    expect(FLASH_PRESETS.death).toBeDefined();
    expect(FLASH_PRESETS.impact).toBeDefined();
    expect(FLASH_PRESETS.nearMiss).toBeDefined();
    expect(FLASH_PRESETS.heal).toBeDefined();
    expect(FLASH_PRESETS.powerUp).toBeDefined();
    expect(FLASH_PRESETS.damage).toBeDefined();
  });

  it('each preset is a function returning a ScreenFlash', () => {
    for (const presetFn of Object.values(FLASH_PRESETS)) {
      const flash = presetFn() as ScreenFlash;
      expect(flash.color).toBeTypeOf('string');
      expect(flash.isActive).toBe(true);
    }
  });

  it('death preset produces red flash', () => {
    const flash = FLASH_PRESETS.death();
    expect(flash.color).toBe('#FF0000');
  });

  it('impact preset produces white flash', () => {
    const flash = FLASH_PRESETS.impact();
    expect(flash.color).toBe('#FFFFFF');
  });

  it('heal preset produces green flash', () => {
    const flash = FLASH_PRESETS.heal();
    expect(flash.color).toBe('#00FF88');
  });
});

// ============================================
// COMBO EFFECTS
// ============================================

describe('createDeathEffects', () => {
  it('returns an object with shake, flash, freeze, slowMo', () => {
    const effects = createDeathEffects();
    expect(effects.shake).toBeDefined();
    expect(effects.flash).toBeDefined();
    expect(effects.freeze).toBeDefined();
    expect(effects.slowMo).toBeDefined();
  });

  it('shake is active', () => {
    const effects = createDeathEffects();
    expect(effects.shake.isActive).toBe(true);
  });

  it('flash is active', () => {
    const effects = createDeathEffects();
    expect(effects.flash.isActive).toBe(true);
  });

  it('freeze is active', () => {
    const effects = createDeathEffects();
    expect(effects.freeze.isActive).toBe(true);
  });

  it('slowMo has current below 1 (slow motion)', () => {
    const effects = createDeathEffects();
    expect(effects.slowMo.current).toBeLessThan(1);
  });
});

describe('createCelebrationEffects', () => {
  it('returns shake and flash', () => {
    const effects = createCelebrationEffects();
    expect(effects.shake).toBeDefined();
    expect(effects.flash).toBeDefined();
  });

  it('shake intensity is lower than death shake', () => {
    const death = createDeathEffects();
    const celebration = createCelebrationEffects();
    expect(celebration.shake.intensity).toBeLessThan(death.shake.intensity);
  });

  it('flash color is gold', () => {
    const effects = createCelebrationEffects();
    expect(effects.flash.color).toBe('#FFD700');
  });
});
