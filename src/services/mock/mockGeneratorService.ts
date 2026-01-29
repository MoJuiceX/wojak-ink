/**
 * Mock Generator Service
 *
 * Placeholder - real data is loaded from generatorService.
 * This file is kept for compatibility but not used.
 */

import type { Trait, MouthSelection } from '@/types/generator';
import type { UILayerName } from '@/lib/wojakRules';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface TraitCounts {
  total: number;
  byLayer: Record<UILayerName, number>;
}

export class MockGeneratorService {
  async fetchAllTraits(): Promise<Record<UILayerName, Trait[]>> {
    await delay(200);
    return {
      Background: [],
      Base: [],
      Clothes: [],
      FacialHair: [],
      MouthBase: [],
      MouthItem: [],
      Mask: [],
      Eyes: [],
      Head: [],
    };
  }

  async fetchTraitsForLayer(layer: UILayerName): Promise<Trait[]> {
    void layer;
    await delay(100);
    return [];
  }

  async fetchTraitById(id: string): Promise<Trait | null> {
    void id;
    await delay(50);
    return null;
  }

  async fetchTraitCounts(): Promise<TraitCounts> {
    await delay(50);
    return {
      total: 0,
      byLayer: {
        Background: 0,
        Base: 0,
        Clothes: 0,
        FacialHair: 0,
        MouthBase: 0,
        MouthItem: 0,
        Mask: 0,
        Eyes: 0,
        Head: 0,
      },
    };
  }

  async getRandomTraitForLayer(layer: UILayerName): Promise<Trait | null> {
    void layer;
    await delay(50);
    return null;
  }

  async getRandomMouthSelection(): Promise<MouthSelection> {
    await delay(50);
    return {
      underlay: null,
      base: null,
      overlay: null,
      exclusive: null,
    };
  }
}

// Singleton instance
export const mockGeneratorService = new MockGeneratorService();
