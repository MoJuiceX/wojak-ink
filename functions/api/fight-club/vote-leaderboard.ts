// GET /api/fight-club/vote-leaderboard
// Voting-only leaderboard for Fight Club.
// Query params:
//   type: 'wojaks' | 'players' (default 'players')
//   limit: 1–100 (default 50)
//   offset: >= 0 (default 0)
//   sort (wojaks only): 'score' | 'glazed' | 'ratio' | 'newest' (default 'score')

import { resolveImageUri, PLOT_POWER_VALUE } from '../game/_shared';
import { authenticateRequest } from '../../lib/auth';

interface Env {
  DB: D1Database;
  CLERK_DOMAIN: string;
}

const PROVISIONAL_MIN_VOTES = 3;

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
  // Player score = sum of ALL Wojak vote scores per DID + plot power.
  // All Wojaks count toward power (no limit).
  const playersQuery = `
    WITH wojak_scores_by_did AS (
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
    ),
    plot_counts AS (
      SELECT did_id, COUNT(*) as plot_count
      FROM did_holdings
      WHERE collection = 'phase1'
      GROUP BY did_id
    ),
    player_scores AS (
      SELECT
        gp.did_id,
        dp.display_name,
        COALESCE(pc.plot_count, 0) as plot_count,
        COALESCE(pc.plot_count, 0) * ${PLOT_POWER_VALUE} as plot_power,
        COALESCE(SUM(wsd.net_score), 0) AS wojak_power,
        COUNT(DISTINCT wsd.nft_id) AS wojak_count,
        MAX(CASE WHEN wsd.rn = 1 THEN wsd.net_score END) AS best_wojak_score,
        (
          SELECT pm.ipfs_image_uri
          FROM wojak_scores_by_did wsd2
          JOIN phase2_mints pm ON pm.mintgarden_launcher_id = wsd2.nft_id AND pm.status = 'minted'
          WHERE wsd2.did_id = gp.did_id AND wsd2.rn = 1
          LIMIT 1
        ) AS best_wojak_image
      FROM game_players gp
      LEFT JOIN did_profiles dp ON dp.did_id = gp.did_id
      LEFT JOIN wojak_scores_by_did wsd ON wsd.did_id = gp.did_id
      LEFT JOIN plot_counts pc ON pc.did_id = gp.did_id
      WHERE gp.phase1_verified = 1
        AND gp.did_id IS NOT NULL AND gp.did_id != ''
      GROUP BY gp.did_id
    )
    SELECT
      ps.did_id,
      ps.display_name,
      ps.plot_count,
      ps.plot_power,
      ps.wojak_power,
      ps.wojak_count,
      (ps.plot_power + ps.wojak_power) as total_power,
      ps.best_wojak_score,
      ps.best_wojak_image
    FROM player_scores ps
    ORDER BY
      total_power DESC,
      ps.wojak_count DESC,
      ps.plot_count DESC,
      ps.did_id ASC
    LIMIT ? OFFSET ?
  `;

  const results = await db.prepare(playersQuery).bind(limit, offset).all();

  const players = (results.results || []).map((row: Record<string, unknown>, idx: number) => {
    const did = (row.did_id as string) || '';
    let displayName = row.display_name as string | null;
    if (!displayName) displayName = did ? `${did.slice(0, 12)}...` : 'Anon';

    const wojakCount = (row.wojak_count as number) || 0;
    return {
      rank: offset + idx + 1,
      did,
      displayName,
      // Power fields
      totalPower: (row.total_power as number) || 0,
      plotPower: (row.plot_power as number) || 0,
      plotCount: (row.plot_count as number) || 0,
      wojakPower: (row.wojak_power as number) || 0,
      wojakCount,
      // Frontend-expected fields
      totalWojakCount: wojakCount,
      eligibleWojakCount: wojakCount,
      // Legacy field (now equals totalPower)
      playerScore: (row.total_power as number) || 0,
      bestWojakScore: (row.best_wojak_score as number) ?? null,
      bestWojakImage: resolveImageUri(row.best_wojak_image as string | null) || null,
    };
  });

  // Caller's rank
  let yourRank: number | null = null;
  if (callerDid) {
    const yourRankQuery = `
      WITH wojak_power_by_did AS (
        SELECT
          dh.did_id,
          COALESCE(SUM(ws.net_score), 0) AS wojak_power
        FROM did_holdings dh
        JOIN wojak_scores ws ON ws.nft_id = dh.nft_id
        WHERE dh.collection = 'phase2'
        GROUP BY dh.did_id
      ),
      plot_counts AS (
        SELECT did_id, COUNT(*) as plot_count
        FROM did_holdings
        WHERE collection = 'phase1'
        GROUP BY did_id
      ),
      player_scores AS (
        SELECT
          gp.did_id,
          COALESCE(pc.plot_count, 0) * ${PLOT_POWER_VALUE} as plot_power,
          COALESCE(wpd.wojak_power, 0) AS wojak_power
        FROM game_players gp
        LEFT JOIN wojak_power_by_did wpd ON wpd.did_id = gp.did_id
        LEFT JOIN plot_counts pc ON pc.did_id = gp.did_id
        WHERE gp.phase1_verified = 1
          AND gp.did_id IS NOT NULL AND gp.did_id != ''
      )
      SELECT COUNT(*) + 1 AS rank
      FROM player_scores
      WHERE (plot_power + wojak_power) > (
        SELECT COALESCE(plot_power + wojak_power, 0) FROM player_scores WHERE did_id = ?
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
    },
  });
}
