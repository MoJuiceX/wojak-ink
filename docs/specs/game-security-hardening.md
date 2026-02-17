# Game API Security Hardening

> **Priority:** Critical — all game write endpoints are currently unauthenticated. Anyone can spoof any DID.
> **Dependency:** Phase 4 complete. Can be done in parallel with Phase 5.
> **Scope:** Authentication, rate limiting, abuse prevention, admin protection.

---

## The Problem

Every game write endpoint (`vote`, `register`, `burn`, `battle-queue`, `battle-vote`, `verify-phase1`) accepts a `did` or `voterDid` in the request body and trusts it blindly. There is no authentication, no wallet signature, no Clerk JWT. A single `curl` command can:

- Register any DID and claim it
- Vote 10 times per day from any DID
- Claim burn credits without actually burning an NFT
- Trigger battle resolution at will (griefing)
- Flood the battle queue

Meanwhile, the codebase has a complete Clerk JWT auth system (`authenticateRequest()`) and a D1-backed rate limiter (`checkRateLimit()`) — both fully functional and used by other endpoints. They're just not wired to the game.

---

## Architecture: Two Disconnected Identity Systems

```
┌─────────────────────┐       ┌─────────────────────┐
│  Clerk Identity     │       │  Game Identity       │
│                     │       │                      │
│  users.id           │  ???  │  game_players.did_id │
│  profiles.user_id   │───────│  game_players.wallet │
│  profiles.wallet    │       │  did_holdings        │
│                     │       │  wojak_votes         │
└─────────────────────┘       └─────────────────────┘
        ↕ Auth via JWT                ↕ No auth at all
  profile/, friends/,           game/vote, game/burn,
  shop/, currency/              game/battle-queue...
```

**The gap:** There is no `user_id ↔ did_id` mapping. Clerk gives us a `userId`, the game uses `did_id`, and nothing connects them.

---

## Strategy: Layered Defense

Rather than a single massive change, this spec uses three layers that can be deployed incrementally:

| Layer | What | Protects Against | Effort |
|-------|------|-----------------|--------|
| **L1: Admin protection** | `ADMIN_SECRET` on battle-resolve, indexer `/run` | Griefing, unauthorized resolution | Tiny |
| **L2: Clerk JWT on writes** | `authenticateRequest()` on all write endpoints | Anonymous attacks, bot farming | Small |
| **L3: Clerk→DID binding** | Map `userId` to `did_id`, verify on every write | DID spoofing, multi-account abuse | Medium |

Each layer can be deployed independently. L1 should ship immediately. L2 and L3 can follow.

---

## Layer 1: Protect Admin/Cron Endpoints

### 1a: Protect `battle-resolve.ts`

Currently anyone can `POST /api/game/battle-resolve` and resolve all pending battles. Apply the existing `ADMIN_SECRET` pattern:

```ts
export const onRequestPost: PagesFunction<Env> = async (context) => {
  // Admin auth — same pattern as /api/admin/* endpoints
  const authHeader = context.request.headers.get('Authorization');
  if (!context.env.ADMIN_SECRET || authHeader !== `Bearer ${context.env.ADMIN_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... existing logic
};
```

Update `workers/battle-cron/worker.ts` (or the DID indexer's battle-resolve call) to send the secret:

```ts
const res = await fetch('https://wojak.ink/api/game/battle-resolve', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${env.ADMIN_SECRET}` },
});
```

The `ADMIN_SECRET` env var already exists in Cloudflare Pages secrets. Add it to the battle-cron worker's `wrangler.toml` as a secret binding, or if battle-resolve is called from the DID indexer, add it there.

### 1b: Protect DID Indexer `/run` endpoint

Same pattern — require `ADMIN_SECRET` on the manual trigger:

```ts
async fetch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === '/run') {
    const authHeader = request.headers.get('Authorization');
    if (!env.ADMIN_SECRET || authHeader !== `Bearer ${env.ADMIN_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }
    await run(env);
    return new Response('DID indexer run complete');
  }
  // ...
}
```

**Effort:** ~30 minutes. Zero frontend changes.

---

## Layer 2: Clerk JWT on Game Write Endpoints

### The approach

Add `authenticateRequest()` to every game write endpoint. This proves the caller is a real, signed-in user — not an anonymous curl request. It doesn't yet prove they own the DID they claim, but it:

- Prevents anonymous attacks
- Creates an audit trail (every action tied to a Clerk userId)
- Enables ban enforcement (existing `checkBanned()` function)
- Rate-limits by authenticated user, not by spoofable IP

### Endpoints to protect

| Endpoint | Method | Current Auth | After L2 |
|----------|--------|-------------|----------|
| `register` | POST | None | Clerk JWT |
| `vote` | POST | None | Clerk JWT |
| `burn` | POST | None | Clerk JWT |
| `verify-phase1` | POST | None | Clerk JWT |
| `battle-queue` | POST/DELETE | None | Clerk JWT |
| `battle-vote` | POST | None | Clerk JWT |
| `battle-resolve` | POST | None | ADMIN_SECRET (L1) |
| `feed` | GET | None | None (read-only) |
| `leaderboard` | GET | None | None (read-only) |
| `top-wojaks` | GET | None | None (read-only) |
| `power-level` | GET | None | None (read-only) |
| `battle-list` | GET | None | None (read-only) |
| `collection` | GET | None | None (read-only) |
| `activity` | GET | None | None (read-only) |

### Implementation pattern

Add to each write endpoint:

```ts
import { authenticateRequest } from '../../lib/auth';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  // Authenticate
  const auth = await authenticateRequest(context.request, context.env.CLERK_DOMAIN);
  if (!auth) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Optional: check banned
  if (await checkBanned(context.env.DB, auth.userId)) {
    return bannedResponse();
  }

  // ... existing logic, but now we have auth.userId available
};
```

### Frontend changes

`GameContext.tsx` must send the Clerk JWT with every game API call. The pattern already exists in `CurrencyContext.tsx`:

```ts
// In GameContext.tsx, add a helper:
const getAuthHeaders = async (): Promise<HeadersInit> => {
  const clerk = window.Clerk;
  if (!clerk?.session) return { 'Content-Type': 'application/json' };
  const token = await clerk.session.getToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

// Then in every fetch call:
const headers = await getAuthHeaders();
const response = await fetch('/api/game/vote', {
  method: 'POST',
  headers,
  body: JSON.stringify({ voterDid, nftId, editionNumber, voteType }),
});
```

### Env requirement

Ensure `CLERK_DOMAIN` is available in the Pages Functions env. It should already be set since `game/start.ts` uses it.

**Effort:** ~2-3 hours. Mechanical addition to each endpoint + frontend header injection.

---

## Layer 3: Clerk → DID Binding

### The problem L2 doesn't solve

With L2, we know the caller is a real Clerk user. But we don't know if they own the DID they claim in the request body. User A (Clerk userId `user_abc`) could send `{ voterDid: "did:chia:1BELONGS_TO_USER_B" }` and vote as User B.

### The solution: bind DID to userId at registration time

When a user calls `POST /api/game/register`, they provide their DID. At that moment, we also have their Clerk JWT (from L2). Store the mapping:

**Option A: Add `clerk_user_id` column to `game_players`** (simplest)

```sql
-- Migration: NNN_clerk_did_binding.sql
ALTER TABLE game_players ADD COLUMN clerk_user_id TEXT UNIQUE;
```

In `register.ts`:
```ts
const auth = await authenticateRequest(context.request, context.env.CLERK_DOMAIN);
if (!auth) return 401;

// Check if this Clerk user already has a DID registered
const existing = await env.DB.prepare(
  'SELECT did_id FROM game_players WHERE clerk_user_id = ?'
).bind(auth.userId).first();

if (existing && existing.did_id !== did) {
  return Response.json({
    error: 'Your account is already linked to a different DID. Contact support to change.',
  }, { status: 409 });
}

// Upsert with clerk_user_id
await env.DB.prepare(`
  INSERT INTO game_players (did_id, wallet_address, clerk_user_id, ...)
  VALUES (?, ?, ?, ...)
  ON CONFLICT(did_id) DO UPDATE SET
    wallet_address = excluded.wallet_address,
    clerk_user_id = COALESCE(game_players.clerk_user_id, excluded.clerk_user_id),
    updated_at = datetime('now')
`).bind(did, walletAddress, auth.userId).run();
```

Note: `COALESCE(game_players.clerk_user_id, excluded.clerk_user_id)` prevents overwriting an existing binding — once a DID is claimed by a Clerk user, it stays bound.

### Verification helper

Create a shared verification function:

```ts
// functions/api/game/_auth.ts
export async function verifyGameAuth(
  request: Request,
  env: Env,
  did: string
): Promise<{ userId: string } | Response> {
  const auth = await authenticateRequest(request, env.CLERK_DOMAIN);
  if (!auth) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Verify this Clerk user owns this DID
  const player = await env.DB.prepare(
    'SELECT clerk_user_id FROM game_players WHERE did_id = ?'
  ).bind(did).first();

  if (!player) {
    return Response.json({ error: 'Player not registered' }, { status: 404 });
  }

  if (player.clerk_user_id && player.clerk_user_id !== auth.userId) {
    return Response.json({ error: 'DID does not belong to your account' }, { status: 403 });
  }

  // If clerk_user_id is null (legacy player), bind it now (one-time migration)
  if (!player.clerk_user_id) {
    await env.DB.prepare(
      'UPDATE game_players SET clerk_user_id = ? WHERE did_id = ? AND clerk_user_id IS NULL'
    ).bind(auth.userId, did).run();
  }

  return { userId: auth.userId };
}
```

Usage in every write endpoint:

```ts
const authResult = await verifyGameAuth(context.request, context.env, did);
if (authResult instanceof Response) return authResult; // Error response
// authResult.userId is the verified Clerk user
```

### One-DID-per-account enforcement

The `UNIQUE` constraint on `clerk_user_id` means one Clerk account can only control one DID. This prevents multi-DID vote farming — the primary abuse vector identified in the audit.

**Edge case:** What about users who legitimately have multiple DIDs? This is a product decision:
- **Strict (recommended for launch):** One DID per Clerk account. Period.
- **Flexible (future):** Allow switching DIDs via a cooldown-gated process (e.g., once per week).

### Migration for existing players

Existing `game_players` rows have `clerk_user_id = NULL`. The `verifyGameAuth` function handles this with a "bind on first authenticated call" pattern — the first time a Clerk-authenticated user calls any game endpoint with their DID, it binds.

**Risk:** During the transition, a malicious user could race to bind someone else's DID to their Clerk account. Mitigation: before deploying L3, run a one-time script that pre-binds all existing players whose `wallet_address` matches a `profiles.wallet_address` (which is Clerk-linked).

```sql
-- Pre-binding script (run once before deploying L3)
UPDATE game_players
SET clerk_user_id = (
  SELECT p.user_id FROM profiles p
  WHERE p.wallet_address = game_players.wallet_address
  LIMIT 1
)
WHERE clerk_user_id IS NULL;
```

**Effort:** ~4-6 hours. Migration, helper function, update all write endpoints, pre-binding script, frontend JWT injection.

---

## Layer 4 (Future): Rate Limiting

After L1-L3 are deployed, add rate limiting using the existing `checkRateLimit()` infrastructure.

### Game rate limit configs

Add to `functions/lib/rateLimit.ts`:

```ts
export const GAME_RATE_LIMITS = {
  vote: { maxRequests: 20, windowMs: 60_000, key: 'game-vote' },       // 20/min (allows burst of 10 daily votes)
  register: { maxRequests: 3, windowMs: 300_000, key: 'game-register' }, // 3 per 5 min
  burn: { maxRequests: 5, windowMs: 60_000, key: 'game-burn' },         // 5/min
  verifyPhase1: { maxRequests: 5, windowMs: 300_000, key: 'game-verify' }, // 5 per 5 min (calls MintGarden)
  battleQueue: { maxRequests: 10, windowMs: 60_000, key: 'game-bq' },   // 10/min
  battleVote: { maxRequests: 20, windowMs: 60_000, key: 'game-bvote' }, // 20/min
};
```

### Prerequisite: `rate_limits` table

Verify the `rate_limits` table exists. If not, add a migration:

```sql
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_ts ON rate_limits (key, timestamp);
```

### Usage in endpoints

```ts
const rateLimitKey = getRateLimitKey(context.request, auth.userId);
const rateCheck = await checkRateLimit(context.env.DB, rateLimitKey, GAME_RATE_LIMITS.vote);
if (!rateCheck.allowed) {
  return Response.json({ error: 'Rate limited. Try again later.' }, { status: 429 });
}
```

---

## Layer 5 (Future): On-Chain Burn Verification

The burn endpoint currently trusts the client's claim that an NFT was burned. A more robust approach:

1. After the client's wallet sends the burn transaction, capture the **transaction ID** (spend bundle hash)
2. Send it to the burn endpoint along with the NFT ID
3. The endpoint verifies on-chain (via a Chia full node RPC or MintGarden API) that:
   - The NFT was actually transferred to the burn address
   - The transaction is confirmed (or at least in mempool)
4. Only then award credits

This is a larger project and depends on having a Chia RPC endpoint or waiting for MintGarden to reflect the transfer. For now, the `UNIQUE` constraint on `wojak_burns.nft_id` prevents double-claiming, and L3's auth prevents anonymous claims. On-chain verification can be added later.

---

## Abuse Vector Summary (After All Layers)

| Attack | Before | After L1 | After L2 | After L3 |
|--------|--------|----------|----------|----------|
| Anonymous vote spam | ✅ Works | ✅ Works | ❌ Needs Clerk login | ❌ Blocked |
| DID spoofing | ✅ Works | ✅ Works | ⚠️ Needs login, any DID | ❌ Bound to account |
| Multi-DID farming | ✅ Works | ✅ Works | ⚠️ Need multiple Clerk accounts | ❌ 1 DID per account |
| Battle griefing | ✅ Works | ❌ Blocked (ADMIN_SECRET) | ❌ Blocked | ❌ Blocked |
| Fake burn credits | ✅ Works | ✅ Works | ⚠️ Needs login | ⚠️ Needs own account + own NFT |
| Indexer trigger flood | ✅ Works | ❌ Blocked | ❌ Blocked | ❌ Blocked |
| Vote bot farm | ✅ Works | ✅ Works | ⚠️ Need many Clerk accounts | ❌ 1 DID per account |

---

## Implementation Priority

| Step | Layer | What | Effort | Risk if Skipped |
|------|-------|------|--------|----------------|
| 1 | L1 | ADMIN_SECRET on battle-resolve + indexer /run | 30 min | Battle system can be griefed by anyone |
| 2 | L2 | Clerk JWT on all game write endpoints | 2-3 hours | Anonymous bots can spam all game actions |
| 3 | L3 | Clerk→DID binding + 1-DID-per-account | 4-6 hours | Users can vote-farm with spoofed DIDs |
| 4 | L4 | Rate limiting on game endpoints | 1-2 hours | Burst attacks on MintGarden API via verify-phase1 |
| 5 | L5 | On-chain burn verification | 1-2 days | Credits awarded without actual on-chain burn |

---

## Testing

After each layer, verify:

```bash
# L1: battle-resolve requires auth
curl -s -X POST https://wojak.ink/api/game/battle-resolve | jq .
# Expected: { "error": "Unauthorized" }

curl -s -X POST https://wojak.ink/api/game/battle-resolve \
  -H "Authorization: Bearer $ADMIN_SECRET" | jq .
# Expected: { "success": true, ... }

# L2: vote requires Clerk JWT
curl -s -X POST https://wojak.ink/api/game/vote \
  -H 'Content-Type: application/json' \
  -d '{"voterDid":"did:chia:1test","nftId":"test","editionNumber":1,"voteType":1}' | jq .
# Expected: { "error": "Authentication required" }

# L3: DID must match Clerk user
# (Must test via frontend — get Clerk JWT, try to use a DID that belongs to another user)
# Expected: { "error": "DID does not belong to your account" }
```
