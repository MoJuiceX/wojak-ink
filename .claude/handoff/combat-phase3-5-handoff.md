# Combat System Handoff — Phases 3, 4, 5

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Status: What's Already Done

Phase 1 ✅ (14 commits) — Full combat data layer with tests:
- `src/lib/combat/types.ts` — all type definitions
- `src/lib/combat/data/type-chart.ts` — 18×18 effectiveness matrix
- `src/lib/combat/data/natures.ts` — 25 natures
- `src/lib/combat/data/base-stats.ts` — 18 type stat spreads (BST 485)
- `src/lib/combat/data/abilities.ts` — 36 abilities
- `src/lib/combat/data/moves.ts` — 174 moves with validation
- `src/lib/combat/data/trait-type-map.ts` — 129+ trait entries (includes 13 new backgrounds)
- `src/lib/combat/data/color-type-map.ts` — HSL → type points
- `src/lib/combat/data/color-nature-map.ts` — HSL → nature stat points
- `src/lib/combat/data/detail-combat-map.ts` — 37 detail option entries
- `src/lib/combat/identity-calculator.ts` — the core point→type/nature/ability calculator
- `src/lib/combat/index.ts` — barrel exports

Phase 2 ✅ (3 commits) — DB + mint integration:
- `functions/migrations/060_combat_system.sql` — 5 tables: combat_fighters, combat_battles, combat_queue, combat_turns, combat_level_thresholds
- `functions/api/mint/submit.ts` — extended with `validateCombatMoves()` + `combatMoves` in body
- `functions/api/mint/process.ts` — extended with `buildCombatAttributes()`, `buildFighterInsertSQL()`

Phase 6 ✅ (partial) — 13 new themed backgrounds added to trait-type-map.ts (Stone Temple omitted; Colosseum covers STONE type)

## What This Handoff Covers

**Phase 3:** Battle Engine Port — stat calculator, damage formula, status effects, ability triggers, turn resolver, battle runner, AI strategist, XP/ELO calculator

**Phase 4:** API Endpoints — fighter lookup, queue/matchmaking, submit-move, battle state, resolve-turn, leaderboard, history, identity preview, type chart

**Phase 5:** Frontend — combat theme styles, generator combat preview + move selection, battle page, HP bars, turn log, move buttons, battle history/replay, fighter cards, leaderboard, routing

## Critical References

**Design Doc (read FIRST):** `docs/plans/2025-02-18-combat-system-design.md`

**Full Implementation Plan:** `docs/plans/2026-02-18-combat-system-plan.md` — contains TDD steps for every task

**ClawCombat Source (for porting):**
- `/Users/abit_hex/ClawCombat/apps/backend/src/services/battle-engine.js` — 2730 lines, the core engine
- `/Users/abit_hex/ClawCombat/apps/backend/src/services/ai-strategist.js` — 438 lines, AI move selection
- `/Users/abit_hex/ClawCombat/apps/backend/src/services/xp-calculator.js` — XP/leveling formulas
- `/Users/abit_hex/ClawCombat/apps/backend/src/config/stat-scaling.js` — HP/stat formulas

**CSS Rules (CLAUDE.md):**
- Visual styles → `src/styles/theme.css` only
- Layout → Tailwind only (flex, grid, gap, padding)
- Use `.card`, `.btn`, `.badge` classes
- NO `!important` ever, NO inline color styles

**Test commands:**
- Unit: `npx vitest run src/lib/combat/`
- Single file: `npx vitest run src/lib/combat/stat-calculator.test.ts`
- E2E: `npx playwright test`

---

## Phase 3: Battle Engine Port

All files go in `src/lib/combat/`. Pure TypeScript logic — no API, no UI. Every module gets a `.test.ts` alongside it.

### CRITICAL: ClawCombat Balance Constants (DO NOT change these)

These were tuned over months of playtesting. Port them exactly:

```
Damage multiplier:     0.25     (prevents one-shots)
Type effectiveness cap: 1.5x    (was 2.0x — allows comebacks)
Critical hit:          1.25x    (was 1.5x — less swingy)
Paralysis skip chance: 15%      (was 25%)
Paralysis speed:       0.75x    (was 0.5x)
Freeze duration:       1 turn   (auto-thaw)
Sleep duration:        2 turns  (wake on damage)
Confusion:             3 turns, 25% self-hit
Burn damage:           1/16 maxHP per turn
Poison damage:         1/8 maxHP per turn
Stat stage range:      -6 to +6
```

### Task 3.1: Stat Calculator

**Create:** `src/lib/combat/stat-calculator.ts` + `stat-calculator.test.ts`

Port from ClawCombat `config/stat-scaling.js`:

```typescript
// HP formula
HP = floor((2 * baseHP + 31) * level / 100) + level + 10

// Other stats
Stat = floor(((2 * baseStat + 31) * level / 100) + 5) * natureMultiplier
// Where natureMultiplier = 1.1 (boosted), 0.9 (reduced), or 1.0 (neutral)
```

Export: `calculateHP(baseHP, level)`, `calculateStat(baseStat, level, natureMult)`, `calculateAllStats(type, level, natureName)`

Uses: `getBaseStats()` from `./data/base-stats`, `getNature()` from `./data/natures`

Test cases:
- HP at level 1 for NEUTRAL (baseHP=85) → 13
- HP at level 50 → 160
- HP at level 100 → 311
- +10% nature multiplier increases stat
- -10% nature multiplier decreases stat
- `calculateAllStats` returns all 6 stats (hp, attack, defense, sp_atk, sp_def, speed)

### Task 3.2: Battle State + Initialization

**Create:** `src/lib/combat/battle-state.ts` + `battle-state.test.ts`

Define the runtime battle state structures. Port from ClawCombat `battle-engine.js` agent state mapper.

```typescript
export interface FighterState {
  nftId: string;
  type: CombatType;
  nature: string;
  ability: string;
  moves: string[];        // 4 move IDs
  level: number;
  maxHP: number;
  currentHP: number;
  status: string | null;  // 'burn' | 'paralysis' | 'poison' | 'freeze' | 'sleep' | 'confusion' | null
  statusTurns: number;
  statStages: { atk: number; def: number; spa: number; spd: number; spe: number };
  effectiveStats: { hp: number; attack: number; defense: number; sp_atk: number; sp_def: number; speed: number };
  // Internal tracking flags
  sturdyUsed: boolean;
  flinched: boolean;
  leechSeeded: boolean;
  cursed: boolean;
}

export interface BattleState {
  id?: number;
  fighterA: FighterState;
  fighterB: FighterState;
  turnNumber: number;
  status: 'active' | 'finished';
  winnerId: string | null;
  turns: TurnResult[];
  maxTurns: number; // 50
}
```

Export: `initFighterState(fighterData)` — calculates stats using stat-calculator, sets HP, zeroes all statStages
Export: `initBattleState(fighterA, fighterB)` — wraps two fighter states into a battle

### Task 3.3: Damage Calculator

**Create:** `src/lib/combat/damage-calculator.ts` + `damage-calculator.test.ts`

The core damage formula. Port from ClawCombat `battle-engine.js` `calculateDamage()`.

Stat stage multiplier table (port exactly):
```
-6: 0.25, -5: 0.29, -4: 0.33, -3: 0.40, -2: 0.50, -1: 0.667
 0: 1.0,  +1: 1.5,  +2: 2.0,  +3: 2.5,  +4: 3.0,  +5: 3.5, +6: 4.0
```

Damage formula:
```
effectiveAtk = attackStat × stageMultiplier(atkStage)
effectiveDef = defenseStat × stageMultiplier(defStage)
// Crits: ignore negative atk stages and positive def stages
baseDamage = (effectiveAtk / max(effectiveDef, 1)) × movePower × 0.25
finalDamage = floor(baseDamage × STAB × min(typeEff, 1.5) × critMult × random(0.85-1.0) × burnMult)
return max(finalDamage, 1) // minimum 1 damage
```

Where:
- STAB = 1.5 if move type matches fighter type (2.0 with Adaptability ability)
- critMult = 1.25 if critical
- burnMult = 0.5 if attacker is burned AND move is physical
- random(0.85-1.0) — accept an optional parameter for deterministic testing

Export: `calculateDamage(input)`, `getStatStageMultiplier(stage)`

### Task 3.4: Status Effects

**Create:** `src/lib/combat/status-effects.ts` + `status-effects.test.ts`

Port from ClawCombat `battle-engine.js` end-of-turn effects and status handlers.

```typescript
// Per-turn status damage
applyStatusDamage(status: string, maxHP: number): number
  burn → floor(maxHP / 16)
  poison → floor(maxHP / 8)
  others → 0

// Check if status prevents action this turn
checkStatusSkip(status: string, rng: number): boolean
  paralysis → rng < 0.15 (15% skip)
  freeze → always skip (but auto-thaw after 1 turn)
  sleep → skip (but wake after 2 turns, or on damage)
  confusion → rng < 0.25 (25% self-hit)

// Advance status duration, return if cured
tickStatus(status: string, turnsActive: number): { cured: boolean }
  freeze → cured after 1 turn
  sleep → cured after 2 turns
  confusion → cured after 3 turns
  burn/paralysis/poison → never auto-cure
```

### Task 3.5: Ability Effects

**Create:** `src/lib/combat/ability-effects.ts` + `ability-effects.test.ts`

Implement the 36 ability trigger handlers. Each ability has a trigger point from the list:
`stab_calc`, `damage_calc`, `damage_taken`, `after_hit`, `before_hit`, `end_turn`, `battle_start`, `speed_calc`, `accuracy_calc`, `before_faint`, `after_hit_received`, `status_damage`

Read ClawCombat `battle-engine.js` lines 162-800 for the full ability implementations. Key structure:

```typescript
interface AbilityEffect {
  damageMultiplier?: number;
  healAmount?: number;
  statusToApply?: string;
  statusChance?: number;
  opponentStatChange?: { stat: string; stages: number };
  selfStatChange?: { stat: string; stages: number };
  immuneTo?: string;        // immune to a type or status damage
  dodgeChance?: number;
  surviveWith1HP?: boolean;
  speedMultiplier?: number;
  accuracyMultiplier?: number;
}

export function getAbilityEffect(
  abilityName: string,
  trigger: string,
  context: AbilityContext
): AbilityEffect | null
```

The 36 abilities and their triggers are already defined in `src/lib/combat/data/abilities.ts`. This file implements what they DO when triggered.

Key abilities to get right:
- **Blaze/Torrent/Overgrow/Swarm** → +30% same-type damage when HP < 33%
- **Guts** → +30% attack when statused (replaces burn penalty)
- **Sturdy** → survive any hit at 1 HP (once per battle, track with `sturdyUsed`)
- **Intimidate/Charm** → opponent -15% attack at battle start
- **Volt Absorb** → immune to electric, heal 25% HP
- **Levitate** → immune to EARTH moves
- **Adaptability** → STAB 2.0x instead of 1.5x
- **Gale Wings** → always go first when HP is full

### Task 3.6: Turn Resolution Engine

**Create:** `src/lib/combat/turn-resolver.ts` + `turn-resolver.test.ts`

The big one. Port from ClawCombat `battle-engine.js` `resolveTurn()`. This is ~1100 lines in the source — the TypeScript version should be cleaner.

Turn flow:
1. Check status skips (paralysis/freeze/sleep/confusion) for both fighters
2. Determine move order: compare effective speed (with stat stages), handle priority moves, handle Gale Wings
3. First mover executes:
   a. Accuracy check (move accuracy × accuracyMultiplier from abilities)
   b. Determine attack/defense stats based on move category (physical → atk/def, special → spa/spd)
   c. Calculate type effectiveness via `getEffectiveness(moveType, defenderType)`
   d. Calculate damage via `calculateDamage()`
   e. Apply ability triggers: `stab_calc`, `damage_calc`, `damage_taken`, `before_faint`
   f. Apply move effects (status, stat changes, heal, recoil, flinch, drain, leech seed, curse)
   g. Apply ability triggers: `after_hit`, `after_hit_received`
   h. Check if defender faints (HP ≤ 0)
4. Second mover executes (if not fainted)
5. End-of-turn effects:
   a. Status damage (burn/poison) via `applyStatusDamage()`
   b. Leech seed drain
   c. Ability `end_turn` triggers (Hydration, Photosynthesis, Ice Body)
   d. Status duration tick via `tickStatus()`
6. Build TurnResult matching the JSON schema from the design doc
7. Check faint → set battle.status = 'finished', battle.winnerId
8. Increment turnNumber

```typescript
export interface TurnResult {
  turn: number;
  fighter_a: {
    move: string;
    damage_dealt: number;
    critical: boolean;
    effectiveness: 'super_effective' | 'not_very_effective' | 'neutral' | 'immune';
    status_applied: string | null;
    hp_before: number;
    hp_after: number;
    heal_amount?: number;
  };
  fighter_b: { /* same shape */ };
  order: 'a_first' | 'b_first';
  end_of_turn: {
    fighter_a_hp: number;
    fighter_b_hp: number;
    fighter_a_status: string | null;
    fighter_b_status: string | null;
    fighter_a_stat_stages: Record<string, number>;
    fighter_b_stat_stages: Record<string, number>;
    ability_triggered: string | null;
  };
}

export function resolveTurn(
  battle: BattleState,
  moveA: string,
  moveB: string,
  rng?: () => number  // optional deterministic RNG for testing
): TurnResult
```

IMPORTANT: `resolveTurn` MUTATES `battle` state (currentHP, status, statStages, etc.) and also pushes the TurnResult to `battle.turns`.

### Task 3.7: AI Strategist

**Create:** `src/lib/combat/ai-strategist.ts` + `ai-strategist.test.ts`

Port from `/Users/abit_hex/ClawCombat/apps/backend/src/services/ai-strategist.js`.

Scoring system (0-100 scale):
```
BASE_SCORE:            50
SUPER_EFFECTIVE:       +30
NOT_VERY_EFFECTIVE:    -20
IMMUNE:                -40
KILL_SHOT:             +25 (can KO opponent in 1 hit)
SIGNIFICANT_DAMAGE:    +10 (deals ≥50% maxHP)
LOW_HP_AGGRESSION:     +10 (self HP < 25%, pick aggressive move)
STATUS_VALUE:          +15 (inflict status if enemy has none)
HEALING_VALUE:         +20 (heal if self HP < 40%)
ACCURACY_PENALTY:      -(100 - accuracy) / 5
```

```typescript
export function chooseMove(attacker: FighterState, defender: FighterState): string
export function rankMoves(attacker: FighterState, defender: FighterState): Array<{ moveId: string; name: string; score: number }>
```

`chooseMove` picks the highest-scoring move (with 20% chance of picking 2nd-best for unpredictability).

### Task 3.8: Battle Runner

**Create:** `src/lib/combat/battle-runner.ts` + `battle-runner.test.ts`

Orchestrates a full battle: init states → loop turns until faint or max 50 turns.

```typescript
export function runAutoBattle(fighterAData, fighterBData): BattleResult {
  const a = initFighterState(fighterAData);
  const b = initFighterState(fighterBData);
  const battle = initBattleState(a, b);

  while (battle.status === 'active' && battle.turnNumber < battle.maxTurns) {
    const moveA = chooseMove(battle.fighterA, battle.fighterB);
    const moveB = chooseMove(battle.fighterB, battle.fighterA);
    resolveTurn(battle, moveA, moveB);
  }

  // Max turns tiebreak: lower HP% loses
  if (battle.status === 'active') {
    const pctA = battle.fighterA.currentHP / battle.fighterA.maxHP;
    const pctB = battle.fighterB.currentHP / battle.fighterB.maxHP;
    battle.winnerId = pctA > pctB ? a.nftId : pctB > pctA ? b.nftId : null;
    battle.status = 'finished';
  }

  return { status: battle.status, winnerId: battle.winnerId, turns: battle.turns, totalTurns: battle.turnNumber };
}
```

Test: run a FIRE vs WATER auto-battle, verify it completes < 50 turns, has a winner.

### Task 3.9: XP + ELO Calculator

**Create:** `src/lib/combat/xp-elo-calculator.ts` + `xp-elo-calculator.test.ts`

**XP award formulas:**
```
base_xp = 50
Winner: base_xp × (1 + opponent_level / own_level × 0.5) × (1 + abs(elo_diff) / 400 × 0.25)
Loser:  base_xp × 0.3
Draw:   base_xp × 0.5
```

**ELO formula (standard K=32):**
```
expected = 1 / (1 + 10^((opponent_elo - own_elo) / 400))
change = round(32 × (result - expected))
// result: 1.0 = win, 0.5 = draw, 0.0 = loss
```

**Level from XP (use formula, NOT table lookup since table has gaps):**
```
For level L: xp_required = floor(L^2.5 × 10)
calculateLevelFromXP(totalXP): find highest L where floor(L^2.5 × 10) ≤ totalXP
```

Export: `calculateXPAward(result, ownLevel, oppLevel, ownElo, oppElo)`, `calculateELOChange(ownElo, oppElo, result)`, `calculateLevelFromXP(totalXP)`

### Task 3.10: Update barrel exports + run all tests

Add to `src/lib/combat/index.ts`:
```typescript
export { calculateHP, calculateStat, calculateAllStats } from './stat-calculator';
export { calculateDamage, getStatStageMultiplier } from './damage-calculator';
export { applyStatusDamage, checkStatusSkip, tickStatus } from './status-effects';
export { getAbilityEffect } from './ability-effects';
export { resolveTurn } from './turn-resolver';
export { runAutoBattle } from './battle-runner';
export { chooseMove, rankMoves } from './ai-strategist';
export { calculateXPAward, calculateELOChange, calculateLevelFromXP } from './xp-elo-calculator';
```

Run: `npx vitest run src/lib/combat/`
Expected: ALL PASS

---

## Phase 4: API Endpoints

All files go in `functions/api/combat/`. Follow existing patterns from `functions/api/game/` for auth, error handling, and response formatting.

Read `functions/api/game/battle-queue.ts` for the existing pattern: auth check, D1 queries, JSON responses.

### Task 4.1: Shared Constants + Helpers

**Create:** `functions/api/combat/_shared.ts`

```typescript
import { calculateAllStats } from '../../src/lib/combat';

export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://wojak.ink' },
  });
}

export function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

export function buildFighterResponse(row: any) {
  const stats = calculateAllStats(row.combat_type, row.level, row.nature);
  return {
    nft_id: row.nft_id,
    edition: row.edition_number,
    type: row.combat_type,
    nature: row.nature,
    ability: row.ability,
    moves: [row.move_1, row.move_2, row.move_3, row.move_4],
    level: row.level,
    xp: row.xp,
    elo: row.elo_rating,
    stats,
    record: { wins: row.total_combat_wins, losses: row.total_combat_losses, draws: row.total_combat_draws },
  };
}
```

### Task 4.2: GET /api/combat/fighter

**Create:** `functions/api/combat/fighter.ts`

Query: `SELECT * FROM combat_fighters WHERE nft_id = ?`
Returns: `buildFighterResponse(row)` or 404

### Task 4.3: POST /api/combat/queue + DELETE + GET status

**Create:** `functions/api/combat/queue.ts`

POST — join queue:
1. Validate body: nftId, ownerDid, battleMode ('manual' | 'auto')
2. Verify fighter exists in combat_fighters
3. Verify not already in queue
4. Verify not in active battle
5. INSERT into combat_queue (nftId, ownerDid, battleMode, elo_rating snapshot)
6. Attempt immediate matchmaking:
   - Query combat_queue for opponent within ELO ±100, excluding same owner
   - If found: DELETE both from queue, INSERT into combat_battles, return match
   - If not: return { status: 'queued', position: N }

DELETE — leave queue:
1. DELETE FROM combat_queue WHERE nft_id = ? AND owner_did = ?

GET — check status:
1. SELECT from combat_queue WHERE nft_id = ?
2. Return position and queue time

Enforce cooldown: same two NFTs cannot battle within 1 hour.
Same-owner block: cannot queue against own NFT.

### Task 4.4: POST /api/combat/submit-move

**Create:** `functions/api/combat/submit-move.ts`

Body: `{ battleId, nftId, moveId }`

1. Verify battle exists and status = 'active' or 'waiting_moves'
2. Verify nftId is fighter_a or fighter_b
3. Verify moveId is in fighter's moveset (query combat_fighters)
4. Store in combat_turns for current turn
5. If both moves submitted OR 30s timeout → resolve turn:
   - Load full battle state from DB
   - Call `resolveTurn()` from engine
   - Store TurnResult in combat_turns.turn_result
   - Update combat_battles (current_turn, status, winner)
   - If battle over: calculate XP/ELO via `calculateXPAward()` + `calculateELOChange()`
   - Update combat_fighters (xp, elo_rating, level, win/loss/draw counts)
6. Return current battle state

### Task 4.5: GET /api/combat/battle/:id

**Create:** `functions/api/combat/battle.ts`

Return full battle state: fighters, turn log, current turn, status, winner.

### Task 4.6: POST /api/combat/resolve-turn (internal)

**Create:** `functions/api/combat/resolve-turn.ts`

For auto-battles and timeout handling. Called server-side.
1. Load battle + fighter states from DB
2. For auto mode: use `chooseMove()` from AI strategist
3. For timeout: use `chooseMove()` for the missing move
4. Call `resolveTurn()`, store result, update DB
5. If battle over: finalize XP/ELO

### Task 4.7: GET /api/combat/leaderboard

**Create:** `functions/api/combat/leaderboard.ts`

`?sortBy=elo|level|wins&limit=50`
Query: `SELECT * FROM combat_fighters ORDER BY {column} DESC LIMIT ?`
Return: `fighters.map(buildFighterResponse)`

### Task 4.8: GET /api/combat/history

**Create:** `functions/api/combat/history.ts`

`?nftId=xxx&limit=20`
Query: `SELECT * FROM combat_battles WHERE (fighter_a_nft = ? OR fighter_b_nft = ?) AND status = 'completed' ORDER BY ended_at DESC LIMIT ?`

### Task 4.9: POST /api/combat/calculate-identity

**Create:** `functions/api/combat/calculate-identity.ts`

Preview endpoint for generator UI. Body: traits + colors + details.
Returns: identity + available moves for calculated type.
NO auth required (used before mint).

### Task 4.10: GET /api/combat/type-chart

**Create:** `functions/api/combat/type-chart.ts`

Static data. Cache 24h. Returns the full TYPE_CHART object.

---

## Phase 5: Frontend

**CSS Rules reminder:** All visual styles go in `src/styles/theme.css`. Use `.card`, `.btn`, `.badge` classes. Tailwind for layout ONLY.

### Task 5.1: Combat Theme Styles

**Modify:** `src/styles/theme.css` — add at the bottom:
- Type badge colors (`.badge-fire`, `.badge-water`, etc. — 18 types)
- HP bar (`.hp-bar`, `.hp-bar-fill`, `.hp-high`, `.hp-mid`, `.hp-low`)
- Move button (`.move-btn`, `.move-btn:hover`, `.move-btn.selected`)
- Turn log entry (`.turn-entry`)
- Combat preview badge (`.combat-preview-badge`)

### Task 5.2: CombatPreview Component (Generator)

**Create:** `src/components/generator/CombatPreview.tsx`

Shows live type/nature/ability as user selects traits+colors. Uses `calculateCombatIdentity()` in a `useMemo`.

Display: `⚡ ELECTRIC | 🔮 Runner-up: PSYCHE`

### Task 5.3: MoveSelection Component (Generator)

**Create:** `src/components/generator/MoveSelection.tsx`

Grid of 8-12 moves for the calculated type. User picks 4. Shows: name, power, category, accuracy, description. Enforces at least 1 damaging move.

### Task 5.4: Integrate into Generator Flow

**Modify:** `src/contexts/GeneratorContext.tsx` — add `combatMoves` and `combatIdentity` to state
**Modify:** Generator page — add CombatPreview during trait selection, MoveSelection step before mint confirm, pass combatMoves to mint submit body

### Task 5.5: Combat Page + Queue Panel

**Create:** `src/pages/CombatPage.tsx` — the /games/combat route
**Create:** `src/components/combat/QueuePanel.tsx` — select NFT, toggle manual/auto, enter queue

### Task 5.6: Battle View Components

**Create:** `src/components/combat/BattleView.tsx` — split screen: your Wojak vs opponent
**Create:** `src/components/combat/HPBar.tsx` — animated HP bar with color thresholds
**Create:** `src/components/combat/TurnLog.tsx` — scrollable turn-by-turn results
**Create:** `src/components/combat/MoveButtons.tsx` — 4 move buttons + 30s timer

### Task 5.7: Battle History + Replay

**Create:** `src/components/combat/BattleHistory.tsx` — list of past battles with W/L/D, ELO changes
**Create:** `src/components/combat/BattleReplay.tsx` — step through turns with Next/Prev

### Task 5.8: Fighter Card

**Create:** `src/components/combat/FighterCard.tsx` — shows on NFT cards throughout app:
```
[NFT Image]
Your Wojak #42
⚡ ELECTRIC | Lv. 15 | ELO 1247
Ability: Static
Moves: Volt Cannon, Spark, Shock Wave, Store Energy
W: 12 / L: 5 / D: 2
```

### Task 5.9: Combat Leaderboard

**Create:** `src/components/combat/CombatLeaderboard.tsx` — table of top fighters by ELO
Add as tab on existing `/leaderboard` page.

### Task 5.10: Pre-Combat NFT Messaging

When showing an NFT without a combat_fighters row, display:
"This Wojak was minted before the combat era. Burn it to earn credits toward a new combat-ready Wojak!"

### Task 5.11: Routing + Navigation

Add `/games/combat` route. Add "Combat Arena" link in games navigation.

### Task 5.12: E2E Smoke Test

**Create:** `tests/combat.spec.ts`
- Combat page loads
- Generator shows combat preview after trait selection
- Move selection appears before mint confirm

---

## Execution Rules

1. **TDD:** Write test first → verify fail → implement → verify pass → commit
2. **Run `npx vitest run src/lib/combat/` after every Phase 3 task** to catch regressions
3. **Commit after every task** with descriptive messages
4. **Read ClawCombat source** before porting each module — the exact JS functions you're porting
5. **Don't change balance constants** — they're tuned. Port the numbers exactly.
6. **CSS goes in theme.css only** — no inline styles, no new CSS files, no !important
7. **Do NOT push to remote** — just commit locally
8. **Phase order: 3 → 4 → 5** — engine first, then API, then UI
