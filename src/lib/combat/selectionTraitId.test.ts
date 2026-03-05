import { describe, expect, it } from 'vitest';
import { deriveCombatTraitIdFromPath } from './selectionTraitId';

describe('deriveCombatTraitIdFromPath', () => {
  it('maps background scene paths to Background_* trait ids', () => {
    const id = deriveCombatTraitIdFromPath(
      'Background',
      '/assets/wojak-layers/BACKGROUND/Scene/BACKGROUND_Everythings-Fine.png'
    );
    expect(id).toBe('Background_Everythings-Fine');
  });

  it('normalizes apostrophes for background ids', () => {
    const id = deriveCombatTraitIdFromPath(
      'Background',
      "/assets/wojak-layers/BACKGROUND/Scene/BACKGROUND_Mom's Basement.png"
    );
    expect(id).toBe('Background_Moms-Basement');
  });

  it('maps solid-color background sentinel', () => {
    expect(deriveCombatTraitIdFromPath('Background', '__solid__')).toBe('Background_Solid-Color');
  });

  it('maps price overlay background sentinels', () => {
    expect(deriveCombatTraitIdFromPath('Background', '__solid__+__price_up__')).toBe('Background_Price-Up');
    expect(deriveCombatTraitIdFromPath('Background', '__solid__+__price_down__')).toBe('Background_Price-Down');
  });

  it('keeps existing fallback behavior for non-background layers', () => {
    const id = deriveCombatTraitIdFromPath(
      'Head',
      '/assets/wojak-layers/HEAD/HEAD_SWAT-Helmet.png'
    );
    expect(id).toBe('HEAD_HEAD_SWAT-Helmet');
  });

  it('returns null for unsupported sentinel paths', () => {
    expect(deriveCombatTraitIdFromPath('Background', '__unknown__')).toBeNull();
  });
});
