// GET /api/game/battle-list?status=active&limit=20&offset=0
// GET /api/game/battle-list?nftId=xxx — battle history for a specific NFT
// Returns active battles with vote counts, or battle history.

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

    // If voterDid provided, check which battles they've already voted in
    let votedBattleIds = new Set<number>();
    if (voterDid && results.results.length > 0) {
      const battleIds = results.results.map(b => b.id as number);
      const placeholders = battleIds.map(() => '?').join(',');
      const votes = await context.env.DB.prepare(
        `SELECT battle_id FROM battle_votes WHERE voter_did = ? AND battle_id IN (${placeholders})`
      ).bind(voterDid, ...battleIds).all<{ battle_id: number }>();
      votedBattleIds = new Set((votes.results || []).map(v => v.battle_id));
    }

    const battles = (results.results || []).map((b) => ({
      id: b.id,
      nftA: {
        id: b.nft_a_id,
        edition: b.nft_a_edition,
        ownerDid: b.nft_a_owner_did,
        name: b.name_a || `Your Wojak #${b.nft_a_edition}`,
        votes: b.votes_a,
      },
      nftB: {
        id: b.nft_b_id,
        edition: b.nft_b_edition,
        ownerDid: b.nft_b_owner_did,
        name: b.name_b || `Your Wojak #${b.nft_b_edition}`,
        votes: b.votes_b,
      },
      status: b.status,
      winner: b.winner_nft_id,
      startedAt: b.started_at,
      endsAt: b.ends_at,
      resolvedAt: b.resolved_at,
      hasVoted: votedBattleIds.has(b.id as number),
    }));

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
  const _lost = b.winner_nft_id && b.winner_nft_id !== perspectiveNftId;

  return {
    id: b.id,
    status: b.status,
    result: b.status === 'completed' ? (won ? 'win' : 'loss') :
            b.status === 'draw' ? 'draw' : 'pending',
    myNft: isA ? { id: b.nft_a_id, edition: b.nft_a_edition, votes: b.votes_a, name: b.name_a } :
                  { id: b.nft_b_id, edition: b.nft_b_edition, votes: b.votes_b, name: b.name_b },
    opponent: isA ? { id: b.nft_b_id, edition: b.nft_b_edition, votes: b.votes_b, name: b.name_b } :
                     { id: b.nft_a_id, edition: b.nft_a_edition, votes: b.votes_a, name: b.name_a },
    startedAt: b.started_at,
    endsAt: b.ends_at,
    resolvedAt: b.resolved_at,
  };
}
