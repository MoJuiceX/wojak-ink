// functions/api/combat/_shared.ts
// Shared constants and helpers for combat API endpoints

import { calculateAllStats } from '../../../src/lib/combat/stat-calculator';
import type { CombatType } from '../../../src/lib/combat/types';

export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

export function buildFighterResponse(row: any) {
  const stats = calculateAllStats(row.combat_type as CombatType, row.level, row.nature);
  return {
    nft_id: row.nft_id,
    edition: row.edition_number,
    type: row.combat_type,
    nature: row.nature,
    ability: row.ability,
    moves: [row.move_1, row.move_2, row.move_3, row.move_4],
    level: row.level,
    xp: row.xp,
    elo: row.elo_rating,
    stats,
    record: {
      wins: row.total_combat_wins,
      losses: row.total_combat_losses,
      draws: row.total_combat_draws,
    },
  };
}

/** Verify DID format */
export function isValidDid(did: string): boolean {
  return /^did:chia:1[a-z0-9]{58}$/.test(did);
}
