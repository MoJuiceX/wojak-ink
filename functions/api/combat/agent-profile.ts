// functions/api/combat/agent-profile.ts
// GET /api/combat/agent-profile?did=xxx — public agent profile

import { jsonResponse, errorResponse, isValidDid, buildFighterResponse } from './_shared';

interface AgentRow {
  id: number;
  owner_did: string;
  name: string;
  status: string;
  tier: string;
  created_at: string;
}

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const did = url.searchParams.get('did');
  const agentId = url.searchParams.get('id');

  const db = context.env.DB;
  let agent: AgentRow | null = null;

  if (agentId) {
    agent = await db.prepare(
      "SELECT id, owner_did, name, status, tier, created_at FROM combat_agents WHERE id = ? AND status = 'active'"
    ).bind(agentId).first();
  } else if (did) {
    if (!isValidDid(did)) return errorResponse('Invalid DID format');
    agent = await db.prepare(
      "SELECT id, owner_did, name, status, tier, created_at FROM combat_agents WHERE owner_did = ? AND status = 'active'"
    ).bind(did).first();
  } else {
    return errorResponse('Missing did or id parameter');
  }

  if (!agent) return errorResponse('Agent not found', 404);

  // Get fighters
  const fighters = await db.prepare(
    'SELECT * FROM combat_fighters WHERE owner_did = ? ORDER BY level DESC'
  ).bind(agent.owner_did).all();

  const fighterList = (fighters.results ?? []).map((row: Record<string, unknown>) => buildFighterResponse(row));

  // Get battle stats
  const statsRow = await db.prepare(`
    SELECT
      COUNT(*) as total_battles,
      SUM(CASE WHEN winner_nft IN (SELECT nft_id FROM combat_fighters WHERE owner_did = ?) THEN 1 ELSE 0 END) as wins
    FROM combat_battles
    WHERE status = 'completed'
      AND (fighter_a_did = ? OR fighter_b_did = ?)
  `).bind(agent.owner_did, agent.owner_did, agent.owner_did).first<{ total_battles: number; wins: number }>();

  return jsonResponse({
    agent_id: agent.id,
    name: agent.name,
    tier: agent.tier,
    status: agent.status,
    created_at: agent.created_at,
    fighters: fighterList,
    battle_stats: {
      total: statsRow?.total_battles ?? 0,
      wins: statsRow?.wins ?? 0,
      losses: (statsRow?.total_battles ?? 0) - (statsRow?.wins ?? 0),
    },
  });
};
