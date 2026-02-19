# Combat System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Port the ClawCombat battle engine into Wojak.ink, adding combat identity (type/nature/ability/moves) at mint time and enabling turn-based battles.

**Architecture:** Combat identity is calculated from NFT traits + colors + details using a point system, baked into CHIP-0007 metadata at mint. Battle engine runs as pure TypeScript logic invoked by Cloudflare Pages Functions, with state in D1. Coexists with the existing community vote battle system.

**Tech Stack:** TypeScript, Vitest (unit tests), Playwright (e2e), Cloudflare Pages Functions + D1, React + Vite frontend

**Design Doc:** `docs/plans/2025-02-18-combat-system-design.md` — the master spec. Read it before starting.

**Reference Data CSVs (in `docs/`):**
- `TRAIT-COMBAT-MAPPING.csv` — 129 traits → type points + nature stat
- `COLOR-HUE-TYPE-MAPPING.csv` — HSL hue → type points
- `COLOR-NATURE-STAT-MAPPING.csv` — HSL hue → nature stat points
- `DETAIL-OPTIONS-COMBAT-MAPPING.csv` — 37 detail options → bonuses
- `BASE-STATS-PER-TYPE.csv` — 18 type stat spreads (BST 485)

**ClawCombat Source (for porting):**
- `/Users/abit_hex/ClawCombat/apps/backend/src/services/battle-engine.js`
- `/Users/abit_hex/ClawCombat/apps/backend/src/services/ai-strategist.js`
- `/Users/abit_hex/ClawCombat/apps/backend/src/data/moves.js`
- `/Users/abit_hex/ClawCombat/apps/backend/src/data/pokeapi-type-chart.json`
- `/Users/abit_hex/ClawCombat/apps/backend/src/data/pokeapi-natures.json`

**Test Commands:**
- Unit: `npx vitest run` or `npx vitest run src/lib/combat/`
- E2E: `npx playwright test`
- Single file: `npx vitest run src/lib/combat/identity-calculator.test.ts`

**Vitest Config:** `vitest.config.ts` — includes `src/**/*.test.ts` and `functions/**/*.test.ts`, uses `@` alias for `src/`

---

## Phase 1: Combat Data Layer (Static Data + Identity Calculator)

No UI changes yet. Pure TypeScript data modules + the identity calculator with full test coverage.

---

### Task 1.1: Type Definitions

**Files:**
- Create: `src/lib/combat/types.ts`

**Step 1: Create the combat type definitions file**

```typescript
// src/lib/combat/types.ts

/** The 18 combat types */
export const COMBAT_TYPES = [
  'NEUTRAL', 'FIRE', 'WATER', 'ELECTRIC', 'GRASS', 'ICE',
  'MARTIAL', 'VENOM', 'EARTH', 'AIR', 'PSYCHE', 'INSECT',
  'STONE', 'GHOST', 'DRAGON', 'SHADOW', 'METAL', 'MYSTIC',
] as const;
export type CombatType = typeof COMBAT_TYPES[number];

/** The 5 stat dimensions */
export const STAT_NAMES = ['attack', 'defense', 'sp_atk', 'sp_def', 'speed'] as const;
export type StatName = typeof STAT_NAMES[number];

/** Base stat spread for a type */
export interface BaseStats {
  hp: number;
  attack: number;
  defense: number;
  sp_atk: number;
  sp_def: number;
  speed: number;
}

/** A nature modifies one stat +10%, one stat -10% */
export interface Nature {
  name: string;
  boost: StatName | null;
  reduce: StatName | null;
}

/** Move category */
export type MoveCategory = 'physical' | 'special' | 'status';

/** A combat move */
export interface CombatMove {
  id: string;
  name: string;
  type: CombatType;
  power: number;
  accuracy: number;
  pp: number;
  category: MoveCategory;
  description: string;
  effects?: MoveEffect[];
}

/** Move effect (status, stat change, heal, etc.) */
export interface MoveEffect {
  type: string;
  chance?: number;
  status?: string;
  stat?: string;
  stages?: number;
  target?: 'self' | 'opponent';
  percent?: number;
}

/** An ability (2 per type: offensive A, defensive B) */
export interface Ability {
  name: string;
  type: CombatType;
  variant: 'A' | 'B';
  description: string;
  trigger: string;
}

/** Point contribution from a single source (trait, color, or detail) */
export interface TypePoints {
  primary: CombatType;
  primaryPts: number;
  secondary?: CombatType;
  secondaryPts?: number;
}

export interface NatureStatPoints {
  primary: StatName;
  primaryPts: number;
  secondary?: StatName;
  secondaryPts?: number;
}

/** Trait combat mapping entry */
export interface TraitCombatEntry {
  traitId: string;        // manifest ID e.g. "Clothes_fire-figther"
  layer: string;          // e.g. "Clothes"
  name: string;           // display name e.g. "Firefighter Uniform"
  colorable: boolean;
  typePoints: TypePoints;
  natureStat: StatName | null;
  natureStatPts: number;
}

/** Detail option combat mapping entry */
export interface DetailCombatEntry {
  parentTrait: string;
  detailOption: string;
  typeBonus: { type: CombatType; pts: number } | null;
  natureBonus: { stat: StatName; pts: number } | null;
}

/** Color-to-type mapping entry (HSL range) */
export interface ColorTypeRule {
  name: string;
  hueMin?: number;
  hueMax?: number;
  satMin?: number;
  satMax?: number;
  lightMin?: number;
  lightMax?: number;
  primary: CombatType;
  primaryPts: number;
  secondary?: CombatType;
  secondaryPts?: number;
  isAchromatic?: boolean;
  isWarmNeutral?: boolean;
  isNeon?: boolean;
}

/** Color-to-nature-stat mapping entry */
export interface ColorNatureRule {
  name: string;
  hueMin?: number;
  hueMax?: number;
  satMin?: number;
  satMax?: number;
  lightMin?: number;
  lightMax?: number;
  primary: StatName;
  primaryPts: number;
  secondary?: StatName;
  secondaryPts?: number;
  isAchromatic?: boolean;
  isWarmNeutral?: boolean;
  isNeon?: boolean;
}

/** Full combat identity (baked into NFT metadata) */
export interface CombatIdentity {
  type: CombatType;
  nature: string;         // nature name e.g. "Focused"
  ability: string;        // ability name e.g. "Magic Guard"
  typeScores: Record<CombatType, number>;
  statScores: Record<StatName, number>;
}

/** Fighter record (DB row) */
export interface CombatFighter {
  nft_id: string;
  edition_number: number;
  owner_did: string;
  combat_type: CombatType;
  nature: string;
  ability: string;
  move_1: string;
  move_2: string;
  move_3: string;
  move_4: string;
  level: number;
  xp: number;
  elo_rating: number;
  total_combat_wins: number;
  total_combat_losses: number;
  total_combat_draws: number;
}
```

**Step 2: Commit**

```bash
git add src/lib/combat/types.ts
git commit -m "feat(combat): add core type definitions for combat system"
```

---

### Task 1.2: Type Chart Data

**Files:**
- Create: `src/lib/combat/data/type-chart.ts`
- Test: `src/lib/combat/data/type-chart.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/combat/data/type-chart.test.ts
import { describe, it, expect } from 'vitest';
import { getEffectiveness, TYPE_CHART, COMBAT_TYPES } from './type-chart';

describe('type-chart', () => {
  it('returns 2 for FIRE attacking GRASS (super effective)', () => {
    expect(getEffectiveness('FIRE', 'GRASS')).toBe(2);
  });

  it('returns 0.5 for FIRE attacking WATER (not very effective)', () => {
    expect(getEffectiveness('FIRE', 'WATER')).toBe(0.5);
  });

  it('returns 0 for NEUTRAL attacking GHOST (immune)', () => {
    expect(getEffectiveness('NEUTRAL', 'GHOST')).toBe(0);
  });

  it('returns 1 for NEUTRAL attacking NEUTRAL (neutral)', () => {
    expect(getEffectiveness('NEUTRAL', 'NEUTRAL')).toBe(1);
  });

  it('has entries for all 18 types as attacker', () => {
    expect(Object.keys(TYPE_CHART)).toHaveLength(18);
  });

  it('has entries for all 18 types as defender for each attacker', () => {
    for (const atk of COMBAT_TYPES) {
      expect(Object.keys(TYPE_CHART[atk])).toHaveLength(18);
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/combat/data/type-chart.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Port the 18x18 matrix from `/Users/abit_hex/ClawCombat/apps/backend/src/data/pokeapi-type-chart.json`. The file exports:
- `TYPE_CHART: Record<CombatType, Record<CombatType, number>>` — the full matrix
- `COMBAT_TYPES` — re-exported from `../types.ts`
- `getEffectiveness(attacker: CombatType, defender: CombatType): number`

```typescript
// src/lib/combat/data/type-chart.ts
import { COMBAT_TYPES, type CombatType } from '../types';
export { COMBAT_TYPES };

// Full 18x18 effectiveness matrix. Ported from ClawCombat pokeapi-type-chart.json.
// Values: 2 = super effective, 1 = neutral, 0.5 = resists, 0.25 = heavily resists, 0 = immune
export const TYPE_CHART: Record<CombatType, Record<CombatType, number>> = {
  // ... port the full JSON object, converting keys to our type names
  // Read ClawCombat/apps/backend/src/data/pokeapi-type-chart.json for exact values
};

export function getEffectiveness(attacker: CombatType, defender: CombatType): number {
  return TYPE_CHART[attacker]?.[defender] ?? 1;
}
```

NOTE: The exact values must be copied from the ClawCombat JSON. Read `/Users/abit_hex/ClawCombat/apps/backend/src/data/pokeapi-type-chart.json` and convert to TypeScript.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/combat/data/type-chart.test.ts`
Expected: PASS (6 tests)

**Step 5: Commit**

```bash
git add src/lib/combat/data/type-chart.ts src/lib/combat/data/type-chart.test.ts
git commit -m "feat(combat): add 18x18 type effectiveness chart with tests"
```

---

### Task 1.3: Natures Data

**Files:**
- Create: `src/lib/combat/data/natures.ts`
- Test: `src/lib/combat/data/natures.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/combat/data/natures.test.ts
import { describe, it, expect } from 'vitest';
import { NATURES, getNature, getNatureByStats } from './natures';

describe('natures', () => {
  it('has exactly 25 natures', () => {
    expect(NATURES).toHaveLength(25);
  });

  it('Savage boosts attack, reduces sp_def', () => {
    const savage = getNature('Savage');
    expect(savage).toBeDefined();
    expect(savage!.boost).toBe('attack');
    expect(savage!.reduce).toBe('sp_def');
  });

  it('Balanced has null boost and null reduce', () => {
    const balanced = getNature('Balanced');
    expect(balanced).toBeDefined();
    expect(balanced!.boost).toBeNull();
    expect(balanced!.reduce).toBeNull();
  });

  it('getNatureByStats returns correct nature for attack+/sp_def-', () => {
    const nature = getNatureByStats('attack', 'sp_def');
    expect(nature.name).toBe('Savage');
  });

  it('getNatureByStats returns Balanced when both null', () => {
    const nature = getNatureByStats(null, null);
    expect(nature.name).toBe('Balanced');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/combat/data/natures.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

Port from `/Users/abit_hex/ClawCombat/apps/backend/src/data/pokeapi-natures.json`. Export:
- `NATURES: Nature[]` — all 25
- `getNature(name: string): Nature | undefined`
- `getNatureByStats(boost: StatName | null, reduce: StatName | null): Nature`

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/combat/data/natures.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/combat/data/natures.ts src/lib/combat/data/natures.test.ts
git commit -m "feat(combat): add 25 natures data with lookup functions"
```

---

### Task 1.4: Base Stats Data

**Files:**
- Create: `src/lib/combat/data/base-stats.ts`
- Test: `src/lib/combat/data/base-stats.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/combat/data/base-stats.test.ts
import { describe, it, expect } from 'vitest';
import { BASE_STATS, getBaseStats } from './base-stats';
import { COMBAT_TYPES } from '../types';

describe('base-stats', () => {
  it('has stats for all 18 types', () => {
    for (const type of COMBAT_TYPES) {
      expect(BASE_STATS[type]).toBeDefined();
    }
  });

  it('every type has BST of 485', () => {
    for (const type of COMBAT_TYPES) {
      const s = BASE_STATS[type];
      const bst = s.hp + s.attack + s.defense + s.sp_atk + s.sp_def + s.speed;
      expect(bst).toBe(485);
    }
  });

  it('MARTIAL has 110 attack (physical sweeper)', () => {
    expect(BASE_STATS['MARTIAL'].attack).toBe(110);
  });

  it('ELECTRIC has 120 speed (speed demon)', () => {
    expect(BASE_STATS['ELECTRIC'].speed).toBe(120);
  });

  it('getBaseStats returns correct stats', () => {
    const stats = getBaseStats('NEUTRAL');
    expect(stats.hp).toBe(85);
    expect(stats.attack).toBe(80);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/combat/data/base-stats.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

Transcribe from `docs/BASE-STATS-PER-TYPE.csv`:

```typescript
// src/lib/combat/data/base-stats.ts
import type { CombatType, BaseStats } from '../types';

export const BASE_STATS: Record<CombatType, BaseStats> = {
  NEUTRAL:  { hp: 85, attack: 80,  defense: 80,  sp_atk: 80,  sp_def: 80,  speed: 80  },
  FIRE:     { hp: 75, attack: 90,  defense: 65,  sp_atk: 100, sp_def: 70,  speed: 85  },
  WATER:    { hp: 85, attack: 75,  defense: 85,  sp_atk: 85,  sp_def: 90,  speed: 65  },
  ELECTRIC: { hp: 65, attack: 70,  defense: 60,  sp_atk: 105, sp_def: 65,  speed: 120 },
  GRASS:    { hp: 85, attack: 80,  defense: 85,  sp_atk: 85,  sp_def: 90,  speed: 60  },
  ICE:      { hp: 75, attack: 85,  defense: 70,  sp_atk: 100, sp_def: 75,  speed: 80  },
  MARTIAL:  { hp: 80, attack: 110, defense: 75,  sp_atk: 50,  sp_def: 70,  speed: 100 },
  VENOM:    { hp: 75, attack: 85,  defense: 70,  sp_atk: 95,  sp_def: 80,  speed: 80  },
  EARTH:    { hp: 90, attack: 95,  defense: 100, sp_atk: 55,  sp_def: 70,  speed: 75  },
  AIR:      { hp: 75, attack: 80,  defense: 65,  sp_atk: 80,  sp_def: 65,  speed: 120 },
  PSYCHE:   { hp: 70, attack: 55,  defense: 65,  sp_atk: 115, sp_def: 85,  speed: 95  },
  INSECT:   { hp: 75, attack: 95,  defense: 80,  sp_atk: 70,  sp_def: 75,  speed: 90  },
  STONE:    { hp: 80, attack: 100, defense: 120, sp_atk: 50,  sp_def: 60,  speed: 75  },
  GHOST:    { hp: 70, attack: 80,  defense: 60,  sp_atk: 100, sp_def: 80,  speed: 95  },
  DRAGON:   { hp: 85, attack: 100, defense: 80,  sp_atk: 100, sp_def: 80,  speed: 85  },
  SHADOW:   { hp: 75, attack: 95,  defense: 65,  sp_atk: 90,  sp_def: 70,  speed: 90  },
  METAL:    { hp: 75, attack: 80,  defense: 120, sp_atk: 65,  sp_def: 85,  speed: 60  },
  MYSTIC:   { hp: 80, attack: 60,  defense: 70,  sp_atk: 100, sp_def: 110, speed: 65  },
};

export function getBaseStats(type: CombatType): BaseStats {
  return BASE_STATS[type];
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/combat/data/base-stats.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/combat/data/base-stats.ts src/lib/combat/data/base-stats.test.ts
git commit -m "feat(combat): add base stat spreads for all 18 types (BST 485)"
```

---

### Task 1.5: Abilities Data

**Files:**
- Create: `src/lib/combat/data/abilities.ts`
- Test: `src/lib/combat/data/abilities.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/combat/data/abilities.test.ts
import { describe, it, expect } from 'vitest';
import { ABILITIES, getAbilitiesForType, getAbility } from './abilities';
import { COMBAT_TYPES } from '../types';

describe('abilities', () => {
  it('has exactly 36 abilities (2 per 18 types)', () => {
    expect(ABILITIES).toHaveLength(36);
  });

  it('every type has exactly 2 abilities (A and B)', () => {
    for (const type of COMBAT_TYPES) {
      const pair = getAbilitiesForType(type);
      expect(pair).toHaveLength(2);
      expect(pair[0].variant).toBe('A');
      expect(pair[1].variant).toBe('B');
    }
  });

  it('FIRE ability A is Blaze', () => {
    const [a] = getAbilitiesForType('FIRE');
    expect(a.name).toBe('Blaze');
  });

  it('getAbility looks up by name', () => {
    const ability = getAbility('Magic Guard');
    expect(ability).toBeDefined();
    expect(ability!.type).toBe('PSYCHE');
    expect(ability!.variant).toBe('A');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/combat/data/abilities.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

Transcribe from design doc Section 2 ("The 36 Abilities") and ClawCombat battle-engine.js ability definitions. Export:
- `ABILITIES: Ability[]` — all 36
- `getAbilitiesForType(type: CombatType): [Ability, Ability]`
- `getAbility(name: string): Ability | undefined`

**Step 4: Run tests, verify pass**

Run: `npx vitest run src/lib/combat/data/abilities.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/combat/data/abilities.ts src/lib/combat/data/abilities.test.ts
git commit -m "feat(combat): add 36 abilities (2 per type) with lookup functions"
```

---

### Task 1.6: Moves Data

**Files:**
- Create: `src/lib/combat/data/moves.ts`
- Test: `src/lib/combat/data/moves.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/combat/data/moves.test.ts
import { describe, it, expect } from 'vitest';
import { MOVES, getMovePoolForType, getMoveById, validateMoveSelection } from './moves';
import { COMBAT_TYPES } from '../types';

describe('moves', () => {
  it('has 191 total moves', () => {
    expect(MOVES).toHaveLength(191);
  });

  it('every type has 8-12 moves in its pool', () => {
    for (const type of COMBAT_TYPES) {
      const pool = getMovePoolForType(type);
      expect(pool.length).toBeGreaterThanOrEqual(8);
      expect(pool.length).toBeLessThanOrEqual(12);
    }
  });

  it('getMoveById returns correct move', () => {
    const move = getMoveById('fire_blast');
    expect(move).toBeDefined();
    expect(move!.type).toBe('FIRE');
  });

  it('validateMoveSelection accepts 4 valid unique moves from type pool', () => {
    const pool = getMovePoolForType('FIRE');
    const pick = pool.slice(0, 4).map(m => m.id);
    expect(validateMoveSelection(pick, 'FIRE').valid).toBe(true);
  });

  it('validateMoveSelection rejects wrong type moves', () => {
    const waterPool = getMovePoolForType('WATER');
    const pick = waterPool.slice(0, 4).map(m => m.id);
    expect(validateMoveSelection(pick, 'FIRE').valid).toBe(false);
  });

  it('validateMoveSelection rejects duplicates', () => {
    const pool = getMovePoolForType('FIRE');
    const pick = [pool[0].id, pool[0].id, pool[1].id, pool[2].id];
    expect(validateMoveSelection(pick, 'FIRE').valid).toBe(false);
  });

  it('validateMoveSelection requires at least 1 damaging move', () => {
    // If a type has 4+ status moves, picking all status should fail
    // This test verifies the constraint exists
    const pool = getMovePoolForType('PSYCHE');
    const statusMoves = pool.filter(m => m.power === 0);
    if (statusMoves.length >= 4) {
      const pick = statusMoves.slice(0, 4).map(m => m.id);
      expect(validateMoveSelection(pick, 'PSYCHE').valid).toBe(false);
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/combat/data/moves.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

Port from `/Users/abit_hex/ClawCombat/apps/backend/src/data/moves.js`. That file loads from `pokeapi-moves.json` — read that file too and inline the data. Export:
- `MOVES: CombatMove[]` — all 191
- `MOVES_BY_TYPE: Record<CombatType, CombatMove[]>`
- `getMovePoolForType(type: CombatType): CombatMove[]`
- `getMoveById(id: string): CombatMove | undefined`
- `validateMoveSelection(moveIds: string[], type: CombatType): { valid: boolean; error?: string }`

**Step 4: Run tests, verify pass**

Run: `npx vitest run src/lib/combat/data/moves.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/combat/data/moves.ts src/lib/combat/data/moves.test.ts
git commit -m "feat(combat): add 191 moves database with validation"
```

---

### Task 1.7: Trait-to-Combat Mapping Data

**Files:**
- Create: `src/lib/combat/data/trait-type-map.ts`
- Test: `src/lib/combat/data/trait-type-map.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/combat/data/trait-type-map.test.ts
import { describe, it, expect } from 'vitest';
import { TRAIT_COMBAT_MAP, getTraitCombat } from './trait-type-map';

describe('trait-type-map', () => {
  it('has 129 trait entries', () => {
    expect(Object.keys(TRAIT_COMBAT_MAP).length).toBe(129);
  });

  it('Firefighter Uniform gives FIRE 5pts primary', () => {
    const entry = getTraitCombat('Clothes_fire-figther');
    expect(entry).toBeDefined();
    expect(entry!.typePoints.primary).toBe('FIRE');
    expect(entry!.typePoints.primaryPts).toBe(5);
  });

  it('Wizard Drip gives PSYCHE 5pts, MYSTIC 2pts', () => {
    const entry = getTraitCombat('Clothes_Wizard-Drip');
    expect(entry).toBeDefined();
    expect(entry!.typePoints.primary).toBe('PSYCHE');
    expect(entry!.typePoints.primaryPts).toBe(5);
    expect(entry!.typePoints.secondary).toBe('MYSTIC');
    expect(entry!.typePoints.secondaryPts).toBe(2);
  });

  it('returns undefined for unknown trait', () => {
    expect(getTraitCombat('nonexistent')).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/combat/data/trait-type-map.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

Transcribe `docs/TRAIT-COMBAT-MAPPING.csv` into a TypeScript map keyed by **manifest trait IDs** (read IDs from `public/assets/wojak-layers/YourWojak-layers/manifest.json`). Export:
- `TRAIT_COMBAT_MAP: Record<string, TraitCombatEntry>`
- `getTraitCombat(traitId: string): TraitCombatEntry | undefined`

IMPORTANT: Keys must be manifest trait IDs (e.g., `Clothes_fire-figther`), NOT display names. Cross-reference the manifest to get exact IDs.

**Step 4: Run tests, verify pass**

Run: `npx vitest run src/lib/combat/data/trait-type-map.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/combat/data/trait-type-map.ts src/lib/combat/data/trait-type-map.test.ts
git commit -m "feat(combat): add trait-to-combat mapping (129 entries keyed by manifest ID)"
```

---

### Task 1.8: Color-to-Type and Color-to-Nature Mapping

**Files:**
- Create: `src/lib/combat/data/color-type-map.ts`
- Create: `src/lib/combat/data/color-nature-map.ts`
- Test: `src/lib/combat/data/color-maps.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/combat/data/color-maps.test.ts
import { describe, it, expect } from 'vitest';
import { getTypePointsForColor } from './color-type-map';
import { getNaturePointsForColor } from './color-nature-map';

describe('color-type-map', () => {
  it('pure red (#FF0000) maps to FIRE primary', () => {
    const pts = getTypePointsForColor('#FF0000');
    expect(pts.primary).toBe('FIRE');
    expect(pts.primaryPts).toBe(3);
  });

  it('green (#228B22) maps to GRASS primary', () => {
    const pts = getTypePointsForColor('#228B22');
    expect(pts.primary).toBe('GRASS');
  });

  it('black (#1A1A1A) maps to SHADOW primary', () => {
    const pts = getTypePointsForColor('#1A1A1A');
    expect(pts.primary).toBe('SHADOW');
  });

  it('white (#F0F8FF) maps to ICE primary', () => {
    const pts = getTypePointsForColor('#F0F8FF');
    expect(pts.primary).toBe('ICE');
  });

  it('neon green (high saturation) gets bonus point', () => {
    const pts = getTypePointsForColor('#00FF00'); // S=100%, pure green
    // Neon rule: S>90% adds +1 to hue's primary
    expect(pts.primaryPts).toBeGreaterThanOrEqual(4); // 3 base + 1 neon
  });
});

describe('color-nature-map', () => {
  it('red maps to Attack primary stat', () => {
    const pts = getNaturePointsForColor('#FF0000');
    expect(pts.primary).toBe('attack');
    expect(pts.primaryPts).toBe(2);
  });

  it('blue maps to Sp.Def primary stat', () => {
    const pts = getNaturePointsForColor('#2563EB');
    expect(pts.primary).toBe('sp_def');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/combat/data/color-maps.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

Both files need a `hexToHSL(hex: string): { h: number; s: number; l: number }` helper. Put it in a shared utility or duplicate it.

`color-type-map.ts` — transcribe `docs/COLOR-HUE-TYPE-MAPPING.csv`:
- Export `getTypePointsForColor(hex: string): TypePoints`

`color-nature-map.ts` — transcribe `docs/COLOR-NATURE-STAT-MAPPING.csv`:
- Export `getNaturePointsForColor(hex: string): NatureStatPoints`

Both use HSL analysis: convert hex → HSL, then check achromatic (S<10%), warm neutral (brown/gold), neon (S>90%), then hue ranges.

**Step 4: Run tests, verify pass**

Run: `npx vitest run src/lib/combat/data/color-maps.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/combat/data/color-type-map.ts src/lib/combat/data/color-nature-map.ts src/lib/combat/data/color-maps.test.ts
git commit -m "feat(combat): add color-to-type and color-to-nature HSL mapping"
```

---

### Task 1.9: Detail Options Mapping

**Files:**
- Create: `src/lib/combat/data/detail-combat-map.ts`
- Test: `src/lib/combat/data/detail-combat-map.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/combat/data/detail-combat-map.test.ts
import { describe, it, expect } from 'vitest';
import { DETAIL_COMBAT_MAP, getDetailBonus } from './detail-combat-map';

describe('detail-combat-map', () => {
  it('has 37 detail entries', () => {
    let count = 0;
    for (const entries of Object.values(DETAIL_COMBAT_MAP)) {
      count += Object.keys(entries).length;
    }
    expect(count).toBe(37);
  });

  it('Comrade Hat + Star gives FIRE +2, Attack +1', () => {
    const bonus = getDetailBonus('Head_Comrade-Hat', 'Star');
    expect(bonus).toBeDefined();
    expect(bonus!.typeBonus).toEqual({ type: 'FIRE', pts: 2 });
    expect(bonus!.natureBonus).toEqual({ stat: 'attack', pts: 1 });
  });

  it('Beer Hat + Red-bull gives AIR +1, Speed +1', () => {
    const bonus = getDetailBonus('Head_Beer-Hat', 'Red-bull');
    expect(bonus).toBeDefined();
    expect(bonus!.typeBonus).toEqual({ type: 'AIR', pts: 1 });
    expect(bonus!.natureBonus).toEqual({ stat: 'speed', pts: 1 });
  });

  it('returns undefined for unknown detail', () => {
    expect(getDetailBonus('Head_Beer-Hat', 'nonexistent')).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/combat/data/detail-combat-map.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

Transcribe `docs/DETAIL-OPTIONS-COMBAT-MAPPING.csv`. Key by manifest trait ID + detail option name. Export:
- `DETAIL_COMBAT_MAP: Record<string, Record<string, DetailCombatEntry>>`
- `getDetailBonus(traitId: string, detailOption: string): DetailCombatEntry | undefined`

NOTE: Verify trait IDs against manifest. The CSV uses display names (e.g., "Comrade Hat") — look up the manifest ID (e.g., `Head_Comrade-Hat`).

**Step 4: Run tests, verify pass**

Run: `npx vitest run src/lib/combat/data/detail-combat-map.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/combat/data/detail-combat-map.ts src/lib/combat/data/detail-combat-map.test.ts
git commit -m "feat(combat): add detail options combat mapping (37 entries)"
```

---

### Task 1.10: Identity Calculator

This is the core algorithm. Given traits + colors + details → CombatIdentity.

**Files:**
- Create: `src/lib/combat/identity-calculator.ts`
- Test: `src/lib/combat/identity-calculator.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/combat/identity-calculator.test.ts
import { describe, it, expect } from 'vitest';
import { calculateCombatIdentity } from './identity-calculator';
import type { CombatType } from './types';

// A full-wizard Wojak should be PSYCHE type
const wizardTraits = {
  traits: [
    { traitId: 'Background_Spell-Room', layer: 'Background' },
    { traitId: 'Base_Classic', layer: 'Base' },
    { traitId: 'Clothes_Wizard-Drip', layer: 'Clothes' },
    { traitId: 'Eyes_Wizard-Glasses', layer: 'Eyes' },
    { traitId: 'Head_Wiz-Hat', layer: 'Head' },
    { traitId: 'MouthBase_Pipe', layer: 'MouthBase' },
  ],
  colors: {
    'Clothes_Wizard-Drip': '#4B0082', // indigo — PSYCHE color
    'Head_Wiz-Hat': '#9400D3',        // purple
    'MouthBase_Pipe': '#4B0082',      // indigo
  },
  details: {
    'Clothes_Wizard-Drip': 'Detail 1', // PSYCHE +1, Sp.Atk +1
  },
};

const martialTraits = {
  traits: [
    { traitId: 'Background_Bepe-Barracks', layer: 'Background' },
    { traitId: 'Base_Rugged', layer: 'Base' },
    { traitId: 'Clothes_SWAT', layer: 'Clothes' },
    { traitId: 'Eyes_Tyson-Tattoo', layer: 'Eyes' },
    { traitId: 'Head_SWAT-Helmet', layer: 'Head' },
    { traitId: 'Mouth_Teeth', layer: 'Mouth' },
  ],
  colors: {
    'Clothes_SWAT': '#1A1A1A', // black
    'Head_SWAT-Helmet': '#1A1A1A',
  },
  details: {},
};

describe('identity-calculator', () => {
  it('wizard build produces PSYCHE type', () => {
    const identity = calculateCombatIdentity(wizardTraits);
    expect(identity.type).toBe('PSYCHE');
  });

  it('wizard build produces Sp.Atk-heavy nature', () => {
    const identity = calculateCombatIdentity(wizardTraits);
    // Sp.Atk should be highest stat score
    expect(identity.statScores.sp_atk).toBeGreaterThan(identity.statScores.attack);
  });

  it('martial build produces MARTIAL type', () => {
    const identity = calculateCombatIdentity(martialTraits);
    expect(identity.type).toBe('MARTIAL');
  });

  it('returns all 18 type scores', () => {
    const identity = calculateCombatIdentity(wizardTraits);
    expect(Object.keys(identity.typeScores)).toHaveLength(18);
  });

  it('returns all 5 stat scores', () => {
    const identity = calculateCombatIdentity(wizardTraits);
    expect(Object.keys(identity.statScores)).toHaveLength(5);
  });

  it('ability is one of the two for the determined type', () => {
    const identity = calculateCombatIdentity(wizardTraits);
    // PSYCHE abilities: Magic Guard (A) or Telepathy (B)
    expect(['Magic Guard', 'Telepathy']).toContain(identity.ability);
  });

  it('neutral build with no strong signals defaults to NEUTRAL', () => {
    const neutralTraits = {
      traits: [
        { traitId: 'Base_Classic', layer: 'Base' },
        { traitId: 'Clothes_Tee', layer: 'Clothes' },
      ],
      colors: {},
      details: {},
    };
    const identity = calculateCombatIdentity(neutralTraits);
    expect(identity.type).toBe('NEUTRAL');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/combat/identity-calculator.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

```typescript
// src/lib/combat/identity-calculator.ts
import type { CombatType, CombatIdentity, StatName } from './types';
import { COMBAT_TYPES, STAT_NAMES } from './types';
import { getTraitCombat } from './data/trait-type-map';
import { getTypePointsForColor } from './data/color-type-map';
import { getNaturePointsForColor } from './data/color-nature-map';
import { getDetailBonus } from './data/detail-combat-map';
import { getNatureByStats } from './data/natures';
import { getAbilitiesForType } from './data/abilities';

interface TraitInput {
  traitId: string;
  layer: string;
}

interface IdentityInput {
  traits: TraitInput[];
  colors: Record<string, string>;   // traitId → hex color
  details: Record<string, string>;  // traitId → detail option name
}

export function calculateCombatIdentity(input: IdentityInput): CombatIdentity {
  // Initialize score accumulators
  const typeScores: Record<CombatType, number> = {} as any;
  for (const t of COMBAT_TYPES) typeScores[t] = 0;
  const statScores: Record<StatName, number> = {} as any;
  for (const s of STAT_NAMES) statScores[s] = 0;

  // Source 1: Trait points
  for (const { traitId } of input.traits) {
    const entry = getTraitCombat(traitId);
    if (!entry) continue;
    typeScores[entry.typePoints.primary] += entry.typePoints.primaryPts;
    if (entry.typePoints.secondary && entry.typePoints.secondaryPts) {
      typeScores[entry.typePoints.secondary] += entry.typePoints.secondaryPts;
    }
    if (entry.natureStat && entry.natureStatPts) {
      statScores[entry.natureStat] += entry.natureStatPts;
    }
  }

  // Source 2: Color points
  for (const [_traitId, hex] of Object.entries(input.colors)) {
    const typePts = getTypePointsForColor(hex);
    typeScores[typePts.primary] += typePts.primaryPts;
    if (typePts.secondary && typePts.secondaryPts) {
      typeScores[typePts.secondary] += typePts.secondaryPts;
    }
    const naturePts = getNaturePointsForColor(hex);
    statScores[naturePts.primary] += naturePts.primaryPts;
    if (naturePts.secondary && naturePts.secondaryPts) {
      statScores[naturePts.secondary] += naturePts.secondaryPts;
    }
  }

  // Source 3: Detail points
  for (const [traitId, detailOption] of Object.entries(input.details)) {
    const bonus = getDetailBonus(traitId, detailOption);
    if (!bonus) continue;
    if (bonus.typeBonus) {
      typeScores[bonus.typeBonus.type] += bonus.typeBonus.pts;
    }
    if (bonus.natureBonus) {
      statScores[bonus.natureBonus.stat] += bonus.natureBonus.pts;
    }
  }

  // Resolve type: highest score wins
  let type: CombatType = 'NEUTRAL';
  let maxTypeScore = -1;
  for (const t of COMBAT_TYPES) {
    if (typeScores[t] > maxTypeScore) {
      maxTypeScore = typeScores[t];
      type = t;
    }
  }

  // Resolve nature: highest stat → boost, lowest (excluding highest) → reduce
  let highestStat: StatName | null = null;
  let lowestStat: StatName | null = null;
  let maxStatVal = -1;
  let minStatVal = Infinity;
  for (const s of STAT_NAMES) {
    if (statScores[s] > maxStatVal) { maxStatVal = statScores[s]; highestStat = s; }
  }
  for (const s of STAT_NAMES) {
    if (s !== highestStat && statScores[s] < minStatVal) {
      minStatVal = statScores[s]; lowestStat = s;
    }
  }
  // If all stats within 1 point of each other → Balanced
  const allClose = maxStatVal - minStatVal <= 1;
  const nature = allClose
    ? getNatureByStats(null, null)
    : getNatureByStats(highestStat, lowestStat);

  // Resolve ability: offensive sum vs defensive sum
  const offensiveSum = statScores.attack + statScores.sp_atk + statScores.speed;
  const defensiveSum = statScores.defense + statScores.sp_def;
  const [abilityA, abilityB] = getAbilitiesForType(type);
  const ability = offensiveSum > defensiveSum ? abilityA : abilityB;

  return {
    type,
    nature: nature.name,
    ability: ability.name,
    typeScores,
    statScores,
  };
}
```

**Step 4: Run tests, verify pass**

Run: `npx vitest run src/lib/combat/identity-calculator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/combat/identity-calculator.ts src/lib/combat/identity-calculator.test.ts
git commit -m "feat(combat): add identity calculator — traits+colors+details→type/nature/ability"
```

---

### Task 1.11: Data barrel export

**Files:**
- Create: `src/lib/combat/index.ts`

**Step 1: Create barrel export**

```typescript
// src/lib/combat/index.ts
export * from './types';
export { calculateCombatIdentity } from './identity-calculator';
export { getEffectiveness, TYPE_CHART } from './data/type-chart';
export { NATURES, getNature, getNatureByStats } from './data/natures';
export { BASE_STATS, getBaseStats } from './data/base-stats';
export { ABILITIES, getAbilitiesForType, getAbility } from './data/abilities';
export { MOVES, getMovePoolForType, getMoveById, validateMoveSelection } from './data/moves';
export { getTraitCombat } from './data/trait-type-map';
export { getTypePointsForColor } from './data/color-type-map';
export { getNaturePointsForColor } from './data/color-nature-map';
export { getDetailBonus } from './data/detail-combat-map';
```

**Step 2: Run all combat tests to verify nothing broke**

Run: `npx vitest run src/lib/combat/`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add src/lib/combat/index.ts
git commit -m "feat(combat): add barrel export for combat module"
```

---

**END OF PHASE 1** — At this point the entire combat data layer exists with full test coverage. No UI changes, no DB changes, no API changes yet.

---

## Phase 2: Database Migration + Mint Integration

Wire the identity calculator into the mint pipeline. After this phase, newly minted Wojaks have combat metadata baked into their CHIP-0007 JSON.

---

### Task 2.1: D1 Migration — Combat Tables

**Files:**
- Create: `functions/migrations/060_combat_system.sql`

**Step 1: Write the migration**

```sql
-- functions/migrations/060_combat_system.sql
-- Combat system tables for turn-based battles

-- Combat fighter records (one per NFT, created at mint)
CREATE TABLE IF NOT EXISTS combat_fighters (
  nft_id TEXT PRIMARY KEY,
  edition_number INTEGER NOT NULL UNIQUE,
  owner_did TEXT NOT NULL,
  combat_type TEXT NOT NULL,
  nature TEXT NOT NULL,
  ability TEXT NOT NULL,
  move_1 TEXT NOT NULL,
  move_2 TEXT NOT NULL,
  move_3 TEXT NOT NULL,
  move_4 TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  elo_rating INTEGER DEFAULT 1000,
  total_combat_wins INTEGER DEFAULT 0,
  total_combat_losses INTEGER DEFAULT 0,
  total_combat_draws INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_fighters_elo ON combat_fighters(elo_rating);
CREATE INDEX IF NOT EXISTS idx_fighters_owner ON combat_fighters(owner_did);
CREATE INDEX IF NOT EXISTS idx_fighters_type ON combat_fighters(combat_type);
CREATE INDEX IF NOT EXISTS idx_fighters_level ON combat_fighters(level);

-- Combat battle records
CREATE TABLE IF NOT EXISTS combat_battles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fighter_a_nft TEXT NOT NULL REFERENCES combat_fighters(nft_id),
  fighter_a_did TEXT NOT NULL,
  fighter_a_mode TEXT NOT NULL CHECK(fighter_a_mode IN ('manual', 'auto')),
  fighter_b_nft TEXT NOT NULL REFERENCES combat_fighters(nft_id),
  fighter_b_did TEXT NOT NULL,
  fighter_b_mode TEXT NOT NULL CHECK(fighter_b_mode IN ('manual', 'auto')),
  status TEXT DEFAULT 'active'
    CHECK(status IN ('waiting_moves', 'active', 'completed', 'cancelled', 'draw', 'timeout')),
  current_turn INTEGER DEFAULT 0,
  max_turns INTEGER DEFAULT 50,
  winner_nft TEXT,
  fighter_a_level INTEGER NOT NULL,
  fighter_b_level INTEGER NOT NULL,
  fighter_a_elo INTEGER NOT NULL,
  fighter_b_elo INTEGER NOT NULL,
  elo_change_a INTEGER,
  elo_change_b INTEGER,
  xp_awarded_a INTEGER,
  xp_awarded_b INTEGER,
  turn_log TEXT,
  started_at TEXT DEFAULT (datetime('now')),
  ended_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_combat_battles_status ON combat_battles(status);
CREATE INDEX IF NOT EXISTS idx_combat_battles_fighters ON combat_battles(fighter_a_nft, fighter_b_nft);

-- Combat matchmaking queue
CREATE TABLE IF NOT EXISTS combat_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nft_id TEXT NOT NULL UNIQUE REFERENCES combat_fighters(nft_id),
  owner_did TEXT NOT NULL,
  battle_mode TEXT NOT NULL CHECK(battle_mode IN ('manual', 'auto')),
  elo_rating INTEGER NOT NULL,
  queued_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_combat_queue_elo ON combat_queue(elo_rating);

-- Per-turn state for active manual battles
CREATE TABLE IF NOT EXISTS combat_turns (
  battle_id INTEGER NOT NULL REFERENCES combat_battles(id),
  turn_number INTEGER NOT NULL,
  fighter_a_move TEXT,
  fighter_b_move TEXT,
  fighter_a_submitted_at TEXT,
  fighter_b_submitted_at TEXT,
  turn_result TEXT,
  resolved_at TEXT,
  PRIMARY KEY (battle_id, turn_number)
);

-- XP thresholds for leveling (pre-populated)
CREATE TABLE IF NOT EXISTS combat_level_thresholds (
  level INTEGER PRIMARY KEY,
  xp_required INTEGER NOT NULL
);

-- Pre-populate level thresholds: xp = floor(level^2.5 * 10)
INSERT OR IGNORE INTO combat_level_thresholds (level, xp_required) VALUES
  (1, 0), (2, 57), (3, 156), (4, 320), (5, 559),
  (6, 882), (7, 1296), (8, 1810), (9, 2430), (10, 3162),
  (11, 4013), (12, 4988), (13, 6091), (14, 7328), (15, 8714),
  (16, 10240), (17, 11919), (18, 13754), (19, 15749), (20, 17889),
  (25, 31250), (30, 49295), (35, 72471), (40, 101193),
  (45, 135765), (50, 176777), (55, 224537), (60, 278855),
  (65, 340466), (70, 409963), (75, 487508), (80, 572433),
  (85, 665506), (90, 768425), (95, 880112), (100, 1000000);
```

**Step 2: Test migration locally**

Run: `npx wrangler d1 execute wojak-db --local --file=functions/migrations/060_combat_system.sql`
Expected: Success (no errors)

**Step 3: Verify tables exist**

Run: `npx wrangler d1 execute wojak-db --local --command="SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'combat%'"`
Expected: combat_fighters, combat_battles, combat_queue, combat_turns, combat_level_thresholds

**Step 4: Commit**

```bash
git add functions/migrations/060_combat_system.sql
git commit -m "feat(combat): add D1 migration for combat tables"
```

---

### Task 2.2: Extend Mint Submit — Accept Combat Moves

**Files:**
- Modify: `functions/api/mint/submit.ts`
- Test: `functions/api/mint/submit.test.ts` (create if doesn't exist)

**Step 1: Write the failing test**

```typescript
// functions/api/mint/submit.test.ts
import { describe, it, expect } from 'vitest';
import { validateCombatMoves } from './submit';

// We'll extract the validation logic into a testable function

describe('validateCombatMoves', () => {
  it('accepts 4 valid move IDs', () => {
    const result = validateCombatMoves(['fire_blast', 'ember', 'heat_wave', 'will_o_wisp'], 'FIRE');
    expect(result.valid).toBe(true);
  });

  it('rejects fewer than 4 moves', () => {
    const result = validateCombatMoves(['fire_blast', 'ember'], 'FIRE');
    expect(result.valid).toBe(false);
  });

  it('rejects moves not in the type pool', () => {
    const result = validateCombatMoves(['water_gun', 'surf', 'rain_dance', 'aqua_jet'], 'FIRE');
    expect(result.valid).toBe(false);
  });

  it('rejects duplicate moves', () => {
    const result = validateCombatMoves(['fire_blast', 'fire_blast', 'ember', 'heat_wave'], 'FIRE');
    expect(result.valid).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run functions/api/mint/submit.test.ts`
Expected: FAIL

**Step 3: Modify submit.ts**

1. Add `combatMoves?: string[]` to the `SubmitBody` interface (around line 50)
2. Extract a `validateCombatMoves(moves: string[], type: CombatType)` function and export it
3. In the main handler, after existing validation:
   - Call `calculateCombatIdentity()` with the selected traits + colors + details
   - Validate `combatMoves` against the calculated type's move pool
   - Store `combatMoves` + calculated identity in the mint job KV data

Key modification points in `submit.ts`:
- Line 50 (SubmitBody): add `combatMoves`
- After line ~90 (existing validation): add combat validation
- Before KV store: include combat data in the job payload

**Step 4: Run test to verify it passes**

Run: `npx vitest run functions/api/mint/submit.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add functions/api/mint/submit.ts functions/api/mint/submit.test.ts
git commit -m "feat(combat): extend mint submit to accept and validate combat moves"
```

---

### Task 2.3: Extend Mint Process — Inject Combat Metadata

**Files:**
- Modify: `functions/api/mint/process.ts` (around line 135-170 where metadata is built)

**Step 1: Write the failing test**

```typescript
// functions/api/mint/process.test.ts
import { describe, it, expect } from 'vitest';
import { buildCombatAttributes } from './process';

describe('buildCombatAttributes', () => {
  it('returns 7 CHIP-0007 attribute entries', () => {
    const attrs = buildCombatAttributes({
      type: 'PSYCHE',
      nature: 'Focused',
      ability: 'Magic Guard',
      moves: ['Mind Ray', 'Mesmerize', 'Dream Drain', 'Sixth Sense'],
    });
    expect(attrs).toHaveLength(7);
    expect(attrs[0]).toEqual({ trait_type: 'Combat Type', value: 'PSYCHE' });
    expect(attrs[1]).toEqual({ trait_type: 'Nature', value: 'Focused' });
    expect(attrs[2]).toEqual({ trait_type: 'Ability', value: 'Magic Guard' });
    expect(attrs[3]).toEqual({ trait_type: 'Move 1', value: 'Mind Ray' });
    expect(attrs[6]).toEqual({ trait_type: 'Move 4', value: 'Sixth Sense' });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run functions/api/mint/process.test.ts`
Expected: FAIL

**Step 3: Modify process.ts**

1. Export a `buildCombatAttributes()` function for testability
2. In `processJob()`, after `consolidateTraits(layers)` (line ~117):
   - Build the identity input from consolidated traits + stored colors
   - Call `calculateCombatIdentity()`
   - Call `buildCombatAttributes()` with the identity + stored moves
   - Append combat attributes to the `attributes` array (before line 149 metadata construction)
3. Add `combat_version: "1.0"` to collection attributes
4. After successful mint (in the finalization step), INSERT into `combat_fighters` table

The `buildCombatAttributes` function:
```typescript
export function buildCombatAttributes(combat: {
  type: string; nature: string; ability: string; moves: string[];
}): Array<{ trait_type: string; value: string }> {
  return [
    { trait_type: 'Combat Type', value: combat.type },
    { trait_type: 'Nature', value: combat.nature },
    { trait_type: 'Ability', value: combat.ability },
    { trait_type: 'Move 1', value: combat.moves[0] },
    { trait_type: 'Move 2', value: combat.moves[1] },
    { trait_type: 'Move 3', value: combat.moves[2] },
    { trait_type: 'Move 4', value: combat.moves[3] },
  ];
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run functions/api/mint/process.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add functions/api/mint/process.ts functions/api/mint/process.test.ts
git commit -m "feat(combat): inject combat attributes into CHIP-0007 metadata at mint"
```

---

### Task 2.4: Register Fighter in DB After Mint

**Files:**
- Modify: `functions/api/mint/process.ts` (finalization step, after NFT is minted on-chain)

**Step 1: Write the failing test**

```typescript
// Add to functions/api/mint/process.test.ts
describe('registerCombatFighter SQL', () => {
  it('builds correct INSERT statement', () => {
    const sql = buildFighterInsertSQL({
      nft_id: 'nft_abc123',
      edition_number: 42,
      owner_did: 'did:chia:xyz',
      combat_type: 'PSYCHE',
      nature: 'Focused',
      ability: 'Magic Guard',
      moves: ['Mind Ray', 'Mesmerize', 'Dream Drain', 'Sixth Sense'],
    });
    expect(sql).toContain('INSERT INTO combat_fighters');
    expect(sql).toContain('nft_abc123');
    expect(sql).toContain('PSYCHE');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run functions/api/mint/process.test.ts`
Expected: FAIL (buildFighterInsertSQL not found)

**Step 3: Implement fighter registration**

In process.ts, in the finalization step (after NFT is confirmed minted), add D1 INSERT:

```typescript
// After successful mint, register the fighter
await env.DB.prepare(`
  INSERT INTO combat_fighters (nft_id, edition_number, owner_did, combat_type, nature, ability, move_1, move_2, move_3, move_4)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).bind(
  launcherId, mintNumber, ownerDid,
  combatIdentity.type, combatIdentity.nature, combatIdentity.ability,
  combatMoves[0], combatMoves[1], combatMoves[2], combatMoves[3]
).run();
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run functions/api/mint/process.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add functions/api/mint/process.ts
git commit -m "feat(combat): register fighter in D1 after successful mint"
```

---

**END OF PHASE 2** — Newly minted Wojaks now have combat metadata in their CHIP-0007 JSON and a fighter record in D1. No battle engine or frontend yet.

---

## Phase 3: Battle Engine Port

Port the ClawCombat battle engine to TypeScript. Pure logic — no API endpoints yet. All functions are testable with unit tests.

**Source files to port from:**
- `/Users/abit_hex/ClawCombat/apps/backend/src/services/battle-engine.js` (~2730 lines)
- `/Users/abit_hex/ClawCombat/apps/backend/src/services/ai-strategist.js` (~438 lines)
- `/Users/abit_hex/ClawCombat/apps/backend/src/services/xp-calculator.js`
- `/Users/abit_hex/ClawCombat/apps/backend/src/config/stat-scaling.js`

---

### Task 3.1: Stat Calculator

**Files:**
- Create: `src/lib/combat/stat-calculator.ts`
- Test: `src/lib/combat/stat-calculator.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/combat/stat-calculator.test.ts
import { describe, it, expect } from 'vitest';
import { calculateHP, calculateStat, calculateAllStats } from './stat-calculator';

describe('stat-calculator', () => {
  // HP formula: floor((2 * baseHP + 31) * level / 100) + level + 10
  it('calculates HP at level 1 for NEUTRAL (baseHP=85)', () => {
    const hp = calculateHP(85, 1);
    // floor((2*85+31)*1/100) + 1 + 10 = floor(2.01) + 11 = 13
    expect(hp).toBe(13);
  });

  it('calculates HP at level 50 for NEUTRAL (baseHP=85)', () => {
    const hp = calculateHP(85, 50);
    // floor((2*85+31)*50/100) + 50 + 10 = floor(100.5) + 60 = 160
    expect(hp).toBe(160);
  });

  it('calculates HP at level 100 for NEUTRAL (baseHP=85)', () => {
    const hp = calculateHP(85, 100);
    // floor((2*85+31)*100/100) + 100 + 10 = 201 + 110 = 311
    expect(hp).toBe(311);
  });

  // Other stat formula: floor(((2 * baseStat + 31) * level / 100) + 5) * natureMultiplier
  it('calculates attack at level 50 with neutral nature (mult=1.0)', () => {
    const atk = calculateStat(80, 50, 1.0);
    // floor(((2*80+31)*50/100) + 5) * 1.0 = floor(95.5 + 5) = 100
    expect(atk).toBe(100);
  });

  it('applies +10% nature multiplier', () => {
    const atkBoosted = calculateStat(80, 50, 1.1);
    const atkNeutral = calculateStat(80, 50, 1.0);
    expect(atkBoosted).toBeGreaterThan(atkNeutral);
  });

  it('applies -10% nature multiplier', () => {
    const atkReduced = calculateStat(80, 50, 0.9);
    const atkNeutral = calculateStat(80, 50, 1.0);
    expect(atkReduced).toBeLessThan(atkNeutral);
  });

  it('calculateAllStats returns all 6 stats', () => {
    const stats = calculateAllStats('NEUTRAL', 50, 'Balanced');
    expect(stats).toHaveProperty('hp');
    expect(stats).toHaveProperty('attack');
    expect(stats).toHaveProperty('defense');
    expect(stats).toHaveProperty('sp_atk');
    expect(stats).toHaveProperty('sp_def');
    expect(stats).toHaveProperty('speed');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/combat/stat-calculator.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

Port stat formulas from ClawCombat `config/stat-scaling.js`. Read that file for exact formulas.

```typescript
// src/lib/combat/stat-calculator.ts
import type { CombatType, BaseStats } from './types';
import { getBaseStats } from './data/base-stats';
import { getNature } from './data/natures';

export function calculateHP(baseHP: number, level: number): number {
  return Math.floor((2 * baseHP + 31) * level / 100) + level + 10;
}

export function calculateStat(baseStat: number, level: number, natureMultiplier: number): number {
  return Math.floor((Math.floor((2 * baseStat + 31) * level / 100) + 5) * natureMultiplier);
}

export function calculateAllStats(
  type: CombatType, level: number, natureName: string
): Record<string, number> {
  const base = getBaseStats(type);
  const nature = getNature(natureName);
  const mult = (stat: string): number => {
    if (!nature) return 1.0;
    if (nature.boost === stat) return 1.1;
    if (nature.reduce === stat) return 0.9;
    return 1.0;
  };
  return {
    hp: calculateHP(base.hp, level),
    attack: calculateStat(base.attack, level, mult('attack')),
    defense: calculateStat(base.defense, level, mult('defense')),
    sp_atk: calculateStat(base.sp_atk, level, mult('sp_atk')),
    sp_def: calculateStat(base.sp_def, level, mult('sp_def')),
    speed: calculateStat(base.speed, level, mult('speed')),
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/combat/stat-calculator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/combat/stat-calculator.ts src/lib/combat/stat-calculator.test.ts
git commit -m "feat(combat): add stat calculator with HP/stat formulas and nature multipliers"
```

---

### Task 3.2: Battle State Types + Initialization

**Files:**
- Create: `src/lib/combat/battle-state.ts`
- Test: `src/lib/combat/battle-state.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/combat/battle-state.test.ts
import { describe, it, expect } from 'vitest';
import { initFighterState, initBattleState } from './battle-state';

const mockFighter = {
  nft_id: 'nft_a',
  combat_type: 'FIRE' as const,
  nature: 'Savage',
  ability: 'Blaze',
  moves: ['fire_blast', 'ember', 'heat_wave', 'will_o_wisp'],
  level: 10,
};

describe('battle-state', () => {
  it('initFighterState calculates HP and stats from type/level/nature', () => {
    const state = initFighterState(mockFighter);
    expect(state.maxHP).toBeGreaterThan(0);
    expect(state.currentHP).toBe(state.maxHP);
    expect(state.status).toBeNull();
    expect(state.statStages.atk).toBe(0);
  });

  it('initBattleState creates a battle with turn 0', () => {
    const fighterA = initFighterState(mockFighter);
    const fighterB = initFighterState({ ...mockFighter, nft_id: 'nft_b', combat_type: 'WATER' });
    const battle = initBattleState(fighterA, fighterB);
    expect(battle.turnNumber).toBe(0);
    expect(battle.status).toBe('active');
    expect(battle.fighterA).toBe(fighterA);
    expect(battle.fighterB).toBe(fighterB);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/combat/battle-state.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

Port the battle state structure from ClawCombat `battle-engine.js` (the agent state mapper + battle init). Define:

```typescript
// src/lib/combat/battle-state.ts
export interface FighterState {
  nftId: string;
  type: CombatType;
  nature: string;
  ability: string;
  moves: string[];
  level: number;
  maxHP: number;
  currentHP: number;
  status: string | null;       // 'burn' | 'paralysis' | 'poison' | 'freeze' | 'sleep' | 'confusion' | null
  statusTurns: number;
  statStages: Record<string, number>;  // atk, def, spa, spd, spe: -6 to +6
  effectiveStats: Record<string, number>;
  // Internal tracking
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
  maxTurns: number;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/combat/battle-state.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/combat/battle-state.ts src/lib/combat/battle-state.test.ts
git commit -m "feat(combat): add battle state types and initialization"
```

---

### Task 3.3: Damage Calculator

The core damage formula. Pure function, heavily tested.

**Files:**
- Create: `src/lib/combat/damage-calculator.ts`
- Test: `src/lib/combat/damage-calculator.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/combat/damage-calculator.test.ts
import { describe, it, expect } from 'vitest';
import { calculateDamage, getStatStageMultiplier } from './damage-calculator';

describe('damage-calculator', () => {
  it('stat stage 0 gives multiplier 1.0', () => {
    expect(getStatStageMultiplier(0)).toBe(1.0);
  });

  it('stat stage +1 gives multiplier 1.5', () => {
    expect(getStatStageMultiplier(1)).toBe(1.5);
  });

  it('stat stage -1 gives multiplier ~0.67', () => {
    expect(getStatStageMultiplier(-1)).toBeCloseTo(0.667, 2);
  });

  it('STAB 1.5x when move type matches fighter type', () => {
    const result = calculateDamage({
      movePower: 90,
      moveType: 'FIRE',
      moveCategory: 'special',
      attackerType: 'FIRE',
      attackStat: 100,
      defenseStat: 80,
      attackStage: 0,
      defenseStage: 0,
      isCritical: false,
      typeEffectiveness: 1.0,
      randomFactor: 1.0,    // deterministic for testing
      isBurned: false,
    });
    // baseDamage = (100/80) * scaledPower * 0.25
    // * STAB (1.5) * typeEff (1.0) * crit (1.0) * random (1.0) * burn (1.0)
    expect(result.damage).toBeGreaterThan(0);
    expect(result.stab).toBe(true);
  });

  it('super effective doubles damage', () => {
    const normal = calculateDamage({
      movePower: 90, moveType: 'FIRE', moveCategory: 'special',
      attackerType: 'NEUTRAL', attackStat: 100, defenseStat: 80,
      attackStage: 0, defenseStage: 0, isCritical: false,
      typeEffectiveness: 1.0, randomFactor: 1.0, isBurned: false,
    });
    const superEff = calculateDamage({
      movePower: 90, moveType: 'FIRE', moveCategory: 'special',
      attackerType: 'NEUTRAL', attackStat: 100, defenseStat: 80,
      attackStage: 0, defenseStage: 0, isCritical: false,
      typeEffectiveness: 2.0, randomFactor: 1.0, isBurned: false,
    });
    // ClawCombat caps type effectiveness at 1.5x, so check design doc
    // The capped version: SE = min(typeEff, 1.5)
    expect(superEff.damage).toBeGreaterThan(normal.damage);
  });

  it('burn reduces physical damage', () => {
    const noBurn = calculateDamage({
      movePower: 90, moveType: 'FIRE', moveCategory: 'physical',
      attackerType: 'FIRE', attackStat: 100, defenseStat: 80,
      attackStage: 0, defenseStage: 0, isCritical: false,
      typeEffectiveness: 1.0, randomFactor: 1.0, isBurned: false,
    });
    const burned = calculateDamage({
      movePower: 90, moveType: 'FIRE', moveCategory: 'physical',
      attackerType: 'FIRE', attackStat: 100, defenseStat: 80,
      attackStage: 0, defenseStage: 0, isCritical: false,
      typeEffectiveness: 1.0, randomFactor: 1.0, isBurned: true,
    });
    expect(burned.damage).toBeLessThan(noBurn.damage);
  });

  it('returns minimum 1 damage for any damaging move', () => {
    const result = calculateDamage({
      movePower: 1, moveType: 'NEUTRAL', moveCategory: 'physical',
      attackerType: 'FIRE', attackStat: 1, defenseStat: 999,
      attackStage: -6, defenseStage: 6, isCritical: false,
      typeEffectiveness: 0.5, randomFactor: 0.85, isBurned: true,
    });
    expect(result.damage).toBeGreaterThanOrEqual(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/combat/damage-calculator.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

Port from ClawCombat battle-engine.js damage formula. Key constants from the source:
- Damage multiplier: 0.25 (prevents one-shots)
- Type effectiveness cap: 1.5x
- Critical hit: 1.25x
- Burn physical penalty: 0.5x
- Stat stage table: -6 to +6 → 0.25x to 4.0x

```typescript
// src/lib/combat/damage-calculator.ts

const STAGE_MULTIPLIERS: Record<number, number> = {
  '-6': 0.25, '-5': 0.29, '-4': 0.33, '-3': 0.40,
  '-2': 0.50, '-1': 0.667, '0': 1.0, '1': 1.5,
  '2': 2.0, '3': 2.5, '4': 3.0, '5': 3.5, '6': 4.0,
};

export function getStatStageMultiplier(stage: number): number {
  const clamped = Math.max(-6, Math.min(6, stage));
  return STAGE_MULTIPLIERS[clamped] ?? 1.0;
}

interface DamageInput {
  movePower: number;
  moveType: string;
  moveCategory: 'physical' | 'special' | 'status';
  attackerType: string;
  attackStat: number;
  defenseStat: number;
  attackStage: number;
  defenseStage: number;
  isCritical: boolean;
  typeEffectiveness: number;
  randomFactor: number;    // 0.85-1.0
  isBurned: boolean;
}

interface DamageResult {
  damage: number;
  stab: boolean;
  critical: boolean;
  effectiveness: number;
}

export function calculateDamage(input: DamageInput): DamageResult {
  if (input.moveCategory === 'status' || input.movePower === 0) {
    return { damage: 0, stab: false, critical: false, effectiveness: 1 };
  }

  const stab = input.moveType === input.attackerType;
  const stabMult = stab ? 1.5 : 1.0;
  const critMult = input.isCritical ? 1.25 : 1.0;
  const burnMult = (input.isBurned && input.moveCategory === 'physical') ? 0.5 : 1.0;
  const typeEff = Math.min(input.typeEffectiveness, 1.5); // cap at 1.5x

  const effAtk = input.attackStat * getStatStageMultiplier(
    input.isCritical ? Math.max(input.attackStage, 0) : input.attackStage
  );
  const effDef = input.defenseStat * getStatStageMultiplier(
    input.isCritical ? Math.min(input.defenseStage, 0) : input.defenseStage
  );

  const baseDamage = (effAtk / Math.max(effDef, 1)) * input.movePower * 0.25;
  const finalDamage = Math.floor(
    baseDamage * stabMult * typeEff * critMult * input.randomFactor * burnMult
  );

  return {
    damage: Math.max(finalDamage, 1),
    stab,
    critical: input.isCritical,
    effectiveness: input.typeEffectiveness,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/combat/damage-calculator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/combat/damage-calculator.ts src/lib/combat/damage-calculator.test.ts
git commit -m "feat(combat): add damage calculator with STAB, type effectiveness, crits, burns"
```

---

### Task 3.4: Status Effects + Ability Triggers

**Files:**
- Create: `src/lib/combat/status-effects.ts`
- Create: `src/lib/combat/ability-effects.ts`
- Test: `src/lib/combat/status-effects.test.ts`
- Test: `src/lib/combat/ability-effects.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/lib/combat/status-effects.test.ts
import { describe, it, expect } from 'vitest';
import { applyStatusDamage, checkStatusSkip, tickStatus } from './status-effects';

describe('status-effects', () => {
  it('burn deals 1/16 maxHP per turn', () => {
    const dmg = applyStatusDamage('burn', 160);
    expect(dmg).toBe(10); // floor(160/16)
  });

  it('poison deals 1/8 maxHP per turn', () => {
    const dmg = applyStatusDamage('poison', 160);
    expect(dmg).toBe(20); // floor(160/8)
  });

  it('paralysis has 15% chance to skip (deterministic test)', () => {
    // With RNG seeded to skip
    const result = checkStatusSkip('paralysis', 0.10); // 10% < 15% → skip
    expect(result).toBe(true);
  });

  it('freeze auto-thaws after 1 turn', () => {
    const result = tickStatus('freeze', 1);
    expect(result.cured).toBe(true);
  });

  it('sleep lasts 2 turns', () => {
    expect(tickStatus('sleep', 1).cured).toBe(false);
    expect(tickStatus('sleep', 2).cured).toBe(true);
  });
});
```

```typescript
// src/lib/combat/ability-effects.test.ts
import { describe, it, expect } from 'vitest';
import { getAbilityEffect, ABILITY_TRIGGERS } from './ability-effects';

describe('ability-effects', () => {
  it('Blaze boosts fire damage below 33% HP', () => {
    const effect = getAbilityEffect('Blaze', 'damage_calc', {
      currentHP: 30, maxHP: 100, moveType: 'FIRE', fighterType: 'FIRE',
    });
    expect(effect).toBeDefined();
    expect(effect!.damageMultiplier).toBeCloseTo(1.3);
  });

  it('Blaze does nothing above 33% HP', () => {
    const effect = getAbilityEffect('Blaze', 'damage_calc', {
      currentHP: 50, maxHP: 100, moveType: 'FIRE', fighterType: 'FIRE',
    });
    expect(effect).toBeNull();
  });

  it('Intimidate reduces opponent attack at battle start', () => {
    const effect = getAbilityEffect('Intimidate', 'battle_start', {});
    expect(effect).toBeDefined();
    expect(effect!.opponentStatChange).toEqual({ stat: 'atk', stages: -1 });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/combat/status-effects.test.ts src/lib/combat/ability-effects.test.ts`
Expected: FAIL

**Step 3: Write the implementations**

Port from ClawCombat battle-engine.js:
- `status-effects.ts`: Status damage, skip checks, duration ticks, cure logic
- `ability-effects.ts`: All 36 abilities with their trigger handlers

Key: ClawCombat has 60+ abilities but Wojak only uses 36 (2 per type). Only port the 36 listed in the design doc Section 2.

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/combat/status-effects.test.ts src/lib/combat/ability-effects.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/combat/status-effects.ts src/lib/combat/ability-effects.ts \
       src/lib/combat/status-effects.test.ts src/lib/combat/ability-effects.test.ts
git commit -m "feat(combat): add status effects and 36 ability trigger handlers"
```

---

### Task 3.5: Turn Resolution Engine

The core turn loop. Takes two move choices, resolves speed/priority, applies damage, status, abilities, end-of-turn effects.

**Files:**
- Create: `src/lib/combat/turn-resolver.ts`
- Test: `src/lib/combat/turn-resolver.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/combat/turn-resolver.test.ts
import { describe, it, expect } from 'vitest';
import { resolveTurn } from './turn-resolver';
import { initFighterState, initBattleState } from './battle-state';

const fireData = {
  nft_id: 'nft_fire', combat_type: 'FIRE' as const, nature: 'Balanced',
  ability: 'Blaze', moves: ['fire_blast', 'ember', 'heat_wave', 'will_o_wisp'], level: 50,
};
const waterData = {
  nft_id: 'nft_water', combat_type: 'WATER' as const, nature: 'Balanced',
  ability: 'Torrent', moves: ['surf', 'water_gun', 'rain_dance', 'aqua_jet'], level: 50,
};

describe('turn-resolver', () => {
  it('resolves a turn and returns TurnResult', () => {
    const a = initFighterState(fireData);
    const b = initFighterState(waterData);
    const battle = initBattleState(a, b);
    const result = resolveTurn(battle, 'fire_blast', 'surf');
    expect(result).toBeDefined();
    expect(result.turn).toBe(1);
    expect(result.fighterA).toHaveProperty('move');
    expect(result.fighterB).toHaveProperty('move');
    expect(result.order).toMatch(/^(a_first|b_first)$/);
  });

  it('faster fighter moves first', () => {
    const a = initFighterState({ ...fireData, combat_type: 'ELECTRIC' as const }); // 120 speed
    const b = initFighterState(waterData); // 65 speed
    const battle = initBattleState(a, b);
    const result = resolveTurn(battle, 'fire_blast', 'surf');
    expect(result.order).toBe('a_first');
  });

  it('reduces defender HP after a damaging move', () => {
    const a = initFighterState(fireData);
    const b = initFighterState(waterData);
    const battle = initBattleState(a, b);
    const hpBefore = battle.fighterB.currentHP;
    resolveTurn(battle, 'ember', 'surf'); // mutates battle state
    expect(battle.fighterB.currentHP).toBeLessThan(hpBefore);
  });

  it('detects faint when HP reaches 0', () => {
    const a = initFighterState({ ...fireData, level: 100 });
    const b = initFighterState({ ...waterData, level: 1 }); // very weak
    const battle = initBattleState(a, b);
    // Multiple turns or one powerful hit
    const result = resolveTurn(battle, 'fire_blast', 'water_gun');
    // At level 100 vs level 1, should KO
    if (battle.fighterB.currentHP <= 0) {
      expect(battle.status).toBe('finished');
      expect(battle.winnerId).toBe('nft_fire');
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/combat/turn-resolver.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

Port from ClawCombat battle-engine.js `resolveTurn()` function. Key logic:
1. Determine move order (speed comparison, priority moves)
2. First mover executes move (damage calc, status application, ability triggers)
3. Check if defender fainted
4. Second mover executes (if not fainted)
5. End-of-turn effects (status damage, leech seed, etc.)
6. Check faint conditions
7. Return TurnResult matching the JSON schema from design doc

```typescript
// src/lib/combat/turn-resolver.ts
import type { BattleState, FighterState } from './battle-state';
import { calculateDamage, getStatStageMultiplier } from './damage-calculator';
import { getEffectiveness } from './data/type-chart';
import { getMoveById } from './data/moves';
import { applyStatusDamage, checkStatusSkip, tickStatus } from './status-effects';
import { getAbilityEffect } from './ability-effects';

export interface TurnResult {
  turn: number;
  fighterA: MoveResult;
  fighterB: MoveResult;
  order: 'a_first' | 'b_first';
  endOfTurn: EndOfTurnState;
}

interface MoveResult {
  move: string;
  damage_dealt: number;
  critical: boolean;
  effectiveness: string; // 'super_effective' | 'not_very_effective' | 'neutral' | 'immune'
  status_applied: string | null;
  hp_before: number;
  hp_after: number;
  heal_amount?: number;
}

// ... implementation: read ClawCombat battle-engine.js resolveTurn() and port
export function resolveTurn(
  battle: BattleState,
  moveA: string,
  moveB: string,
  rngSeed?: number // optional for deterministic testing
): TurnResult { /* ... */ }
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/combat/turn-resolver.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/combat/turn-resolver.ts src/lib/combat/turn-resolver.test.ts
git commit -m "feat(combat): add turn resolution engine with speed, damage, status, abilities"
```

---

### Task 3.6: Full Battle Runner

Orchestrates a full battle from start to finish (all turns until one faints or max turns).

**Files:**
- Create: `src/lib/combat/battle-runner.ts`
- Test: `src/lib/combat/battle-runner.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/combat/battle-runner.test.ts
import { describe, it, expect } from 'vitest';
import { runAutoBattle } from './battle-runner';

describe('battle-runner', () => {
  it('completes a full auto-battle and returns result', () => {
    const result = runAutoBattle(
      { nft_id: 'nft_a', combat_type: 'FIRE', nature: 'Balanced', ability: 'Blaze',
        moves: ['fire_blast', 'ember', 'heat_wave', 'will_o_wisp'], level: 50 },
      { nft_id: 'nft_b', combat_type: 'WATER', nature: 'Balanced', ability: 'Torrent',
        moves: ['surf', 'water_gun', 'rain_dance', 'aqua_jet'], level: 50 },
    );
    expect(result.status).toBe('finished');
    expect(result.turns.length).toBeGreaterThan(0);
    expect(result.turns.length).toBeLessThanOrEqual(50);
    // One of them should win (or draw)
    expect(['nft_a', 'nft_b', null]).toContain(result.winnerId);
  });

  it('respects max 50 turns', () => {
    const result = runAutoBattle(
      { nft_id: 'a', combat_type: 'METAL', nature: 'Balanced', ability: 'Heavy Metal',
        moves: ['iron_defense', 'metal_sound', 'steel_wing', 'iron_head'], level: 50 },
      { nft_id: 'b', combat_type: 'METAL', nature: 'Balanced', ability: 'Filter',
        moves: ['iron_defense', 'metal_sound', 'steel_wing', 'iron_head'], level: 50 },
    );
    expect(result.turns.length).toBeLessThanOrEqual(50);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/combat/battle-runner.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

```typescript
// src/lib/combat/battle-runner.ts
// Orchestrates a full battle using turn-resolver + AI strategist
import { initFighterState, initBattleState } from './battle-state';
import { resolveTurn } from './turn-resolver';
import { chooseMove } from './ai-strategist'; // Task 3.7

export function runAutoBattle(fighterAData: any, fighterBData: any) {
  const a = initFighterState(fighterAData);
  const b = initFighterState(fighterBData);
  const battle = initBattleState(a, b);

  while (battle.status === 'active' && battle.turnNumber < battle.maxTurns) {
    const moveA = chooseMove(battle.fighterA, battle.fighterB);
    const moveB = chooseMove(battle.fighterB, battle.fighterA);
    resolveTurn(battle, moveA, moveB);
  }

  // If max turns reached, lower HP% loses
  if (battle.status === 'active') {
    const hpPctA = battle.fighterA.currentHP / battle.fighterA.maxHP;
    const hpPctB = battle.fighterB.currentHP / battle.fighterB.maxHP;
    battle.winnerId = hpPctA > hpPctB ? a.nftId : hpPctB > hpPctA ? b.nftId : null;
    battle.status = 'finished';
  }

  return {
    status: battle.status,
    winnerId: battle.winnerId,
    turns: battle.turns,
    totalTurns: battle.turnNumber,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/combat/battle-runner.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/combat/battle-runner.ts src/lib/combat/battle-runner.test.ts
git commit -m "feat(combat): add full battle runner with auto-battle orchestration"
```

---

### Task 3.7: AI Strategist

**Files:**
- Create: `src/lib/combat/ai-strategist.ts`
- Test: `src/lib/combat/ai-strategist.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/combat/ai-strategist.test.ts
import { describe, it, expect } from 'vitest';
import { chooseMove, rankMoves } from './ai-strategist';
import { initFighterState } from './battle-state';

describe('ai-strategist', () => {
  it('returns a valid move ID from the fighters moveset', () => {
    const attacker = initFighterState({
      nft_id: 'a', combat_type: 'FIRE', nature: 'Balanced', ability: 'Blaze',
      moves: ['fire_blast', 'ember', 'heat_wave', 'will_o_wisp'], level: 50,
    });
    const defender = initFighterState({
      nft_id: 'b', combat_type: 'GRASS', nature: 'Balanced', ability: 'Overgrow',
      moves: ['leaf_blade', 'vine_whip', 'synthesis', 'sleep_powder'], level: 50,
    });
    const move = chooseMove(attacker, defender);
    expect(attacker.moves).toContain(move);
  });

  it('ranks super-effective moves higher', () => {
    const attacker = initFighterState({
      nft_id: 'a', combat_type: 'FIRE', nature: 'Balanced', ability: 'Blaze',
      moves: ['fire_blast', 'ember', 'heat_wave', 'will_o_wisp'], level: 50,
    });
    const defender = initFighterState({
      nft_id: 'b', combat_type: 'GRASS', nature: 'Balanced', ability: 'Overgrow',
      moves: ['leaf_blade', 'vine_whip', 'synthesis', 'sleep_powder'], level: 50,
    });
    const ranked = rankMoves(attacker, defender);
    // Fire moves should score higher against Grass
    const topMove = ranked[0];
    expect(topMove.score).toBeGreaterThan(50); // Above base score
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/combat/ai-strategist.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

Port from `/Users/abit_hex/ClawCombat/apps/backend/src/services/ai-strategist.js`. Key scoring system:
- BASE: 50
- SUPER_EFFECTIVE: +30
- NOT_VERY_EFFECTIVE: -20
- IMMUNE: -40
- KILL_SHOT: +25
- HEALING_VALUE: +20 (when HP < 40%)
- Accuracy penalty: -(100 - accuracy) / 5

Export:
- `chooseMove(attacker: FighterState, defender: FighterState): string`
- `rankMoves(attacker: FighterState, defender: FighterState): Array<{moveId: string, name: string, score: number}>`

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/combat/ai-strategist.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/combat/ai-strategist.ts src/lib/combat/ai-strategist.test.ts
git commit -m "feat(combat): add AI strategist for auto-battle move selection"
```

---

### Task 3.8: XP + ELO Calculator

**Files:**
- Create: `src/lib/combat/xp-elo-calculator.ts`
- Test: `src/lib/combat/xp-elo-calculator.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/combat/xp-elo-calculator.test.ts
import { describe, it, expect } from 'vitest';
import { calculateXPAward, calculateELOChange, calculateLevelFromXP } from './xp-elo-calculator';

describe('xp-elo-calculator', () => {
  it('winner gets more XP than loser', () => {
    const winnerXP = calculateXPAward('win', 10, 10, 1000, 1000);
    const loserXP = calculateXPAward('loss', 10, 10, 1000, 1000);
    expect(winnerXP).toBeGreaterThan(loserXP);
  });

  it('loser always gets some XP (base * 0.3)', () => {
    const loserXP = calculateXPAward('loss', 10, 10, 1000, 1000);
    expect(loserXP).toBeGreaterThan(0);
  });

  it('fighting stronger opponent gives bonus XP', () => {
    const normalXP = calculateXPAward('win', 10, 10, 1000, 1000);
    const bonusXP = calculateXPAward('win', 10, 50, 1000, 1500);
    expect(bonusXP).toBeGreaterThan(normalXP);
  });

  it('ELO winner gains, loser loses (same starting ELO)', () => {
    const change = calculateELOChange(1000, 1000, 'win');
    expect(change).toBeGreaterThan(0);
    const loss = calculateELOChange(1000, 1000, 'loss');
    expect(loss).toBeLessThan(0);
  });

  it('ELO: beating higher-rated gives more points', () => {
    const changeA = calculateELOChange(1000, 1200, 'win');
    const changeB = calculateELOChange(1000, 800, 'win');
    expect(changeA).toBeGreaterThan(changeB);
  });

  it('level 1 at 0 XP', () => {
    expect(calculateLevelFromXP(0)).toBe(1);
  });

  it('level 10 at 3162 XP', () => {
    expect(calculateLevelFromXP(3162)).toBe(10);
  });

  it('level 100 at 1000000 XP', () => {
    expect(calculateLevelFromXP(1000000)).toBe(100);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/combat/xp-elo-calculator.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

Use formulas from design doc Section 9:
- XP: `base_xp(50) * level_factor * elo_bonus` for winner; `base_xp * 0.3` for loser
- ELO: Standard K=32 formula
- Level: `xp_required = floor(level^2.5 * 10)`, find highest level where xp >= threshold

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/combat/xp-elo-calculator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/combat/xp-elo-calculator.ts src/lib/combat/xp-elo-calculator.test.ts
git commit -m "feat(combat): add XP award, ELO change, and level calculation"
```

---

### Task 3.9: Run all Phase 3 tests

**Step 1: Run full combat test suite**

Run: `npx vitest run src/lib/combat/`
Expected: ALL PASS (across all test files created in Phase 1 + Phase 3)

**Step 2: Commit barrel export update**

Update `src/lib/combat/index.ts` to export new modules:

```typescript
// Add to existing barrel exports:
export { calculateHP, calculateStat, calculateAllStats } from './stat-calculator';
export { calculateDamage, getStatStageMultiplier } from './damage-calculator';
export { resolveTurn } from './turn-resolver';
export { runAutoBattle } from './battle-runner';
export { chooseMove, rankMoves } from './ai-strategist';
export { calculateXPAward, calculateELOChange, calculateLevelFromXP } from './xp-elo-calculator';
```

```bash
git add src/lib/combat/index.ts
git commit -m "feat(combat): update barrel exports with battle engine modules"
```

---

**END OF PHASE 3** — The complete battle engine exists as pure TypeScript with full test coverage. No API endpoints or frontend yet — just testable logic.

---

## Phase 4: API Endpoints + Matchmaking

Wire the battle engine to Cloudflare Pages Functions. After this phase, battles can be queued, fought, and resolved via API.

**Existing pattern:** See `functions/api/game/battle-queue.ts` for the existing vote-battle queue pattern. Combat queue is separate but follows similar conventions.

---

### Task 4.1: Combat Fighter Lookup Endpoint

**Files:**
- Create: `functions/api/combat/fighter.ts`
- Test: `functions/api/combat/fighter.test.ts`

**Step 1: Write the failing test**

```typescript
// functions/api/combat/fighter.test.ts
import { describe, it, expect } from 'vitest';
import { buildFighterResponse } from './fighter';

describe('combat/fighter', () => {
  it('formats fighter data correctly', () => {
    const row = {
      nft_id: 'nft_abc', edition_number: 42, owner_did: 'did:chia:xyz',
      combat_type: 'FIRE', nature: 'Savage', ability: 'Blaze',
      move_1: 'fire_blast', move_2: 'ember', move_3: 'heat_wave', move_4: 'will_o_wisp',
      level: 15, xp: 8714, elo_rating: 1247,
      total_combat_wins: 12, total_combat_losses: 5, total_combat_draws: 2,
    };
    const resp = buildFighterResponse(row);
    expect(resp.type).toBe('FIRE');
    expect(resp.moves).toHaveLength(4);
    expect(resp.record).toEqual({ wins: 12, losses: 5, draws: 2 });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run functions/api/combat/fighter.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

```typescript
// functions/api/combat/fighter.ts
// GET /api/combat/fighter?nftId=xxx
// Returns fighter stats, moves, level, ELO, win/loss record

import { jsonResponse, errorResponse } from '../mint/_shared';
import { calculateAllStats } from '../../src/lib/combat';

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
    record: {
      wins: row.total_combat_wins,
      losses: row.total_combat_losses,
      draws: row.total_combat_draws,
    },
  };
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const nftId = url.searchParams.get('nftId');
  if (!nftId) return errorResponse('Missing nftId', 400);

  const row = await context.env.DB.prepare(
    'SELECT * FROM combat_fighters WHERE nft_id = ?'
  ).bind(nftId).first();

  if (!row) return errorResponse('Fighter not found', 404);
  return jsonResponse(buildFighterResponse(row));
};
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run functions/api/combat/fighter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add functions/api/combat/fighter.ts functions/api/combat/fighter.test.ts
git commit -m "feat(combat): add GET /api/combat/fighter endpoint"
```

---

### Task 4.2: Combat Queue Endpoint

**Files:**
- Create: `functions/api/combat/queue.ts`

**Step 1: Write the endpoint**

```typescript
// functions/api/combat/queue.ts
// POST /api/combat/queue — add fighter to matchmaking queue
// DELETE /api/combat/queue — remove from queue
// GET /api/combat/queue/status?nftId= — check queue status

export const onRequest: PagesFunction<Env> = async (context) => {
  const method = context.request.method;

  if (method === 'POST') {
    // Validate: nftId, ownerDid, battleMode
    // Check fighter exists in combat_fighters
    // Check not already in queue
    // Check same-owner block (can't queue against own NFT)
    // Check cooldown (same two NFTs can't battle within 1 hour)
    // INSERT into combat_queue
    // Try to match immediately
  }

  if (method === 'DELETE') {
    // Remove from combat_queue by nftId + ownerDid
  }

  if (method === 'GET') {
    // Return queue position and queue time
  }
};
```

Matchmaking logic (called after INSERT):
1. Query combat_queue for opponents within ELO ±100
2. Exclude same owner
3. If match found: remove both from queue, create combat_battle, return match info
4. If no match: return "queued" status

**Step 2: Commit**

```bash
git add functions/api/combat/queue.ts
git commit -m "feat(combat): add combat queue endpoint with ELO matchmaking"
```

---

### Task 4.3: Submit Move Endpoint

**Files:**
- Create: `functions/api/combat/submit-move.ts`

**Step 1: Write the endpoint**

```typescript
// functions/api/combat/submit-move.ts
// POST /api/combat/submit-move
// Body: { battleId, nftId, moveId }
// Validates move is in fighter's moveset, stores in combat_turns
// When both moves submitted, triggers turn resolution

export const onRequest: PagesFunction<Env> = async (context) => {
  // 1. Parse body: battleId, nftId, moveId
  // 2. Validate battle exists and is active
  // 3. Validate nftId is a participant
  // 4. Validate moveId is in fighter's moveset
  // 5. Store move in combat_turns for current turn
  // 6. Check if both moves now submitted
  // 7. If both submitted: resolve turn, update battle state
  // 8. If battle over: calculate XP/ELO, update fighters
  // 9. Return current battle state
};
```

**Step 2: Commit**

```bash
git add functions/api/combat/submit-move.ts
git commit -m "feat(combat): add submit-move endpoint for manual battles"
```

---

### Task 4.4: Battle State Endpoint

**Files:**
- Create: `functions/api/combat/battle.ts`

**Step 1: Write the endpoint**

```typescript
// functions/api/combat/battle.ts
// GET /api/combat/battle/:id — get full battle state
// GET /api/combat/battle/:id/turns — get turn replay

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const battleId = pathParts[pathParts.indexOf('battle') + 1];

  // Query combat_battles + combat_turns
  // Return: battle state, fighters, turn log, current turn info
};
```

**Step 2: Commit**

```bash
git add functions/api/combat/battle.ts
git commit -m "feat(combat): add battle state and replay endpoint"
```

---

### Task 4.5: Turn Resolution Worker

For auto-battles AND timeout handling. Resolves turns when both moves are in, or after 30s timeout.

**Files:**
- Create: `functions/api/combat/resolve-turn.ts`

**Step 1: Write the resolver**

This is the server-side turn processor:
1. Load battle from DB
2. Load fighter states
3. For auto-battle: use AI strategist to pick moves
4. For timeout: use AI strategist for missing move
5. Call `resolveTurn()` from the engine
6. Store turn result in `combat_turns`
7. Update `combat_battles` (current_turn, status, winner)
8. If battle over: calculate and apply XP + ELO changes to `combat_fighters`

**Step 2: Commit**

```bash
git add functions/api/combat/resolve-turn.ts
git commit -m "feat(combat): add turn resolution with auto-battle and timeout handling"
```

---

### Task 4.6: Combat Leaderboard + History Endpoints

**Files:**
- Create: `functions/api/combat/leaderboard.ts`
- Create: `functions/api/combat/history.ts`

**Step 1: Write leaderboard endpoint**

```typescript
// functions/api/combat/leaderboard.ts
// GET /api/combat/leaderboard?sortBy=elo&limit=50
// Returns top fighters sorted by ELO (or level, or wins)

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const sortBy = url.searchParams.get('sortBy') || 'elo';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

  const column = sortBy === 'level' ? 'level' : sortBy === 'wins' ? 'total_combat_wins' : 'elo_rating';
  const rows = await context.env.DB.prepare(
    `SELECT * FROM combat_fighters ORDER BY ${column} DESC LIMIT ?`
  ).bind(limit).all();

  return jsonResponse({ fighters: rows.results.map(buildFighterResponse) });
};
```

**Step 2: Write history endpoint**

```typescript
// functions/api/combat/history.ts
// GET /api/combat/history?nftId=xxx&limit=20
// Returns recent combat battles for an NFT

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const nftId = url.searchParams.get('nftId');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);

  const rows = await context.env.DB.prepare(
    `SELECT * FROM combat_battles WHERE (fighter_a_nft = ? OR fighter_b_nft = ?) AND status = 'completed' ORDER BY ended_at DESC LIMIT ?`
  ).bind(nftId, nftId, limit).all();

  return jsonResponse({ battles: rows.results });
};
```

**Step 3: Commit**

```bash
git add functions/api/combat/leaderboard.ts functions/api/combat/history.ts
git commit -m "feat(combat): add leaderboard and battle history endpoints"
```

---

### Task 4.7: Combat Identity Preview Endpoint

Used by the generator UI to show live type preview before mint.

**Files:**
- Create: `functions/api/combat/calculate-identity.ts`

**Step 1: Write the endpoint**

```typescript
// functions/api/combat/calculate-identity.ts
// POST /api/combat/calculate-identity
// Body: { traits: [{traitId, layer}], colors: {traitId: hex}, details: {traitId: option} }
// Returns: { type, nature, ability, typeScores, statScores, availableMoves }

import { calculateCombatIdentity } from '../../src/lib/combat';
import { getMovePoolForType } from '../../src/lib/combat/data/moves';

export const onRequest: PagesFunction<Env> = async (context) => {
  const body = await context.request.json();
  const identity = calculateCombatIdentity(body);
  const moves = getMovePoolForType(identity.type);
  return jsonResponse({
    ...identity,
    availableMoves: moves.map(m => ({
      id: m.id, name: m.name, power: m.power,
      category: m.category, accuracy: m.accuracy,
      description: m.description,
    })),
  });
};
```

**Step 2: Commit**

```bash
git add functions/api/combat/calculate-identity.ts
git commit -m "feat(combat): add identity preview endpoint for generator UI"
```

---

### Task 4.8: Type Chart Endpoint

Static data endpoint for the frontend.

**Files:**
- Create: `functions/api/combat/type-chart.ts`

**Step 1: Write the endpoint**

```typescript
// functions/api/combat/type-chart.ts
// GET /api/combat/type-chart — return full 18x18 type effectiveness matrix
import { TYPE_CHART } from '../../src/lib/combat';

export const onRequest: PagesFunction<Env> = async () => {
  return new Response(JSON.stringify(TYPE_CHART), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' },
  });
};
```

**Step 2: Commit**

```bash
git add functions/api/combat/type-chart.ts
git commit -m "feat(combat): add type chart endpoint (cached 24h)"
```

---

**END OF PHASE 4** — All API endpoints are live. Battles can be queued, fought (manual or auto), resolved, and replayed via API. Leaderboard and history work.

---

## Phase 5: Frontend — Generator Combat UI + Battle Page

Add the combat preview and move selection to the generator, and build the battle page.

**CSS Rules (from CLAUDE.md):**
- Visual styling → `src/styles/theme.css` (colors, shadows, borders)
- Layout → Tailwind only (flex, grid, gap, padding)
- Use `.card`, `.btn`, `.badge` classes from theme.css
- NO `!important`, NO inline color styles, NO new CSS variable files

---

### Task 5.1: Add Combat-Specific Theme Styles

**Files:**
- Modify: `src/styles/theme.css`

**Step 1: Add combat styles to theme.css**

Add to the existing theme.css file (at the bottom, before any closing comments):

```css
/* ===== COMBAT SYSTEM ===== */

/* Type badge colors */
.badge-fire { background: rgba(239, 68, 68, 0.15); color: #ef4444; border-color: rgba(239, 68, 68, 0.3); }
.badge-water { background: rgba(59, 130, 246, 0.15); color: #3b82f6; border-color: rgba(59, 130, 246, 0.3); }
.badge-grass { background: rgba(34, 197, 94, 0.15); color: #22c55e; border-color: rgba(34, 197, 94, 0.3); }
.badge-electric { background: rgba(250, 204, 21, 0.15); color: #facc15; border-color: rgba(250, 204, 21, 0.3); }
.badge-psyche { background: rgba(168, 85, 247, 0.15); color: #a855f7; border-color: rgba(168, 85, 247, 0.3); }
.badge-martial { background: rgba(249, 115, 22, 0.15); color: #f97316; border-color: rgba(249, 115, 22, 0.3); }
.badge-dragon { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; border-color: rgba(139, 92, 246, 0.3); }
.badge-shadow { background: rgba(100, 100, 120, 0.15); color: #9ca3af; border-color: rgba(100, 100, 120, 0.3); }
.badge-metal { background: rgba(148, 163, 184, 0.15); color: #94a3b8; border-color: rgba(148, 163, 184, 0.3); }
.badge-mystic { background: rgba(236, 72, 153, 0.15); color: #ec4899; border-color: rgba(236, 72, 153, 0.3); }
.badge-neutral { background: rgba(163, 163, 163, 0.15); color: #a3a3a3; border-color: rgba(163, 163, 163, 0.3); }
/* Add remaining types as needed */

/* HP bar */
.hp-bar { height: 8px; border-radius: 4px; background: var(--color-surface); overflow: hidden; }
.hp-bar-fill { height: 100%; transition: width 0.5s ease; border-radius: 4px; }
.hp-bar-fill.hp-high { background: var(--color-success); }
.hp-bar-fill.hp-mid { background: #facc15; }
.hp-bar-fill.hp-low { background: var(--color-error); }

/* Move button */
.move-btn {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.move-btn:hover { border-color: var(--color-primary); box-shadow: var(--glow-primary); }
.move-btn.selected { border-color: var(--color-primary); background: rgba(255, 107, 0, 0.1); }

/* Turn log */
.turn-entry { padding: 6px 0; border-bottom: 1px solid var(--color-border); font-size: 0.85rem; }
.turn-entry:last-child { border-bottom: none; }

/* Combat preview badge (in generator) */
.combat-preview-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}
```

**Step 2: Commit**

```bash
git add src/styles/theme.css
git commit -m "feat(combat): add combat-specific styles to theme.css"
```

---

### Task 5.2: Combat Preview Component (for Generator)

**Files:**
- Create: `src/components/generator/CombatPreview.tsx`

**Step 1: Write the component**

Shows live type/nature/ability calculation as user selects traits and colors.

```tsx
// src/components/generator/CombatPreview.tsx
import { useMemo } from 'react';
import { calculateCombatIdentity } from '@/lib/combat';
import type { CombatIdentity } from '@/lib/combat/types';

interface CombatPreviewProps {
  traits: Array<{ traitId: string; layer: string }>;
  colors: Record<string, string>;
  details: Record<string, string>;
}

export function CombatPreview({ traits, colors, details }: CombatPreviewProps) {
  const identity: CombatIdentity | null = useMemo(() => {
    if (traits.length === 0) return null;
    return calculateCombatIdentity({ traits, colors, details });
  }, [traits, colors, details]);

  if (!identity) return null;

  // Find runner-up type
  const sortedTypes = Object.entries(identity.typeScores)
    .sort(([, a], [, b]) => b - a);
  const runnerUp = sortedTypes[1]?.[0];

  return (
    <div className="combat-preview-badge">
      <span>⚡ {identity.type}</span>
      {runnerUp && sortedTypes[1][1] > 0 && (
        <span className="text-muted">| 🔮 {runnerUp}</span>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/generator/CombatPreview.tsx
git commit -m "feat(combat): add CombatPreview component for live type display in generator"
```

---

### Task 5.3: Move Selection Step (Generator)

**Files:**
- Create: `src/components/generator/MoveSelection.tsx`

**Step 1: Write the component**

After the user finishes building their Wojak visually, this step appears:

```tsx
// src/components/generator/MoveSelection.tsx
import { useState, useMemo } from 'react';
import { getMovePoolForType } from '@/lib/combat/data/moves';
import type { CombatMove, CombatType } from '@/lib/combat/types';

interface MoveSelectionProps {
  combatType: CombatType;
  onMovesSelected: (moves: string[]) => void;
}

export function MoveSelection({ combatType, onMovesSelected }: MoveSelectionProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const movePool = useMemo(() => getMovePoolForType(combatType), [combatType]);

  const toggleMove = (moveId: string) => {
    setSelected(prev => {
      if (prev.includes(moveId)) return prev.filter(id => id !== moveId);
      if (prev.length >= 4) return prev;
      const next = [...prev, moveId];
      if (next.length === 4) onMovesSelected(next);
      return next;
    });
  };

  const hasDamagingMove = selected.some(id => {
    const move = movePool.find(m => m.id === id);
    return move && move.power > 0;
  });

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-bold">Choose 4 Moves ({selected.length}/4)</h3>
      {!hasDamagingMove && selected.length > 0 && (
        <p className="text-sm" style={{ color: 'var(--color-error)' }}>
          You need at least 1 damaging move!
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        {movePool.map(move => (
          <button
            key={move.id}
            className={`move-btn flex flex-col gap-1 ${selected.includes(move.id) ? 'selected' : ''}`}
            onClick={() => toggleMove(move.id)}
            disabled={selected.length >= 4 && !selected.includes(move.id)}
          >
            <span className="font-semibold">{move.name}</span>
            <span className="text-xs text-secondary">
              {move.category} | Pwr: {move.power || '—'} | Acc: {move.accuracy}%
            </span>
            {move.description && (
              <span className="text-xs text-muted">{move.description}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/generator/MoveSelection.tsx
git commit -m "feat(combat): add MoveSelection component for generator mint flow"
```

---

### Task 5.4: Integrate Combat into Generator Flow

**Files:**
- Modify: `src/contexts/GeneratorContext.tsx` (add combatMoves to state)
- Modify: Generator page component (add CombatPreview + MoveSelection step)

**Step 1: Add combat state to generator**

In `GeneratorContext.tsx`, extend the state with:
```typescript
combatMoves: string[] | null;  // null until user selects 4 moves
combatIdentity: CombatIdentity | null;  // calculated live
```

Add actions:
- `SET_COMBAT_MOVES` — stores selected moves
- Calculate `combatIdentity` whenever traits/colors change (use `useMemo` in context provider)

**Step 2: Add CombatPreview to trait selection UI**

Wherever the trait panel is rendered, add `<CombatPreview />` component that reads traits/colors from generator state.

**Step 3: Add MoveSelection step before mint confirm**

In the generator flow, add a step between "trait selection complete" and "confirm mint" that shows the MoveSelection component. This step only appears after all traits are chosen.

**Step 4: Pass combatMoves to mint submit**

In the mint submission handler, include `combatMoves` in the POST body to `/api/mint/submit`.

**Step 5: Commit**

```bash
git add src/contexts/GeneratorContext.tsx src/pages/GeneratorPage.tsx
git commit -m "feat(combat): integrate combat preview and move selection into generator flow"
```

---

### Task 5.5: Battle Page — Queue Panel

**Files:**
- Create: `src/pages/CombatPage.tsx`
- Create: `src/components/combat/QueuePanel.tsx`

**Step 1: Create the combat page route**

Add `/games/combat` route in the router (or as a tab within `/games`).

```tsx
// src/pages/CombatPage.tsx
import { useState } from 'react';
import { QueuePanel } from '@/components/combat/QueuePanel';

export default function CombatPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">⚔️ Combat Arena</h1>
      <QueuePanel />
    </div>
  );
}
```

**Step 2: Create QueuePanel component**

```tsx
// src/components/combat/QueuePanel.tsx
// - Select NFT from owned collection (shows type, level, ELO)
// - Toggle: Manual / Auto battle mode
// - "Enter Queue" button
// - Shows queue status (waiting, match found)
// Uses: GET /api/combat/fighter?nftId= for fighter info
// Uses: POST /api/combat/queue to enter queue
// Uses: DELETE /api/combat/queue to leave queue
```

**Step 3: Commit**

```bash
git add src/pages/CombatPage.tsx src/components/combat/QueuePanel.tsx
git commit -m "feat(combat): add combat page with queue panel"
```

---

### Task 5.6: Battle Page — Active Battle View

**Files:**
- Create: `src/components/combat/BattleView.tsx`
- Create: `src/components/combat/HPBar.tsx`
- Create: `src/components/combat/TurnLog.tsx`
- Create: `src/components/combat/MoveButtons.tsx`

**Step 1: Create HPBar component**

```tsx
// src/components/combat/HPBar.tsx
interface HPBarProps { current: number; max: number; }
export function HPBar({ current, max }: HPBarProps) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const level = pct > 50 ? 'hp-high' : pct > 20 ? 'hp-mid' : 'hp-low';
  return (
    <div className="hp-bar">
      <div className={`hp-bar-fill ${level}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
```

**Step 2: Create MoveButtons component**

```tsx
// src/components/combat/MoveButtons.tsx
// Shows 4 move buttons, 30s countdown timer
// Calls POST /api/combat/submit-move on click
// Disables after selection, shows "Waiting for opponent..."
```

**Step 3: Create TurnLog component**

```tsx
// src/components/combat/TurnLog.tsx
// Scrollable list of turn results
// Each turn shows: move used, damage dealt, status effects, HP changes
// Uses .turn-entry class from theme.css
```

**Step 4: Create BattleView component**

```tsx
// src/components/combat/BattleView.tsx
// Split layout: your Wojak (left) vs opponent (right)
// Each side: NFT image, type badge, HP bar, status icons
// Bottom: MoveButtons (if manual) or "Auto-battling..." indicator
// Side: TurnLog scrolling
// Polls GET /api/combat/battle/:id for state updates
```

**Step 5: Commit**

```bash
git add src/components/combat/BattleView.tsx src/components/combat/HPBar.tsx \
       src/components/combat/TurnLog.tsx src/components/combat/MoveButtons.tsx
git commit -m "feat(combat): add active battle view with HP bars, move buttons, turn log"
```

---

### Task 5.7: Battle History + Replay

**Files:**
- Create: `src/components/combat/BattleHistory.tsx`
- Create: `src/components/combat/BattleReplay.tsx`

**Step 1: Create BattleHistory**

```tsx
// src/components/combat/BattleHistory.tsx
// List of past battles for current user's fighters
// Each row: opponent, result (W/L/D), ELO change, XP earned, date
// Click to expand → shows BattleReplay
// Uses: GET /api/combat/history?did=xxx
```

**Step 2: Create BattleReplay**

```tsx
// src/components/combat/BattleReplay.tsx
// Renders turn-by-turn replay from turn_log JSON
// Step through turns with Next/Prev buttons or auto-play
// Shows damage numbers, status effects, HP changes per turn
```

**Step 3: Commit**

```bash
git add src/components/combat/BattleHistory.tsx src/components/combat/BattleReplay.tsx
git commit -m "feat(combat): add battle history list and turn-by-turn replay"
```

---

### Task 5.8: Fighter Card Component

Shows on NFT cards throughout the app.

**Files:**
- Create: `src/components/combat/FighterCard.tsx`

**Step 1: Write the component**

```tsx
// src/components/combat/FighterCard.tsx
interface FighterCardProps {
  nftId: string;
  name: string;
  imageUrl: string;
  type: string;
  level: number;
  elo: number;
  ability: string;
  moves: string[];
  record: { wins: number; losses: number; draws: number };
}

export function FighterCard(props: FighterCardProps) {
  return (
    <div className="card p-4 flex flex-col gap-2">
      <img src={props.imageUrl} alt={props.name} className="rounded-lg" />
      <h3 className="font-bold">{props.name}</h3>
      <div className="flex gap-2">
        <span className={`badge badge-${props.type.toLowerCase()}`}>{props.type}</span>
        <span className="badge">Lv. {props.level}</span>
        <span className="badge">ELO {props.elo}</span>
      </div>
      <p className="text-xs text-secondary">
        {props.ability} | W:{props.record.wins} L:{props.record.losses} D:{props.record.draws}
      </p>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/combat/FighterCard.tsx
git commit -m "feat(combat): add FighterCard component for NFT combat display"
```

---

### Task 5.9: Combat Leaderboard

**Files:**
- Create: `src/components/combat/CombatLeaderboard.tsx`

**Step 1: Write the component**

```tsx
// src/components/combat/CombatLeaderboard.tsx
// Table/list of top fighters by ELO
// Columns: Rank, NFT (image+name), Type, Level, ELO, W/L/D
// Sort toggle: ELO | Level | Wins
// Uses: GET /api/combat/leaderboard?sortBy=elo
// Add as tab/section on existing /leaderboard page
```

**Step 2: Commit**

```bash
git add src/components/combat/CombatLeaderboard.tsx
git commit -m "feat(combat): add combat leaderboard component"
```

---

### Task 5.10: Pre-Combat NFT Messaging

For NFTs minted before the combat system.

**Files:**
- Modify: Existing NFT detail/card components

**Step 1: Add combat status check**

When displaying an NFT, check if it has a `combat_fighters` row:
- If yes: show FighterCard with combat info
- If no: show message "This Wojak was minted before the combat era. Burn it to earn credits toward a new combat-ready Wojak!"

**Step 2: Commit**

```bash
git add src/components/
git commit -m "feat(combat): add pre-combat NFT messaging with burn incentive"
```

---

### Task 5.11: Add Route + Navigation

**Files:**
- Modify: Router config (wherever routes are defined)
- Modify: Navigation component

**Step 1: Add /games/combat route**

```tsx
// In router configuration
{ path: '/games/combat', element: <CombatPage /> }
```

**Step 2: Add navigation link**

Add "Combat Arena" link/tab within the games section of the navigation.

**Step 3: Commit**

```bash
git add src/App.tsx src/components/navigation/
git commit -m "feat(combat): add combat arena route and navigation"
```

---

### Task 5.12: Full E2E Smoke Test

**Files:**
- Create: `tests/combat.spec.ts`

**Step 1: Write basic E2E tests**

```typescript
// tests/combat.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Combat System', () => {
  test('combat page loads', async ({ page }) => {
    await page.goto('/games/combat');
    await expect(page.getByText('Combat Arena')).toBeVisible();
  });

  test('generator shows combat preview', async ({ page }) => {
    await page.goto('/generator');
    // Select some traits...
    // Verify combat preview badge appears
  });

  test('move selection appears after trait selection', async ({ page }) => {
    await page.goto('/generator');
    // Complete trait selection...
    // Verify move selection step is shown
  });
});
```

**Step 2: Run E2E tests**

Run: `npx playwright test tests/combat.spec.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add tests/combat.spec.ts
git commit -m "test(combat): add E2E smoke tests for combat system"
```

---

**END OF PHASE 5** — The full combat system is functional: generator shows combat identity, users pick moves at mint, battles work via queue + manual/auto play, leaderboard and history are live.

---

## Phase 6 (Optional): New Backgrounds + Asset Integration

Only after background images are created by the user.

### Task 6.1: Add New Background PNGs to Assets

**Files:**
- Add: `public/assets/wojak-layers/YourWojak-layers/Background/` — 14 new PNGs

When the user provides the background images, add them to the asset directory.

### Task 6.2: Register in Manifest

**Files:**
- Modify: `public/assets/wojak-layers/YourWojak-layers/manifest.json`

Add entries for each new background with proper IDs (e.g., `Background_Frozen-Tundra`).

### Task 6.3: Add to Trait-Combat Mapping

**Files:**
- Modify: `src/lib/combat/data/trait-type-map.ts`

Add the 14 new background entries from `docs/TRAIT-COMBAT-MAPPING.csv` (rows marked "NEW").

### Task 6.4: Update Tests

Verify trait count increases from 129 to 143 (129 + 14 new backgrounds).

Run: `npx vitest run src/lib/combat/`
Expected: ALL PASS

### Task 6.5: Commit

```bash
git add public/assets/ src/lib/combat/data/trait-type-map.ts
git commit -m "feat(combat): add 14 new themed backgrounds with combat mappings"
```

---

**END OF PLAN**

## Summary

| Phase | Tasks | What's Built |
|-------|-------|-------------|
| 1 | 1.1–1.11 | All combat data: types, moves, natures, abilities, mappings, identity calculator |
| 2 | 2.1–2.4 | D1 migration, mint integration, fighter registration |
| 3 | 3.1–3.9 | Full battle engine: stats, damage, status, abilities, turns, AI, XP/ELO |
| 4 | 4.1–4.8 | All API endpoints: fighter, queue, submit-move, battle state, leaderboard |
| 5 | 5.1–5.12 | Generator combat UI, battle page, history, replay, leaderboard, E2E tests |
| 6 | 6.1–6.5 | New background assets + manifest registration (when images ready) |

**Total estimated tasks:** ~45 bite-sized steps
**Each step:** 2-10 minutes
**Test coverage:** Unit tests for all combat logic, E2E for critical flows
