# Game Admin Observability Dashboard

> **Priority:** Low-Medium — the game system currently has zero visibility into its own health.
> **Scope:** Health endpoint, admin stats, stale data detection, basic monitoring.

---

## The Gap

The credit system has admin endpoints:
- `GET /api/credits/status` — last event, floor snapshot, 24h event count
- `GET /api/credits/audit-events` — admin-key protected event list
- `GET /api/admin/credit-stats` — aggregate credit stats

The mint system has admin endpoints:
- `GET /api/admin/recent-mints` — last N mints
- `GET /api/admin/mint-errors` — failed mint jobs

The game system has **nothing**. No way to know:
- How many players are registered or verified
- How many votes were cast today
- Whether the DID indexer ran successfully
- How many active battles exist
- Whether any player's holdings are stale
- If battle-resolve is running on schedule

---

## Endpoint 1: Game Health Status

**Route:** `GET /api/game/admin/status`
**Auth:** `ADMIN_SECRET` Bearer token

### Response

```json
{
  "players": {
    "total": 47,
    "verified": 42,
    "activeToday": 15,
    "neverIndexed": 3
  },
  "voting": {
    "totalVotes": 2847,
    "votesToday": 127,
    "uniqueVotersToday": 12,
    "feedExhaustedPlayers": 2
  },
  "battles": {
    "active": 4,
    "completedTotal": 31,
    "drawsTotal": 8,
    "inQueue": 3,
    "overdueActive": 0
  },
  "burns": {
    "total": 15,
    "creditsAwarded": 18500,
    "last24h": 2
  },
  "indexer": {
    "lastRunCompleted": "2026-02-17T14:30:00Z",
    "playersNeverIndexed": 3,
    "playersStaleOver24h": 1,
    "playersWithErrors": 0,
    "highestErrorCount": 0
  },
  "economy": {
    "totalCreditsEarned": 487500,
    "totalCreditsSpent": 120000,
    "totalFreeMints": 12,
    "avgBalancePerPlayer": 7819
  },
  "timestamp": "2026-02-17T15:00:00Z"
}
```

### Queries

```sql
-- Players
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN phase1_verified = 1 THEN 1 ELSE 0 END) as verified,
  SUM(CASE WHEN votes_today_reset = date('now') AND votes_today > 0 THEN 1 ELSE 0 END) as activeToday,
  SUM(CASE WHEN last_indexed_at IS NULL THEN 1 ELSE 0 END) as neverIndexed
FROM game_players;

-- Voting
SELECT COUNT(*) as totalVotes FROM wojak_votes;
SELECT COUNT(*) as votesToday FROM wojak_votes WHERE created_at > datetime('now', '-24 hours');
SELECT COUNT(DISTINCT voter_did) as uniqueVotersToday FROM wojak_votes WHERE created_at > datetime('now', '-24 hours');

-- Battles
SELECT
  SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN status = 'draw' THEN 1 ELSE 0 END) as draws,
  SUM(CASE WHEN status = 'active' AND ends_at < datetime('now') THEN 1 ELSE 0 END) as overdueActive
FROM battles;
SELECT COUNT(*) as inQueue FROM battle_queue;

-- Burns
SELECT COUNT(*) as total, SUM(credits_awarded) as creditsAwarded FROM wojak_burns;
SELECT COUNT(*) as last24h FROM wojak_burns WHERE created_at > datetime('now', '-24 hours');

-- Indexer health (requires columns from indexer hardening spec)
SELECT
  SUM(CASE WHEN last_indexed_at IS NULL THEN 1 ELSE 0 END) as neverIndexed,
  SUM(CASE WHEN last_indexed_at < datetime('now', '-24 hours') THEN 1 ELSE 0 END) as staleOver24h,
  SUM(CASE WHEN index_error_count > 0 THEN 1 ELSE 0 END) as withErrors,
  MAX(index_error_count) as highestErrorCount
FROM game_players;

-- Economy
SELECT SUM(credits_earned) as totalEarned FROM credit_events WHERE source IN ('burn', 'onboarding');
SELECT SUM(credits_spent) as totalSpent FROM credit_spends;
SELECT COUNT(*) as freeMints FROM credit_spends WHERE credits_spent > 0;
```

### Implementation

```ts
// functions/api/game/admin/status.ts

interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const authHeader = context.request.headers.get('Authorization');
  if (!context.env.ADMIN_SECRET || authHeader !== `Bearer ${context.env.ADMIN_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Run all queries in parallel using batch
  const [players, totalVotes, votesToday, votersToday, battles, queue, burns, burns24h, indexer, economy] =
    await context.env.DB.batch([...queries]);

  return Response.json({ players: {...}, voting: {...}, ... });
};
```

---

## Endpoint 2: Player Detail (Admin)

**Route:** `GET /api/game/admin/player?did=<did>`
**Auth:** `ADMIN_SECRET`

Returns full player state for debugging:

```json
{
  "player": {
    "did": "did:chia:1...",
    "wallet": "xch1...",
    "clerkUserId": "user_abc",
    "powerLevel": 1234,
    "phase1Verified": true,
    "votesToday": 7,
    "totalVotesCast": 147,
    "voteStreak": 12,
    "onboarding": { "did": true, "phase1": true, "minted": true, "voted": true, "battled": false },
    "lastIndexedAt": "2026-02-17T14:30:00Z",
    "lastIndexError": null,
    "indexErrorCount": 0,
    "registeredAt": "2026-02-15T10:00:00Z"
  },
  "holdings": {
    "phase1Count": 2,
    "phase2Count": 5,
    "nfts": [
      { "nftId": "nft1...", "collection": "phase2", "editionNumber": 42, "netScore": 8 }
    ]
  },
  "recentActivity": [
    { "eventType": "vote_milestone", "eventData": {...}, "createdAt": "..." }
  ],
  "activeBattles": [
    { "battleId": 7, "opponentDid": "did:chia:1...", "votesA": 5, "votesB": 3, "endsAt": "..." }
  ],
  "creditBalance": 7500
}
```

---

## Endpoint 3: System Alerts

**Route:** `GET /api/game/admin/alerts`
**Auth:** `ADMIN_SECRET`

Returns a list of conditions that need attention:

```json
{
  "alerts": [
    { "severity": "warning", "message": "3 players never indexed", "detail": "did:chia:1abc..., did:chia:1def..., did:chia:1ghi..." },
    { "severity": "warning", "message": "1 overdue active battle (should have been resolved)", "detail": "Battle #7, ended 2h ago" },
    { "severity": "info", "message": "DID indexer last ran 45 minutes ago" },
    { "severity": "error", "message": "Player did:chia:1xyz... has 5 consecutive indexer errors" }
  ]
}
```

### Alert conditions

| Condition | Severity | Query |
|-----------|----------|-------|
| Players with `last_indexed_at IS NULL` | Warning | `SELECT did_id FROM game_players WHERE last_indexed_at IS NULL` |
| Players with `last_indexed_at` > 24h ago | Warning | `WHERE last_indexed_at < datetime('now', '-24 hours')` |
| Players with `index_error_count > 3` | Error | `WHERE index_error_count > 3` |
| Active battles past `ends_at` | Warning | `WHERE status = 'active' AND ends_at < datetime('now')` |
| `battle_queue` entries older than 48h | Info | `WHERE queued_at < datetime('now', '-48 hours')` |
| No votes cast in last 24h | Info | `SELECT COUNT(*) FROM wojak_votes WHERE created_at > datetime('now', '-24 hours')` |

---

## Endpoint 4: Manual Actions

**Route:** `POST /api/game/admin/actions`
**Auth:** `ADMIN_SECRET`

Admin actions for debugging and recovery:

```json
// Request body:
{ "action": "reindex_player", "did": "did:chia:1..." }
{ "action": "recalc_power_level", "did": "did:chia:1..." }
{ "action": "resolve_battles" }  // Same as battle-resolve but through admin endpoint
{ "action": "clear_stale_queue" } // Remove queue entries older than 48h
```

**Note:** This is optional and can be deferred. The individual actions can be done via D1 SQL commands or curl to specific endpoints. A unified admin endpoint is a convenience, not a necessity.

---

## Implementation Priority

| Endpoint | Priority | Effort | Value |
|----------|----------|--------|-------|
| Status (health check) | P1 | Medium | High — immediate visibility into system health |
| Alerts | P2 | Small | Medium — proactive problem detection |
| Player detail | P3 | Small | Medium — debugging specific player issues |
| Manual actions | P4 | Medium | Low — can use D1 SQL directly |

### Dependencies

- **Indexer columns** (`last_indexed_at`, `last_index_error`, `index_error_count`) from the DID Indexer Hardening spec must exist for the indexer health queries
- **Vote streak columns** (`vote_streak`, `vote_streak_longest`) from Phase 5 are optional (omit if not yet deployed)
- **`clerk_user_id` column** from security hardening is optional (omit if not yet deployed)

---

## Future: Frontend Admin Panel

Once the API endpoints exist, a simple admin page at `/admin/game` could render:
- Status dashboard with green/yellow/red indicators
- Active alerts with dismiss/acknowledge
- Player search by DID or wallet
- Recent activity log

This is a frontend task and depends on having the API endpoints first. Not in scope for this spec.
