// src/systems/effects/presets/combo.test.ts
import { describe, it, expect } from 'vitest';
import { getComboPreset, getScoreMilestonePreset } from './combo';

describe('combo effect presets', () => {
  describe('getComboPreset', () => {
    const pos = { x: 50, y: 50 };

    it('returns an object with effects array', () => {
      const preset = getComboPreset(1, pos);
      expect(Array.isArray(preset.effects)).toBe(true);
    });

    it('always includes combo-text effect', () => {
      const preset = getComboPreset(1, pos);
      const comboText = preset.effects.find(e => e.type === 'combo-text');
      expect(comboText).toBeDefined();
    });

    it('combo-text has correct text format', () => {
      const preset = getComboPreset(3, pos);
      const comboText = preset.effects.find(e => e.type === 'combo-text');
      expect(comboText?.data?.text).toBe('3x COMBO!');
    });

    it('combo-text uses the provided position', () => {
      const customPos = { x: 25, y: 75 };
      const preset = getComboPreset(2, customPos);
      const comboText = preset.effects.find(e => e.type === 'combo-text');
      expect(comboText?.position).toEqual(customPos);
    });

    it('level 1 has only combo-text (no sparks)', () => {
      const preset = getComboPreset(1, pos);
      const sparks = preset.effects.find(e => e.type === 'sparks');
      expect(sparks).toBeUndefined();
    });

    it('level 2 adds sparks', () => {
      const preset = getComboPreset(2, pos);
      const sparks = preset.effects.find(e => e.type === 'sparks');
      expect(sparks).toBeDefined();
    });

    it('level 3 adds shockwave', () => {
      const preset = getComboPreset(3, pos);
      const shockwave = preset.effects.find(e => e.type === 'shockwave');
      expect(shockwave).toBeDefined();
    });

    it('level 2 does not have shockwave', () => {
      const preset = getComboPreset(2, pos);
      const shockwave = preset.effects.find(e => e.type === 'shockwave');
      expect(shockwave).toBeUndefined();
    });

    it('level 5 adds confetti', () => {
      const preset = getComboPreset(5, pos);
      const confetti = preset.effects.find(e => e.type === 'confetti');
      expect(confetti).toBeDefined();
    });

    it('level 4 does not have confetti', () => {
      const preset = getComboPreset(4, pos);
      const confetti = preset.effects.find(e => e.type === 'confetti');
      expect(confetti).toBeUndefined();
    });

    it('level 7 adds screen-shake', () => {
      const preset = getComboPreset(7, pos);
      const shake = preset.effects.find(e => e.type === 'screen-shake');
      expect(shake).toBeDefined();
    });

    it('level 6 does not have screen-shake', () => {
      const preset = getComboPreset(6, pos);
      const shake = preset.effects.find(e => e.type === 'screen-shake');
      expect(shake).toBeUndefined();
    });

    it('level 10 adds lightning', () => {
      const preset = getComboPreset(10, pos);
      const lightning = preset.effects.find(e => e.type === 'lightning');
      expect(lightning).toBeDefined();
    });

    it('level 10 adds vignette-pulse', () => {
      const preset = getComboPreset(10, pos);
      const vignette = preset.effects.find(e => e.type === 'vignette-pulse');
      expect(vignette).toBeDefined();
    });

    it('level 9 does not have lightning', () => {
      const preset = getComboPreset(9, pos);
      const lightning = preset.effects.find(e => e.type === 'lightning');
      expect(lightning).toBeUndefined();
    });

    it('higher levels have more effects than lower levels', () => {
      const preset1 = getComboPreset(1, pos);
      const preset10 = getComboPreset(10, pos);
      expect(preset10.effects.length).toBeGreaterThan(preset1.effects.length);
    });

    it('level 5 combo-text has subtext', () => {
      const preset = getComboPreset(5, pos);
      const comboText = preset.effects.find(e => e.type === 'combo-text');
      expect(comboText?.data?.subtext).toBeDefined();
    });

    it('level 1 combo-text has no subtext', () => {
      const preset = getComboPreset(1, pos);
      const comboText = preset.effects.find(e => e.type === 'combo-text');
      expect(comboText?.data?.subtext).toBeUndefined();
    });

    it('level 10 subtext is LEGENDARY!', () => {
      const preset = getComboPreset(10, pos);
      const comboText = preset.effects.find(e => e.type === 'combo-text');
      expect(comboText?.data?.subtext).toBe('LEGENDARY!');
    });

    it('level 8 subtext is UNSTOPPABLE!', () => {
      const preset = getComboPreset(8, pos);
      const comboText = preset.effects.find(e => e.type === 'combo-text');
      expect(comboText?.data?.subtext).toBe('UNSTOPPABLE!');
    });

    it('level 6 subtext is ON FIRE!', () => {
      const preset = getComboPreset(6, pos);
      const comboText = preset.effects.find(e => e.type === 'combo-text');
      expect(comboText?.data?.subtext).toBe('ON FIRE!');
    });

    it('sparks count scales with level', () => {
      const preset3 = getComboPreset(3, pos);
      const preset6 = getComboPreset(6, pos);
      const sparks3Count = Number(preset3.effects.find(e => e.type === 'sparks')?.data?.count ?? 0);
      const sparks6Count = Number(preset6.effects.find(e => e.type === 'sparks')?.data?.count ?? 0);
      expect(sparks6Count).toBeGreaterThan(sparks3Count);
    });

    it('combo-text level data matches the combo level', () => {
      const preset = getComboPreset(4, pos);
      const comboText = preset.effects.find(e => e.type === 'combo-text');
      expect(comboText?.data?.level).toBe(4);
    });

    it('level 1 has exactly 1 effect', () => {
      const preset = getComboPreset(1, pos);
      expect(preset.effects).toHaveLength(1);
    });
  });

  describe('getScoreMilestonePreset', () => {
    it('returns an object with effects array', () => {
      const preset = getScoreMilestonePreset(1000);
      expect(Array.isArray(preset.effects)).toBe(true);
    });

    it('includes combo-text effect', () => {
      const preset = getScoreMilestonePreset(1000);
      const comboText = preset.effects.find(e => e.type === 'combo-text');
      expect(comboText).toBeDefined();
    });

    it('includes confetti effect', () => {
      const preset = getScoreMilestonePreset(1000);
      const confetti = preset.effects.find(e => e.type === 'confetti');
      expect(confetti).toBeDefined();
    });

    it('includes shockwave effect', () => {
      const preset = getScoreMilestonePreset(1000);
      const shockwave = preset.effects.find(e => e.type === 'shockwave');
      expect(shockwave).toBeDefined();
    });

    it('combo-text shows milestone number with locale formatting', () => {
      const preset = getScoreMilestonePreset(5000);
      const comboText = preset.effects.find(e => e.type === 'combo-text');
      expect(comboText?.data?.text).toContain('5,000');
    });

    it('has exactly 3 effects', () => {
      const preset = getScoreMilestonePreset(1000);
      expect(preset.effects).toHaveLength(3);
    });

    it('works for small milestone value', () => {
      const preset = getScoreMilestonePreset(100);
      expect(preset.effects.length).toBeGreaterThan(0);
    });

    it('confetti has 100 particles', () => {
      const preset = getScoreMilestonePreset(1000);
      const confetti = preset.effects.find(e => e.type === 'confetti');
      expect(confetti?.data?.count).toBe(100);
    });
  });
});
