// GET /api/game/leaderboard?limit=50&offset=0
// Returns ranked players by Power Level.

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const results = await context.env.DB.prepare(`
      SELECT
        did_id,
        wallet_address,
        power_level,
        total_votes_cast,
        created_at
      FROM game_players
      WHERE phase1_verified = 1 AND power_level > 0
      ORDER BY power_level DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();

    const total = await context.env.DB.prepare(
      'SELECT COUNT(*) as count FROM game_players WHERE phase1_verified = 1 AND power_level > 0'
    ).first();

    return Response.json({
      success: true,
      entries: results.results.map((row: Record<string, unknown>, i: number) => ({
        rank: offset + i + 1,
        did: row.did_id,
        walletAddress: row.wallet_address,
        powerLevel: row.power_level,
        totalVotesCast: row.total_votes_cast,
      })),
      pagination: {
        limit,
        offset,
        total: (total?.count as number) || 0,
        hasMore: offset + limit < ((total?.count as number) || 0),
      },
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
