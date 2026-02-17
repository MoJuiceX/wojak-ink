interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const authHeader = context.request.headers.get('Authorization');
  if (!context.env.ADMIN_SECRET || authHeader !== `Bearer ${context.env.ADMIN_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [players, voting, battles, queue, burns, indexer] = await context.env.DB.batch([
      context.env.DB.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN phase1_verified = 1 THEN 1 ELSE 0 END) as verified,
          SUM(CASE WHEN votes_today_reset = date('now') AND votes_today > 0 THEN 1 ELSE 0 END) as activeToday,
          SUM(CASE WHEN last_indexed_at IS NULL THEN 1 ELSE 0 END) as neverIndexed
        FROM game_players
      `),
      context.env.DB.prepare(`
        SELECT
          COUNT(*) as totalVotes,
          SUM(CASE WHEN created_at > datetime('now', '-24 hours') THEN 1 ELSE 0 END) as votesToday
        FROM wojak_votes
      `),
      context.env.DB.prepare(`
        SELECT
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'draw' THEN 1 ELSE 0 END) as draws,
          SUM(CASE WHEN status = 'active' AND ends_at < datetime('now') THEN 1 ELSE 0 END) as overdueActive
        FROM battles
      `),
      context.env.DB.prepare('SELECT COUNT(*) as inQueue FROM battle_queue'),
      context.env.DB.prepare(`
        SELECT COUNT(*) as total, COALESCE(SUM(credits_awarded), 0) as creditsAwarded FROM wojak_burns
      `),
      context.env.DB.prepare(`
        SELECT
          SUM(CASE WHEN last_indexed_at IS NULL THEN 1 ELSE 0 END) as neverIndexed,
          SUM(CASE WHEN last_indexed_at < datetime('now', '-24 hours') THEN 1 ELSE 0 END) as staleOver24h,
          SUM(CASE WHEN index_error_count > 0 THEN 1 ELSE 0 END) as withErrors,
          MAX(index_error_count) as highestErrorCount
        FROM game_players
      `),
    ]);

    return Response.json({
      players: players.results[0],
      voting: voting.results[0],
      battles: { ...battles.results[0], inQueue: queue.results[0]?.inQueue ?? 0 },
      burns: burns.results[0],
      indexer: indexer.results[0],
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json({ error: 'Status check failed', detail: String(err) }, { status: 500 });
  }
};
