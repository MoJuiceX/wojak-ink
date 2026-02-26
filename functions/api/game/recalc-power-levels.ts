// POST /api/game/recalc-power-levels
// Batch recalculates power levels for all phase1_verified players using simple formula.
// Called manually by admin when needed.

import { calculateFullPower } from '../fight-club/_power';

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const authHeader = context.request.headers.get('Authorization');
  if (!context.env.ADMIN_SECRET || authHeader !== `Bearer ${context.env.ADMIN_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const players = await context.env.DB.prepare(`
      SELECT did_id FROM game_players WHERE phase1_verified = 1
    `).all();

    const playerList = players.results || [];
    if (playerList.length === 0) {
      return Response.json({ success: true, updated: 0, message: 'No verified players.' });
    }

    let updated = 0;
    const errors: string[] = [];

    for (const player of playerList) {
      const did = player.did_id as string;
      try {
        const power = await calculateFullPower(context.env.DB, did);
        await context.env.DB.prepare(`
          UPDATE game_players
          SET power_level = ?, power_level_updated_at = datetime('now'), updated_at = datetime('now')
          WHERE did_id = ?
        `).bind(power.totalPower, did).run();
        updated += 1;
      } catch (err) {
        errors.push(`${did}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return Response.json({
      success: true,
      updated,
      total: playerList.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('Recalc power levels error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
