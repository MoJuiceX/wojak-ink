import { describe, it, expect } from 'vitest';
import {
  generateOrangeTree,
  generateOrangeGrove,
  generateParallaxTreeLayer,
  type OrangeTree,

} from './orangeTree';

// ============================================
// generateOrangeTree
// ============================================

describe('generateOrangeTree', () => {
  it('generates a tree with default config', () => {
    const tree = generateOrangeTree();
    expect(tree).toBeDefined();
    expect(typeof tree.seed).toBe('number');
  });

  it('uses the provided seed', () => {
    const tree = generateOrangeTree({ seed: 42 });
    expect(tree.seed).toBe(42);
  });

  it('produces deterministic results from the same seed', () => {
    const tree1 = generateOrangeTree({ seed: 12345 });
    const tree2 = generateOrangeTree({ seed: 12345 });
    expect(tree1.canopyRadius).toBe(tree2.canopyRadius);
    expect(tree1.leanAngle).toBe(tree2.leanAngle);
    expect(tree1.oranges.length).toBe(tree2.oranges.length);
  });

  it('produces different results for different seeds', () => {
    const tree1 = generateOrangeTree({ seed: 100 });
    const tree2 = generateOrangeTree({ seed: 999 });
    expect(tree1.canopyRadius).not.toBe(tree2.canopyRadius);
  });

  it('respects orangeCount override', () => {
    const tree = generateOrangeTree({ seed: 1, orangeCount: 3 });
    expect(tree.oranges.length).toBe(3);
  });

  it('respects scale override', () => {
    const tree1 = generateOrangeTree({ seed: 1, scale: 1 });
    const tree2 = generateOrangeTree({ seed: 1, scale: 2 });
    expect(tree2.canopyRadius).toBeCloseTo(tree1.canopyRadius * 2, 0);
  });

  it('generates canopyRadius > 0', () => {
    const tree = generateOrangeTree({ seed: 1 });
    expect(tree.canopyRadius).toBeGreaterThan(0);
  });

  it('generates canopyHeight > 0', () => {
    const tree = generateOrangeTree({ seed: 1 });
    expect(tree.canopyHeight).toBeGreaterThan(0);
  });

  it('generates leanAngle within -3 to 3 degrees range', () => {
    for (let i = 0; i < 10; i++) {
      const tree = generateOrangeTree({ seed: i * 1000 });
      expect(tree.leanAngle).toBeGreaterThanOrEqual(-3);
      expect(tree.leanAngle).toBeLessThanOrEqual(3);
    }
  });

  it('generates trunkWidth > 0', () => {
    const tree = generateOrangeTree({ seed: 1 });
    expect(tree.trunkWidth).toBeGreaterThan(0);
  });

  it('generates trunkHeight > 0', () => {
    const tree = generateOrangeTree({ seed: 1 });
    expect(tree.trunkHeight).toBeGreaterThan(0);
  });

  it('uses default canopy colors', () => {
    const tree = generateOrangeTree({ seed: 1 });
    expect(tree.canopyLight).toBe('#4a7c4e');
    expect(tree.canopyMid).toBe('#2d5a30');
    expect(tree.canopyDark).toBe('#1a3d1c');
  });

  it('respects custom canopy color overrides', () => {
    const tree = generateOrangeTree({ canopyLight: '#aabbcc', seed: 1 });
    expect(tree.canopyLight).toBe('#aabbcc');
  });

  it('uses default trunk color', () => {
    const tree = generateOrangeTree({ seed: 1 });
    expect(tree.trunkColor).toBe('#5d4037');
  });

  it('uses default orange color', () => {
    const tree = generateOrangeTree({ seed: 1 });
    expect(tree.orangeColor).toBe('#ff8c00');
  });

  it('generates squash between 0.92 and 1.08', () => {
    for (let i = 0; i < 10; i++) {
      const tree = generateOrangeTree({ seed: i * 111 });
      expect(tree.squash).toBeGreaterThanOrEqual(0.92);
      expect(tree.squash).toBeLessThanOrEqual(1.08);
    }
  });

  it('generates bumpAmount between 0.02 and 0.06', () => {
    for (let i = 0; i < 10; i++) {
      const tree = generateOrangeTree({ seed: i * 222 });
      expect(tree.bumpAmount).toBeGreaterThanOrEqual(0.02);
      expect(tree.bumpAmount).toBeLessThanOrEqual(0.06);
    }
  });

  it('sorts oranges back to front by depth (descending depth)', () => {
    const tree = generateOrangeTree({ seed: 42, orangeCount: 8 });
    for (let i = 0; i < tree.oranges.length - 1; i++) {
      // depth sorted: b.depth - a.depth means oranges[0].depth >= oranges[1].depth
      expect(tree.oranges[i].depth).toBeGreaterThanOrEqual(tree.oranges[i + 1].depth);
    }
  });

  it('generates oranges with positive size', () => {
    const tree = generateOrangeTree({ seed: 5, orangeCount: 10 });
    tree.oranges.forEach(orange => {
      expect(orange.size).toBeGreaterThan(0);
    });
  });

  it('generates oranges with depth between 0 and 1', () => {
    const tree = generateOrangeTree({ seed: 5, orangeCount: 10 });
    tree.oranges.forEach(orange => {
      expect(orange.depth).toBeGreaterThanOrEqual(0);
      expect(orange.depth).toBeLessThanOrEqual(1);
    });
  });

  it('generates bumpPhase between 0 and 2PI', () => {
    for (let i = 0; i < 10; i++) {
      const tree = generateOrangeTree({ seed: i * 333 });
      expect(tree.bumpPhase).toBeGreaterThanOrEqual(0);
      expect(tree.bumpPhase).toBeLessThan(Math.PI * 2);
    }
  });
});

// ============================================
// generateOrangeGrove
// ============================================

describe('generateOrangeGrove', () => {
  it('generates the correct number of trees', () => {
    const grove = generateOrangeGrove(5);
    expect(grove).toHaveLength(5);
  });

  it('generates 0 trees when count is 0', () => {
    const grove = generateOrangeGrove(0);
    expect(grove).toHaveLength(0);
  });

  it('each tree has a unique seed', () => {
    const grove = generateOrangeGrove(5, { baseSeed: 42 });
    const seeds = grove.map(t => t.seed);
    const uniqueSeeds = new Set(seeds);
    expect(uniqueSeeds.size).toBe(5);
  });

  it('produces deterministic grove from same baseSeed', () => {
    const grove1 = generateOrangeGrove(3, { baseSeed: 100 });
    const grove2 = generateOrangeGrove(3, { baseSeed: 100 });
    expect(grove1[0].canopyRadius).toBe(grove2[0].canopyRadius);
    expect(grove1[1].leanAngle).toBe(grove2[1].leanAngle);
  });

  it('produces different groves for different baseSeed', () => {
    const grove1 = generateOrangeGrove(3, { baseSeed: 100 });
    const grove2 = generateOrangeGrove(3, { baseSeed: 200 });
    expect(grove1[0].canopyRadius).not.toBe(grove2[0].canopyRadius);
  });

  it('respects scale option', () => {
    const grove1 = generateOrangeGrove(3, { baseSeed: 1, scale: 1 });
    const grove2 = generateOrangeGrove(3, { baseSeed: 1, scale: 2 });
    expect(grove2[0].canopyRadius).toBeCloseTo(grove1[0].canopyRadius * 2, 0);
  });

  it('generates valid OrangeTree objects', () => {
    const grove = generateOrangeGrove(2, { baseSeed: 42 });
    grove.forEach((tree: OrangeTree) => {
      expect(tree.canopyRadius).toBeGreaterThan(0);
      expect(Array.isArray(tree.oranges)).toBe(true);
    });
  });
});

// ============================================
// generateParallaxTreeLayer
// ============================================

describe('generateParallaxTreeLayer', () => {
  it('returns trees, positions, scale, and alpha', () => {
    const result = generateParallaxTreeLayer(0, 3, 800);
    expect(result).toHaveProperty('trees');
    expect(result).toHaveProperty('positions');
    expect(result).toHaveProperty('scale');
    expect(result).toHaveProperty('alpha');
  });

  it('positions length matches trees length', () => {
    const result = generateParallaxTreeLayer(1, 3, 800);
    expect(result.positions.length).toBe(result.trees.length);
  });

  it('back layer (index 0) has smaller scale than front layer', () => {
    const back = generateParallaxTreeLayer(0, 3, 800);
    const front = generateParallaxTreeLayer(2, 3, 800);
    expect(back.scale).toBeLessThan(front.scale);
  });

  it('back layer has lower alpha than front layer', () => {
    const back = generateParallaxTreeLayer(0, 3, 800);
    const front = generateParallaxTreeLayer(2, 3, 800);
    expect(back.alpha).toBeLessThan(front.alpha);
  });

  it('front layer scale is 1.0', () => {
    const front = generateParallaxTreeLayer(2, 3, 800);
    expect(front.scale).toBeCloseTo(1.0);
  });

  it('back layer scale is approximately 0.4', () => {
    const back = generateParallaxTreeLayer(0, 3, 800);
    expect(back.scale).toBeCloseTo(0.4);
  });

  it('back layer alpha is approximately 0.3', () => {
    const back = generateParallaxTreeLayer(0, 3, 800);
    expect(back.alpha).toBeCloseTo(0.3);
  });

  it('generates more trees for back layers (farther = more trees)', () => {
    const back = generateParallaxTreeLayer(0, 3, 800);
    const front = generateParallaxTreeLayer(2, 3, 800);
    expect(back.trees.length).toBeGreaterThanOrEqual(front.trees.length);
  });

  it('positions are within reasonable range of canvas width', () => {
    const canvasWidth = 800;
    const result = generateParallaxTreeLayer(1, 3, canvasWidth);
    result.positions.forEach(pos => {
      // Allow some offset from random jitter
      expect(pos).toBeGreaterThan(0);
      expect(pos).toBeLessThan(canvasWidth * 1.5);
    });
  });

  it('produces deterministic results from same baseSeed', () => {
    const layer1 = generateParallaxTreeLayer(1, 3, 800, 42);
    const layer2 = generateParallaxTreeLayer(1, 3, 800, 42);
    expect(layer1.positions[0]).toBe(layer2.positions[0]);
    expect(layer1.trees[0].canopyRadius).toBe(layer2.trees[0].canopyRadius);
  });
});
