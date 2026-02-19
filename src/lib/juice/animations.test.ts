import { describe, it, expect, vi } from 'vitest';
import {
  linear,
  easeOutCubic,
  easeInCubic,
  easeInOutCubic,
  easeOutQuad,
  easeInOutQuad,
  easeOutBack,
  easeInBack,
  easeOutElastic,
  easeOutBounce,
  easeInExpo,
  easeOutExpo,
  createTween,
  updateTween,
  resetTween,
  lerp,
  inverseLerp,
  remap,
  smoothstep,
  createSpring,
  updateSpring,
  setSpringTarget,
  createTimer,
  updateTimer,
  resetTimer,
  pulse,
  oscillate,
} from './animations';

// ============================================
// EASING FUNCTIONS
// ============================================

describe('linear', () => {
  it('returns t unchanged', () => {
    expect(linear(0)).toBe(0);
    expect(linear(0.5)).toBe(0.5);
    expect(linear(1)).toBe(1);
  });

  it('is identity for any value', () => {
    expect(linear(0.25)).toBe(0.25);
    expect(linear(0.75)).toBe(0.75);
  });
});

describe('easeOutCubic', () => {
  it('returns 0 at t=0', () => {
    expect(easeOutCubic(0)).toBeCloseTo(0);
  });

  it('returns 1 at t=1', () => {
    expect(easeOutCubic(1)).toBeCloseTo(1);
  });

  it('returns > 0.5 at t=0.5 (fast start, slow end)', () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });

  it('is always between 0 and 1 for t in [0,1]', () => {
    for (let t = 0; t <= 1; t += 0.1) {
      const v = easeOutCubic(t);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe('easeInCubic', () => {
  it('returns 0 at t=0', () => {
    expect(easeInCubic(0)).toBeCloseTo(0);
  });

  it('returns 1 at t=1', () => {
    expect(easeInCubic(1)).toBeCloseTo(1);
  });

  it('returns < 0.5 at t=0.5 (slow start, fast end)', () => {
    expect(easeInCubic(0.5)).toBeLessThan(0.5);
  });
});

describe('easeInOutCubic', () => {
  it('returns 0 at t=0', () => {
    expect(easeInOutCubic(0)).toBeCloseTo(0);
  });

  it('returns 1 at t=1', () => {
    expect(easeInOutCubic(1)).toBeCloseTo(1);
  });

  it('returns exactly 0.5 at t=0.5 (symmetric)', () => {
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
  });
});

describe('easeOutQuad', () => {
  it('returns 0 at t=0', () => {
    expect(easeOutQuad(0)).toBeCloseTo(0);
  });

  it('returns 1 at t=1', () => {
    expect(easeOutQuad(1)).toBeCloseTo(1);
  });

  it('is greater than linear at t=0.5', () => {
    expect(easeOutQuad(0.5)).toBeGreaterThan(0.5);
  });
});

describe('easeInOutQuad', () => {
  it('returns 0 at t=0 and 1 at t=1', () => {
    expect(easeInOutQuad(0)).toBeCloseTo(0);
    expect(easeInOutQuad(1)).toBeCloseTo(1);
  });

  it('returns 0.5 at t=0.5', () => {
    expect(easeInOutQuad(0.5)).toBeCloseTo(0.5);
  });
});

describe('easeOutBack', () => {
  it('returns 0 at t=0', () => {
    expect(easeOutBack(0)).toBeCloseTo(0);
  });

  it('returns 1 at t=1', () => {
    expect(easeOutBack(1)).toBeCloseTo(1);
  });

  it('overshoots past 1 near end (bouncy)', () => {
    // At t=0.8, should overshoot
    const v = easeOutBack(0.8);
    expect(v).toBeGreaterThan(1);
  });
});

describe('easeInBack', () => {
  it('returns 0 at t=0', () => {
    expect(easeInBack(0)).toBeCloseTo(0);
  });

  it('returns 1 at t=1', () => {
    expect(easeInBack(1)).toBeCloseTo(1);
  });

  it('dips below 0 near start (anticipation)', () => {
    const v = easeInBack(0.1);
    expect(v).toBeLessThan(0);
  });
});

describe('easeOutElastic', () => {
  it('returns 0 at t=0', () => {
    expect(easeOutElastic(0)).toBeCloseTo(0);
  });

  it('returns 1 at t=1', () => {
    expect(easeOutElastic(1)).toBeCloseTo(1);
  });

  it('produces value outside [0,1] for some intermediate t (elastic bounce)', () => {
    // The elastic function oscillates
    let hasOvershoot = false;
    for (let t = 0.01; t < 0.99; t += 0.05) {
      const v = easeOutElastic(t);
      if (v > 1.01 || v < -0.01) {
        hasOvershoot = true;
        break;
      }
    }
    expect(hasOvershoot).toBe(true);
  });
});

describe('easeOutBounce', () => {
  it('returns 0 at t=0', () => {
    expect(easeOutBounce(0)).toBeCloseTo(0);
  });

  it('returns 1 at t=1', () => {
    expect(easeOutBounce(1)).toBeCloseTo(1);
  });

  it('stays within [0,1] for all t in [0,1]', () => {
    for (let t = 0; t <= 1; t += 0.05) {
      const v = easeOutBounce(t);
      expect(v).toBeGreaterThanOrEqual(-0.001);
      expect(v).toBeLessThanOrEqual(1.001);
    }
  });
});

describe('easeInExpo', () => {
  it('returns 0 at t=0', () => {
    expect(easeInExpo(0)).toBe(0);
  });

  it('returns 1 at t=1', () => {
    expect(easeInExpo(1)).toBeCloseTo(1);
  });

  it('is very small at t=0.1 (slow start)', () => {
    expect(easeInExpo(0.1)).toBeLessThan(0.01);
  });
});

describe('easeOutExpo', () => {
  it('returns 1 at t=1', () => {
    expect(easeOutExpo(1)).toBe(1);
  });

  it('returns 0 at t=0', () => {
    expect(easeOutExpo(0)).toBeCloseTo(0, 3);
  });

  it('reaches near 1 quickly (fast start)', () => {
    expect(easeOutExpo(0.5)).toBeGreaterThan(0.9);
  });
});

// ============================================
// TWEEN SYSTEM
// ============================================

describe('createTween', () => {
  it('creates tween with correct start and end values', () => {
    const tween = createTween(0, 100, 500);
    expect(tween.startValue).toBe(0);
    expect(tween.endValue).toBe(100);
  });

  it('sets initial currentValue to startValue', () => {
    const tween = createTween(20, 80, 500);
    expect(tween.currentValue).toBe(20);
  });

  it('sets duration correctly', () => {
    const tween = createTween(0, 1, 1000);
    expect(tween.duration).toBe(1000);
  });

  it('isComplete is false initially', () => {
    const tween = createTween(0, 100, 500);
    expect(tween.isComplete).toBe(false);
  });

  it('elapsed starts at 0', () => {
    const tween = createTween(0, 100, 500);
    expect(tween.elapsed).toBe(0);
  });

  it('accepts custom easing function', () => {
    const customEase = vi.fn((t: number) => t);
    const tween = createTween(0, 100, 500, customEase);
    updateTween(tween, 100);
    expect(customEase).toHaveBeenCalled();
  });

  it('accepts optional onUpdate and onComplete callbacks', () => {
    const onUpdate = vi.fn();
    const onComplete = vi.fn();
    const tween = createTween(0, 100, 200, linear, { onUpdate, onComplete });
    expect(tween.onUpdate).toBe(onUpdate);
    expect(tween.onComplete).toBe(onComplete);
  });
});

describe('updateTween', () => {
  it('progresses the tween value over time', () => {
    const tween = createTween(0, 100, 1000);
    const value = updateTween(tween, 500);
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThan(100);
  });

  it('completes tween when elapsed >= duration', () => {
    const tween = createTween(0, 100, 500);
    updateTween(tween, 500);
    expect(tween.isComplete).toBe(true);
    expect(tween.currentValue).toBe(100);
  });

  it('returns endValue when already complete', () => {
    const tween = createTween(0, 100, 500);
    tween.isComplete = true;
    const value = updateTween(tween, 100);
    expect(value).toBe(100);
  });

  it('calls onUpdate callback with current value', () => {
    const onUpdate = vi.fn();
    const tween = createTween(0, 100, 500, linear, { onUpdate });
    updateTween(tween, 250);
    expect(onUpdate).toHaveBeenCalled();
  });

  it('calls onComplete callback when tween finishes', () => {
    const onComplete = vi.fn();
    const tween = createTween(0, 100, 500, linear, { onComplete });
    updateTween(tween, 600);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('does not call onComplete again if already complete', () => {
    const onComplete = vi.fn();
    const tween = createTween(0, 100, 500, linear, { onComplete });
    updateTween(tween, 600);
    updateTween(tween, 100); // already complete
    expect(onComplete).toHaveBeenCalledOnce();
  });
});

describe('resetTween', () => {
  it('resets elapsed to 0', () => {
    const tween = createTween(0, 100, 500);
    updateTween(tween, 300);
    resetTween(tween);
    expect(tween.elapsed).toBe(0);
  });

  it('resets isComplete to false', () => {
    const tween = createTween(0, 100, 500);
    updateTween(tween, 600);
    expect(tween.isComplete).toBe(true);
    resetTween(tween);
    expect(tween.isComplete).toBe(false);
  });

  it('resets currentValue to startValue', () => {
    const tween = createTween(25, 75, 500);
    updateTween(tween, 600);
    resetTween(tween);
    expect(tween.currentValue).toBe(25);
  });
});

// ============================================
// LERP / REMAP
// ============================================

describe('lerp', () => {
  it('returns start at t=0', () => {
    expect(lerp(10, 20, 0)).toBe(10);
  });

  it('returns end at t=1', () => {
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it('returns midpoint at t=0.5', () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
  });
});

describe('inverseLerp', () => {
  it('returns 0 when value equals start', () => {
    expect(inverseLerp(10, 20, 10)).toBe(0);
  });

  it('returns 1 when value equals end', () => {
    expect(inverseLerp(10, 20, 20)).toBe(1);
  });

  it('returns 0.5 for midpoint', () => {
    expect(inverseLerp(0, 100, 50)).toBe(0.5);
  });
});

describe('remap', () => {
  it('maps 0 from [0,10] to [0,100]', () => {
    expect(remap(0, 0, 10, 0, 100)).toBe(0);
  });

  it('maps 10 from [0,10] to [0,100]', () => {
    expect(remap(10, 0, 10, 0, 100)).toBe(100);
  });

  it('maps midpoint correctly', () => {
    expect(remap(5, 0, 10, 0, 100)).toBe(50);
  });

  it('works with different output ranges', () => {
    expect(remap(0.5, 0, 1, -1, 1)).toBe(0);
  });
});

describe('smoothstep', () => {
  it('returns 0 at or below edge0', () => {
    expect(smoothstep(0, 1, 0)).toBe(0);
    expect(smoothstep(0, 1, -0.5)).toBe(0);
  });

  it('returns 1 at or above edge1', () => {
    expect(smoothstep(0, 1, 1)).toBe(1);
    expect(smoothstep(0, 1, 1.5)).toBe(1);
  });

  it('returns 0.5 at midpoint', () => {
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5);
  });

  it('is always between 0 and 1', () => {
    for (let x = -0.5; x <= 1.5; x += 0.1) {
      const v = smoothstep(0, 1, x);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

// ============================================
// SPRING
// ============================================

describe('createSpring', () => {
  it('initializes with value and target equal to initialValue', () => {
    const spring = createSpring(5);
    expect(spring.value).toBe(5);
    expect(spring.target).toBe(5);
  });

  it('defaults stiffness to 100', () => {
    const spring = createSpring(0);
    expect(spring.stiffness).toBe(100);
  });

  it('defaults damping to 10', () => {
    const spring = createSpring(0);
    expect(spring.damping).toBe(10);
  });

  it('accepts custom stiffness and damping', () => {
    const spring = createSpring(0, { stiffness: 200, damping: 5 });
    expect(spring.stiffness).toBe(200);
    expect(spring.damping).toBe(5);
  });

  it('velocity starts at 0', () => {
    const spring = createSpring(10);
    expect(spring.velocity).toBe(0);
  });
});

describe('updateSpring', () => {
  it('moves value toward target', () => {
    const spring = createSpring(0);
    setSpringTarget(spring, 100);
    updateSpring(spring, 16);
    expect(spring.value).toBeGreaterThan(0);
  });

  it('does not move when value equals target', () => {
    const spring = createSpring(50);
    const result = updateSpring(spring, 16);
    expect(result).toBeCloseTo(50);
  });
});

describe('setSpringTarget', () => {
  it('sets the target on the spring', () => {
    const spring = createSpring(0);
    setSpringTarget(spring, 75);
    expect(spring.target).toBe(75);
  });
});

// ============================================
// TIMER
// ============================================

describe('createTimer', () => {
  it('creates timer with correct duration', () => {
    const callback = vi.fn();
    const timer = createTimer(1000, callback);
    expect(timer.duration).toBe(1000);
  });

  it('elapsed starts at 0', () => {
    const timer = createTimer(500, vi.fn());
    expect(timer.elapsed).toBe(0);
  });

  it('isComplete starts false', () => {
    const timer = createTimer(500, vi.fn());
    expect(timer.isComplete).toBe(false);
  });

  it('loop defaults to false', () => {
    const timer = createTimer(500, vi.fn());
    expect(timer.loop).toBe(false);
  });

  it('accepts loop=true', () => {
    const timer = createTimer(500, vi.fn(), true);
    expect(timer.loop).toBe(true);
  });
});

describe('updateTimer', () => {
  it('returns false before timer fires', () => {
    const timer = createTimer(1000, vi.fn());
    const fired = updateTimer(timer, 500);
    expect(fired).toBe(false);
  });

  it('returns true and fires callback when elapsed >= duration', () => {
    const callback = vi.fn();
    const timer = createTimer(500, callback);
    const fired = updateTimer(timer, 500);
    expect(fired).toBe(true);
    expect(callback).toHaveBeenCalledOnce();
  });

  it('marks timer isComplete when not looping', () => {
    const timer = createTimer(200, vi.fn());
    updateTimer(timer, 300);
    expect(timer.isComplete).toBe(true);
  });

  it('does not fire again after completion (non-loop)', () => {
    const callback = vi.fn();
    const timer = createTimer(200, callback);
    updateTimer(timer, 300);
    const fired2 = updateTimer(timer, 300);
    expect(fired2).toBe(false);
    expect(callback).toHaveBeenCalledOnce();
  });

  it('loops: fires callback and wraps elapsed', () => {
    const callback = vi.fn();
    const timer = createTimer(200, callback, true);
    updateTimer(timer, 250);
    expect(callback).toHaveBeenCalledOnce();
    expect(timer.elapsed).toBeLessThan(200);
    expect(timer.isComplete).toBe(false);
  });
});

describe('resetTimer', () => {
  it('resets elapsed to 0', () => {
    const timer = createTimer(500, vi.fn());
    updateTimer(timer, 300);
    resetTimer(timer);
    expect(timer.elapsed).toBe(0);
  });

  it('resets isComplete to false', () => {
    const timer = createTimer(500, vi.fn());
    updateTimer(timer, 600);
    resetTimer(timer);
    expect(timer.isComplete).toBe(false);
  });
});

// ============================================
// PULSE / OSCILLATE
// ============================================

describe('pulse', () => {
  it('stays within [min, max] range', () => {
    for (let t = 0; t < 10; t += 0.25) {
      const v = pulse(t, 1, 0, 1);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('stays within custom [min, max]', () => {
    for (let t = 0; t < 5; t += 0.5) {
      const v = pulse(t, 2, 5, 10);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(10);
    }
  });

  it('defaults to [0,1] range', () => {
    const v = pulse(0, 1);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  });
});

describe('oscillate', () => {
  it('returns 0 at t=0 with default amplitude', () => {
    expect(oscillate(0, 1)).toBeCloseTo(0);
  });

  it('stays within [-amplitude, amplitude]', () => {
    const amp = 5;
    for (let t = 0; t < 10; t += 0.2) {
      const v = oscillate(t, 1, amp);
      expect(v).toBeGreaterThanOrEqual(-amp - 0.001);
      expect(v).toBeLessThanOrEqual(amp + 0.001);
    }
  });

  it('oscillates (not constant)', () => {
    const v1 = oscillate(0, 1, 1);
    const v2 = oscillate(0.25, 1, 1);
    expect(v1).not.toBeCloseTo(v2, 1);
  });
});
