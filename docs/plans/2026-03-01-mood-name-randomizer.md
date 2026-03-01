# Mood-Aware Name Randomizer — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the clothing-only name randomizer with a mood-tag resolution system that reads ALL equipped traits, weights them by visual dominance, and generates culturally rich names from mood-specific pools.

**Architecture:** Every trait value maps to 1-3 mood tags from a vocabulary of 16. Traits are weighted by tier (Clothes/Extras 3x, Head/Face Wear/Face 2x, Mouth/Background 1x). A resolver tallies weighted mood scores and returns primary + secondary mood. Name generation draws from mood pools + combo bonus pools using 4 patterns (combo name, full name, adj+noun, title+noun). ~11,000+ possible unique names.

**Tech Stack:** Pure TypeScript, no new dependencies. Vitest for tests.

**Design doc:** `docs/plans/2026-03-01-mood-name-randomizer-design.md`

---

## Task 1: Create Mood Tag Types and Trait-to-Mood Map

**Files:**
- Create: `src/lib/moodMap.ts`
- Test: `src/lib/moodMap.test.ts`

**Step 1: Write the failing tests**

Create `src/lib/moodMap.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  type MoodTag,
  MOOD_TAGS,
  TRAIT_MOODS,
  TIER_WEIGHTS,
  resolveMoods,
} from './moodMap';

describe('MOOD_TAGS', () => {
  it('has exactly 16 mood tags', () => {
    expect(MOOD_TAGS.length).toBe(16);
  });

  it('includes all expected mood tags', () => {
    const expected = [
      'aggressive', 'rebellious', 'degen', 'chill', 'goofy', 'elite',
      'dark', 'mystical', 'warrior', 'cosmic', 'wholesome', 'nerdy',
      'chaotic', 'spooky', 'party', 'grinder',
    ];
    for (const tag of expected) {
      expect(MOOD_TAGS).toContain(tag);
    }
  });
});

describe('TRAIT_MOODS', () => {
  it('maps GFY Right to rebellious and aggressive', () => {
    expect(TRAIT_MOODS['GFY Right']).toEqual(['rebellious', 'aggressive']);
  });

  it('maps Beer Hat to party and rebellious', () => {
    expect(TRAIT_MOODS['Beer Hat']).toEqual(['party', 'rebellious']);
  });

  it('maps Suit to elite and grinder', () => {
    expect(TRAIT_MOODS['Suit']).toEqual(['elite', 'grinder']);
  });

  it('maps Tee to chill and degen', () => {
    expect(TRAIT_MOODS['Tee']).toEqual(['chill', 'degen']);
  });

  it('maps Laser Eyes to 3 moods', () => {
    expect(TRAIT_MOODS['Laser Eyes']).toEqual(['aggressive', 'cosmic', 'degen']);
  });

  it('every mapped trait has 1-3 valid mood tags', () => {
    for (const [trait, moods] of Object.entries(TRAIT_MOODS)) {
      expect(moods.length).toBeGreaterThanOrEqual(1);
      expect(moods.length).toBeLessThanOrEqual(3);
      for (const mood of moods) {
        expect(MOOD_TAGS).toContain(mood);
      }
    }
  });
});

describe('TIER_WEIGHTS', () => {
  it('weights Clothes and Extras at 3', () => {
    expect(TIER_WEIGHTS['Clothes']).toBe(3);
    expect(TIER_WEIGHTS['Extras']).toBe(3);
  });

  it('weights Head, Face Wear, and Face at 2', () => {
    expect(TIER_WEIGHTS['Head']).toBe(2);
    expect(TIER_WEIGHTS['Face Wear']).toBe(2);
    expect(TIER_WEIGHTS['Face']).toBe(2);
  });

  it('weights Mouth and Background at 1', () => {
    expect(TIER_WEIGHTS['Mouth']).toBe(1);
    expect(TIER_WEIGHTS['Background']).toBe(1);
  });
});

describe('resolveMoods', () => {
  it('returns primary and secondary moods from trait list', () => {
    // Middle finger + Beer Hat + Tee + Screaming
    // GFY Right (Extras, x3): rebellious=3, aggressive=3
    // Beer Hat (Head, x2): party=2, rebellious=2
    // Tee (Clothes, x3): chill=3, degen=3
    // Screaming (Mouth, x1): aggressive=1, chaotic=1
    // Totals: rebellious=5, aggressive=4, chill=3, degen=3, party=2, chaotic=1
    const traits = [
      { trait_type: 'Extras', value: 'GFY Right', source: 'map' as const, raw: '' },
      { trait_type: 'Head', value: 'Beer Hat', source: 'map' as const, raw: '' },
      { trait_type: 'Clothes', value: 'Tee', source: 'map' as const, raw: '' },
      { trait_type: 'Mouth', value: 'Screaming', source: 'map' as const, raw: '' },
    ];
    const result = resolveMoods(traits);
    expect(result.primary).toBe('rebellious');
    expect(result.secondary).toBe('aggressive');
  });

  it('returns degen/chill as defaults when no traits match', () => {
    const result = resolveMoods([]);
    expect(result.primary).toBe('chill');
    expect(result.secondary).toBe('degen');
  });

  it('handles traits not in the mood map gracefully', () => {
    const traits = [
      { trait_type: 'Clothes', value: 'Unknown Future Item', source: 'map' as const, raw: '' },
    ];
    const result = resolveMoods(traits);
    // Should still return valid moods (defaults)
    expect(MOOD_TAGS).toContain(result.primary);
    expect(MOOD_TAGS).toContain(result.secondary);
  });

  it('never returns the same mood for primary and secondary', () => {
    const traits = [
      { trait_type: 'Clothes', value: 'SWAT Gear', source: 'map' as const, raw: '' },
      { trait_type: 'Head', value: 'SWAT Helmet', source: 'map' as const, raw: '' },
      { trait_type: 'Face', value: 'Terminator', source: 'map' as const, raw: '' },
    ];
    // All heavily warrior+aggressive — should still pick two different moods
    const result = resolveMoods(traits);
    expect(result.primary).not.toBe(result.secondary);
  });

  it('uses tier weights correctly — Clothes (x3) outweighs Mouth (x1)', () => {
    // Suit (Clothes, x3): elite=3, grinder=3
    // Screaming (Mouth, x1): aggressive=1, chaotic=1
    const traits = [
      { trait_type: 'Clothes', value: 'Suit', source: 'map' as const, raw: '' },
      { trait_type: 'Mouth', value: 'Screaming', source: 'map' as const, raw: '' },
    ];
    const result = resolveMoods(traits);
    // elite or grinder should be primary, not aggressive
    expect(['elite', 'grinder']).toContain(result.primary);
  });

  it('handles Extras with comma-separated values', () => {
    // Extras can be "GFY Right, Diamond" — should process both
    const traits = [
      { trait_type: 'Extras', value: 'GFY Right, Diamond', source: 'map' as const, raw: '' },
    ];
    const result = resolveMoods(traits);
    // GFY Right: rebellious, aggressive; Diamond: elite, degen
    // All weighted x3: rebellious=3, aggressive=3, elite=3, degen=3
    // Tiebreaker alphabetical: aggressive is first
    expect(MOOD_TAGS).toContain(result.primary);
    expect(MOOD_TAGS).toContain(result.secondary);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/moodMap.test.ts`
Expected: FAIL — module `./moodMap` not found

**Step 3: Write the implementation**

Create `src/lib/moodMap.ts` with the complete trait-to-mood mapping from the design doc (`docs/plans/2026-03-01-mood-name-randomizer-design.md`, Section 3).

```typescript
/**
 * Mood Map — Trait-to-Mood Tag Resolution
 *
 * Every trait value maps to 1-3 mood tags. Traits are weighted by visual
 * dominance tier. The resolver tallies weighted mood scores and returns
 * primary + secondary mood for name generation.
 */

// ── Mood Tag Vocabulary ──

export const MOOD_TAGS = [
  'aggressive', 'rebellious', 'degen', 'chill', 'goofy', 'elite',
  'dark', 'mystical', 'warrior', 'cosmic', 'wholesome', 'nerdy',
  'chaotic', 'spooky', 'party', 'grinder',
] as const;

export type MoodTag = typeof MOOD_TAGS[number];

// ── Tier Weights (visual dominance) ──

export const TIER_WEIGHTS: Record<string, number> = {
  Clothes: 3,
  Extras: 3,
  Head: 2,
  'Face Wear': 2,
  Face: 2,
  Mouth: 1,
  Background: 1,
};

// ── Trait → Mood Mappings ──
// Complete mapping from design doc Section 3

export const TRAIT_MOODS: Record<string, MoodTag[]> = {
  // Face (Expression)
  'Classic': ['chill', 'degen'],
  'Rekt': ['dark', 'degen'],
  'Rugged': ['grinder', 'warrior'],
  'Bleeding Bags': ['dark', 'degen'],
  'Terminator': ['aggressive', 'dark'],
  'NPC': ['goofy', 'nerdy'],

  // Head
  'Beer Hat': ['party', 'rebellious'],
  'Crown': ['elite', 'warrior'],
  'Wizard Hat': ['mystical', 'dark'],
  'Devil Horns': ['dark', 'chaotic'],
  'Tin Foil Hat': ['nerdy', 'chaotic'],
  'Military Beret': ['warrior', 'grinder'],
  'Propeller Hat': ['goofy', 'nerdy'],
  'Clown': ['goofy', 'chaotic'],
  'Viking Helmet': ['warrior', 'aggressive'],
  'Cowboy Hat': ['rebellious', 'chill'],
  'Centurion': ['warrior', 'elite'],
  'Comrade Hat': ['rebellious', 'chaotic'],
  'Construction Helmet': ['grinder', 'wholesome'],
  'Fedora': ['nerdy', 'dark'],
  'Field Cap': ['warrior', 'grinder'],
  'Firefighter Helmet': ['wholesome', 'warrior'],
  'Hard Hat': ['grinder', 'wholesome'],
  'Headphones': ['chill', 'nerdy'],
  'Cap': ['chill', 'degen'],
  'Pirate Hat': ['rebellious', 'chaotic'],
  'Ronin Helmet': ['warrior', 'dark'],
  'Standard Cut': ['chill', 'degen'],
  'Super Wojak Hat': ['goofy', 'cosmic'],
  'Super Saiyan': ['aggressive', 'cosmic'],
  'SWAT Helmet': ['warrior', 'aggressive'],
  'Trump Wave': ['elite', 'chaotic'],
  'Piccolo Turban': ['mystical', 'warrior'],
  'Beanie': ['chill', 'degen'],
  '2Pac Bandana': ['rebellious', 'grinder'],
  'Spikes': ['rebellious', 'aggressive'],

  // Face Wear
  'Laser Eyes': ['aggressive', 'cosmic', 'degen'],
  '3D Glasses': ['nerdy', 'goofy'],
  'Alpha Shades': ['elite', 'degen'],
  'Aviators': ['chill', 'elite'],
  'Cool Glasses': ['chill', 'party'],
  'Cyber Shades': ['nerdy', 'cosmic'],
  'Eye Patch': ['dark', 'warrior'],
  'Matrix Lenses': ['nerdy', 'dark'],
  'MOG Glasses': ['degen', 'goofy'],
  'Ninja Turtle Mask': ['goofy', 'warrior'],
  'Shades': ['chill', 'elite'],
  'Tyson Tattoo': ['aggressive', 'rebellious'],
  'Wizard Glasses': ['mystical', 'nerdy'],
  'Night Vision': ['warrior', 'grinder'],
  'VR Headset': ['nerdy', 'cosmic'],
  'Fake It Mask': ['dark', 'spooky'],
  'MedievalBepe Cowboy': ['rebellious', 'goofy'],
  'MedievalBepe Emo': ['dark', 'chaotic'],
  'MedievalBepe Wizard': ['mystical', 'goofy'],
  'Tanginium King': ['elite', 'wholesome'],
  'Tanginium Sad': ['dark', 'wholesome'],

  // Mouth
  'Numb': ['chill', 'dark'],
  'Smile': ['chill', 'wholesome'],
  'Screaming': ['aggressive', 'chaotic'],
  'Teeth': ['aggressive', 'goofy'],
  'Gold Teeth': ['elite', 'degen'],
  'Pizza': ['party', 'goofy'],
  'Stunned': ['chaotic', 'degen'],
  'Sexy Lip Bite': ['party', 'goofy'],
  'Glossed Lips': ['party', 'elite'],
  'Cig': ['rebellious', 'grinder'],
  'Cohiba': ['elite', 'chill'],
  'Joint': ['chill', 'party'],
  'Pipe': ['nerdy', 'chill'],
  'Bubble Gum': ['goofy', 'chill'],
  'Bandana Mask': ['rebellious', 'warrior'],
  'Hannibal Mask': ['dark', 'spooky'],
  'Copium Mask': ['degen', 'chaotic'],
  'Neckbeard': ['nerdy', 'degen'],
  'Stache': ['grinder', 'elite'],

  // Clothes
  'Astronaut': ['cosmic', 'grinder'],
  'Bathrobe': ['chill', 'degen'],
  'Bepe Army': ['warrior', 'wholesome'],
  'Bepe Suit': ['elite', 'wholesome'],
  'Born to Ride': ['rebellious', 'aggressive'],
  'Chia Farmer': ['wholesome', 'grinder'],
  'Drac': ['dark', 'spooky'],
  'El Presidente': ['elite', 'warrior'],
  'Firefighter Uniform': ['wholesome', 'warrior'],
  "God's Robe": ['mystical', 'elite'],
  'Goose Suit': ['goofy', 'chaotic'],
  'Gopher Suit': ['goofy', 'nerdy'],
  'Leather Jacket': ['rebellious', 'dark'],
  'Ninja Turtle Fit': ['goofy', 'warrior'],
  'Pepe Suit': ['goofy', 'degen'],
  'Pickle Suit': ['goofy', 'chaotic'],
  'Proof of Prayer': ['wholesome', 'mystical'],
  'Roman Drip': ['warrior', 'elite'],
  'Ronin': ['warrior', 'dark'],
  'Sonic Suit': ['goofy', 'grinder'],
  'Sports Jacket': ['elite', 'chill'],
  'Straitjacket': ['chaotic', 'dark'],
  'Suit': ['elite', 'grinder'],
  'Super Saiyan Uniform': ['aggressive', 'cosmic'],
  'SWAT Gear': ['warrior', 'aggressive'],
  'Tank Top': ['chill', 'aggressive'],
  'Tee': ['chill', 'degen'],
  'Topless': ['chill', 'rebellious'],
  'Viking Armor': ['warrior', 'aggressive'],
  'Wizard Drip': ['mystical', 'dark'],

  // Extras
  'GFY Right': ['rebellious', 'aggressive'],
  'GFY Left': ['rebellious', 'aggressive'],
  'Diamond': ['elite', 'degen'],
  'Handgun': ['aggressive', 'dark'],
  'Orange': ['wholesome', 'party'],
  'TangTalk': ['nerdy', 'wholesome'],
  'Coffee': ['grinder', 'chill'],
  'Goose': ['goofy', 'chaotic'],
  'Seedling': ['wholesome', 'grinder'],
  'Wings': ['cosmic', 'mystical'],

  // Backgrounds (scene)
  'Hell': ['dark', 'spooky'],
  'Moon': ['cosmic', 'degen'],
  'Casino': ['degen', 'party'],
  'Wizard Tower': ['mystical', 'dark'],
  'Matrix': ['nerdy', 'dark'],
  'Moms Basement': ['nerdy', 'degen'],
  'NYSE Pump': ['elite', 'degen'],
  'NYSE Dump': ['dark', 'degen'],
  'NYSE Rug': ['chaotic', 'degen'],
  'Chia Farm': ['wholesome', 'grinder'],
  'Orange Grove': ['wholesome', 'party'],
  'Bepe Barracks': ['warrior', 'wholesome'],
  'Ronin Dojo': ['warrior', 'dark'],
  'Space Station': ['cosmic', 'nerdy'],
  'White House': ['elite', 'chaotic'],
  'Spell Room': ['mystical', 'dark'],
  'Nesting Grounds': ['wholesome', 'chill'],
  'Route 66': ['rebellious', 'chill'],
  'Silicon Data Center': ['nerdy', 'grinder'],
  'One Market': ['elite', 'grinder'],
  'Padded Cell': ['chaotic', 'dark'],
  'Circus': ['goofy', 'chaotic'],
  'Bunker': ['warrior', 'dark'],
  'Home Office': ['grinder', 'chill'],
  'Swamp': ['dark', 'goofy'],
  'Tavern': ['party', 'chill'],
  'Vaporwave': ['chill', 'cosmic'],
  'Viking Ship': ['warrior', 'aggressive'],
  'Volcano': ['aggressive', 'dark'],
};

// ── Mood Resolver ──

interface TraitInput {
  trait_type: string;
  value: string;
}

export interface MoodResult {
  primary: MoodTag;
  secondary: MoodTag;
  scores: Record<MoodTag, number>;
}

const DEFAULT_MOODS: MoodTag[] = ['chill', 'degen'];

/**
 * Resolve primary + secondary mood from a list of equipped traits.
 * Traits weighted by visual dominance tier. Extras can be comma-separated.
 */
export function resolveMoods(traits: TraitInput[]): MoodResult {
  const scores: Record<string, number> = {};
  for (const tag of MOOD_TAGS) scores[tag] = 0;

  for (const trait of traits) {
    const weight = TIER_WEIGHTS[trait.trait_type] ?? 1;

    // Extras can be comma-separated (e.g. "GFY Right, Diamond")
    const values = trait.trait_type === 'Extras'
      ? trait.value.split(',').map(v => v.trim())
      : [trait.value];

    for (const value of values) {
      const moods = TRAIT_MOODS[value];
      if (!moods) continue;
      for (const mood of moods) {
        scores[mood] += weight;
      }
    }
  }

  // Sort by score descending, then alphabetical for tiebreaker
  const sorted = [...MOOD_TAGS].sort((a, b) => {
    const diff = scores[b] - scores[a];
    if (diff !== 0) return diff;
    return a.localeCompare(b);
  });

  // If no traits matched anything, use defaults
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  if (totalScore === 0) {
    return {
      primary: DEFAULT_MOODS[0],
      secondary: DEFAULT_MOODS[1],
      scores: scores as Record<MoodTag, number>,
    };
  }

  // Ensure primary !== secondary
  const primary = sorted[0];
  const secondary = sorted[1] !== primary ? sorted[1] : sorted[2] ?? DEFAULT_MOODS[1];

  return {
    primary,
    secondary,
    scores: scores as Record<MoodTag, number>,
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/moodMap.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/lib/moodMap.ts src/lib/moodMap.test.ts
git commit -m "feat(names): add mood tag types and trait-to-mood resolver"
```

---

## Task 2: Create Mood Name Pools

**Files:**
- Create: `src/lib/moodPools.ts`
- Test: `src/lib/moodPools.test.ts`

**Step 1: Write the failing tests**

Create `src/lib/moodPools.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { MOOD_POOLS, MOOD_COMBOS, type MoodPool } from './moodPools';
import { MOOD_TAGS, type MoodTag } from './moodMap';
import { MAX_NAME_LENGTH } from './nameGenerator';

describe('MOOD_POOLS', () => {
  it('has a pool for every mood tag', () => {
    for (const tag of MOOD_TAGS) {
      expect(MOOD_POOLS[tag]).toBeDefined();
    }
  });

  it('every pool has at least 15 adjectives', () => {
    for (const [mood, pool] of Object.entries(MOOD_POOLS)) {
      expect(pool.adjectives.length).toBeGreaterThanOrEqual(15);
    }
  });

  it('every pool has at least 15 nouns', () => {
    for (const [mood, pool] of Object.entries(MOOD_POOLS)) {
      expect(pool.nouns.length).toBeGreaterThanOrEqual(15);
    }
  });

  it('every pool has at least 8 titles', () => {
    for (const [mood, pool] of Object.entries(MOOD_POOLS)) {
      expect(pool.titles.length).toBeGreaterThanOrEqual(8);
    }
  });

  it('every pool has at least 20 full names', () => {
    for (const [mood, pool] of Object.entries(MOOD_POOLS)) {
      expect(pool.fullNames.length).toBeGreaterThanOrEqual(20);
    }
  });

  it('every pool has a non-empty hint', () => {
    for (const [mood, pool] of Object.entries(MOOD_POOLS)) {
      expect(pool.hint.length).toBeGreaterThan(0);
    }
  });

  it('no full name exceeds MAX_NAME_LENGTH', () => {
    for (const [mood, pool] of Object.entries(MOOD_POOLS)) {
      for (const name of pool.fullNames) {
        expect(name.length, `"${name}" in ${mood} pool`).toBeLessThanOrEqual(MAX_NAME_LENGTH);
      }
    }
  });

  it('no adjective + space + noun exceeds MAX_NAME_LENGTH', () => {
    for (const [mood, pool] of Object.entries(MOOD_POOLS)) {
      for (const adj of pool.adjectives) {
        for (const noun of pool.nouns) {
          const combo = `${adj} ${noun}`;
          expect(combo.length, `"${combo}" in ${mood} pool`).toBeLessThanOrEqual(MAX_NAME_LENGTH);
        }
      }
    }
  });

  it('no title + space + noun exceeds MAX_NAME_LENGTH', () => {
    for (const [mood, pool] of Object.entries(MOOD_POOLS)) {
      for (const title of pool.titles) {
        for (const noun of pool.nouns) {
          const combo = `${title} ${noun}`;
          expect(combo.length, `"${combo}" in ${mood} pool`).toBeLessThanOrEqual(MAX_NAME_LENGTH);
        }
      }
    }
  });
});

describe('MOOD_COMBOS', () => {
  it('has at least 40 combo entries', () => {
    let count = 0;
    for (const primary of Object.keys(MOOD_COMBOS)) {
      count += Object.keys(MOOD_COMBOS[primary as MoodTag] ?? {}).length;
    }
    expect(count).toBeGreaterThanOrEqual(40);
  });

  it('every combo bonus name is within MAX_NAME_LENGTH', () => {
    for (const [primary, secondaries] of Object.entries(MOOD_COMBOS)) {
      for (const [secondary, names] of Object.entries(secondaries!)) {
        for (const name of names) {
          expect(name.length, `"${name}" in ${primary}+${secondary}`).toBeLessThanOrEqual(MAX_NAME_LENGTH);
        }
      }
    }
  });

  it('every combo has at least 4 bonus names', () => {
    for (const [primary, secondaries] of Object.entries(MOOD_COMBOS)) {
      for (const [secondary, names] of Object.entries(secondaries!)) {
        expect(names.length, `${primary}+${secondary}`).toBeGreaterThanOrEqual(4);
      }
    }
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/moodPools.test.ts`
Expected: FAIL — module `./moodPools` not found

**Step 3: Write the implementation**

Create `src/lib/moodPools.ts` with all 16 mood pools and ~57 combo bonus pools from the design doc (`docs/plans/2026-03-01-mood-name-randomizer-design.md`, Sections 7 and 8).

```typescript
/**
 * Mood Name Pools — 16 mood-themed word banks + combo bonus names
 *
 * Culture regions: crypto, gaming, internet culture, Wojak lore, Tang Gang, Chia lore.
 * All names and combos ≤15 characters (MAX_NAME_LENGTH).
 */

import type { MoodTag } from './moodMap';

export interface MoodPool {
  adjectives: string[];
  nouns: string[];
  titles: string[];
  fullNames: string[];
  hint: string;
}

export const MOOD_POOLS: Record<MoodTag, MoodPool> = {
  aggressive: {
    hint: 'e.g. Rage Quit',
    adjectives: [
      'Rekt', 'Savage', 'Brutal', 'Feral', 'Raw', 'Merciless', 'Lethal',
      'Wicked', 'Rabid', 'Ruthless', 'Mad', 'Primal', 'Bloody', 'Grim',
      'Iron', 'Nuclear', 'Unhinged', 'Fierce',
    ],
    nouns: [
      'Rage', 'Fury', 'Hands', 'Beast', 'Mode', 'Fist', 'Storm', 'Pain',
      'Carnage', 'Strike', 'Havoc', 'Wreck', 'Doom', 'Rush', 'Blitz',
      'Force', 'Sweat', 'Push',
    ],
    titles: [
      'Warlord', 'General', 'Sgt', 'Cpt', 'Killer', 'Slayer', 'Boss',
      'Conqueror', 'Reaper', 'Brute',
    ],
    fullNames: [
      'Rekt Em All', 'Mad Lad', 'No Mercy', 'Rage Quit', 'Git Gud',
      '1v1 Me Bro', 'Salt Mine', 'Tryhard Andy', 'Double Kill',
      'Spawn Kill', 'Feral Mode', 'Zero Chill', 'Iron Fist', 'Raw Dawg',
      'Total Rekt', 'Overkill', 'Pain Train', 'GG No Re', 'Final Boss',
      'Wreck It', 'Tilt Mode', 'Blood Moon', 'Brute Force', 'Pure Rage',
      'Combo Break',
    ],
  },

  rebellious: {
    hint: 'e.g. No Rules',
    adjectives: [
      'Rogue', 'Based', 'Punk', 'Wild', 'Feral', 'Outlaw', 'Untamed',
      'Defiant', 'Rebel', 'Reckless', 'Bold', 'Brazen', 'Raw', 'Loose',
      'Free', 'Lone', 'Stray', 'Foul',
    ],
    nouns: [
      'Anon', 'Rebel', 'Wolf', 'Outlaw', 'Riot', 'Punk', 'Rogue',
      'Menace', 'Cannon', 'Exile', 'Pirate', 'Raider', 'Vandal',
      'Flame', 'Spirit', 'Fury', 'Storm', 'Fren',
    ],
    titles: [
      'Don', 'Capo', 'Chief', 'Baron', 'Kingpin', 'OG', 'Bandit',
      'Outlaw', 'Rogue', 'Pirate',
    ],
    fullNames: [
      'No Rules', 'Send It', 'Cope Harder', 'Anon Rage', 'Stay Mad',
      'Touch Grass', 'Honk Honk', 'Not Ur Fren', 'Cry More',
      'Seethe Cope', 'Flip Table', 'GFY King', 'Mad Online',
      'Born Wild', 'Lone Wolf', 'Exit Scam', 'Road Rage', 'Bail Out',
      'On Sight', 'Foul Play', 'Not Sorry', "Ratio'd", 'Talk Cheap',
      'No Cap', 'Rebel OG',
    ],
  },

  degen: {
    hint: 'e.g. Moon Soon',
    adjectives: [
      'Diamond', 'Paper', 'Rekt', 'HODL', 'Degen', 'Whale', 'Rug',
      'Pump', 'Based', 'Moon', 'Bull', 'Bear', 'Ape', 'Shrimp', 'Bag',
      'Toxic', 'Broke', 'Rich',
    ],
    nouns: [
      'Hands', 'Bags', 'Maxi', 'Trader', 'Ape', 'HODL', 'Whale',
      'Pump', 'Dump', 'Moon', 'Stack', 'Vault', 'Coin', 'Pool',
      'Mine', 'Yield', 'Farm', 'Sats',
    ],
    titles: [
      'CEO', 'Whale', 'Shark', 'Alpha', 'Sigma', 'OG', 'Degen',
      'Maxi', 'Bull', 'Baron',
    ],
    fullNames: [
      'Rug Pulled', 'Ape In', 'Moon Soon', 'HODL Gang', 'Bag Holder',
      'Send Nodes', 'In It 4 Tech', 'Ngmi Fren', 'Wagmi Mode',
      '1 More Trade', 'Rekt Again', 'Paper Hands', 'Pump N Pray',
      'All In', 'Floor Price', 'Mint Fren', 'Gas Fee', 'Whale Alert',
      'Seed Phrase', 'No Ragrets', 'Tang Maxi', 'Pulp Gang',
      'Citrus Peel', 'Bepe Maxi', 'Honk Bag',
    ],
  },

  chill: {
    hint: 'e.g. Comfy Fren',
    adjectives: [
      'Comfy', 'Chill', 'Zen', 'Mellow', 'Cozy', 'Smooth', 'Sleepy',
      'Easy', 'Warm', 'Soft', 'Calm', 'Lazy', 'Quiet', 'Bliss',
      'Gentle', 'Slow', 'Still', 'Peace',
    ],
    nouns: [
      'Fren', 'Vibes', 'Mode', 'Zone', 'Life', 'Soul', 'Wave',
      'Dream', 'Cloud', 'Breeze', 'Flow', 'Mood', 'Sage', 'Brain',
      'Spirit', 'Aura', 'Haven', 'Rest',
    ],
    titles: [
      'Master', 'Guru', 'Sensei', 'Elder', 'Sage', 'Chief', 'Captain',
      'Saint', 'Blessed', 'Pure',
    ],
    fullNames: [
      'Comfy Fren', 'Vibe Check', 'Feels Good', 'Easy Mode', 'No Stress',
      'All Good', 'Stay Comfy', 'Zen Mode', 'Chill Pill', 'Good Vibes',
      'Smooth Brain', 'Nap King', 'AFK Life', 'Idle Mode', 'Low Effort',
      'Zero Rush', 'Just Vibin', 'Stay Cozy', 'Pillow Fort',
      'Snooze King', 'Tea Time', 'Slow Roll', 'Soft Hands',
      'Inner Peace', 'Cloud Nine',
    ],
  },

  goofy: {
    hint: 'e.g. Honk Pilled',
    adjectives: [
      'Honk', 'Turbo', 'Mega', 'Giga', 'Ultra', 'Wacky', 'Cursed',
      'Weird', 'Clown', 'Meme', 'Rare', 'Epic', 'Super', 'Cringe',
      'Bruh', 'Sussy', 'Smol', 'Chonk',
    ],
    nouns: [
      'Goblin', 'NPC', 'Clown', 'Brain', 'Hands', 'Lord', 'Fiend',
      'Maniac', 'Enjoyer', 'Moment', 'Vibes', 'Gang', 'Unit',
      'Legend', 'Bot', 'Honk', 'Fren', 'Lad',
    ],
    titles: [
      'King', 'Lord', 'Chief', 'Supreme', 'Grand', 'Mega', 'Ultra',
      'Emperor', 'Captain', 'Mayor',
    ],
    fullNames: [
      'Honk Pilled', 'Clown World', 'This Is Fine', 'Rare Pepe',
      'NPC Brain', 'Weird Flex', 'Skill Issue', 'Bruh Moment',
      'Copium Max', 'Sussy Baka', 'Giga Brain', 'Goose Loose',
      'Down Bad', 'Sneed Mode', 'OK Boomer', 'Meme Lord',
      'Turbo Honk', 'Epic Fail', 'Big If True', 'No Cap',
      'L + Ratio', 'Deez Nuts', '404 Brain', 'Trust Me Bro',
      'Smooth Move',
    ],
  },

  elite: {
    hint: 'e.g. Boss Mode',
    adjectives: [
      'Alpha', 'Sigma', 'Prime', 'Grand', 'Royal', 'Top', 'Big',
      'Whale', 'Shark', 'Bull', 'Boss', 'Chief', 'Gold', 'Lux',
      'Rich', 'Noble', 'High', 'Peak',
    ],
    nouns: [
      'Fund', 'Stack', 'Bags', 'Money', 'Class', 'Suite', 'Club',
      'Gang', 'Mode', 'Mogul', 'Throne', 'Empire', 'Crown', 'Power',
      'Maxi', 'Titan', 'Chad', 'King',
    ],
    titles: [
      'CEO', 'CFO', 'Don', 'Duke', 'Baron', 'Lord', 'Prince',
      'Count', 'Mogul', 'Tycoon',
    ],
    fullNames: [
      'Wolf of Wall', 'CEO of Bags', 'Bull Chad', 'Whale Alert',
      'Big Money', 'Top Trader', 'Stack King', 'Sigma Male',
      'Alpha Gains', 'Old Money', 'New Money', 'Power Move',
      'Boss Mode', 'Royal Flush', 'Profit King', 'Market Cap',
      'Blue Chip', 'Early Bird', 'Smart Money', 'Tang Baron',
      'Bepe Elite', 'Pump King', 'Bag Secured', 'Net Worth',
      'Rank One',
    ],
  },

  dark: {
    hint: 'e.g. Void Walker',
    adjectives: [
      'Dark', 'Shadow', 'Void', 'Grim', 'Doom', 'Dread', 'Fell',
      'Bleak', 'Ashen', 'Black', 'Hollow', 'Pale', 'Ghost', 'Dead',
      'Lost', 'Faded', 'Numb', 'Cold',
    ],
    nouns: [
      'Lord', 'Knight', 'Walker', 'King', 'Reaper', 'Shade', 'Wraith',
      'Bane', 'Soul', 'Edge', 'Doom', 'Night', 'Abyss', 'Crypt',
      'Husk', 'Echo', 'End', 'Fren',
    ],
    titles: [
      'Lord', 'Baron', 'Count', 'Overlord', 'Master', 'Regent',
      'Archon', 'Prince', 'Warden', 'Tyrant',
    ],
    fullNames: [
      'Void Walker', 'Dark Lord', 'Doom Mode', 'Edge Lord',
      'Shadow Fren', 'Dead Inside', 'Doomer Mode', 'No Hope',
      'Its Over', 'Black Pill', 'Final Form', 'Dark Soul',
      'Game Over', 'You Died', 'Hollow Man', 'Grim Fren',
      'Night King', 'Fade Away', 'Gone Dark', 'Cold Hands',
      'Lost Cause', 'Soul Rekt', 'The End', 'No Return',
      'Dark Wojak',
    ],
  },

  mystical: {
    hint: 'e.g. Rune Master',
    adjectives: [
      'Arcane', 'Mystic', 'Elder', 'Ancient', 'Rune', 'Crystal',
      'Frost', 'Flame', 'Storm', 'Shadow', 'Astral', 'Ether', 'Chaos',
      'Blood', 'Iron', 'Stone', 'Spell', 'Fey',
    ],
    nouns: [
      'Wizard', 'Mage', 'Sage', 'Seer', 'Monk', 'Oracle', 'Druid',
      'Shaman', 'Walker', 'Blade', 'Eye', 'Born', 'Master', 'Guard',
      'Ward', 'Weaver', 'Cast', 'Fren',
    ],
    titles: [
      'Archmage', 'Elder', 'Sage', 'Oracle', 'High', 'Grand',
      'Ancient', 'Seer', 'Keeper', 'Lore',
    ],
    fullNames: [
      'Arcane Chad', 'Rune Master', 'Mana Burn', 'Cast Fren',
      'Spell Slap', 'Wizard OG', 'Dark Magic', 'Ice Wizard',
      'Fire Sage', 'Moon Druid', 'Soul Reaver', 'Mind Blast',
      'Potion Lord', 'Ether Fren', 'Chaos Mage', 'XP Farm',
      'Loot Drop', 'Magic Find', 'Buff Stack', 'Heal Bot',
      'Nerf This', 'Mana Pool', 'Crit Hit', 'Spell Book',
      'Rune Chad',
    ],
  },

  warrior: {
    hint: 'e.g. Bravo Six',
    adjectives: [
      'Iron', 'Steel', 'Brave', 'True', 'Sworn', 'Battle', 'War',
      'Siege', 'Field', 'Recon', 'Delta', 'Bravo', 'Grunt', 'Heavy',
      'Sharp', 'Hard', 'Rough', 'Grit',
    ],
    nouns: [
      'Squad', 'Force', 'Guard', 'Arms', 'Chief', 'Six', 'Actual',
      'Dog', 'Shield', 'Blade', 'Sword', 'Helm', 'Spear', 'Wall',
      'Gate', 'Tower', 'Front', 'March',
    ],
    titles: [
      'Sgt', 'Cpt', 'Major', 'Colonel', 'General', 'Pvt', 'Cmdr',
      'Lt', 'Warlord', 'Marshal',
    ],
    fullNames: [
      'Sgt Degen', 'Iron Hands', 'Bravo Six', 'Tank Chad',
      'Shell Shock', 'Trench Fren', 'Boot Camp', 'War Ape',
      'Delta OG', 'Foxhound', 'Hawk Eye', 'Dog Tag', 'Lead Rain',
      'Stealth OG', 'Honor Bound', 'Front Line', 'No Retreat',
      'Hold Fast', 'War Paint', 'Battle Cry', 'Spartan OG',
      'Ronin Path', 'Viking OG', 'Shield Wall', 'Last Stand',
    ],
  },

  cosmic: {
    hint: 'e.g. Moon Boy',
    adjectives: [
      'Astro', 'Cosmo', 'Lunar', 'Solar', 'Nebula', 'Orbit', 'Star',
      'Nova', 'Void', 'Plasma', 'Comet', 'Cosmic', 'Zero G', 'Mars',
      'Pulsar', 'Quasar', 'Dark', 'Hyper',
    ],
    nouns: [
      'Pilot', 'Cadet', 'Walker', 'Rider', 'Naut', 'Core', 'Sage',
      'Base', 'Force', 'Bound', 'Born', 'Light', 'Flare', 'Dust',
      'Wave', 'Rift', 'Gate', 'Jump',
    ],
    titles: [
      'Astro', 'Cosmo', 'Star', 'Cmdr', 'Captain', 'Pilot',
      'Admiral', 'Chief', 'Zero', 'Cosmic',
    ],
    fullNames: [
      'Moon Boy', 'Space Cadet', 'Star Born', 'Dark Matter',
      'Moon Soon', 'Zero G Chad', 'Galaxy Brain', 'Solar Flare',
      'Void Pilot', 'Nova Burst', 'Orbit Mode', 'Cosmic Fren',
      'Light Speed', 'Warp Drive', 'Mars Degen', 'Star Dust',
      'Moon Fren', 'Deep Space', 'Final Front', 'Hyper Jump',
      'To The Moon', 'Rocket Fren', 'Pulsar OG', 'Nebula King',
      'Event Hrzn',
    ],
  },

  wholesome: {
    hint: 'e.g. Tang Fren',
    adjectives: [
      'Good', 'True', 'Noble', 'Brave', 'Kind', 'Pure', 'Honest',
      'Warm', 'Bright', 'Sweet', 'Fresh', 'Green', 'Rich', 'Full',
      'Ripe', 'Golden', 'Blessed', 'Sacred',
    ],
    nouns: [
      'Fren', 'Heart', 'Soul', 'Hand', 'Seed', 'Farm', 'Hope',
      'Faith', 'Light', 'Guard', 'Crew', 'Guild', 'Folk', 'Root',
      'Bloom', 'Grove', 'Field', 'Home',
    ],
    titles: [
      'Farmer', 'Chief', 'Elder', 'Saint', 'Guardian', 'Captain',
      'Steward', 'Keeper', 'Warden', 'Pastor',
    ],
    fullNames: [
      'Chia Farmer', 'Seed Sower', 'Tang Fren', 'Good Vibes',
      'Fren Zone', 'Kind Heart', 'Farm Life', 'Plot Gang',
      'Green Thumb', 'Grow Mode', 'Harvest OG', 'Honk Love',
      'Orange Fren', 'Pulp Heart', 'True Fren', 'Fren Chain',
      'Block Fren', 'Full Bloom', 'Fresh Seed', 'Pure Heart',
      'Fren Gang', 'Home Grown', 'Tang Heart', 'Grove King',
      'Proof of Fk',
    ],
  },

  nerdy: {
    hint: 'e.g. Big Brain',
    adjectives: [
      'Big', 'Mega', 'Giga', 'Nano', 'Hyper', 'Turbo', 'Pixel',
      'Cyber', 'Data', 'Code', 'Tech', 'Hash', 'Node', 'Stack',
      'Debug', 'Root', 'Core', 'Sync',
    ],
    nouns: [
      'Brain', 'Stack', 'Node', 'Bot', 'Byte', 'Chip', 'Core',
      'Code', 'Hash', 'Grid', 'Net', 'Link', 'Port', 'Drive',
      'Cache', 'Loop', 'Fork', 'Merge',
    ],
    titles: [
      'Admin', 'Root', 'Dev', 'Mod', 'Sys', 'Arch', 'Lead',
      'Chief', 'Master', 'Sudo',
    ],
    fullNames: [
      'Big Brain', 'Stack Fren', 'Node Runner', 'Git Push',
      '404 Fren', 'Sudo Mode', 'Giga Brain', 'Debug King',
      'Fork It', 'Merge Chad', 'Hash Rate', 'Dev Mode',
      'Code Monk', 'Pixel Fren', 'Based Node', 'Loop King',
      'Ctrl Alt', 'Full Stack', 'Root Admin', 'Core Dump',
      'Byte Size', 'Tech Debt', 'No Bugs', 'Ship It',
      'Neuro Link',
    ],
  },

  chaotic: {
    hint: 'e.g. This Is Fine',
    adjectives: [
      'Cursed', 'Toxic', 'Unhinged', 'Wild', 'Feral', 'Chaos',
      'Rogue', 'Loose', 'Broke', 'Fried', 'Cooked', 'Scuffed',
      'Janky', 'Raw', 'Glitch', 'Bug', 'Lag', 'Warp',
    ],
    nouns: [
      'Mode', 'Goblin', 'Gremlin', 'Fiend', 'Hands', 'Brain',
      'Logic', 'Sense', 'Plan', 'Luck', 'Move', 'Play', 'Take',
      'Shot', 'Bet', 'Call', 'Flip', 'Twist',
    ],
    titles: [
      'Lord', 'King', 'Chief', 'Captain', 'Master', 'Agent',
      'Chaos', 'Mad', 'Wild', 'Dr',
    ],
    fullNames: [
      'This Is Fine', 'Chaos Mode', 'Im Fine', 'Totally Fine',
      'Not Great', 'Just Vibin', 'Cooked Mode', 'Fried Brain',
      'Wild Card', 'Bad Idea', 'Yolo Mode', 'Oops Mode', 'My Bad',
      'Scuffed OG', 'Glitch Fren', 'Lag Spike', 'Skill Issue',
      'Down Bad', 'Cope Mode', 'Trust Me', 'Just Mint', 'Why Not',
      'Full Send', 'No Plan', 'Its Fine',
    ],
  },

  spooky: {
    hint: 'e.g. Ghost Fren',
    adjectives: [
      'Ghost', 'Dead', 'Pale', 'Hollow', 'Grim', 'Dread', 'Wicked',
      'Haunted', 'Cursed', 'Shadow', 'Bone', 'Skull', 'Dark', 'Eerie',
      'Fell', 'Creep', 'Night', 'Rot',
    ],
    nouns: [
      'Reaper', 'Wraith', 'Shade', 'Ghoul', 'Bane', 'Fang', 'Crypt',
      'Tomb', 'Husk', 'Haunt', 'Dread', 'Fiend', 'Lurker', 'Creep',
      'Howl', 'Fren', 'Mode', 'King',
    ],
    titles: [
      'Lord', 'Baron', 'Count', 'Overlord', 'Master', 'Warden',
      'Keeper', 'Dr', 'Grave', 'Bone',
    ],
    fullNames: [
      'Dead Inside', 'Ghost Fren', 'Skull Mode', 'No Pulse',
      'Game Over', 'You Died', 'Boo Fren', 'Crypt King',
      'Bone Zone', 'Grim Vibes', 'Haunted OG', 'Night Mode',
      'Sleep Tight', 'RIP Fren', 'Cold Body', 'Fade Black',
      'Soul Gone', 'Void Born', 'Tomb Raider', 'Pale King',
      'Grave Yard', 'Rest In Rip', 'Dead Mint', 'Specter OG',
      'Bone Broth',
    ],
  },

  party: {
    hint: 'e.g. LFG Mode',
    adjectives: [
      'Turbo', 'Hyper', 'Lit', 'Hype', 'Wild', 'Loud', 'Mad', 'Hot',
      'Live', 'Fizzy', 'Fresh', 'Juicy', 'Tangy', 'Zesty', 'Crispy',
      'Spicy', 'Drunk', 'Wasted',
    ],
    nouns: [
      'Mode', 'King', 'Gang', 'Squad', 'Crew', 'Fren', 'Chad', 'OG',
      'Vibes', 'Life', 'Zone', 'Hour', 'Night', 'Time', 'Bash',
      'Rave', 'Fest', 'Wave',
    ],
    titles: [
      'DJ', 'MC', 'King', 'Chief', 'Captain', 'Mayor', 'Boss',
      'Don', 'Host', 'Legend',
    ],
    fullNames: [
      'LFG Mode', 'Wagmi Fren', 'Party Fren', 'Up Only', 'Pump It',
      'Happy Hour', 'Moon Juice', 'Tang Party', 'OJ Gang',
      'Zest Fest', 'Citrus King', 'Juice Box', 'Pulp Mode',
      'Tangy OG', 'Honk Party', 'Hold My Beer', 'Full Send',
      'Lets Go', 'Good Times', 'Hot Streak', 'Night Owl',
      'Hype Beast', 'Lit Mode', 'Dance Floor', 'LFG!',
    ],
  },

  grinder: {
    hint: 'e.g. Grind Mode',
    adjectives: [
      'Hard', 'Fast', 'True', 'Grit', 'Hustle', 'Sweat', 'Sharp',
      'Keen', 'Driven', 'Steady', 'Core', 'Deep', 'Dense', 'Locked',
      'Solid', 'Raw', 'Non Stop', 'Full',
    ],
    nouns: [
      'Mode', 'Grind', 'Hustle', 'Hours', 'Sweat', 'Work', 'Push',
      'Focus', 'Drive', 'Edge', 'Lock', 'Pace', 'Run', 'Sprint',
      'Climb', 'Stack', 'Gain', 'Rep',
    ],
    titles: [
      'Master', 'Pro', 'Veteran', 'OG', 'Ace', 'Captain', 'Chief',
      'Lead', 'Boss', 'Coach',
    ],
    fullNames: [
      'No Sleep', 'Grind Mode', 'Speed Run', 'Sweat Lord',
      'Pro Gamer', 'Try Hard', 'One More Run', 'Max Level',
      'Farm Life', 'Loot Grind', 'XP Boost', 'Boss Rush',
      'Hard Core', 'No Days Off', 'All Grind', 'Late Night',
      'First Clear', 'World First', 'Rank Grind', 'Rep Max',
      'The Hustle', 'Non Stop', 'Eyes Open', 'Time Attack',
      'AFK? Never',
    ],
  },
};

// ── Mood Combo Bonus Names ──
// Special names that only appear when primary + secondary mood match.

export const MOOD_COMBOS: Partial<Record<MoodTag, Partial<Record<MoodTag, string[]>>>> = {
  rebellious: {
    aggressive: ['F This', 'No Cap OG', 'Flip Table', 'Mad Online', 'Stay Toxic'],
    party: ['Hold My Beer', 'Bad Choices', 'YOLO King', 'Party Foul', 'No Regrets'],
    degen: ['Exit Scam', 'Rug Rebel', 'Pump Pirate', 'Rogue Trade', 'Tang Bandit'],
    chill: ['Dont Care', 'Zero Fks', 'Laid Back', 'Stay Based', 'Muted Chat'],
  },
  aggressive: {
    degen: ['Ape Rage', 'Rekt Fury', 'Margin Call', 'Liquidated', 'Panic Sell'],
    warrior: ['War Machine', 'Iron Storm', 'Brute Squad', 'Total War', 'No Quarter'],
    chaotic: ['War Crime', 'Scorched', 'No Chill', 'Tilt God', 'Rage Quit'],
    dark: ['Grim Reaper', 'Death Wish', 'Soul Crush', 'Doom Fist', 'Kill Shot'],
    cosmic: ['Star Wars', 'Nova Bomb', 'Solar Flare', 'Meteor OG', 'Death Star'],
    rebellious: ['Fk Around', 'Rekt Em', 'Raw Fury', 'Break Stuff', 'No Mercy'],
  },
  degen: {
    chill: ['Zen Trader', 'HODL Zen', 'Numb Bags', 'Comfy Degen', 'AFK Gains'],
    party: ['Casino Fren', 'Lucky Degen', 'Jackpot OG', 'All In', 'Pump N Dump'],
    goofy: ['Ape Brain', 'Smooth Ape', 'Meme Coin', 'Degen Honk', 'Rare Honk'],
    elite: ['Whale Mode', 'Smart Money', 'Alpha Leak', 'Insider OG', 'Stack Chad'],
    dark: ['Bag Rekt', 'Rug Victim', 'Bear Fren', 'Down Only', 'Cope Bag'],
    wholesome: ['Tang Degen', 'Farm Ape', 'Seed Maxi', 'Chia Chad', 'Green Degen'],
  },
  elite: {
    dark: ['Dark Baron', 'Shadow CEO', 'Void Mogul', 'Night Fund', 'Grim Stack'],
    warrior: ['King Slayer', 'Iron Duke', 'War Baron', 'Crown Chad', 'Throne Room'],
    chill: ['Old Money', 'Smooth Boss', 'Zen CEO', 'Easy Stack', 'Chill Duke'],
    wholesome: ['Tang King', 'Bepe Baron', 'Kind Duke', 'Green Baron', 'Noble Fren'],
    degen: ['Whale Mode', 'Tang Baron', 'Bepe Mogul', 'Bag Lord', 'Stack Lord'],
  },
  goofy: {
    chaotic: ['Honk Chaos', 'NPC Moment', 'Clown Fiesta', 'Brain Worm', 'Spaghetti'],
    degen: ['Ape Brain', 'Smooth Ape', 'Meme Coin', 'Degen Honk', 'Rare Honk'],
    chill: ['Vibes Only', 'Goofy Ahh', 'Silly Goose', 'Honk Chill', 'Soft Honk'],
    nerdy: ['Bug Report', '404 Brain', 'Stack Over', 'Copy Paste', 'Sudo Honk'],
    party: ['Honk Fest', 'Meme Party', 'Clown Hour', 'Goose Gang', 'Fun Mode'],
  },
  dark: {
    mystical: ['Void Mage', 'Death Magic', 'Soul Drain', 'Dark Ritual', 'Fell Sage'],
    spooky: ['Dead Mall', 'Bone Lord', 'Night Fren', 'Pale Rider', 'Ghost Walk'],
    degen: ['Bear Market', 'Rug Night', 'Dark Pool', 'Dump Lord', 'Grave Bag'],
    chaotic: ['Asylum OG', 'Mad World', 'Chaos Void', 'Cursed Fren', 'Broke Brain'],
  },
  mystical: {
    warrior: ['Spell Blade', 'Rune Knight', 'War Mage', 'Battle Sage', 'Mana Tank'],
    dark: ['Shadow Mage', 'Void Cast', 'Necro Fren', 'Death Rune', 'Fell Magic'],
    elite: ['Grand Mage', 'Arch Sage', 'Lore Baron', 'Spell King', 'Mana Lord'],
    goofy: ['Honk Magic', 'Meme Spell', 'Goose Mage', 'Silly Sage', 'Bonk Wand'],
  },
  wholesome: {
    grinder: ['Farm OG', 'Seed Gang', 'Plot Fren', 'Grow Stack', 'Field Day'],
    degen: ['Tang Degen', 'Farm Ape', 'Seed Maxi', 'Chia Chad', 'Green Degen'],
    party: ['Tang Party', 'OJ Fest', 'Grove Bash', 'Fren Fest', 'Harvest Ale'],
    warrior: ['Shield Fren', 'Guard Duty', 'Brave Fren', 'Tank Fren', 'Iron Guard'],
    mystical: ['Seed Prayer', 'Soul Farm', 'Sacred Plot', 'Green Light', 'Bless Fren'],
  },
  cosmic: {
    degen: ['Moon Ape', 'Astro Degen', 'Space Bag', 'Star Mint', 'Launch Pad'],
    aggressive: ['Star Wars', 'Nova Bomb', 'Solar Flare', 'Meteor OG', 'Death Star'],
    chill: ['Star Gazer', 'Float Mode', 'Orbit Zen', 'Space Chill', 'Void Calm'],
    mystical: ['Star Sage', 'Moon Druid', 'Astral Mage', 'Ether Sage', 'Cosmo Sage'],
  },
  nerdy: {
    degen: ['Hash Fren', 'Node Degen', 'Stack Maxi', 'Git Rekt', 'Dev Ape'],
    goofy: ['Bug Report', '404 Brain', 'Stack Over', 'Copy Paste', 'Sudo Honk'],
    grinder: ['Code Monk', 'Stack Grind', 'Hash Grind', 'Dev Hours', 'Ship Fast'],
    dark: ['Dark Code', 'Void Stack', 'Dead Code', 'Null Fren', 'Ghost Bug'],
  },
  party: {
    chill: ['Juice Bar', 'Tang Chill', 'Smooth OJ', 'Sunset OG', 'Easy Night'],
    degen: ['Casino Fren', 'Lucky Mint', 'Moon Juice', 'Pump Fest', 'Wagmi Bash'],
    rebellious: ['Riot Fest', 'Punk Show', 'Wild Night', 'Mosh Pit', 'Stage Dive'],
  },
  chaotic: {
    dark: ['Asylum OG', 'Mad World', 'Chaos Void', 'Cursed Fren', 'Broke Brain'],
    goofy: ['Honk Chaos', 'Brain Rot', 'Spaghetti', 'Glitch Art', 'Bug Feature'],
    aggressive: ['War Crime', 'Scorched', 'Tilt God', 'Rage Quit', 'No Chill'],
  },
  grinder: {
    warrior: ['Iron Grind', 'War Sweat', 'Battle Rep', 'Hard March', 'Siege Mode'],
    degen: ['Farm Stack', 'Mine Mode', 'Yield Grind', 'Pool Sweat', 'DCA Robot'],
    nerdy: ['Code Monk', 'Stack Grind', 'Hash Grind', 'Dev Hours', 'Ship Fast'],
  },
  warrior: {
    dark: ['Dark Knight', 'Shadow Ops', 'Night Raid', 'Grim March', 'Fell Blade'],
    wholesome: ['Shield Fren', 'Guard Duty', 'Brave Fren', 'Tank Fren', 'Iron Guard'],
    aggressive: ['War Machine', 'Iron Storm', 'Total War', 'No Quarter', 'Brute Squad'],
  },
  spooky: {
    dark: ['Grave Lord', 'Death King', 'Bone Baron', 'Night Shade', 'Fell Haunt'],
    goofy: ['Boo Honk', 'Spooky Honk', 'Ghost Honk', 'Skull Meme', 'Dead Meme'],
  },
};
```

**IMPORTANT:** Before committing, manually verify that **every** word in adjectives, nouns, titles arrays plus a space plus the longest word from the paired array stays ≤15 characters. The test will catch this but be mindful during authoring. Keep individual words to max 7 characters so that `word + space + word` ≤ 15.

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/moodPools.test.ts`
Expected: All tests PASS. If any name exceeds 15 chars, fix it.

**Step 5: Commit**

```bash
git add src/lib/moodPools.ts src/lib/moodPools.test.ts
git commit -m "feat(names): add 16 mood pools and 57 combo bonus pools"
```

---

## Task 3: Evolve Name Generator to Use Mood System

**Files:**
- Modify: `src/lib/nameGenerator.ts` (lines 1-35)
- Modify: `src/lib/nameGenerator.test.ts` (lines 1-29)

**Step 1: Write the failing tests**

Add to `src/lib/nameGenerator.test.ts` — new `describe` block:

```typescript
import { resolveMoods } from './moodMap';
import { MOOD_POOLS } from './moodPools';

// Add these new test blocks AFTER the existing ones (don't remove existing tests)

describe('generateRandomName with traits', () => {
  it('accepts MetadataAttribute[] and returns a name', () => {
    const traits = [
      { trait_type: 'Clothes', value: 'SWAT Gear', source: 'map' as const, raw: '' },
      { trait_type: 'Head', value: 'Beer Hat', source: 'map' as const, raw: '' },
    ];
    const name = generateRandomName(traits);
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
    expect(name.length).toBeLessThanOrEqual(MAX_NAME_LENGTH);
  });

  it('still works with no arguments (backward compat)', () => {
    const name = generateRandomName();
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
  });

  it('generates varied names across 30 calls', () => {
    const traits = [
      { trait_type: 'Clothes', value: 'Suit', source: 'map' as const, raw: '' },
    ];
    const names = new Set(Array.from({ length: 30 }, () => generateRandomName(traits)));
    expect(names.size).toBeGreaterThan(3);
  });

  it('never exceeds MAX_NAME_LENGTH with traits', () => {
    const traits = [
      { trait_type: 'Clothes', value: 'Wizard Drip', source: 'map' as const, raw: '' },
      { trait_type: 'Head', value: 'Wizard Hat', source: 'map' as const, raw: '' },
      { trait_type: 'Face Wear', value: 'Wizard Glasses', source: 'map' as const, raw: '' },
      { trait_type: 'Background', value: 'Wizard Tower', source: 'map' as const, raw: '' },
    ];
    for (let i = 0; i < 50; i++) {
      const name = generateRandomName(traits);
      expect(name.length).toBeLessThanOrEqual(MAX_NAME_LENGTH);
    }
  });
});

describe('getPlaceholderHint with traits', () => {
  it('returns a mood-appropriate hint when given traits', () => {
    const traits = [
      { trait_type: 'Clothes', value: 'SWAT Gear', source: 'map' as const, raw: '' },
    ];
    const hint = getPlaceholderHint(traits);
    expect(hint.length).toBeGreaterThan(0);
  });

  it('still works with no arguments', () => {
    const hint = getPlaceholderHint();
    expect(hint.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run tests to verify the new tests fail (existing pass)**

Run: `npx vitest run src/lib/nameGenerator.test.ts`
Expected: New tests FAIL (type mismatch — generateRandomName doesn't accept trait arrays yet). Existing tests still PASS.

**Step 3: Update the implementation**

Modify `src/lib/nameGenerator.ts`:

```typescript
// Random name generator for Your Wojak NFTs
// Mood-aware: reads all traits, resolves moods, generates culturally rich names.

import { resolveMoods, type MoodTag } from './moodMap';
import { MOOD_POOLS, MOOD_COMBOS } from './moodPools';
import type { MoodPool } from './moodPools';

// Legacy import kept for backward compat (old clothing-only callers)
import { getNameTheme } from './nameThemes';

export const MAX_NAME_LENGTH = 15;

interface TraitInput {
  trait_type: string;
  value: string;
}

/**
 * Generate a random name from mood-resolved pools.
 *
 * @param traitsOrClothing - Array of trait objects (new) OR a clothing name string (legacy)
 */
export function generateRandomName(traitsOrClothing?: TraitInput[] | string): string {
  // Legacy path: string argument = clothing name (backward compat)
  if (typeof traitsOrClothing === 'string' || traitsOrClothing === undefined) {
    return generateFromMoods('chill', 'degen');
  }

  const { primary, secondary } = resolveMoods(traitsOrClothing);
  return generateFromMoods(primary, secondary);
}

function generateFromMoods(primary: MoodTag, secondary: MoodTag): string {
  const primaryPool = MOOD_POOLS[primary];
  const secondaryPool = MOOD_POOLS[secondary];
  const comboNames = MOOD_COMBOS[primary]?.[secondary] ?? [];

  const roll = Math.random();
  let name: string;

  if (roll < 0.25 && comboNames.length > 0) {
    // 25% — combo bonus name
    name = pick(comboNames);
  } else if (roll < 0.50) {
    // 25% — curated full name from primary pool
    name = pick(primaryPool.fullNames);
  } else if (roll < 0.75) {
    // 25% — adjective + noun (cross-mood blend)
    const adj = pick(primaryPool.adjectives);
    const noun = Math.random() < 0.7 ? pick(primaryPool.nouns) : pick(secondaryPool.nouns);
    name = `${adj} ${noun}`;
  } else if (roll < 0.90) {
    // 15% — title + noun
    const title = pick(primaryPool.titles);
    const noun = Math.random() < 0.5 ? pick(primaryPool.nouns) : pick(secondaryPool.nouns);
    name = `${title} ${noun}`;
  } else {
    // 10% — full name from secondary pool
    name = pick(secondaryPool.fullNames);
  }

  return name.slice(0, MAX_NAME_LENGTH);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get a placeholder hint, mood-aware when traits are provided.
 */
export function getPlaceholderHint(traitsOrClothing?: TraitInput[] | string): string {
  if (typeof traitsOrClothing === 'string' || traitsOrClothing === undefined) {
    const theme = getNameTheme(typeof traitsOrClothing === 'string' ? traitsOrClothing : undefined);
    return theme.hint;
  }

  const { primary } = resolveMoods(traitsOrClothing);
  return MOOD_POOLS[primary].hint;
}

// Everything below this line is unchanged — validateName, formatFullName, DID generator
```

Keep `validateName`, `formatFullName`, `generateDIDName`, `validateDIDName` unchanged.

**Step 4: Run ALL tests to verify everything passes**

Run: `npx vitest run src/lib/nameGenerator.test.ts`
Expected: ALL tests PASS (old + new)

**Step 5: Commit**

```bash
git add src/lib/nameGenerator.ts src/lib/nameGenerator.test.ts
git commit -m "feat(names): mood-aware name generation from all traits"
```

---

## Task 4: Wire Up MintFlowModal to Pass Full Traits

**Files:**
- Modify: `src/components/generator/MintFlowModal.tsx` (lines 300-301, 327, 337)

**Step 1: Read the current code to confirm exact lines**

Read `src/components/generator/MintFlowModal.tsx` lines 295-345 (already done above, but re-read to confirm nothing changed).

**Step 2: Make the edit**

In `src/components/generator/MintFlowModal.tsx`, the confirming step currently does:

```typescript
const clothingAttr = metadataAttributes.find(a => a.trait_type === 'Clothes');
const clothingName = clothingAttr?.value || '';
```

And uses `clothingName` in two places:
- Line 327: `placeholder={getPlaceholderHint(clothingName)}`
- Line 337: `const name = generateRandomName(clothingName);`

**Replace** lines 300-301 (the clothing extraction) — remove them entirely.

**Replace** line 327:
```typescript
// Before
placeholder={getPlaceholderHint(clothingName)}
// After
placeholder={getPlaceholderHint(metadataAttributes)}
```

**Replace** line 337:
```typescript
// Before
const name = generateRandomName(clothingName);
// After
const name = generateRandomName(metadataAttributes);
```

The `clothingAttr` and `clothingName` variables are no longer needed — remove them.

**Step 3: Build to verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/components/generator/MintFlowModal.tsx
git commit -m "feat(names): wire MintFlowModal to pass all traits to name generator"
```

---

## Task 5: Manual Smoke Test & Polish

**Step 1: Start the dev server**

Run: dev server (vite on localhost:5173)

**Step 2: Test the name randomizer**

1. Open the generator at `/generator`
2. Create a Wojak with Beer Hat + GFY Right + Tee + Screaming mouth
3. Click MINT → observe the name input
4. Click "Random" 10+ times — names should feel rebellious/aggressive, NOT casual
5. Create a Wojak with Wizard Drip + Wizard Hat + Wizard Glasses
6. Click "Random" 10+ times — names should feel mystical/dark
7. Create a Wojak with Suit + Crown + Gold Teeth
8. Click "Random" 10+ times — names should feel elite
9. Create a Wojak with no special traits (just Classic + Tee)
10. Click "Random" — should get reasonable default names (chill/degen)

**Step 3: Verify placeholder hints change with mood**

The input placeholder should show mood-appropriate hints (e.g. "e.g. Rune Master" for mystical, "e.g. Boss Mode" for elite).

**Step 4: Final commit if any polish needed**

```bash
git add -A
git commit -m "polish(names): final adjustments from smoke testing"
```

---

## Summary

| Task | Description | Files | Test |
|------|-------------|-------|------|
| 1 | Mood tags + trait-to-mood map + resolver | `moodMap.ts`, `moodMap.test.ts` | Unit |
| 2 | 16 mood pools + 57 combo pools | `moodPools.ts`, `moodPools.test.ts` | Unit |
| 3 | Evolve nameGenerator to use moods | `nameGenerator.ts`, `nameGenerator.test.ts` | Unit |
| 4 | Wire MintFlowModal to pass all traits | `MintFlowModal.tsx` | Build + existing |
| 5 | Manual smoke test + polish | — | Manual |
