// src/games/shared/effectPatterns.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  EFFECT_TIMING,
  onScore,
  onPerfect,
  onCombo,
  onLevelComplete,
  onNewHighScore,
  onVictory,
  onGameOver,
  onMistake,
  onMilestone,
  onMultiClear,
  onSpecialModeActivate,
} from './effectPatterns';

// Build a mock effects object with all methods tracked
function makeMockEffects() {
  return {
    addScorePopup: vi.fn(),
    triggerShockwave: vi.fn(),
    triggerSparks: vi.fn(),
    triggerConfetti: vi.fn(),
    showEpicCallout: vi.fn(),
    triggerScreenShake: vi.fn(),
    triggerVignette: vi.fn(),
    updateCombo: vi.fn(),
    resetCombo: vi.fn(),
    triggerBigMoment: vi.fn(),
  };
}

describe('effectPatterns', () => {
  describe('EFFECT_TIMING', () => {
    it('SCORE_POPUP_DELAY is 0', () => {
      expect(EFFECT_TIMING.SCORE_POPUP_DELAY).toBe(0);
    });

    it('CONFETTI_DURATION is 3000ms', () => {
      expect(EFFECT_TIMING.CONFETTI_DURATION).toBe(3000);
    });

    it('CALLOUT_DURATION is defined and positive', () => {
      expect(EFFECT_TIMING.CALLOUT_DURATION).toBeGreaterThan(0);
    });

    it('SHAKE_DURATION has light, medium, heavy keys', () => {
      expect(EFFECT_TIMING.SHAKE_DURATION).toHaveProperty('light');
      expect(EFFECT_TIMING.SHAKE_DURATION).toHaveProperty('medium');
      expect(EFFECT_TIMING.SHAKE_DURATION).toHaveProperty('heavy');
    });

    it('heavy shake is longer than light shake', () => {
      expect(EFFECT_TIMING.SHAKE_DURATION.heavy).toBeGreaterThan(EFFECT_TIMING.SHAKE_DURATION.light);
    });
  });

  describe('onScore', () => {
    let effects: ReturnType<typeof makeMockEffects>;
    beforeEach(() => { effects = makeMockEffects(); });

    it('calls addScorePopup with points and coordinates', () => {
      onScore(effects, 50, 100, 200);
      expect(effects.addScorePopup).toHaveBeenCalledWith(50, 100, 200);
    });

    it('does NOT trigger sparks for small score (< 100)', () => {
      onScore(effects, 99, 0, 0);
      expect(effects.triggerSparks).not.toHaveBeenCalled();
    });

    it('triggers sparks for score >= 100', () => {
      onScore(effects, 100, 50, 50);
      expect(effects.triggerSparks).toHaveBeenCalled();
    });

    it('triggers sparks for large scores', () => {
      onScore(effects, 999, 10, 10);
      expect(effects.triggerSparks).toHaveBeenCalled();
    });
  });

  describe('onPerfect', () => {
    let effects: ReturnType<typeof makeMockEffects>;
    beforeEach(() => { effects = makeMockEffects(); });

    it('triggers shockwave with gold color', () => {
      onPerfect(effects, 50, 50);
      expect(effects.triggerShockwave).toHaveBeenCalledWith(50, 50, '#ffd700');
    });

    it('triggers sparks with gold color', () => {
      onPerfect(effects, 50, 50);
      expect(effects.triggerSparks).toHaveBeenCalledWith(50, 50, '#ffd700');
    });

    it('shows PERFECT! callout', () => {
      onPerfect(effects, 50, 50);
      expect(effects.showEpicCallout).toHaveBeenCalledWith('PERFECT!');
    });
  });

  describe('onCombo', () => {
    let effects: ReturnType<typeof makeMockEffects>;
    beforeEach(() => { effects = makeMockEffects(); });

    it('updates combo level', () => {
      onCombo(effects, 3, 50, 50);
      expect(effects.updateCombo).toHaveBeenCalledWith(3);
    });

    it('shows combo callout for combo >= 2', () => {
      onCombo(effects, 2, 50, 50);
      expect(effects.showEpicCallout).toHaveBeenCalledWith('2x COMBO!');
    });

    it('does NOT show callout for combo < 2', () => {
      onCombo(effects, 1, 50, 50);
      expect(effects.showEpicCallout).not.toHaveBeenCalled();
    });

    it('triggers shockwave for combo >= 3', () => {
      onCombo(effects, 3, 50, 50);
      expect(effects.triggerShockwave).toHaveBeenCalled();
    });

    it('does NOT trigger shockwave for combo < 3', () => {
      onCombo(effects, 2, 50, 50);
      expect(effects.triggerShockwave).not.toHaveBeenCalled();
    });

    it('triggers confetti for combo >= 5', () => {
      onCombo(effects, 5, 50, 50);
      expect(effects.triggerConfetti).toHaveBeenCalled();
    });

    it('does NOT trigger confetti for combo < 5', () => {
      onCombo(effects, 4, 50, 50);
      expect(effects.triggerConfetti).not.toHaveBeenCalled();
    });

    it('triggers screen shake for combo >= 7', () => {
      onCombo(effects, 7, 50, 50);
      expect(effects.triggerScreenShake).toHaveBeenCalled();
    });

    it('triggers vignette for combo >= 10', () => {
      onCombo(effects, 10, 50, 50);
      expect(effects.triggerVignette).toHaveBeenCalledWith('#ffd700');
    });
  });

  describe('onLevelComplete', () => {
    let effects: ReturnType<typeof makeMockEffects>;
    beforeEach(() => { effects = makeMockEffects(); });

    it('triggers confetti', () => {
      onLevelComplete(effects);
      expect(effects.triggerConfetti).toHaveBeenCalled();
    });

    it('shows LEVEL UP! callout', () => {
      onLevelComplete(effects);
      expect(effects.showEpicCallout).toHaveBeenCalledWith('LEVEL UP!');
    });

    it('triggers shockwave', () => {
      onLevelComplete(effects);
      expect(effects.triggerShockwave).toHaveBeenCalled();
    });
  });

  describe('onNewHighScore', () => {
    let effects: ReturnType<typeof makeMockEffects>;
    beforeEach(() => { effects = makeMockEffects(); });

    it('triggers confetti', () => {
      onNewHighScore(effects);
      expect(effects.triggerConfetti).toHaveBeenCalled();
    });

    it('shows NEW HIGH SCORE! callout', () => {
      onNewHighScore(effects);
      expect(effects.showEpicCallout).toHaveBeenCalledWith('NEW HIGH SCORE!');
    });

    it('triggers vignette with gold', () => {
      onNewHighScore(effects);
      expect(effects.triggerVignette).toHaveBeenCalledWith('#ffd700');
    });
  });

  describe('onVictory', () => {
    let effects: ReturnType<typeof makeMockEffects>;
    beforeEach(() => { effects = makeMockEffects(); });

    it('triggers confetti twice', () => {
      onVictory(effects);
      expect(effects.triggerConfetti).toHaveBeenCalledTimes(2);
    });

    it('shows VICTORY! callout', () => {
      onVictory(effects);
      expect(effects.showEpicCallout).toHaveBeenCalledWith('VICTORY!');
    });

    it('triggers screen shake', () => {
      onVictory(effects);
      expect(effects.triggerScreenShake).toHaveBeenCalled();
    });
  });

  describe('onGameOver', () => {
    let effects: ReturnType<typeof makeMockEffects>;
    beforeEach(() => { effects = makeMockEffects(); });

    it('triggers red vignette', () => {
      onGameOver(effects);
      expect(effects.triggerVignette).toHaveBeenCalledWith('#ff0000');
    });

    it('triggers screen shake', () => {
      onGameOver(effects);
      expect(effects.triggerScreenShake).toHaveBeenCalled();
    });

    it('resets combo', () => {
      onGameOver(effects);
      expect(effects.resetCombo).toHaveBeenCalled();
    });
  });

  describe('onMistake', () => {
    let effects: ReturnType<typeof makeMockEffects>;
    beforeEach(() => { effects = makeMockEffects(); });

    it('triggers vignette with red tint', () => {
      onMistake(effects);
      expect(effects.triggerVignette).toHaveBeenCalledWith('#ff4444');
    });

    it('triggers screen shake with intensity 1', () => {
      onMistake(effects);
      expect(effects.triggerScreenShake).toHaveBeenCalledWith(1);
    });
  });

  describe('onMilestone', () => {
    let effects: ReturnType<typeof makeMockEffects>;
    beforeEach(() => { effects = makeMockEffects(); });

    it('triggers shockwave with orange color', () => {
      onMilestone(effects, 10);
      expect(effects.triggerShockwave).toHaveBeenCalledWith(50, 50, '#ff6b00');
    });

    it('shows milestone callout', () => {
      onMilestone(effects, 25);
      expect(effects.showEpicCallout).toHaveBeenCalledWith('25!');
    });

    it('triggers sparks for milestone >= 50', () => {
      onMilestone(effects, 50);
      expect(effects.triggerSparks).toHaveBeenCalled();
    });

    it('does NOT trigger sparks for milestone < 50', () => {
      onMilestone(effects, 25);
      expect(effects.triggerSparks).not.toHaveBeenCalled();
    });

    it('triggers confetti for milestone >= 100', () => {
      onMilestone(effects, 100);
      expect(effects.triggerConfetti).toHaveBeenCalled();
    });

    it('accepts custom x/y coordinates', () => {
      onMilestone(effects, 10, 30, 70);
      expect(effects.triggerShockwave).toHaveBeenCalledWith(30, 70, '#ff6b00');
    });
  });

  describe('onMultiClear', () => {
    let effects: ReturnType<typeof makeMockEffects>;
    beforeEach(() => { effects = makeMockEffects(); });

    it('shows DOUBLE! for count 2', () => {
      onMultiClear(effects, 2);
      expect(effects.showEpicCallout).toHaveBeenCalledWith('DOUBLE!');
    });

    it('shows TRIPLE! for count 3', () => {
      onMultiClear(effects, 3);
      expect(effects.showEpicCallout).toHaveBeenCalledWith('TRIPLE!');
    });

    it('shows QUAD! for count 4', () => {
      onMultiClear(effects, 4);
      expect(effects.showEpicCallout).toHaveBeenCalledWith('QUAD!');
    });

    it('shows MEGA! for count 5', () => {
      onMultiClear(effects, 5);
      expect(effects.showEpicCallout).toHaveBeenCalledWith('MEGA!');
    });

    it('shows MEGA! for count >= 5 (labels cap at 5)', () => {
      onMultiClear(effects, 6);
      expect(effects.showEpicCallout).toHaveBeenCalledWith('MEGA!');
    });

    it('triggers screen shake for count >= 3', () => {
      onMultiClear(effects, 3);
      expect(effects.triggerScreenShake).toHaveBeenCalled();
    });

    it('does NOT trigger screen shake for count < 3', () => {
      onMultiClear(effects, 2);
      expect(effects.triggerScreenShake).not.toHaveBeenCalled();
    });

    it('triggers confetti for count >= 4', () => {
      onMultiClear(effects, 4);
      expect(effects.triggerConfetti).toHaveBeenCalled();
    });
  });

  describe('onSpecialModeActivate', () => {
    let effects: ReturnType<typeof makeMockEffects>;
    beforeEach(() => { effects = makeMockEffects(); });

    it('shows custom mode name as callout', () => {
      onSpecialModeActivate(effects, 'FEVER MODE!');
      expect(effects.showEpicCallout).toHaveBeenCalledWith('FEVER MODE!');
    });

    it('defaults to FIRE MODE! when no name given', () => {
      onSpecialModeActivate(effects);
      expect(effects.showEpicCallout).toHaveBeenCalledWith('FIRE MODE!');
    });

    it('triggers confetti', () => {
      onSpecialModeActivate(effects);
      expect(effects.triggerConfetti).toHaveBeenCalled();
    });

    it('triggers orange vignette', () => {
      onSpecialModeActivate(effects);
      expect(effects.triggerVignette).toHaveBeenCalledWith('#ff6b00');
    });

    it('triggers screen shake', () => {
      onSpecialModeActivate(effects);
      expect(effects.triggerScreenShake).toHaveBeenCalled();
    });
  });
});
