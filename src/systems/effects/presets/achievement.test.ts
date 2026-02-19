// src/systems/effects/presets/achievement.test.ts
import { describe, it, expect } from 'vitest';
import { getAchievementPreset, getMilestonePreset } from './achievement';
import type { Achievement } from './achievement';

const makeAchievement = (rarity: Achievement['rarity']): Achievement => ({
  id: 'test-achievement',
  name: 'Test Achievement',
  description: 'A test achievement',
  icon: '🏆',
  rarity,
});

describe('achievement presets', () => {
  describe('getAchievementPreset', () => {
    it('returns an effects object for common achievement', () => {
      const preset = getAchievementPreset(makeAchievement('common'));
      expect(preset).toHaveProperty('effects');
      expect(Array.isArray(preset.effects)).toBe(true);
    });

    it('returns at least 3 effects for common achievement', () => {
      const preset = getAchievementPreset(makeAchievement('common'));
      expect(preset.effects.length).toBeGreaterThanOrEqual(3);
    });

    it('includes combo-text effect with ACHIEVEMENT! text', () => {
      const preset = getAchievementPreset(makeAchievement('rare'));
      const comboText = preset.effects.find(e => e.type === 'combo-text');
      expect(comboText).toBeDefined();
      expect((comboText?.data as Record<string, unknown>)?.text).toBe('ACHIEVEMENT!');
    });

    it('includes confetti effect', () => {
      const preset = getAchievementPreset(makeAchievement('rare'));
      const confetti = preset.effects.find(e => e.type === 'confetti');
      expect(confetti).toBeDefined();
    });

    it('includes shockwave effect', () => {
      const preset = getAchievementPreset(makeAchievement('common'));
      const shockwave = preset.effects.find(e => e.type === 'shockwave');
      expect(shockwave).toBeDefined();
    });

    it('legendary achievement gets more effects than common', () => {
      const legendary = getAchievementPreset(makeAchievement('legendary'));
      const common = getAchievementPreset(makeAchievement('common'));
      expect(legendary.effects.length).toBeGreaterThan(common.effects.length);
    });

    it('legendary achievement includes lightning effect', () => {
      const preset = getAchievementPreset(makeAchievement('legendary'));
      const lightning = preset.effects.find(e => e.type === 'lightning');
      expect(lightning).toBeDefined();
    });

    it('legendary achievement includes floating-emoji effect', () => {
      const preset = getAchievementPreset(makeAchievement('legendary'));
      const emoji = preset.effects.find(e => e.type === 'floating-emoji');
      expect(emoji).toBeDefined();
    });

    it('epic achievement includes floating-emoji effect', () => {
      const preset = getAchievementPreset(makeAchievement('epic'));
      const emoji = preset.effects.find(e => e.type === 'floating-emoji');
      expect(emoji).toBeDefined();
    });

    it('common achievement does NOT include lightning', () => {
      const preset = getAchievementPreset(makeAchievement('common'));
      const lightning = preset.effects.find(e => e.type === 'lightning');
      expect(lightning).toBeUndefined();
    });

    it('legendary confetti has more particles than common', () => {
      const commonPreset = getAchievementPreset(makeAchievement('common'));
      const legendaryPreset = getAchievementPreset(makeAchievement('legendary'));
      const commonConfetti = commonPreset.effects.find(e => e.type === 'confetti');
      const legendaryConfetti = legendaryPreset.effects.find(e => e.type === 'confetti');
      const commonCount = (commonConfetti?.data as Record<string, number>)?.count ?? 0;
      const legendaryCount = (legendaryConfetti?.data as Record<string, number>)?.count ?? 0;
      expect(legendaryCount).toBeGreaterThan(commonCount);
    });

    it('combo-text subtext matches achievement name', () => {
      const achievement = makeAchievement('rare');
      achievement.name = 'My Special Achievement';
      const preset = getAchievementPreset(achievement);
      const comboText = preset.effects.find(e => e.type === 'combo-text');
      expect((comboText?.data as Record<string, unknown>)?.subtext).toBe('My Special Achievement');
    });

    it('legendary combo-text has highest level (10)', () => {
      const preset = getAchievementPreset(makeAchievement('legendary'));
      const comboText = preset.effects.find(e => e.type === 'combo-text');
      expect((comboText?.data as Record<string, number>)?.level).toBe(10);
    });

    it('common combo-text has lower level than legendary', () => {
      const common = getAchievementPreset(makeAchievement('common'));
      const legendary = getAchievementPreset(makeAchievement('legendary'));
      const commonLevel = (common.effects.find(e => e.type === 'combo-text')?.data as Record<string, number>)?.level ?? 0;
      const legendaryLevel = (legendary.effects.find(e => e.type === 'combo-text')?.data as Record<string, number>)?.level ?? 0;
      expect(legendaryLevel).toBeGreaterThan(commonLevel);
    });

    it('effects array contains only valid effect objects', () => {
      const preset = getAchievementPreset(makeAchievement('epic'));
      for (const effect of preset.effects) {
        expect(effect).toHaveProperty('type');
        expect(typeof effect.type).toBe('string');
      }
    });
  });

  describe('getMilestonePreset', () => {
    it('returns an effects object with effects array', () => {
      const preset = getMilestonePreset(100);
      expect(preset).toHaveProperty('effects');
      expect(Array.isArray(preset.effects)).toBe(true);
    });

    it('includes score-popup effect', () => {
      const preset = getMilestonePreset(50);
      const popup = preset.effects.find(e => e.type === 'score-popup');
      expect(popup).toBeDefined();
    });

    it('score-popup shows milestone value', () => {
      const preset = getMilestonePreset(250);
      const popup = preset.effects.find(e => e.type === 'score-popup');
      expect((popup?.data as Record<string, unknown>)?.score).toBe(250);
    });

    it('score-popup has MILESTONE! label', () => {
      const preset = getMilestonePreset(100);
      const popup = preset.effects.find(e => e.type === 'score-popup');
      expect((popup?.data as Record<string, unknown>)?.label).toBe('MILESTONE!');
    });

    it('includes shockwave effect', () => {
      const preset = getMilestonePreset(100);
      const shockwave = preset.effects.find(e => e.type === 'shockwave');
      expect(shockwave).toBeDefined();
    });

    it('includes sparks effect', () => {
      const preset = getMilestonePreset(100);
      const sparks = preset.effects.find(e => e.type === 'sparks');
      expect(sparks).toBeDefined();
    });

    it('uses default center position when none given', () => {
      const preset = getMilestonePreset(100);
      const popup = preset.effects.find(e => e.type === 'score-popup');
      expect(popup?.position?.x).toBe(50);
      expect(popup?.position?.y).toBe(50);
    });

    it('uses custom position when provided', () => {
      const preset = getMilestonePreset(100, { x: 30, y: 70 });
      const popup = preset.effects.find(e => e.type === 'score-popup');
      expect(popup?.position?.x).toBe(30);
      expect(popup?.position?.y).toBe(70);
    });

    it('has at least 3 effects', () => {
      expect(getMilestonePreset(100).effects.length).toBeGreaterThanOrEqual(3);
    });

    it('gold color is used for score-popup', () => {
      const preset = getMilestonePreset(200);
      const popup = preset.effects.find(e => e.type === 'score-popup');
      expect((popup?.data as Record<string, unknown>)?.color).toBe('#FFD700');
    });
  });
});
