// src/config/bigpulpResponses.test.ts
import { describe, it, expect } from 'vitest';
import {
  BIGPULP_RESPONSES,
  generateBigPulpResponse,
  getSearchingMessage,
  getErrorMessage,
  getWelcomeMessage,
} from './bigpulpResponses';
import type { NFTAnalysis, RarityTier } from '@/types/bigpulp';

// ============================================
// Test helpers
// ============================================

function makeAnalysis(overrides: Partial<NFTAnalysis> = {}): NFTAnalysis {
  return {
    nft: {
      id: 'WFP-0001',
      tokenId: 'token-001',
      name: 'Wojak Farmer #1',
      characterType: 'wojak',
      imageUrl: 'https://example.com/img.png',
      thumbnailUrl: 'https://example.com/thumb.png',
      traits: [],
    },
    rarity: {
      rank: 100,
      totalSupply: 4200,
      percentile: 2.4,
      score: 95,
      tier: 'epic',
      typeRank: 10,
      typeTotal: 800,
    },
    market: {
      isListed: false,
      floorPrice: 1.5,
      floorPriceUSD: 50,
    },
    badges: [],
    provenance: {
      highValueTraits: [],
      traitSynergies: [],
    },
    rareCombos: [],
    ...overrides,
  };
}

function makeRarityTierAnalysis(tier: RarityTier): NFTAnalysis {
  return makeAnalysis({ rarity: { rank: 1, totalSupply: 4200, percentile: 1, score: 100, tier, typeRank: 1, typeTotal: 100 } });
}

describe('bigpulpResponses', () => {
  // ============================================
  // BIGPULP_RESPONSES constant
  // ============================================
  describe('BIGPULP_RESPONSES constant', () => {
    it('has welcome messages array with at least 2 entries', () => {
      expect(Array.isArray(BIGPULP_RESPONSES.welcome)).toBe(true);
      expect(BIGPULP_RESPONSES.welcome.length).toBeGreaterThanOrEqual(2);
    });

    it('has searching messages array with at least 2 entries', () => {
      expect(BIGPULP_RESPONSES.searching.length).toBeGreaterThanOrEqual(2);
    });

    it('has legendary messages array', () => {
      expect(Array.isArray(BIGPULP_RESPONSES.legendary)).toBe(true);
      expect(BIGPULP_RESPONSES.legendary.length).toBeGreaterThan(0);
    });

    it('has epic messages array', () => {
      expect(BIGPULP_RESPONSES.epic.length).toBeGreaterThan(0);
    });

    it('has rare messages array', () => {
      expect(BIGPULP_RESPONSES.rare.length).toBeGreaterThan(0);
    });

    it('has uncommon messages array', () => {
      expect(BIGPULP_RESPONSES.uncommon.length).toBeGreaterThan(0);
    });

    it('has common messages array', () => {
      expect(BIGPULP_RESPONSES.common.length).toBeGreaterThan(0);
    });

    it('hasCrown messages contain "crown" in at least one entry (case-insensitive)', () => {
      const hasCrown = BIGPULP_RESPONSES.hasCrown.some((m) =>
        m.toLowerCase().includes('crown')
      );
      expect(hasCrown).toBe(true);
    });

    it('goodDeal and overpriced are separate arrays', () => {
      expect(BIGPULP_RESPONSES.goodDeal).not.toEqual(BIGPULP_RESPONSES.overpriced);
    });

    it('notFound and error are separate arrays', () => {
      expect(BIGPULP_RESPONSES.notFound).not.toEqual(BIGPULP_RESPONSES.error);
    });

    it('all message categories have at least one non-empty string', () => {
      const categories = ['welcome', 'searching', 'legendary', 'epic', 'rare', 'uncommon', 'common'] as const;
      categories.forEach((cat) => {
        BIGPULP_RESPONSES[cat].forEach((msg) => {
          expect(typeof msg).toBe('string');
          expect(msg.length).toBeGreaterThan(0);
        });
      });
    });
  });

  // ============================================
  // getWelcomeMessage
  // ============================================
  describe('getWelcomeMessage', () => {
    it('returns a string', () => {
      expect(typeof getWelcomeMessage()).toBe('string');
    });

    it('returns a non-empty string', () => {
      expect(getWelcomeMessage().length).toBeGreaterThan(0);
    });

    it('returns a value from BIGPULP_RESPONSES.welcome', () => {
      const msg = getWelcomeMessage();
      expect(BIGPULP_RESPONSES.welcome).toContain(msg);
    });
  });

  // ============================================
  // getSearchingMessage
  // ============================================
  describe('getSearchingMessage', () => {
    it('returns a string', () => {
      expect(typeof getSearchingMessage()).toBe('string');
    });

    it('returns a non-empty string', () => {
      expect(getSearchingMessage().length).toBeGreaterThan(0);
    });

    it('returns a value from BIGPULP_RESPONSES.searching', () => {
      const msg = getSearchingMessage();
      expect(BIGPULP_RESPONSES.searching).toContain(msg);
    });
  });

  // ============================================
  // getErrorMessage
  // ============================================
  describe('getErrorMessage', () => {
    it('returns a notFound message string', () => {
      const msg = getErrorMessage('notFound');
      expect(typeof msg).toBe('string');
      expect(BIGPULP_RESPONSES.notFound).toContain(msg);
    });

    it('returns an error message string', () => {
      const msg = getErrorMessage('error');
      expect(typeof msg).toBe('string');
      expect(BIGPULP_RESPONSES.error).toContain(msg);
    });

    it('notFound and error messages can differ', () => {
      // They come from different arrays so their content is different
      const nf: readonly string[] = BIGPULP_RESPONSES.notFound;
      const err: readonly string[] = BIGPULP_RESPONSES.error;
      const overlap = nf.filter((m) => err.includes(m));
      expect(overlap.length).toBe(0);
    });
  });

  // ============================================
  // generateBigPulpResponse — null analysis
  // ============================================
  describe('generateBigPulpResponse with null analysis', () => {
    it('returns an object with a message property', () => {
      const response = generateBigPulpResponse(null);
      expect(response).toHaveProperty('message');
    });

    it('returns mood "chill" for null analysis', () => {
      const response = generateBigPulpResponse(null);
      expect(response.mood).toBe('chill');
    });

    it('returns a welcome message for null analysis', () => {
      const response = generateBigPulpResponse(null);
      expect(BIGPULP_RESPONSES.welcome).toContain(response.message);
    });

    it('returns a string message', () => {
      const response = generateBigPulpResponse(null);
      expect(typeof response.message).toBe('string');
    });
  });

  // ============================================
  // generateBigPulpResponse — rarity tiers
  // ============================================
  describe('generateBigPulpResponse rarity tiers', () => {
    it('legendary tier sets mood to "impressed"', () => {
      const analysis = makeRarityTierAnalysis('legendary');
      const response = generateBigPulpResponse(analysis);
      expect(response.mood).toBe('impressed');
    });

    it('epic tier sets mood to "excited"', () => {
      const analysis = makeRarityTierAnalysis('epic');
      const response = generateBigPulpResponse(analysis);
      expect(response.mood).toBe('excited');
    });

    it('rare tier sets mood to "excited"', () => {
      const analysis = makeRarityTierAnalysis('rare');
      const response = generateBigPulpResponse(analysis);
      expect(response.mood).toBe('excited');
    });

    it('uncommon tier sets mood to "neutral"', () => {
      const analysis = makeRarityTierAnalysis('uncommon');
      const response = generateBigPulpResponse(analysis);
      expect(response.mood).toBe('neutral');
    });

    it('common tier sets mood to "chill"', () => {
      const analysis = makeRarityTierAnalysis('common');
      const response = generateBigPulpResponse(analysis);
      expect(response.mood).toBe('chill');
    });

    it('legendary message comes from legendary pool', () => {
      const analysis = makeRarityTierAnalysis('legendary');
      const response = generateBigPulpResponse(analysis);
      expect(BIGPULP_RESPONSES.legendary).toContain(response.message);
    });

    it('common message comes from common pool', () => {
      const analysis = makeRarityTierAnalysis('common');
      const response = generateBigPulpResponse(analysis);
      expect(BIGPULP_RESPONSES.common).toContain(response.message);
    });
  });

  // ============================================
  // generateBigPulpResponse — badges
  // ============================================
  describe('generateBigPulpResponse badges', () => {
    it('crown-holder badge sets mood to "impressed"', () => {
      const analysis = makeAnalysis({
        badges: [{
          id: 'badge-crown',
          type: 'crown-holder',
          label: 'Crown Holder',
          description: 'Top 100',
          color: 'gold',
          icon: '👑',
          priority: 1,
        }],
      });
      const response = generateBigPulpResponse(analysis);
      expect(response.mood).toBe('impressed');
    });

    it('response has followUp array', () => {
      const analysis = makeAnalysis();
      const response = generateBigPulpResponse(analysis);
      expect(Array.isArray(response.followUp)).toBe(true);
    });
  });

  // ============================================
  // generateBigPulpResponse — market conditions
  // ============================================
  describe('generateBigPulpResponse market', () => {
    it('listed NFT with priceVsFloor > 50 sets mood to "suspicious"', () => {
      const analysis = makeAnalysis({
        market: {
          isListed: true,
          floorPrice: 1.0,
          floorPriceUSD: 30,
          priceVsFloor: 80,
        },
      });
      const response = generateBigPulpResponse(analysis);
      expect(response.mood).toBe('suspicious');
    });

    it('listed NFT with priceVsFloor < -20 sets mood to "excited"', () => {
      const analysis = makeAnalysis({
        rarity: { rank: 100, totalSupply: 4200, percentile: 2.4, score: 95, tier: 'epic', typeRank: 10, typeTotal: 800 },
        market: {
          isListed: true,
          floorPrice: 1.0,
          floorPriceUSD: 30,
          priceVsFloor: -30,
        },
      });
      const response = generateBigPulpResponse(analysis);
      expect(response.mood).toBe('excited');
    });

    it('returns a valid BigPulpResponse shape', () => {
      const analysis = makeAnalysis();
      const response = generateBigPulpResponse(analysis);
      expect(typeof response.message).toBe('string');
      expect(typeof response.mood).toBe('string');
    });
  });

  // ============================================
  // generateBigPulpResponse — trait head variant
  // ============================================
  describe('generateBigPulpResponse headVariant', () => {
    it('sets headVariant to "laser-eyes" when NFT has Laser Eyes trait', () => {
      const analysis = makeAnalysis({
        nft: {
          id: 'WFP-0001',
          tokenId: 'token-001',
          name: 'Wojak Farmer #1',
          characterType: 'wojak',
          imageUrl: 'https://example.com/img.png',
          thumbnailUrl: 'https://example.com/thumb.png',
          traits: [{ category: 'Eyes', value: 'Laser Eyes' }],
        },
      });
      const response = generateBigPulpResponse(analysis);
      expect(response.headVariant).toBe('laser-eyes');
    });

    it('sets headVariant to "crown" when NFT has Crown trait', () => {
      const analysis = makeAnalysis({
        nft: {
          id: 'WFP-0002',
          tokenId: 'token-002',
          name: 'Wojak Farmer #2',
          characterType: 'wojak',
          imageUrl: 'https://example.com/img.png',
          thumbnailUrl: 'https://example.com/thumb.png',
          traits: [{ category: 'Head', value: 'Crown' }],
        },
      });
      const response = generateBigPulpResponse(analysis);
      expect(response.headVariant).toBe('crown');
    });

    it('keeps default headVariant when no mirrorable traits', () => {
      const analysis = makeAnalysis({
        nft: {
          id: 'WFP-0003',
          tokenId: 'token-003',
          name: 'Wojak Farmer #3',
          characterType: 'wojak',
          imageUrl: 'https://example.com/img.png',
          thumbnailUrl: 'https://example.com/thumb.png',
          traits: [{ category: 'Background', value: 'Purple' }],
        },
      });
      const response = generateBigPulpResponse(analysis);
      expect(response.headVariant).toBe('default');
    });
  });
});
