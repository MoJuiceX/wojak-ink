# Agent Battle API Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add external AI agent support to the Combat Arena so users can register an agent (API key + webhook), queue fighters, and have their AI submit moves — ported from ClawCombat.

**Architecture:** New `combat_agents` table stores agent credentials per DID. New endpoints handle agent registration, queueing, and move submission. Webhook dispatch notifies agents of battle events. A turn timer (30s) with AI fallback prevents stale battles. Rate limiting enforces trial/free/premium tiers.

**Tech Stack:** Cloudflare Pages Functions (D1 SQLite), TypeScript, SHA-256 API key hashing, HTTP webhooks

**Design Doc:** `.claude/handoff/AGENT-BATTLE-API.md`

**ClawCombat Reference (for porting):**
- `/Users/abit_hex/ClawCombat/apps/backend/src/routes/agents.js` — agent registration
- `/Users/abit_hex/ClawCombat/apps/backend/src/middleware/auth.js` — API key auth
- `/Users/abit_hex/ClawCombat/apps/backend/src/services/battle-engine.js` — webhook dispatch + move submission

**Existing Wojak combat files you MUST read first:**
- `functions/api/combat/_shared.ts` — helpers (jsonResponse, errorResponse, isValidDid, buildFighterResponse)
- `functions/api/combat/submit-move.ts` — existing manual move submission (reuse `resolveBattleTurn` pattern)
- `functions/api/combat/resolve-turn.ts` — existing auto-battle resolution (has AI fallback via `chooseMove`)
- `functions/api/combat/queue.ts` — existing matchmaking (ELO ±100, cooldown, etc.)
- `functions/api/combat/battle.ts` — existing battle state GET endpoint
- `functions/api/combat/fighter.ts` — existing fighter lookup (supports `?ownerDid=xxx`)
- `functions/migrations/060_combat_system.sql` — existing schema
- `src/lib/combat/ai-strategist.ts` — built-in AI move selection (`chooseMove`)

---

## Package A: Database + Auth Foundation

### Task 1: Create migration for agent system

**Files:**
- Create: `functions/migrations/062_combat_agents.sql`

**Step 1: Write the migration**

Create `functions/migrations/062_combat_agents.sql`:

```sql
-- 062_combat_agents.sql
-- Agent system for external AI controllers (ported from ClawCombat)

-- One agent per DID — controls all fighters under that wallet
CREATE TABLE IF NOT EXISTS combat_agents (
  id TEXT PRIMARY KEY,
  owner_did TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  api_key_hash TEXT NOT NULL UNIQUE,
  webhook_url TEXT,
  webhook_secret TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'retired')),
  tier TEXT DEFAULT 'trial' CHECK(tier IN ('trial', 'free', 'premium')),
  trial_start_at TEXT DEFAULT (datetime('now')),
  fights_today INTEGER DEFAULT 0,
  fights_today_date TEXT,
  fights_this_hour INTEGER DEFAULT 0,
  fights_hour_start TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  last_active_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_combat_agents_api_key ON combat_agents(api_key_hash);
CREATE INDEX IF NOT EXISTS idx_combat_agents_did ON combat_agents(owner_did);

-- Track battle mode type per fighter (manual/auto/agent)
ALTER TABLE combat_battles ADD COLUMN fighter_a_mode_type TEXT DEFAULT 'manual';
ALTER TABLE combat_battles ADD COLUMN fighter_b_mode_type TEXT DEFAULT 'manual';

-- Track consecutive timeouts per side (3 = auto-forfeit)
ALTER TABLE combat_battles ADD COLUMN fighter_a_timeouts INTEGER DEFAULT 0;
ALTER TABLE combat_battles ADD COLUMN fighter_b_timeouts INTEGER DEFAULT 0;

-- Track last turn timestamp (for 30s timeout detection)
ALTER TABLE combat_battles ADD COLUMN last_turn_at TEXT;
```

**Step 2: Verify file exists**

Run: `ls functions/migrations/062_combat_agents.sql`

**Step 3: Commit**

```bash
git add functions/migrations/062_combat_agents.sql
git commit -m "migration: add combat_agents table and battle timeout columns"
```

---

### Task 2: Add agent auth helpers to _shared.ts

**Files:**
- Modify: `functions/api/combat/_shared.ts`

**Step 1: Add crypto import and agent auth functions**

Add to the end of `functions/api/combat/_shared.ts`:

```typescript
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
): Promise<any | null> {
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
export function checkAgentRateLimit(agent: any): { allowed: boolean; retryAfter?: number } {
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
```

**Step 2: Verify no TS errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add functions/api/combat/_shared.ts
git commit -m "feat: add agent auth helpers — API key hashing, rate limiting, validation"
```

---

## Package B: Agent Registration

### Task 3: Create agent-register endpoint

**Files:**
- Create: `functions/api/combat/agent-register.ts`

**Step 1: Create the endpoint**

Create `functions/api/combat/agent-register.ts`:

```typescript
// functions/api/combat/agent-register.ts
// POST /api/combat/agent-register — register an agent for a DID
// Returns a one-time API key (never stored in plaintext)

import {
  jsonResponse, errorResponse, isValidDid, isValidAgentName,
  isValidWebhookUrl, generateApiKey, hashApiKey, randomHex,
  buildFighterResponse,
} from './_shared';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await context.request.json<{
    ownerDid: string;
    name: string;
    webhook_url?: string;
  }>();

  const { ownerDid, name, webhook_url } = body;

  if (!ownerDid || !name) {
    return errorResponse('Missing required fields: ownerDid, name');
  }
  if (!isValidDid(ownerDid)) return errorResponse('Invalid DID format');
  if (!isValidAgentName(name)) {
    return errorResponse('Agent name must be 3-50 characters, alphanumeric + dash/underscore');
  }
  if (webhook_url && !isValidWebhookUrl(webhook_url)) {
    return errorResponse('Webhook URL must be HTTPS');
  }

  const db = context.env.DB;

  // Check if agent already exists for this DID
  const existing = await db.prepare(
    'SELECT id, status FROM combat_agents WHERE owner_did = ?'
  ).bind(ownerDid).first<{ id: string; status: string }>();

  if (existing && existing.status === 'active') {
    return errorResponse('Agent already exists for this DID. Retire it first to create a new one.');
  }

  // Generate credentials
  const agentId = crypto.randomUUID();
  const plaintextKey = generateApiKey();
  const keyHash = await hashApiKey(plaintextKey);
  const webhookSecret = randomHex(24);

  // Insert agent
  await db.prepare(`
    INSERT INTO combat_agents (id, owner_did, name, api_key_hash, webhook_url, webhook_secret)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(agentId, ownerDid, name, keyHash, webhook_url ?? null, webhookSecret).run();

  // Fetch fighters under this DID
  const fighters = await db.prepare(
    'SELECT * FROM combat_fighters WHERE owner_did = ? ORDER BY level DESC'
  ).bind(ownerDid).all();

  const fighterList = (fighters.results ?? []).map((row: any) => buildFighterResponse(row));

  return new Response(JSON.stringify({
    agent_id: agentId,
    name,
    api_key: plaintextKey,
    api_key_warning: 'Save this key now. It will not be shown again.',
    webhook_secret: webhookSecret,
    webhook_url: webhook_url ?? null,
    status: 'active',
    tier: 'trial',
    fighters: fighterList,
  }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
```

**Step 2: Verify no TS errors**

Run: `npx tsc --noEmit --pretty 2>&1 | grep agent-register || echo "No errors"`

**Step 3: Commit**

```bash
git add functions/api/combat/agent-register.ts
git commit -m "feat: create agent-register endpoint with API key + webhook setup"
```

---

### Task 4: Create agent-profile endpoint (public)

**Files:**
- Create: `functions/api/combat/agent-profile.ts`

**Step 1: Create the endpoint**

Create `functions/api/combat/agent-profile.ts`:

```typescript
// functions/api/combat/agent-profile.ts
// GET /api/combat/agent-profile?did=xxx — public agent profile

import { jsonResponse, errorResponse, isValidDid, buildFighterResponse } from './_shared';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const did = url.searchParams.get('did');
  const agentId = url.searchParams.get('id');

  const db = context.env.DB;
  let agent: any;

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

  const fighterList = (fighters.results ?? []).map((row: any) => buildFighterResponse(row));

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
```

**Step 2: Commit**

```bash
git add functions/api/combat/agent-profile.ts
git commit -m "feat: create agent-profile public endpoint"
```

---

### Task 5: Create agent-rotate-key endpoint

**Files:**
- Create: `functions/api/combat/agent-rotate-key.ts`

**Step 1: Create the endpoint**

Create `functions/api/combat/agent-rotate-key.ts`:

```typescript
// functions/api/combat/agent-rotate-key.ts
// POST /api/combat/agent-rotate-key — generate new API key, invalidate old one

import { jsonResponse, errorResponse, authenticateAgent, generateApiKey, hashApiKey } from './_shared';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const agent = await authenticateAgent(context.request, context.env.DB);
  if (!agent) return errorResponse('Unauthorized', 401);

  const newKey = generateApiKey();
  const newHash = await hashApiKey(newKey);

  await context.env.DB.prepare(
    'UPDATE combat_agents SET api_key_hash = ? WHERE id = ?'
  ).bind(newHash, agent.id).run();

  return jsonResponse({
    api_key: newKey,
    api_key_warning: 'Save this key now. It will not be shown again. Your old key is now invalid.',
  });
};
```

**Step 2: Commit**

```bash
git add functions/api/combat/agent-rotate-key.ts
git commit -m "feat: create agent-rotate-key endpoint"
```

---

## Package C: Agent Queue + Move Submission

### Task 6: Create agent-queue endpoint

**Files:**
- Create: `functions/api/combat/agent-queue.ts`
- Reference: `functions/api/combat/queue.ts` (port matchmaking logic)

**Step 1: Create the endpoint**

Create `functions/api/combat/agent-queue.ts`:

```typescript
// functions/api/combat/agent-queue.ts
// POST /api/combat/agent-queue — queue a fighter for battle via agent API key
// DELETE /api/combat/agent-queue — leave queue

import {
  jsonResponse, errorResponse, authenticateAgent,
  checkAgentRateLimit, incrementAgentFightCount,
} from './_shared';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const agent = await authenticateAgent(context.request, context.env.DB);
  if (!agent) return errorResponse('Unauthorized', 401);

  // Rate limit check
  const rateLimit = checkAgentRateLimit(agent);
  if (!rateLimit.allowed) {
    return new Response(JSON.stringify({
      error: 'Rate limit exceeded',
      retry_after: rateLimit.retryAfter,
      tier: agent.tier,
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(rateLimit.retryAfter ?? 60),
      },
    });
  }

  const body = await context.request.json<{
    nft_id: string;
    battle_mode?: 'agent' | 'auto';
  }>();

  const { nft_id, battle_mode = 'agent' } = body;
  if (!nft_id) return errorResponse('Missing nft_id');

  const db = context.env.DB;

  // Verify fighter exists and is owned by this agent's DID
  const fighter = await db.prepare(
    'SELECT nft_id, owner_did, elo_rating FROM combat_fighters WHERE nft_id = ?'
  ).bind(nft_id).first<{ nft_id: string; owner_did: string; elo_rating: number }>();

  if (!fighter) return errorResponse('Fighter not found', 404);
  if (fighter.owner_did !== agent.owner_did) return errorResponse('Not the owner of this fighter', 403);

  // Check not already in queue
  const inQueue = await db.prepare('SELECT id FROM combat_queue WHERE nft_id = ?').bind(nft_id).first();
  if (inQueue) return errorResponse('Fighter already in queue');

  // Check not in active battle
  const inBattle = await db.prepare(
    "SELECT id FROM combat_battles WHERE (fighter_a_nft = ? OR fighter_b_nft = ?) AND status IN ('active', 'waiting_moves')"
  ).bind(nft_id, nft_id).first();
  if (inBattle) return errorResponse('Fighter is in an active battle');

  // Insert into queue
  await db.prepare(
    'INSERT INTO combat_queue (nft_id, owner_did, battle_mode, elo_rating) VALUES (?, ?, ?, ?)'
  ).bind(nft_id, agent.owner_did, battle_mode, fighter.elo_rating).run();

  // Attempt matchmaking (same logic as queue.ts)
  const opponent = await db.prepare(
    `SELECT * FROM combat_queue
     WHERE nft_id != ? AND owner_did != ?
       AND elo_rating BETWEEN ? AND ?
     ORDER BY queued_at ASC LIMIT 1`
  ).bind(nft_id, agent.owner_did, fighter.elo_rating - 100, fighter.elo_rating + 100)
    .first<{ nft_id: string; owner_did: string; battle_mode: string; elo_rating: number }>();

  if (!opponent) {
    const position = await db.prepare('SELECT COUNT(*) as cnt FROM combat_queue').first<{ cnt: number }>();
    return jsonResponse({ status: 'queued', position: position?.cnt ?? 1 });
  }

  // Cooldown check
  const recentBattle = await db.prepare(
    `SELECT id FROM combat_battles
     WHERE ((fighter_a_nft = ? AND fighter_b_nft = ?) OR (fighter_a_nft = ? AND fighter_b_nft = ?))
       AND ended_at > datetime('now', '-1 hour')`
  ).bind(nft_id, opponent.nft_id, opponent.nft_id, nft_id).first();

  if (recentBattle) {
    return jsonResponse({ status: 'queued', position: 1, message: 'Waiting for non-cooldown opponent' });
  }

  // Load fighter levels for snapshot
  const fighterB = await db.prepare('SELECT level, elo_rating FROM combat_fighters WHERE nft_id = ?')
    .bind(opponent.nft_id).first<{ level: number; elo_rating: number }>();
  const fighterALevel = (await db.prepare('SELECT level FROM combat_fighters WHERE nft_id = ?')
    .bind(nft_id).first<{ level: number }>())?.level ?? 1;

  // Determine initial status based on modes
  const bothAuto = battle_mode === 'auto' && opponent.battle_mode === 'auto';
  const initialStatus = bothAuto ? 'active' : 'waiting_moves';

  // Create battle
  await db.batch([
    db.prepare('DELETE FROM combat_queue WHERE nft_id = ?').bind(nft_id),
    db.prepare('DELETE FROM combat_queue WHERE nft_id = ?').bind(opponent.nft_id),
    db.prepare(
      `INSERT INTO combat_battles
       (fighter_a_nft, fighter_a_did, fighter_a_mode, fighter_b_nft, fighter_b_did, fighter_b_mode,
        status, fighter_a_level, fighter_b_level, fighter_a_elo, fighter_b_elo,
        fighter_a_mode_type, fighter_b_mode_type, last_turn_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      nft_id, agent.owner_did, battle_mode,
      opponent.nft_id, opponent.owner_did, opponent.battle_mode,
      initialStatus,
      fighterALevel, fighterB?.level ?? 1,
      fighter.elo_rating, opponent.elo_rating,
      battle_mode, opponent.battle_mode,
    ),
  ]);

  // Increment fight count
  await incrementAgentFightCount(db, agent.id);

  // Get battle ID
  const newBattle = await db.prepare(
    'SELECT id FROM combat_battles WHERE fighter_a_nft = ? AND fighter_b_nft = ? ORDER BY id DESC LIMIT 1'
  ).bind(nft_id, opponent.nft_id).first<{ id: number }>();

  return jsonResponse({
    status: 'matched',
    battle_id: newBattle?.id,
    opponent: { nft_id: opponent.nft_id, elo: opponent.elo_rating },
  });
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const agent = await authenticateAgent(context.request, context.env.DB);
  if (!agent) return errorResponse('Unauthorized', 401);

  const url = new URL(context.request.url);
  const nftId = url.searchParams.get('nft_id');
  if (!nftId) return errorResponse('Missing nft_id');

  await context.env.DB.prepare(
    'DELETE FROM combat_queue WHERE nft_id = ? AND owner_did = ?'
  ).bind(nftId, agent.owner_did).run();

  return jsonResponse({ status: 'removed' });
};
```

**Step 2: Commit**

```bash
git add functions/api/combat/agent-queue.ts
git commit -m "feat: create agent-queue endpoint with matchmaking + rate limiting"
```

---

### Task 7: Create agent-move endpoint

**Files:**
- Create: `functions/api/combat/agent-move.ts`
- Reference: `functions/api/combat/submit-move.ts` (reuse resolveBattleTurn pattern)

**Step 1: Create the endpoint**

Create `functions/api/combat/agent-move.ts`:

```typescript
// functions/api/combat/agent-move.ts
// POST /api/combat/agent-move — submit a move via agent API key

import { jsonResponse, errorResponse, authenticateAgent } from './_shared';
import { resolveTurn } from '../../../src/lib/combat/turn-resolver';
import { initFighterState, initBattleState } from '../../../src/lib/combat/battle-state';
import { chooseMove } from '../../../src/lib/combat/ai-strategist';
import { calculateXPAward, calculateELOChange, calculateLevelFromXP } from '../../../src/lib/combat/xp-elo-calculator';
import type { CombatType } from '../../../src/lib/combat/types';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const agent = await authenticateAgent(context.request, context.env.DB);
  if (!agent) return errorResponse('Unauthorized', 401);

  const body = await context.request.json<{
    battle_id: number;
    move_id: string;
  }>();

  const { battle_id, move_id } = body;
  if (!battle_id || !move_id) return errorResponse('Missing battle_id or move_id');

  const db = context.env.DB;

  // Verify battle
  const battle = await db.prepare(
    "SELECT * FROM combat_battles WHERE id = ? AND status IN ('active', 'waiting_moves')"
  ).bind(battle_id).first<any>();

  if (!battle) return errorResponse('Battle not found or not active', 404);

  // Determine which side this agent controls
  const isA = battle.fighter_a_did === agent.owner_did;
  const isB = battle.fighter_b_did === agent.owner_did;
  if (!isA && !isB) return errorResponse('Your DID is not a participant in this battle', 403);

  const nftId = isA ? battle.fighter_a_nft : battle.fighter_b_nft;
  const side = isA ? 'a' : 'b';

  // Validate move belongs to fighter
  const fighter = await db.prepare('SELECT * FROM combat_fighters WHERE nft_id = ?').bind(nftId).first<any>();
  if (!fighter) return errorResponse('Fighter not found', 500);

  const validMoves = [fighter.move_1, fighter.move_2, fighter.move_3, fighter.move_4];
  if (!validMoves.includes(move_id)) return errorResponse('Invalid move for this fighter');

  // Get or create turn record
  const currentTurn = battle.current_turn;
  let turnRecord = await db.prepare(
    'SELECT * FROM combat_turns WHERE battle_id = ? AND turn_number = ?'
  ).bind(battle_id, currentTurn).first<any>();

  if (!turnRecord) {
    await db.prepare('INSERT INTO combat_turns (battle_id, turn_number) VALUES (?, ?)').bind(battle_id, currentTurn).run();
    turnRecord = { battle_id, turn_number: currentTurn };
  }

  // Check not already submitted
  const moveCol = side === 'a' ? 'fighter_a_move' : 'fighter_b_move';
  if (turnRecord[moveCol]) return errorResponse('Move already submitted for this turn', 409);

  // Store the move
  const timeCol = side === 'a' ? 'fighter_a_submitted_at' : 'fighter_b_submitted_at';
  await db.prepare(
    `UPDATE combat_turns SET ${moveCol} = ?, ${timeCol} = datetime('now') WHERE battle_id = ? AND turn_number = ?`
  ).bind(move_id, battle_id, currentTurn).run();

  // Check if both moves submitted
  const updated = await db.prepare(
    'SELECT * FROM combat_turns WHERE battle_id = ? AND turn_number = ?'
  ).bind(battle_id, currentTurn).first<any>();

  if (updated?.fighter_a_move && updated?.fighter_b_move) {
    // Both moves in — resolve turn (same pattern as submit-move.ts)
    const fighterARow = await db.prepare('SELECT * FROM combat_fighters WHERE nft_id = ?').bind(battle.fighter_a_nft).first<any>();
    const fighterBRow = await db.prepare('SELECT * FROM combat_fighters WHERE nft_id = ?').bind(battle.fighter_b_nft).first<any>();
    if (!fighterARow || !fighterBRow) return errorResponse('Fighter data missing', 500);

    const stateA = initFighterState({
      nftId: fighterARow.nft_id, type: fighterARow.combat_type as CombatType,
      nature: fighterARow.nature, ability: fighterARow.ability,
      moves: [fighterARow.move_1, fighterARow.move_2, fighterARow.move_3, fighterARow.move_4],
      level: fighterARow.level,
    });
    const stateB = initFighterState({
      nftId: fighterBRow.nft_id, type: fighterBRow.combat_type as CombatType,
      nature: fighterBRow.nature, ability: fighterBRow.ability,
      moves: [fighterBRow.move_1, fighterBRow.move_2, fighterBRow.move_3, fighterBRow.move_4],
      level: fighterBRow.level,
    });

    const battleState = initBattleState(stateA, stateB);

    // Replay previous turns
    const prevTurns = await db.prepare(
      'SELECT turn_result FROM combat_turns WHERE battle_id = ? AND turn_number < ? AND turn_result IS NOT NULL ORDER BY turn_number ASC'
    ).bind(battle_id, currentTurn).all();

    if (prevTurns.results) {
      for (const prev of prevTurns.results) {
        if (prev.turn_result) {
          const tr = JSON.parse(prev.turn_result as string);
          battleState.fighterA.currentHP = tr.end_of_turn.fighter_a_hp;
          battleState.fighterB.currentHP = tr.end_of_turn.fighter_b_hp;
          battleState.fighterA.status = tr.end_of_turn.fighter_a_status;
          battleState.fighterB.status = tr.end_of_turn.fighter_b_status;
          battleState.turnNumber++;
        }
      }
    }

    const turnResult = resolveTurn(battleState, updated.fighter_a_move, updated.fighter_b_move);

    const statements: D1PreparedStatement[] = [
      db.prepare(
        "UPDATE combat_turns SET turn_result = ?, resolved_at = datetime('now') WHERE battle_id = ? AND turn_number = ?"
      ).bind(JSON.stringify(turnResult), battle_id, currentTurn),
    ];

    if (battleState.status === 'finished') {
      statements.push(
        db.prepare(
          "UPDATE combat_battles SET current_turn = current_turn + 1, status = 'completed', winner_nft = ?, ended_at = datetime('now'), last_turn_at = datetime('now') WHERE id = ?"
        ).bind(battleState.winnerId, battle_id),
      );

      // XP/ELO
      const isWinnerA = battleState.winnerId === battle.fighter_a_nft;
      const isDraw = !battleState.winnerId;
      const resultA: 'win' | 'loss' | 'draw' = isDraw ? 'draw' : isWinnerA ? 'win' : 'loss';
      const resultB: 'win' | 'loss' | 'draw' = isDraw ? 'draw' : isWinnerA ? 'loss' : 'win';
      const xpA = calculateXPAward(resultA, battle.fighter_a_level, battle.fighter_b_level, battle.fighter_a_elo, battle.fighter_b_elo);
      const xpB = calculateXPAward(resultB, battle.fighter_b_level, battle.fighter_a_level, battle.fighter_b_elo, battle.fighter_a_elo);
      const eloA = calculateELOChange(battle.fighter_a_elo, battle.fighter_b_elo, isDraw ? 0.5 : isWinnerA ? 1.0 : 0.0);
      const eloB = calculateELOChange(battle.fighter_b_elo, battle.fighter_a_elo, isDraw ? 0.5 : !isWinnerA ? 1.0 : 0.0);

      statements.push(
        db.prepare('UPDATE combat_battles SET elo_change_a = ?, elo_change_b = ?, xp_awarded_a = ?, xp_awarded_b = ? WHERE id = ?')
          .bind(eloA, eloB, xpA, xpB, battle_id),
      );
      const winColA = resultA === 'win' ? 'total_combat_wins' : resultA === 'loss' ? 'total_combat_losses' : 'total_combat_draws';
      const winColB = resultB === 'win' ? 'total_combat_wins' : resultB === 'loss' ? 'total_combat_losses' : 'total_combat_draws';
      statements.push(
        db.prepare(`UPDATE combat_fighters SET xp = xp + ?, elo_rating = elo_rating + ?, ${winColA} = ${winColA} + 1, level = ?, updated_at = datetime('now') WHERE nft_id = ?`)
          .bind(xpA, eloA, calculateLevelFromXP(fighterARow.xp + xpA), battle.fighter_a_nft),
        db.prepare(`UPDATE combat_fighters SET xp = xp + ?, elo_rating = elo_rating + ?, ${winColB} = ${winColB} + 1, level = ?, updated_at = datetime('now') WHERE nft_id = ?`)
          .bind(xpB, eloB, calculateLevelFromXP(fighterBRow.xp + xpB), battle.fighter_b_nft),
      );
    } else {
      statements.push(
        db.prepare("UPDATE combat_battles SET current_turn = current_turn + 1, last_turn_at = datetime('now') WHERE id = ?").bind(battle_id),
      );
    }

    // Reset timeout counters (successful move = not a timeout)
    statements.push(
      db.prepare('UPDATE combat_battles SET fighter_a_timeouts = 0, fighter_b_timeouts = 0 WHERE id = ?').bind(battle_id),
    );

    await db.batch(statements);

    return jsonResponse({
      status: battleState.status === 'finished' ? 'completed' : 'turn_resolved',
      turn_number: battleState.turnNumber,
      events: turnResult.events,
      your_hp: isA ? turnResult.end_of_turn.fighter_a_hp : turnResult.end_of_turn.fighter_b_hp,
      opponent_hp: isA ? turnResult.end_of_turn.fighter_b_hp : turnResult.end_of_turn.fighter_a_hp,
      battle_status: battleState.status === 'finished' ? 'finished' : 'active',
      winner_nft: battleState.winnerId,
    });
  }

  return jsonResponse({ status: 'move_submitted', message: 'Waiting for opponent...' });
};
```

**Step 2: Commit**

```bash
git add functions/api/combat/agent-move.ts
git commit -m "feat: create agent-move endpoint for external AI move submission"
```

---

### Task 8: Create agent-battle and agent-surrender endpoints

**Files:**
- Create: `functions/api/combat/agent-battle.ts`
- Create: `functions/api/combat/agent-surrender.ts`

**Step 1: Create agent-battle (get battle state for agent)**

Create `functions/api/combat/agent-battle.ts`:

```typescript
// functions/api/combat/agent-battle.ts
// GET /api/combat/agent-battle?battle_id=xxx — get battle state from agent's perspective

import { jsonResponse, errorResponse, authenticateAgent, buildFighterResponse } from './_shared';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const agent = await authenticateAgent(context.request, context.env.DB);
  if (!agent) return errorResponse('Unauthorized', 401);

  const url = new URL(context.request.url);
  const battleId = url.searchParams.get('battle_id');

  const db = context.env.DB;

  // If no battle_id, find active battle for this DID
  let battle: any;
  if (battleId) {
    battle = await db.prepare('SELECT * FROM combat_battles WHERE id = ?').bind(battleId).first();
  } else {
    battle = await db.prepare(
      "SELECT * FROM combat_battles WHERE (fighter_a_did = ? OR fighter_b_did = ?) AND status IN ('active', 'waiting_moves') ORDER BY id DESC LIMIT 1"
    ).bind(agent.owner_did, agent.owner_did).first();
  }

  if (!battle) return errorResponse('No active battle found', 404);

  const isA = battle.fighter_a_did === agent.owner_did;

  // Load fighters
  const [fighterA, fighterB] = await Promise.all([
    db.prepare('SELECT * FROM combat_fighters WHERE nft_id = ?').bind(battle.fighter_a_nft).first(),
    db.prepare('SELECT * FROM combat_fighters WHERE nft_id = ?').bind(battle.fighter_b_nft).first(),
  ]);

  // Load turns
  const turns = await db.prepare(
    'SELECT turn_number, turn_result FROM combat_turns WHERE battle_id = ? ORDER BY turn_number ASC'
  ).bind(battle.id).all();

  const turnLog = turns.results?.map((t: any) => ({
    turn: t.turn_number,
    ...(t.turn_result ? JSON.parse(t.turn_result) : {}),
  })) ?? [];

  return jsonResponse({
    battle_id: battle.id,
    status: battle.status,
    your_side: isA ? 'A' : 'B',
    current_turn: battle.current_turn,
    max_turns: battle.max_turns,
    winner_nft: battle.winner_nft,
    your_fighter: isA ? (fighterA ? buildFighterResponse(fighterA) : null) : (fighterB ? buildFighterResponse(fighterB) : null),
    opponent: isA ? (fighterB ? buildFighterResponse(fighterB) : null) : (fighterA ? buildFighterResponse(fighterA) : null),
    turns: turnLog,
    started_at: battle.started_at,
    ended_at: battle.ended_at,
  });
};
```

**Step 2: Create agent-surrender**

Create `functions/api/combat/agent-surrender.ts`:

```typescript
// functions/api/combat/agent-surrender.ts
// POST /api/combat/agent-surrender — forfeit active battle

import { jsonResponse, errorResponse, authenticateAgent } from './_shared';
import { calculateXPAward, calculateELOChange, calculateLevelFromXP } from '../../../src/lib/combat/xp-elo-calculator';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const agent = await authenticateAgent(context.request, context.env.DB);
  if (!agent) return errorResponse('Unauthorized', 401);

  const body = await context.request.json<{ battle_id: number }>();
  if (!body.battle_id) return errorResponse('Missing battle_id');

  const db = context.env.DB;

  const battle = await db.prepare(
    "SELECT * FROM combat_battles WHERE id = ? AND status IN ('active', 'waiting_moves')"
  ).bind(body.battle_id).first<any>();

  if (!battle) return errorResponse('Battle not found or not active', 404);

  const isA = battle.fighter_a_did === agent.owner_did;
  const isB = battle.fighter_b_did === agent.owner_did;
  if (!isA && !isB) return errorResponse('Not a participant', 403);

  const winnerNft = isA ? battle.fighter_b_nft : battle.fighter_a_nft;
  const loserNft = isA ? battle.fighter_a_nft : battle.fighter_b_nft;

  // Award XP/ELO as a loss for the surrendering side
  const xpWinner = calculateXPAward('win', battle.fighter_a_level, battle.fighter_b_level, battle.fighter_a_elo, battle.fighter_b_elo);
  const xpLoser = calculateXPAward('loss', battle.fighter_b_level, battle.fighter_a_level, battle.fighter_b_elo, battle.fighter_a_elo);
  const eloWinner = calculateELOChange(isA ? battle.fighter_b_elo : battle.fighter_a_elo, isA ? battle.fighter_a_elo : battle.fighter_b_elo, 1.0);
  const eloLoser = calculateELOChange(isA ? battle.fighter_a_elo : battle.fighter_b_elo, isA ? battle.fighter_b_elo : battle.fighter_a_elo, 0.0);

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
```

**Step 3: Commit**

```bash
git add functions/api/combat/agent-battle.ts functions/api/combat/agent-surrender.ts
git commit -m "feat: create agent-battle state endpoint and agent-surrender"
```

---

## Package D: Webhook System

### Task 9: Create webhook dispatch module

**Files:**
- Create: `functions/api/combat/_webhook.ts`

**Step 1: Create the webhook dispatch helper**

Create `functions/api/combat/_webhook.ts`:

```typescript
// functions/api/combat/_webhook.ts
// Webhook dispatch for agent battle events (ported from ClawCombat battle-engine.js Section 14)

import { buildFighterResponse } from './_shared';
import { getTypeEffectiveness } from '../../../src/lib/combat/data/type-chart';
import type { CombatType } from '../../../src/lib/combat/types';

const WEBHOOK_TIMEOUT_MS = 5000;

/** Fire-and-forget webhook. Never throws. */
async function sendWebhook(webhookUrl: string, payload: any): Promise<void> {
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
  fighterA: any,
  fighterB: any,
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
      your_offense: getTypeEffectiveness(yourType, theirType),
      their_offense: getTypeEffectiveness(theirType, yourType),
    },
  });
}

/** Send battle_turn or battle_end webhook to an agent */
export async function sendBattleTurnWebhook(
  db: D1Database,
  battleId: number,
  agentDid: string,
  side: 'A' | 'B',
  turnResult: any,
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
```

**Step 2: Commit**

```bash
git add functions/api/combat/_webhook.ts
git commit -m "feat: create webhook dispatch module for agent battle events"
```

---

### Task 10: Wire webhooks into agent-queue (on match) and agent-move (on turn resolve)

**Files:**
- Modify: `functions/api/combat/agent-queue.ts`
- Modify: `functions/api/combat/agent-move.ts`

**Step 1: In agent-queue.ts, after battle creation, send battle_start webhooks**

After the `db.batch()` call that creates the battle (near the end of `onRequestPost`), add:

```typescript
import { sendBattleStartWebhook } from './_webhook';

// ... after db.batch and getting newBattle.id ...

// Send webhooks to both sides (fire-and-forget)
const fighterARow = await db.prepare('SELECT * FROM combat_fighters WHERE nft_id = ?').bind(nft_id).first<any>();
const fighterBRow = await db.prepare('SELECT * FROM combat_fighters WHERE nft_id = ?').bind(opponent.nft_id).first<any>();

if (fighterARow && fighterBRow && newBattle?.id) {
  sendBattleStartWebhook(db, newBattle.id, agent.owner_did, 'A', fighterARow, fighterBRow);
  sendBattleStartWebhook(db, newBattle.id, opponent.owner_did, 'B', fighterARow, fighterBRow);
}
```

**Step 2: In agent-move.ts, after turn resolves, send battle_turn/battle_end webhooks**

After the `db.batch(statements)` call, add:

```typescript
import { sendBattleTurnWebhook } from './_webhook';

// ... after db.batch(statements) in the "both moves submitted" block ...

// Send webhooks to both sides
sendBattleTurnWebhook(db, battle_id, battle.fighter_a_did, 'A', turnResult, battleState.status, battleState.winnerId);
sendBattleTurnWebhook(db, battle_id, battle.fighter_b_did, 'B', turnResult, battleState.status, battleState.winnerId);
```

**Step 3: Commit**

```bash
git add functions/api/combat/agent-queue.ts functions/api/combat/agent-move.ts
git commit -m "feat: wire webhook dispatch into agent-queue and agent-move"
```

---

## Package E: Turn Timer + Timeout

### Task 11: Create check-timeouts endpoint

**Files:**
- Create: `functions/api/combat/check-timeouts.ts`

**Context:** This endpoint checks all active battles for 30-second turn timeouts. Called lazily on battle state poll, or by a cron worker. Fixes the existing manual battle timeout gap.

**Step 1: Create the endpoint**

Create `functions/api/combat/check-timeouts.ts`:

```typescript
// functions/api/combat/check-timeouts.ts
// POST /api/combat/check-timeouts — resolve timed-out turns
// Called by cron or lazily on poll. Requires ADMIN_SECRET.

import { jsonResponse, errorResponse } from './_shared';
import { resolveTurn } from '../../../src/lib/combat/turn-resolver';
import { initFighterState, initBattleState } from '../../../src/lib/combat/battle-state';
import { chooseMove } from '../../../src/lib/combat/ai-strategist';
import { calculateXPAward, calculateELOChange, calculateLevelFromXP } from '../../../src/lib/combat/xp-elo-calculator';
import { sendBattleTurnWebhook } from './_webhook';
import type { CombatType } from '../../../src/lib/combat/types';

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

const TURN_TIMEOUT_SECONDS = 30;
const MAX_CONSECUTIVE_TIMEOUTS = 3;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const authHeader = context.request.headers.get('Authorization');
  if (!context.env.ADMIN_SECRET || authHeader !== `Bearer ${context.env.ADMIN_SECRET}`) {
    return errorResponse('Unauthorized', 401);
  }

  const db = context.env.DB;

  // Find battles where last_turn_at is older than 30 seconds
  const stale = await db.prepare(`
    SELECT * FROM combat_battles
    WHERE status IN ('active', 'waiting_moves')
      AND last_turn_at IS NOT NULL
      AND last_turn_at <= datetime('now', '-${TURN_TIMEOUT_SECONDS} seconds')
  `).all();

  if (!stale.results || stale.results.length === 0) {
    return jsonResponse({ success: true, resolved: 0 });
  }

  let resolved = 0;
  let forfeited = 0;

  for (const battle of stale.results) {
    const battleId = battle.id as number;
    const currentTurn = battle.current_turn as number;

    // Check which side(s) timed out
    const turnRecord = await db.prepare(
      'SELECT * FROM combat_turns WHERE battle_id = ? AND turn_number = ?'
    ).bind(battleId, currentTurn).first<any>();

    const moveAMissing = !turnRecord?.fighter_a_move;
    const moveBMissing = !turnRecord?.fighter_b_move;

    if (!moveAMissing && !moveBMissing) continue; // Both submitted, just slow to resolve

    // Update timeout counters
    let aTimeouts = (battle.fighter_a_timeouts as number) || 0;
    let bTimeouts = (battle.fighter_b_timeouts as number) || 0;
    if (moveAMissing) aTimeouts++;
    if (moveBMissing) bTimeouts++;

    // Check for forfeit
    if (aTimeouts >= MAX_CONSECUTIVE_TIMEOUTS || bTimeouts >= MAX_CONSECUTIVE_TIMEOUTS) {
      const winnerNft = aTimeouts >= MAX_CONSECUTIVE_TIMEOUTS
        ? battle.fighter_b_nft as string
        : battle.fighter_a_nft as string;

      await db.prepare(
        "UPDATE combat_battles SET status = 'completed', winner_nft = ?, ended_at = datetime('now'), fighter_a_timeouts = ?, fighter_b_timeouts = ? WHERE id = ?"
      ).bind(winnerNft, aTimeouts, bTimeouts, battleId).run();

      forfeited++;
      continue;
    }

    // AI picks moves for timed-out sides, then resolve
    const fighterARow = await db.prepare('SELECT * FROM combat_fighters WHERE nft_id = ?').bind(battle.fighter_a_nft).first<any>();
    const fighterBRow = await db.prepare('SELECT * FROM combat_fighters WHERE nft_id = ?').bind(battle.fighter_b_nft).first<any>();
    if (!fighterARow || !fighterBRow) continue;

    const stateA = initFighterState({
      nftId: fighterARow.nft_id, type: fighterARow.combat_type as CombatType,
      nature: fighterARow.nature, ability: fighterARow.ability,
      moves: [fighterARow.move_1, fighterARow.move_2, fighterARow.move_3, fighterARow.move_4],
      level: fighterARow.level,
    });
    const stateB = initFighterState({
      nftId: fighterBRow.nft_id, type: fighterBRow.combat_type as CombatType,
      nature: fighterBRow.nature, ability: fighterBRow.ability,
      moves: [fighterBRow.move_1, fighterBRow.move_2, fighterBRow.move_3, fighterBRow.move_4],
      level: fighterBRow.level,
    });

    const battleState = initBattleState(stateA, stateB);

    // Replay previous turns
    const prevTurns = await db.prepare(
      'SELECT turn_result FROM combat_turns WHERE battle_id = ? AND turn_result IS NOT NULL ORDER BY turn_number ASC'
    ).bind(battleId).all();

    if (prevTurns.results) {
      for (const prev of prevTurns.results) {
        if (prev.turn_result) {
          const tr = JSON.parse(prev.turn_result as string);
          battleState.fighterA.currentHP = tr.end_of_turn.fighter_a_hp;
          battleState.fighterB.currentHP = tr.end_of_turn.fighter_b_hp;
          battleState.fighterA.status = tr.end_of_turn.fighter_a_status;
          battleState.fighterB.status = tr.end_of_turn.fighter_b_status;
          battleState.turnNumber++;
        }
      }
    }

    // AI fallback for missing moves
    const moveA = turnRecord?.fighter_a_move ?? chooseMove(battleState.fighterA, battleState.fighterB);
    const moveB = turnRecord?.fighter_b_move ?? chooseMove(battleState.fighterB, battleState.fighterA);

    const turnResult = resolveTurn(battleState, moveA, moveB);

    const statements: D1PreparedStatement[] = [];

    // Ensure turn record exists
    if (!turnRecord) {
      statements.push(
        db.prepare('INSERT INTO combat_turns (battle_id, turn_number, fighter_a_move, fighter_b_move) VALUES (?, ?, ?, ?)')
          .bind(battleId, currentTurn, moveA, moveB),
      );
    }

    statements.push(
      db.prepare("UPDATE combat_turns SET fighter_a_move = ?, fighter_b_move = ?, turn_result = ?, resolved_at = datetime('now') WHERE battle_id = ? AND turn_number = ?")
        .bind(moveA, moveB, JSON.stringify(turnResult), battleId, currentTurn),
      db.prepare("UPDATE combat_battles SET fighter_a_timeouts = ?, fighter_b_timeouts = ?, last_turn_at = datetime('now') WHERE id = ?")
        .bind(aTimeouts, bTimeouts, battleId),
    );

    if (battleState.status === 'finished') {
      statements.push(
        db.prepare("UPDATE combat_battles SET current_turn = current_turn + 1, status = 'completed', winner_nft = ?, ended_at = datetime('now') WHERE id = ?")
          .bind(battleState.winnerId, battleId),
      );

      // XP/ELO (same pattern as resolve-turn.ts)
      const isWinnerA = battleState.winnerId === battle.fighter_a_nft;
      const isDraw = !battleState.winnerId;
      const resultA: 'win' | 'loss' | 'draw' = isDraw ? 'draw' : isWinnerA ? 'win' : 'loss';
      const resultB: 'win' | 'loss' | 'draw' = isDraw ? 'draw' : isWinnerA ? 'loss' : 'win';
      const xpA = calculateXPAward(resultA, battle.fighter_a_level as number, battle.fighter_b_level as number, battle.fighter_a_elo as number, battle.fighter_b_elo as number);
      const xpB = calculateXPAward(resultB, battle.fighter_b_level as number, battle.fighter_a_level as number, battle.fighter_b_elo as number, battle.fighter_a_elo as number);
      const eloA = calculateELOChange(battle.fighter_a_elo as number, battle.fighter_b_elo as number, isDraw ? 0.5 : isWinnerA ? 1.0 : 0.0);
      const eloB = calculateELOChange(battle.fighter_b_elo as number, battle.fighter_a_elo as number, isDraw ? 0.5 : !isWinnerA ? 1.0 : 0.0);

      statements.push(
        db.prepare('UPDATE combat_battles SET elo_change_a = ?, elo_change_b = ?, xp_awarded_a = ?, xp_awarded_b = ? WHERE id = ?')
          .bind(eloA, eloB, xpA, xpB, battleId),
      );
      const winColA = resultA === 'win' ? 'total_combat_wins' : resultA === 'loss' ? 'total_combat_losses' : 'total_combat_draws';
      const winColB = resultB === 'win' ? 'total_combat_wins' : resultB === 'loss' ? 'total_combat_losses' : 'total_combat_draws';
      statements.push(
        db.prepare(`UPDATE combat_fighters SET xp = xp + ?, elo_rating = elo_rating + ?, ${winColA} = ${winColA} + 1, level = ?, updated_at = datetime('now') WHERE nft_id = ?`)
          .bind(xpA, eloA, calculateLevelFromXP(fighterARow.xp + xpA), battle.fighter_a_nft),
        db.prepare(`UPDATE combat_fighters SET xp = xp + ?, elo_rating = elo_rating + ?, ${winColB} = ${winColB} + 1, level = ?, updated_at = datetime('now') WHERE nft_id = ?`)
          .bind(xpB, eloB, calculateLevelFromXP(fighterBRow.xp + xpB), battle.fighter_b_nft),
      );
    } else {
      statements.push(
        db.prepare('UPDATE combat_battles SET current_turn = current_turn + 1 WHERE id = ?').bind(battleId),
      );
    }

    await db.batch(statements);

    // Send webhooks
    sendBattleTurnWebhook(db, battleId, battle.fighter_a_did as string, 'A', turnResult, battleState.status, battleState.winnerId);
    sendBattleTurnWebhook(db, battleId, battle.fighter_b_did as string, 'B', turnResult, battleState.status, battleState.winnerId);

    resolved++;
  }

  return jsonResponse({ success: true, resolved, forfeited });
};
```

**Step 2: Commit**

```bash
git add functions/api/combat/check-timeouts.ts
git commit -m "feat: create check-timeouts endpoint — 30s turn timer with AI fallback"
```

---

### Task 12: Wire check-timeouts into DID indexer

**Files:**
- Modify: `workers/did-indexer/worker.ts`

**Step 1: Add timeout check call after existing battle-resolve calls**

In `workers/did-indexer/worker.ts`, after the vote-xp block (added in the unified plan), add:

```typescript
  // Check for timed-out combat turns (30s timeout with AI fallback)
  try {
    const timeoutHeaders: Record<string, string> = {};
    if (env.ADMIN_SECRET) {
      timeoutHeaders['Authorization'] = `Bearer ${env.ADMIN_SECRET}`;
    }
    const timeoutRes = await fetch('https://wojak.ink/api/combat/check-timeouts', {
      method: 'POST',
      headers: timeoutHeaders,
    });
    if (timeoutRes.ok) {
      const data = await timeoutRes.json() as { resolved?: number; forfeited?: number };
      console.log(`[DID Indexer] Timeouts: ${data.resolved ?? 0} resolved, ${data.forfeited ?? 0} forfeited`);
    }
  } catch (err) {
    console.error('[DID Indexer] Timeout check error:', err);
  }
```

**Step 2: Commit**

```bash
git add workers/did-indexer/worker.ts
git commit -m "feat: wire turn timeout check into DID indexer (every 30 min)"
```

---

## Package F: Build Verification

### Task 13: Verify TypeScript compilation

**Step 1: Run TypeScript check**

Run: `npx tsc --noEmit --pretty`
Expected: No errors.

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds.

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve any build errors from agent battle API"
```

---

### Task 14: Final verification and summary commit

**Step 1: Check all new files exist**

Run: `ls functions/api/combat/agent-*.ts functions/api/combat/_webhook.ts functions/api/combat/check-timeouts.ts functions/migrations/062_combat_agents.sql`

Expected: All files listed.

**Step 2: Verify git log**

Run: `git log --oneline -15`

Expected: All commits present in order.

**Step 3: Final summary commit if anything uncommitted**

```bash
git status
# If any changes:
git add -A
git commit -m "feat: complete agent battle API — registration, webhooks, timeouts, rate limiting"
```
