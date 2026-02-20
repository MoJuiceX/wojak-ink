// functions/api/combat/agent-surrender.ts
// POST /api/combat/agent-surrender — forfeit active battle

import { jsonResponse, errorResponse, authenticateAgent } from './_shared';
import { calculateXPAward, calculateELOChange, calculateLevelFromXP } from '../../../src/lib/combat/xp-elo-calculator';

interface CombatBattleRow {
  id: number;
  fighter_a_nft: string;
  fighter_b_nft: string;
  fighter_a_did: string;
  fighter_b_did: string;
  fighter_a_level: number;
  fighter_b_level: number;
  fighter_a_elo: number;
  fighter_b_elo: number;
  current_turn: number;
  status: string;
  winner_nft: string | null;
}

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const agent = await authenticateAgent(context.request, context.env.DB);
  if (!agent) return errorResponse('Unauthorized', 401);

  let body: { battle_id: number };
  try {
    body = await context.request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  if (!body.battle_id) return errorResponse('Missing battle_id');

  const db = context.env.DB;

  const battle = await db.prepare(
    "SELECT * FROM combat_battles WHERE id = ? AND status IN ('active', 'waiting_moves')"
  ).bind(body.battle_id).first<CombatBattleRow>();

  if (!battle) return errorResponse('Battle not found or not active', 404);

  const isA = battle.fighter_a_did === agent.owner_did;
  const isB = battle.fighter_b_did === agent.owner_did;
  if (!isA && !isB) return errorResponse('Not a participant', 403);

  const winnerNft = isA ? battle.fighter_b_nft : battle.fighter_a_nft;
  const loserNft = isA ? battle.fighter_a_nft : battle.fighter_b_nft;

  // Award XP/ELO as a loss for the surrendering side
  const winnerLevel = isA ? battle.fighter_b_level : battle.fighter_a_level;
  const loserLevel = isA ? battle.fighter_a_level : battle.fighter_b_level;
  const winnerElo = isA ? battle.fighter_b_elo : battle.fighter_a_elo;
  const loserElo = isA ? battle.fighter_a_elo : battle.fighter_b_elo;

  const xpWinner = calculateXPAward('win', winnerLevel, loserLevel, winnerElo, loserElo);
  const xpLoser = calculateXPAward('loss', loserLevel, winnerLevel, loserElo, winnerElo);
  const eloWinner = calculateELOChange(winnerElo, loserElo, 1.0);
  const eloLoser = calculateELOChange(loserElo, winnerElo, 0.0);

  const winnerRow = await db.prepare('SELECT xp FROM combat_fighters WHERE nft_id = ?').bind(winnerNft).first<{ xp: number }>();
  const loserRow = await db.prepare('SELECT xp FROM combat_fighters WHERE nft_id = ?').bind(loserNft).first<{ xp: number }>();

  await db.batch([
    db.prepare("UPDATE combat_battles SET status = 'completed', winner_nft = ?, ended_at = datetime('now'), elo_change_a = ?, elo_change_b = ?, xp_awarded_a = ?, xp_awarded_b = ? WHERE id = ?")
      .bind(winnerNft, isA ? eloLoser : eloWinner, isA ? eloWinner : eloLoser, isA ? xpLoser : xpWinner, isA ? xpWinner : xpLoser, battle.id),
    db.prepare("UPDATE combat_fighters SET xp = xp + ?, elo_rating = elo_rating + ?, total_combat_wins = total_combat_wins + 1, level = ?, updated_at = datetime('now') WHERE nft_id = ?")
      .bind(xpWinner, eloWinner, calculateLevelFromXP((winnerRow?.xp ?? 0) + xpWinner), winnerNft),
    db.prepare("UPDATE combat_fighters SET xp = xp + ?, elo_rating = elo_rating + ?, total_combat_losses = total_combat_losses + 1, level = ?, updated_at = datetime('now') WHERE nft_id = ?")
      .bind(xpLoser, eloLoser, calculateLevelFromXP((loserRow?.xp ?? 0) + xpLoser), loserNft),
  ]);

  return jsonResponse({ status: 'surrendered', winner_nft: winnerNft });
};
