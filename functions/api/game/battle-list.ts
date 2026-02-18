// GET /api/game/battle-list?status=active&limit=20&offset=0
// GET /api/game/battle-list?nftId=xxx — battle history for a specific NFT
// Returns active battles with score deltas, or battle history.

interface Env {
  DB: D1Database;
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
          nb.full_name as name_b
        FROM battles b
        LEFT JOIN nft_names na ON na.edition_number = b.nft_a_edition
        LEFT JOIN nft_names nb ON nb.edition_number = b.nft_b_edition
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
      ? `SELECT b.*, na.full_name as name_a, nb.full_name as name_b
         FROM battles b
         LEFT JOIN nft_names na ON na.edition_number = b.nft_a_edition
         LEFT JOIN nft_names nb ON nb.edition_number = b.nft_b_edition
         WHERE b.status IN ('completed', 'draw')
         ORDER BY b.resolved_at DESC
         LIMIT ? OFFSET ?`
      : `SELECT b.*, na.full_name as name_a, nb.full_name as name_b
         FROM battles b
         LEFT JOIN nft_names na ON na.edition_number = b.nft_a_edition
         LEFT JOIN nft_names nb ON nb.edition_number = b.nft_b_edition
         WHERE b.status = ?
         ORDER BY b.ends_at ASC
         LIMIT ? OFFSET ?`;

    const results = isHistory
      ? await context.env.DB.prepare(query).bind(limit, offset).all()
      : await context.env.DB.prepare(query).bind(status, limit, offset).all();

    // For resolved battles, compute score deltas from snapshots
    const resolvedBattles = (results.results || []).filter(
      b => b.status === 'completed' || b.status === 'draw'
    );
    const deltaMap = new Map<number, { deltaA: number; deltaB: number }>();

    if (resolvedBattles.length > 0) {
      const allNftIds = new Set<string>();
      for (const b of resolvedBattles) {
        allNftIds.add(b.nft_a_id as string);
        allNftIds.add(b.nft_b_id as string);
      }
      const placeholders = [...allNftIds].map(() => '?').join(',');
      const scores = await context.env.DB.prepare(
        `SELECT nft_id, net_score FROM wojak_scores WHERE nft_id IN (${placeholders})`
      ).bind(...allNftIds).all<{ nft_id: string; net_score: number }>();

      const scoreMap = new Map<string, number>();
      for (const s of scores.results || []) {
        scoreMap.set(s.nft_id, s.net_score);
      }

      for (const b of resolvedBattles) {
        const currentA = scoreMap.get(b.nft_a_id as string) ?? 0;
        const currentB = scoreMap.get(b.nft_b_id as string) ?? 0;
        const snapshotA = (b.nft_a_score_start as number) ?? 0;
        const snapshotB = (b.nft_b_score_start as number) ?? 0;
        deltaMap.set(b.id as number, {
          deltaA: currentA - snapshotA,
          deltaB: currentB - snapshotB,
        });
      }
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
          ...(isResolved && deltas ? { scoreDelta: deltas.deltaA } : {}),
        },
        nftB: {
          id: b.nft_b_id,
          edition: b.nft_b_edition,
          ownerDid: b.nft_b_owner_did,
          name: b.name_b || `Your Wojak #${b.nft_b_edition}`,
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

  return {
    id: b.id,
    status: b.status,
    result: b.status === 'completed' ? (won ? 'win' : 'loss') :
            b.status === 'draw' ? 'draw' : 'pending',
    myNft: isA
      ? { id: b.nft_a_id, edition: b.nft_a_edition, name: b.name_a }
      : { id: b.nft_b_id, edition: b.nft_b_edition, name: b.name_b },
    opponent: isA
      ? { id: b.nft_b_id, edition: b.nft_b_edition, name: b.name_b }
      : { id: b.nft_a_id, edition: b.nft_a_edition, name: b.name_a },
    startedAt: b.started_at,
    endsAt: b.ends_at,
    resolvedAt: b.resolved_at,
  };
}
