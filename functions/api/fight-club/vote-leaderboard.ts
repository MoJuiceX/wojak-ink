// GET /api/fight-club/vote-leaderboard
// Voting-only leaderboard for Fight Club.
// Query params:
//   type: 'wojaks' | 'players' (default 'players')
//   limit: 1–100 (default 50)
//   offset: >= 0 (default 0)
//   sort (wojaks only): 'score' | 'glazed' | 'ratio' | 'newest' (default 'score')

import { resolveImageUri } from '../game/_shared';
import { authenticateRequest } from '../../lib/auth';

interface Env {
    DB: D1Database;
    CLERK_DOMAIN: string;
}

const PROVISIONAL_MIN_VOTES = 5;
const PLAYER_TOP_N = 10;

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
}

function errJson(error: string, code: string, status = 400) {
    return json({ error, code }, status);
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const start = Date.now();
    try {
        const url = new URL(context.request.url);
        const type = url.searchParams.get('type') || 'players';
        if (type !== 'wojaks' && type !== 'players') {
            return errJson('Invalid type', 'INVALID_TYPE');
        }

        const limitRaw = parseInt(url.searchParams.get('limit') || '50', 10);
        if (isNaN(limitRaw) || limitRaw < 1 || limitRaw > 100) {
            return errJson('Limit must be 1–100', 'INVALID_LIMIT');
        }
        const limit = limitRaw;
        const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10));
        const sort = url.searchParams.get('sort') || 'score';

        const db = context.env.DB;

        if (type === 'wojaks') {
            return await handleWojaks(db, limit, offset, sort, start);
        } else {
            // Get caller DID for "yourRank"
            let callerDid: string | null = null;
            if (context.env.CLERK_DOMAIN) {
                const auth = await authenticateRequest(context.request, context.env.CLERK_DOMAIN);
                callerDid = (auth?.payload?.did as string) || null;
            }
            return await handlePlayers(db, limit, offset, callerDid, start);
        }
    } catch (err) {
        console.error('[fight-club.vote-leaderboard] Error:', err);
        return errJson('Internal error', 'INTERNAL_ERROR', 500);
    }
};

// ── Wojaks leaderboard ──────────────────────────────────────────────

async function handleWojaks(db: D1Database, limit: number, offset: number, sort: string, start: number) {
    const validSorts = ['score', 'glazed', 'ratio', 'newest'];
    if (!validSorts.includes(sort)) {
        return errJson('Invalid sort. Must be: score, glazed, ratio, newest', 'INVALID_SORT');
    }

    // Build ORDER BY based on sort
    let orderBy: string;
    switch (sort) {
        case 'glazed':
            orderBy = `
        CASE WHEN ws.total_votes >= ${PROVISIONAL_MIN_VOTES} THEN 0 ELSE 1 END ASC,
        ws.likes DESC, ws.net_score DESC, ws.edition_number ASC`;
            break;
        case 'ratio':
            orderBy = `
        CASE WHEN ws.total_votes >= ${PROVISIONAL_MIN_VOTES} THEN 0 ELSE 1 END ASC,
        CASE WHEN ws.total_votes > 0 THEN CAST(ws.likes AS REAL) / ws.total_votes ELSE 0 END DESC,
        ws.likes DESC, ws.edition_number ASC`;
            break;
        case 'newest':
            orderBy = `ws.edition_number DESC`;
            break;
        default: // 'score'
            orderBy = `
        CASE WHEN ws.total_votes >= ${PROVISIONAL_MIN_VOTES} THEN 0 ELSE 1 END ASC,
        ws.net_score DESC, ws.total_votes DESC, ws.edition_number ASC`;
    }

    // Count total for pagination
    const countResult = await db.prepare(
        'SELECT COUNT(*) as cnt FROM wojak_scores'
    ).first<{ cnt: number }>();
    const total = countResult?.cnt || 0;

    // Main query: wojak_scores + phase2_mints (for image) + optional did_holdings/did_profiles (for owner)
    const query = `
    SELECT
      ws.nft_id,
      ws.edition_number,
      ws.likes,
      ws.dislikes,
      ws.net_score,
      ws.total_votes,
      pm.ipfs_image_uri,
      dh.did_id AS owner_did,
      dp.display_name AS owner_name
    FROM wojak_scores ws
    LEFT JOIN phase2_mints pm ON pm.mintgarden_launcher_id = ws.nft_id AND pm.status = 'minted'
    LEFT JOIN did_holdings dh ON dh.nft_id = ws.nft_id AND dh.collection = 'phase2'
    LEFT JOIN did_profiles dp ON dp.did_id = dh.did_id
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

    const results = await db.prepare(query).bind(limit, offset).all();

    // Assign ranks: only non-provisional get numbered ranks (for score/glazed/ratio sorts)
    // For 'newest', all get null rank since it's not a performance ranking
    let rankCounter = offset;
    const wojaks = (results.results || []).map((row: Record<string, unknown>) => {
        const totalVotes = (row.total_votes as number) || 0;
        const isProvisional = totalVotes < PROVISIONAL_MIN_VOTES;
        const likes = (row.likes as number) || 0;
        const dislikes = (row.dislikes as number) || 0;
        const voteScore = (row.net_score as number) || 0;

        let rank: number | null = null;
        if (sort !== 'newest' && !isProvisional) {
            rankCounter++;
            rank = rankCounter;
        }

        return {
            rank,
            nftId: row.nft_id as string,
            edition: (row.edition_number as number) || 0,
            imageUrl: resolveImageUri(row.ipfs_image_uri as string | null),
            ownerDid: (row.owner_did as string) || null,
            ownerName: (row.owner_name as string) || null,
            likes,
            dislikes,
            totalVotes,
            voteScore,
            likeRatio: totalVotes > 0 ? Math.round((likes / totalVotes) * 100) / 100 : null,
            isProvisional,
            provisionalVotesNeeded: Math.max(0, PROVISIONAL_MIN_VOTES - totalVotes),
            countsTowardPlayer: !isProvisional,
        };
    });

    const ms = Date.now() - start;
    console.warn(`[fight-club.vote-leaderboard] type=wojaks sort=${sort} limit=${limit} offset=${offset} count=${wojaks.length} total=${total} ms=${ms}`);

    return json({
        wojaks,
        total,
        sort,
        meta: {
            mode: 'voting_only',
            provisionalMinVotes: PROVISIONAL_MIN_VOTES,
        },
    });
}

// ── Players leaderboard ─────────────────────────────────────────────

async function handlePlayers(db: D1Database, limit: number, offset: number, callerDid: string | null, start: number) {
    // Player score = sum of top 10 eligible (total_votes >= 5) Wojak vote scores per DID.
    // Uses windowed ROW_NUMBER per DID to pick top 10, then aggregates.
    const playersQuery = `
    WITH eligible_wojaks AS (
      SELECT
        dh.did_id,
        ws.nft_id,
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
        dp.display_name,
        COALESCE(SUM(CASE WHEN ew.rn <= ${PLAYER_TOP_N} THEN ew.net_score ELSE 0 END), 0) AS player_score,
        COUNT(DISTINCT CASE WHEN ew.rn IS NOT NULL THEN ew.nft_id END) AS eligible_wojak_count,
        MAX(CASE WHEN ew.rn = 1 THEN ew.net_score END) AS best_wojak_score,
        (
          SELECT pm.ipfs_image_uri
          FROM eligible_wojaks ew2
          JOIN phase2_mints pm ON pm.mintgarden_launcher_id = ew2.nft_id AND pm.status = 'minted'
          WHERE ew2.did_id = gp.did_id AND ew2.rn = 1
          LIMIT 1
        ) AS best_wojak_image
      FROM game_players gp
      LEFT JOIN did_profiles dp ON dp.did_id = gp.did_id
      LEFT JOIN eligible_wojaks ew ON ew.did_id = gp.did_id AND ew.rn <= ${PLAYER_TOP_N}
      WHERE gp.phase1_verified = 1
        AND gp.did_id IS NOT NULL AND gp.did_id != ''
      GROUP BY gp.did_id
    ),
    total_wojaks AS (
      SELECT dh.did_id, COUNT(*) AS total_count
      FROM did_holdings dh
      WHERE dh.collection = 'phase2'
      GROUP BY dh.did_id
    )
    SELECT
      ps.did_id,
      ps.display_name,
      ps.player_score,
      ps.eligible_wojak_count,
      COALESCE(tw.total_count, 0) AS total_wojak_count,
      ps.best_wojak_score,
      ps.best_wojak_image
    FROM player_scores ps
    LEFT JOIN total_wojaks tw ON tw.did_id = ps.did_id
    WHERE ps.eligible_wojak_count > 0 AND ps.player_score > 0
    ORDER BY ps.player_score DESC, ps.eligible_wojak_count DESC, ps.best_wojak_score DESC, ps.did_id ASC
    LIMIT ? OFFSET ?
  `;

    const results = await db.prepare(playersQuery).bind(limit, offset).all();

    const players = (results.results || []).map((row: Record<string, unknown>, idx: number) => {
        const did = (row.did_id as string) || '';
        let displayName = row.display_name as string | null;
        if (!displayName) displayName = did ? `${did.slice(0, 12)}...` : 'Anon';

        return {
            rank: offset + idx + 1,
            did,
            displayName,
            playerScore: (row.player_score as number) || 0,
            eligibleWojakCount: (row.eligible_wojak_count as number) || 0,
            totalWojakCount: (row.total_wojak_count as number) || 0,
            bestWojakScore: (row.best_wojak_score as number) ?? null,
            bestWojakImage: resolveImageUri(row.best_wojak_image as string | null) || null,
        };
    });

    // Caller's rank
    let yourRank: number | null = null;
    if (callerDid) {
        const yourRankQuery = `
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
          COUNT(DISTINCT CASE WHEN ew.rn IS NOT NULL THEN ew.nft_id END) AS eligible_wojak_count
        FROM game_players gp
        LEFT JOIN eligible_wojaks ew ON ew.did_id = gp.did_id AND ew.rn <= ${PLAYER_TOP_N}
        WHERE gp.phase1_verified = 1
          AND gp.did_id IS NOT NULL AND gp.did_id != ''
        GROUP BY gp.did_id
        HAVING eligible_wojak_count > 0 AND player_score > 0
      )
      SELECT COUNT(*) + 1 AS rank
      FROM player_scores
      WHERE player_score > (
        SELECT COALESCE(player_score, 0) FROM player_scores WHERE did_id = ?
      )
    `;
        const rankResult = await db.prepare(yourRankQuery).bind(callerDid).first<{ rank: number }>();
        yourRank = rankResult?.rank ?? null;
    }

    const ms = Date.now() - start;
    console.warn(`[fight-club.vote-leaderboard] type=players limit=${limit} offset=${offset} count=${players.length} ms=${ms}`);

    return json({
        players,
        yourRank,
        meta: {
            mode: 'voting_only',
            provisionalMinVotes: PROVISIONAL_MIN_VOTES,
            playerTopN: PLAYER_TOP_N,
        },
    });
}
