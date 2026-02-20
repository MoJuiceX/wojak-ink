# Wallet Identity + Leaderboard Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Every minted Wojak stores the minter's wallet address. The players leaderboard shows users with wallet addresses when they have no DID, so all minters appear on the leaderboard immediately after minting.

**Architecture:**
1. DB migration adds `owner_address TEXT DEFAULT ''` to `combat_fighters`
2. Mint process stores wallet address at INSERT time
3. Power leaderboard "players" query groups by `COALESCE(NULLIF(owner_did,''), owner_address)` instead of `owner_did` alone

**Tech Stack:** TypeScript, Cloudflare Workers, D1 SQLite, Cloudflare Pages.

---

## Context Files — Read These First

1. `functions/api/mint/process.ts` — find the INSERT into `combat_fighters`. Note all columns and values.
2. `functions/api/combat/power-leaderboard.ts` — full file. Understand the `type=players` query.
3. `functions/migrations/074_friends_status.sql` — read to understand migration format. New migration is `075_owner_address.sql`.
4. `docs/plans/2026-02-20-voting-identity-design.md` — decision rationale.

---

## Task 1: DB Migration — Add `owner_address` Column

**File to create:** `functions/migrations/075_owner_address.sql`

**Step 1:** Create the migration file:

```sql
-- 075_owner_address.sql
-- Add owner_address to combat_fighters for wallet-based identity.
-- Users without a DID now appear on the players leaderboard via their wallet address.
-- owner_did remains unchanged; owner_address is the minting wallet at creation time.

ALTER TABLE combat_fighters ADD COLUMN owner_address TEXT NOT NULL DEFAULT '';

-- Index for leaderboard GROUP BY queries
CREATE INDEX IF NOT EXISTS idx_combat_fighters_owner_address
  ON combat_fighters(owner_address);
```

**Step 2:** Apply locally (if wrangler D1 local dev is running):
```bash
npx wrangler d1 execute wojak-users --local --file=functions/migrations/075_owner_address.sql
```
If no local DB, skip — apply to remote in Task 4.

**Step 3:** Commit
```bash
git add functions/migrations/075_owner_address.sql
git commit -m "migration(075): add owner_address to combat_fighters

Enables wallet-based identity for users without a DID.
Default '' preserves existing rows."
```

---

## Task 2: Store Wallet Address at Mint

**File:** `functions/api/mint/process.ts`

**Step 1:** Read the full file. Find the INSERT into `combat_fighters`. It looks like:
```sql
INSERT INTO combat_fighters (nft_id, edition_number, owner_did, combat_type, ...)
VALUES (?, ?, ?, ?, ...)
```

**Step 2:** Identify where the minter's wallet address is available in scope during the INSERT. Look for:
- `walletAddress` or `minterWallet` variable
- The mint request body (should contain the wallet address that submitted the mint)
- `phase2_mints` row (has `minter_address` or similar column)

**Step 3:** Add `owner_address` to the INSERT:
```sql
INSERT INTO combat_fighters (nft_id, edition_number, owner_did, owner_address, combat_type, ...)
VALUES (?, ?, ?, ?, ?, ...)
```
Pass the minter's wallet address as the `owner_address` value.

> ⚠️ If the wallet address isn't directly available at INSERT time, look it up from `phase2_mints` using `nft_id` — it will have `minter_address` or similar. Do NOT leave it as empty string if avoidable.

**Step 4:** Build check — `tsc --noEmit`. Fix type errors.

**Step 5:** Commit
```bash
git add functions/api/mint/process.ts
git commit -m "feat(mint): store owner_address in combat_fighters at creation

Wallet address captured at mint time for identity fallback when
user has no DID. Powers leaderboard visibility for all minters."
```

---

## Task 3: Fix Power Leaderboard — Players View

**File:** `functions/api/combat/power-leaderboard.ts`

**Step 1:** Read the full file. Find the `type=players` branch. It currently:
1. Queries `combat_fighters` grouped by `owner_did`
2. Filters `WHERE owner_did != ''`
3. Joins `did_profiles` for display_name
4. Returns `{ rank, did, displayName, wojakCount, totalPower, bestWojakPower }`

**Step 2:** Change the `type=players` query:

Replace `GROUP BY owner_did` with:
```sql
GROUP BY COALESCE(NULLIF(owner_did, ''), owner_address)
```

Remove the `WHERE owner_did != ''` filter (or replace with):
```sql
WHERE (owner_did != '' OR owner_address != '')
```

**Step 3:** Update the identity column in the SELECT. Instead of just `owner_did`, select a derived identity:
```sql
COALESCE(NULLIF(owner_did, ''), owner_address) AS identity,
owner_did,
owner_address
```

**Step 4:** Update the display name logic. Currently it joins `did_profiles` on `owner_did`. Add a fallback:
```typescript
// Existing: displayName from did_profiles
// Add fallback when owner_did is empty:
const displayName = entry.displayName
  ?? (entry.owner_did ? truncateDid(entry.owner_did)
  : truncateAddress(entry.owner_address));
```

Implement `truncateAddress` if it doesn't exist:
```typescript
function truncateAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
```

**Step 5:** Update the response shape — the `did` field in the response should contain either the DID or the wallet address:
```typescript
{
  rank: number,
  identity: string,       // DID if present, wallet address if not
  isDid: boolean,         // true if identity is a DID, false if wallet address
  displayName: string,    // profile name, truncated DID, or truncated address
  wojakCount: number,
  totalPower: number,
  bestWojakPower: number
}
```
> Keep backward-compat `did` field if the frontend uses it — check `src/pages/GameLeaderboard.tsx` first. If `did` is used, keep it but populate it with `identity`.

**Step 6:** Check if the frontend `GameLeaderboard.tsx` needs updating for the new response shape. If the leaderboard page uses `entry.did` and expects it to always be a DID, it will still work since we keep the `did` field. But if it tries to link to a DID profile page, that will 404 for wallet-address entries. Make a note in the report if this needs a separate frontend fix — do NOT fix it in this spec.

**Step 7:** Build check — `tsc --noEmit`.

**Step 8:** Commit
```bash
git add functions/api/combat/power-leaderboard.ts
git commit -m "feat(leaderboard): show wallet-address users in players view

Players without a DID now appear grouped by wallet address.
Group by COALESCE(NULLIF(owner_did,''), owner_address).
Remove owner_did != '' filter."
```

---

## Task 4: Apply Migration to Remote D1

**Step 1:** Apply migration to remote:
```bash
npx wrangler d1 execute wojak-users --remote --file=functions/migrations/075_owner_address.sql
```

**Step 2:** Verify column exists:
```bash
npx wrangler d1 execute wojak-users --remote --command "PRAGMA table_info(combat_fighters);" | grep owner_address
```
Expected: row showing `owner_address | TEXT | 0 |  | 0`

**Step 3:** Commit if not already committed (migration file should already be committed from Task 1).

---

## Success Criteria

- [ ] `tsc --noEmit` passes
- [ ] `functions/migrations/075_owner_address.sql` exists and is committed
- [ ] `combat_fighters` on remote D1 has `owner_address` column
- [ ] `process.ts` INSERT includes `owner_address` with minter wallet value
- [ ] `/api/combat/power-leaderboard?type=players` no longer filters out empty-DID users
- [ ] Players with wallet address but no DID appear in leaderboard response
- [ ] Players with DID still appear grouped under DID (unchanged)
- [ ] No `any` types introduced

## Out of Scope

- Do NOT change the `type=wojaks` query (individual Wojaks leaderboard already works)
- Do NOT change `/api/game/leaderboard` (game players leaderboard — separate system)
- Do NOT change frontend leaderboard display components (note any needed frontend changes in report)
- Do NOT backfill existing `owner_address` from other tables (no fighters exist at launch)
- Do NOT touch battle-related fields

## Report Format

```
DONE: Wallet Identity + Leaderboard Fix
Files changed: [list]
Build: PASS / FAIL
Self-checks:
  - 075 migration applied to remote: pass/fail
  - owner_address in combat_fighters INSERT: pass/fail
  - leaderboard players query updated: pass/fail
  - empty-DID users visible in leaderboard: pass/fail
  - tsc --noEmit: pass/fail
Notes: [anything unexpected — especially frontend leaderboard compatibility]
```
