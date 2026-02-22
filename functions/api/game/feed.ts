// GET /api/game/feed?did=<optional>&guestId=<optional>&limit=10
// Returns Wojaks for voting, weighted by recency (newer = more likely).
// 24h vote pass behavior:
// - For identified users (DID or guestId), already-voted NFTs in the last 24h are excluded
//   until the user has seen the full eligible pool.
// - After the pool is exhausted, the feed is complete until older votes age out (rolling 24h reset).
// - For authenticated users: excludes own creations and own holdings.

import { resolveImageUri, isValidGuestId } from './_shared';

interface Env {
  DB: D1Database;
}

const WEIGHTED_ORDER = `
  ORDER BY
    ABS(RANDOM()) / (
      (1.0 / (1.0 + COALESCE(ws.total_votes, 0))) *
      (1.0 / (1.0 + JULIANDAY('now') - JULIANDAY(pm.created_at))) *
      CASE WHEN EXISTS (
        SELECT 1 FROM battles bl
        WHERE bl.status = 'active'
        AND (bl.nft_a_id = pm.mintgarden_launcher_id OR bl.nft_b_id = pm.mintgarden_launcher_id)
      ) THEN 5.0 ELSE 1.0 END
    )
`;

function feedSelectSql(extraWhere = ''): string {
  return `
    SELECT
      pm.mint_number as edition_number,
      pm.mintgarden_launcher_id as nft_id,
      pm.wallet_address as creator_wallet,
      pm.layers_json,
      pm.ipfs_image_uri,
      pm.image_hash,
      nn.custom_name,
      nn.full_name,
      COALESCE(ws.total_votes, 0) as total_votes,
      COALESCE(ws.likes, 0) as likes,
      COALESCE(ws.dislikes, 0) as dislikes
    FROM phase2_mints pm
    LEFT JOIN wojak_scores ws ON ws.edition_number = pm.mint_number
    LEFT JOIN nft_names nn ON nn.edition_number = pm.mint_number
    WHERE pm.status = 'minted'
      AND pm.mintgarden_launcher_id IS NOT NULL
      ${extraWhere}
    ${WEIGHTED_ORDER}
    LIMIT ?
  `;
}

function poolCountSql(extraWhere = ''): string {
  return `
    SELECT COUNT(*) AS total
    FROM phase2_mints pm
    WHERE pm.status = 'minted'
      AND pm.mintgarden_launcher_id IS NOT NULL
      ${extraWhere}
  `;
}

function seenCountSql(extraWhere = ''): string {
  return `
    SELECT COUNT(DISTINCT wv.nft_id) AS seen_count
    FROM wojak_votes wv
    JOIN phase2_mints pm ON pm.mintgarden_launcher_id = wv.nft_id
    WHERE pm.status = 'minted'
      AND pm.mintgarden_launcher_id IS NOT NULL
      AND wv.voter_did = ?
      AND wv.created_at >= datetime('now', '-1 day')
      ${extraWhere}
  `;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const did = url.searchParams.get('did');
    const guestId = url.searchParams.get('guestId');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 20);

    if (guestId && !isValidGuestId(guestId)) {
      return Response.json({ error: 'Invalid guest ID format' }, { status: 400 });
    }

    const voterId = did || guestId || null;

    let player: { wallet_address?: string | null } | null = null;
    if (did) {
      player = await context.env.DB.prepare(
        'SELECT wallet_address, phase1_verified FROM game_players WHERE did_id = ?'
      ).bind(did).first<{ wallet_address?: string | null }>();
    }

    const isRegisteredDid = !!(did && player?.wallet_address);
    const walletAddress = player?.wallet_address || null;

    let baseExtraWhere = '';
    let baseBindings: unknown[] = [];
    let seenExtraWhere = '';
    let seenBindings: unknown[] = [];

    if (isRegisteredDid && walletAddress) {
      baseExtraWhere = `
        AND pm.wallet_address != ?
        AND NOT EXISTS (
          SELECT 1 FROM did_holdings dh
          WHERE dh.did_id = ? AND dh.nft_id = pm.mintgarden_launcher_id
        )
      `;
      baseBindings = [walletAddress, did!];

      seenExtraWhere = `
        AND pm.wallet_address != ?
        AND NOT EXISTS (
          SELECT 1 FROM did_holdings dh
          WHERE dh.did_id = ? AND dh.nft_id = pm.mintgarden_launcher_id
        )
      `;
      seenBindings = [walletAddress, did!];
    }

    const poolRow = await context.env.DB.prepare(poolCountSql(baseExtraWhere))
      .bind(...baseBindings)
      .first<{ total: number }>();
    const totalPool = Number(poolRow?.total || 0);

    let seenCount24h = 0;
    if (voterId) {
      const seenRow = await context.env.DB.prepare(seenCountSql(seenExtraWhere))
        .bind(voterId, ...seenBindings)
        .first<{ seen_count: number }>();
      seenCount24h = Number(seenRow?.seen_count || 0);
      if (seenCount24h > totalPool) seenCount24h = totalPool;
    }

    const passComplete = !!voterId && totalPool > 0 && seenCount24h >= totalPool;
    const shouldExcludeRecent = !!voterId && totalPool > 0 && seenCount24h < totalPool;

    const recentExclusion = shouldExcludeRecent
      ? `
        AND NOT EXISTS (
          SELECT 1 FROM wojak_votes wv_recent
          WHERE wv_recent.voter_did = ?
            AND wv_recent.nft_id = pm.mintgarden_launcher_id
            AND wv_recent.created_at >= datetime('now', '-1 day')
        )
      `
      : '';

    let feed: { results: Record<string, unknown>[] } = { results: [] };

    if (!passComplete || !voterId) {
      const feedBindings = shouldExcludeRecent
        ? [...baseBindings, voterId!, limit]
        : [...baseBindings, limit];
      feed = await context.env.DB.prepare(feedSelectSql(`${baseExtraWhere}${recentExclusion}`))
        .bind(...feedBindings)
        .all();
    }

    // Fallback: only if the eligible pool is actually empty
    if (feed.results.length === 0 && totalPool === 0 && (did != null || guestId != null)) {
      feed = await context.env.DB.prepare(feedSelectSql()).bind(limit).all();
    }

    const imageHashToCdn = (hash: string | null): string | null => {
      if (!hash || typeof hash !== 'string') return null;
      return `https://assets.mainnet.mintgarden.io/thumbnails/${hash}_512.webp`;
    };

    return Response.json({
      success: true,
      feed: feed.results.map((row: Record<string, unknown>) => ({
        nftId: row.nft_id,
        editionNumber: row.edition_number,
        creatorWallet: row.creator_wallet,
        name: row.full_name || `Your Wojak #${row.edition_number}`,
        customName: row.custom_name,
        imageUri: resolveImageUri(row.ipfs_image_uri as string),
        thumbnailUri: imageHashToCdn(row.image_hash as string | null),
        totalVotes: row.total_votes,
        likes: row.likes,
        dislikes: row.dislikes,
      })),
      meta: {
        votePass: {
          enabled: !!voterId,
          windowHours: 24,
          seenCount: seenCount24h,
          totalCount: totalPool,
          remainingCount: Math.max(0, totalPool - seenCount24h),
          passComplete,
          passLocked: passComplete,
          unseenOnlyFeed: shouldExcludeRecent,
        },
      },
    });
  } catch (err) {
    console.error('Feed error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
