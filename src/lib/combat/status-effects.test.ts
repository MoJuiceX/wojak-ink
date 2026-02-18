// src/lib/combat/status-effects.test.ts
import { describe, it, expect } from 'vitest';
import { applyStatusDamage, checkStatusSkip, tickStatus } from './status-effects';

describe('status-effects', () => {
  describe('applyStatusDamage', () => {
    it('burn deals floor(maxHP / 16) damage', () => {
      expect(applyStatusDamage('burn', 160)).toBe(10); // 160/16 = 10
      expect(applyStatusDamage('burn', 100)).toBe(6);  // 100/16 = 6.25 → 6
      expect(applyStatusDamage('burn', 15)).toBe(1);   // min 1
    });

    it('poison deals floor(maxHP / 8) damage', () => {
      expect(applyStatusDamage('poison', 160)).toBe(20); // 160/8 = 20
      expect(applyStatusDamage('poison', 100)).toBe(12); // 100/8 = 12.5 → 12
      expect(applyStatusDamage('poison', 7)).toBe(1);    // min 1
    });

    it('returns 0 for other statuses', () => {
      expect(applyStatusDamage('paralysis', 160)).toBe(0);
      expect(applyStatusDamage('freeze', 160)).toBe(0);
      expect(applyStatusDamage('sleep', 160)).toBe(0);
      expect(applyStatusDamage('confusion', 160)).toBe(0);
      expect(applyStatusDamage(null, 160)).toBe(0);
    });
  });

  describe('checkStatusSkip', () => {
    it('paralysis skips 15% of the time', () => {
      expect(checkStatusSkip('paralysis', 0.14)).toBe(true);  // 0.14 < 0.15 → skip
      expect(checkStatusSkip('paralysis', 0.15)).toBe(false); // 0.15 >= 0.15 → no skip
      expect(checkStatusSkip('paralysis', 0.50)).toBe(false);
    });

    it('freeze always skips', () => {
      expect(checkStatusSkip('freeze', 0.0)).toBe(true);
      expect(checkStatusSkip('freeze', 0.99)).toBe(true);
    });

    it('sleep always skips', () => {
      expect(checkStatusSkip('sleep', 0.0)).toBe(true);
      expect(checkStatusSkip('sleep', 0.99)).toBe(true);
    });

    it('confusion causes self-hit 25% of the time', () => {
      expect(checkStatusSkip('confusion', 0.24)).toBe(true);  // 0.24 < 0.25 → self-hit
      expect(checkStatusSkip('confusion', 0.25)).toBe(false); // 0.25 >= 0.25 → no self-hit
    });

    it('returns false for burn, poison, null', () => {
      expect(checkStatusSkip('burn', 0.0)).toBe(false);
      expect(checkStatusSkip('poison', 0.0)).toBe(false);
      expect(checkStatusSkip(null, 0.0)).toBe(false);
    });
  });

  describe('tickStatus', () => {
    it('freeze cures after 1 turn', () => {
      expect(tickStatus('freeze', 0)).toEqual({ cured: false });
      expect(tickStatus('freeze', 1)).toEqual({ cured: true });
    });

    it('sleep cures after 2 turns', () => {
      expect(tickStatus('sleep', 0)).toEqual({ cured: false });
      expect(tickStatus('sleep', 1)).toEqual({ cured: false });
      expect(tickStatus('sleep', 2)).toEqual({ cured: true });
    });

    it('confusion cures after 3 turns', () => {
      expect(tickStatus('confusion', 0)).toEqual({ cured: false });
      expect(tickStatus('confusion', 1)).toEqual({ cured: false });
      expect(tickStatus('confusion', 2)).toEqual({ cured: false });
      expect(tickStatus('confusion', 3)).toEqual({ cured: true });
    });

    it('burn never auto-cures', () => {
      expect(tickStatus('burn', 0)).toEqual({ cured: false });
      expect(tickStatus('burn', 10)).toEqual({ cured: false });
      expect(tickStatus('burn', 100)).toEqual({ cured: false });
    });

    it('paralysis never auto-cures', () => {
      expect(tickStatus('paralysis', 0)).toEqual({ cured: false });
      expect(tickStatus('paralysis', 100)).toEqual({ cured: false });
    });

    it('poison never auto-cures', () => {
      expect(tickStatus('poison', 0)).toEqual({ cured: false });
      expect(tickStatus('poison', 100)).toEqual({ cured: false });
    });

    it('null returns cured false', () => {
      expect(tickStatus(null, 0)).toEqual({ cured: false });
    });
  });
});
