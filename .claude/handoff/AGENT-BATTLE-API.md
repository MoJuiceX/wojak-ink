# Agent Battle API — Design Document

## Vision

Let external AI agents (including Open Claw) control Wojak NFT fighters in the Combat Arena. Users register an agent tied to their DID, get an API key, and their AI submits moves via HTTP + receives battle state via webhooks. Manual play remains the default for users without agents.

**Ported from:** ClawCombat (`/Users/abit_hex/ClawCombat/apps/backend/src/`)
**Key adaptation:** In ClawCombat, agent = fighter. In Wojak, NFT = fighter and agent = controller.

---

## Core Model

### ClawCombat vs Wojak

| Concept | ClawCombat | Wojak |
|---------|-----------|-------|
| Fighter identity | Agent picks type/stats/moves at registration | NFT traits determine type/stats/moves at mint |
| Agent scope | Agent IS the fighter | Agent CONTROLS existing NFT fighters |
| API key scope | Per agent (per fighter) | Per DID (controls all fighters under that wallet) |
| Registration | Creates a new combatant | Links an AI controller to existing fighters |

### Three Battle Modes

| Mode | How moves are chosen | Who uses it |
|------|---------------------|-------------|
| `manual` | Human picks via UI (existing `submit-move.ts`) | Players without agents |
| `auto` | Built-in AI strategist picks (existing `ai-strategist.ts`) | Quick play, no setup |
| `agent` | External AI submits via API + receives webhooks | Developers, Open Claw users |

All three modes use the same battle engine, XP/ELO formulas, and matchmaking. The only difference is how moves arrive.

---

## Agent Registration

### Flow

1. User connects Sage Wallet (has DID)
2. User clicks "Create Agent" in Arena UI **or** calls `POST /api/combat/agent-register`
3. System creates `combat_agents` record linked to their DID
4. Returns one-time API key (`wjk_sk_<64hex>`) — shown only once, stored as SHA-256 hash
5. Optionally: user provides `webhook_url` for push notifications
6. User configures their external AI with the key

### Constraints

- **One agent per DID** (can be retired and re-created)
- Agent name: 3-50 chars, alphanumeric + dash/underscore
- Webhook URL: must be HTTPS, validated on registration
- API key format: `wjk_sk_` prefix + 64 hex characters
- Key stored as SHA-256 hash (plaintext never stored)

### Registration Endpoint

```
POST /api/combat/agent-register
Content-Type: application/json

Request:
{
  "ownerDid": "did:chia:1...",
  "name": "MyWojakAgent",
  "webhook_url": "https://my-server.com/webhook"  // optional
}

Response (201):
{
  "agent_id": "uuid",
  "name": "MyWojakAgent",
  "api_key": "wjk_sk_a1b2c3...",           // SHOWN ONLY ONCE
  "api_key_warning": "Save this key now. It will not be shown again.",
  "webhook_secret": "hex-24-bytes",          // for verifying webhook signatures
  "webhook_url": "https://my-server.com/webhook",
  "status": "active",
  "tier": "trial",
  "fighters": [                              // all NFT fighters under this DID
    { "nft_id": "xxx", "edition": 42, "type": "FIRE", "level": 5, "moves": [...] }
  ]
}
```

---

## Battle Flow

### Queueing (Agent)

```
POST /api/combat/agent-queue
Authorization: Bearer wjk_sk_...
Content-Type: application/json

Request:
{
  "nft_id": "fighter-nft-id",
  "battle_mode": "agent"          // or "auto" to use built-in AI
}

Response:
{ "status": "queued", "position": 3 }
// or
{ "status": "matched", "battle_id": 123, "opponent": { "type": "WATER", "level": 7 } }
```

### Webhook Events

When a battle starts or a turn resolves, the system POSTs to the agent's `webhook_url`.

**`battle_start`** — Sent when matched:
```json
{
  "event": "battle_start",
  "battle_id": 123,
  "timeout_ms": 30000,
  "your_side": "A",
  "your_fighter": {
    "nft_id": "xxx",
    "edition": 42,
    "type": "FIRE",
    "ability": "Inferno Surge",
    "max_hp": 85,
    "stats": { "attack": 42, "defense": 38, "sp_atk": 55, "sp_def": 40, "speed": 48 },
    "moves": [
      { "id": "fire_blast", "name": "Meltdown", "type": "FIRE", "category": "special", "power": 110, "accuracy": 85, "pp": 5, "pp_max": 5 },
      { "id": "fire_punch", "name": "Sear Strike", "type": "FIRE", "category": "physical", "power": 75, "accuracy": 100, "pp": 15, "pp_max": 15 },
      { "id": "will_o_wisp", "name": "Ember Curse", "type": "FIRE", "category": "status", "power": 0, "accuracy": 85, "pp": 15, "pp_max": 15 },
      { "id": "protect", "name": "Flame Guard", "type": "FIRE", "category": "status", "power": 0, "accuracy": 100, "pp": 10, "pp_max": 10 }
    ]
  },
  "opponent": {
    "nft_id": "yyy",
    "edition": 77,
    "type": "WATER",
    "ability": "Tidal Shield",
    "stats": { "attack": 35, "defense": 50, "sp_atk": 60, "sp_def": 45, "speed": 42 }
  },
  "type_matchup": {
    "your_offense": 0.5,
    "their_offense": 2.0
  }
}
```

**`battle_turn`** — After each turn resolves:
```json
{
  "event": "battle_turn",
  "battle_id": 123,
  "timeout_ms": 30000,
  "turn_number": 3,
  "events": [
    { "type": "move", "message": "Your Wojak #42 used Meltdown!" },
    { "type": "damage", "amount": 42, "effectiveness": "not_very_effective" },
    { "type": "move", "message": "Opponent Wojak #77 used Tidal Crash!" },
    { "type": "damage", "amount": 68, "effectiveness": "super_effective" },
    { "type": "status", "message": "Your Wojak #42 is burned!" }
  ],
  "status": "active",
  "your_fighter": {
    "hp": 17,
    "max_hp": 85,
    "stat_stages": { "attack": 0, "defense": -1, "sp_atk": 0, "sp_def": 0, "speed": 0 },
    "status": "burned",
    "moves": [
      { "id": "fire_blast", "name": "Meltdown", "pp_remaining": 4, "pp_max": 5 }
    ]
  },
  "opponent": {
    "hp": 30,
    "max_hp": 72,
    "stat_stages": { "attack": 0, "defense": 0, "sp_atk": 1, "sp_def": 0, "speed": 0 },
    "status": null
  },
  "last_turn": {
    "your_move": "Meltdown",
    "opponent_move": "Tidal Crash"
  }
}
```

**`battle_end`** — Final results:
```json
{
  "event": "battle_end",
  "battle_id": 123,
  "result": "defeat",
  "winner_nft": "yyy",
  "turns_taken": 6,
  "xp_gained": 15,
  "elo_change": -18,
  "new_level": 5,
  "your_fighter": { "hp": 0, "max_hp": 85 },
  "opponent": { "hp": 12, "max_hp": 72 }
}
```

### Move Submission (Agent)

```
POST /api/combat/agent-move
Authorization: Bearer wjk_sk_...
Content-Type: application/json

Request:
{
  "battle_id": 123,
  "move_id": "fire_blast"
}

Response (if opponent hasn't submitted yet):
{ "status": "move_submitted", "message": "Waiting for opponent..." }

Response (if both submitted — turn resolves):
{
  "status": "turn_resolved",
  "turn_number": 4,
  "events": [...],
  "your_hp": 45,
  "opponent_hp": 0,
  "battle_status": "finished",
  "winner_nft": "xxx"
}
```

---

## Timeout Handling

Ported directly from ClawCombat:

| Rule | Value | Source |
|------|-------|--------|
| Turn timeout | 30 seconds | `BATTLE_TURN_TIMEOUT_MS` |
| Consecutive timeout limit | 3 | `MAX_CONSECUTIVE_TIMEOUTS` |
| Timeout behavior | Built-in AI picks move | `ai-strategist.ts` fallback |
| 3 consecutive timeouts | Auto-forfeit (opponent wins) | Prevents abandoned battles |
| Webhook timeout | 5 seconds | Fire-and-forget, no retry |

### Turn Timer Implementation

A scheduled job (or the polling endpoint) checks for battles where:
- `status = 'active'` or `status = 'waiting_moves'`
- `last_turn_at` + 30 seconds < now
- One or both moves are missing

When triggered:
1. Missing move(s) → AI strategist picks for the timed-out side
2. Increment `consecutive_timeouts` for that side
3. If consecutive_timeouts >= 3 → forfeit
4. Otherwise → resolve turn normally

This also fixes the existing manual battle timeout gap (manual battles currently wait forever).

---

## Rate Limiting

Ported from ClawCombat tiers:

| Tier | Limit | Duration | How to Get |
|------|-------|----------|-----------|
| Trial | 1 fight/hour | 14 days from registration | Automatic on agent creation |
| Free | 6 fights/day | Permanent | After trial expires |
| Premium | 1 fight/hour | Subscription | Payment (Stripe/similar) |

### Tracking

Stored on `combat_agents` table:
- `fights_today` / `fights_today_date` — resets at UTC midnight
- `fights_this_hour` / `fights_hour_start` — resets each hour
- `tier` — `trial`, `free`, or `premium`
- `trial_start_at` — when agent was created (trial expires 14 days later)

Rate limit checked before queueing. Returns `429 Too Many Requests` with `retry_after` header.

---

## Authentication

### API Key Auth (agents)

```
Authorization: Bearer wjk_sk_<64hex>
```

Middleware: `authenticateAgent(req, res, next)`
- Extracts token from Authorization header
- SHA-256 hashes it
- Looks up `combat_agents.api_key_hash`
- Sets `req.agent` with agent record
- Throttles `last_active_at` updates (5-minute cache, same as ClawCombat)

### DID Auth (registration via UI)

Registration endpoint accepts `ownerDid` from the frontend (already authenticated via Sage Wallet). The DID is validated with `isValidDid()` (existing helper in `_shared.ts`).

### Key Rotation

`POST /api/combat/agent-rotate-key` — Generates new key, invalidates old one. Requires current key.

---

## Database Schema

### New table: `combat_agents`

```sql
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

CREATE INDEX IF NOT EXISTS idx_agents_api_key ON combat_agents(api_key_hash);
CREATE INDEX IF NOT EXISTS idx_agents_did ON combat_agents(owner_did);
```

### Modify: `combat_battles`

```sql
-- Track actual mode type per fighter (manual/auto/agent)
ALTER TABLE combat_battles ADD COLUMN fighter_a_mode_type TEXT DEFAULT 'manual';
ALTER TABLE combat_battles ADD COLUMN fighter_b_mode_type TEXT DEFAULT 'manual';

-- Track consecutive timeouts per side (for forfeit detection)
ALTER TABLE combat_battles ADD COLUMN fighter_a_timeouts INTEGER DEFAULT 0;
ALTER TABLE combat_battles ADD COLUMN fighter_b_timeouts INTEGER DEFAULT 0;

-- Track last turn timestamp (for timeout detection)
ALTER TABLE combat_battles ADD COLUMN last_turn_at TEXT;
```

---

## API Endpoints Summary

### New Agent Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/combat/agent-register` | POST | DID | Create agent, return one-time API key |
| `/api/combat/agent-queue` | POST | API key | Queue a specific NFT for battle |
| `/api/combat/agent-move` | POST | API key | Submit move for active battle |
| `/api/combat/agent-battle` | GET | API key | Get current battle state |
| `/api/combat/agent-surrender` | POST | API key | Forfeit active battle |
| `/api/combat/agent-profile` | GET | Public | View agent stats/record |
| `/api/combat/agent-rotate-key` | POST | API key | Generate new API key |
| `/api/combat/agent-fighters` | GET | API key | List all fighters under this DID |

### Modified Existing Endpoints

| Endpoint | Change |
|----------|--------|
| `/api/combat/queue` | Accept `battle_mode: 'agent'` alongside 'manual'/'auto' |
| `/api/combat/resolve-turn` | Check for turn timeouts, apply AI fallback |

---

## Frontend Changes

### Arena UI Additions

1. **"Create Agent" button** on CombatArena page (when DID connected, no agent exists)
2. **Agent settings panel** — shows API key status, webhook URL, tier, fights remaining
3. **Battle mode selector** — "Manual" / "Auto" / "Agent" when queueing (if agent exists)
4. **30-second turn timer** — countdown UI for manual battles (new, fixes existing gap)

### Agent Setup Flow (UI)

```
[Connect Wallet] → [Create Agent] → [See API Key (one time)] → [Copy Key]
                                                                      ↓
                                                            [Configure your AI]
                                                                      ↓
                                                    [Queue fighter with mode: "agent"]
```

---

## Turn Timer (fixes existing manual battle gap)

This is a bonus that comes with the agent system. Currently, manual battles wait forever for moves. The turn timer fixes this for ALL modes:

1. A scheduled check runs every 10 seconds (or on battle state poll)
2. For any battle where a move is pending > 30 seconds:
   - **Manual mode:** AI picks the move (player timed out)
   - **Agent mode:** AI picks the move (agent timed out), increment timeout counter
   - **Auto mode:** Should never happen (AI picks instantly)
3. After 3 consecutive timeouts from the same side: auto-forfeit

### Implementation Options

**Option A: Cloudflare Worker cron** — New `battle-timer` worker runs every 10 seconds, calls `/api/combat/check-timeouts`.

**Option B: Lazy evaluation** — Check timeout when either side polls battle state or submits a move. No separate worker needed. Simpler but depends on at least one side being active.

**Recommended: Option B** (lazy evaluation) with Option A as a safety net for abandoned battles.

---

## What We're NOT Porting from ClawCombat

| ClawCombat Feature | Why Not |
|-------------------|---------|
| Agent stat customization | Wojak fighters have deterministic stats from NFT traits |
| Agent type/ability selection | Determined by NFT visual traits at mint |
| Move respec | Moves are fixed at mint (part of NFT identity) |
| Stat tokens / EVs | Not in Wojak's design (XP → level → stat scaling) |
| Skin generation | Wojak NFTs already have visual art |
| Bot tokens (`clw_bot_`) | Only need one auth type (`wjk_sk_`) |
| Tutorial battle | Not needed (auto-battle already serves this purpose) |

---

## Migration Plan

### Migration 062: Agent System

```sql
-- 062_combat_agents.sql
-- Agent system for external AI controllers

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

CREATE INDEX IF NOT EXISTS idx_agents_api_key ON combat_agents(api_key_hash);
CREATE INDEX IF NOT EXISTS idx_agents_did ON combat_agents(owner_did);

ALTER TABLE combat_battles ADD COLUMN fighter_a_mode_type TEXT DEFAULT 'manual';
ALTER TABLE combat_battles ADD COLUMN fighter_b_mode_type TEXT DEFAULT 'manual';
ALTER TABLE combat_battles ADD COLUMN fighter_a_timeouts INTEGER DEFAULT 0;
ALTER TABLE combat_battles ADD COLUMN fighter_b_timeouts INTEGER DEFAULT 0;
ALTER TABLE combat_battles ADD COLUMN last_turn_at TEXT;
```

---

## Work Packages

### Package A: Database + Auth (backend)
Migration, agent table, API key generation, SHA-256 hashing, auth middleware.

### Package B: Agent Registration + Fighters (backend)
Register endpoint, rotate-key endpoint, agent-fighters list, agent-profile (public).

### Package C: Agent Queue + Move Submission (backend)
Agent-queue, agent-move, agent-battle (state polling), agent-surrender endpoints.

### Package D: Webhook System (backend)
Webhook dispatch on battle_start, battle_turn, battle_end. Webhook secret signing. 5-second timeout, fire-and-forget.

### Package E: Turn Timer + Timeout (backend)
30-second turn timeout check. AI fallback on timeout. Consecutive timeout → forfeit. Lazy eval on poll + safety cron.

### Package F: Rate Limiting (backend)
Tier detection (trial/free/premium). Per-hour and per-day tracking. 429 response with retry_after.

### Package G: Arena UI Agent Features (frontend)
Create Agent button, API key display, agent settings panel, battle mode selector, 30-second countdown timer.
