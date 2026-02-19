/**
 * Tests for FlappyOrange Environment Initialization
 */
import { describe, it, expect } from 'vitest';
import {
  generateClouds,
  generateNearTrees,
  generateFarTrees,
  generateGrassTufts,
  generateFireflies,
  initializeParallaxElements,
} from './environment';

describe('generateClouds', () => {
  it('generates the requested number of clouds', () => {
    const clouds = generateClouds(5, 800, 600);
    expect(clouds).toHaveLength(5);
  });

  it('each cloud has required properties', () => {
    const clouds = generateClouds(1, 800, 600);
    const cloud = clouds[0];
    expect(cloud).toHaveProperty('x');
    expect(cloud).toHaveProperty('y');
    expect(cloud).toHaveProperty('width');
    expect(cloud).toHaveProperty('height');
    expect(cloud).toHaveProperty('speed');
    expect(cloud).toHaveProperty('opacity');
  });

  it('cloud y is between 30 and 30+canvasHeight*0.3', () => {
    const canvasHeight = 600;
    const clouds = generateClouds(50, 800, canvasHeight);
    for (const cloud of clouds) {
      expect(cloud.y).toBeGreaterThanOrEqual(30);
      expect(cloud.y).toBeLessThanOrEqual(30 + canvasHeight * 0.3);
    }
  });

  it('cloud width is between 80 and 140', () => {
    const clouds = generateClouds(50, 800, 600);
    for (const cloud of clouds) {
      expect(cloud.width).toBeGreaterThanOrEqual(80);
      expect(cloud.width).toBeLessThanOrEqual(140);
    }
  });

  it('cloud opacity is between 0.7 and 0.9', () => {
    const clouds = generateClouds(50, 800, 600);
    for (const cloud of clouds) {
      expect(cloud.opacity).toBeGreaterThanOrEqual(0.7);
      expect(cloud.opacity).toBeLessThanOrEqual(0.9);
    }
  });

  it('generates 0 clouds when count is 0', () => {
    const clouds = generateClouds(0, 800, 600);
    expect(clouds).toHaveLength(0);
  });
});

describe('generateNearTrees', () => {
  it('generates the requested number of trees', () => {
    const trees = generateNearTrees(4, 800, 600);
    expect(trees).toHaveLength(4);
  });

  it('each tree has required properties', () => {
    const trees = generateNearTrees(1, 800, 600);
    const tree = trees[0];
    expect(tree).toHaveProperty('x');
    expect(tree).toHaveProperty('height');
    expect(tree).toHaveProperty('width');
    expect(tree).toHaveProperty('hasOranges');
    expect(tree).toHaveProperty('orangeOffsets');
    expect(tree).toHaveProperty('shapeVariant');
    expect(tree).toHaveProperty('canopyOffset');
  });

  it('tree shapeVariant is between 0 and 5', () => {
    const trees = generateNearTrees(50, 800, 600);
    for (const tree of trees) {
      expect(tree.shapeVariant).toBeGreaterThanOrEqual(0);
      expect(tree.shapeVariant).toBeLessThanOrEqual(5);
    }
  });

  it('orangeOffsets has 3-4 entries', () => {
    const trees = generateNearTrees(50, 800, 600);
    for (const tree of trees) {
      expect(tree.orangeOffsets.length).toBeGreaterThanOrEqual(3);
      expect(tree.orangeOffsets.length).toBeLessThanOrEqual(4);
    }
  });

  it('tree hasOranges is boolean', () => {
    const trees = generateNearTrees(10, 800, 600);
    for (const tree of trees) {
      expect(typeof tree.hasOranges).toBe('boolean');
    }
  });

  it('tree width is between 60 and 90', () => {
    const trees = generateNearTrees(50, 800, 600);
    for (const tree of trees) {
      expect(tree.width).toBeGreaterThanOrEqual(60);
      expect(tree.width).toBeLessThanOrEqual(90);
    }
  });
});

describe('generateFarTrees', () => {
  it('generates the requested number of far trees', () => {
    const trees = generateFarTrees(4, 800, 600);
    expect(trees).toHaveLength(4);
  });

  it('far trees are shorter than near trees on average', () => {
    const canvasHeight = 600;
    const farTree = generateFarTrees(1, 800, canvasHeight)[0];
    // Far trees use 0.22 of canvasHeight, near trees use 0.35
    expect(farTree.height).toBeLessThan(canvasHeight * 0.35);
    expect(farTree.height).toBeGreaterThan(canvasHeight * 0.10);
  });

  it('each far tree has required properties', () => {
    const trees = generateFarTrees(1, 800, 600);
    const tree = trees[0];
    expect(tree).toHaveProperty('x');
    expect(tree).toHaveProperty('height');
    expect(tree).toHaveProperty('width');
    expect(tree).toHaveProperty('hasOranges');
    expect(tree).toHaveProperty('orangeOffsets');
    expect(tree).toHaveProperty('shapeVariant');
    expect(tree).toHaveProperty('canopyOffset');
  });
});

describe('generateGrassTufts', () => {
  it('generates the requested number of tufts', () => {
    const tufts = generateGrassTufts(12, 800);
    expect(tufts).toHaveLength(12);
  });

  it('each tuft has x and height properties', () => {
    const tufts = generateGrassTufts(1, 800);
    expect(tufts[0]).toHaveProperty('x');
    expect(tufts[0]).toHaveProperty('height');
  });

  it('tuft height is between 6 and 16', () => {
    const tufts = generateGrassTufts(100, 800);
    for (const tuft of tufts) {
      expect(tuft.height).toBeGreaterThanOrEqual(6);
      expect(tuft.height).toBeLessThanOrEqual(16);
    }
  });

  it('generates 0 tufts when count is 0', () => {
    const tufts = generateGrassTufts(0, 800);
    expect(tufts).toHaveLength(0);
  });
});

describe('generateFireflies', () => {
  it('generates the requested number of fireflies', () => {
    const fireflies = generateFireflies(8, 800, 600);
    expect(fireflies).toHaveLength(8);
  });

  it('each firefly has required properties', () => {
    const fireflies = generateFireflies(1, 800, 600);
    const ff = fireflies[0];
    expect(ff).toHaveProperty('x');
    expect(ff).toHaveProperty('y');
    expect(ff).toHaveProperty('phase');
    expect(ff).toHaveProperty('speed');
  });

  it('firefly x is within canvas bounds', () => {
    const canvasWidth = 800;
    const fireflies = generateFireflies(50, canvasWidth, 600);
    for (const ff of fireflies) {
      expect(ff.x).toBeGreaterThanOrEqual(0);
      expect(ff.x).toBeLessThanOrEqual(canvasWidth);
    }
  });

  it('firefly y is in upper 60% above bottom', () => {
    const canvasHeight = 600;
    const fireflies = generateFireflies(50, 800, canvasHeight);
    for (const ff of fireflies) {
      expect(ff.y).toBeGreaterThanOrEqual(50);
      expect(ff.y).toBeLessThanOrEqual(50 + canvasHeight * 0.6);
    }
  });

  it('firefly phase is within 0 to 2*pi', () => {
    const fireflies = generateFireflies(50, 800, 600);
    for (const ff of fireflies) {
      expect(ff.phase).toBeGreaterThanOrEqual(0);
      expect(ff.phase).toBeLessThanOrEqual(Math.PI * 2);
    }
  });
});

describe('initializeParallaxElements', () => {
  it('returns all required parallax element groups', () => {
    const elements = initializeParallaxElements(800, 600);
    expect(elements).toHaveProperty('clouds');
    expect(elements).toHaveProperty('treesNear');
    expect(elements).toHaveProperty('treesFar');
    expect(elements).toHaveProperty('grassTufts');
    expect(elements).toHaveProperty('fireflies');
  });

  it('clouds array is non-empty', () => {
    const elements = initializeParallaxElements(800, 600);
    expect(elements.clouds.length).toBeGreaterThan(0);
  });

  it('treesNear array is non-empty', () => {
    const elements = initializeParallaxElements(800, 600);
    expect(elements.treesNear.length).toBeGreaterThan(0);
  });

  it('treesFar array is non-empty', () => {
    const elements = initializeParallaxElements(800, 600);
    expect(elements.treesFar.length).toBeGreaterThan(0);
  });

  it('grassTufts array is non-empty', () => {
    const elements = initializeParallaxElements(800, 600);
    expect(elements.grassTufts.length).toBeGreaterThan(0);
  });

  it('fireflies array is non-empty', () => {
    const elements = initializeParallaxElements(800, 600);
    expect(elements.fireflies.length).toBeGreaterThan(0);
  });

  it('works with different canvas dimensions', () => {
    const elements = initializeParallaxElements(375, 812);
    expect(elements.clouds.length).toBeGreaterThan(0);
    expect(elements.treesNear.length).toBeGreaterThan(0);
  });
});
