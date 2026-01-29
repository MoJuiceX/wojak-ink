/**
 * Mobile Utilities
 * Touch handling, device detection, and mobile-specific helpers
 */

// ============================================
// DEVICE DETECTION
// ============================================

/**
 * Check if device is mobile
 */
export const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/**
 * Check if device is iOS
 */
export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

/**
 * Check if device is Android
 */
export const isAndroid = (): boolean => {
  return /Android/i.test(navigator.userAgent);
};

/**
 * Check if device supports touch
 */
export const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

/**
 * Check if device is in standalone mode (PWA)
 */
export const isStandalone = (): boolean => {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
};

/**
 * Get device pixel ratio
 */
export const getDevicePixelRatio = (): number => {
  return window.devicePixelRatio || 1;
};

// ============================================
// TOUCH HANDLING
// ============================================

export interface TouchPoint {
  x: number;
  y: number;
  id: number;
  timestamp: number;
}

export interface TouchInfo {
  touches: TouchPoint[];
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  distance: number;
  angle: number;
  velocity: number;
  isMultiTouch: boolean;
}

/**
 * Create touch info from touch event
 */
export const getTouchInfo = (
  event: TouchEvent,
  rect: DOMRect
): TouchInfo => {
  const touches: TouchPoint[] = Array.from(event.touches).map((t) => ({
    x: t.clientX - rect.left,
    y: t.clientY - rect.top,
    id: t.identifier,
    timestamp: Date.now(),
  }));

  const primaryTouch = touches[0] || { x: 0, y: 0 };
  const startX = primaryTouch.x;
  const startY = primaryTouch.y;

  return {
    touches,
    startX,
    startY,
    currentX: primaryTouch.x,
    currentY: primaryTouch.y,
    deltaX: 0,
    deltaY: 0,
    distance: 0,
    angle: 0,
    velocity: 0,
    isMultiTouch: touches.length > 1,
  };
};

/**
 * Get touch position with offset compensation for fingers
 */
export const getTouchPosition = (
  event: TouchEvent,
  rect: DOMRect,
  offsetY: number = 20 // Finger covers area below touch point
): { x: number; y: number } => {
  const touch = event.touches[0] || event.changedTouches[0];
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top - offsetY,
  };
};

/**
 * Calculate pinch scale from two touch points
 */
export const getPinchScale = (
  touch1Start: TouchPoint,
  touch2Start: TouchPoint,
  touch1Current: TouchPoint,
  touch2Current: TouchPoint
): number => {
  const startDist = Math.hypot(
    touch2Start.x - touch1Start.x,
    touch2Start.y - touch1Start.y
  );
  const currentDist = Math.hypot(
    touch2Current.x - touch1Current.x,
    touch2Current.y - touch1Current.y
  );

  return startDist === 0 ? 1 : currentDist / startDist;
};

// ============================================
// GESTURE DETECTION
// ============================================

export type GestureType =
  | 'tap'
  | 'double-tap'
  | 'long-press'
  | 'swipe-left'
  | 'swipe-right'
  | 'swipe-up'
  | 'swipe-down'
  | 'pinch'
  | 'none';

export interface GestureConfig {
  tapTimeout: number;
  doubleTapTimeout: number;
  longPressTimeout: number;
  swipeThreshold: number;
  swipeVelocityThreshold: number;
}

export const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  tapTimeout: 200,
  doubleTapTimeout: 300,
  longPressTimeout: 500,
  swipeThreshold: 50,
  swipeVelocityThreshold: 0.3,
};

export interface GestureState {
  startX: number;
  startY: number;
  startTime: number;
  lastTapTime: number;
  isLongPress: boolean;
  longPressTimer: NodeJS.Timeout | null;
}

export const createGestureState = (): GestureState => ({
  startX: 0,
  startY: 0,
  startTime: 0,
  lastTapTime: 0,
  isLongPress: false,
  longPressTimer: null,
});

/**
 * Detect gesture type from start and end positions
 */
export const detectGesture = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  duration: number,
  config: GestureConfig = DEFAULT_GESTURE_CONFIG
): GestureType => {
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const distance = Math.hypot(deltaX, deltaY);
  const velocity = distance / duration;

  // Check for swipe
  if (
    distance > config.swipeThreshold &&
    velocity > config.swipeVelocityThreshold
  ) {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX > absY) {
      return deltaX > 0 ? 'swipe-right' : 'swipe-left';
    } else {
      return deltaY > 0 ? 'swipe-down' : 'swipe-up';
    }
  }

  // Check for tap
  if (distance < 10 && duration < config.tapTimeout) {
    return 'tap';
  }

  return 'none';
};

// ============================================
// THUMB ZONE OPTIMIZATION
// ============================================

/**
 * Thumb zone accuracy by screen region
 * Based on Steven Hoober's research
 */
export const THUMB_ZONES = {
  EASY: { accuracy: 0.96, region: 'bottom 40%' },
  OK: { accuracy: 0.84, region: 'middle 30%' },
  HARD: { accuracy: 0.61, region: 'top 30%' },
};

/**
 * Get thumb zone for Y position
 */
export const getThumbZone = (
  y: number,
  screenHeight: number
): 'easy' | 'ok' | 'hard' => {
  const normalizedY = y / screenHeight;

  if (normalizedY > 0.6) return 'easy';
  if (normalizedY > 0.3) return 'ok';
  return 'hard';
};

/**
 * Check if touch is in "safe" thumb zone
 */
export const isInThumbZone = (
  y: number,
  screenHeight: number,
  minAccuracy: number = 0.8
): boolean => {
  const zone = getThumbZone(y, screenHeight);

  if (zone === 'easy') return true;
  if (zone === 'ok') return minAccuracy <= 0.84;
  return minAccuracy <= 0.61;
};

// ============================================
// VIEWPORT HELPERS
// ============================================

/**
 * Get safe area insets (for notched devices)
 */
export const getSafeAreaInsets = (): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} => {
  const style = getComputedStyle(document.documentElement);

  return {
    top: parseInt(style.getPropertyValue('--sat') || '0', 10),
    right: parseInt(style.getPropertyValue('--sar') || '0', 10),
    bottom: parseInt(style.getPropertyValue('--sab') || '0', 10),
    left: parseInt(style.getPropertyValue('--sal') || '0', 10),
  };
};

/**
 * Lock screen orientation (if supported)
 */
export const lockOrientation = async (
  orientation: 'portrait' | 'landscape'
): Promise<boolean> => {
  try {
    if (screen.orientation && (screen.orientation as any).lock) {
      await (screen.orientation as any).lock(
        orientation === 'portrait' ? 'portrait-primary' : 'landscape-primary'
      );
      return true;
    }
  } catch (e) {
    console.warn('Orientation lock not supported');
  }
  return false;
};

/**
 * Prevent default touch behaviors (scrolling, zooming)
 */
export const preventDefaultTouch = (element: HTMLElement): void => {
  element.style.touchAction = 'none';
  element.style.userSelect = 'none';
  (element.style as any).webkitUserSelect = 'none';
  (element.style as any).webkitTouchCallout = 'none';
};

/**
 * Request fullscreen (if supported)
 */
export const requestFullscreen = async (
  element: HTMLElement
): Promise<boolean> => {
  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen();
      return true;
    } else if ((element as any).webkitRequestFullscreen) {
      await (element as any).webkitRequestFullscreen();
      return true;
    }
  } catch (e) {
    console.warn('Fullscreen not supported');
  }
  return false;
};

/**
 * Exit fullscreen
 */
export const exitFullscreen = async (): Promise<void> => {
  if (document.exitFullscreen) {
    await document.exitFullscreen();
  } else if ((document as any).webkitExitFullscreen) {
    await (document as any).webkitExitFullscreen();
  }
};

// ============================================
// PERFORMANCE HELPERS
// ============================================

/**
 * Check for reduced motion preference
 */
export const prefersReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Check for low power mode (approximate)
 */
export const isLowPowerMode = (): boolean => {
  // No direct API, but we can infer from some signals
  const connection = (navigator as any).connection;
  if (connection) {
    return connection.saveData === true;
  }
  return false;
};

/**
 * Get recommended particle count based on device
 */
export const getRecommendedParticleCount = (baseCount: number): number => {
  if (prefersReducedMotion()) return Math.floor(baseCount * 0.3);
  if (isLowPowerMode()) return Math.floor(baseCount * 0.5);
  if (isMobile()) return Math.floor(baseCount * 0.7);
  return baseCount;
};
