// GET /api/game/power-level?did=<did>
// Recalculates and returns a player's Power Level.
// Also callable as POST to force recalculation.

import { POWER_LEVEL_MAX } from './_shared';

interface Env {
  DB: D1Database;
}

// Scoring weights — tunable constants (must match _powerLevel.ts)
const QUALITY_WEIGHT = 1.0;         // Net votes (likes - dislikes) per NFT
const VALUE_BASE = 50;              // Base points per NFT held (regardless of surcharge)
const VALUE_LOG_SCALE = 30;         // Points from surcharge: VALUE_LOG_SCALE * ln(1 + surcharge_xch)
const BREADTH_BONUS = 15;           // Points per unique creator held
const CREATOR_QUALITY_WEIGHT = 0.5; // Net votes across all creations (halved vs holder)
const CREATOR_SPREAD_BONUS = 10;    // Points per unique DID holding your work
const BURN_POWER_BONUS = 50;        // +50 per burn power grant assigned to an NFT

export const onRequestGet: PagesFunction<Env> = async (context) => {
  return calculatePowerLevel(context);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  return calculatePowerLevel(context);
};

async function calculatePowerLevel(context: EventContext<Env, string, unknown>) {
  try {
    const url = new URL(context.request.url);
    const did = url.searchParams.get('did') ||
      ((context.request.method === 'POST')
        ? ((await context.request.json()) as { did: string }).did
        : null);

    if (!did) {
      return Response.json({ error: 'DID required' }, { status: 400 });
    }

    const player = await context.env.DB.prepare(
      'SELECT * FROM game_players WHERE did_id = ?'
    ).bind(did).first();

    if (!player) {
      return Response.json({ error: 'Player not registered' }, { status: 404 });
    }

    // =============================================
    // SCORE FROM HOLDINGS (Collector side)
    // =============================================
    // For each Phase 2 NFT in this DID:
    //   quality = likes - dislikes
    //   value = VALUE_BASE + VALUE_LOG_SCALE * ln(1 + surcharge)
    //   breadth = BREADTH_BONUS per unique creator (first NFT from each creator)

    // Burn power bonuses: +50 per assigned grant per NFT
    const burnBonusByNft = new Map<string, number>();
    try {
      const burnBonusRows = await context.env.DB.prepare(`
        SELECT nft_id, COUNT(*) as cnt FROM burn_power_grants
        WHERE did_id = ? AND nft_id IS NOT NULL
        GROUP BY nft_id
      `).bind(did).all<{ nft_id: string; cnt: number }>();
      for (const row of burnBonusRows.results ?? []) {
        burnBonusByNft.set(row.nft_id, row.cnt);
      }
    } catch {
      // Table may not exist before migration 076
    }

    const holdings = await context.env.DB.prepare(`
      SELECT
        dh.nft_id,
        dh.edition_number,
        dh.creator_wallet,
        COALESCE(ws.net_score, 0) as net_score,
        COALESCE(pm.trait_surcharge_xch, 0) as surcharge
      FROM did_holdings dh
      LEFT JOIN wojak_scores ws ON ws.nft_id = dh.nft_id
      LEFT JOIN phase2_mints pm ON pm.mint_number = dh.edition_number
      WHERE dh.did_id = ? AND dh.collection = 'phase2'
    `).bind(did).all();

    let holdingsScore = 0;
    const seenCreators = new Set<string>();

    for (const nft of holdings.results) {
      // Quality: net votes (can be negative)
      const quality = (nft.net_score as number) * QUALITY_WEIGHT;

      // Value: base + logarithmic surcharge bonus
      // surcharge is stored as integer (x100000), convert to XCH
      const surchargeXch = (nft.surcharge as number) / 100000;
      const value = VALUE_BASE + VALUE_LOG_SCALE * Math.log(1 + surchargeXch);

      // Breadth: one-time bonus per unique creator
      let breadth = 0;
      const creator = nft.creator_wallet as string;
      if (creator && creator !== player.wallet_address && !seenCreators.has(creator)) {
        seenCreators.add(creator);
        breadth = BREADTH_BONUS;
      }

      const burnBonus = (burnBonusByNft.get(nft.nft_id as string) ?? 0) * BURN_POWER_BONUS;
      holdingsScore += quality + value + breadth + burnBonus;
    }

    // =============================================
    // SCORE FROM CREATIONS (Creator side)
    // =============================================
    // Sum of net_score across all NFTs you created
    // Plus bonus per unique DID holding your work

    const creationStats = await context.env.DB.prepare(`
      SELECT
        COALESCE(SUM(ws.net_score), 0) as total_net_score,
        COUNT(DISTINCT dh.did_id) as unique_collectors
      FROM wojak_scores ws
      LEFT JOIN did_holdings dh ON dh.nft_id = ws.nft_id AND dh.did_id != ?
      WHERE ws.creator_wallet = ?
    `).bind(did, player.wallet_address).first();

    const creatorQuality = ((creationStats?.total_net_score as number) || 0) * CREATOR_QUALITY_WEIGHT;
    const creatorSpread = ((creationStats?.unique_collectors as number) || 0) * CREATOR_SPREAD_BONUS;
    const creationsScore = creatorQuality + creatorSpread;

    // =============================================
    // TOTAL & SCALE
    // =============================================
    const rawTotal = holdingsScore + creationsScore;
    // Clamp to 0-9000 range. In early days, scores will be low.
    // As collection grows, we may need to adjust weights.
    const powerLevel = Math.max(0, Math.min(POWER_LEVEL_MAX, Math.round(rawTotal)));

    // Cache the result
    await context.env.DB.prepare(`
      UPDATE game_players
      SET power_level = ?, power_level_updated_at = datetime('now'), updated_at = datetime('now')
      WHERE did_id = ?
    `).bind(powerLevel, did).run();

    // Calculate rank (1-based: count of players with higher power level + 1)
    const rankResult = await context.env.DB.prepare(
      'SELECT COUNT(*) as above FROM game_players WHERE power_level > ?'
    ).bind(powerLevel).first();
    const rank = ((rankResult?.above as number) || 0) + 1;

    // Get total credits earned from trades
    const creditsResult = await context.env.DB.prepare(
      'SELECT COALESCE(SUM(credits_earned), 0) as total FROM credit_events WHERE wallet_address = ?'
    ).bind(player.wallet_address).first();
    const credits = (creditsResult?.total as number) || 0;

    return Response.json({
      success: true,
      powerLevel,
      rank,
      credits,
      voteStreak: (player.vote_streak as number) || 0,
      voteStreakLongest: (player.vote_streak_longest as number) || 0,
      breakdown: {
        holdings: {
          score: Math.round(holdingsScore),
          nftCount: holdings.results.length,
          uniqueCreators: seenCreators.size,
        },
        creations: {
          score: Math.round(creationsScore),
          quality: Math.round(creatorQuality),
          spread: Math.round(creatorSpread),
          uniqueCollectors: (creationStats?.unique_collectors as number) || 0,
        },
      },
    });
  } catch (err) {
    console.error('Power Level error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
