// GET /api/fight-club/my-score
// Returns the caller's Fight Club score for the Vote screen "Your Game" panel.
// Identity resolution: Clerk auth DID → did query param → unregistered response.

import { authenticateRequest } from '../../lib/auth';
import { calculateFullPower } from './_power';
import { getPlayerRankByScore } from './_rank';
import { PLOT_POWER_VALUE } from '../game/_shared';

interface Env {
    DB: D1Database;
    CLERK_DOMAIN: string;
}

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

        // Calculate full power breakdown
        const power = await calculateFullPower(db, did);

        // Use total power as player score for ranking
        const playerScore = power.totalPower;
        const eligibleWojakCount = power.wojakCount;
        const totalWojakCount = power.plotCount + power.wojakCount;

        // Compute rank: all verified players with Wojaks are ranked
        const ranked = totalWojakCount > 0;
        let rank: number | null = null;

        if (ranked) {
            rank = await getPlayerRankByScore(db, playerScore);
        }

        // Points to next rank: find the player just above
        let pointsToNextRank: number | null = null;
        let nextRank: number | null = null;
        if (ranked && rank !== null && rank > 1) {
            // Points needed = score of player at (rank - 1) minus our score + 1
            pointsToNextRank = 1; // At minimum 1 point to overtake
            nextRank = rank - 1;
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
            },
        });
    } catch (err) {
        console.error('[fight-club.my-score] Error:', err);
        return json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, 500);
    }
};
