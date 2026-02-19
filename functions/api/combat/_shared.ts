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

export function buildFighterResponse(row: Record<string, unknown>) {
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

/** Hash an API key with SHA-256 (same approach as ClawCombat auth.js) */
export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Generate a random hex string of given byte length */
export function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Generate an API key with prefix */
export function generateApiKey(): string {
  return `wjk_sk_${randomHex(32)}`;
}

/** Validate agent name: 3-50 chars, alphanumeric + dash/underscore */
export function isValidAgentName(name: string): boolean {
  return /^[a-zA-Z0-9_-]{3,50}$/.test(name);
}

/** Validate webhook URL: must be HTTPS */
export function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Authenticate agent from Authorization header. Returns agent row or null. */
export async function authenticateAgent(
  request: Request,
  db: D1Database
): Promise<Record<string, unknown> | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  if (!token.startsWith('wjk_sk_')) return null;

  const keyHash = await hashApiKey(token);
  const agent = await db.prepare(
    "SELECT * FROM combat_agents WHERE api_key_hash = ? AND status = 'active'"
  ).bind(keyHash).first();

  return agent ?? null;
}

/** Check rate limit for agent. Returns { allowed: boolean, retryAfter?: number } */
export function checkAgentRateLimit(agent: Record<string, unknown>): { allowed: boolean; retryAfter?: number } {
  const now = new Date();
  const utcDate = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const utcHour = now.toISOString().slice(0, 13);  // YYYY-MM-DDTHH

  // Determine tier
  let tier = agent.tier as string;
  if (tier === 'trial') {
    const trialStart = new Date(agent.trial_start_at);
    const daysSince = (now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 14) tier = 'free'; // Trial expired
  }

  if (tier === 'trial' || tier === 'premium') {
    // 1 fight per hour
    if (agent.fights_hour_start === utcHour && agent.fights_this_hour >= 1) {
      const nextHour = new Date(now);
      nextHour.setMinutes(0, 0, 0);
      nextHour.setHours(nextHour.getHours() + 1);
      return { allowed: false, retryAfter: Math.ceil((nextHour.getTime() - now.getTime()) / 1000) };
    }
    return { allowed: true };
  }

  // Free: 6 fights per day
  if (agent.fights_today_date === utcDate && agent.fights_today >= 6) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return { allowed: false, retryAfter: Math.ceil((tomorrow.getTime() - now.getTime()) / 1000) };
  }

  return { allowed: true };
}

/** Increment rate limit counters for agent */
export async function incrementAgentFightCount(db: D1Database, agentId: string): Promise<void> {
  const now = new Date();
  const utcDate = now.toISOString().slice(0, 10);
  const utcHour = now.toISOString().slice(0, 13);

  await db.prepare(`
    UPDATE combat_agents SET
      fights_today = CASE WHEN fights_today_date = ? THEN fights_today + 1 ELSE 1 END,
      fights_today_date = ?,
      fights_this_hour = CASE WHEN fights_hour_start = ? THEN fights_this_hour + 1 ELSE 1 END,
      fights_hour_start = ?,
      last_active_at = datetime('now')
    WHERE id = ?
  `).bind(utcDate, utcDate, utcHour, utcHour, agentId).run();
}
