// src/systems/effects/presets/gameOver.test.ts
import { describe, it, expect } from 'vitest';
import {
  getGameOverPreset,
  getAchievementUnlockPreset,
  getVictoryPreset,
  getDefeatPreset,
} from './gameOver';

type EffectData = Record<string, unknown>;

describe('gameOver presets', () => {
  describe('getGameOverPreset', () => {
    it('returns an effects object', () => {
      const preset = getGameOverPreset({ isHighScore: false, isTopTen: false, score: 100 });
      expect(preset).toHaveProperty('effects');
      expect(Array.isArray(preset.effects)).toBe(true);
    });

    it('returns empty effects array for normal game over (no high score, not top 10)', () => {
      const preset = getGameOverPreset({ isHighScore: false, isTopTen: false, score: 50 });
      expect(preset.effects).toHaveLength(0);
    });

    it('new high score includes confetti', () => {
      const preset = getGameOverPreset({ isHighScore: true, isTopTen: true, score: 1000 });
      const confetti = preset.effects.find(e => e.type === 'confetti');
      expect(confetti).toBeDefined();
    });

    it('new high score shows NEW HIGH SCORE! text', () => {
      const preset = getGameOverPreset({ isHighScore: true, isTopTen: false, score: 500 });
      const comboText = preset.effects.find(e => e.type === 'combo-text');
      expect((comboText?.data as EffectData)?.text).toBe('NEW HIGH SCORE!');
    });

    it('new high score includes lightning effect', () => {
      const preset = getGameOverPreset({ isHighScore: true, isTopTen: false, score: 300 });
      const lightning = preset.effects.find(e => e.type === 'lightning');
      expect(lightning).toBeDefined();
    });

    it('new high score includes shockwave', () => {
      const preset = getGameOverPreset({ isHighScore: true, isTopTen: false, score: 200 });
      const shockwave = preset.effects.find(e => e.type === 'shockwave');
      expect(shockwave).toBeDefined();
    });

    it('top 10 (not high score) includes confetti', () => {
      const preset = getGameOverPreset({ isHighScore: false, isTopTen: true, score: 200 });
      const confetti = preset.effects.find(e => e.type === 'confetti');
      expect(confetti).toBeDefined();
    });

    it('top 10 shows TOP 10! text', () => {
      const preset = getGameOverPreset({ isHighScore: false, isTopTen: true, score: 200 });
      const comboText = preset.effects.find(e => e.type === 'combo-text');
      expect((comboText?.data as EffectData)?.text).toBe('TOP 10!');
    });

    it('high score has more effects than top-10 only', () => {
      const highScore = getGameOverPreset({ isHighScore: true, isTopTen: true, score: 1000 });
      const topTen = getGameOverPreset({ isHighScore: false, isTopTen: true, score: 200 });
      expect(highScore.effects.length).toBeGreaterThan(topTen.effects.length);
    });

    it('top 10 does NOT include lightning', () => {
      const preset = getGameOverPreset({ isHighScore: false, isTopTen: true, score: 200 });
      const lightning = preset.effects.find(e => e.type === 'lightning');
      expect(lightning).toBeUndefined();
    });

    it('confetti for high score has large particle count', () => {
      const preset = getGameOverPreset({ isHighScore: true, isTopTen: false, score: 1000 });
      const confetti = preset.effects.find(e => e.type === 'confetti');
      const count = (confetti?.data as Record<string, number>)?.count ?? 0;
      expect(count).toBeGreaterThan(50);
    });

    it('all effects have a type string', () => {
      const preset = getGameOverPreset({ isHighScore: true, isTopTen: true, score: 999 });
      for (const effect of preset.effects) {
        expect(typeof effect.type).toBe('string');
      }
    });
  });

  describe('getAchievementUnlockPreset', () => {
    it('returns an effects object with effects array', () => {
      const preset = getAchievementUnlockPreset('First Win');
      expect(preset).toHaveProperty('effects');
      expect(Array.isArray(preset.effects)).toBe(true);
    });

    it('includes ACHIEVEMENT UNLOCKED! combo-text', () => {
      const preset = getAchievementUnlockPreset('Combo King');
      const comboText = preset.effects.find(e => e.type === 'combo-text');
      expect((comboText?.data as EffectData)?.text).toBe('ACHIEVEMENT UNLOCKED!');
    });

    it('includes achievement name as subtext', () => {
      const preset = getAchievementUnlockPreset('Speed Demon');
      const comboText = preset.effects.find(e => e.type === 'combo-text');
      expect((comboText?.data as EffectData)?.subtext).toBe('Speed Demon');
    });

    it('includes confetti effect', () => {
      const preset = getAchievementUnlockPreset('Test');
      const confetti = preset.effects.find(e => e.type === 'confetti');
      expect(confetti).toBeDefined();
    });

    it('includes shockwave effect', () => {
      const preset = getAchievementUnlockPreset('Test');
      const shockwave = preset.effects.find(e => e.type === 'shockwave');
      expect(shockwave).toBeDefined();
    });

    it('has at least 3 effects', () => {
      const preset = getAchievementUnlockPreset('Test');
      expect(preset.effects.length).toBeGreaterThanOrEqual(3);
    });

    it('confetti uses gold colors', () => {
      const preset = getAchievementUnlockPreset('Test');
      const confetti = preset.effects.find(e => e.type === 'confetti');
      const colors = (confetti?.data as Record<string, string[]>)?.colors;
      expect(Array.isArray(colors)).toBe(true);
    });
  });

  describe('getVictoryPreset', () => {
    it('returns an effects object', () => {
      const preset = getVictoryPreset();
      expect(preset).toHaveProperty('effects');
    });

    it('includes confetti', () => {
      const preset = getVictoryPreset();
      const confetti = preset.effects.find(e => e.type === 'confetti');
      expect(confetti).toBeDefined();
    });

    it('shows VICTORY! text', () => {
      const preset = getVictoryPreset();
      const comboText = preset.effects.find(e => e.type === 'combo-text');
      expect((comboText?.data as EffectData)?.text).toBe('VICTORY!');
    });

    it('includes shockwave', () => {
      const preset = getVictoryPreset();
      const shockwave = preset.effects.find(e => e.type === 'shockwave');
      expect(shockwave).toBeDefined();
    });

    it('has at least 3 effects', () => {
      expect(getVictoryPreset().effects.length).toBeGreaterThanOrEqual(3);
    });

    it('combo-text level is high (celebratory)', () => {
      const preset = getVictoryPreset();
      const comboText = preset.effects.find(e => e.type === 'combo-text');
      const level = (comboText?.data as Record<string, number>)?.level ?? 0;
      expect(level).toBeGreaterThanOrEqual(8);
    });
  });

  describe('getDefeatPreset', () => {
    it('returns an effects object', () => {
      const preset = getDefeatPreset();
      expect(preset).toHaveProperty('effects');
    });

    it('includes vignette-pulse effect', () => {
      const preset = getDefeatPreset();
      const vignette = preset.effects.find(e => e.type === 'vignette-pulse');
      expect(vignette).toBeDefined();
    });

    it('vignette uses reddish color', () => {
      const preset = getDefeatPreset();
      const vignette = preset.effects.find(e => e.type === 'vignette-pulse');
      const color = (vignette?.data as Record<string, string>)?.color ?? '';
      expect(color).toContain('255');
    });

    it('includes screen-shake effect', () => {
      const preset = getDefeatPreset();
      const shake = preset.effects.find(e => e.type === 'screen-shake');
      expect(shake).toBeDefined();
    });

    it('does NOT include confetti (defeat should not celebrate)', () => {
      const preset = getDefeatPreset();
      const confetti = preset.effects.find(e => e.type === 'confetti');
      expect(confetti).toBeUndefined();
    });

    it('has exactly 2 effects', () => {
      expect(getDefeatPreset().effects).toHaveLength(2);
    });

    it('screen-shake has positive intensity', () => {
      const preset = getDefeatPreset();
      const shake = preset.effects.find(e => e.type === 'screen-shake');
      const intensity = (shake?.data as Record<string, number>)?.intensity ?? 0;
      expect(intensity).toBeGreaterThan(0);
    });
  });
});
