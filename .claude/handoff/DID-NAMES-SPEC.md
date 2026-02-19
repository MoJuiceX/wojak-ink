# DID Display Names — Implementation Spec

**Context:** Read `docs/plans/2026-02-19-fight-club-design.md` Section 8 for design.

---

## Overview

DIDs are long hex strings. Users need display names for leaderboards, battle results, and profiles. Names come from 3 sources in priority order:

1. Custom name (user set it themselves)
2. Chia DID profile name (pulled from on-chain)
3. Auto-generated random name (fallback)

---

## Task 1: Create Migration

**File:** `functions/migrations/066_did_profiles.sql` (NEW)

```sql
CREATE TABLE IF NOT EXISTS did_profiles (
  did_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  name_source TEXT NOT NULL DEFAULT 'random',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- name_source values: 'chain', 'custom', 'random'
-- chain = pulled from Chia DID profile
-- custom = user typed their own name
-- random = auto-generated
```

NOTE: If `did_profiles` was already created by migration 065_power_scoring.sql, skip this and just verify the table exists with these columns.

---

## Task 2: Random Name Generator

**File:** `src/lib/nameGenerator.ts` (may already exist — check first, extend if so)

Create a simple random name generator:

```typescript
const ADJECTIVES = [
  'Based', 'Degen', 'Chad', 'Sigma', 'Alpha', 'Mega', 'Ultra', 'Epic',
  'Turbo', 'Hyper', 'Cosmic', 'Atomic', 'Blazing', 'Frozen', 'Shadow',
  'Golden', 'Diamond', 'Crystal', 'Iron', 'Toxic', 'Neon', 'Stealth',
  'Savage', 'Noble', 'Mystic', 'Rogue', 'Swift', 'Mighty', 'Dark', 'Bright'
];

const NOUNS = [
  'Wojak', 'Farmer', 'Holder', 'Trader', 'Degen', 'Ape', 'Bull', 'Bear',
  'Whale', 'Shark', 'Wolf', 'Lion', 'Eagle', 'Dragon', 'Knight', 'King',
  'Chief', 'Boss', 'Legend', 'Champion', 'Wizard', 'Ninja', 'Samurai',
  'Viking', 'Spartan', 'Titan', 'Phoenix', 'Ranger', 'Hunter', 'Pilot'
];

export function generateRandomName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 99) + 1;
  return `${adj}${noun}${num}`;
}
```

---

## Task 3: Display Name API

**File:** `functions/api/profile/display-name.ts` (NEW)

### GET /api/profile/display-name?did=xxx

Returns the display name for a DID. If none exists, auto-generates one and saves it.

```typescript
// 1. Look up did_profiles for this DID
// 2. If found → return { name, source }
// 3. If not found → generate random name, INSERT into did_profiles, return it
```

Response: `{ did: string, displayName: string, source: 'chain' | 'custom' | 'random' }`

### PUT /api/profile/display-name

Set a custom display name. Requires wallet auth (DID must match authenticated user).

Body: `{ did: string, name: string }`

Validation:
- Name must be 2-20 characters
- Alphanumeric + spaces only (no special chars, no slurs — basic filter)
- Trim whitespace

Updates: `did_profiles SET display_name = ?, name_source = 'custom', updated_at = datetime('now')`

### GET /api/profile/random-name

Generate a random name (for the "randomize" button in UI).

Response: `{ name: string }`

No auth required. Stateless.

---

## Task 4: DID Indexer — Sync Chain Names

**File:** `workers/did-indexer/worker.ts`

In the DID indexer's sync loop, after syncing holdings:

- If the DID has a profile name on-chain (from MintGarden or wallet RPC)
- AND the `did_profiles` entry has `name_source = 'random'` (user hasn't customized)
- THEN update `display_name` to the chain name, set `name_source = 'chain'`

This way: random name is default → chain name overrides if available → custom name overrides everything.

---

## Task 5: Settings Page — Name Editor

**File:** `src/pages/Settings.tsx` or `src/pages/Account.tsx` (wherever user settings live)

Add a "Display Name" section:
- Text input showing current name
- "Save" button (calls PUT /api/profile/display-name)
- "Randomize" button (calls GET /api/profile/random-name, fills input)
- Show current source: "From your DID profile" or "Custom" or "Auto-generated"
- Use `.input` class from theme.css, `.btn .btn-primary` for save, `.btn .btn-ghost` for randomize

---

## Task 6: Use Display Names Everywhere

Update all components that show DID IDs to use display names instead:

- Fight Club Rankings (Players tab) — show display_name, not DID hex
- Battle results — "ChadWojak42 defeated BasedHolder7"
- Voting UI — if showing who owns the Wojak being voted on
- Any leaderboard component

Fetch names in bulk where possible:
```sql
SELECT did_id, display_name FROM did_profiles WHERE did_id IN (?, ?, ?)
```

---

## Rules
- Run `npm run build` after each task
- Commit and `git push origin main` after each task
- No `!important`, use theme.css classes
- Name validation: 2-20 chars, alphanumeric + spaces only
