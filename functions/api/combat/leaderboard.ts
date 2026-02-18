// functions/api/combat/leaderboard.ts
// GET /api/combat/leaderboard?sortBy=elo|level|wins&limit=50

import { jsonResponse, errorResponse, buildFighterResponse } from './_shared';

interface Env {
  DB: D1Database;
}

const VALID_SORT_COLUMNS: Record<string, string> = {
  elo: 'elo_rating',
  level: 'level',
  wins: 'total_combat_wins',
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const sortBy = url.searchParams.get('sortBy') ?? 'elo';
  const limitParam = url.searchParams.get('limit') ?? '50';

  const sortColumn = VALID_SORT_COLUMNS[sortBy];
  if (!sortColumn) {
    return errorResponse('Invalid sortBy. Must be one of: elo, level, wins');
  }

  const limit = Math.min(Math.max(1, parseInt(limitParam, 10) || 50), 100);

  const db = context.env.DB;

  const results = await db.prepare(
    `SELECT * FROM combat_fighters ORDER BY ${sortColumn} DESC, nft_id ASC LIMIT ?`
  ).bind(limit).all();

  const fighters = (results.results ?? []).map((row: any) => buildFighterResponse(row));

  return jsonResponse({ sortBy, fighters });
};
