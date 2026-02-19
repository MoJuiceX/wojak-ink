import { describe, it, expect } from 'vitest';
import { calculateBurnCredits } from './burnCredits';

// Credits are in centis: 100 = 1 credit
// Unvoted (0+0)   → 500  (5 credits)
// dislikeRatio >0.7 → 2000 (20 credits)
// dislikeRatio >0.5 → 1200 (12 credits)
// dislikeRatio >0.3 → 500  (5 credits)
// dislikeRatio ≤0.3 → 200  (2 credits)

describe('calculateBurnCredits', () => {
  // ─── Unvoted ────────────────────────────────────────────
  it('returns 500 when both likes and dislikes are 0', () => {
    expect(calculateBurnCredits(0, 0)).toBe(500);
  });

  // ─── Heavily disliked (>70% dislikes) → 2000 ────────────
  it('returns 2000 when dislike ratio is exactly 0.71', () => {
    // 29 likes, 71 dislikes → ratio = 0.71
    expect(calculateBurnCredits(29, 71)).toBe(2000);
  });

  it('returns 2000 when dislike ratio is 1.0 (all dislikes)', () => {
    expect(calculateBurnCredits(0, 100)).toBe(2000);
  });

  it('returns 2000 when dislike ratio is 0.8', () => {
    expect(calculateBurnCredits(20, 80)).toBe(2000);
  });

  it('returns 2000 when dislike ratio is just above 0.7', () => {
    // 30 likes, 71 dislikes → total=101, ratio≈0.703
    expect(calculateBurnCredits(30, 71)).toBe(2000);
  });

  // Boundary: exactly 0.7 should NOT trigger ">0.7" branch
  it('does NOT return 2000 when dislike ratio is exactly 0.7', () => {
    // 30 likes, 70 dislikes → ratio = 0.7 (not >0.7)
    expect(calculateBurnCredits(30, 70)).not.toBe(2000);
  });

  // ─── Moderately disliked (50-70% dislikes) → 1200 ───────
  it('returns 1200 when dislike ratio is exactly 0.7', () => {
    // 30/100 → 0.7, not >0.7, so falls to >0.5 check
    expect(calculateBurnCredits(30, 70)).toBe(1200);
  });

  it('returns 1200 when dislike ratio is 0.6', () => {
    expect(calculateBurnCredits(40, 60)).toBe(1200);
  });

  it('returns 1200 when dislike ratio is 0.51', () => {
    // 49 likes, 51 dislikes → ratio = 0.51
    expect(calculateBurnCredits(49, 51)).toBe(1200);
  });

  it('returns 1200 when dislike ratio is just above 0.5', () => {
    // 1 like, 2 dislikes → ratio = 0.667
    expect(calculateBurnCredits(1, 2)).toBe(1200);
  });

  // Boundary: exactly 0.5 should NOT trigger ">0.5" branch
  it('does NOT return 1200 when dislike ratio is exactly 0.5', () => {
    expect(calculateBurnCredits(50, 50)).not.toBe(1200);
  });

  // ─── Neutral (30-50% dislikes) → 500 ────────────────────
  it('returns 500 when dislike ratio is exactly 0.5', () => {
    // 50/50 → not >0.7, not >0.5, falls to >0.3 check → yes
    expect(calculateBurnCredits(50, 50)).toBe(500);
  });

  it('returns 500 when dislike ratio is 0.4', () => {
    expect(calculateBurnCredits(60, 40)).toBe(500);
  });

  it('returns 500 when dislike ratio is 0.31', () => {
    // 69 likes, 31 dislikes → ratio = 0.31
    expect(calculateBurnCredits(69, 31)).toBe(500);
  });

  // Boundary: exactly 0.3 should NOT trigger ">0.3" branch
  it('does NOT return 500 when dislike ratio is exactly 0.3', () => {
    expect(calculateBurnCredits(70, 30)).not.toBe(500);
  });

  // ─── Liked (<30% dislikes) → 200 ────────────────────────
  it('returns 200 when dislike ratio is exactly 0.3', () => {
    // 70/30 → not >0.7, not >0.5, not >0.3 → returns 200
    expect(calculateBurnCredits(70, 30)).toBe(200);
  });

  it('returns 200 when dislike ratio is 0.0 (all likes)', () => {
    expect(calculateBurnCredits(100, 0)).toBe(200);
  });

  it('returns 200 when dislike ratio is 0.1', () => {
    expect(calculateBurnCredits(90, 10)).toBe(200);
  });

  it('returns 200 when dislike ratio is 0.29', () => {
    expect(calculateBurnCredits(71, 29)).toBe(200);
  });

  it('returns 200 for 1 like and 0 dislikes', () => {
    expect(calculateBurnCredits(1, 0)).toBe(200);
  });

  // ─── Return type ─────────────────────────────────────────
  it('always returns a number', () => {
    expect(typeof calculateBurnCredits(0, 0)).toBe('number');
    expect(typeof calculateBurnCredits(50, 50)).toBe('number');
    expect(typeof calculateBurnCredits(100, 0)).toBe('number');
    expect(typeof calculateBurnCredits(0, 100)).toBe('number');
  });

  it('only returns one of the four valid tiers', () => {
    const validValues = new Set([200, 500, 1200, 2000]);
    const testCases = [
      [0, 0],
      [100, 0],
      [50, 50],
      [0, 100],
      [70, 30],
      [30, 70],
      [29, 71],
    ] as [number, number][];
    for (const [likes, dislikes] of testCases) {
      expect(validValues.has(calculateBurnCredits(likes, dislikes))).toBe(true);
    }
  });

  // ─── Large numbers ───────────────────────────────────────
  it('works correctly with large vote counts', () => {
    // 10000 likes, 0 dislikes → liked → 200
    expect(calculateBurnCredits(10000, 0)).toBe(200);
    // 0 likes, 10000 dislikes → heavily disliked → 2000
    expect(calculateBurnCredits(0, 10000)).toBe(2000);
  });
});
