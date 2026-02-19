# Move Auto-Assignment — Deterministic Attacks from Traits

---

## Overview

Moves are no longer user-selected. All 4 moves are deterministically assigned based on the Wojak's traits, colors, and details — the same inputs that determine type, nature, and ability. The constraint is: **exactly 3 damaging moves + 1 status/skill move**.

The user never sees or chooses attacks. They create art in the Generator, click Mint, name their Wojak, and all combat identity (type, nature, ability, AND attacks) is revealed after the mint completes.

---

## Task 1: Create Move Assigner Algorithm

**File:** `src/lib/combat/move-assigner.ts` (NEW)

Create a deterministic move assignment function that picks 4 moves based on the fighter's combat identity.

### Algorithm:

```typescript
import { CombatIdentity } from './identity-calculator';
import { getMovePoolForType, getMoveById } from './data/moves';
import type { CombatMove, CombatType } from './types';

interface MoveAssignment {
  moves: string[]; // 4 move IDs: [damage, damage, damage, status]
  valid: boolean;
}

export function assignMoves(identity: CombatIdentity): MoveAssignment {
  const pool = getMovePoolForType(identity.type);

  // Split pool into damaging moves (power > 0) and status moves (power === 0)
  const damageMoves = pool.filter(m => m.power > 0);
  const statusMoves = pool.filter(m => m.power === 0);

  // Score each damaging move based on stat alignment
  const scoredDamage = damageMoves.map(move => ({
    move,
    score: scoreDamageMove(move, identity),
  })).sort((a, b) => b.score - a.score);

  // Score each status move based on stat alignment and utility
  const scoredStatus = statusMoves.map(move => ({
    move,
    score: scoreStatusMove(move, identity),
  })).sort((a, b) => b.score - a.score);

  // Pick top 3 damaging moves
  const selectedDamage = scoredDamage.slice(0, 3).map(s => s.move.id);

  // Pick top 1 status move
  const selectedStatus = scoredStatus.length > 0
    ? [scoredStatus[0].move.id]
    : [scoredDamage[3]?.move.id]; // Fallback: 4th damage move if no status moves

  const moves = [...selectedDamage, ...selectedStatus].filter(Boolean);

  return {
    moves,
    valid: moves.length === 4,
  };
}
```

### Scoring Functions:

```typescript
function scoreDamageMove(move: CombatMove, identity: CombatIdentity): number {
  let score = 0;
  const stats = identity.statScores;

  // Category alignment: physical moves score higher for high-attack fighters
  if (move.category === 'physical') {
    score += (stats.attack || 0) * 2;
  } else if (move.category === 'special') {
    score += (stats.sp_atk || 0) * 2;
  }

  // Power bonus: stronger moves score higher (but not overwhelmingly)
  score += move.power * 0.5;

  // Accuracy bonus: reliable moves score slightly higher
  score += move.accuracy * 0.1;

  // Priority moves get a bonus for fast fighters
  if (move.effects?.some(e => e.type === 'priority')) {
    score += (stats.speed || 0) * 1.5;
  }

  // Drain/heal moves get a bonus for defensive fighters
  if (move.effects?.some(e => e.type === 'drain')) {
    score += (stats.defense || 0) + (stats.sp_def || 0);
  }

  // Recoil moves get a penalty for fragile fighters, bonus for tanky ones
  if (move.effects?.some(e => e.type === 'recoil')) {
    const tankiness = (stats.defense || 0) + (stats.sp_def || 0);
    score += tankiness > 6 ? 10 : -10;
  }

  return score;
}

function scoreStatusMove(move: CombatMove, identity: CombatIdentity): number {
  let score = 0;
  const stats = identity.statScores;

  // Healing moves score higher for defensive fighters
  if (move.effects?.some(e => e.type === 'heal')) {
    score += (stats.defense || 0) + (stats.sp_def || 0);
    score += 15; // Healing is always useful
  }

  // Stat boost moves: match the boost stat to fighter's strength
  const boostEffect = move.effects?.find(e => e.type === 'stat_boost');
  if (boostEffect && 'stat' in boostEffect) {
    const boostStat = boostEffect.stat as string;
    score += (stats[boostStat] || 0) * 2;
    // Multi-stage boosts are more valuable
    if ('stages' in boostEffect && (boostEffect.stages as number) >= 2) {
      score += 10;
    }
  }

  // Stat drop moves: useful for all fighters
  const dropEffect = move.effects?.find(e => e.type === 'stat_drop');
  if (dropEffect && 'target' in dropEffect && dropEffect.target === 'opponent') {
    score += 10;
  }

  // Status condition moves (sleep, burn, poison, paralysis)
  const statusEffect = move.effects?.find(e => e.type === 'status');
  if (statusEffect && 'status' in statusEffect) {
    const statusType = statusEffect.status as string;
    // Sleep is the best status
    if (statusType === 'sleep') score += 20;
    // Paralysis great for slow fighters
    else if (statusType === 'paralysis') score += 15 + (stats.speed || 0 < 3 ? 10 : 0);
    // Burn great against physical attackers
    else if (statusType === 'burn') score += 12;
    // Poison is steady damage
    else if (statusType === 'poison') score += 10;
    // Confusion is decent
    else if (statusType === 'confusion') score += 8;

    // Accuracy matters more for status moves
    score += (move.accuracy - 50) * 0.3;
  }

  // Priority status moves get a bonus
  if (move.effects?.some(e => e.type === 'priority')) {
    score += 8;
  }

  return score;
}
```

### Determinism guarantee:

The scoring is purely based on:
- The move's attributes (power, accuracy, category, effects) — static
- The identity's statScores — deterministic from traits/colors/details

Same input always produces the same 4 moves. No randomness.

### Edge case handling:

- If a type has fewer than 3 damaging moves: use all damaging moves available, fill remaining with status
- If a type has zero status moves: use 4 damaging moves (the constraint is best-effort)
- Every type currently has 3-6 status moves and 4-7 damaging moves, so both cases should work

---

## Task 2: Server-Side Integration — Auto-Assign During Mint

**File:** `functions/api/mint/process.ts`

The finalizeJob function currently only creates a combat fighter if `combat_moves_json` is present (i.e., user selected moves). Change this so that **every mint automatically gets combat identity and moves**.

### Changes:

1. Remove the `if (job.combat_moves_json)` gate. Instead, **always** calculate combat identity and assign moves:

```typescript
// In finalizeJob, after NFT is minted successfully:

// ALWAYS calculate combat identity for every minted Wojak
const combatTraitEntries = Object.entries(job.selected_layers)
  .filter(([, path]) => path && path !== '')
  .map(([layer, path]) => ({
    traitId: path.split('/').pop()?.replace(/\.[^.]+$/, '') || '',
    layer,
  }));

const combatColorMap: Record<string, string> = {};
if (job.selected_colors) {
  const colors = JSON.parse(job.selected_colors);
  for (const [layer, hex] of Object.entries(colors)) {
    combatColorMap[layer] = hex as string;
  }
}

const identity = calculateCombatIdentity({
  traits: combatTraitEntries,
  colors: combatColorMap,
  details: {}, // detail map if available
});

// Auto-assign moves based on identity
const moveAssignment = assignMoves(identity);

if (moveAssignment.valid) {
  const fighterInsert = buildFighterInsertSQL({
    nft_id: launcherId || `pending_${mintNumber}`,
    edition_number: mintNumber,
    owner_did: '', // Claimed later
    combat_type: identity.type,
    nature: identity.nature,
    ability: identity.ability,
    moves: moveAssignment.moves,
  });

  await env.DB.prepare(fighterInsert.query).bind(...fighterInsert.bindings).run();
}
```

2. Remove the old `combat_moves_json` conditional logic. The `combat_moves_json` column in `mint_jobs` is no longer needed for new mints (but keep the column for backwards compatibility with existing data).

3. Import the new function:
```typescript
import { assignMoves } from '../../src/lib/combat/move-assigner';
```

**Note:** The import path may need adjustment depending on how Cloudflare Workers resolves paths. If `src/lib/` isn't accessible from `functions/`, the `assignMoves` function should be **duplicated into** `functions/lib/combat/move-assigner.ts` or the shared code moved to a common location. Check how `calculateCombatIdentity` is currently imported — follow the same pattern.

---

## Task 3: Update submit.ts — Remove Client Move Validation

**File:** `functions/api/mint/submit.ts`

Since moves are no longer user-provided:

1. Remove the `combatMoves` field from the request body parsing (around lines 157-183)
2. Remove the `validateMoveSelection()` call
3. Remove the `combat_moves_json` column from the mint_jobs INSERT
4. Keep accepting the field silently (don't error if old clients send it), just ignore it

```typescript
// BEFORE: validates and stores combatMoves from request body
// AFTER: ignore combatMoves entirely — auto-assigned in process.ts
```

---

## Task 4: Store Assigned Moves in Mint Job Response

**File:** `functions/api/mint/process.ts` (or relevant status endpoint)

After the fighter is created with auto-assigned moves, the frontend needs to know the assigned combat identity for the reveal screen.

Update the job status endpoint (or the finalization response) to include combat data:

```typescript
// When returning job status after completion, include combat identity:
return {
  status: 'completed',
  mintNumber,
  nftId: launcherId,
  // NEW: combat identity for reveal
  combat: {
    type: identity.type,
    nature: identity.nature,
    ability: identity.ability,
    moves: moveAssignment.moves.map(id => {
      const move = getMoveById(id);
      return {
        id,
        name: move?.name || id,
        power: move?.power || 0,
        accuracy: move?.accuracy || 0,
        category: move?.category || 'physical',
        description: move?.description || '',
      };
    }),
  },
};
```

Check how the frontend polls for job status — it likely calls `/api/mint/status?jobId=xxx`. Add the combat data to that response when status is 'completed'.

---

## Task 5: Validate Move Constraint (3 damage + 1 status)

Add a validation step to `assignMoves` that ensures the **3 damage + 1 status** constraint:

```typescript
// After selecting moves, validate the constraint
const selectedMoveObjects = moves.map(id => getMoveById(id)).filter(Boolean);
const damageCount = selectedMoveObjects.filter(m => m!.power > 0).length;
const statusCount = selectedMoveObjects.filter(m => m!.power === 0).length;

if (damageCount !== 3 || statusCount !== 1) {
  // Rebalance: if we have too many damage moves, swap lowest-scored one for best status
  // If we have too many status moves, swap lowest-scored one for best damage
  // This handles edge cases gracefully
}
```

This is the hard constraint from the user: exactly 3 attackers + 1 skill move.

---

## Rules
- Run `npm run build` after each task
- Commit and `git push origin main` after each task
- The move assignment must be **deterministic** — same traits/colors always produce same moves
- Every newly minted Wojak must get combat identity + 4 moves automatically
- The move constraint is 3 damage + 1 status — enforce this
- Do NOT use `Math.random()` anywhere in the algorithm
- Check how `calculateCombatIdentity` is imported in process.ts — follow the same import pattern for `assignMoves`
- Keep `src/lib/combat/data/moves.ts` unchanged — it has all 174 moves and they're perfect
