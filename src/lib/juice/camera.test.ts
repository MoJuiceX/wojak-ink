import { describe, it, expect } from 'vitest';
import {
  createCamera,
  setCameraTarget,
  setCameraPosition,
  setCameraZoom,
  setCameraZoomImmediate,
  zoomIn,
  zoomOut,
  shakeCamera,
  updateCamera,
  screenToWorld,
  worldToScreen,
  isInView,
  getVisibleBounds,

  type CameraBounds,
} from './camera';

// ============================================
// createCamera
// ============================================

describe('createCamera', () => {
  it('creates a camera with correct viewport dimensions', () => {
    const cam = createCamera(800, 600);
    expect(cam.viewportWidth).toBe(800);
    expect(cam.viewportHeight).toBe(600);
  });

  it('defaults to center of viewport', () => {
    const cam = createCamera(800, 600);
    expect(cam.x).toBe(400);
    expect(cam.y).toBe(300);
  });

  it('uses custom x/y when provided', () => {
    const cam = createCamera(800, 600, { x: 100, y: 200 });
    expect(cam.x).toBe(100);
    expect(cam.y).toBe(200);
  });

  it('defaults zoom to 1', () => {
    const cam = createCamera(800, 600);
    expect(cam.zoom).toBe(1);
    expect(cam.targetZoom).toBe(1);
  });

  it('uses custom zoom when provided', () => {
    const cam = createCamera(800, 600, { zoom: 1.5 });
    expect(cam.zoom).toBe(1.5);
    expect(cam.targetZoom).toBe(1.5);
  });

  it('defaults minZoom to 0.5 and maxZoom to 2', () => {
    const cam = createCamera(800, 600);
    expect(cam.minZoom).toBe(0.5);
    expect(cam.maxZoom).toBe(2);
  });

  it('accepts custom minZoom and maxZoom', () => {
    const cam = createCamera(800, 600, { minZoom: 0.25, maxZoom: 4 });
    expect(cam.minZoom).toBe(0.25);
    expect(cam.maxZoom).toBe(4);
  });

  it('defaults followSpeed to 0.1', () => {
    const cam = createCamera(800, 600);
    expect(cam.followSpeed).toBe(0.1);
  });

  it('accepts custom followSpeed', () => {
    const cam = createCamera(800, 600, { followSpeed: 0.5 });
    expect(cam.followSpeed).toBe(0.5);
  });

  it('initializes shake values to 0', () => {
    const cam = createCamera(800, 600);
    expect(cam.shakeIntensity).toBe(0);
    expect(cam.shakeDuration).toBe(0);
    expect(cam.shakeElapsed).toBe(0);
    expect(cam.shakeOffsetX).toBe(0);
    expect(cam.shakeOffsetY).toBe(0);
  });

  it('defaults bounds to null', () => {
    const cam = createCamera(800, 600);
    expect(cam.bounds).toBeNull();
  });

  it('accepts bounds option', () => {
    const bounds: CameraBounds = { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
    const cam = createCamera(800, 600, { bounds });
    expect(cam.bounds).toEqual(bounds);
  });

  it('sets targetX/targetY equal to x/y', () => {
    const cam = createCamera(800, 600, { x: 150, y: 250 });
    expect(cam.targetX).toBe(150);
    expect(cam.targetY).toBe(250);
  });
});

// ============================================
// setCameraTarget
// ============================================

describe('setCameraTarget', () => {
  it('sets targetX and targetY', () => {
    const cam = createCamera(800, 600);
    setCameraTarget(cam, 300, 400);
    expect(cam.targetX).toBe(300);
    expect(cam.targetY).toBe(400);
  });

  it('does not immediately move camera position', () => {
    const cam = createCamera(800, 600);
    const originalX = cam.x;
    const originalY = cam.y;
    setCameraTarget(cam, 999, 999);
    expect(cam.x).toBe(originalX);
    expect(cam.y).toBe(originalY);
  });
});

// ============================================
// setCameraPosition
// ============================================

describe('setCameraPosition', () => {
  it('sets x, y, targetX, and targetY immediately', () => {
    const cam = createCamera(800, 600);
    setCameraPosition(cam, 100, 200);
    expect(cam.x).toBe(100);
    expect(cam.y).toBe(200);
    expect(cam.targetX).toBe(100);
    expect(cam.targetY).toBe(200);
  });
});

// ============================================
// setCameraZoom
// ============================================

describe('setCameraZoom', () => {
  it('sets targetZoom within bounds', () => {
    const cam = createCamera(800, 600);
    setCameraZoom(cam, 1.5);
    expect(cam.targetZoom).toBe(1.5);
  });

  it('clamps targetZoom to minZoom', () => {
    const cam = createCamera(800, 600);
    setCameraZoom(cam, 0.1);
    expect(cam.targetZoom).toBe(cam.minZoom);
  });

  it('clamps targetZoom to maxZoom', () => {
    const cam = createCamera(800, 600);
    setCameraZoom(cam, 10);
    expect(cam.targetZoom).toBe(cam.maxZoom);
  });

  it('does not immediately change camera.zoom', () => {
    const cam = createCamera(800, 600);
    const originalZoom = cam.zoom;
    setCameraZoom(cam, 1.8);
    expect(cam.zoom).toBe(originalZoom);
  });
});

// ============================================
// setCameraZoomImmediate
// ============================================

describe('setCameraZoomImmediate', () => {
  it('sets both zoom and targetZoom immediately', () => {
    const cam = createCamera(800, 600);
    setCameraZoomImmediate(cam, 1.5);
    expect(cam.zoom).toBe(1.5);
    expect(cam.targetZoom).toBe(1.5);
  });

  it('clamps to minZoom', () => {
    const cam = createCamera(800, 600);
    setCameraZoomImmediate(cam, 0.1);
    expect(cam.zoom).toBe(cam.minZoom);
  });

  it('clamps to maxZoom', () => {
    const cam = createCamera(800, 600);
    setCameraZoomImmediate(cam, 100);
    expect(cam.zoom).toBe(cam.maxZoom);
  });
});

// ============================================
// zoomIn / zoomOut
// ============================================

describe('zoomIn', () => {
  it('increases targetZoom by default multiplier', () => {
    const cam = createCamera(800, 600);
    const originalTarget = cam.targetZoom;
    zoomIn(cam);
    expect(cam.targetZoom).toBeGreaterThan(originalTarget);
  });

  it('uses custom multiplier', () => {
    const cam = createCamera(800, 600);
    cam.targetZoom = 1;
    zoomIn(cam, 2);
    expect(cam.targetZoom).toBeCloseTo(2);
  });
});

describe('zoomOut', () => {
  it('decreases targetZoom by default multiplier', () => {
    const cam = createCamera(800, 600);
    const originalTarget = cam.targetZoom;
    zoomOut(cam);
    expect(cam.targetZoom).toBeLessThan(originalTarget);
  });

  it('uses custom multiplier', () => {
    const cam = createCamera(800, 600);
    cam.targetZoom = 2;
    zoomOut(cam, 2);
    expect(cam.targetZoom).toBeCloseTo(1);
  });
});

// ============================================
// shakeCamera
// ============================================

describe('shakeCamera', () => {
  it('sets shakeIntensity and shakeDuration', () => {
    const cam = createCamera(800, 600);
    shakeCamera(cam, 10, 500);
    expect(cam.shakeIntensity).toBe(10);
    expect(cam.shakeDuration).toBe(500);
  });

  it('resets shakeElapsed to 0', () => {
    const cam = createCamera(800, 600);
    cam.shakeElapsed = 200;
    shakeCamera(cam, 5, 300);
    expect(cam.shakeElapsed).toBe(0);
  });
});

// ============================================
// updateCamera
// ============================================

describe('updateCamera', () => {
  it('moves camera toward target position on update', () => {
    const cam = createCamera(800, 600);
    setCameraPosition(cam, 0, 0);
    setCameraTarget(cam, 100, 100);
    updateCamera(cam, 16);
    expect(cam.x).toBeGreaterThan(0);
    expect(cam.y).toBeGreaterThan(0);
  });

  it('moves camera toward target zoom on update', () => {
    const cam = createCamera(800, 600);
    cam.zoom = 1;
    cam.targetZoom = 2;
    updateCamera(cam, 16);
    expect(cam.zoom).toBeGreaterThan(1);
  });

  it('clears shake offsets when shake duration expires', () => {
    const cam = createCamera(800, 600);
    shakeCamera(cam, 10, 50);
    // Run past the shake duration
    updateCamera(cam, 100);
    expect(cam.shakeOffsetX).toBe(0);
    expect(cam.shakeOffsetY).toBe(0);
  });

  it('applies bounds clamping during update', () => {
    // Bounds larger than viewport so camera center has a valid range
    const bounds: CameraBounds = { minX: 0, minY: 0, maxX: 1000, maxY: 800 };
    const cam = createCamera(800, 600, { bounds, x: 500, y: 400 });
    cam.targetX = 2000;
    cam.targetY = 2000;
    updateCamera(cam, 16);
    // Camera center clamped so viewport stays in bounds
    const maxCamX = bounds.maxX - cam.viewportWidth / (2 * cam.zoom);
    const maxCamY = bounds.maxY - cam.viewportHeight / (2 * cam.zoom);
    expect(cam.x).toBeLessThanOrEqual(maxCamX);
    expect(cam.y).toBeLessThanOrEqual(maxCamY);
  });
});

// ============================================
// screenToWorld / worldToScreen
// ============================================

describe('screenToWorld', () => {
  it('converts screen center to camera position', () => {
    const cam = createCamera(800, 600);
    setCameraPosition(cam, 400, 300);
    const world = screenToWorld(cam, 400, 300);
    expect(world.x).toBeCloseTo(400);
    expect(world.y).toBeCloseTo(300);
  });

  it('offsets correctly from screen center', () => {
    const cam = createCamera(800, 600);
    setCameraPosition(cam, 0, 0);
    const world = screenToWorld(cam, 400, 300); // viewport center
    expect(world.x).toBeCloseTo(0);
    expect(world.y).toBeCloseTo(0);
  });

  it('accounts for zoom level', () => {
    const cam = createCamera(800, 600);
    setCameraPosition(cam, 0, 0);
    setCameraZoomImmediate(cam, 2);
    const world = screenToWorld(cam, 500, 300); // 100px right of center
    // At 2x zoom, 100 screen pixels = 50 world units
    expect(world.x).toBeCloseTo(50);
    expect(world.y).toBeCloseTo(0);
  });
});

describe('worldToScreen', () => {
  it('converts camera position to screen center', () => {
    const cam = createCamera(800, 600);
    setCameraPosition(cam, 100, 200);
    const screen = worldToScreen(cam, 100, 200);
    expect(screen.x).toBeCloseTo(400);
    expect(screen.y).toBeCloseTo(300);
  });

  it('round-trips with screenToWorld', () => {
    const cam = createCamera(800, 600);
    setCameraPosition(cam, 150, 250);
    const screenX = 450;
    const screenY = 350;
    const world = screenToWorld(cam, screenX, screenY);
    const backToScreen = worldToScreen(cam, world.x, world.y);
    expect(backToScreen.x).toBeCloseTo(screenX);
    expect(backToScreen.y).toBeCloseTo(screenY);
  });
});

// ============================================
// isInView
// ============================================

describe('isInView', () => {
  it('returns true for position at camera center', () => {
    const cam = createCamera(800, 600);
    setCameraPosition(cam, 400, 300);
    expect(isInView(cam, 400, 300)).toBe(true);
  });

  it('returns false for position far outside viewport', () => {
    const cam = createCamera(800, 600);
    setCameraPosition(cam, 0, 0);
    expect(isInView(cam, 9999, 9999)).toBe(false);
  });

  it('respects margin parameter', () => {
    const cam = createCamera(800, 600);
    setCameraPosition(cam, 400, 300);
    // Position just outside viewport
    const result = isInView(cam, 1000, 300, 500);
    // With 500px margin, this point should be visible
    expect(result).toBe(true);
  });
});

// ============================================
// getVisibleBounds
// ============================================

describe('getVisibleBounds', () => {
  it('returns left, right, top, bottom', () => {
    const cam = createCamera(800, 600);
    setCameraPosition(cam, 400, 300);
    const bounds = getVisibleBounds(cam);
    expect(bounds).toHaveProperty('left');
    expect(bounds).toHaveProperty('right');
    expect(bounds).toHaveProperty('top');
    expect(bounds).toHaveProperty('bottom');
  });

  it('right minus left equals viewport width at zoom 1', () => {
    const cam = createCamera(800, 600);
    setCameraPosition(cam, 400, 300);
    const bounds = getVisibleBounds(cam);
    expect(bounds.right - bounds.left).toBeCloseTo(800);
  });

  it('bottom minus top equals viewport height at zoom 1', () => {
    const cam = createCamera(800, 600);
    setCameraPosition(cam, 400, 300);
    const bounds = getVisibleBounds(cam);
    expect(bounds.bottom - bounds.top).toBeCloseTo(600);
  });

  it('at 2x zoom, visible area is half the viewport size', () => {
    const cam = createCamera(800, 600);
    setCameraPosition(cam, 400, 300);
    setCameraZoomImmediate(cam, 2);
    const bounds = getVisibleBounds(cam);
    expect(bounds.right - bounds.left).toBeCloseTo(400);
    expect(bounds.bottom - bounds.top).toBeCloseTo(300);
  });
});
