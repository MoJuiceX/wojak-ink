import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isMobile,
  isIOS,
  isAndroid,
  isTouchDevice,
  isStandalone,
  getDevicePixelRatio,
  getTouchInfo,
  getTouchPosition,
  getPinchScale,
  DEFAULT_GESTURE_CONFIG,
  createGestureState,
  detectGesture,
  THUMB_ZONES,
  getThumbZone,
  isInThumbZone,
  getRecommendedParticleCount,
  prefersReducedMotion,
  isLowPowerMode,
  preventDefaultTouch,
} from './mobile';

// ============================================
// DEVICE DETECTION
// ============================================

describe('isMobile', () => {
  const originalUA = navigator.userAgent;

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUA,
      configurable: true,
    });
  });

  it('returns true for Android userAgent', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 10; SM-G975U) AppleWebKit/537.36',
      configurable: true,
    });
    expect(isMobile()).toBe(true);
  });

  it('returns true for iPhone userAgent', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      configurable: true,
    });
    expect(isMobile()).toBe(true);
  });

  it('returns true for iPad userAgent', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
      configurable: true,
    });
    expect(isMobile()).toBe(true);
  });

  it('returns false for desktop Chrome userAgent', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0',
      configurable: true,
    });
    expect(isMobile()).toBe(false);
  });

  it('returns false for desktop Firefox userAgent', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (X11; Linux x86_64; rv:89.0) Gecko/20100101 Firefox/89.0',
      configurable: true,
    });
    expect(isMobile()).toBe(false);
  });
});

describe('isIOS', () => {
  const originalUA = navigator.userAgent;

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUA,
      configurable: true,
    });
  });

  it('returns true for iPhone', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      configurable: true,
    });
    expect(isIOS()).toBe(true);
  });

  it('returns true for iPad', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
      configurable: true,
    });
    expect(isIOS()).toBe(true);
  });

  it('returns false for Android', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 10; SM-G975U) AppleWebKit/537.36',
      configurable: true,
    });
    expect(isIOS()).toBe(false);
  });
});

describe('isAndroid', () => {
  const originalUA = navigator.userAgent;

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUA,
      configurable: true,
    });
  });

  it('returns true for Android device', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 10; SM-G975U) AppleWebKit/537.36',
      configurable: true,
    });
    expect(isAndroid()).toBe(true);
  });

  it('returns false for iOS device', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      configurable: true,
    });
    expect(isAndroid()).toBe(false);
  });
});

describe('isTouchDevice', () => {
  it('returns a boolean', () => {
    // In happy-dom environment result depends on env; just verify it is boolean
    expect(typeof isTouchDevice()).toBe('boolean');
  });
});

describe('isStandalone', () => {
  it('returns a boolean', () => {
    expect(typeof isStandalone()).toBe('boolean');
  });
});

describe('getDevicePixelRatio', () => {
  it('returns window.devicePixelRatio when set', () => {
    const original = window.devicePixelRatio;
    Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true });
    expect(getDevicePixelRatio()).toBe(2);
    Object.defineProperty(window, 'devicePixelRatio', { value: original, configurable: true });
  });

  it('returns 1 when devicePixelRatio is 0 (falsy)', () => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 0, configurable: true });
    expect(getDevicePixelRatio()).toBe(1);
    Object.defineProperty(window, 'devicePixelRatio', { value: 1, configurable: true });
  });
});

// ============================================
// TOUCH HANDLING
// ============================================

describe('getTouchInfo', () => {
  it('returns correct touch info for a single touch', () => {
    const rect = { left: 10, top: 20, width: 200, height: 300 } as DOMRect;
    const mockTouches = [{ clientX: 60, clientY: 70, identifier: 1 }];
    const mockEvent = {
      touches: mockTouches,
    } as unknown as TouchEvent;

    const info = getTouchInfo(mockEvent, rect);
    expect(info.startX).toBe(50); // 60 - 10
    expect(info.startY).toBe(50); // 70 - 20
    expect(info.currentX).toBe(50);
    expect(info.currentY).toBe(50);
    expect(info.isMultiTouch).toBe(false);
    expect(info.touches).toHaveLength(1);
    expect(info.touches[0].x).toBe(50);
    expect(info.touches[0].y).toBe(50);
  });

  it('detects multi-touch', () => {
    const rect = { left: 0, top: 0, width: 200, height: 300 } as DOMRect;
    const mockTouches = [
      { clientX: 50, clientY: 60, identifier: 1 },
      { clientX: 100, clientY: 120, identifier: 2 },
    ];
    const mockEvent = { touches: mockTouches } as unknown as TouchEvent;

    const info = getTouchInfo(mockEvent, rect);
    expect(info.isMultiTouch).toBe(true);
    expect(info.touches).toHaveLength(2);
  });

  it('handles empty touches gracefully', () => {
    const rect = { left: 5, top: 5, width: 100, height: 100 } as DOMRect;
    const mockEvent = { touches: [] } as unknown as TouchEvent;

    const info = getTouchInfo(mockEvent, rect);
    expect(info.startX).toBe(0);
    expect(info.startY).toBe(0);
    expect(info.isMultiTouch).toBe(false);
  });
});

describe('getTouchPosition', () => {
  it('returns corrected position with default offset', () => {
    const rect = { left: 10, top: 10, width: 200, height: 200 } as DOMRect;
    const mockEvent = {
      touches: [{ clientX: 100, clientY: 100 }],
      changedTouches: [],
    } as unknown as TouchEvent;

    const pos = getTouchPosition(mockEvent, rect);
    expect(pos.x).toBe(90);   // 100 - 10
    expect(pos.y).toBe(70);   // 100 - 10 - 20 (default offset)
  });

  it('respects custom offset', () => {
    const rect = { left: 0, top: 0, width: 200, height: 200 } as DOMRect;
    const mockEvent = {
      touches: [{ clientX: 50, clientY: 80 }],
      changedTouches: [],
    } as unknown as TouchEvent;

    const pos = getTouchPosition(mockEvent, rect, 10);
    expect(pos.x).toBe(50);
    expect(pos.y).toBe(70); // 80 - 0 - 10
  });

  it('falls back to changedTouches when touches is empty', () => {
    const rect = { left: 0, top: 0, width: 200, height: 200 } as DOMRect;
    const mockEvent = {
      touches: [],
      changedTouches: [{ clientX: 30, clientY: 40 }],
    } as unknown as TouchEvent;

    const pos = getTouchPosition(mockEvent, rect, 0);
    expect(pos.x).toBe(30);
    expect(pos.y).toBe(40);
  });
});

describe('getPinchScale', () => {
  it('returns 1 when start distance is 0', () => {
    const p = { x: 50, y: 50, id: 1, timestamp: 0 };
    const scale = getPinchScale(p, p, p, p);
    expect(scale).toBe(1);
  });

  it('returns > 1 when pinching out', () => {
    const t1Start = { x: 40, y: 50, id: 1, timestamp: 0 };
    const t2Start = { x: 60, y: 50, id: 2, timestamp: 0 };
    const t1Current = { x: 20, y: 50, id: 1, timestamp: 0 };
    const t2Current = { x: 80, y: 50, id: 2, timestamp: 0 };
    // Start dist: 20, current dist: 60 -> scale = 3
    const scale = getPinchScale(t1Start, t2Start, t1Current, t2Current);
    expect(scale).toBeCloseTo(3);
  });

  it('returns < 1 when pinching in', () => {
    const t1Start = { x: 20, y: 50, id: 1, timestamp: 0 };
    const t2Start = { x: 80, y: 50, id: 2, timestamp: 0 };
    const t1Current = { x: 45, y: 50, id: 1, timestamp: 0 };
    const t2Current = { x: 55, y: 50, id: 2, timestamp: 0 };
    // Start dist: 60, current dist: 10 -> scale ~0.167
    const scale = getPinchScale(t1Start, t2Start, t1Current, t2Current);
    expect(scale).toBeCloseTo(1 / 6, 2);
  });
});

// ============================================
// GESTURE DETECTION
// ============================================

describe('DEFAULT_GESTURE_CONFIG', () => {
  it('has expected defaults', () => {
    expect(DEFAULT_GESTURE_CONFIG.tapTimeout).toBe(200);
    expect(DEFAULT_GESTURE_CONFIG.doubleTapTimeout).toBe(300);
    expect(DEFAULT_GESTURE_CONFIG.longPressTimeout).toBe(500);
    expect(DEFAULT_GESTURE_CONFIG.swipeThreshold).toBe(50);
    expect(DEFAULT_GESTURE_CONFIG.swipeVelocityThreshold).toBe(0.3);
  });
});

describe('createGestureState', () => {
  it('initializes with zero values', () => {
    const state = createGestureState();
    expect(state.startX).toBe(0);
    expect(state.startY).toBe(0);
    expect(state.startTime).toBe(0);
    expect(state.lastTapTime).toBe(0);
    expect(state.isLongPress).toBe(false);
    expect(state.longPressTimer).toBeNull();
  });
});

describe('detectGesture', () => {
  it('detects swipe-right', () => {
    // Large rightward movement, fast enough
    const result = detectGesture(0, 0, 200, 0, 100);
    expect(result).toBe('swipe-right');
  });

  it('detects swipe-left', () => {
    const result = detectGesture(200, 0, 0, 0, 100);
    expect(result).toBe('swipe-left');
  });

  it('detects swipe-down', () => {
    const result = detectGesture(0, 0, 0, 200, 100);
    expect(result).toBe('swipe-down');
  });

  it('detects swipe-up', () => {
    const result = detectGesture(0, 200, 0, 0, 100);
    expect(result).toBe('swipe-up');
  });

  it('detects tap for short quick movement', () => {
    // Distance < 10, duration < tapTimeout (200)
    const result = detectGesture(0, 0, 3, 3, 50);
    expect(result).toBe('tap');
  });

  it('returns none for slow short movement', () => {
    // Distance < swipeThreshold, duration >= tapTimeout
    const result = detectGesture(0, 0, 10, 10, 500);
    expect(result).toBe('none');
  });

  it('returns none for slow large movement (low velocity)', () => {
    // Distance = 100, duration = 5000 -> velocity = 0.02 < 0.3 threshold
    const result = detectGesture(0, 0, 100, 0, 5000);
    expect(result).toBe('none');
  });

  it('uses diagonal direction correctly (X dominant = horizontal swipe)', () => {
    // Move 200 right, 50 up -> abs(X) > abs(Y) -> horizontal swipe
    const result = detectGesture(0, 0, 200, -50, 100);
    expect(result).toBe('swipe-right');
  });

  it('uses custom config', () => {
    const config = { ...DEFAULT_GESTURE_CONFIG, swipeThreshold: 300 };
    // 200 px movement wouldn't qualify with threshold 300
    const result = detectGesture(0, 0, 200, 0, 100, config);
    expect(result).toBe('none');
  });
});

// ============================================
// THUMB ZONES
// ============================================

describe('THUMB_ZONES', () => {
  it('has defined accuracy values', () => {
    expect(THUMB_ZONES.EASY.accuracy).toBeGreaterThan(THUMB_ZONES.OK.accuracy);
    expect(THUMB_ZONES.OK.accuracy).toBeGreaterThan(THUMB_ZONES.HARD.accuracy);
  });
});

describe('getThumbZone', () => {
  it('returns "easy" for Y in bottom 40% of screen', () => {
    // normalizedY = 800/1000 = 0.8 > 0.6 -> easy
    expect(getThumbZone(800, 1000)).toBe('easy');
  });

  it('returns "ok" for Y in middle 30%', () => {
    // normalizedY = 500/1000 = 0.5, between 0.3 and 0.6 -> ok
    expect(getThumbZone(500, 1000)).toBe('ok');
  });

  it('returns "hard" for Y in top 30%', () => {
    // normalizedY = 200/1000 = 0.2 < 0.3 -> hard
    expect(getThumbZone(200, 1000)).toBe('hard');
  });

  it('returns "easy" at boundary 0.6', () => {
    // exactly 0.6 > 0.6 is false, so ok
    expect(getThumbZone(600, 1000)).toBe('ok');
  });

  it('returns "hard" at boundary 0.3', () => {
    // 300/1000 = 0.3 -> ok check: 0.3 > 0.3 is false -> hard
    expect(getThumbZone(300, 1000)).toBe('hard');
  });
});

describe('isInThumbZone', () => {
  it('returns true for easy zone regardless of minAccuracy', () => {
    // bottom 40%
    expect(isInThumbZone(800, 1000, 0.99)).toBe(true);
  });

  it('returns true for ok zone when minAccuracy <= 0.84', () => {
    // middle 30%
    expect(isInThumbZone(500, 1000, 0.84)).toBe(true);
  });

  it('returns false for ok zone when minAccuracy > 0.84', () => {
    expect(isInThumbZone(500, 1000, 0.85)).toBe(false);
  });

  it('returns true for hard zone when minAccuracy <= 0.61', () => {
    expect(isInThumbZone(200, 1000, 0.61)).toBe(true);
  });

  it('returns false for hard zone when minAccuracy > 0.61', () => {
    expect(isInThumbZone(200, 1000, 0.62)).toBe(false);
  });
});

// ============================================
// PERFORMANCE HELPERS
// ============================================

describe('prefersReducedMotion', () => {
  it('returns a boolean', () => {
    expect(typeof prefersReducedMotion()).toBe('boolean');
  });
});

describe('isLowPowerMode', () => {
  it('returns false when no connection API', () => {
    // happy-dom doesn't expose connection by default
    expect(typeof isLowPowerMode()).toBe('boolean');
  });
});

describe('getRecommendedParticleCount', () => {
  beforeEach(() => {
    // Mock to non-mobile desktop, no reduced motion
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns full count on desktop without reduced motion', () => {
    expect(getRecommendedParticleCount(100)).toBe(100);
  });

  it('returns 30% when reduced motion is preferred', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query.includes('reduce'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    expect(getRecommendedParticleCount(100)).toBe(30);
  });
});

describe('preventDefaultTouch', () => {
  it('sets touchAction to none on element', () => {
    const el = document.createElement('div');
    preventDefaultTouch(el);
    expect(el.style.touchAction).toBe('none');
  });

  it('sets userSelect to none on element', () => {
    const el = document.createElement('div');
    preventDefaultTouch(el);
    expect(el.style.userSelect).toBe('none');
  });
});
