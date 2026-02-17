# Game Economy & Credit System Fixes

> **Priority:** Medium — schema mismatch was fixed by the CLI session. Remaining issues are correctness and design gaps.
> **Scope:** Credit system alignment, missing onboarding milestones, economy sink design.

---

## Status: What's Already Fixed

The CLI session already fixed the critical schema mismatch:
- ✅ `game/burn.ts` — now inserts with all required `credit_events` columns (`event_id`, `price_xch=0`, `floor_at_time=0`, `whale_multiplier=100`, `event_type='burn'`)
- ✅ `game/verify-phase1.ts` — same fix applied for onboarding credits

---

## Issue 1: Worker Burn Detection Schema Mismatch

**File:** `workers/credit-tracker/worker.ts` (~line 889)

The credit-tracker worker detects on-chain burns (NFT transferred to burn address) and inserts into `credit_events`. However, it uses an incomplete column list:

```sql
INSERT INTO credit_events (wallet_address, nft_id, event_id, credits_earned, source, event_timestamp)
```

Missing columns:
- `price_xch` — defaults to NULL (should be 0 for burns)
- `floor_at_time` — defaults to NULL (should be 0)
- `whale_multiplier` — defaults to NULL (should be 100)
- `event_type` — defaults to `'trade'` (should be `'burn'`)

**Consequence:** Indexer-detected burns appear as trades in any analytics filtering by `event_type`. NULL `whale_multiplier` will cause issues if any query does math on that column.

### Fix

Update the worker's burn INSERT to match the game UI pattern:

```sql
INSERT INTO credit_events (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_type, event_timestamp)
VALUES (?, ?, ?, 0, 0, ?, 100, 'burn', 'burn', ?)
```

Also fix any existing rows:

```sql
UPDATE credit_events SET event_type = 'burn', price_xch = 0, floor_at_time = 0, whale_multiplier = 100
WHERE source = 'burn' AND (event_type = 'trade' OR event_type IS NULL);
```

---

## Issue 2: `onboarding_minted` Milestone Never Triggered

**Problem:** `game_players` has `onboarding_minted INTEGER DEFAULT 0` and `ONBOARDING_CREDITS.first_mint = 500` is defined in `_shared.ts`. But the mint flow (`functions/api/mint/`) never writes to `game_players` or `game_activity`. A player who mints their first Wojak never gets:
- The `onboarding_minted = 1` flag set
- The 500 (5 credits) first-mint bonus
- A `game_activity` event logged

### Why this was missed

The mint system predates the game system. `functions/api/mint/process.ts` finalizes mints by writing to `phase2_mints` and `nft_names`, but it has no awareness of `game_players`.

### Fix

In `functions/api/mint/process.ts`, after the mint is finalized (after the successful D1 batch that creates the `phase2_mints` row), check if the minter is a registered game player and award the first-mint bonus:

```ts
// After successful mint finalization:
const walletAddress = mintJob.wallet_address;

// Check if player exists and hasn't received first-mint bonus
const player = await env.DB.prepare(
  'SELECT did_id, onboarding_minted FROM game_players WHERE wallet_address = ?'
).bind(walletAddress).first();

if (player && !player.onboarding_minted) {
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE game_players SET onboarding_minted = 1, updated_at = datetime('now') WHERE wallet_address = ? AND onboarding_minted = 0"
    ).bind(walletAddress),
    env.DB.prepare(`
      INSERT INTO credit_events (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_type, event_timestamp)
      VALUES (?, 'onboarding_first_mint', 'onboarding_mint_' || ?, 0, 0, ?, 100, 'onboarding', 'onboarding', datetime('now'))
    `).bind(walletAddress, walletAddress, 500), // ONBOARDING_CREDITS.first_mint
    env.DB.prepare(`
      INSERT INTO game_activity (did_id, event_type, event_data)
      VALUES (?, 'mint_milestone', ?)
    `).bind(player.did_id, JSON.stringify({ milestone: 'first_mint', credits: 500 })),
  ]);
}
```

**Note:** This links the mint system to the game system for the first time. Import `ONBOARDING_CREDITS` from `game/_shared.ts` or hardcode `500` to avoid a cross-module dependency.

---

## Issue 3: Two Disconnected Currency Systems

The app has two parallel economies with no bridge:

| Currency | Stored In | Keyed By | Earned From | Spent On |
|----------|-----------|----------|-------------|----------|
| **Credits** | `credit_events` / `credit_spends` | `wallet_address` | XCH trades, burns, onboarding | Free mints |
| **Oranges & Gems** | `user_currency` | `user_id` (Clerk) | Minigames, achievements, daily login | Shop items (emoji, frames, titles) |

There is no conversion between them. Credits cannot buy shop items. Oranges cannot fund free mints. A player who earns 50 credits from burns has no way to use them except for free mints.

### Recommendation

This is a **product design decision**, not a code bug. Three options:

**Option A: Keep them separate (simplest)**
- Credits = blockchain economy (earn from trading/burning, spend on minting)
- Oranges = social economy (earn from engagement, spend on cosmetics)
- Clearly communicate this to players in UI
- No code changes needed

**Option B: One-way conversion (credits → oranges)**
- Add `POST /api/credits/convert` endpoint
- 1 credit = 10 oranges (or whatever rate)
- Requires Clerk auth (to write to `user_currency` which uses Clerk `user_id`)
- Requires knowing wallet → Clerk user mapping (needs L3 from security spec)
- Medium effort

**Option C: Merge into one currency (oranges everywhere)**
- Replace `credit_events` system with `user_currency` additions
- Break the free-mint-from-credits flow
- High effort, high risk, not recommended

**Recommendation:** Option A for now. The two economies serve different purposes. Document the distinction in the UI. Revisit conversion after security hardening (L3) provides the wallet→Clerk mapping needed for Option B.

---

## Issue 4: No Credit Sink Beyond Free Mints

Credits accumulate indefinitely. The only spend mechanism is free mints (`credit_spends`), which requires 100 credits (10,000 units). Players who don't want to mint have no way to use credits.

### Future credit sinks (Phase 5+ features from `wojak-swipe-phase5.md`)

From the Phase 5 spec, potential credit sinks:
- Extra daily votes (5 votes for 10 credits)
- Battle shield (protect NFT from challenges for 24h, 5 credits)
- Score boost (double vote impact for 5 votes, 15 credits)
- Custom battle duration (48h instead of 24h, 8 credits)

These require:
1. A `game_credit_spends` table (or reuse `credit_spends` with a `type` column)
2. Consumable item logic in the relevant game endpoints
3. Economy balance tuning

**Recommendation:** Design the credit sink system alongside Phase 5 Feature 7 (Credit Shop Items). Don't rush it — a poorly balanced economy is worse than no economy.

---

## Issue 5: Balance Not Cached

Every balance check runs live SQL:

```sql
SELECT SUM(credits_earned) FROM credit_events WHERE wallet_address = ?
SELECT SUM(credits_spent) FROM credit_spends WHERE wallet_address = ?
```

With many trades/burns per wallet, these sums scan many rows. There is no materialized balance.

### Fix (when it becomes a problem)

Add a `credit_balances` table as a cache:

```sql
CREATE TABLE credit_balances (
  wallet_address TEXT PRIMARY KEY,
  total_earned INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  balance INTEGER DEFAULT 0,
  last_updated TEXT
);
```

Update it after every `credit_events` INSERT and `credit_spends` INSERT using a trigger or application-level write-through.

**Recommendation:** Don't implement yet. D1 handles the current load fine. Add when player count exceeds ~500 or when balance queries show up in slow query logs.

---

## Issue 6: Dual Burn Detection (UI + Worker)

Burns can be detected two ways:
1. **UI path:** Player clicks Burn in the app → `POST /api/game/burn` → records immediately
2. **Worker path:** Credit-tracker worker detects on-chain transfer to burn address → records on next scan

Both use `event_id` with the NFT ID to prevent duplicates (`UNIQUE` constraint on `credit_events.event_id`). However:

- UI path uses `event_id = 'burn_${nftId}'`
- Worker path uses `event_id = 'burn_${nftId}'` (same)

So if the UI records the burn first, the worker's insert fails silently on the UNIQUE constraint — which is correct. If the worker detects the burn before the UI call (unlikely since the UI call happens immediately after the wallet transaction), the UI insert would fail with a 409 — also correct.

**The `wojak_burns` table is separate:** Only the UI path writes to `wojak_burns`. The worker does NOT write to `wojak_burns`. This means indexer-detected burns (without the UI path) won't have a `wojak_burns` row but will have `credit_events` entries. This is fine as long as nothing relies on `wojak_burns` for credit accounting.

**No action needed** — the dual-path design is sound. Just fix the worker's column list (Issue 1).

---

## Implementation Priority

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 1 | Worker burn INSERT columns | Small | Correctness — prevents wrong event_type |
| 2 | onboarding_minted milestone | Small-Med | Player experience — awards missing bonus |
| 3 | Currency system documentation | Tiny | Clarity — no code change, just UI copy |
| 4 | Credit sink design | Deferred | Economy — wait for Phase 5 |
| 5 | Balance caching | Deferred | Performance — not needed yet |
| 6 | Dual burn detection alignment | None | Already correct |
