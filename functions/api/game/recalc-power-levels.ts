// POST /api/game/recalc-power-levels
// Batch recalculates power levels for all phase1_verified players.
// Called by cron every 15 minutes or manually by admin.

import { recalcPowerLevel } from './_powerLevel';

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  // Admin auth
  const authHeader = context.request.headers.get('Authorization');
  if (!context.env.ADMIN_SECRET || authHeader !== `Bearer ${context.env.ADMIN_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all phase1_verified players
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
        const newLevel = await recalcPowerLevel(context.env.DB, did);
        if (newLevel !== null) updated += 1;
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
