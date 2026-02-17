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

    // Active battles list
    const results = await context.env.DB.prepare(`
      SELECT
        b.*,
        na.full_name as name_a,
        nb.full_name as name_b
      FROM battles b
      LEFT JOIN nft_names na ON na.edition_number = b.nft_a_edition
      LEFT JOIN nft_names nb ON nb.edition_number = b.nft_b_edition
      WHERE b.status = ?
      ORDER BY b.ends_at ASC
      LIMIT ? OFFSET ?
    `).bind(status, limit, offset).all();

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

    return Response.json({
      success: true,
      battles,
      queueSize: queueCount?.count ?? 0,
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
  const lost = b.winner_nft_id && b.winner_nft_id !== perspectiveNftId;

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
