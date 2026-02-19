# Wojak Combat System — Full Design Document

**Date:** 2025-02-18
**Status:** Awaiting approval
**Scope:** Port ClawCombat battle engine into Wojak.ink, add combat metadata to NFT minting, build turn-based battle system alongside existing community vote battles.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Combat Identity: How NFTs Become Fighters](#2-combat-identity)
3. [Point System: Traits + Colors → Type/Nature/Ability](#3-point-system)
4. [Move Selection at Mint Time](#4-move-selection)
5. [CHIP-0007 Metadata Extension](#5-metadata-extension)
6. [Generator UI Changes](#6-generator-ui-changes)
7. [Battle Engine (ClawCombat Port)](#7-battle-engine)
8. [AI Agent Auto-Battle](#8-ai-agent)
9. [Database Schema](#9-database-schema)
10. [API Endpoints](#10-api-endpoints)
11. [Frontend: Battle UI](#11-frontend-battle-ui)
12. [Migration: Existing NFTs](#12-migration-existing-nfts)
13. [Reference Data Files](#13-reference-data)
14. [Phased Rollout](#14-phased-rollout)

---

## 1. System Overview

Two battle systems coexist:

| System | Current? | How It Works |
|--------|----------|-------------|
| **Community Votes** | Exists today | NFTs get liked/disliked in feed. 24h blind battles compare net_score deltas. Winner gets organic likes. |
| **Combat Battles** (NEW) | To be built | Turn-based fights using moves, types, abilities. Manual or AI-agent controlled. Full ClawCombat engine port. |

Both systems share the same NFTs. A Wojak can be in a vote battle AND a combat battle simultaneously. They use different DB tables and different resolution logic.

### Architecture

```
Generator (mint time)
  ├── Trait selection → type points + nature points
  ├── Color selection → type points + nature points (via hue analysis)
  ├── Detail selection → small bonus points
  ├── System calculates: TYPE, NATURE, ABILITY
  ├── User chooses: 4 MOVES (from their type's move pool)
  └── All baked into CHIP-0007 metadata → IPFS → blockchain (immutable)

Database (mutable, progression)
  ├── Level (1-100, earned via XP)
  ├── XP (earned from battles)
  ├── ELO rating (1000 start, adjusted per battle)
  ├── Win/Loss record
  ├── Base stats (HP, Atk, Def, Sp.Atk, Sp.Def, Speed — scale with level)
  └── Current HP, status effects (per active battle)

Battle Engine (Cloudflare Worker)
  ├── Matchmaking (queue-based, ELO-adjacent pairing)
  ├── Turn execution (damage calc, status effects, ability triggers)
  ├── AI Strategist (for auto-battle mode)
  └── Resolution (XP award, ELO update, activity log)
```

---

## 2. Combat Identity

Every Phase 2 NFT ("Your Wojak") has a combat identity determined at mint time:

| Attribute | Source | Stored In | Mutable? |
|-----------|--------|-----------|----------|
| **Type** (1 of 18) | Trait + color point accumulation | NFT metadata (IPFS) | No — permanent |
| **Nature** (1 of 25) | Trait + color stat dimension accumulation | NFT metadata (IPFS) | No — permanent |
| **Ability** (1 of 36) | Auto-selected: offensive or defensive within type | NFT metadata (IPFS) | No — permanent |
| **Moves** (4 of ~8-12) | User chooses from their type's move pool | NFT metadata (IPFS) | No — permanent |
| **Level** | Starts at 1, grows via XP | Database | Yes |
| **XP** | Earned from combat battles | Database | Yes |
| **ELO** | Starts at 1000, adjusted per battle | Database | Yes |
| **Base Stats** | Calculated from type + nature + level | Computed at battle time | Derived |

### The 18 Types

NEUTRAL, FIRE, WATER, ELECTRIC, GRASS, ICE, MARTIAL, VENOM, EARTH, AIR, PSYCHE, INSECT, STONE, GHOST, DRAGON, SHADOW, METAL, MYSTIC

### The 25 Natures

Each nature boosts one stat +10% and reduces another -10%:

| Nature | +10% | -10% |
|--------|------|------|
| Sturdy | Defense | Sp.Atk |
| Defiant | Attack | Speed |
| Calculated | Sp.Atk | Attack |
| Tranquil | Sp.Def | Attack |
| Evasive | Speed | Attack |
| Savage | Attack | Sp.Def |
| Balanced | — | — |
| Focused | Sp.Atk | Defense |
| Mellow | Sp.Def | Speed |
| Rapid | Speed | Sp.Def |
| Brutal | Attack | Defense |
| Vigilant | Defense | Speed |
| Quiet | Sp.Atk | Speed |
| Alert | Speed | Sp.Atk |
| Impulsive | Attack | Sp.Atk |
| Energetic | Speed | Defense |
| Wild | Attack | Sp.Def |
| Relaxed | Defense | Sp.Def |
| Eccentric | Sp.Atk | Sp.Def |
| Innocent | Sp.Def | Defense |
| Fearless | Defense | Attack |
| Sluggish | Sp.Def | Speed |
| Silent | Sp.Atk | Defense |
| Stubborn | Defense | Sp.Atk |
| Grim | Sp.Def | Sp.Atk |

### The 36 Abilities (2 per type)

| Type | Ability A (offensive) | Ability B (defensive/utility) |
|------|----------------------|-------------------------------|
| NEUTRAL | Adaptability — STAB 2.0x instead of 1.5x | Resilience — SE hits deal 0.75x |
| FIRE | Blaze — +30% fire damage below 33% HP | Inferno — 15% burn chance on any hit |
| WATER | Torrent — +30% water damage below 33% HP | Hydration — heal 6.25% HP per turn |
| ELECTRIC | Static — 20% paralyze chance on contact | Volt Absorb — immune to electric moves |
| GRASS | Overgrow — +30% grass damage below 33% HP | Photosynthesis — heal HP per turn |
| ICE | Ice Body — heal HP per turn | Permafrost — 10% freeze chance on any hit |
| MARTIAL | Guts — +30% attack when statused | Iron Fist — +10% physical move damage |
| VENOM | Poison Touch — 15% poison chance on contact | Corrosion — ignore 15% of target defense |
| EARTH | Sand Force — +15% attack and defense | Sand Veil — 10% dodge chance |
| AIR | Aerilate — +20% speed | Gale Wings — go first when HP is full |
| PSYCHE | Magic Guard — immune to status damage | Telepathy — 10% dodge chance |
| INSECT | Swarm — +30% bug damage below 33% HP | Compound Eyes — +30% move accuracy |
| STONE | Sturdy — survive any hit at 1 HP once | Solid Rock — SE damage capped at 1.5x |
| GHOST | Levitate — immune to ground moves | Cursed Body — 20% chance to debuff attacker |
| DRAGON | Multiscale — take 25% less at full HP | Dragon Force — +10% attack and claw damage |
| SHADOW | Dark Aura — +15% vs Psyche/Ghost/Mystic | Intimidate — opponent -15% attack |
| METAL | Filter — SE damage capped at 1.5x | Heavy Metal — +20% defense, -10% speed |
| MYSTIC | Pixilate — +15% vs Dragon/Shadow/Martial | Charm — opponent -15% attack |

---

## 3. Point System

### How Type Is Determined

Three point sources accumulate across all 9 generator layers:

**Source 1: Trait Points (5 primary, 2 secondary)**
Each trait has a combat mapping keyed by its **manifest trait ID** (e.g., `Clothes_fire-figther`, `Head_Wiz-Hat`). The implementation reads trait IDs from the G2 manifest (`YourWojak-layers/manifest.json`) and looks them up in the combat mapping table. **Do NOT hardcode layer display names — use trait IDs from the manifest.**

See `docs/TRAIT-COMBAT-MAPPING.csv` for the full table (129 entries).

Example: `Clothes_fire-figther` → FIRE: 5pts, MARTIAL: 2pts

**Source 2: Color Points (3 primary, 1 secondary per color)**
Every hex color the user picks is analyzed by HSL values and mapped to types:

| Hue Range | Primary (3pts) | Secondary (1pt) |
|-----------|----------------|-----------------|
| Red (0°-20°, 340°-360°) | FIRE | SHADOW |
| Orange (20°-45°) | DRAGON | FIRE |
| Yellow (45°-65°) | ELECTRIC | EARTH |
| Lime (65°-90°) | INSECT | GRASS |
| Green (90°-150°) | GRASS | EARTH |
| Teal/Cyan (150°-195°) | WATER | ICE |
| Blue (195°-250°) | WATER | PSYCHE |
| Indigo (250°-280°) | PSYCHE | GHOST |
| Purple (280°-320°) | VENOM | MYSTIC |
| Pink (320°-340°) | MYSTIC | FIRE |
| White (S<10%, L>85%) | ICE | AIR |
| Silver (S<10%, L 60-85%) | METAL | STONE |
| Dark Grey (S<10%, L 25-60%) | STONE | GHOST |
| Black (S<10%, L<25%) | SHADOW | GHOST |
| Brown (warm neutral) | EARTH | NEUTRAL |
| Gold (warm neutral) | DRAGON | METAL |
| Neon (S>90%) | +1 bonus to hue's primary | — |

See `docs/COLOR-HUE-TYPE-MAPPING.csv` for exact ranges.

**Source 3: Detail Points (1-2 bonus)**
Sub-selections within traits add small bonuses. See `docs/DETAIL-OPTIONS-COMBAT-MAPPING.csv` for the full table (37 detail options mapped).

Examples:
- Construction Helmet + Chia Logo → GRASS +2
- Beer Hat + Monster energy → VENOM +1, Attack +1
- Beer Hat + Red Bull → AIR +1, Speed +1
- Comrade Hat + Star → FIRE +2, Attack +1
- MOG Glasses + Purple variant → VENOM +1
- Cap + Army variant → MARTIAL +2, Attack +1

**Resolution:**
```
typeScores[18] = sum of all trait points + all color points + all detail points
primaryType = argmax(typeScores)
// Tiebreaker: last-placed layer's type wins
```

### How Nature Is Determined

The same traits and colors contribute to 5 stat dimensions:

| Stat | High-Signal Traits | Color Signals (see `docs/COLOR-NATURE-STAT-MAPPING.csv`) |
|------|-------------------|---------------|
| Attack (27 traits) | Viking Armor, Ronin, SWAT, Anarchy Spikes, Screaming, Leather Jacket, Skull Mask | Red (+2), Orange (+2), Black (+2), Dark Grey (+1) |
| Defense (16 traits) | Firefighter, Construction Helmet, Centurion, Military Jacket, SWAT, Hard Hat | Grey (+2), Silver (+2), Brown (+1), Green (+1) |
| Sp.Atk (23 traits) | Wizard Drip, Wiz Hat, Laser Eyes, Cyber Shades, Matrix Lenses, Clown | Purple (+2), Indigo (+2), Pink (+2), Gold (+2) |
| Sp.Def (25 traits) | Gods Robe, Bathrobe, Astronaut, Copium Mask, Proof of Prayer, Bubble Gum | Blue (+2), Green (+1), White (+2), Teal (+2) |
| Speed (19 traits) | Sonic Suit, Super Saiyan, Leather Jacket, Propeller Hat, Born to Ride | Yellow (+1), Lime (+1), Orange (+1), Neon S>90% (+1) |

Note: The nature stat distribution is intentionally Attack-heavy (27 vs Defense's 16). This produces more aggressive natures overall, which leads to more exciting battles.

```
statScores[5] = sum of all trait stat contributions + color stat contributions
highestStat = argmax(statScores)
lowestStat = argmin(statScores, excluding highest)
nature = NATURE_LOOKUP[highestStat][lowestStat]
// If all stats within 1 point → Balanced (neutral nature)
```

### How Ability Is Determined

Each type has Ability A (offensive) and Ability B (defensive/utility):
```
offensiveSum = statScores[Attack] + statScores[Sp.Atk] + statScores[Speed]
defensiveSum = statScores[Defense] + statScores[Sp.Def]
ability = offensiveSum > defensiveSum ? abilityA : abilityB
```

---

## 4. Move Selection at Mint Time

After the system calculates type, the user is presented with their type's move pool (8-12 moves) and must choose exactly 4. These 4 moves are permanent — baked into the NFT metadata.

Move pools per type are defined in `docs/reference/combat-moves.json` (to be created from ClawCombat data).

### Move Balance Constraint

To prevent degenerate builds, enforce:
- At least 1 damaging move (power > 0)
- At least 1 status/utility move (power = 0) — OPTIONAL, recommended via UI hint but not enforced
- No duplicate moves

---

## 5. CHIP-0007 Metadata Extension

Current attributes array:
```json
"attributes": [
  { "trait_type": "Background", "value": "Orange Grove" },
  { "trait_type": "Base", "value": "Classic" },
  { "trait_type": "Clothes", "value": "Wizard Drip" },
  ...
]
```

Extended with combat attributes:
```json
"attributes": [
  // Existing visual traits
  { "trait_type": "Background", "value": "Orange Grove" },
  { "trait_type": "Base", "value": "Classic" },
  { "trait_type": "Clothes", "value": "Wizard Drip" },
  { "trait_type": "Face Wear", "value": "Wizard Glasses" },
  { "trait_type": "Head", "value": "Wiz Hat" },
  { "trait_type": "Mouth", "value": "Pipe" },

  // NEW: Combat attributes
  { "trait_type": "Combat Type", "value": "PSYCHE" },
  { "trait_type": "Nature", "value": "Focused" },
  { "trait_type": "Ability", "value": "Magic Guard" },
  { "trait_type": "Move 1", "value": "Mind Ray" },
  { "trait_type": "Move 2", "value": "Mesmerize" },
  { "trait_type": "Move 3", "value": "Dream Drain" },
  { "trait_type": "Move 4", "value": "Sixth Sense" }
],

// NEW: Extended combat data in collection attributes
"collection": {
  ...
  "attributes": [
    ...existing...,
    { "type": "combat_version", "value": "1.0" }
  ]
}
```

The `combat_version` field lets us handle schema evolution. NFTs without it are pre-combat (see Migration section).

---

## 6. Generator UI Changes

### New Step: Move Selection

After the user finishes building their Wojak visually, a new step appears before final mint:

1. **Combat Preview Panel** — shows calculated Type, Nature, Ability based on current selections
2. **Move Selection Grid** — shows all available moves for their type (8-12 options)
3. **User picks 4 moves** — each move shows: name, power, category (physical/special/status), effect description
4. **Confirm & Mint** — existing flow continues with combat data included

### Live Type Preview (during trait selection)

As the user picks traits and colors, a small badge updates in real-time:
```
⚡ Trending: ELECTRIC | 🔮 Runner-up: PSYCHE
```

This gives visual feedback without being prescriptive. The user sees how their choices affect type and can intentionally steer.

### Type Palette Swatches (color picker enhancement)

When opening any color picker, show curated type-themed palettes alongside the free hex picker:
- "🔥 Fire Tones" — reds and oranges
- "❄️ Ice Tones" — whites and light blues
- etc.

These are shortcuts, not restrictions. The free picker remains primary.

---

## 7. Battle Engine (ClawCombat Port)

### Architecture

The battle engine runs as a **Cloudflare Worker** (or within the existing Pages Functions). It is stateless per turn — all state is in D1.

```
Client (React) ←→ API (Pages Functions) ←→ Battle Engine (pure TS logic) ←→ D1 (state)
```

### Core Module: `src/lib/combat/battle-engine.ts`

Port from `ClawCombat/apps/backend/src/services/battle-engine.js`. Key components:

- **Type Chart** — 18x18 effectiveness matrix (0x, 0.5x, 1x, 2x)
- **Damage Formula** — `basePower × (attackStat/defenseStat) × typeMultiplier × STAB × critMultiplier × random(0.85, 1.0)`
- **STAB** — 1.5x (or 2.0x with Adaptability ability)
- **Stat Stages** — -6 to +6 multiplier table
- **Status Effects** — burn, paralysis, poison, freeze, sleep, confusion
- **Ability Triggers** — 12 trigger points: `stab_calc`, `damage_calc`, `damage_taken`, `after_hit`, `before_hit`, `end_turn`, `battle_start`, `speed_calc`, `accuracy_calc`, `before_faint`, `after_hit_received`, `status_damage`
- **Turn Resolution** — speed comparison → priority moves → ability checks → move execution → status ticks → faint check

### Core Module: `src/lib/combat/stat-calculator.ts`

Base stats at level 1, scaling with level:
```
HP = floor((2 * baseHP + 31) * level / 100) + level + 10
Other = floor(((2 * baseStat + 31) * level / 100) + 5) * natureMultiplier
```

Each type has a base stat spread. All types have the same BST (485) for balance. See `docs/BASE-STATS-PER-TYPE.csv` for the full table. Design philosophy:

| Archetype | Types | Key Stats |
|-----------|-------|-----------|
| Physical sweeper | MARTIAL, INSECT | High Atk + Speed |
| Special sweeper | PSYCHE, GHOST | High Sp.Atk + Speed |
| Physical wall | EARTH, STONE, METAL | High Def + HP |
| Special wall | WATER, GRASS, MYSTIC | High Sp.Def + HP |
| Speed demon | ELECTRIC, AIR | Highest Speed |
| Powerhouse | DRAGON, FIRE | High offense, moderate bulk |
| Mixed attacker | SHADOW, VENOM, ICE | Balanced offense |
| All-rounder | NEUTRAL | 80 across the board |

### Core Module: `src/lib/combat/ai-strategist.ts`

Port from `ClawCombat/apps/backend/src/services/ai-strategist.js`. Evaluates each move option and picks the best:

- Calculate expected damage for each move
- Factor in type effectiveness, STAB, accuracy
- Consider status moves when advantageous (e.g., sleep when opponent is faster)
- Apply minor randomization to prevent perfect play

This runs server-side for auto-battle mode. In manual mode, the player picks their own move each turn.

---

## 8. AI Agent Auto-Battle

When queuing for combat battle, the user toggles:
- **Manual** — player picks moves each turn via UI
- **Auto (AI Agent)** — the AI Strategist picks moves automatically

In auto-battle:
1. Both fighters are matched
2. The engine runs all turns server-side using the AI Strategist for both (or one manual, one auto)
3. The full turn log is recorded
4. Result is stored; the user sees a replay

In manual battle:
1. Both fighters are matched
2. Each turn, both players have a time window (30s) to pick a move
3. If a player doesn't pick in time, AI Strategist picks for them
4. Turns resolve as both moves are submitted

### Turn Timeout
- Manual: 30 seconds per turn
- If no input: AI auto-picks
- Max turns per battle: 50 (after 50, lower HP% loses; if equal, draw)

### Matchmaking Algorithm

1. Player enters queue with ELO snapshot
2. Search for opponents within **ELO window** (starts at ±100)
3. Every 15 seconds with no match, window expands by ±50
4. After 2 minutes, match with ANY queued opponent
5. After 5 minutes with no opponent, offer: "No opponents available. Try again later or switch to auto-battle."
6. **Manual vs Auto cross-matching**: Manual players can be matched against auto players. The UI clearly shows which mode each fighter uses.
7. **Same-owner block**: You cannot battle your own NFTs against each other
8. **Cooldown**: Same two NFTs cannot battle again within 1 hour

### Turn Log JSON Schema

Each turn is stored as JSON in `combat_battles.turn_log`:
```json
{
  "turns": [
    {
      "turn": 1,
      "fighter_a": {
        "move": "Volt Cannon",
        "damage_dealt": 45,
        "critical": false,
        "effectiveness": "super_effective",
        "status_applied": null,
        "hp_before": 150,
        "hp_after": 150
      },
      "fighter_b": {
        "move": "Regenerate",
        "damage_dealt": 0,
        "critical": false,
        "effectiveness": null,
        "status_applied": null,
        "hp_before": 130,
        "hp_after": 130,
        "heal_amount": 65
      },
      "order": "a_first",
      "end_of_turn": {
        "fighter_a_hp": 150,
        "fighter_b_hp": 85,
        "fighter_a_status": null,
        "fighter_b_status": null,
        "fighter_a_stat_stages": { "atk": 0, "def": 0, "spa": 0, "spd": 0, "spe": 0 },
        "fighter_b_stat_stages": { "atk": 0, "def": 0, "spa": 0, "spd": 0, "spe": 0 },
        "ability_triggered": null
      }
    }
  ],
  "result": {
    "winner": "fighter_a",
    "reason": "faint",
    "total_turns": 12
  }
}

---

## 9. Database Schema

### New Tables

```sql
-- Migration: 060_combat_system.sql

-- Combat fighter records (one per NFT, created at mint or retroactively)
CREATE TABLE combat_fighters (
  nft_id TEXT PRIMARY KEY,              -- launcher_id
  edition_number INTEGER NOT NULL UNIQUE,
  owner_did TEXT NOT NULL,
  combat_type TEXT NOT NULL,            -- one of 18 types
  nature TEXT NOT NULL,                 -- one of 25 natures
  ability TEXT NOT NULL,                -- one of 36 abilities
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

CREATE INDEX idx_fighters_elo ON combat_fighters(elo_rating);
CREATE INDEX idx_fighters_owner ON combat_fighters(owner_did);
CREATE INDEX idx_fighters_type ON combat_fighters(combat_type);
CREATE INDEX idx_fighters_level ON combat_fighters(level);

-- Combat battle records
CREATE TABLE combat_battles (
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
  -- Snapshots at battle start
  fighter_a_level INTEGER NOT NULL,
  fighter_b_level INTEGER NOT NULL,
  fighter_a_elo INTEGER NOT NULL,
  fighter_b_elo INTEGER NOT NULL,
  -- ELO changes after resolution
  elo_change_a INTEGER,
  elo_change_b INTEGER,
  -- XP awarded
  xp_awarded_a INTEGER,
  xp_awarded_b INTEGER,
  turn_log TEXT,                        -- JSON: full turn-by-turn replay
  started_at TEXT DEFAULT (datetime('now')),
  ended_at TEXT
);

CREATE INDEX idx_combat_battles_status ON combat_battles(status);
CREATE INDEX idx_combat_battles_fighters ON combat_battles(fighter_a_nft, fighter_b_nft);

-- Combat matchmaking queue
CREATE TABLE combat_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nft_id TEXT NOT NULL UNIQUE REFERENCES combat_fighters(nft_id),
  owner_did TEXT NOT NULL,
  battle_mode TEXT NOT NULL CHECK(battle_mode IN ('manual', 'auto')),
  elo_rating INTEGER NOT NULL,         -- snapshot for matching
  queued_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_combat_queue_elo ON combat_queue(elo_rating);

-- Per-turn state for active manual battles
CREATE TABLE combat_turns (
  battle_id INTEGER NOT NULL REFERENCES combat_battles(id),
  turn_number INTEGER NOT NULL,
  fighter_a_move TEXT,                  -- NULL until submitted
  fighter_b_move TEXT,                  -- NULL until submitted
  fighter_a_submitted_at TEXT,
  fighter_b_submitted_at TEXT,
  turn_result TEXT,                     -- JSON: damage, effects, state changes
  resolved_at TEXT,
  PRIMARY KEY (battle_id, turn_number)
);

-- XP thresholds for leveling
CREATE TABLE combat_level_thresholds (
  level INTEGER PRIMARY KEY,
  xp_required INTEGER NOT NULL         -- cumulative XP to reach this level
);
```

### Level Thresholds

Pre-populated via migration. Formula: `xp_required = floor(level^2.5 * 10)`

Key milestones:
```
Level 1:   0 XP
Level 5:   559 XP
Level 10:  3,162 XP
Level 15:  8,714 XP
Level 20:  17,889 XP    ← Title unlock: "Veteran"
Level 30:  49,295 XP
Level 40:  101,193 XP
Level 50:  176,777 XP
Level 60:  278,855 XP   ← Title unlock: "Champion"
Level 70:  409,963 XP
Level 80:  572,433 XP
Level 90:  768,425 XP
Level 100: 1,000,000 XP ← Title unlock: "Legend"
```

"Evolution" in Wojak context doesn't change the NFT visually (it's immutable on-chain). It unlocks cosmetic **titles** displayed next to the name in UI:
- Level 20: "Veteran" badge
- Level 60: "Champion" badge
- Level 100: "Legend" badge

### XP Awards (per battle)

```
Winner: base_xp * level_factor * elo_bonus
Loser: base_xp * 0.3 (always earn something)
Draw: base_xp * 0.5 each

base_xp = 50
level_factor = 1 + (opponent_level / own_level) * 0.5  (fighting stronger = more XP)
elo_bonus = 1 + abs(elo_diff) / 400 * 0.25  (fighting higher ELO = more XP)
```

### ELO Updates

Standard ELO formula:
```
K = 32 (standard)
expected_a = 1 / (1 + 10^((elo_b - elo_a) / 400))
elo_change_a = round(K * (result - expected_a))
// result: 1.0 = win, 0.5 = draw, 0.0 = loss
```

---

## 10. API Endpoints

### New Routes

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/combat/queue` | Add fighter to combat matchmaking queue |
| DELETE | `/api/combat/queue` | Remove from queue |
| GET | `/api/combat/queue/status?nftId=` | Check queue status |
| POST | `/api/combat/submit-move` | Submit move for current turn (manual mode) |
| GET | `/api/combat/battle/:id` | Get battle state (current HP, status, turn log) |
| GET | `/api/combat/battle/:id/turns` | Get turn-by-turn replay |
| POST | `/api/combat/resolve-turn` | Internal: resolve current turn after both moves submitted or timeout |
| GET | `/api/combat/fighter/:nftId` | Get fighter stats (type, nature, ability, moves, level, ELO) |
| GET | `/api/combat/leaderboard?sortBy=elo&limit=` | Combat ELO leaderboard |
| GET | `/api/combat/moves/:type` | Get available moves for a type (used during mint) |
| POST | `/api/combat/calculate-identity` | Preview: given traits + colors, return calculated type/nature/ability |
| GET | `/api/combat/type-chart` | Return full 18x18 type effectiveness matrix |
| GET | `/api/combat/history?nftId=&did=` | Combat battle history |

### Modified Routes

| Route | Change |
|-------|--------|
| `POST /api/mint/submit` | Accept `combatMoves: [string, string, string, string]` in request body |
| `POST /api/mint/process` | Calculate combat identity from traits+colors, add to CHIP-0007 metadata |

---

## 11. Frontend: Battle UI

### New Page: `/games/combat` (or tab within `/games`)

**Queue Panel:**
- Select an NFT from your collection (shows type, level, ELO)
- Toggle: Manual / Auto battle mode
- "Enter Queue" button
- Shows queue position and estimated wait

**Active Battle View (manual mode):**
- Split screen: your Wojak vs opponent
- HP bars, status effect icons, type badges
- 4 move buttons at the bottom (your moves)
- 30-second timer per turn
- Turn-by-turn log scrolling on the side

**Active Battle View (auto mode):**
- Same layout but moves auto-execute
- User watches the battle play out in real-time (or sees replay)

**Battle History:**
- List of past combat battles with results
- Click to see full turn replay
- XP and ELO changes shown per battle

### Fighter Card Component

Shows on NFT cards throughout the app:
```
[NFT Image]
Your Wojak #42: Pepe Slayer
⚡ ELECTRIC | Lv. 15 | ELO: 1247
Ability: Static
Moves: Volt Cannon, Spark, Shock Wave, Store Energy
W: 12 / L: 5 / D: 2
```

---

## 12. Migration: Existing NFTs

NFTs minted before the combat system **do not get combat abilities**. They are pre-combat era NFTs.

### Approach: No Migration — Burn Path

- Pre-combat NFTs cannot enter combat battles (no type, no moves, no abilities)
- Pre-combat NFTs can still participate in the **Community Vote** system (swipe/like/dislike battles) as before
- Users are encouraged to **burn** pre-combat NFTs and mint new ones with combat metadata
- The existing burn system already awards credits (2-20 credits based on dislike ratio) which can fund new mints
- This creates a natural recycling loop: burn old → earn credits → mint new with combat identity

### Why This Is The Right Call

1. **Clean separation** — no "half-supported" NFTs with DB-only combat data that doesn't match their on-chain metadata
2. **Simpler codebase** — no retroactive calculation, no "legacy mode" code paths
3. **Deflationary pressure** — incentivizes burning, which is healthy for the collection
4. **Better UX** — every combat-ready Wojak was intentionally built with moves chosen by the user

### Implementation

- `combat_fighters` table requires `combat_type` NOT NULL — only NFTs minted with the combat system can have rows
- The `/api/combat/queue` endpoint checks for a `combat_fighters` row and returns a clear error if the NFT is pre-combat
- UI shows a message: "This Wojak was minted before the combat era. Burn it to earn credits toward a new combat-ready Wojak!"

---

## 13. Reference Data Files

These files need to be created from ClawCombat source and placed in the codebase:

| File | Contents | Source |
|------|----------|--------|
| `src/lib/combat/data/types.ts` | 18 type definitions, type chart (18x18 matrix) | `ClawCombat/apps/backend/src/data/pokeapi-type-chart.json` |
| `src/lib/combat/data/moves.ts` | All 191 moves with power, category, accuracy, effects | `ClawCombat/apps/backend/src/data/moves.js` |
| `src/lib/combat/data/natures.ts` | 25 natures with stat modifiers | `ClawCombat/apps/backend/src/data/pokeapi-natures.json` |
| `src/lib/combat/data/abilities.ts` | 36 abilities with trigger types and effects | `ClawCombat/apps/backend/src/services/battle-engine.js` (lines 162-217) |
| `src/lib/combat/data/base-stats.ts` | Base stat spreads per type (18 entries, BST 485 each) | `docs/BASE-STATS-PER-TYPE.csv` |
| `src/lib/combat/data/trait-type-map.ts` | Full trait → type/nature point mapping | `docs/TRAIT-COMBAT-MAPPING.csv` |
| `src/lib/combat/data/color-type-map.ts` | HSL → type point mapping | `docs/COLOR-HUE-TYPE-MAPPING.csv` |
| `src/lib/combat/data/color-nature-map.ts` | HSL → nature stat point mapping | `docs/COLOR-NATURE-STAT-MAPPING.csv` |
| `src/lib/combat/data/detail-combat-map.ts` | Detail option → type/nature bonus mapping | `docs/DETAIL-OPTIONS-COMBAT-MAPPING.csv` |
| `src/lib/combat/data/level-thresholds.ts` | XP per level: `floor(level^2.5 * 10)` for 1-100 | Formula-based, generated at build |

---

## 14. Phased Rollout

### Phase 1: Combat Identity at Mint (generator changes only)
- Add point calculation engine (`src/lib/combat/identity-calculator.ts`)
- Add trait/color/detail → type/nature point maps
- Add live type preview to generator UI
- Add move selection step to mint flow
- Extend CHIP-0007 metadata with combat attributes
- Add type palette swatches to color picker
- DB migration for `combat_fighters` table
- Register fighter on successful mint
- **No battles yet** — just identity creation and display

### Phase 2: Battle Engine Core
- Port battle engine from ClawCombat to TypeScript
- Port type chart, damage formula, status effects, abilities
- Port AI Strategist
- DB migration for `combat_battles`, `combat_queue`, `combat_turns`
- API endpoints for queue, submit-move, battle state, resolve
- Matchmaking logic (ELO-adjacent pairing)

### Phase 3: Battle Frontend
- Combat battle page/tab
- Manual battle UI (move selection, HP bars, turn log)
- Auto-battle mode with replay
- Fighter card component across app
- Combat leaderboard (ELO-based)
- Battle history with replays

### Phase 4: Polish + Burn Incentives
- Clear UI messaging for pre-combat NFTs ("Burn to upgrade")
- Burn-to-mint credit bonus for pre-combat NFTs (optional: higher credits than normal)
- XP/leveling display in UI
- Evolution milestones (cosmetic badges/titles)
- Level-based stat scaling

### Phase 5: New Backgrounds + Asset Integration
- Add new themed backgrounds (Frozen Tundra, Deep Ocean, Jungle, etc.)
- Register them in generator manifest
- Add their trait-to-type point mappings
- Test type distribution with real mints

---

## Appendix: File References

### Design Documents (this session created)
| Document | Location | Purpose |
|----------|----------|---------|
| **This Design Doc** | `docs/plans/2025-02-18-combat-system-design.md` | Master spec |
| Trait → Combat Mapping | `docs/TRAIT-COMBAT-MAPPING.csv` | 129 traits: type (5+2 pts) + nature stat (+3) |
| Color → Type Mapping | `docs/COLOR-HUE-TYPE-MAPPING.csv` | HSL hue ranges → type points (3+1 pts) |
| Color → Nature Stat Mapping | `docs/COLOR-NATURE-STAT-MAPPING.csv` | HSL hue ranges → nature stat points (2+1 pts) |
| Detail Options → Combat | `docs/DETAIL-OPTIONS-COMBAT-MAPPING.csv` | 37 detail sub-options: type + nature bonuses |
| Base Stats Per Type | `docs/BASE-STATS-PER-TYPE.csv` | 18 type stat spreads (BST 485 each) |
| Background Art Prompts | `docs/BACKGROUND-ART-PROMPTS.md` | ChatGPT prompts for 14 new backgrounds |

### Generator Source of Truth
| Document | Location | Purpose |
|----------|----------|---------|
| G2 Manifest | `public/assets/wojak-layers/YourWojak-layers/manifest.json` | Trait IDs, categories, colors, details — **read this at runtime** |
| G1 Manifest | `public/assets/wojak-layers/manifest.json` | G1 trait file inventory |
| Default Colors | `src/config/g2DefaultColors.ts` | Default colors per trait fill slot |
| Fill Treatments | `src/lib/g2FillTreatments.ts` | Derived color rules (darker, complementary, etc.) |

### ClawCombat Source (for porting)
| Document | Location | Purpose |
|----------|----------|---------|
| Battle Engine | `/Users/abit_hex/ClawCombat/apps/backend/src/services/battle-engine.js` | Core: types, abilities, damage, status, turns |
| AI Strategist | `/Users/abit_hex/ClawCombat/apps/backend/src/services/ai-strategist.js` | Move selection AI |
| Moves Database | `/Users/abit_hex/ClawCombat/apps/backend/src/data/moves.js` | All 191 moves |
| Type Chart | `/Users/abit_hex/ClawCombat/apps/backend/src/data/pokeapi-type-chart.json` | 18x18 effectiveness matrix |
| Natures | `/Users/abit_hex/ClawCombat/apps/backend/src/data/pokeapi-natures.json` | 25 natures with stat modifiers |
| XP Calculator | `/Users/abit_hex/ClawCombat/apps/backend/src/services/xp-calculator.js` | XP/leveling formulas |
| Stat Scaling | `/Users/abit_hex/ClawCombat/apps/backend/src/config/stat-scaling.js` | HP/stat formulas |
