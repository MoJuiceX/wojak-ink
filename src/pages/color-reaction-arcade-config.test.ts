import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  N,
  randomFruitExcept,
  randomColorExcept,
  getCycleMs,
  getMatchWindowMs,
  getFullMatchChancePct,
  getPartialChancePct,
  calculateBasePoints,
  getStreakBonus,
} from './color-reaction-arcade-config';

describe('color-reaction-arcade-config', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retries random selection when the excluded value is rolled', () => {
    const randomSpy = vi.spyOn(Math, 'random')
      .mockReturnValueOnce(1 / N) // excluded index 1
      .mockReturnValueOnce(5 / N + 0.0001) // index 5
      .mockReturnValueOnce(2 / N) // excluded index 2
      .mockReturnValueOnce(0.0001); // index 0

    expect(randomFruitExcept(1)).toBe(5);

    expect(randomColorExcept(2)).toBe(0);
    expect(randomSpy).toHaveBeenCalledTimes(4);
  });

  it('applies score ramp formulas with lower and upper clamps', () => {
    expect(getCycleMs(0)).toBe(2400);
    expect(getCycleMs(100)).toBe(2280);
    expect(getCycleMs(10_000)).toBe(900);

    expect(getMatchWindowMs(0, 0)).toBe(950);
    expect(getMatchWindowMs(300, 2)).toBe(836); // 950 - 90 - 24
    expect(getMatchWindowMs(50_000, 999)).toBe(500);

    expect(getFullMatchChancePct(0)).toBe(60);
    expect(getFullMatchChancePct(10_000)).toBe(40);

    expect(getPartialChancePct(0)).toBe(55);
    expect(getPartialChancePct(10_000)).toBe(80);
  });

  it('clamps scoring bonuses to intended bounds', () => {
    expect(calculateBasePoints(0)).toBe(100);
    expect(calculateBasePoints(600)).toBe(60);
    expect(calculateBasePoints(5_000)).toBe(10);

    expect(getStreakBonus(1)).toBe(2);
    expect(getStreakBonus(8)).toBe(15);
    expect(getStreakBonus(100)).toBe(15);
  });
});
