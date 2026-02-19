import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  triggerLineClearHaptic,
  triggerSnapHaptic,
  triggerInvalidHaptic,
  triggerDragStartHaptic,
  triggerPerfectClearHaptic,
  triggerDangerPulse,
  triggerStreakFireHaptic,
} from './haptics';
import { HAPTIC_PATTERNS } from './config';

// Helper to set up navigator.vibrate mock
function setupVibrateMock(): ReturnType<typeof vi.fn> {
  const vibrateMock = vi.fn();
  Object.defineProperty(navigator, 'vibrate', {
    value: vibrateMock,
    writable: true,
    configurable: true,
  });
  return vibrateMock;
}

describe('triggerLineClearHaptic', () => {
  let vibrateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vibrateMock = setupVibrateMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls navigator.vibrate with lineClear1 pattern for 1 line', () => {
    triggerLineClearHaptic(1);
    expect(vibrateMock).toHaveBeenCalledWith([...HAPTIC_PATTERNS.lineClear1]);
  });

  it('calls navigator.vibrate with lineClear2 pattern for 2 lines', () => {
    triggerLineClearHaptic(2);
    expect(vibrateMock).toHaveBeenCalledWith([...HAPTIC_PATTERNS.lineClear2]);
  });

  it('calls navigator.vibrate with lineClear3 pattern for 3 lines', () => {
    triggerLineClearHaptic(3);
    expect(vibrateMock).toHaveBeenCalledWith([...HAPTIC_PATTERNS.lineClear3]);
  });

  it('calls navigator.vibrate with lineClear4 pattern for 4 lines', () => {
    triggerLineClearHaptic(4);
    expect(vibrateMock).toHaveBeenCalledWith([...HAPTIC_PATTERNS.lineClear4]);
  });

  it('clamps to lineClear4 pattern for 5 lines (max 4)', () => {
    triggerLineClearHaptic(5);
    expect(vibrateMock).toHaveBeenCalledWith([...HAPTIC_PATTERNS.lineClear4]);
  });

  it('clamps to lineClear4 pattern for very large values', () => {
    triggerLineClearHaptic(99);
    expect(vibrateMock).toHaveBeenCalledWith([...HAPTIC_PATTERNS.lineClear4]);
  });

  it('does not throw when navigator.vibrate is undefined', () => {
    Object.defineProperty(navigator, 'vibrate', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(() => triggerLineClearHaptic(1)).not.toThrow();
  });
});

describe('triggerSnapHaptic', () => {
  let vibrateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vibrateMock = setupVibrateMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls navigator.vibrate with snapLock pattern', () => {
    triggerSnapHaptic();
    expect(vibrateMock).toHaveBeenCalledWith([...HAPTIC_PATTERNS.snapLock]);
  });

  it('does not throw when navigator.vibrate is undefined', () => {
    Object.defineProperty(navigator, 'vibrate', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(() => triggerSnapHaptic()).not.toThrow();
  });
});

describe('triggerInvalidHaptic', () => {
  let vibrateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vibrateMock = setupVibrateMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls navigator.vibrate with invalidPlacement pattern', () => {
    triggerInvalidHaptic();
    expect(vibrateMock).toHaveBeenCalledWith([...HAPTIC_PATTERNS.invalidPlacement]);
  });
});

describe('triggerDragStartHaptic', () => {
  let vibrateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vibrateMock = setupVibrateMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls navigator.vibrate with dragStart pattern', () => {
    triggerDragStartHaptic();
    expect(vibrateMock).toHaveBeenCalledWith([...HAPTIC_PATTERNS.dragStart]);
  });
});

describe('triggerPerfectClearHaptic', () => {
  let vibrateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vibrateMock = setupVibrateMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls navigator.vibrate with perfectClear pattern', () => {
    triggerPerfectClearHaptic();
    expect(vibrateMock).toHaveBeenCalledWith([...HAPTIC_PATTERNS.perfectClear]);
  });

  it('uses a longer pattern than most other effects', () => {
    triggerPerfectClearHaptic();
    const calledWith: number[] = vibrateMock.mock.calls[0][0];
    expect(calledWith.length).toBeGreaterThan(3);
  });
});

describe('triggerDangerPulse', () => {
  let vibrateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vibrateMock = setupVibrateMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls navigator.vibrate with dangerPulse pattern', () => {
    triggerDangerPulse();
    expect(vibrateMock).toHaveBeenCalledWith([...HAPTIC_PATTERNS.dangerPulse]);
  });

  it('uses a short pattern (subtle warning)', () => {
    triggerDangerPulse();
    const calledWith: number[] = vibrateMock.mock.calls[0][0];
    expect(calledWith.length).toBeLessThanOrEqual(2);
  });
});

describe('triggerStreakFireHaptic', () => {
  let vibrateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vibrateMock = setupVibrateMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls navigator.vibrate with streakFire pattern', () => {
    triggerStreakFireHaptic();
    expect(vibrateMock).toHaveBeenCalledWith([...HAPTIC_PATTERNS.streakFire]);
  });

  it('uses a multi-step escalating pattern', () => {
    triggerStreakFireHaptic();
    const calledWith: number[] = vibrateMock.mock.calls[0][0];
    expect(calledWith.length).toBeGreaterThan(1);
    // Pattern should be escalating (last value >= first value)
    expect(calledWith[calledWith.length - 1]).toBeGreaterThanOrEqual(calledWith[0]);
  });
});
