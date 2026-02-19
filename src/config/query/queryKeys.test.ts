// src/config/query/queryKeys.test.ts
import { describe, it, expect } from 'vitest';
import {
  nftKeys,
  marketKeys,
  walletKeys,
  traitKeys,
  leaderboardKeys,
} from './queryKeys';

describe('queryKeys', () => {
  // ============================================
  // nftKeys
  // ============================================
  describe('nftKeys', () => {
    it('all returns ["nfts"]', () => {
      expect(nftKeys.all).toEqual(['nfts']);
    });

    it('lists() returns ["nfts", "list"]', () => {
      expect(nftKeys.lists()).toEqual(['nfts', 'list']);
    });

    it('list() with no filters returns key with empty object', () => {
      const key = nftKeys.list();
      expect(key[0]).toBe('nfts');
      expect(key[1]).toBe('list');
      expect(key[2]).toEqual({});
    });

    it('list() with filters includes them in the key', () => {
      const filters = { character: 'wojak' as const };
      const key = nftKeys.list(filters);
      expect(key[2]).toEqual(filters);
    });

    it('details() returns ["nfts", "detail"]', () => {
      expect(nftKeys.details()).toEqual(['nfts', 'detail']);
    });

    it('detail() includes the id', () => {
      const key = nftKeys.detail('nft-123');
      expect(key).toContain('nft-123');
      expect(key[0]).toBe('nfts');
    });

    it('traits() includes the id and "traits"', () => {
      const key = nftKeys.traits('nft-123');
      expect(key).toContain('nft-123');
      expect(key).toContain('traits');
    });

    it('history() includes the id and "history"', () => {
      const key = nftKeys.history('nft-456');
      expect(key).toContain('nft-456');
      expect(key).toContain('history');
    });

    it('search() includes the query string', () => {
      const key = nftKeys.search('wojak');
      expect(key).toContain('wojak');
      expect(key).toContain('search');
    });

    it('infinite() without filters returns key with empty object', () => {
      const key = nftKeys.infinite();
      expect(key[0]).toBe('nfts');
      expect(key[1]).toBe('infinite');
      expect(key[2]).toEqual({});
    });

    it('detail keys for different ids are different', () => {
      const k1 = nftKeys.detail('id-1');
      const k2 = nftKeys.detail('id-2');
      expect(k1).not.toEqual(k2);
    });

    it('all is a prefix of lists()', () => {
      const lists = nftKeys.lists();
      expect(lists.slice(0, nftKeys.all.length)).toEqual(nftKeys.all);
    });
  });

  // ============================================
  // marketKeys
  // ============================================
  describe('marketKeys', () => {
    it('all returns ["market"]', () => {
      expect(marketKeys.all).toEqual(['market']);
    });

    it('listings() returns ["market", "listings"]', () => {
      expect(marketKeys.listings()).toEqual(['market', 'listings']);
    });

    it('listingsList() without filters uses empty object', () => {
      const key = marketKeys.listingsList();
      expect(key[0]).toBe('market');
      expect(key[1]).toBe('listings');
      expect(key[2]).toEqual({});
    });

    it('stats() returns ["market", "stats"]', () => {
      expect(marketKeys.stats()).toEqual(['market', 'stats']);
    });

    it('floorPrice() returns ["market", "floor"]', () => {
      expect(marketKeys.floorPrice()).toEqual(['market', 'floor']);
    });

    it('priceHistory() without period uses "all"', () => {
      const key = marketKeys.priceHistory();
      expect(key).toContain('all');
      expect(key[0]).toBe('market');
    });

    it('priceHistory() with a specific period includes it', () => {
      const key = marketKeys.priceHistory('7d');
      expect(key).toContain('7d');
    });

    it('heatmap() returns ["market", "heatmap"]', () => {
      expect(marketKeys.heatmap()).toEqual(['market', 'heatmap']);
    });

    it('all is a prefix of stats()', () => {
      const stats = marketKeys.stats();
      expect(stats.slice(0, marketKeys.all.length)).toEqual(marketKeys.all);
    });
  });

  // ============================================
  // walletKeys
  // ============================================
  describe('walletKeys', () => {
    it('all returns ["wallet"]', () => {
      expect(walletKeys.all).toEqual(['wallet']);
    });

    it('byAddress() includes the address', () => {
      const key = walletKeys.byAddress('xch1abc');
      expect(key).toContain('xch1abc');
    });

    it('balance() includes the address and "balance"', () => {
      const key = walletKeys.balance('xch1abc');
      expect(key).toContain('xch1abc');
      expect(key).toContain('balance');
    });

    it('nfts() includes the address and "nfts"', () => {
      const key = walletKeys.nfts('xch1abc');
      expect(key).toContain('xch1abc');
      expect(key).toContain('nfts');
    });

    it('tokenPrices() returns ["wallet", "tokenPrices"]', () => {
      expect(walletKeys.tokenPrices()).toEqual(['wallet', 'tokenPrices']);
    });

    it('balance and nfts keys for same address are different', () => {
      const b = walletKeys.balance('xch1abc');
      const n = walletKeys.nfts('xch1abc');
      expect(b).not.toEqual(n);
    });
  });

  // ============================================
  // traitKeys
  // ============================================
  describe('traitKeys', () => {
    it('all returns ["traits"]', () => {
      expect(traitKeys.all).toEqual(['traits']);
    });

    it('list() returns ["traits", "list"]', () => {
      expect(traitKeys.list()).toEqual(['traits', 'list']);
    });

    it('rarity() includes traitType and traitValue', () => {
      const key = traitKeys.rarity('Eyes', 'Laser Eyes');
      expect(key).toContain('Eyes');
      expect(key).toContain('Laser Eyes');
      expect(key).toContain('rarity');
    });

    it('sales() includes traitType and traitValue', () => {
      const key = traitKeys.sales('Background', 'Orange');
      expect(key).toContain('Background');
      expect(key).toContain('Orange');
      expect(key).toContain('sales');
    });

    it('rarity and sales keys are different for same trait', () => {
      const r = traitKeys.rarity('Eyes', 'Laser Eyes');
      const s = traitKeys.sales('Eyes', 'Laser Eyes');
      expect(r).not.toEqual(s);
    });
  });

  // ============================================
  // leaderboardKeys
  // ============================================
  describe('leaderboardKeys', () => {
    it('all returns ["leaderboard"]', () => {
      expect(leaderboardKeys.all).toEqual(['leaderboard']);
    });

    it('game() includes the gameId', () => {
      const key = leaderboardKeys.game('memory-match');
      expect(key).toContain('memory-match');
    });

    it('top10() includes the gameId and "top10"', () => {
      const key = leaderboardKeys.top10('orange-pong');
      expect(key).toContain('orange-pong');
      expect(key).toContain('top10');
    });

    it('extended() includes the gameId and "extended"', () => {
      const key = leaderboardKeys.extended('wojak-runner');
      expect(key).toContain('wojak-runner');
      expect(key).toContain('extended');
    });

    it('top10 and extended keys are different for same game', () => {
      const t = leaderboardKeys.top10('memory-match');
      const e = leaderboardKeys.extended('memory-match');
      expect(t).not.toEqual(e);
    });

    it('game() keys for different games are different', () => {
      const k1 = leaderboardKeys.game('memory-match');
      const k2 = leaderboardKeys.game('orange-pong');
      expect(k1).not.toEqual(k2);
    });

    it('all is a prefix of game()', () => {
      const game = leaderboardKeys.game('test-game');
      expect(game.slice(0, leaderboardKeys.all.length)).toEqual(leaderboardKeys.all);
    });
  });
});
