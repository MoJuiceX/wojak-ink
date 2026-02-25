// GET /api/fight-club/my-score
// Returns the caller's Fight Club score for the Vote screen "Your Game" panel.
// Identity resolution: Clerk auth DID → did query param → unregistered response.

import { authenticateRequest } from '../../lib/auth';
import { calculateFullPower } from './_power';
import { PLOT_POWER_VALUE, PLAYER_TOP_N, COLLECTION_BONUS_CAP } from '../game/_shared';

interface Env {
    DB: D1Database;
    CLERK_DOMAIN: string;
}

type Tier = 'Casual' | 'Active' | 'Serious' | 'Strong' | 'Elite' | 'Legend';

function getTier(score: number): Tier {
    if (score >= 250) return 'Legend';
    if (score >= 120) return 'Elite';
    if (score >= 60) return 'Strong';
    if (score >= 25) return 'Serious';
    if (score >= 10) return 'Active';
    return 'Casual';
}

// Tier thresholds for "points to next tier" calculation
const TIER_THRESHOLDS: { tier: Tier; min: number }[] = [
    { tier: 'Legend', min: 250 },
    { tier: 'Elite', min: 120 },
    { tier: 'Strong', min: 60 },
    { tier: 'Serious', min: 25 },
    { tier: 'Active', min: 10 },
    { tier: 'Casual', min: 0 },
];

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
}

function unregisteredResponse() {
    return json({
        success: true,
        registered: false,
        did: null,
        ranked: false,
        rank: null,
        playerScore: 0,
        tier: 'Casual' as Tier,
        // Power breakdown (all zeros for unregistered)
        power: {
            total: 0,
            plotPower: 0,
            plotCount: 0,
            wojakPower: 0,
            wojakCount: 0,
            collectionBonus: 0,
            collectedWojakCount: 0,
            uniqueCreatorsCount: 0,
        },
        // Legacy fields for backward compat
        eligibleWojakCount: 0,
        totalWojakCount: 0,
        bestWojakScore: null,
        pointsToNextRank: null,
        nextRank: null,
        meta: {
            mode: 'voting_only',
            plotPowerValue: PLOT_POWER_VALUE,
            playerTopN: PLAYER_TOP_N,
            collectionBonusCap: COLLECTION_BONUS_CAP,
        },
    });
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const start = Date.now();
    try {
        const url = new URL(context.request.url);
        const db = context.env.DB;

        // Identity resolution: Clerk auth → did param → unregistered
        let did: string | null = null;

        if (context.env.CLERK_DOMAIN) {
            const auth = await authenticateRequest(context.request, context.env.CLERK_DOMAIN);
            did = (auth?.payload?.did as string) || null;
        }

        if (!did) {
            did = url.searchParams.get('did') || null;
        }

        if (!did) {
            return unregisteredResponse();
        }

        // Check if player exists and is verified, also fetch wallet address
        const player = await db.prepare(
            'SELECT did_id, phase1_verified, wallet_address FROM game_players WHERE did_id = ?'
        ).bind(did).first<{ did_id: string; phase1_verified: number; wallet_address: string | null }>();

        if (!player || player.phase1_verified !== 1) {
            return unregisteredResponse();
        }

        const walletAddress = player.wallet_address || '';

        // Calculate full power breakdown
        const power = await calculateFullPower(db, did, walletAddress);

        // Use total power as player score for ranking
        const playerScore = power.totalPower;
        const eligibleWojakCount = power.wojakCount;
        const totalWojakCount = power.plotCount + power.wojakCount;

        // Compute rank: all verified players with Wojaks are ranked
        const ranked = totalWojakCount > 0;
        let rank: number | null = null;

        if (ranked) {
            const rankQuery = `
        WITH eligible_wojaks AS (
          SELECT
            dh.did_id,
            ws.net_score,
            ws.total_votes,
            ws.edition_number,
            ROW_NUMBER() OVER (
              PARTITION BY dh.did_id
              ORDER BY ws.net_score DESC, ws.total_votes DESC, ws.edition_number ASC
            ) AS rn
          FROM did_holdings dh
          JOIN wojak_scores ws ON ws.nft_id = dh.nft_id
          WHERE dh.collection = 'phase2'
        ),
        player_scores AS (
          SELECT
            gp.did_id,
            COALESCE(SUM(CASE WHEN ew.rn <= ${PLAYER_TOP_N} THEN ew.net_score ELSE 0 END), 0) AS player_score,
            COUNT(DISTINCT CASE WHEN ew.rn IS NOT NULL THEN ew.nft_id END) AS eligible_count
          FROM game_players gp
          LEFT JOIN eligible_wojaks ew ON ew.did_id = gp.did_id AND ew.rn <= ${PLAYER_TOP_N}
          WHERE gp.phase1_verified = 1
            AND gp.did_id IS NOT NULL AND gp.did_id != ''
          GROUP BY gp.did_id
        )
        SELECT COUNT(*) + 1 AS rank
        FROM player_scores
        WHERE player_score > ?
      `;
            const rankResult = await db.prepare(rankQuery).bind(playerScore).first<{ rank: number }>();
            rank = rankResult?.rank ?? null;
        }

        // Points to next rank: find the player just above
        let pointsToNextRank: number | null = null;
        let nextRank: number | null = null;
        if (ranked && rank !== null && rank > 1) {
            // Points needed = score of player at (rank - 1) minus our score + 1
            pointsToNextRank = 1; // At minimum 1 point to overtake
            nextRank = rank - 1;
        }

        const tier = getTier(playerScore);

        // Points to next tier
        const currentTierIdx = TIER_THRESHOLDS.findIndex(t => t.tier === tier);
        if (currentTierIdx > 0) {
            const nextTierMin = TIER_THRESHOLDS[currentTierIdx - 1].min;
            const pointsToNextTier = nextTierMin - playerScore;
            if (pointsToNextRank === null || pointsToNextTier < pointsToNextRank) {
                pointsToNextRank = pointsToNextTier;
            }
        }

        const ms = Date.now() - start;
        console.log(`[fight-club.my-score] did=${did.slice(0, 20)}... ranked=${ranked} score=${playerScore} rank=${rank} ms=${ms}`);

        return json({
            success: true,
            registered: true,
            did,
            ranked,
            rank,
            playerScore,
            tier,
            // Power breakdown
            power: {
                total: power.totalPower,
                plotPower: power.plotPower,
                plotCount: power.plotCount,
                wojakPower: power.wojakPower,
                wojakCount: power.wojakCount,
                collectionBonus: power.collectionBonus,
                collectedWojakCount: power.collectedWojakCount,
                uniqueCreatorsCount: power.uniqueCreatorsCount,
            },
            // Legacy fields for backward compat
            eligibleWojakCount,
            totalWojakCount,
            bestWojakScore: null, // Deprecated
            pointsToNextRank,
            nextRank,
            meta: {
                mode: 'voting_only',
                plotPowerValue: PLOT_POWER_VALUE,
                playerTopN: PLAYER_TOP_N,
                collectionBonusCap: COLLECTION_BONUS_CAP,
            },
        });
    } catch (err) {
        console.error('[fight-club.my-score] Error:', err);
        return json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, 500);
    }
};
