import { describe, it, expect } from 'vitest';
import { getTypePointsForColor } from './color-type-map';
import { getNaturePointsForColor } from './color-nature-map';

describe('color-type-map', () => {
  it('red (#CC2200) maps to FIRE primary with 3pts', () => {
    const pts = getTypePointsForColor('#CC2200');
    expect(pts.primary).toBe('FIRE');
    expect(pts.primaryPts).toBe(3);
  });

  it('pure red (#FF0000) gets neon bonus (S=100%)', () => {
    const pts = getTypePointsForColor('#FF0000');
    expect(pts.primary).toBe('FIRE');
    expect(pts.primaryPts).toBe(4); // 3 base + 1 neon
  });

  it('green (#228B22) maps to GRASS primary', () => {
    const pts = getTypePointsForColor('#228B22');
    expect(pts.primary).toBe('GRASS');
  });

  it('black (#1A1A1A) maps to SHADOW primary', () => {
    const pts = getTypePointsForColor('#1A1A1A');
    expect(pts.primary).toBe('SHADOW');
  });

  it('white (#F0F8FF) maps to ICE primary', () => {
    const pts = getTypePointsForColor('#F0F8FF');
    expect(pts.primary).toBe('ICE');
  });

  it('neon green (high saturation) gets bonus point', () => {
    const pts = getTypePointsForColor('#00FF00');
    expect(pts.primaryPts).toBeGreaterThanOrEqual(4);
  });
});

describe('color-nature-map', () => {
  it('red maps to Attack primary stat', () => {
    const pts = getNaturePointsForColor('#CC2200');
    expect(pts.primary).toBe('attack');
    expect(pts.primaryPts).toBe(2);
  });

  it('blue maps to Sp.Def primary stat', () => {
    const pts = getNaturePointsForColor('#2563EB');
    expect(pts.primary).toBe('sp_def');
  });
});
