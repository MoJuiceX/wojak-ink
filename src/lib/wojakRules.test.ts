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
      expect(result.disabledOptions?.Mask).toContain('Copium');
      expect(result.forceSelections?.Mask).toBe('');
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
      expect(result.disabledOptions?.Clothes).toContain('Astronaut');
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
      expect(result.forceSelections?.Eyes).toBe('');
      expect(result.clearSelections).toContain('Eyes');
      expect(result.disabledOptions?.Eyes).toContain('Night Vision');
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
      expect(result.disabledOptions?.Eyes).toContain('Night Vision');
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

    it('full-face mask disables Laser Eyes (Eyes layer)', () => {
      const resolver = createMockResolver(
        {
          Base: DEFAULT_BASE_PATH,
          MouthBase: DEFAULT_MOUTHBASE_PATH,
          Clothes: DEFAULT_CLOTHES_PATH,
          Mask: '/mask/skull-mask.png',
          Eyes: '/eyes/laser-eyes.png',
        },
        {}
      );
      const result = getDisabledLayers(resolver);
      expect(result.disabledOptions?.Eyes).toContain('Laser');
      expect(result.disabledOptionReasons?.Eyes?.['Laser-Eyes']).toBeDefined();
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
