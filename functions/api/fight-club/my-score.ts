// GET /api/fight-club/my-score
// Returns the caller's Fight Club score for the Vote screen "Your Game" panel.
// Identity resolution: Clerk auth DID → did query param → unregistered response.

import { authenticateRequest } from '../../lib/auth';

interface Env {
    DB: D1Database;
    CLERK_DOMAIN: string;
}

const PROVISIONAL_MIN_VOTES = 3;
const PLAYER_TOP_N = 10;

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
        eligibleWojakCount: 0,
        totalWojakCount: 0,
        bestWojakScore: null,
        pointsToNextRank: null,
        nextRank: null,
        meta: {
            mode: 'voting_only',
            provisionalMinVotes: PROVISIONAL_MIN_VOTES,
            playerTopN: PLAYER_TOP_N,
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

        // Check if player exists and is verified
        const player = await db.prepare(
            'SELECT did_id, phase1_verified FROM game_players WHERE did_id = ?'
        ).bind(did).first<{ did_id: string; phase1_verified: number }>();

        if (!player || player.phase1_verified !== 1) {
            return unregisteredResponse();
        }

        // Compute player score: sum of top 10 eligible Wojak vote scores
        const wojakScores = await db.prepare(`
      SELECT
        ws.nft_id,
        ws.net_score,
        ws.total_votes
      FROM did_holdings dh
      JOIN wojak_scores ws ON ws.nft_id = dh.nft_id
      WHERE dh.did_id = ? AND dh.collection = 'phase2'
        AND ws.total_votes >= ${PROVISIONAL_MIN_VOTES}
      ORDER BY ws.net_score DESC, ws.total_votes DESC, ws.edition_number ASC
      LIMIT ${PLAYER_TOP_N}
    `).bind(did).all();

        const eligibleWojaks = wojakScores.results || [];
        const playerScore = eligibleWojaks.reduce((sum, w) => sum + ((w.net_score as number) || 0), 0);
        const eligibleWojakCount = eligibleWojaks.length;
        const bestWojakScore = eligibleWojaks.length > 0 ? (eligibleWojaks[0].net_score as number) : null;

        // Total Wojaks in DID (including provisional)
        const totalResult = await db.prepare(
            "SELECT COUNT(*) as cnt FROM did_holdings WHERE did_id = ? AND collection = 'phase2'"
        ).bind(did).first<{ cnt: number }>();
        const totalWojakCount = totalResult?.cnt || 0;

        // Compute rank: count players with higher score
        const ranked = eligibleWojakCount > 0 && playerScore > 0;
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
            AND ws.total_votes >= ${PROVISIONAL_MIN_VOTES}
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
          HAVING eligible_count > 0 AND player_score > 0
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
        console.warn(`[fight-club.my-score] did=${did.slice(0, 20)}... ranked=${ranked} score=${playerScore} rank=${rank} ms=${ms}`);

        return json({
            success: true,
            registered: true,
            did,
            ranked,
            rank,
            playerScore,
            tier,
            eligibleWojakCount,
            totalWojakCount,
            bestWojakScore,
            pointsToNextRank,
            nextRank,
            meta: {
                mode: 'voting_only',
                provisionalMinVotes: PROVISIONAL_MIN_VOTES,
                playerTopN: PLAYER_TOP_N,
            },
        });
    } catch (err) {
        console.error('[fight-club.my-score] Error:', err);
        return json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, 500);
    }
};
