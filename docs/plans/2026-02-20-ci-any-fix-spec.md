# SPEC: Fix CI TypeScript `any` Errors in Combat Agent Files

**Date:** 2026-02-20
**Type:** Bug fix — CI failure
**Priority:** High — blocking CI on every push
**Independent:** Yes

---

## Problem

CI fails on every push with `Unexpected any` errors from the
`@typescript-eslint/no-explicit-any` rule. All 10 errors are in three combat
agent API files. The same files already use the correct typed pattern
elsewhere — these spots just never got typed.

Failing files:
- `functions/api/combat/agent-move.ts` (6 errors: L34, L47, L57, L79, L83, L84)
- `functions/api/combat/agent-profile.ts` (2 errors: L16, L38)
- `functions/api/combat/agent-queue.ts` (2 errors: L134, L135)

---

## Context Files to Read First

1. `CLAUDE.md`
2. All three failing files in full before touching

---

## Fix — `functions/api/combat/agent-move.ts`

Add these three interfaces after the `import` block (before the `Env` interface):

```typescript
interface CombatBattleRow {
  id: number;
  fighter_a_nft: string;
  fighter_b_nft: string;
  fighter_a_did: string;
  fighter_b_did: string;
  fighter_a_level: number;
  fighter_b_level: number;
  fighter_a_elo: number;
  fighter_b_elo: number;
  current_turn: number;
  status: string;
  winner_nft: string | null;
}

interface CombatFighterRow {
  nft_id: string;
  owner_did: string;
  combat_type: string;
  nature: string;
  ability: string;
  move_1: string;
  move_2: string;
  move_3: string;
  move_4: string;
  level: number;
  xp: number;
  elo_rating: number;
}

interface CombatTurnRow {
  battle_id: number;
  turn_number: number;
  fighter_a_move: string | null;
  fighter_b_move: string | null;
  turn_result: string | null;
}
```

Then replace the six `.first<any>()` calls:

| Line | Before | After |
|------|--------|-------|
| 34 | `.first<any>()` (battle query) | `.first<CombatBattleRow>()` |
| 47 | `.first<any>()` (fighter query) | `.first<CombatFighterRow>()` |
| 57 | `.first<any>()` (turnRecord query) | `.first<CombatTurnRow>()` |
| 79 | `.first<any>()` (updated query) | `.first<CombatTurnRow>()` |
| 83 | `.first<any>()` (fighterARow query) | `.first<CombatFighterRow>()` |
| 84 | `.first<any>()` (fighterBRow query) | `.first<CombatFighterRow>()` |

---

## Fix — `functions/api/combat/agent-profile.ts`

Add this interface after the `import` block:

```typescript
interface AgentRow {
  id: number;
  owner_did: string;
  name: string;
  status: string;
  tier: string;
  created_at: string;
}
```

Then two changes:

**Line 16** — change:
```typescript
let agent: any;
```
to:
```typescript
let agent: AgentRow | null = null;
```

**Line 38** — change:
```typescript
const fighterList = (fighters.results ?? []).map((row: any) => buildFighterResponse(row));
```
to:
```typescript
const fighterList = (fighters.results ?? []).map((row: Record<string, unknown>) => buildFighterResponse(row));
```

---

## Fix — `functions/api/combat/agent-queue.ts`

Lines 134–135 — change:
```typescript
const fighterARow = await db.prepare('SELECT * FROM combat_fighters WHERE nft_id = ?').bind(nft_id).first<any>();
const fighterBRow = await db.prepare('SELECT * FROM combat_fighters WHERE nft_id = ?').bind(opponent.nft_id).first<any>();
```
to:
```typescript
const fighterARow = await db.prepare('SELECT * FROM combat_fighters WHERE nft_id = ?').bind(nft_id).first<Record<string, unknown>>();
const fighterBRow = await db.prepare('SELECT * FROM combat_fighters WHERE nft_id = ?').bind(opponent.nft_id).first<Record<string, unknown>>();
```

Note: `Record<string, unknown>` is used here because `sendBattleStartWebhook`
(in `_webhook.ts`) accepts `Record<string, unknown>` for its fighter params —
the types are already compatible.

---

## Constraints

- Modify ONLY the three files listed above
- Do NOT change any logic, query strings, or business behaviour
- Do NOT add imports — only add interfaces and change type annotations
- Do NOT touch any other combat files

---

## Success Criteria

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run build` passes
- [ ] Zero `Unexpected any` warnings/errors in the three files
- [ ] CI passes on next push

## Verification

```bash
# Check no `any` left in these files
grep -n ": any\|<any>" \
  functions/api/combat/agent-move.ts \
  functions/api/combat/agent-profile.ts \
  functions/api/combat/agent-queue.ts
# Expected: no output

# TypeScript clean
npx tsc --noEmit

# Build
npm run build
```

---

## Suggested Commit Message

```
fix(ci): replace explicit `any` types in combat agent endpoints

Typed D1 query results in agent-move.ts, agent-profile.ts, agent-queue.ts
using CombatBattleRow, CombatFighterRow, CombatTurnRow, AgentRow interfaces
and Record<string, unknown> where webhook types require it.

Fixes @typescript-eslint/no-explicit-any CI errors (10 warnings → 0).
No logic changes.
```

---

## Report Format When Done

```
DONE: Fix CI `any` errors in combat agent files
Files changed: agent-move.ts, agent-profile.ts, agent-queue.ts
TypeScript: PASS / FAIL
Build: PASS / FAIL
Self-checks:
  - No `any` remaining in three files: PASS/FAIL
  - Zero new TS errors introduced: PASS/FAIL
Notes: [anything unexpected]
```
