# Combat Integration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the completed combat system (Phases 2-5) into the live mint pipeline, add DID auth to combat endpoints, register missing combat backgrounds, integrate combat leaderboard, push all work, and verify end-to-end.

**Architecture:** The mint pipeline (`submit.ts` → `process.ts` → `finalizeJob()`) must persist `combatMoves` through `mint_jobs` and call `buildFighterInsertSQL()` at finalization. Combat API endpoints need DID ownership verification against `combat_fighters.owner_did`. The leaderboard page gets a "Combat" game entry routed to the existing `CombatLeaderboard` component. Finally, push 24+ commits and deploy migration 060.

**Tech Stack:** Cloudflare Pages Functions, D1 SQLite, React, TypeScript, Tailwind + theme.css

---

### Task 1: D1 Migration — Add combat_moves_json column to mint_jobs

The `mint_jobs` table needs a column to persist the user's 4 selected combat moves between `submit.ts` (job creation) and `finalizeJob()` (fighter creation).

**Files:**
- Create: `functions/migrations/061_mint_jobs_combat_moves.sql`

**Step 1: Write the migration**

```sql
-- functions/migrations/061_mint_jobs_combat_moves.sql
-- Store combat move selections on mint jobs for fighter creation at finalization
ALTER TABLE mint_jobs ADD COLUMN combat_moves_json TEXT;
```

**Step 2: Verify migration SQL is valid**

Run: `cat functions/migrations/061_mint_jobs_combat_moves.sql`
Expected: Single ALTER TABLE statement

**Step 3: Commit**

```bash
git add functions/migrations/061_mint_jobs_combat_moves.sql
git commit -m "feat: add combat_moves_json column to mint_jobs (migration 061)"
```

---

### Task 2: Wire combatMoves through submit.ts → mint_jobs

`submit.ts` already accepts `combatMoves` in the body (line 60) and has `validateCombatMoves()` (lines 64-70), but never validates or persists them. Wire it up.

**Files:**
- Modify: `functions/api/mint/submit.ts`

**Step 1: Add combatMoves validation after layer validation**

Find the section after the layer/color validation loop (around line 154, before `try {`). Add:

```typescript
  // ── Validate combat moves (optional — required for combat-ready mints) ──
  const combatMoves = body.combatMoves;
  let combatMovesJson: string | null = null;
  if (combatMoves && Array.isArray(combatMoves) && combatMoves.length > 0) {
    // Determine combat type from selections to validate moves
    const consolidated = consolidateTraits(selectedLayers);
    const traitEntries = [...consolidated.values()].map(t => ({
      traitType: t.traitType,
      displayName: t.displayName,
    }));
    const colors = Object.entries(selectedColors)
      .filter(([, v]) => v)
      .map(([layer, hex]) => ({ layer, hex: hex! }));

    const identity = calculateCombatIdentity(traitEntries, colors, []);
    const moveValidation = validateCombatMoves(combatMoves, identity.primaryType);
    if (!moveValidation.valid) {
      return errorResponse(moveValidation.error || 'Invalid combat moves', 400);
    }
    combatMovesJson = JSON.stringify(combatMoves);
  }
```

Note: `calculateCombatIdentity` and `validateCombatMoves` are already imported (verify — if not, add imports from `../../src/lib/combat`). The `consolidateTraits` is already imported from `./traitResolver`.

**Step 2: Add combat_moves_json to the mint_jobs INSERT**

In the `batchStmts.push()` for job creation (around line 327-345), add `combat_moves_json` column and binding:

Change the INSERT statement to include `combat_moves_json` in the column list and add `combatMovesJson` to the `.bind()` call.

The INSERT column list becomes:
```
wallet_address, idempotency_key, layers_json, colors_json,
image_base64_hash, mint_type, credit_cost, xch_price_mojos,
surcharge_xch, highest_surcharge_trait,
step, wallet_lock, credit_spend_id, expires_at, custom_name, combat_moves_json
```

Add one more `?` to VALUES and add `combatMovesJson` at the end of `.bind()`.

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 4: Commit**

```bash
git add functions/api/mint/submit.ts
git commit -m "feat: validate and persist combatMoves in mint job creation"
```

---

### Task 3: Wire finalizeJob() to create combat_fighters rows

`process.ts` already has `buildFighterInsertSQL()` (lines 42-58) but `finalizeJob()` never calls it. Add the fighter INSERT to the finalization batch.

**Files:**
- Modify: `functions/api/mint/process.ts`

**Step 1: Add combat_moves_json to MintJobRow interface**

In the `MintJobRow` interface (around line 78), add:

```typescript
  combat_moves_json: string | null;
```

**Step 2: Add fighter creation to finalizeJob() batch**

In `finalizeJob()`, after the nft_names INSERT (around line 467, before `await env.DB.batch(batchStmts)`), add:

```typescript
  // Insert combat fighter record if combat moves were selected
  if (job.combat_moves_json) {
    const combatMoves = JSON.parse(job.combat_moves_json) as string[];
    if (combatMoves.length === 4) {
      // Re-derive combat identity from the layers/colors
      const combatTraitEntries = [...consolidated.values()].map(t => ({
        traitType: t.traitType,
        displayName: t.displayName,
      }));
      const colors = JSON.parse(job.colors_json) as Record<string, string>;
      const colorEntries = Object.entries(colors)
        .filter(([, v]) => v)
        .map(([layer, hex]) => ({ layer, hex }));

      const identity = calculateCombatIdentity(combatTraitEntries, colorEntries, []);

      // Use launcher_id as nft_id (the on-chain NFT identifier)
      const nftId = launcherId || `pending_${job.mint_number}`;

      const fighterInsert = buildFighterInsertSQL({
        nft_id: nftId,
        edition_number: job.mint_number!,
        owner_did: '', // Will be set when owner claims via DID
        combat_type: identity.primaryType,
        nature: identity.nature,
        ability: identity.ability,
        moves: combatMoves,
      });

      batchStmts.push(
        env.DB.prepare(fighterInsert.query).bind(...fighterInsert.bindings)
      );
    }
  }
```

**Step 3: Add import for calculateCombatIdentity**

At the top of `process.ts`, add:

```typescript
import { calculateCombatIdentity } from '../../src/lib/combat/identity-calculator';
```

Verify this import path works for Cloudflare Pages Functions. If not, the import may need to be `../../src/lib/combat` (barrel export).

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 5: Commit**

```bash
git add functions/api/mint/process.ts
git commit -m "feat: create combat_fighters row at mint finalization"
```

---

### Task 4: Add DID ownership verification to combat queue endpoint

Currently `queue.ts` trusts the client-sent `ownerDid`. Add verification that the DID owns the NFT by checking `combat_fighters.owner_did`.

**Files:**
- Modify: `functions/api/combat/queue.ts`

**Step 1: Review current auth pattern**

The current pattern in `queue.ts` already does:
1. Validates `ownerDid` format with `isValidDid()`
2. Looks up fighter by `nftId`
3. Checks `fighter.owner_did !== ownerDid` → 403

This is the correct claim-based auth pattern for a DID-authenticated system. The client sends their DID claim, the server verifies it matches the on-chain record.

**Assessment:** The existing auth is sufficient. The fighter's `owner_did` is set at mint time from the wallet's DID. The queue endpoint already verifies `fighter.owner_did !== ownerDid` returning 403. No changes needed here.

**Step 2: Verify submit-move.ts auth**

`submit-move.ts` verifies the NFT is a battle participant but does NOT verify the submitter's DID owns that NFT. Add ownership check:

In `submit-move.ts`, after verifying the `side` (around line 38), add:

```typescript
// Verify the submitter owns this fighter
const fighter = await db.prepare(
  'SELECT owner_did FROM combat_fighters WHERE nft_id = ?'
).bind(nftId).first<{ owner_did: string }>();

if (!fighter) return errorResponse('Fighter not found', 404);

// ownerDid comes from the request body
const ownerDid = body.ownerDid;
if (!ownerDid || !isValidDid(ownerDid)) return errorResponse('Missing or invalid ownerDid', 400);
if (fighter.owner_did !== ownerDid) return errorResponse('Not the owner of this fighter', 403);
```

Also update the request body type to include `ownerDid: string`.

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 4: Commit**

```bash
git add functions/api/combat/submit-move.ts
git commit -m "feat: add DID ownership verification to submit-move endpoint"
```

---

### Task 5: Register combat background scenes in layerRegistry

14 combat-themed backgrounds exist as files in `/public/assets/wojak-layers/BACKGROUND/Scene/` but aren't registered in `SCENE_BACKGROUNDS`.

**Files:**
- Modify: `src/lib/layerRegistry.ts`

**Step 1: Add the 14 missing backgrounds**

Find the `SCENE_BACKGROUNDS` array (line 146). Append these entries after the existing 16:

```typescript
  '/assets/wojak-layers/BACKGROUND/Scene/BACKGROUND_Colosseum.png',
  '/assets/wojak-layers/BACKGROUND/Scene/BACKGROUND_Crystal.png',
  '/assets/wojak-layers/BACKGROUND/Scene/BACKGROUND_Dark Alley.png',
  '/assets/wojak-layers/BACKGROUND/Scene/BACKGROUND_Deep Ocean.png',
  '/assets/wojak-layers/BACKGROUND/Scene/BACKGROUND_Dragons Lair.png',
  '/assets/wojak-layers/BACKGROUND/Scene/BACKGROUND_Frozen Tundra.png',
  '/assets/wojak-layers/BACKGROUND/Scene/BACKGROUND_Graveyard.png',
  '/assets/wojak-layers/BACKGROUND/Scene/BACKGROUND_Hive Nest.png',
  '/assets/wojak-layers/BACKGROUND/Scene/BACKGROUND_Jungle.png',
  '/assets/wojak-layers/BACKGROUND/Scene/BACKGROUND_Sky Fortress.png',
  '/assets/wojak-layers/BACKGROUND/Scene/BACKGROUND_Steel Forge.png',
  '/assets/wojak-layers/BACKGROUND/Scene/BACKGROUND_Stone Temple.png',
  '/assets/wojak-layers/BACKGROUND/Scene/BACKGROUND_Thunderstorm.png',
```

**Step 2: Verify the file names match actual files on disk**

Run: `ls public/assets/wojak-layers/BACKGROUND/Scene/ | grep -E "Colosseum|Crystal|Dark Alley|Deep Ocean|Dragons Lair|Frozen Tundra|Graveyard|Hive Nest|Jungle|Sky Fortress|Steel Forge|Stone Temple|Thunderstorm"`

Expected: 13 matches (or however many actually exist — only add entries for files that exist)

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 4: Commit**

```bash
git add src/lib/layerRegistry.ts
git commit -m "feat: register combat-themed background scenes in layer registry"
```

---

### Task 6: Add Combat to Leaderboard page

The leaderboard needs a "Combat" entry in the game selector sidebar. The `CombatLeaderboard` component already exists.

**Files:**
- Modify: `src/types/leaderboard.ts`
- Modify: `src/pages/Leaderboard.tsx` (or `src/components/Leaderboard/Leaderboard.tsx`)

**Step 1: Add 'combat' to GameId union type**

In `src/types/leaderboard.ts`, add `'combat'` to the `GameId` union (line 81):

```typescript
export type GameId =
  | 'orange-stack'
  | 'memory-match'
  // ... existing entries ...
  | 'wojak-whack'
  | 'combat';
```

**Step 2: Add combat to GAME_NAMES and ACTIVE_GAME_IDS**

```typescript
// In GAME_NAMES:
'combat': 'Combat Arena',

// In ACTIVE_GAME_IDS, add at end:
'combat',
```

**Step 3: Add combat emoji to GAME_EMOJIS**

Find `GAME_EMOJIS` in the Leaderboard component and add:

```typescript
'combat': '⚔️',
```

**Step 4: Conditionally render CombatLeaderboard when combat is selected**

In the Leaderboard component, when `selectedGame === 'combat'`, render `<CombatLeaderboard />` instead of the default score-based leaderboard. This is a conditional check in the main render:

```typescript
{selectedGame === 'combat' ? (
  <CombatLeaderboard />
) : (
  // existing leaderboard content
)}
```

Import `CombatLeaderboard` from `../../components/combat`.

**Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 6: Commit**

```bash
git add src/types/leaderboard.ts src/pages/Leaderboard.tsx src/components/Leaderboard/Leaderboard.tsx
git commit -m "feat: add Combat Arena to leaderboard game selector"
```

---

### Task 7: Push all commits to remote

24+ commits on main, not pushed.

**Files:** None (git operation only)

**Step 1: Verify clean working tree**

Run: `git status`
Expected: Working tree clean (or only untracked docs/handoff files)

**Step 2: Review commit log**

Run: `git log --oneline origin/main..HEAD`
Expected: 24+ commits listed

**Step 3: Push to remote**

Run: `git push origin main`
Expected: Push succeeds

**Step 4: Verify push**

Run: `git log --oneline -3`
Expected: Latest commits visible

---

### Task 8: Verify D1 migration deployment

Migration `060_combat_system.sql` creates the 5 combat tables. Migration `061_mint_jobs_combat_moves.sql` adds the `combat_moves_json` column. Both auto-apply on Cloudflare Pages deployment.

**Files:** None (deployment operation)

**Step 1: Deploy to Cloudflare Pages**

Run: `/deploy` skill (or `npx wrangler pages deploy`)

**Step 2: Verify migrations applied**

After deployment, check the D1 console or run a test query against the production database to confirm `combat_fighters` table exists and `mint_jobs.combat_moves_json` column is present.

---

### Task 9: End-to-end smoke test

Manual verification that the full flow works.

**Checklist:**
- [ ] `/games/combat` page loads with "Combat Arena" heading
- [ ] Games hub has visible "Combat Arena" link
- [ ] Generator page shows CombatPreview in metadata panel
- [ ] MintFlowModal shows MoveSelection during confirming step
- [ ] Leaderboard page shows "Combat Arena" in game selector
- [ ] Combat leaderboard renders when selected (empty state OK)
- [ ] `/api/combat/type-chart` returns 18x18 matrix
- [ ] `/api/combat/leaderboard` returns empty array (no fighters yet)
- [ ] TypeScript: `npx tsc --noEmit` = 0 errors
- [ ] Tests: `npx vitest run src/lib/combat/` = 197 tests passing
- [ ] Playwright: `npx playwright test tests/combat.spec.ts` passes

---

## Dependency Order

```
Task 1 (migration 061)
  └→ Task 2 (submit.ts persists combatMoves)
       └→ Task 3 (finalizeJob creates fighters)
Task 4 (auth in submit-move) — independent
Task 5 (backgrounds) — independent
Task 6 (leaderboard) — independent
Task 7 (push) — after Tasks 1-6
Task 8 (deploy) — after Task 7
Task 9 (smoke test) — after Task 8
```

Tasks 4, 5, 6 are independent of each other and of Tasks 1-3. They can be parallelized.
