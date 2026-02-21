/**
 * Unit tests for wojak rules engine.
 * Uses a mock resolver (getTraitId / getPath) to exercise getDisabledLayers.
 */

import { describe, it, expect } from 'vitest';
import type { UILayerName } from '@/lib/layerRegistry';
import type { SelectionResolver } from '@/lib/selectionResolver';
import { KNOWN_TRAIT_IDS } from '@/lib/generatorTraitIds';
import { isSelectionPathEmpty } from '@/types/generator';
import {
  getDisabledLayers,
  isLayerDisabled,
  getDisabledReason,
} from '@/lib/wojakRules';
import {
  DEFAULT_BASE_PATH,
  DEFAULT_MOUTHBASE_PATH,
  DEFAULT_CLOTHES_PATH,
} from '@/lib/layerRegistry';

/** Create a mock resolver from path/traitId maps (layer → path, layer → traitId). */
function createMockResolver(
  paths: Partial<Record<UILayerName | string, string>> = {},
  traitIds: Partial<Record<UILayerName, string>> = {}
): SelectionResolver {
  return {
    getTraitId(layer: UILayerName): string | null {
      const tid = traitIds[layer];
      return tid ?? null;
    },
    getPath(layer: UILayerName | string): string | undefined {
      const p = paths[layer as UILayerName];
      return p && !isSelectionPathEmpty(p) ? p : undefined;
    },
  };
}

describe('wojakRules', () => {
  describe('getDisabledLayers', () => {
    it('returns no disabled layers when Base, MouthBase, Clothes are set', () => {
      const resolver = createMockResolver(
        {
          Base: DEFAULT_BASE_PATH,
          MouthBase: DEFAULT_MOUTHBASE_PATH,
          Clothes: DEFAULT_CLOTHES_PATH,
        },
        {}
      );
      const result = getDisabledLayers(resolver);
      expect(result.disabledLayers).not.toContain('Base');
      expect(result.disabledLayers).not.toContain('Clothes');
      expect(result.disabledLayers).not.toContain('MouthBase');
    });

    it('forces Base to Classic when Base empty but other layer selected', () => {
      const resolver = createMockResolver(
        { Clothes: DEFAULT_CLOTHES_PATH },
        {}
      );
      const result = getDisabledLayers(resolver);
      expect(result.forceSelections?.Base).toBe(DEFAULT_BASE_PATH);
    });

    it('forces MouthBase to Numb when MouthBase empty', () => {
      const resolver = createMockResolver({ Base: DEFAULT_BASE_PATH }, {});
      const result = getDisabledLayers(resolver);
      expect(result.forceSelections?.MouthBase).toBe(DEFAULT_MOUTHBASE_PATH);
    });

    it('forces Clothes to Tee when Clothes empty', () => {
      const resolver = createMockResolver(
        { Base: DEFAULT_BASE_PATH, MouthBase: DEFAULT_MOUTHBASE_PATH },
        {}
      );
      const result = getDisabledLayers(resolver);
      expect(result.forceSelections?.Clothes).toBe(DEFAULT_CLOTHES_PATH);
    });

    it('disables Head when Astronaut is selected', () => {
      const resolver = createMockResolver(
        {
          Base: DEFAULT_BASE_PATH,
          Clothes: '/some/Clothes_Astronaut.png',
          MouthBase: DEFAULT_MOUTHBASE_PATH,
          Head: '/some/Head_bandana.png',
        },
        { Clothes: KNOWN_TRAIT_IDS.Clothes_Astronaut }
      );
      const result = getDisabledLayers(resolver);
      expect(result.disabledLayers).toContain('Head');
      expect(result.reasons?.Head).toBeDefined();
    });

    it('Astronaut + Pizza: forces MouthBase to numb', () => {
      const resolver = createMockResolver(
        {
          Base: DEFAULT_BASE_PATH,
          Clothes: '/astronaut.png',
          MouthBase: '/assets/wojak-layers/MOUTH/MOUTH_Pizza.png',
        },
        { Clothes: KNOWN_TRAIT_IDS.Clothes_Astronaut, MouthBase: KNOWN_TRAIT_IDS.MouthBase_Pizza }
      );
      const result = getDisabledLayers(resolver);
      expect(result.forceSelections?.MouthBase).toBe(DEFAULT_MOUTHBASE_PATH);
      expect(result.disabledOptions?.MouthBase).toContain('Pizza');
    });

    it('disables Head when Bepe suit, Pepe suit, Goose suit, Pickle suit, Proof of Prayer, Sonic suit, or Gopher suit is selected', () => {
      const suits = [
        'Clothes_Bepe-suit',
        'Clothes_Pepe-suit',
        'Clothes_Goose-suit',
        'Clothes_Pickle-suit',
        'Clothes_Proof-of-prayer',
        'Clothes_Sonic-suit',
        'Clothes_gopher-suit',
      ] as const;
      for (const traitId of suits) {
        const resolver = createMockResolver(
          {
            Base: DEFAULT_BASE_PATH,
            Clothes: '/clothes/suit.png',
            MouthBase: DEFAULT_MOUTHBASE_PATH,
          },
          { Clothes: traitId }
        );
        const result = getDisabledLayers(resolver);
        expect(result.disabledLayers, `Head should be disabled for ${traitId}`).toContain('Head');
      }
    });

    it('Astronaut and Copium Mask mutual exclusion: disables Copium when Astronaut selected', () => {
      const resolver = createMockResolver(
        {
          Base: DEFAULT_BASE_PATH,
          Clothes: '/astronaut.png',
          MouthBase: DEFAULT_MOUTHBASE_PATH,
          Mask: '/copium.png',
        },
        {
          Clothes: KNOWN_TRAIT_IDS.Clothes_Astronaut,
          Mask: KNOWN_TRAIT_IDS.Mask_Copium,
        }
      );
      const result = getDisabledLayers(resolver);
      // Mutual exclusion now handled by suspend/restore in reducer — no graying out
      expect((result.disabledOptions?.Mask ?? []).includes('Copium')).toBe(false);
      expect(result.forceSelections?.Mask ?? '').toBe('');
    });

    it('Astronaut and Copium: disables Astronaut option when only Copium selected', () => {
      const resolver = createMockResolver(
        {
          Base: DEFAULT_BASE_PATH,
          Clothes: DEFAULT_CLOTHES_PATH,
          MouthBase: DEFAULT_MOUTHBASE_PATH,
          Mask: '/copium.png',
        },
        { Mask: KNOWN_TRAIT_IDS.Mask_Copium }
      );
      const result = getDisabledLayers(resolver);
      // Mutual exclusion now handled by suspend/restore in reducer — no graying out
      expect((result.disabledOptions?.Clothes ?? []).includes('Astronaut')).toBe(false);
    });

    it('Astronaut and Night Vision: clears Eyes and disables Night Vision when Astronaut selected', () => {
      const resolver = createMockResolver(
        {
          Base: DEFAULT_BASE_PATH,
          Clothes: '/astronaut.png',
          MouthBase: DEFAULT_MOUTHBASE_PATH,
          Eyes: '/eyes/night-vision.png',
        },
        {
          Clothes: KNOWN_TRAIT_IDS.Clothes_Astronaut,
          Eyes: KNOWN_TRAIT_IDS.Eyes_NightVision,
        }
      );
      const result = getDisabledLayers(resolver);
      // Mutual exclusion now handled by suspend/restore in reducer — no graying out
      expect(result.forceSelections?.Eyes ?? undefined).toBeUndefined();
      expect((result.clearSelections ?? []).includes('Eyes')).toBe(false);
      expect((result.disabledOptions?.Eyes ?? []).includes('Night Vision')).toBe(false);
    });

    it('Astronaut disables Night Vision option when Astronaut selected (no Eyes)', () => {
      const resolver = createMockResolver(
        {
          Base: DEFAULT_BASE_PATH,
          Clothes: '/astronaut.png',
          MouthBase: DEFAULT_MOUTHBASE_PATH,
        },
        { Clothes: KNOWN_TRAIT_IDS.Clothes_Astronaut }
      );
      const result = getDisabledLayers(resolver);
      // Mutual exclusion now handled by suspend/restore in reducer — no graying out
      expect((result.disabledOptions?.Eyes ?? []).includes('Night Vision')).toBe(false);
    });

    it('disables MouthItem when Pipe (MouthBase) is selected', () => {
      const resolver = createMockResolver(
        {
          Base: DEFAULT_BASE_PATH,
          MouthBase: '/mouth/pipe.png',
          Clothes: DEFAULT_CLOTHES_PATH,
        },
        { MouthBase: KNOWN_TRAIT_IDS.MouthBase_Pipe }
      );
      const result = getDisabledLayers(resolver);
      expect(result.disabledLayers).toContain('MouthItem');
      expect(result.reasons?.MouthItem).toMatch(/pipe|Pipe/i);
    });

    it('disables MouthItem when BubbleGum (MouthBase) is selected', () => {
      const resolver = createMockResolver(
        {
          Base: DEFAULT_BASE_PATH,
          MouthBase: '/mouth/bubblegum.png',
          Clothes: DEFAULT_CLOTHES_PATH,
        },
        { MouthBase: KNOWN_TRAIT_IDS.MouthBase_BubbleGum }
      );
      const result = getDisabledLayers(resolver);
      expect(result.disabledLayers).toContain('MouthItem');
      expect(result.reasons?.MouthItem).toMatch(/bubble|Bubble/i);
    });

    it('disables MouthItem when Pizza (MouthBase) is selected', () => {
      const resolver = createMockResolver(
        {
          Base: DEFAULT_BASE_PATH,
          MouthBase: '/mouth/pizza.png',
          Clothes: DEFAULT_CLOTHES_PATH,
        },
        { MouthBase: KNOWN_TRAIT_IDS.MouthBase_Pizza }
      );
      const result = getDisabledLayers(resolver);
      expect(result.disabledLayers).toContain('MouthItem');
    });

    it('disables MouthItem when Vampire (MouthBase) is selected and clears Cig/Joint/Cohiba', () => {
      const resolver = createMockResolver(
        {
          Base: DEFAULT_BASE_PATH,
          MouthBase: '/mouth/drac.png',
          MouthItem: '/mouth/cig.png',
          Clothes: DEFAULT_CLOTHES_PATH,
        },
        { MouthBase: KNOWN_TRAIT_IDS.MouthBase_Vampire, MouthItem: KNOWN_TRAIT_IDS.MouthItem_Cig }
      );
      const result = getDisabledLayers(resolver);
      expect(result.disabledLayers).toContain('MouthItem');
      expect(result.forceSelections?.MouthItem).toBe('');
      expect(result.clearSelections).toContain('MouthItem');
      expect(result.disabledOptions?.MouthItem).toContain('Cig');
      expect(result.disabledOptions?.MouthItem).toContain('Cohiba');
      expect(result.disabledOptions?.MouthItem).toContain('Joint');
    });

    it('Vampire disables only Neckbeard (FacialHair); Stache remains allowed', () => {
      const resolver = createMockResolver(
        {
          Base: DEFAULT_BASE_PATH,
          MouthBase: '/mouth/drac.png',
          Clothes: DEFAULT_CLOTHES_PATH,
        },
        { MouthBase: KNOWN_TRAIT_IDS.MouthBase_Vampire }
      );
      const result = getDisabledLayers(resolver);
      expect(result.disabledLayers).not.toContain('FacialHair');
      expect(result.disabledOptions?.FacialHair).toContain('Neckbeard');
      expect(result.disabledOptions?.FacialHair).toContain('neckbeard');
      expect(result.disabledOptionReasons?.FacialHair?.Neckbeard).toBe('Not available with Vampire Teeth');
    });

    it('Vampire + Neckbeard selected: clears FacialHair and greys out Neckbeard', () => {
      const resolver = createMockResolver(
        {
          Base: DEFAULT_BASE_PATH,
          MouthBase: '/mouth/drac.png',
          FacialHair: '/mouth/neckbeard.png',
          Clothes: DEFAULT_CLOTHES_PATH,
        },
        { MouthBase: KNOWN_TRAIT_IDS.MouthBase_Vampire }
      );
      const result = getDisabledLayers(resolver);
      expect(result.forceSelections?.FacialHair).toBe('');
      expect(result.clearSelections).toContain('FacialHair');
      expect(result.disabledOptions?.FacialHair).toContain('Neckbeard');
    });

    it('Vampire + Stache: FacialHair layer not disabled and Stache not in disabledOptions', () => {
      const resolver = createMockResolver(
        {
          Base: DEFAULT_BASE_PATH,
          MouthBase: '/mouth/drac.png',
          FacialHair: '/mouth/stach.png',
          Clothes: DEFAULT_CLOTHES_PATH,
        },
        { MouthBase: KNOWN_TRAIT_IDS.MouthBase_Vampire }
      );
      const result = getDisabledLayers(resolver);
      expect(result.disabledLayers).not.toContain('FacialHair');
      const facialOpts = result.disabledOptions?.FacialHair ?? [];
      expect(facialOpts).not.toContain('Stache');
      expect(facialOpts).not.toContain('stach');
    });

    it('Fake mask disables Laser Eyes (Eyes layer)', () => {
      const resolver = createMockResolver(
        {
          Base: DEFAULT_BASE_PATH,
          MouthBase: DEFAULT_MOUTHBASE_PATH,
          Clothes: DEFAULT_CLOTHES_PATH,
          Mask: '/mask/fake-mask.png',
          Eyes: '/eyes/laser-eyes.png',
        },
        {}
      );
      const result = getDisabledLayers(resolver);
      // Fake mask / Laser Eyes mutual exclusion now handled by suspend/restore in reducer
      expect((result.disabledOptions?.Eyes ?? []).includes('Laser')).toBe(false);
      expect(result.disabledOptionReasons?.Eyes?.['Laser-Eyes'] ?? undefined).toBeUndefined();
    });

    it('Mask blocks MouthItem and FacialHair', () => {
      const resolver = createMockResolver(
        {
          Base: DEFAULT_BASE_PATH,
          MouthBase: DEFAULT_MOUTHBASE_PATH,
          Clothes: DEFAULT_CLOTHES_PATH,
          Mask: '/mask/hannibal.png',
        },
        {}
      );
      const result = getDisabledLayers(resolver);
      expect(result.disabledLayers).toContain('MouthItem');
      expect(result.disabledLayers).toContain('FacialHair');
    });

    it('Copium Mask disables MouthItem and forces valid MouthBase', () => {
      const resolver = createMockResolver(
        {
          Base: DEFAULT_BASE_PATH,
          MouthBase: '/mouth/pipe.png',
          Clothes: DEFAULT_CLOTHES_PATH,
          Mask: '/copium.png',
        },
        {
          MouthBase: KNOWN_TRAIT_IDS.MouthBase_Pipe,
          Mask: KNOWN_TRAIT_IDS.Mask_Copium,
        }
      );
      const result = getDisabledLayers(resolver);
      expect(result.disabledLayers).toContain('MouthItem');
      expect(result.forceSelections?.MouthBase).toBe(DEFAULT_MOUTHBASE_PATH);
    });

    it('Copium Mask does not disable FacialHair (Neckbeard/Stache can be selected; mask draws on top)', () => {
      const resolver = createMockResolver(
        {
          Base: DEFAULT_BASE_PATH,
          MouthBase: DEFAULT_MOUTHBASE_PATH,
          Clothes: DEFAULT_CLOTHES_PATH,
          Mask: '/mask/copium-mask.png',
        },
        {}
      );
      const result = getDisabledLayers(resolver);
      expect(result.disabledLayers).toContain('MouthItem');
      expect(result.disabledLayers).not.toContain('FacialHair');
    });
  });

  describe('isLayerDisabled', () => {
    it('returns true for Head when Astronaut selected', () => {
      const resolver = createMockResolver(
        { Base: DEFAULT_BASE_PATH, Clothes: '/astronaut.png', MouthBase: DEFAULT_MOUTHBASE_PATH },
        { Clothes: KNOWN_TRAIT_IDS.Clothes_Astronaut }
      );
      expect(isLayerDisabled('Head', resolver)).toBe(true);
    });

    it('returns false for Head when no Astronaut', () => {
      const resolver = createMockResolver(
        { Base: DEFAULT_BASE_PATH, Clothes: DEFAULT_CLOTHES_PATH, MouthBase: DEFAULT_MOUTHBASE_PATH },
        {}
      );
      expect(isLayerDisabled('Head', resolver)).toBe(false);
    });
  });

  describe('getDisabledReason', () => {
    it('returns reason for Head when Astronaut selected', () => {
      const resolver = createMockResolver(
        { Base: DEFAULT_BASE_PATH, Clothes: '/astronaut.png', MouthBase: DEFAULT_MOUTHBASE_PATH },
        { Clothes: KNOWN_TRAIT_IDS.Clothes_Astronaut }
      );
      const reason = getDisabledReason('Head', resolver);
      expect(reason).toBeTruthy();
      expect(reason).toMatch(/suit|helmet/i);
    });

    it('returns null when layer not disabled', () => {
      const resolver = createMockResolver(
        { Base: DEFAULT_BASE_PATH, Clothes: DEFAULT_CLOTHES_PATH, MouthBase: DEFAULT_MOUTHBASE_PATH },
        {}
      );
      expect(getDisabledReason('Head', resolver)).toBeNull();
    });
  });
});

// ── Additional rule coverage ──────────────────────────────────────────────────

describe('wojakRules (extended)', () => {
  /** Shared mock-resolver factory (duplicated here for test isolation) */
  function mkResolver(
    paths: Partial<Record<string, string>> = {},
    traitIds: Partial<Record<string, string>> = {}
  ) {
    return {
      getTraitId(layer: string): string | null {
        return (traitIds as Record<string, string>)[layer] ?? null;
      },
      getPath(layer: string): string | undefined {
        const p = (paths as Record<string, string>)[layer];
        return p && p !== '' && p !== 'None' ? p : undefined;
      },
    };
  }

  // ── Sonic / Pickle / Goose suit disables Bandana ──────────────────────────
  describe('ruleSuitDisablesBandana', () => {
    it('disables Bandana option when Sonic suit is selected', () => {
      const resolver = mkResolver(
        { Base: DEFAULT_BASE_PATH, Clothes: '/sonic-suit.png', MouthBase: DEFAULT_MOUTHBASE_PATH },
        { Clothes: 'Clothes_Sonic-suit' }
      );
      const result = getDisabledLayers(resolver as SelectionResolver);
      expect(result.disabledOptions?.Mask).toContain('Bandana');
    });

    it('clears Bandana selection when Pickle suit is selected', () => {
      const resolver = mkResolver(
        {
          Base: DEFAULT_BASE_PATH,
          Clothes: '/pickle-suit.png',
          MouthBase: DEFAULT_MOUTHBASE_PATH,
          Mask: '/bandana-mask.png',
        },
        { Clothes: 'Clothes_Pickle-suit' }
      );
      const result = getDisabledLayers(resolver as SelectionResolver);
      expect(result.clearSelections).toContain('Mask');
      expect(result.forceSelections?.Mask).toBe('');
    });

    it('disables Bandana option when Goose suit is selected', () => {
      const resolver = mkResolver(
        { Base: DEFAULT_BASE_PATH, Clothes: '/goose-suit.png', MouthBase: DEFAULT_MOUTHBASE_PATH },
        { Clothes: 'Clothes_Goose-suit' }
      );
      const result = getDisabledLayers(resolver as SelectionResolver);
      expect(result.disabledOptions?.Mask).toContain('Bandana');
    });
  });

  // ── Sonic / Pickle / Goose suit disables Hannibal ─────────────────────────
  describe('ruleSuitDisablesHannibal', () => {
    it('disables Hannibal option when Sonic suit is selected', () => {
      const resolver = mkResolver(
        { Base: DEFAULT_BASE_PATH, Clothes: '/sonic-suit.png', MouthBase: DEFAULT_MOUTHBASE_PATH },
        { Clothes: 'Clothes_Sonic-suit' }
      );
      const result = getDisabledLayers(resolver as SelectionResolver);
      expect(result.disabledOptions?.Mask).toContain('Hannibal');
    });

    it('disables suit options when Hannibal mask is selected', () => {
      const resolver = mkResolver(
        { Base: DEFAULT_BASE_PATH, Clothes: DEFAULT_CLOTHES_PATH, MouthBase: DEFAULT_MOUTHBASE_PATH, Mask: '/hannibal.png' },
        {}
      );
      const result = getDisabledLayers(resolver as SelectionResolver);
      expect(result.disabledOptions?.Clothes).toContain('Sonic');
    });

    it('clears Hannibal selection when Goose suit is selected with Hannibal mask', () => {
      const resolver = mkResolver(
        {
          Base: DEFAULT_BASE_PATH,
          Clothes: '/goose-suit.png',
          MouthBase: DEFAULT_MOUTHBASE_PATH,
          Mask: '/hannibal.png',
        },
        { Clothes: 'Clothes_Goose-suit' }
      );
      const result = getDisabledLayers(resolver as SelectionResolver);
      expect(result.clearSelections).toContain('Mask');
    });
  });

  // ── Hannibal Mask removes Neckbeard ───────────────────────────────────────
  describe('ruleHannibalMaskRemovesNeckbeard', () => {
    it('clears FacialHair when Hannibal mask and neckbeard are both selected', () => {
      const resolver = mkResolver(
        {
          Base: DEFAULT_BASE_PATH,
          MouthBase: DEFAULT_MOUTHBASE_PATH,
          Clothes: DEFAULT_CLOTHES_PATH,
          Mask: '/mask/hannibal.png',
          FacialHair: '/facialhair/neckbeard.png',
        },
        {}
      );
      const result = getDisabledLayers(resolver as SelectionResolver);
      expect(result.clearSelections).toContain('FacialHair');
      expect(result.forceSelections?.FacialHair).toBe('');
    });

    it('disables Neckbeard option when only Hannibal mask is selected', () => {
      const resolver = mkResolver(
        {
          Base: DEFAULT_BASE_PATH,
          MouthBase: DEFAULT_MOUTHBASE_PATH,
          Clothes: DEFAULT_CLOTHES_PATH,
          Mask: '/mask/hannibal.png',
        },
        {}
      );
      const result = getDisabledLayers(resolver as SelectionResolver);
      expect(result.disabledOptions?.FacialHair).toContain('Neckbeard');
    });
  });

  // ── Suit disables Neckbeard ───────────────────────────────────────────────
  describe('ruleSuitDisablesNeckbeard', () => {
    it('clears Neckbeard when Sonic suit is active', () => {
      const resolver = mkResolver(
        {
          Base: DEFAULT_BASE_PATH,
          Clothes: '/sonic-suit.png',
          MouthBase: DEFAULT_MOUTHBASE_PATH,
          FacialHair: '/facialhair/neckbeard.png',
        },
        { Clothes: 'Clothes_Sonic-suit' }
      );
      const result = getDisabledLayers(resolver as SelectionResolver);
      expect(result.clearSelections).toContain('FacialHair');
      expect(result.forceSelections?.FacialHair).toBe('');
    });

    it('disables Sonic and Pickle suit options when Neckbeard is selected', () => {
      const resolver = mkResolver(
        {
          Base: DEFAULT_BASE_PATH,
          Clothes: DEFAULT_CLOTHES_PATH,
          MouthBase: DEFAULT_MOUTHBASE_PATH,
          FacialHair: '/facialhair/neckbeard.png',
        },
        {}
      );
      const result = getDisabledLayers(resolver as SelectionResolver);
      expect(result.disabledOptions?.Clothes).toContain('Sonic');
      expect(result.disabledOptions?.Clothes).toContain('Pickle');
    });
  });

  // ── Firefighter Helmet mutual exclusion ───────────────────────────────────
  describe('ruleFirefighterHelmetEyesExclusion', () => {
    it('disables VR Headset and Night Vision options when Firefighter Helmet is selected', () => {
      const resolver = mkResolver(
        {
          Base: DEFAULT_BASE_PATH,
          MouthBase: DEFAULT_MOUTHBASE_PATH,
          Clothes: DEFAULT_CLOTHES_PATH,
          Head: '/head/firefighter.png',
        },
        { Head: KNOWN_TRAIT_IDS.Head_FirefighterHelmet }
      );
      const result = getDisabledLayers(resolver as SelectionResolver);
      // Firefighter Helmet / Eyes mutual exclusion now handled by suspend/restore in reducer
      expect((result.disabledOptions?.Eyes ?? []).includes('VR headset')).toBe(false);
      expect((result.disabledOptions?.Eyes ?? []).includes('Night Vision')).toBe(false);
    });

    it('clears Eyes when Firefighter Helmet is selected alongside VR Headset', () => {
      const resolver = mkResolver(
        {
          Base: DEFAULT_BASE_PATH,
          MouthBase: DEFAULT_MOUTHBASE_PATH,
          Clothes: DEFAULT_CLOTHES_PATH,
          Head: '/head/firefighter.png',
          Eyes: '/eyes/vr.png',
        },
        {
          Head: KNOWN_TRAIT_IDS.Head_FirefighterHelmet,
          Eyes: KNOWN_TRAIT_IDS.Eyes_VRHeadset,
        }
      );
      const result = getDisabledLayers(resolver as SelectionResolver);
      // Mutual exclusion now handled by suspend/restore in reducer
      expect((result.clearSelections ?? []).includes('Eyes')).toBe(false);
      expect(result.forceSelections?.Eyes ?? undefined).toBeUndefined();
    });

    it('disables Firefighter Helmet option when VR Headset is selected', () => {
      const resolver = mkResolver(
        {
          Base: DEFAULT_BASE_PATH,
          MouthBase: DEFAULT_MOUTHBASE_PATH,
          Clothes: DEFAULT_CLOTHES_PATH,
          Eyes: '/eyes/vr.png',
        },
        { Eyes: KNOWN_TRAIT_IDS.Eyes_VRHeadset }
      );
      const result = getDisabledLayers(resolver as SelectionResolver);
      // Mutual exclusion now handled by suspend/restore in reducer
      expect((result.disabledOptions?.Head ?? []).includes('Firefighter Helmet')).toBe(false);
    });
  });

  // ── Fake mask disables Laser Eyes (other masks allow Laser Eyes) ──────────
  describe('ruleLaserEyesFakeMaskMutualExclusion', () => {
    it('disables Laser Eyes option when Fake mask is selected', () => {
      const resolver = mkResolver(
        {
          Base: DEFAULT_BASE_PATH,
          MouthBase: DEFAULT_MOUTHBASE_PATH,
          Clothes: DEFAULT_CLOTHES_PATH,
          Mask: '/mask/fake-mask.png',
        },
        {}
      );
      const result = getDisabledLayers(resolver as SelectionResolver);
      // Laser Eyes / Fake mask mutual exclusion now handled by suspend/restore in reducer
      expect((result.disabledOptions?.Eyes ?? []).includes('Laser')).toBe(false);
    });

    it('clears Eyes when Fake mask is selected alongside Laser Eyes', () => {
      const resolver = mkResolver(
        {
          Base: DEFAULT_BASE_PATH,
          MouthBase: DEFAULT_MOUTHBASE_PATH,
          Clothes: DEFAULT_CLOTHES_PATH,
          Mask: '/mask/fake-mask.png',
          Eyes: '/eyes/laser-eyes.png',
        },
        {}
      );
      const result = getDisabledLayers(resolver as SelectionResolver);
      // Mutual exclusion now handled by suspend/restore in reducer
      expect((result.clearSelections ?? []).includes('Eyes')).toBe(false);
      expect(result.forceSelections?.Eyes ?? undefined).toBeUndefined();
    });

    it('allows Laser Eyes with Hannibal mask', () => {
      const resolver = mkResolver(
        {
          Base: DEFAULT_BASE_PATH,
          MouthBase: DEFAULT_MOUTHBASE_PATH,
          Clothes: DEFAULT_CLOTHES_PATH,
          Mask: '/mask/hannibal-mask.png',
        },
        {}
      );
      const result = getDisabledLayers(resolver as SelectionResolver);
      // Either Eyes is not in disabledOptions, or it doesn't contain 'Laser'
      const disabledEyes = result.disabledOptions?.Eyes ?? [];
      expect(disabledEyes).not.toContain('Laser');
    });

    it('allows Laser Eyes with Bandana mask', () => {
      const resolver = mkResolver(
        {
          Base: DEFAULT_BASE_PATH,
          MouthBase: DEFAULT_MOUTHBASE_PATH,
          Clothes: DEFAULT_CLOTHES_PATH,
          Mask: '/mask/bandana-mask.png',
        },
        {}
      );
      const result = getDisabledLayers(resolver as SelectionResolver);
      // Either Eyes is not in disabledOptions, or it doesn't contain 'Laser'
      const disabledEyes = result.disabledOptions?.Eyes ?? [];
      expect(disabledEyes).not.toContain('Laser');
    });

    it('disables Fake mask option when Laser Eyes are selected', () => {
      const resolver = mkResolver(
        {
          Base: DEFAULT_BASE_PATH,
          MouthBase: DEFAULT_MOUTHBASE_PATH,
          Clothes: DEFAULT_CLOTHES_PATH,
          Eyes: '/eyes/laser-eyes.png',
        },
        {}
      );
      const result = getDisabledLayers(resolver as SelectionResolver);
      // Laser Eyes / Fake mask mutual exclusion now handled by suspend/restore in reducer
      expect((result.disabledOptions?.Mask ?? []).includes('Fake')).toBe(false);
      // Other masks should NOT be disabled
      expect(result.disabledLayers).not.toContain('Mask');
    });
  });

  // ── Facial hair requires MouthBase ───────────────────────────────────────
  describe('ruleFacialHairRequiresMouthBase', () => {
    it('forces MouthBase to default when FacialHair is selected without MouthBase', () => {
      const resolver = mkResolver(
        {
          Base: DEFAULT_BASE_PATH,
          Clothes: DEFAULT_CLOTHES_PATH,
          FacialHair: '/facialhair/beard.png',
        },
        {}
      );
      const result = getDisabledLayers(resolver as SelectionResolver);
      expect(result.forceSelections?.MouthBase).toBe(DEFAULT_MOUTHBASE_PATH);
    });
  });

  // ── Cig/Joint/Cohiba requires MouthBase ──────────────────────────────────
  describe('ruleCigJointCohibaRequiresMouthBase', () => {
    it('forces MouthBase to default when Cig MouthItem is selected without MouthBase', () => {
      const resolver = mkResolver(
        {
          Base: DEFAULT_BASE_PATH,
          Clothes: DEFAULT_CLOTHES_PATH,
          MouthItem: '/mouth/cig.png',
        },
        { MouthItem: KNOWN_TRAIT_IDS.MouthItem_Cig }
      );
      const result = getDisabledLayers(resolver as SelectionResolver);
      expect(result.forceSelections?.MouthBase).toBe(DEFAULT_MOUTHBASE_PATH);
    });

    it('forces MouthBase to default when Joint MouthItem is selected without MouthBase', () => {
      const resolver = mkResolver(
        {
          Base: DEFAULT_BASE_PATH,
          Clothes: DEFAULT_CLOTHES_PATH,
          MouthItem: '/mouth/joint.png',
        },
        { MouthItem: KNOWN_TRAIT_IDS.MouthItem_Joint }
      );
      const result = getDisabledLayers(resolver as SelectionResolver);
      expect(result.forceSelections?.MouthBase).toBe(DEFAULT_MOUTHBASE_PATH);
    });
  });

  // ── Mask forces Numb mouth ────────────────────────────────────────────────
  describe('ruleMaskForcesNumbMouth', () => {
    it('forces MouthBase to Numb when a non-Copium non-Hannibal mask is selected with Pizza mouth', () => {
      const resolver = mkResolver(
        {
          Base: DEFAULT_BASE_PATH,
          MouthBase: '/mouth/pizza.png',
          Clothes: DEFAULT_CLOTHES_PATH,
          Mask: '/mask/bandana.png',
        },
        { MouthBase: KNOWN_TRAIT_IDS.MouthBase_Pizza }
      );
      const result = getDisabledLayers(resolver as SelectionResolver);
      expect(result.forceSelections?.MouthBase).toBe(DEFAULT_MOUTHBASE_PATH);
    });

    it('forces MouthBase to Numb when Hannibal mask + non-numb mouth is selected', () => {
      const resolver = mkResolver(
        {
          Base: DEFAULT_BASE_PATH,
          MouthBase: '/mouth/pizza.png',
          Clothes: DEFAULT_CLOTHES_PATH,
          Mask: '/mask/hannibal.png',
        },
        { MouthBase: KNOWN_TRAIT_IDS.MouthBase_Pizza }
      );
      const result = getDisabledLayers(resolver as SelectionResolver);
      expect(result.forceSelections?.MouthBase).toBe(DEFAULT_MOUTHBASE_PATH);
    });
  });
});
