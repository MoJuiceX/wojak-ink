# Vote Power — All Voters Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** All votes (not just Farmers Plot holders) update `combat_fighters.vote_power` and therefore `power_score`. Credits remain holder-only.

**Architecture:** Single-file change in `functions/api/game/vote.ts`. Move the `combat_fighters` UPDATE outside the `isHolder` gate. Keep credit award logic inside the holder gate.

**Tech Stack:** TypeScript, Cloudflare Workers, D1 SQLite.

---

## Context Files — Read These First

1. `functions/api/game/vote.ts` — full file. Understand the `isHolder` check and where `combat_fighters` is updated vs where credits are awarded.
2. `docs/plans/2026-02-20-voting-identity-design.md` — decision rationale.

---

## Current Behaviour (What to Change)

In `vote.ts`, the flow is roughly:

```typescript
const isHolder = ...; // phase1_verified check

if (isHolder) {
  // Updates combat_fighters.vote_power  ← MOVE THIS OUT
  // Awards credits                      ← KEEP THIS IN
}
```

The `combat_fighters.vote_power` UPDATE must move to run for ALL voters.
The credit award block must stay inside `isHolder`.

---

## Task 1: Move vote_power Update Outside Holder Gate

**File:** `functions/api/game/vote.ts`

**Step 1:** Read the full file. Identify:
- The block that updates `combat_fighters.vote_power` and `power_score`
- The block that awards credits (ONBOARDING_CREDITS, participation credits)
- Where `isHolder` guards both

**Step 2:** Restructure so that:
- `combat_fighters` vote_power + power_score UPDATE runs for every vote (not gated on `isHolder`)
- Credit award block remains inside `if (isHolder)` unchanged

The SQL to always run (adapt to match actual code):
```sql
UPDATE combat_fighters
SET vote_power = vote_power + ?,
    power_score = vote_power + ? + battle_power,
    updated_at = datetime('now')
WHERE nft_id = ?
```
where `?` = netScoreDelta (+1 for like, -1 for dislike).

**Step 3:** Verify `wojak_scores` update is NOT inside the holder gate already (it shouldn't be — check, don't assume).

**Step 4:** Build check — `npm run build` or `tsc --noEmit`. Fix any type errors.

**Step 5:** Manual smoke test logic (read the code, trace through):
- Guest vote path: `voterDid = null`, `guestId = 'abc'`
  - `isHolder = false`
  - `combat_fighters.vote_power` should now update ✓
  - No credits awarded ✓
- Holder vote path: `isHolder = true`
  - `combat_fighters.vote_power` updates ✓
  - Credits awarded ✓

**Step 6:** Commit
```bash
git add functions/api/game/vote.ts
git commit -m "feat(voting): all votes update vote_power, not just holders

Credits remain holder-only (phase1_verified). Any voter — guest or
wallet — now moves the leaderboard needle.

Design: docs/plans/2026-02-20-voting-identity-design.md"
```

---

## Success Criteria

- [ ] `tsc --noEmit` passes
- [ ] `combat_fighters.vote_power` UPDATE is outside `isHolder` block
- [ ] Credit award block is still inside `isHolder` block
- [ ] `wojak_scores` update is unchanged
- [ ] No new `any` types

## Out of Scope

- Do NOT change `wojak_votes` schema or inserts
- Do NOT change credit amounts or credit award triggers
- Do NOT touch any other endpoint
- Do NOT change rate limiting logic

## Report Format

```
DONE: Vote Power — All Voters
Files changed: [list]
Build: PASS / FAIL
Self-checks:
  - vote_power update outside isHolder gate: pass/fail
  - credits still inside isHolder gate: pass/fail
  - wojak_scores unchanged: pass/fail
  - tsc --noEmit: pass/fail
Notes: [anything unexpected]
```
