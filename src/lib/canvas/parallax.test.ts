import { describe, it, expect, vi } from 'vitest';
import {
  createParallaxSystem,
  addParallaxLayer,
  createMountainLayer,
  createCloudLayer,
  createGrassLayer,
  drawMountain,
  drawCloud,
  drawGrassTuft,
  updateParallax,
  setParallaxOffset,
  drawParallaxSystem,
  drawParallaxLayer,
  createPremiumParallaxSystem,
} from './parallax';
import type { ParallaxLayer } from './parallax';

// ============================================
// Helpers
// ============================================

function makeCtx(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    globalAlpha: 1,
    fillStyle: '',
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    closePath: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

// ============================================
// createParallaxSystem
// ============================================

describe('createParallaxSystem', () => {
  it('creates system with given screen dimensions', () => {
    const system = createParallaxSystem(800, 600);
    expect(system.screenWidth).toBe(800);
    expect(system.screenHeight).toBe(600);
  });

  it('starts with empty layers array', () => {
    const system = createParallaxSystem(800, 600);
    expect(system.layers).toHaveLength(0);
  });

  it('starts with scrollOffset=0', () => {
    const system = createParallaxSystem(800, 600);
    expect(system.scrollOffset).toBe(0);
  });
});

// ============================================
// addParallaxLayer
// ============================================

describe('addParallaxLayer', () => {
  it('adds a layer to the system', () => {
    const system = createParallaxSystem(800, 600);
    const layer: ParallaxLayer = {
      name: 'test',
      speedMultiplier: 0.5,
      yPosition: 0.5,
      opacity: 1,
      elements: [],
    };
    addParallaxLayer(system, layer);
    expect(system.layers).toHaveLength(1);
  });

  it('sorts layers by speedMultiplier ascending', () => {
    const system = createParallaxSystem(800, 600);
    const fast: ParallaxLayer = {
      name: 'fast',
      speedMultiplier: 1.0,
      yPosition: 0.9,
      opacity: 1,
      elements: [],
    };
    const slow: ParallaxLayer = {
      name: 'slow',
      speedMultiplier: 0.2,
      yPosition: 0.3,
      opacity: 1,
      elements: [],
    };
    addParallaxLayer(system, fast);
    addParallaxLayer(system, slow);
    expect(system.layers[0].speedMultiplier).toBeLessThanOrEqual(
      system.layers[1].speedMultiplier
    );
  });

  it('can add multiple layers', () => {
    const system = createParallaxSystem(800, 600);
    for (let i = 0; i < 4; i++) {
      addParallaxLayer(system, {
        name: `layer${i}`,
        speedMultiplier: i * 0.25,
        yPosition: 0.5,
        opacity: 1,
        elements: [],
      });
    }
    expect(system.layers).toHaveLength(4);
  });
});

// ============================================
// createMountainLayer
// ============================================

describe('createMountainLayer', () => {
  it('returns a layer with name "mountains"', () => {
    const layer = createMountainLayer(800, 600);
    expect(layer.name).toBe('mountains');
  });

  it('uses provided speedMultiplier', () => {
    const layer = createMountainLayer(800, 600, 'rgba(0,0,0,0.5)', 0.3);
    expect(layer.speedMultiplier).toBe(0.3);
  });

  it('generates mountain elements', () => {
    const layer = createMountainLayer(800, 600);
    expect(layer.elements.length).toBeGreaterThan(0);
    for (const el of layer.elements) {
      expect(el.type).toBe('mountain');
    }
  });

  it('uses default speedMultiplier of 0.2', () => {
    const layer = createMountainLayer(800, 600);
    expect(layer.speedMultiplier).toBe(0.2);
  });

  it('generates enough elements to cover screen width', () => {
    const layer = createMountainLayer(800, 600);
    // peakCount = ceil(800 / 100) + 2 = 10
    expect(layer.elements.length).toBeGreaterThanOrEqual(10);
  });
});

// ============================================
// createCloudLayer
// ============================================

describe('createCloudLayer', () => {
  it('returns a layer with name "clouds"', () => {
    const layer = createCloudLayer(800, 600);
    expect(layer.name).toBe('clouds');
  });

  it('generates cloud elements', () => {
    const layer = createCloudLayer(800, 600);
    for (const el of layer.elements) {
      expect(el.type).toBe('cloud');
    }
  });

  it('defaults to 5 clouds', () => {
    const layer = createCloudLayer(800, 600);
    expect(layer.elements).toHaveLength(5);
  });

  it('respects custom cloudCount', () => {
    const layer = createCloudLayer(800, 600, '#FFF', 0.5, 8);
    expect(layer.elements).toHaveLength(8);
  });

  it('has opacity of 0.7', () => {
    const layer = createCloudLayer(800, 600);
    expect(layer.opacity).toBe(0.7);
  });
});

// ============================================
// createGrassLayer
// ============================================

describe('createGrassLayer', () => {
  it('returns a layer with name "foreground"', () => {
    const layer = createGrassLayer(800, 600);
    expect(layer.name).toBe('foreground');
  });

  it('has speedMultiplier > 1 (faster than scroll)', () => {
    const layer = createGrassLayer(800, 600);
    expect(layer.speedMultiplier).toBeGreaterThan(1);
  });

  it('generates grass tuft elements', () => {
    const layer = createGrassLayer(800, 600);
    for (const el of layer.elements) {
      expect(el.type).toBe('grass');
    }
  });

  it('generates multiple grass tufts', () => {
    const layer = createGrassLayer(800, 600);
    expect(layer.elements.length).toBeGreaterThan(0);
  });
});

// ============================================
// DRAWING FUNCTIONS
// ============================================

describe('drawMountain', () => {
  it('calls ctx.beginPath and ctx.fill', () => {
    const ctx = makeCtx();
    drawMountain(ctx, 100, 200, 150, 80, '#333');
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('calls ctx.moveTo and ctx.lineTo for triangle', () => {
    const ctx = makeCtx();
    drawMountain(ctx, 100, 200, 150, 80, '#333');
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
  });
});

describe('drawCloud', () => {
  it('calls ctx.arc for each cloud puff (4 arcs)', () => {
    const ctx = makeCtx();
    drawCloud(ctx, 200, 100, 80, 30, '#FFF');
    expect(ctx.arc).toHaveBeenCalledTimes(4);
  });

  it('calls ctx.fill for each puff', () => {
    const ctx = makeCtx();
    drawCloud(ctx, 200, 100, 80, 30, '#FFF');
    expect(ctx.fill).toHaveBeenCalledTimes(4);
  });
});

describe('drawGrassTuft', () => {
  it('calls ctx.beginPath and ctx.fill', () => {
    const ctx = makeCtx();
    drawGrassTuft(ctx, 50, 580, 8, 8, '#228B22');
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('calls ctx.moveTo and ctx.lineTo for triangle', () => {
    const ctx = makeCtx();
    drawGrassTuft(ctx, 50, 580, 8, 8, '#228B22');
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
  });
});

// ============================================
// updateParallax
// ============================================

describe('updateParallax', () => {
  it('adds scroll delta to system offset', () => {
    const system = createParallaxSystem(800, 600);
    updateParallax(system, 10);
    expect(system.scrollOffset).toBe(10);
  });

  it('accumulates scroll across multiple calls', () => {
    const system = createParallaxSystem(800, 600);
    updateParallax(system, 10);
    updateParallax(system, 5);
    expect(system.scrollOffset).toBe(15);
  });

  it('handles negative scroll delta', () => {
    const system = createParallaxSystem(800, 600);
    updateParallax(system, 20);
    updateParallax(system, -5);
    expect(system.scrollOffset).toBe(15);
  });
});

// ============================================
// setParallaxOffset
// ============================================

describe('setParallaxOffset', () => {
  it('sets scroll offset directly', () => {
    const system = createParallaxSystem(800, 600);
    updateParallax(system, 100);
    setParallaxOffset(system, 50);
    expect(system.scrollOffset).toBe(50);
  });

  it('overwrites previous offset', () => {
    const system = createParallaxSystem(800, 600);
    setParallaxOffset(system, 999);
    setParallaxOffset(system, 42);
    expect(system.scrollOffset).toBe(42);
  });
});

// ============================================
// drawParallaxLayer
// ============================================

describe('drawParallaxLayer', () => {
  it('calls ctx.save and ctx.restore', () => {
    const ctx = makeCtx();
    const system = createParallaxSystem(800, 600);
    const layer = createMountainLayer(800, 600);
    drawParallaxLayer(ctx, system, layer);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it('calls layer element draw fn if provided', () => {
    const ctx = makeCtx();
    const system = createParallaxSystem(800, 600);
    const customDraw = vi.fn();
    const layer: ParallaxLayer = {
      name: 'custom',
      speedMultiplier: 0.5,
      yPosition: 0.5,
      opacity: 1,
      elements: [
        {
          type: 'custom',
          x: 100,
          y: 100,
          width: 50,
          height: 50,
          color: '#fff',
          draw: customDraw,
        },
      ],
    };
    drawParallaxLayer(ctx, system, layer);
    expect(customDraw).toHaveBeenCalled();
  });
});

// ============================================
// drawParallaxSystem
// ============================================

describe('drawParallaxSystem', () => {
  it('draws all layers in the system', () => {
    const ctx = makeCtx();
    const system = createParallaxSystem(800, 600);
    addParallaxLayer(system, createMountainLayer(800, 600));
    addParallaxLayer(system, createCloudLayer(800, 600));

    drawParallaxSystem(ctx, system);

    // Each layer calls save/restore once
    expect(ctx.save).toHaveBeenCalledTimes(2);
    expect(ctx.restore).toHaveBeenCalledTimes(2);
  });

  it('handles empty system without errors', () => {
    const ctx = makeCtx();
    const system = createParallaxSystem(800, 600);
    expect(() => drawParallaxSystem(ctx, system)).not.toThrow();
  });
});

// ============================================
// createPremiumParallaxSystem
// ============================================

describe('createPremiumParallaxSystem', () => {
  it('creates system with 4 layers by default (day theme)', () => {
    const system = createPremiumParallaxSystem(800, 600, 'day');
    expect(system.layers).toHaveLength(4);
  });

  it('works with sunset theme', () => {
    const system = createPremiumParallaxSystem(800, 600, 'sunset');
    expect(system.layers.length).toBeGreaterThan(0);
  });

  it('works with night theme', () => {
    const system = createPremiumParallaxSystem(800, 600, 'night');
    expect(system.layers.length).toBeGreaterThan(0);
  });

  it('works with storm theme', () => {
    const system = createPremiumParallaxSystem(800, 600, 'storm');
    expect(system.layers.length).toBeGreaterThan(0);
  });

  it('layers are sorted by speedMultiplier ascending', () => {
    const system = createPremiumParallaxSystem(800, 600);
    for (let i = 1; i < system.layers.length; i++) {
      expect(system.layers[i].speedMultiplier).toBeGreaterThanOrEqual(
        system.layers[i - 1].speedMultiplier
      );
    }
  });

  it('all layers have elements', () => {
    const system = createPremiumParallaxSystem(800, 600);
    for (const layer of system.layers) {
      expect(layer.elements.length).toBeGreaterThan(0);
    }
  });

  it('sets correct screen dimensions', () => {
    const system = createPremiumParallaxSystem(1280, 720);
    expect(system.screenWidth).toBe(1280);
    expect(system.screenHeight).toBe(720);
  });
});
