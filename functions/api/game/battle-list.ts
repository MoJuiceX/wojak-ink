// GET /api/game/battle-list?status=active&limit=20&offset=0
// GET /api/game/battle-list?nftId=xxx — battle history for a specific NFT
// Returns active battles with score deltas, or battle history.

interface Env {
  DB: D1Database;
}

function resolveImageUri(raw: string | null): string {
  if (!raw) return '';
  if (raw.startsWith('[')) {
    try {
      const urls = JSON.parse(raw) as string[];
      return urls.find(u => u.startsWith('https://')) || urls[0] || '';
    } catch { return raw; }
  }
  return raw;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const nftId = url.searchParams.get('nftId');
    const status = url.searchParams.get('status') || 'active';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const voterDid = url.searchParams.get('voterDid');

    if (nftId) {
      // Battle history for a specific NFT
      const results = await context.env.DB.prepare(`
        SELECT
          b.*,
          na.full_name as name_a,
          nb.full_name as name_b,
          pma.ipfs_image_uri as image_a,
          pmb.ipfs_image_uri as image_b
        FROM battles b
        LEFT JOIN nft_names na ON na.edition_number = b.nft_a_edition
        LEFT JOIN nft_names nb ON nb.edition_number = b.nft_b_edition
        LEFT JOIN phase2_mints pma ON pma.mint_number = b.nft_a_edition
        LEFT JOIN phase2_mints pmb ON pmb.mint_number = b.nft_b_edition
        WHERE b.nft_a_id = ? OR b.nft_b_id = ?
        ORDER BY b.started_at DESC
        LIMIT ? OFFSET ?
      `).bind(nftId, nftId, limit, offset).all();

      const battles = (results.results || []).map((b) => formatBattle(b, nftId));

      return Response.json({ success: true, battles });
    }

    // Battle list — active or history
    const isHistory = status === 'history';
    const query = isHistory
      ? `SELECT b.*, na.full_name as name_a, nb.full_name as name_b,
               pma.ipfs_image_uri as image_a, pmb.ipfs_image_uri as image_b
         FROM battles b
         LEFT JOIN nft_names na ON na.edition_number = b.nft_a_edition
         LEFT JOIN nft_names nb ON nb.edition_number = b.nft_b_edition
         LEFT JOIN phase2_mints pma ON pma.mint_number = b.nft_a_edition
         LEFT JOIN phase2_mints pmb ON pmb.mint_number = b.nft_b_edition
         WHERE b.status IN ('completed', 'draw')
         ORDER BY b.resolved_at DESC
         LIMIT ? OFFSET ?`
      : `SELECT b.*, na.full_name as name_a, nb.full_name as name_b,
               pma.ipfs_image_uri as image_a, pmb.ipfs_image_uri as image_b
         FROM battles b
         LEFT JOIN nft_names na ON na.edition_number = b.nft_a_edition
         LEFT JOIN nft_names nb ON nb.edition_number = b.nft_b_edition
         LEFT JOIN phase2_mints pma ON pma.mint_number = b.nft_a_edition
         LEFT JOIN phase2_mints pmb ON pmb.mint_number = b.nft_b_edition
         WHERE b.status = ?
         ORDER BY b.ends_at ASC
         LIMIT ? OFFSET ?`;

    const results = isHistory
      ? await context.env.DB.prepare(query).bind(limit, offset).all()
      : await context.env.DB.prepare(query).bind(status, limit, offset).all();

    // For resolved battles, compute score deltas from frozen end scores
    const deltaMap = new Map<number, { deltaA: number; deltaB: number }>();
    for (const b of (results.results || [])) {
      if (b.status !== 'completed' && b.status !== 'draw') continue;
      const startA = (b.nft_a_score_start as number) ?? 0;
      const startB = (b.nft_b_score_start as number) ?? 0;
      const endA = b.nft_a_score_end as number | null;
      const endB = b.nft_b_score_end as number | null;
      // Use stored end scores when available; fall back to start (delta=0) for legacy rows
      deltaMap.set(b.id as number, {
        deltaA: endA != null ? endA - startA : 0,
        deltaB: endB != null ? endB - startB : 0,
      });
    }

    const battles = (results.results || []).map((b) => {
      const isResolved = b.status === 'completed' || b.status === 'draw';
      const deltas = deltaMap.get(b.id as number);
      return {
        id: b.id,
        nftA: {
          id: b.nft_a_id,
          edition: b.nft_a_edition,
          ownerDid: b.nft_a_owner_did,
          name: b.name_a || `Your Wojak #${b.nft_a_edition}`,
          imageUri: resolveImageUri(b.image_a as string | null),
          ...(isResolved && deltas ? { scoreDelta: deltas.deltaA } : {}),
        },
        nftB: {
          id: b.nft_b_id,
          edition: b.nft_b_edition,
          ownerDid: b.nft_b_owner_did,
          name: b.name_b || `Your Wojak #${b.nft_b_edition}`,
          imageUri: resolveImageUri(b.image_b as string | null),
          ...(isResolved && deltas ? { scoreDelta: deltas.deltaB } : {}),
        },
        status: b.status,
        winner: b.winner_nft_id,
        startedAt: b.started_at,
        endsAt: b.ends_at,
        resolvedAt: b.resolved_at,
      };
    });

    // Also get queue count
    const queueCount = await context.env.DB.prepare(
      'SELECT COUNT(*) as count FROM battle_queue'
    ).first<{ count: number }>();

    // If voterDid provided, fetch their queued NFTs
    let queuedNfts: { nftId: string; editionNumber: number; name: string; queuedAt: string }[] = [];
    if (voterDid) {
      const queued = await context.env.DB.prepare(`
        SELECT bq.nft_id, bq.edition_number, bq.queued_at, nn.custom_name, nn.full_name
        FROM battle_queue bq
        LEFT JOIN nft_names nn ON bq.edition_number = nn.edition_number
        WHERE bq.owner_did = ?
        ORDER BY bq.queued_at DESC
      `).bind(voterDid).all();

      queuedNfts = (queued.results || []).map((row: Record<string, unknown>) => ({
        nftId: row.nft_id as string,
        editionNumber: row.edition_number as number,
        name: (row.full_name as string) || `Your Wojak #${row.edition_number}`,
        queuedAt: row.queued_at as string,
      }));
    }

    return Response.json({
      success: true,
      battles,
      queueSize: queueCount?.count ?? 0,
      queuedNfts,
      pagination: { limit, offset },
    });
  } catch (err) {
    console.error('Battle list error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};

function formatBattle(b: Record<string, unknown>, perspectiveNftId: string) {
  const isA = b.nft_a_id === perspectiveNftId;
  const won = b.winner_nft_id === perspectiveNftId;
  const isResolved = b.status === 'completed' || b.status === 'draw';

  // Compute deltas from frozen end scores
  const startA = (b.nft_a_score_start as number) ?? 0;
  const startB = (b.nft_b_score_start as number) ?? 0;
  const endA = b.nft_a_score_end as number | null;
  const endB = b.nft_b_score_end as number | null;
  const deltaA = endA != null ? endA - startA : 0;
  const deltaB = endB != null ? endB - startB : 0;

  return {
    id: b.id,
    status: b.status,
    result: b.status === 'completed' ? (won ? 'win' : 'loss') :
            b.status === 'draw' ? 'draw' : 'pending',
    myNft: {
      id: isA ? b.nft_a_id : b.nft_b_id,
      edition: isA ? b.nft_a_edition : b.nft_b_edition,
      name: isA ? b.name_a : b.name_b,
      imageUri: resolveImageUri((isA ? b.image_a : b.image_b) as string | null),
      ...(isResolved ? { scoreDelta: isA ? deltaA : deltaB } : {}),
    },
    opponent: {
      id: isA ? b.nft_b_id : b.nft_a_id,
      edition: isA ? b.nft_b_edition : b.nft_a_edition,
      name: isA ? b.name_b : b.name_a,
      imageUri: resolveImageUri((isA ? b.image_b : b.image_a) as string | null),
      ...(isResolved ? { scoreDelta: isA ? deltaB : deltaA } : {}),
    },
    startedAt: b.started_at,
    endsAt: b.ends_at,
    resolvedAt: b.resolved_at,
  };
}
