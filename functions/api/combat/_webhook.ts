// functions/api/combat/_webhook.ts
// Webhook dispatch for agent battle events (ported from ClawCombat battle-engine.js Section 14)

import { getEffectiveness } from '../../../src/lib/combat/data/type-chart';
import type { CombatType } from '../../../src/lib/combat/types';

const WEBHOOK_TIMEOUT_MS = 5000;

/** Fire-and-forget webhook. Never throws. */
async function sendWebhook(webhookUrl: string, payload: Record<string, unknown>): Promise<void> {
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });
  } catch (err) {
    console.error('[Webhook] Failed to send:', (err as Error).message);
  }
}

/** Send battle_start webhook to an agent */
export async function sendBattleStartWebhook(
  db: D1Database,
  battleId: number,
  agentDid: string,
  side: 'A' | 'B',
  fighterA: Record<string, unknown>,
  fighterB: Record<string, unknown>,
): Promise<void> {
  const agent = await db.prepare(
    "SELECT webhook_url FROM combat_agents WHERE owner_did = ? AND status = 'active'"
  ).bind(agentDid).first<{ webhook_url: string | null }>();

  if (!agent?.webhook_url) return;

  const yours = side === 'A' ? fighterA : fighterB;
  const theirs = side === 'A' ? fighterB : fighterA;
  const yourType = yours.combat_type as CombatType;
  const theirType = theirs.combat_type as CombatType;

  await sendWebhook(agent.webhook_url, {
    event: 'battle_start',
    battle_id: battleId,
    timeout_ms: 30000,
    your_side: side,
    your_fighter: {
      nft_id: yours.nft_id,
      edition: yours.edition_number,
      type: yours.combat_type,
      ability: yours.ability,
      level: yours.level,
      moves: [yours.move_1, yours.move_2, yours.move_3, yours.move_4],
    },
    opponent: {
      nft_id: theirs.nft_id,
      edition: theirs.edition_number,
      type: theirs.combat_type,
      ability: theirs.ability,
      level: theirs.level,
    },
    type_matchup: {
      your_offense: getEffectiveness(yourType, theirType),
      their_offense: getEffectiveness(theirType, yourType),
    },
  });
}

/** Send battle_turn or battle_end webhook to an agent */
export async function sendBattleTurnWebhook(
  db: D1Database,
  battleId: number,
  agentDid: string,
  side: 'A' | 'B',
  turnResult: Record<string, unknown>,
  battleStatus: string,
  winnerNft: string | null,
): Promise<void> {
  const agent = await db.prepare(
    "SELECT webhook_url FROM combat_agents WHERE owner_did = ? AND status = 'active'"
  ).bind(agentDid).first<{ webhook_url: string | null }>();

  if (!agent?.webhook_url) return;

  const eventName = battleStatus === 'finished' ? 'battle_end' : 'battle_turn';

  await sendWebhook(agent.webhook_url, {
    event: eventName,
    battle_id: battleId,
    timeout_ms: 30000,
    your_side: side,
    turn_number: turnResult.turnNumber,
    events: turnResult.events,
    status: battleStatus,
    winner_nft: winnerNft,
    end_of_turn: turnResult.end_of_turn,
  });
}
