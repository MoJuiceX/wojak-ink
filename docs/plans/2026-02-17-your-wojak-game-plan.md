# Your Wojak Game — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Design doc:** `docs/plans/2026-02-17-your-wojak-game-design.md`

**Goal:** Build a self-reinforcing game economy (vote, burn, battle, stake) on top of the Your Wojak NFT collection, with Power Level scoring, Tinder-style voting, SplitXCH royalties, and NFT naming.

**Architecture:** Four phases (A→D), each building on the last. Phase A lays the database foundation + voting + Power Level + dashboard + NFT naming. Phase B adds economy (burn, credits, SplitXCH royalties). Phase C adds battles. Phase D adds CHIP-0051 staking. Each phase is independently shippable.

**Tech Stack:** React + Vite + TypeScript frontend, Cloudflare Workers + D1 (SQLite) backend, WalletConnect via Sage wallet, MintGarden API for NFT data, SplitXCH.com API for royalty splitting.

**Before starting each task:** Read `CLAUDE.md`, `.claude/instructions/PROMPT-PRINCIPLES.md`

---

## Table of Contents

- [Phase A: The Foundation](#phase-a-the-foundation) — Voting + Power Level + Dashboard + NFT Naming
- [Phase B: The Economy](#phase-b-the-economy) — Credits + Burn + SplitXCH + Royalty Waves
- [Phase C: Competition](#phase-c-competition) — Battles
- [Phase D: DeFi](#phase-d-defi) — CHIP-0051 Staking + PLP Distribution

---

## Phase A: The Foundation

**What ships:** Voting + Power Level + Dashboard + NFT Naming + DID Gate + Onboarding

**Why first:** Voting is the heartbeat. Without it, nothing else works. Power Level gives users a reason to care. Dashboard gives them a home.

---

### Task A1: Game Database Schema

**Files:**
- Create: `functions/migrations/045_game_foundation.sql`

**Step 1: Write the migration**

```sql
-- 045_game_foundation.sql
-- Your Wojak Game — Foundation tables

-- ============================================================
-- GAME PLAYERS — Registered game participants
-- ============================================================
CREATE TABLE IF NOT EXISTS game_players (
  did_id TEXT PRIMARY KEY,                    -- Chia DID (collector identity)
  wallet_address TEXT NOT NULL,               -- Primary wallet (from first connect)
  phase1_verified INTEGER NOT NULL DEFAULT 0, -- Has at least 1 Wojak Farmers Plot NFT
  phase1_verified_at TEXT,                    -- When verification happened
  power_level INTEGER NOT NULL DEFAULT 0,     -- Cached Power Level score (0-9000)
  power_level_updated_at TEXT,                -- Last recalculation time
  votes_today INTEGER NOT NULL DEFAULT 0,     -- Votes cast today
  votes_today_reset TEXT,                     -- Date of last reset (YYYY-MM-DD)
  total_votes_cast INTEGER NOT NULL DEFAULT 0,
  onboarding_did INTEGER NOT NULL DEFAULT 1,  -- Milestone: has DID (always 1 if registered)
  onboarding_phase1 INTEGER NOT NULL DEFAULT 0, -- Milestone: has Phase 1 NFT
  onboarding_minted INTEGER NOT NULL DEFAULT 0, -- Milestone: minted a Your Wojak
  onboarding_voted INTEGER NOT NULL DEFAULT 0,  -- Milestone: cast first vote
  onboarding_battled INTEGER NOT NULL DEFAULT 0, -- Milestone: entered first battle
  credits_earned_onboarding INTEGER NOT NULL DEFAULT 0, -- One-time credits from milestones
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_game_players_wallet ON game_players(wallet_address);
CREATE INDEX IF NOT EXISTS idx_game_players_power ON game_players(power_level DESC);

-- ============================================================
-- DID HOLDINGS — What NFTs each DID currently holds
-- ============================================================
CREATE TABLE IF NOT EXISTS did_holdings (
  did_id TEXT NOT NULL,
  nft_id TEXT NOT NULL,                       -- MintGarden launcher_id
  edition_number INTEGER,                     -- Your Wojak edition number (null for Phase 1)
  collection TEXT NOT NULL,                   -- 'phase1' or 'phase2'
  creator_wallet TEXT,                        -- phase2_mints.wallet_address (null for Phase 1)
  detected_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (did_id, nft_id)
);

CREATE INDEX IF NOT EXISTS idx_did_holdings_nft ON did_holdings(nft_id);
CREATE INDEX IF NOT EXISTS idx_did_holdings_collection ON did_holdings(did_id, collection);

-- ============================================================
-- WOJAK VOTES — Individual votes on Phase 2 NFTs
-- ============================================================
CREATE TABLE IF NOT EXISTS wojak_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  voter_did TEXT NOT NULL,                    -- Who voted
  nft_id TEXT NOT NULL,                       -- Which NFT was voted on
  edition_number INTEGER NOT NULL,            -- For quick lookups
  vote_type INTEGER NOT NULL,                 -- 1 = like, -1 = dislike
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(voter_did, nft_id)                   -- Each user votes on each Wojak once
);

CREATE INDEX IF NOT EXISTS idx_wojak_votes_nft ON wojak_votes(nft_id);
CREATE INDEX IF NOT EXISTS idx_wojak_votes_voter ON wojak_votes(voter_did, created_at);

-- ============================================================
-- WOJAK SCORES — Cached vote tallies per NFT
-- ============================================================
CREATE TABLE IF NOT EXISTS wojak_scores (
  nft_id TEXT PRIMARY KEY,                    -- MintGarden launcher_id
  edition_number INTEGER NOT NULL UNIQUE,     -- Your Wojak edition number
  creator_wallet TEXT NOT NULL,               -- From phase2_mints.wallet_address
  likes INTEGER NOT NULL DEFAULT 0,
  dislikes INTEGER NOT NULL DEFAULT 0,
  net_score INTEGER NOT NULL DEFAULT 0,       -- likes - dislikes (cached)
  total_votes INTEGER NOT NULL DEFAULT 0,     -- likes + dislikes (cached)
  first_voted_at TEXT,
  last_voted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wojak_scores_creator ON wojak_scores(creator_wallet);
CREATE INDEX IF NOT EXISTS idx_wojak_scores_net ON wojak_scores(net_score DESC);

-- ============================================================
-- ACTIVITY FEED — Game events for dashboard
-- ============================================================
CREATE TABLE IF NOT EXISTS game_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  did_id TEXT NOT NULL,                       -- Whose feed this belongs to
  event_type TEXT NOT NULL,                   -- 'vote_milestone', 'leaderboard_change', 'battle_result', 'burn', 'mint'
  event_data TEXT NOT NULL,                   -- JSON payload
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_game_activity_did ON game_activity(did_id, created_at DESC);

-- ============================================================
-- NFT NAMES — Custom names for Phase 2 NFTs
-- ============================================================
-- Names are stored in CHIP-0007 metadata on IPFS (immutable).
-- This table caches them for quick lookup without fetching metadata.
CREATE TABLE IF NOT EXISTS nft_names (
  edition_number INTEGER PRIMARY KEY,         -- Your Wojak edition number
  custom_name TEXT,                           -- User-provided name (max 15 chars), null if none
  full_name TEXT NOT NULL                     -- "Your Wojak #42: Pepe Slayer" or "Your Wojak #42"
);
```

**Step 2: Run the migration**

```bash
cd /Users/abit_hex/wojak-ink/.claude/worktrees/hopeful-pare
npx wrangler d1 execute wojak-ink-db --local --file=functions/migrations/045_game_foundation.sql
```

Expected: Migration runs without errors.

**Step 3: Commit**

```bash
git add functions/migrations/045_game_foundation.sql
git commit -m "feat: add game foundation database schema (045)

Tables: game_players, did_holdings, wojak_votes, wojak_scores,
game_activity, nft_names. Supports voting, Power Level, dashboard,
and NFT naming features."
```

---

### Task A2: Game Player Registration & Phase 1 Verification API

**Files:**
- Create: `functions/api/game/register.ts`
- Create: `functions/api/game/verify-phase1.ts`
- Create: `functions/api/game/_shared.ts`

**Context:** Read `functions/api/mint/_shared.ts` for the existing pattern of shared constants. Read `functions/api/credits/balance.ts` for an example of a simple authenticated API endpoint.

**Step 1: Create shared game constants**

Create `functions/api/game/_shared.ts`:

```typescript
// Game constants
export const VOTES_PER_DAY = 10;
export const POWER_LEVEL_MAX = 9000;
export const PHASE1_COLLECTION_ID = 'col1z0ef7w5n4vq9qkue67y8jns89re570npt0s4wwtcmpv3lxsmjq4yqs9ser0h'; // Wojak Farmers Plot

// Onboarding credit bonuses (in x100 units, matching credit system)
export const ONBOARDING_CREDITS = {
  phase1: 500,    // 5 credits for verifying Phase 1 NFT
  first_mint: 500, // 5 credits for first Your Wojak mint
  first_vote: 200, // 2 credits for first vote
  first_battle: 300, // 3 credits for first battle
} as const;

// Validate DID format (did:chia:...)
export function isValidDid(did: string): boolean {
  return /^did:chia:1[a-z0-9]{58}$/.test(did);
}

// Get today's date string for vote reset tracking
export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}
```

**Step 2: Create registration endpoint**

Create `functions/api/game/register.ts`:

```typescript
// POST /api/game/register
// Body: { did: string, walletAddress: string }
// Registers a game player. Idempotent — re-registering updates wallet if needed.

import { isValidDid, getTodayString } from './_shared';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as { did: string; walletAddress: string };
    const { did, walletAddress } = body;

    if (!did || !isValidDid(did)) {
      return Response.json({ error: 'Invalid DID format' }, { status: 400 });
    }
    if (!walletAddress) {
      return Response.json({ error: 'walletAddress required' }, { status: 400 });
    }

    // Upsert player
    await context.env.DB.prepare(`
      INSERT INTO game_players (did_id, wallet_address, votes_today_reset)
      VALUES (?, ?, ?)
      ON CONFLICT(did_id) DO UPDATE SET
        wallet_address = excluded.wallet_address,
        updated_at = datetime('now')
    `).bind(did, walletAddress, getTodayString()).run();

    // Fetch current state
    const player = await context.env.DB.prepare(
      'SELECT * FROM game_players WHERE did_id = ?'
    ).bind(did).first();

    return Response.json({
      success: true,
      player: {
        did: player.did_id,
        powerLevel: player.power_level,
        phase1Verified: !!player.phase1_verified,
        votesToday: player.votes_today,
        onboarding: {
          did: true,
          phase1: !!player.onboarding_phase1,
          minted: !!player.onboarding_minted,
          voted: !!player.onboarding_voted,
          battled: !!player.onboarding_battled,
        },
      },
    });
  } catch (err) {
    console.error('Game register error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
```

**Step 3: Create Phase 1 verification endpoint**

Create `functions/api/game/verify-phase1.ts`:

```typescript
// POST /api/game/verify-phase1
// Body: { did: string }
// Checks MintGarden API for Phase 1 NFT ownership by DID.

import { PHASE1_COLLECTION_ID, ONBOARDING_CREDITS } from './_shared';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as { did: string };
    const { did } = body;

    if (!did) {
      return Response.json({ error: 'DID required' }, { status: 400 });
    }

    // Check if already verified
    const player = await context.env.DB.prepare(
      'SELECT phase1_verified FROM game_players WHERE did_id = ?'
    ).bind(did).first();

    if (!player) {
      return Response.json({ error: 'Player not registered. Call /api/game/register first.' }, { status: 404 });
    }

    if (player.phase1_verified) {
      return Response.json({ success: true, verified: true, alreadyVerified: true });
    }

    // Query MintGarden for Phase 1 NFTs owned by this DID
    // MintGarden API: GET /nfts?collection_id=...&owner_did=...
    const mgUrl = `https://api.mintgarden.io/nfts?collection_id=${PHASE1_COLLECTION_ID}&owner_did=${encodeURIComponent(did)}&size=1`;

    const mgResponse = await fetch(mgUrl, {
      headers: { 'Accept': 'application/json' },
    });

    if (!mgResponse.ok) {
      console.error('MintGarden API error:', mgResponse.status);
      return Response.json({ error: 'Failed to verify NFT ownership' }, { status: 502 });
    }

    const mgData = await mgResponse.json() as { items: unknown[] };
    const hasPhase1 = mgData.items && mgData.items.length > 0;

    if (hasPhase1) {
      // Mark as verified + award onboarding credits
      await context.env.DB.batch([
        context.env.DB.prepare(`
          UPDATE game_players
          SET phase1_verified = 1,
              phase1_verified_at = datetime('now'),
              onboarding_phase1 = 1,
              updated_at = datetime('now')
          WHERE did_id = ?
        `).bind(did),
        // Award onboarding credits (insert into credit_events)
        context.env.DB.prepare(`
          INSERT INTO credit_events (wallet_address, nft_id, edition_number, credits_earned, source, created_at)
          VALUES (
            (SELECT wallet_address FROM game_players WHERE did_id = ?),
            'onboarding_phase1',
            0,
            ?,
            'onboarding',
            datetime('now')
          )
        `).bind(did, ONBOARDING_CREDITS.phase1),
      ]);
    }

    return Response.json({
      success: true,
      verified: hasPhase1,
      message: hasPhase1
        ? 'Phase 1 NFT verified! You can now participate in the game.'
        : 'No Wojak Farmers Plot NFT found on this DID. You need at least 1 to play.',
    });
  } catch (err) {
    console.error('Phase 1 verify error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
```

**Step 4: Commit**

```bash
git add functions/api/game/
git commit -m "feat: add game registration and Phase 1 verification APIs

POST /api/game/register — registers player with DID + wallet
POST /api/game/verify-phase1 — checks MintGarden for Phase 1 NFT ownership
Shared constants in _shared.ts (vote limits, collection IDs, onboarding credits)"
```

---

### Task A3: Voting API

**Files:**
- Create: `functions/api/game/vote.ts`
- Create: `functions/api/game/feed.ts`

**Context:** Read `functions/api/game/_shared.ts` (created in Task A2). The voting API is the core of the entire game — every other system depends on vote data.

**Step 1: Create voting endpoint**

Create `functions/api/game/vote.ts`:

```typescript
// POST /api/game/vote
// Body: { voterDid: string, nftId: string, editionNumber: number, voteType: 1 | -1 }
// Cast a vote on a Your Wojak NFT. 1 = like, -1 = dislike.

import { VOTES_PER_DAY, getTodayString, ONBOARDING_CREDITS } from './_shared';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as {
      voterDid: string;
      nftId: string;
      editionNumber: number;
      voteType: 1 | -1;
    };

    const { voterDid, nftId, editionNumber, voteType } = body;

    // Validate inputs
    if (!voterDid || !nftId || !editionNumber || ![1, -1].includes(voteType)) {
      return Response.json({ error: 'Invalid vote parameters' }, { status: 400 });
    }

    // Check player exists and is verified
    const player = await context.env.DB.prepare(
      'SELECT * FROM game_players WHERE did_id = ?'
    ).bind(voterDid).first();

    if (!player) {
      return Response.json({ error: 'Player not registered' }, { status: 403 });
    }
    if (!player.phase1_verified) {
      return Response.json({ error: 'Phase 1 NFT verification required' }, { status: 403 });
    }

    // Reset daily vote counter if new day
    const today = getTodayString();
    let votesToday = player.votes_today as number;
    if (player.votes_today_reset !== today) {
      votesToday = 0;
      await context.env.DB.prepare(
        'UPDATE game_players SET votes_today = 0, votes_today_reset = ? WHERE did_id = ?'
      ).bind(today, voterDid).run();
    }

    // Check daily limit
    if (votesToday >= VOTES_PER_DAY) {
      return Response.json({
        error: 'Daily vote limit reached',
        votesRemaining: 0,
        resetsAt: today + 'T00:00:00Z',
      }, { status: 429 });
    }

    // Check not voting on own or held NFT
    const holdsNft = await context.env.DB.prepare(
      'SELECT 1 FROM did_holdings WHERE did_id = ? AND nft_id = ?'
    ).bind(voterDid, nftId).first();

    if (holdsNft) {
      return Response.json({ error: 'Cannot vote on NFTs you hold' }, { status: 403 });
    }

    // Check not voting on own creation
    const nftScore = await context.env.DB.prepare(
      'SELECT creator_wallet FROM wojak_scores WHERE nft_id = ?'
    ).bind(nftId).first();

    if (nftScore) {
      const playerWallet = player.wallet_address as string;
      if (nftScore.creator_wallet === playerWallet) {
        return Response.json({ error: 'Cannot vote on your own creations' }, { status: 403 });
      }
    }

    // Insert vote (UNIQUE constraint prevents duplicates)
    try {
      await context.env.DB.prepare(`
        INSERT INTO wojak_votes (voter_did, nft_id, edition_number, vote_type)
        VALUES (?, ?, ?, ?)
      `).bind(voterDid, nftId, editionNumber, voteType).run();
    } catch (e: unknown) {
      if (e instanceof Error && e.message?.includes('UNIQUE')) {
        return Response.json({ error: 'Already voted on this Wojak' }, { status: 409 });
      }
      throw e;
    }

    // Update cached scores
    const likesDelta = voteType === 1 ? 1 : 0;
    const dislikesDelta = voteType === -1 ? 1 : 0;

    await context.env.DB.prepare(`
      INSERT INTO wojak_scores (nft_id, edition_number, creator_wallet, likes, dislikes, net_score, total_votes, first_voted_at, last_voted_at)
      VALUES (?, ?, COALESCE((SELECT wallet_address FROM phase2_mints WHERE mint_number = ?), 'unknown'), ?, ?, ?, 1, datetime('now'), datetime('now'))
      ON CONFLICT(nft_id) DO UPDATE SET
        likes = likes + ?,
        dislikes = dislikes + ?,
        net_score = net_score + ?,
        total_votes = total_votes + 1,
        last_voted_at = datetime('now')
    `).bind(
      nftId, editionNumber, editionNumber,
      likesDelta, dislikesDelta, voteType,
      likesDelta, dislikesDelta, voteType
    ).run();

    // Update player vote count
    const isFirstVote = (player.total_votes_cast as number) === 0;
    const statements = [
      context.env.DB.prepare(`
        UPDATE game_players
        SET votes_today = votes_today + 1,
            total_votes_cast = total_votes_cast + 1,
            updated_at = datetime('now')
        WHERE did_id = ?
      `).bind(voterDid),
    ];

    // First vote onboarding milestone
    if (isFirstVote) {
      statements.push(
        context.env.DB.prepare(
          'UPDATE game_players SET onboarding_voted = 1 WHERE did_id = ?'
        ).bind(voterDid)
      );
    }

    await context.env.DB.batch(statements);

    return Response.json({
      success: true,
      votesRemaining: VOTES_PER_DAY - votesToday - 1,
      voteType,
      editionNumber,
    });
  } catch (err) {
    console.error('Vote error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
```

**Step 2: Create voting feed endpoint**

Create `functions/api/game/feed.ts`:

```typescript
// GET /api/game/feed?did=<voter_did>&limit=10
// Returns Wojaks for voting, weighted by recency (newer = more likely).
// Excludes: already voted, own creations, own holdings.

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const did = url.searchParams.get('did');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 20);

    if (!did) {
      return Response.json({ error: 'DID required' }, { status: 400 });
    }

    // Get player's wallet for creator exclusion
    const player = await context.env.DB.prepare(
      'SELECT wallet_address, phase1_verified FROM game_players WHERE did_id = ?'
    ).bind(did).first();

    if (!player || !player.phase1_verified) {
      return Response.json({ error: 'Player not verified' }, { status: 403 });
    }

    // Weighted random feed:
    // - Start with all Phase 2 NFTs not yet voted on by this user
    // - Exclude NFTs the user holds or created
    // - Weight by: (1 / (1 + total_votes)) * recency_factor
    // - recency_factor = 1 / (1 + days_since_mint)
    //
    // Using a simplified approach: ORDER BY a score that combines
    // inverse vote count with recency, plus randomness.
    const feed = await context.env.DB.prepare(`
      SELECT
        pm.mint_number as edition_number,
        pm.mintgarden_launcher_id as nft_id,
        pm.wallet_address as creator_wallet,
        pm.layers_json,
        pm.ipfs_image_uri,
        nn.custom_name,
        nn.full_name,
        COALESCE(ws.total_votes, 0) as total_votes,
        COALESCE(ws.likes, 0) as likes,
        COALESCE(ws.dislikes, 0) as dislikes
      FROM phase2_mints pm
      LEFT JOIN wojak_scores ws ON ws.edition_number = pm.mint_number
      LEFT JOIN nft_names nn ON nn.edition_number = pm.mint_number
      WHERE pm.status = 'minted'
        AND pm.mintgarden_launcher_id IS NOT NULL
        -- Exclude already voted
        AND NOT EXISTS (
          SELECT 1 FROM wojak_votes wv
          WHERE wv.voter_did = ? AND wv.nft_id = pm.mintgarden_launcher_id
        )
        -- Exclude own creations
        AND pm.wallet_address != ?
        -- Exclude own holdings
        AND NOT EXISTS (
          SELECT 1 FROM did_holdings dh
          WHERE dh.did_id = ? AND dh.nft_id = pm.mintgarden_launcher_id
        )
      ORDER BY
        -- Weighted random: newer + fewer votes = higher chance
        -- ABS(RANDOM()) gives random ordering, divided by weight for bias
        ABS(RANDOM()) / (
          (1.0 / (1.0 + COALESCE(ws.total_votes, 0))) *
          (1.0 / (1.0 + JULIANDAY('now') - JULIANDAY(pm.created_at)))
        )
      LIMIT ?
    `).bind(did, player.wallet_address, did, limit).all();

    return Response.json({
      success: true,
      feed: feed.results.map((row: Record<string, unknown>) => ({
        nftId: row.nft_id,
        editionNumber: row.edition_number,
        creatorWallet: row.creator_wallet,
        name: row.full_name || `Your Wojak #${row.edition_number}`,
        customName: row.custom_name,
        imageUri: row.ipfs_image_uri,
        totalVotes: row.total_votes,
        likes: row.likes,
        dislikes: row.dislikes,
      })),
    });
  } catch (err) {
    console.error('Feed error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
```

**Step 3: Commit**

```bash
git add functions/api/game/vote.ts functions/api/game/feed.ts
git commit -m "feat: add voting API and weighted random feed

POST /api/game/vote — cast like/dislike with daily limit (10/day)
GET /api/game/feed — weighted random feed (newer + fewer votes = higher priority)
Guards: DID+Phase1 required, can't vote own/held, no duplicates"
```

---

### Task A4: Power Level Calculation API

**Files:**
- Create: `functions/api/game/power-level.ts`
- Create: `functions/api/game/leaderboard.ts`

**Context:** Power Level = score from holdings + score from creations. Scale 0-9,000. Conservative, additive, no multipliers. See Design Doc Section 4.

**Step 1: Create Power Level calculation endpoint**

Create `functions/api/game/power-level.ts`:

```typescript
// GET /api/game/power-level?did=<did>
// Recalculates and returns a player's Power Level.
// Also callable as POST to force recalculation.

import { POWER_LEVEL_MAX } from './_shared';

interface Env {
  DB: D1Database;
}

// Scoring weights — tunable constants
const QUALITY_WEIGHT = 1.0;         // Net votes (likes - dislikes) per NFT
const VALUE_BASE = 50;              // Base points per NFT held (regardless of surcharge)
const VALUE_LOG_SCALE = 30;         // Points from surcharge: VALUE_LOG_SCALE * ln(1 + surcharge_xch)
const BREADTH_BONUS = 15;           // Points per unique creator held
const CREATOR_QUALITY_WEIGHT = 0.5; // Net votes across all creations (halved vs holder)
const CREATOR_SPREAD_BONUS = 10;    // Points per unique DID holding your work

export const onRequestGet: PagesFunction<Env> = async (context) => {
  return calculatePowerLevel(context);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  return calculatePowerLevel(context);
};

async function calculatePowerLevel(context: EventContext<Env, string, unknown>) {
  try {
    const url = new URL(context.request.url);
    const did = url.searchParams.get('did') ||
      ((context.request.method === 'POST')
        ? ((await context.request.json()) as { did: string }).did
        : null);

    if (!did) {
      return Response.json({ error: 'DID required' }, { status: 400 });
    }

    const player = await context.env.DB.prepare(
      'SELECT * FROM game_players WHERE did_id = ?'
    ).bind(did).first();

    if (!player) {
      return Response.json({ error: 'Player not registered' }, { status: 404 });
    }

    // =============================================
    // SCORE FROM HOLDINGS (Collector side)
    // =============================================
    // For each Phase 2 NFT in this DID:
    //   quality = likes - dislikes
    //   value = VALUE_BASE + VALUE_LOG_SCALE * ln(1 + surcharge)
    //   breadth = BREADTH_BONUS per unique creator (first NFT from each creator)

    const holdings = await context.env.DB.prepare(`
      SELECT
        dh.nft_id,
        dh.edition_number,
        dh.creator_wallet,
        COALESCE(ws.net_score, 0) as net_score,
        COALESCE(pm.trait_surcharge_xch, 0) as surcharge
      FROM did_holdings dh
      LEFT JOIN wojak_scores ws ON ws.nft_id = dh.nft_id
      LEFT JOIN phase2_mints pm ON pm.mint_number = dh.edition_number
      WHERE dh.did_id = ? AND dh.collection = 'phase2'
    `).bind(did).all();

    let holdingsScore = 0;
    const seenCreators = new Set<string>();

    for (const nft of holdings.results) {
      // Quality: net votes (can be negative)
      const quality = (nft.net_score as number) * QUALITY_WEIGHT;

      // Value: base + logarithmic surcharge bonus
      // surcharge is stored as integer (x100000), convert to XCH
      const surchargeXch = (nft.surcharge as number) / 100000;
      const value = VALUE_BASE + VALUE_LOG_SCALE * Math.log(1 + surchargeXch);

      // Breadth: one-time bonus per unique creator
      let breadth = 0;
      const creator = nft.creator_wallet as string;
      if (creator && creator !== player.wallet_address && !seenCreators.has(creator)) {
        seenCreators.add(creator);
        breadth = BREADTH_BONUS;
      }

      holdingsScore += quality + value + breadth;
    }

    // =============================================
    // SCORE FROM CREATIONS (Creator side)
    // =============================================
    // Sum of net_score across all NFTs you created
    // Plus bonus per unique DID holding your work

    const creationStats = await context.env.DB.prepare(`
      SELECT
        COALESCE(SUM(ws.net_score), 0) as total_net_score,
        COUNT(DISTINCT dh.did_id) as unique_collectors
      FROM wojak_scores ws
      LEFT JOIN did_holdings dh ON dh.nft_id = ws.nft_id AND dh.did_id != ?
      WHERE ws.creator_wallet = ?
    `).bind(did, player.wallet_address).first();

    const creatorQuality = ((creationStats?.total_net_score as number) || 0) * CREATOR_QUALITY_WEIGHT;
    const creatorSpread = ((creationStats?.unique_collectors as number) || 0) * CREATOR_SPREAD_BONUS;
    const creationsScore = creatorQuality + creatorSpread;

    // =============================================
    // TOTAL & SCALE
    // =============================================
    const rawTotal = holdingsScore + creationsScore;
    // Clamp to 0-9000 range. In early days, scores will be low.
    // As collection grows, we may need to adjust weights.
    const powerLevel = Math.max(0, Math.min(POWER_LEVEL_MAX, Math.round(rawTotal)));

    // Cache the result
    await context.env.DB.prepare(`
      UPDATE game_players
      SET power_level = ?, power_level_updated_at = datetime('now'), updated_at = datetime('now')
      WHERE did_id = ?
    `).bind(powerLevel, did).run();

    return Response.json({
      success: true,
      powerLevel,
      breakdown: {
        holdings: {
          score: Math.round(holdingsScore),
          nftCount: holdings.results.length,
          uniqueCreators: seenCreators.size,
        },
        creations: {
          score: Math.round(creationsScore),
          quality: Math.round(creatorQuality),
          spread: Math.round(creatorSpread),
          uniqueCollectors: (creationStats?.unique_collectors as number) || 0,
        },
      },
    });
  } catch (err) {
    console.error('Power Level error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

**Step 2: Create leaderboard endpoint**

Create `functions/api/game/leaderboard.ts`:

```typescript
// GET /api/game/leaderboard?limit=50&offset=0
// Returns ranked players by Power Level.

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const results = await context.env.DB.prepare(`
      SELECT
        did_id,
        wallet_address,
        power_level,
        total_votes_cast,
        created_at
      FROM game_players
      WHERE phase1_verified = 1 AND power_level > 0
      ORDER BY power_level DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();

    const total = await context.env.DB.prepare(
      'SELECT COUNT(*) as count FROM game_players WHERE phase1_verified = 1 AND power_level > 0'
    ).first();

    return Response.json({
      success: true,
      entries: results.results.map((row: Record<string, unknown>, i: number) => ({
        rank: offset + i + 1,
        did: row.did_id,
        walletAddress: row.wallet_address,
        powerLevel: row.power_level,
        totalVotesCast: row.total_votes_cast,
      })),
      pagination: {
        limit,
        offset,
        total: (total?.count as number) || 0,
        hasMore: offset + limit < ((total?.count as number) || 0),
      },
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
```

**Step 3: Commit**

```bash
git add functions/api/game/power-level.ts functions/api/game/leaderboard.ts
git commit -m "feat: add Power Level calculation and leaderboard APIs

GET/POST /api/game/power-level — calculate score from holdings + creations
GET /api/game/leaderboard — ranked players by Power Level
Scoring: quality (votes) + value (surcharge tier) + breadth (unique creators)"
```

---

### Task A5: DID Holdings Indexer Worker

**Files:**
- Create: `workers/did-indexer/worker.ts`
- Create: `workers/did-indexer/wrangler.toml`

**Context:** Read `workers/credit-tracker/worker.ts` and `workers/credit-tracker/wrangler.toml` for the existing worker pattern (cron, D1 binding, MintGarden API calls). This worker runs every 30 minutes to scan DID holdings.

**Step 1: Create wrangler.toml**

Create `workers/did-indexer/wrangler.toml`:

```toml
name = "wojak-did-indexer"
main = "worker.ts"
compatibility_date = "2024-12-01"

[triggers]
crons = ["*/30 * * * *"]

[[d1_databases]]
binding = "DB"
database_name = "wojak-ink-db"
database_id = "<PRODUCTION_DB_ID>"
```

**Step 2: Create the indexer worker**

Create `workers/did-indexer/worker.ts`:

```typescript
// DID Holdings Indexer
// Runs every 30 minutes. For each registered game player:
// 1. Fetches their DID's NFT holdings from MintGarden
// 2. Updates did_holdings table (add new, remove transferred)
// 3. Triggers Power Level recalculation if holdings changed

interface Env {
  DB: D1Database;
}

const PHASE1_COLLECTION = 'col1z0ef7w5n4vq9qkue67y8jns89re570npt0s4wwtcmpv3lxsmjq4yqs9ser0h';
const PHASE2_COLLECTION = '<PHASE2_COLLECTION_ID>'; // Set from env or hardcode after launch

const RATE_LIMIT_MS = 500; // 500ms between MintGarden API calls

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(run(env));
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/run') {
      await run(env);
      return new Response('DID indexer run complete');
    }
    return new Response('DID Holdings Indexer. Use /run to trigger manually.', { status: 200 });
  },
};

async function run(env: Env) {
  console.log('[DID Indexer] Starting run...');

  // Get all registered players
  const players = await env.DB.prepare(
    'SELECT did_id, wallet_address FROM game_players'
  ).all();

  console.log(`[DID Indexer] Processing ${players.results.length} players`);

  let updatedCount = 0;

  for (const player of players.results) {
    const did = player.did_id as string;

    try {
      const changed = await syncDIDHoldings(env, did);
      if (changed) updatedCount++;
    } catch (err) {
      console.error(`[DID Indexer] Error for DID ${did}:`, err);
    }

    // Rate limit
    await sleep(RATE_LIMIT_MS);
  }

  console.log(`[DID Indexer] Done. ${updatedCount}/${players.results.length} players had changes.`);
}

async function syncDIDHoldings(env: Env, did: string): Promise<boolean> {
  // Fetch Phase 2 NFTs from MintGarden
  const phase2Nfts = await fetchDIDNfts(did, PHASE2_COLLECTION);
  // Fetch Phase 1 NFTs from MintGarden
  const phase1Nfts = await fetchDIDNfts(did, PHASE1_COLLECTION);

  await sleep(RATE_LIMIT_MS); // Rate limit between the two calls

  // Get current DB holdings
  const currentHoldings = await env.DB.prepare(
    'SELECT nft_id, collection FROM did_holdings WHERE did_id = ?'
  ).bind(did).all();

  const currentSet = new Set(currentHoldings.results.map(r => r.nft_id as string));
  const newSet = new Set([
    ...phase2Nfts.map(n => n.id),
    ...phase1Nfts.map(n => n.id),
  ]);

  // Find additions and removals
  const toAdd: { id: string; collection: string; edition?: number; creator?: string }[] = [];
  const toRemove: string[] = [];

  for (const nft of phase2Nfts) {
    if (!currentSet.has(nft.id)) {
      toAdd.push({ id: nft.id, collection: 'phase2', edition: nft.edition, creator: nft.creator });
    }
  }
  for (const nft of phase1Nfts) {
    if (!currentSet.has(nft.id)) {
      toAdd.push({ id: nft.id, collection: 'phase1' });
    }
  }
  for (const current of currentHoldings.results) {
    if (!newSet.has(current.nft_id as string)) {
      toRemove.push(current.nft_id as string);
    }
  }

  if (toAdd.length === 0 && toRemove.length === 0) {
    return false; // No changes
  }

  // Apply changes in a batch
  const statements: D1PreparedStatement[] = [];

  for (const nft of toAdd) {
    statements.push(
      env.DB.prepare(`
        INSERT OR IGNORE INTO did_holdings (did_id, nft_id, edition_number, collection, creator_wallet)
        VALUES (?, ?, ?, ?, ?)
      `).bind(did, nft.id, nft.edition || null, nft.collection, nft.creator || null)
    );
  }

  for (const nftId of toRemove) {
    statements.push(
      env.DB.prepare('DELETE FROM did_holdings WHERE did_id = ? AND nft_id = ?').bind(did, nftId)
    );
  }

  if (statements.length > 0) {
    await env.DB.batch(statements);
  }

  // Check Phase 1 verification status
  const hasPhase1 = phase1Nfts.length > 0;
  await env.DB.prepare(
    'UPDATE game_players SET phase1_verified = ?, updated_at = datetime(\'now\') WHERE did_id = ?'
  ).bind(hasPhase1 ? 1 : 0, did).run();

  console.log(`[DID Indexer] DID ${did.slice(0, 20)}...: +${toAdd.length} -${toRemove.length} NFTs`);
  return true;
}

interface NftInfo {
  id: string;
  edition?: number;
  creator?: string;
}

async function fetchDIDNfts(did: string, collectionId: string): Promise<NftInfo[]> {
  const nfts: NftInfo[] = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    const url = `https://api.mintgarden.io/nfts?collection_id=${collectionId}&owner_did=${encodeURIComponent(did)}&size=${pageSize}&page=${page}`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      console.error(`MintGarden API error: ${response.status} for ${url}`);
      break;
    }

    const data = await response.json() as {
      items: Array<{
        id: string;
        data?: { metadata_json?: { edition_number?: number } };
        minter_address?: string;
      }>;
    };

    if (!data.items || data.items.length === 0) break;

    for (const item of data.items) {
      nfts.push({
        id: item.id,
        edition: item.data?.metadata_json?.edition_number,
        creator: item.minter_address,
      });
    }

    if (data.items.length < pageSize) break;
    page++;
  }

  return nfts;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

**Step 3: Commit**

```bash
git add workers/did-indexer/
git commit -m "feat: add DID holdings indexer worker

Cron every 30 min — scans MintGarden for each player's DID holdings.
Updates did_holdings table (add new, remove transferred NFTs).
Updates Phase 1 verification status when NFTs transfer.
Rate-limited to avoid MintGarden API throttling."
```

---

### Task A6: NFT Naming in Mint Flow

**Files:**
- Modify: `functions/api/mint/submit.ts` — add `customName` field
- Modify: `functions/api/mint/process.ts` — include name in metadata
- Create: `src/lib/nameGenerator.ts` — random name generator
- Modify: Generator mint UI (ActionBar or mint modal) — add name input

**Context:** Read `functions/api/mint/submit.ts` (lines 92-120 for validation), `functions/api/mint/process.ts` (line 147 for metadata name field). NFT name format: "Your Wojak #42: Pepe Slayer" (15 chars max for custom part).

**Step 1: Create name generator**

Create `src/lib/nameGenerator.ts`:

```typescript
// Random name generator for Your Wojak NFTs
// Generates fun, meme-culture names. Max 15 characters.

const PREFIXES = [
  'Moon', 'Chia', 'Degen', 'Cope', 'Sigma', 'Based', 'Mega', 'Ultra',
  'Pepe', 'Donut', 'Alpha', 'Iron', 'Dark', 'Gold', 'Neon', 'Zen',
  'Pixel', 'Turbo', 'Lil', 'Big', 'Dr', 'King', 'Lord', 'Ser',
  'Bro', 'Papa', 'Baby', 'Mad', 'Chill', 'Hype',
];

const SUFFIXES = [
  'Boy', 'Chad', 'King', 'Lord', 'Dude', 'Man', 'Bro', 'Ape',
  'Punk', 'Bear', 'Bull', 'Dev', 'Whale', 'Frog', 'Sage', 'Boss',
  'Don', 'Sir', 'Mage', 'Chef', 'Monk', 'Slayer', 'Flex',
  'Rick', 'Sensei', 'Tank', 'Pro', 'Max', 'Rex', 'Ace',
];

const FULL_NAMES = [
  'Moon Boy', 'Chia Chad', 'Degen King', 'Cope Lord',
  'Sigma Grind', 'Based Dad', 'Paper Hands', 'Donut Lord',
  'Big Brain', 'Numb Skull', 'Lil Pump', 'Iron Hands',
  'Turbo Nerd', 'Dark Mage', 'Pixel Punk', 'Zen Master',
  'Gold Digger', 'Neon Cowboy', 'Mad Lad', 'Hype Beast',
  'Bag Holder', 'Floor Sniper', 'Rug Puller', 'Chart Wiz',
  'Vibe Check', 'No Chill', 'NGMI Steve', 'WAGMI Bro',
];

export const MAX_NAME_LENGTH = 15;

export function generateRandomName(): string {
  // 50% chance to use a full premade name, 50% to combine
  if (Math.random() < 0.5 && FULL_NAMES.length > 0) {
    const name = FULL_NAMES[Math.floor(Math.random() * FULL_NAMES.length)];
    return name.slice(0, MAX_NAME_LENGTH);
  }

  const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
  const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
  const name = `${prefix} ${suffix}`;
  return name.slice(0, MAX_NAME_LENGTH);
}

export function validateName(name: string): { valid: boolean; error?: string } {
  if (name.length === 0) return { valid: true }; // Empty = no custom name, that's fine
  if (name.length > MAX_NAME_LENGTH) {
    return { valid: false, error: `Name must be ${MAX_NAME_LENGTH} characters or less` };
  }
  // Alphanumeric + spaces + basic punctuation
  if (!/^[a-zA-Z0-9 .,!?'-]+$/.test(name)) {
    return { valid: false, error: 'Name can only contain letters, numbers, spaces, and basic punctuation' };
  }
  // No leading/trailing spaces
  if (name !== name.trim()) {
    return { valid: false, error: 'Name cannot start or end with spaces' };
  }
  return { valid: true };
}

export function formatFullName(editionNumber: number, customName?: string): string {
  if (customName && customName.trim()) {
    return `Your Wojak #${editionNumber}: ${customName.trim()}`;
  }
  return `Your Wojak #${editionNumber}`;
}
```

**Step 2: Modify submit.ts — add customName to request body**

In `functions/api/mint/submit.ts`, add `customName` to the request body validation (after wallet validation, around line 101):

```typescript
// Add to the body parsing:
const customName = (body.customName as string || '').trim();

// Validate name
if (customName.length > 0) {
  if (customName.length > 15) {
    return Response.json({ error: 'Custom name must be 15 characters or less' }, { status: 400 });
  }
  if (!/^[a-zA-Z0-9 .,!?'-]+$/.test(customName)) {
    return Response.json({ error: 'Name contains invalid characters' }, { status: 400 });
  }
}

// Pass customName through the mint job data so process.ts can use it
// Add to the mint_jobs insert: custom_name column
```

**Step 3: Modify process.ts — include name in CHIP-0007 metadata**

In `functions/api/mint/process.ts`, around line 147 where the metadata name is set:

```typescript
// Change from:
// name: `Your Wojak #${mintNumber}`,
// To:
const customName = job.custom_name as string | null;
const fullName = customName
  ? `Your Wojak #${mintNumber}: ${customName}`
  : `Your Wojak #${mintNumber}`;
// ...
// name: fullName,
```

Also insert into `nft_names` table after successful mint:

```typescript
await env.DB.prepare(`
  INSERT OR REPLACE INTO nft_names (edition_number, custom_name, full_name)
  VALUES (?, ?, ?)
`).bind(mintNumber, customName || null, fullName).run();
```

**Step 4: Add mint_jobs schema update**

The `mint_jobs` table needs a `custom_name` column. Add to migration `045_game_foundation.sql` (or create a new migration if 045 is already applied):

```sql
ALTER TABLE mint_jobs ADD COLUMN custom_name TEXT;
```

**Step 5: Commit**

```bash
git add src/lib/nameGenerator.ts functions/api/mint/submit.ts functions/api/mint/process.ts
git commit -m "feat: add NFT naming to mint flow

15 char max custom names, format: 'Your Wojak #42: Pepe Slayer'
Random name generator with meme-culture word lists
Name validated on submit, stored in CHIP-0007 metadata + nft_names table"
```

---

### Task A7: Voting UI — Tinder-Style Swipe Component

**Files:**
- Create: `src/components/game/VotingFeed.tsx`
- Create: `src/components/game/SwipeCard.tsx`
- Create: `src/contexts/GameContext.tsx`
- Modify: `src/styles/theme.css` — add game component styles
- Modify: `src/App.tsx` — add game routes

**Context:** Read `src/components/voting/FlickModeToggle.tsx` for existing voting UI patterns. Read `src/pages/GamesHub.tsx` for how voting state is managed. The new voting is Tinder-style: full-screen card, swipe left (dislike) or right (like). No skip button.

**Step 1: Create GameContext**

Create `src/contexts/GameContext.tsx`:

```typescript
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

interface GamePlayer {
  did: string;
  walletAddress: string;
  powerLevel: number;
  phase1Verified: boolean;
  votesToday: number;
  votesRemaining: number;
  onboarding: {
    did: boolean;
    phase1: boolean;
    minted: boolean;
    voted: boolean;
    battled: boolean;
  };
}

interface FeedItem {
  nftId: string;
  editionNumber: number;
  creatorWallet: string;
  name: string;
  customName: string | null;
  imageUri: string;
  totalVotes: number;
  likes: number;
  dislikes: number;
}

interface GameContextType {
  player: GamePlayer | null;
  isRegistered: boolean;
  isVerified: boolean;
  feed: FeedItem[];
  feedLoading: boolean;
  register: (did: string, walletAddress: string) => Promise<void>;
  verifyPhase1: (did: string) => Promise<boolean>;
  castVote: (nftId: string, editionNumber: number, voteType: 1 | -1) => Promise<boolean>;
  loadFeed: () => Promise<void>;
  refreshPowerLevel: () => Promise<void>;
}

const GameContext = createContext<GameContextType | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be inside GameProvider');
  return ctx;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<GamePlayer | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);

  const register = useCallback(async (did: string, walletAddress: string) => {
    const res = await fetch('/api/game/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ did, walletAddress }),
    });
    const data = await res.json();
    if (data.success) {
      setPlayer({
        did: data.player.did,
        walletAddress: walletAddress,
        powerLevel: data.player.powerLevel,
        phase1Verified: data.player.phase1Verified,
        votesToday: data.player.votesToday,
        votesRemaining: 10 - data.player.votesToday,
        onboarding: data.player.onboarding,
      });
    }
  }, []);

  const verifyPhase1 = useCallback(async (did: string) => {
    const res = await fetch('/api/game/verify-phase1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ did }),
    });
    const data = await res.json();
    if (data.verified && player) {
      setPlayer({ ...player, phase1Verified: true, onboarding: { ...player.onboarding, phase1: true } });
    }
    return data.verified;
  }, [player]);

  const loadFeed = useCallback(async () => {
    if (!player) return;
    setFeedLoading(true);
    try {
      const res = await fetch(`/api/game/feed?did=${player.did}&limit=10`);
      const data = await res.json();
      if (data.success) {
        setFeed(data.feed);
      }
    } finally {
      setFeedLoading(false);
    }
  }, [player]);

  const castVote = useCallback(async (nftId: string, editionNumber: number, voteType: 1 | -1) => {
    if (!player) return false;
    const res = await fetch('/api/game/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voterDid: player.did, nftId, editionNumber, voteType }),
    });
    const data = await res.json();
    if (data.success) {
      setPlayer(prev => prev ? {
        ...prev,
        votesToday: prev.votesToday + 1,
        votesRemaining: data.votesRemaining,
      } : null);
      // Remove voted item from feed
      setFeed(prev => prev.filter(item => item.nftId !== nftId));
      return true;
    }
    return false;
  }, [player]);

  const refreshPowerLevel = useCallback(async () => {
    if (!player) return;
    const res = await fetch(`/api/game/power-level?did=${player.did}`);
    const data = await res.json();
    if (data.success) {
      setPlayer(prev => prev ? { ...prev, powerLevel: data.powerLevel } : null);
    }
  }, [player]);

  return (
    <GameContext.Provider value={{
      player,
      isRegistered: !!player,
      isVerified: !!player?.phase1Verified,
      feed,
      feedLoading,
      register,
      verifyPhase1,
      castVote,
      loadFeed,
      refreshPowerLevel,
    }}>
      {children}
    </GameContext.Provider>
  );
}
```

**Step 2: Create SwipeCard component**

Create `src/components/game/SwipeCard.tsx`:

```typescript
// Tinder-style swipe card for voting.
// Swipe right = like, swipe left = dislike.
// Uses framer-motion for drag gestures.

import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useState } from 'react';

interface SwipeCardProps {
  name: string;
  imageUri: string;
  editionNumber: number;
  onVote: (voteType: 1 | -1) => void;
}

const SWIPE_THRESHOLD = 100; // px to trigger a vote

export function SwipeCard({ name, imageUri, editionNumber, onVote }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const dislikeOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const [exiting, setExiting] = useState(false);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > SWIPE_THRESHOLD) {
      setExiting(true);
      const voteType = info.offset.x > 0 ? 1 : -1;
      // Animate off screen then vote
      setTimeout(() => onVote(voteType as 1 | -1), 200);
    }
  };

  return (
    <motion.div
      className="swipe-card"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      animate={exiting ? { x: x.get() > 0 ? 500 : -500, opacity: 0 } : {}}
      transition={{ duration: 0.2 }}
    >
      {/* Like indicator */}
      <motion.div
        className="swipe-indicator swipe-like"
        style={{ opacity: likeOpacity }}
      >
        👍 LIKE
      </motion.div>

      {/* Dislike indicator */}
      <motion.div
        className="swipe-indicator swipe-dislike"
        style={{ opacity: dislikeOpacity }}
      >
        👎 NOPE
      </motion.div>

      {/* NFT Image */}
      <div className="swipe-card-image">
        <img src={imageUri} alt={name} draggable={false} />
      </div>

      {/* Name */}
      <div className="swipe-card-info">
        <h3>{name}</h3>
        <span className="text-secondary">#{editionNumber}</span>
      </div>

      {/* Tap buttons for desktop */}
      <div className="swipe-card-buttons">
        <button
          className="btn btn-ghost swipe-btn-dislike"
          onClick={() => { setExiting(true); setTimeout(() => onVote(-1), 200); }}
        >
          👎
        </button>
        <button
          className="btn btn-ghost swipe-btn-like"
          onClick={() => { setExiting(true); setTimeout(() => onVote(1), 200); }}
        >
          👍
        </button>
      </div>
    </motion.div>
  );
}
```

**Step 3: Create VotingFeed page component**

Create `src/components/game/VotingFeed.tsx`:

```typescript
import { useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { SwipeCard } from './SwipeCard';

export function VotingFeed() {
  const { player, isVerified, feed, feedLoading, loadFeed, castVote } = useGame();

  useEffect(() => {
    if (isVerified) {
      loadFeed();
    }
  }, [isVerified, loadFeed]);

  if (!player) {
    return (
      <div className="card-static p-8 flex flex-col items-center gap-4">
        <h2 className="text-xl font-bold">Connect Your Wallet</h2>
        <p className="text-secondary">Connect your Sage wallet with a DID to start voting.</p>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="card-static p-8 flex flex-col items-center gap-4">
        <h2 className="text-xl font-bold">Phase 1 NFT Required</h2>
        <p className="text-secondary">
          You need at least 1 Wojak Farmers Plot NFT assigned to your DID to vote.
        </p>
      </div>
    );
  }

  if (player.votesRemaining <= 0) {
    return (
      <div className="card-static p-8 flex flex-col items-center gap-4">
        <h2 className="text-xl font-bold">Votes Used Up!</h2>
        <p className="text-secondary">
          You've used all {10} votes today. Come back tomorrow!
        </p>
        <div className="badge badge-cyan">{player.votesToday}/10 votes cast</div>
      </div>
    );
  }

  if (feedLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-secondary">Loading feed...</div>
      </div>
    );
  }

  const currentItem = feed[0];

  if (!currentItem) {
    return (
      <div className="card-static p-8 flex flex-col items-center gap-4">
        <h2 className="text-xl font-bold">All Caught Up!</h2>
        <p className="text-secondary">
          You've seen all available Wojaks. Check back later for new mints!
        </p>
      </div>
    );
  }

  const handleVote = async (voteType: 1 | -1) => {
    await castVote(currentItem.nftId, currentItem.editionNumber, voteType);
    // Feed auto-updates (castVote removes voted item)
    // Load more if running low
    if (feed.length <= 3) {
      loadFeed();
    }
  };

  return (
    <div className="voting-feed flex flex-col items-center gap-4">
      {/* Votes remaining badge */}
      <div className="flex items-center gap-2">
        <span className="badge">{player.votesRemaining} votes left today</span>
      </div>

      {/* Swipe card */}
      <SwipeCard
        key={currentItem.nftId}
        name={currentItem.name}
        imageUri={currentItem.imageUri}
        editionNumber={currentItem.editionNumber}
        onVote={handleVote}
      />

      {/* Instructions */}
      <p className="text-muted text-sm">
        Swipe right to like · Swipe left to dislike
      </p>
    </div>
  );
}
```

**Step 4: Add game styles to theme.css**

Add to `src/styles/theme.css`:

```css
/* ============================================================
   YOUR WOJAK GAME
   ============================================================ */

/* Swipe Card */
.swipe-card {
  position: relative;
  width: 100%;
  max-width: 360px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  cursor: grab;
  touch-action: pan-y;
  user-select: none;
}

.swipe-card:active {
  cursor: grabbing;
}

.swipe-card-image {
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
}

.swipe-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.swipe-card-info {
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.swipe-card-info h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
}

.swipe-card-buttons {
  display: flex;
  justify-content: center;
  gap: 32px;
  padding: 0 16px 16px;
}

.swipe-btn-like,
.swipe-btn-dislike {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-full);
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.swipe-btn-like {
  border: 2px solid var(--color-success);
}

.swipe-btn-dislike {
  border: 2px solid var(--color-error);
}

.swipe-indicator {
  position: absolute;
  top: 20px;
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-size: 24px;
  font-weight: 900;
  z-index: 10;
  pointer-events: none;
}

.swipe-like {
  right: 20px;
  color: var(--color-success);
  border: 3px solid var(--color-success);
  transform: rotate(15deg);
}

.swipe-dislike {
  left: 20px;
  color: var(--color-error);
  border: 3px solid var(--color-error);
  transform: rotate(-15deg);
}

/* Voting Feed */
.voting-feed {
  min-height: 500px;
}

/* Power Level Badge */
.power-level-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-weight: 700;
  font-size: 14px;
}

.power-level-badge.tier-legend {
  background: linear-gradient(135deg, rgba(255, 107, 0, 0.2), rgba(255, 187, 36, 0.2));
  color: var(--color-gold);
  border: 1px solid rgba(255, 187, 36, 0.3);
  box-shadow: var(--glow-gold);
}

.power-level-badge.tier-top {
  background: rgba(168, 85, 247, 0.15);
  color: var(--color-purple);
  border: 1px solid rgba(168, 85, 247, 0.3);
}

.power-level-badge.tier-serious {
  background: rgba(0, 212, 255, 0.15);
  color: var(--color-cyan);
  border: 1px solid rgba(0, 212, 255, 0.3);
}

.power-level-badge.tier-active {
  background: rgba(34, 197, 94, 0.15);
  color: var(--color-success);
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.power-level-badge.tier-casual {
  color: var(--color-text-secondary);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--color-border);
}
```

**Step 5: Add game route to App.tsx**

In `src/App.tsx`, add the game voting route inside the `AppLayout` routes:

```typescript
// Add import:
import { GameProvider } from '@/contexts/GameContext';

// Add lazy import for game page:
const GameVoting = lazy(() => import('@/pages/GameVoting'));

// Add route (alongside existing /games route):
<Route path="/games/your-wojak" element={<GameVoting />} />
```

Create `src/pages/GameVoting.tsx`:

```typescript
import { VotingFeed } from '@/components/game/VotingFeed';
import { GameProvider } from '@/contexts/GameContext';

export default function GameVoting() {
  return (
    <GameProvider>
      <div className="flex flex-col items-center p-4 gap-6">
        <h1 className="text-2xl font-bold">Your Wojak</h1>
        <p className="text-secondary text-center">
          Vote on community Wojaks. Swipe right to like, left to dislike.
        </p>
        <VotingFeed />
      </div>
    </GameProvider>
  );
}
```

**Step 6: Commit**

```bash
git add src/components/game/ src/contexts/GameContext.tsx src/pages/GameVoting.tsx src/lib/nameGenerator.ts src/styles/theme.css src/App.tsx
git commit -m "feat: add Tinder-style voting UI and game context

SwipeCard with framer-motion drag gestures (swipe L/R to vote)
VotingFeed manages card stack with auto-reload
GameContext for player state, voting, feed, Power Level
Game styles in theme.css (swipe cards, power level badges)
Route: /games/your-wojak"
```

---

### Task A8: Dashboard & Profile Page

**Files:**
- Create: `src/pages/GameDashboard.tsx`
- Create: `src/components/game/PowerLevelDisplay.tsx`
- Create: `src/components/game/OnboardingChecklist.tsx`
- Create: `src/components/game/ActivityFeed.tsx`
- Modify: `src/App.tsx` — add dashboard route

**Context:** Read `src/pages/Account.tsx` for the existing profile layout pattern. The game dashboard shows: Power Level + rank, onboarding milestones, collection overview, creation stats, activity feed. Fully public — every user's profile is visible to everyone.

**Step 1: Create PowerLevelDisplay**

Create `src/components/game/PowerLevelDisplay.tsx`:

```typescript
interface PowerLevelDisplayProps {
  level: number;
  rank?: number;
  breakdown?: {
    holdings: { score: number; nftCount: number; uniqueCreators: number };
    creations: { score: number; quality: number; spread: number; uniqueCollectors: number };
  };
}

function getTier(level: number) {
  if (level >= 9000) return { name: 'Legend', class: 'tier-legend', label: "IT'S OVER 9,000!" };
  if (level >= 5000) return { name: 'Top Tier', class: 'tier-top', label: 'Top Tier' };
  if (level >= 2000) return { name: 'Serious', class: 'tier-serious', label: 'Serious' };
  if (level >= 500) return { name: 'Active', class: 'tier-active', label: 'Active' };
  if (level >= 100) return { name: 'Casual', class: 'tier-casual', label: 'Casual' };
  return { name: 'New', class: 'tier-casual', label: 'New Player' };
}

export function PowerLevelDisplay({ level, rank, breakdown }: PowerLevelDisplayProps) {
  const tier = getTier(level);

  return (
    <div className="card-static p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{level.toLocaleString()}</h2>
          <p className="text-secondary text-sm">Power Level</p>
        </div>
        <div className={`power-level-badge ${tier.class}`}>
          ⚡ {tier.label}
        </div>
      </div>

      {rank && (
        <p className="text-secondary">
          Rank <span className="text-accent font-bold">#{rank}</span> on the leaderboard
        </p>
      )}

      {breakdown && (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span className="text-secondary">From holdings:</span>
            <span>+{breakdown.holdings.score} ({breakdown.holdings.nftCount} NFTs, {breakdown.holdings.uniqueCreators} creators)</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-secondary">From creations:</span>
            <span>+{breakdown.creations.score} ({breakdown.creations.uniqueCollectors} collectors)</span>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Create OnboardingChecklist**

Create `src/components/game/OnboardingChecklist.tsx`:

```typescript
interface OnboardingChecklistProps {
  milestones: {
    did: boolean;
    phase1: boolean;
    minted: boolean;
    voted: boolean;
    battled: boolean;
  };
}

const MILESTONES = [
  { key: 'did', label: 'Create a DID', emoji: '🆔' },
  { key: 'phase1', label: 'Get a Wojak Farmers Plot NFT', emoji: '🌾' },
  { key: 'minted', label: 'Mint your first Your Wojak', emoji: '🎨' },
  { key: 'voted', label: 'Cast your first vote', emoji: '🗳️' },
  { key: 'battled', label: 'Enter your first battle', emoji: '⚔️' },
] as const;

export function OnboardingChecklist({ milestones }: OnboardingChecklistProps) {
  const completed = Object.values(milestones).filter(Boolean).length;
  const allDone = completed === MILESTONES.length;

  if (allDone) return null; // Hide when all milestones completed

  return (
    <div className="card-static p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Getting Started</h3>
        <span className="badge">{completed}/{MILESTONES.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {MILESTONES.map(({ key, label, emoji }) => (
          <div key={key} className="flex items-center gap-3 text-sm">
            <span>{milestones[key] ? '✅' : '☐'}</span>
            <span className={milestones[key] ? 'text-secondary line-through' : ''}>{emoji} {label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 3: Create the Dashboard page**

Create `src/pages/GameDashboard.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { GameProvider } from '@/contexts/GameContext';
import { PowerLevelDisplay } from '@/components/game/PowerLevelDisplay';
import { OnboardingChecklist } from '@/components/game/OnboardingChecklist';

function DashboardContent() {
  const { player, isRegistered, refreshPowerLevel } = useGame();
  const [breakdown, setBreakdown] = useState(null);

  useEffect(() => {
    if (isRegistered) {
      // Fetch Power Level breakdown
      fetch(`/api/game/power-level?did=${player?.did}`)
        .then(r => r.json())
        .then(data => {
          if (data.success) setBreakdown(data.breakdown);
        });
    }
  }, [isRegistered, player?.did]);

  if (!player) {
    return (
      <div className="card-static p-8 flex flex-col items-center gap-4">
        <h2 className="text-xl font-bold">Your Wojak Dashboard</h2>
        <p className="text-secondary">Connect your wallet to see your game profile.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Your Wojak Dashboard</h1>

      <PowerLevelDisplay
        level={player.powerLevel}
        breakdown={breakdown}
      />

      <OnboardingChecklist milestones={player.onboarding} />

      {/* Collection section - placeholder for now */}
      <div className="card-static p-4">
        <h3 className="font-semibold mb-2">Your Collection</h3>
        <p className="text-secondary text-sm">
          NFT collection display will be added with DID holdings integration.
        </p>
      </div>

      {/* Activity feed - placeholder */}
      <div className="card-static p-4">
        <h3 className="font-semibold mb-2">Activity</h3>
        <p className="text-secondary text-sm">
          Activity feed coming soon.
        </p>
      </div>
    </div>
  );
}

export default function GameDashboard() {
  return (
    <GameProvider>
      <DashboardContent />
    </GameProvider>
  );
}
```

**Step 4: Add route to App.tsx**

```typescript
const GameDashboard = lazy(() => import('@/pages/GameDashboard'));

// Add route:
<Route path="/games/your-wojak/dashboard" element={<GameDashboard />} />
```

**Step 5: Commit**

```bash
git add src/components/game/PowerLevelDisplay.tsx src/components/game/OnboardingChecklist.tsx src/pages/GameDashboard.tsx src/App.tsx
git commit -m "feat: add game dashboard with Power Level display and onboarding

PowerLevelDisplay: shows score, tier badge, rank, breakdown
OnboardingChecklist: getting started milestones (auto-hides when complete)
Route: /games/your-wojak/dashboard"
```

---

### Task A9: Name Input UI in Generator

**Files:**
- Modify: Generator mint UI component (find the mint confirmation dialog or ActionBar mint section)
- Use: `src/lib/nameGenerator.ts` (created in Task A6)

**Context:** Read `src/components/generator/ActionBar.tsx` (the mint CTA area, lines 714-786). The name input should appear in the mint flow BEFORE the user confirms. It should have: text input (15 char limit), "Generate Random" button, character counter.

**Step 1: Find and modify the mint confirmation flow**

Add name input component to the mint flow area in ActionBar.tsx (or whichever component handles the mint confirmation dialog). The input should:

```tsx
import { generateRandomName, validateName, MAX_NAME_LENGTH } from '@/lib/nameGenerator';

// In the mint confirmation area:
const [customName, setCustomName] = useState('');
const [nameError, setNameError] = useState('');

const handleNameChange = (value: string) => {
  const validation = validateName(value);
  setNameError(validation.error || '');
  if (value.length <= MAX_NAME_LENGTH) {
    setCustomName(value);
  }
};

const handleGenerateRandom = () => {
  const name = generateRandomName();
  setCustomName(name);
  setNameError('');
};

// JSX:
<div className="flex flex-col gap-2">
  <label className="text-xs text-secondary uppercase tracking-wider">
    Name your Wojak (optional)
  </label>
  <div className="flex gap-2">
    <div className="flex-1 relative">
      <input
        className="input w-full"
        type="text"
        value={customName}
        onChange={(e) => handleNameChange(e.target.value)}
        placeholder="e.g. Moon Boy"
        maxLength={MAX_NAME_LENGTH}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
        {customName.length}/{MAX_NAME_LENGTH}
      </span>
    </div>
    <button
      className="btn btn-ghost text-xs"
      onClick={handleGenerateRandom}
      type="button"
    >
      🎲 Random
    </button>
  </div>
  {nameError && <p className="text-xs" style={{ color: 'var(--color-error)' }}>{nameError}</p>}
  {customName && (
    <p className="text-xs text-secondary">
      Preview: Your Wojak #___: {customName}
    </p>
  )}
</div>
```

**Step 2: Pass customName to mint submit call**

When the mint is submitted (find the fetch call to `/api/mint/submit`), add `customName` to the request body:

```typescript
// In the mint submission:
body: JSON.stringify({
  ...existingBody,
  customName: customName.trim() || undefined,
}),
```

**Step 3: Commit**

```bash
git add src/components/generator/ActionBar.tsx src/lib/nameGenerator.ts
git commit -m "feat: add NFT naming UI to generator mint flow

15 char text input with character counter
Random name generator button (meme-culture word combos)
Name preview: 'Your Wojak #___: Moon Boy'
Passed to /api/mint/submit as customName field"
```

---

## END OF PHASE A

**Phase A delivers:** Database schema, player registration, Phase 1 verification, Tinder-style voting (10/day), Power Level calculation, leaderboard API, DID holdings indexer, NFT naming, game dashboard with onboarding, voting UI, game routes.

**Test the full flow:**
1. Connect wallet with DID → register player
2. Verify Phase 1 NFT ownership
3. Open voting feed → swipe on Wojaks
4. Check Power Level updates on dashboard
5. Mint a new Wojak with a custom name
6. Check leaderboard

---

## Phase B: The Economy

**What ships:** Credits expansion + Burn mechanic + SplitXCH royalties + Value/Breadth scoring

**Why second:** The economic layer gives meaning to the votes. Burns create deflation. Credits create the free-mint loop.

---

### Task B1: SplitXCH Integration

**Files:**
- Create: `functions/migrations/046_splitxch.sql`
- Create: `functions/api/mint/splitxch.ts`
- Modify: `functions/api/mint/request.ts` — use splitter address as royalty address
- Modify: `functions/api/mint/submit.ts` — call SplitXCH before mint

**Context:** SplitXCH API: `POST https://splitxch.com/api/compute/fast`. Takes recipients array with basis points. Returns deterministic splitter address. 150bp platform fee. Wave 1 split: creator 8258bp + treasury 1592bp + fee 150bp = 10,000.

**Step 1: Create migration**

Create `functions/migrations/046_splitxch.sql`:

```sql
-- 046_splitxch.sql
-- SplitXCH splitter address cache

CREATE TABLE IF NOT EXISTS splitter_addresses (
  creator_wallet TEXT NOT NULL,
  wave INTEGER NOT NULL DEFAULT 1,
  splitter_address TEXT NOT NULL,
  splitxch_id TEXT NOT NULL,
  creator_points INTEGER NOT NULL,
  treasury_points INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (creator_wallet, wave)
);
```

**Step 2: Create SplitXCH helper**

Create `functions/api/mint/splitxch.ts`:

```typescript
// SplitXCH integration
// Creates deterministic splitter addresses for royalty splitting.
// One API call per new creator, cached in DB forever.

interface Env {
  DB: D1Database;
  TREASURY_ADDRESS: string;
}

// Wave 1: 10% creator, 2% treasury (of 12% total royalty)
// SplitXCH fee: 150bp (1.5%)
// Fee split 50/50 between creator and treasury
// Creator: 10% * (10000 - 150/2) / 12% = 8258bp
// Treasury: 2% * (10000 - 150/2) / 12% = 1592bp
// Fee: 150bp
// Total: 8258 + 1592 + 150 = 10,000
const WAVE_CONFIG: Record<number, { creatorPoints: number; treasuryPoints: number }> = {
  1: { creatorPoints: 8258, treasuryPoints: 1592 },
  2: { creatorPoints: 7321, treasuryPoints: 2529 }, // 9%/3% adjusted for fee
  3: { creatorPoints: 6384, treasuryPoints: 3466 }, // 8%/4% adjusted for fee
  4: { creatorPoints: 5447, treasuryPoints: 4403 }, // 7%/5% adjusted for fee
};

export async function getOrCreateSplitterAddress(
  env: Env,
  creatorWallet: string,
  wave: number = 1,
): Promise<string> {
  // Check cache first
  const cached = await env.DB.prepare(
    'SELECT splitter_address FROM splitter_addresses WHERE creator_wallet = ? AND wave = ?'
  ).bind(creatorWallet, wave).first();

  if (cached) {
    return cached.splitter_address as string;
  }

  // Create new splitter via SplitXCH API
  const config = WAVE_CONFIG[wave];
  if (!config) {
    throw new Error(`No wave config for wave ${wave}`);
  }

  const treasuryAddress = env.TREASURY_ADDRESS;
  if (!treasuryAddress) {
    throw new Error('TREASURY_ADDRESS env var not set');
  }

  const requestBody = {
    recipients: [
      { address: creatorWallet, points: config.creatorPoints },
      { address: treasuryAddress, points: config.treasuryPoints },
    ],
  };

  const response = await fetch('https://splitxch.com/api/compute/fast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SplitXCH API error ${response.status}: ${text}`);
  }

  const data = await response.json() as {
    id: string;
    address: string;
  };

  // Cache in DB
  await env.DB.prepare(`
    INSERT INTO splitter_addresses (creator_wallet, wave, splitter_address, splitxch_id, creator_points, treasury_points)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    creatorWallet, wave, data.address, data.id,
    config.creatorPoints, config.treasuryPoints
  ).run();

  console.log(`[SplitXCH] Created splitter for ${creatorWallet.slice(0, 15)}...: ${data.address}`);
  return data.address;
}
```

**Step 3: Modify request.ts — use splitter address**

In `functions/api/mint/request.ts`, line 125, change:

```typescript
// FROM:
royalty_address: params.walletAddress,
// TO:
royalty_address: params.royaltyAddress || params.walletAddress,
```

And pass `royaltyAddress` from the calling code (submit.ts/process.ts) where the splitter address is resolved.

**Step 4: Modify submit.ts — resolve splitter before mint**

In the mint submit flow, before calling MintGarden, resolve the splitter address:

```typescript
import { getOrCreateSplitterAddress } from './splitxch';

// In the mint flow (paid or free):
const royaltyAddress = await getOrCreateSplitterAddress(env, walletAddress, 1 /* wave */);

// Pass to the MintGarden request:
// royaltyAddress is now the SplitXCH splitter, not the user's wallet
```

**Step 5: Commit**

```bash
git add functions/migrations/046_splitxch.sql functions/api/mint/splitxch.ts functions/api/mint/request.ts functions/api/mint/submit.ts
git commit -m "feat: integrate SplitXCH for 12% royalty splitting

Wave 1: 10% creator + 2% treasury via CHIP-0008 splitter puzzle
SplitXCH API called once per new creator, cached in splitter_addresses table
Royalty address on NFT is now the splitter (auto-splits payments)
Fee split 50/50: creator 8258bp + treasury 1592bp + 150bp SplitXCH fee"
```

---

### Task B2: Burn Detection & Credits

**Files:**
- Create: `functions/api/game/burn.ts`
- Modify: `workers/credit-tracker/worker.ts` — detect burn events
- Create: `functions/migrations/047_burn_tracking.sql`

**Context:** Burns are detected two ways: (1) via our UI (Path B — WalletConnect `chia_transferNFT` to burn address), or (2) via MintGarden API burn events (Path A — user burns in Sage wallet directly). Burn address: `xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqm6ks6e8mvy`. MintGarden `NftEvent.type === 3` = burn.

**Step 1: Create migration**

Create `functions/migrations/047_burn_tracking.sql`:

```sql
-- 047_burn_tracking.sql
-- Burn tracking for credit rewards

CREATE TABLE IF NOT EXISTS wojak_burns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nft_id TEXT NOT NULL UNIQUE,                -- MintGarden launcher_id
  edition_number INTEGER NOT NULL,
  burner_did TEXT,                             -- DID of the burner (if known)
  burner_wallet TEXT,                          -- Wallet that burned
  net_score_at_burn INTEGER NOT NULL DEFAULT 0, -- likes - dislikes at time of burn
  credits_awarded INTEGER NOT NULL DEFAULT 0,  -- Credits given for this burn
  detected_via TEXT NOT NULL,                  -- 'ui' or 'indexer'
  burned_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wojak_burns_burner ON wojak_burns(burner_wallet);
```

**Step 2: Create burn-via-UI endpoint**

Create `functions/api/game/burn.ts`:

```typescript
// POST /api/game/burn
// Records a burn done through our UI (Path B).
// The actual on-chain burn is handled by the wallet.
// This endpoint just records it and awards credits.

interface Env {
  DB: D1Database;
}

const BURN_ADDRESS = 'xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqm6ks6e8mvy';

// Credit formula based on vote ratio
function calculateBurnCredits(likes: number, dislikes: number): number {
  const total = likes + dislikes;
  if (total === 0) return 500; // Unvoted = small reward (5 credits)

  const dislikeRatio = dislikes / total;

  // Heavily disliked (>70% dislikes): 2000 credits (20 credits)
  // Moderately disliked (50-70%): 1200 credits (12 credits)
  // Neutral (30-50% dislikes): 500 credits (5 credits)
  // Liked (<30% dislikes): 200 credits (2 credits)
  if (dislikeRatio > 0.7) return 2000;
  if (dislikeRatio > 0.5) return 1200;
  if (dislikeRatio > 0.3) return 500;
  return 200;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as {
      nftId: string;
      editionNumber: number;
      burnerDid: string;
      burnerWallet: string;
    };

    const { nftId, editionNumber, burnerDid, burnerWallet } = body;

    if (!nftId || !editionNumber || !burnerWallet) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get current vote scores for this NFT
    const scores = await context.env.DB.prepare(
      'SELECT likes, dislikes, net_score FROM wojak_scores WHERE nft_id = ?'
    ).bind(nftId).first();

    const likes = (scores?.likes as number) || 0;
    const dislikes = (scores?.dislikes as number) || 0;
    const netScore = (scores?.net_score as number) || 0;
    const credits = calculateBurnCredits(likes, dislikes);

    // Record burn and award credits
    try {
      await context.env.DB.batch([
        context.env.DB.prepare(`
          INSERT INTO wojak_burns (nft_id, edition_number, burner_did, burner_wallet, net_score_at_burn, credits_awarded, detected_via)
          VALUES (?, ?, ?, ?, ?, ?, 'ui')
        `).bind(nftId, editionNumber, burnerDid || null, burnerWallet, netScore, credits),
        // Award credits
        context.env.DB.prepare(`
          INSERT INTO credit_events (wallet_address, nft_id, edition_number, credits_earned, source, created_at)
          VALUES (?, ?, ?, ?, 'burn', datetime('now'))
        `).bind(burnerWallet, nftId, editionNumber, credits),
        // Remove from did_holdings
        context.env.DB.prepare(
          'DELETE FROM did_holdings WHERE nft_id = ?'
        ).bind(nftId),
        // Log activity
        context.env.DB.prepare(`
          INSERT INTO game_activity (did_id, event_type, event_data)
          VALUES (?, 'burn', ?)
        `).bind(
          burnerDid || '',
          JSON.stringify({
            editionNumber,
            nftId,
            netScore,
            creditsEarned: credits,
            likes,
            dislikes,
          })
        ),
      ]);
    } catch (e: unknown) {
      if (e instanceof Error && e.message?.includes('UNIQUE')) {
        return Response.json({ error: 'This NFT has already been burned' }, { status: 409 });
      }
      throw e;
    }

    return Response.json({
      success: true,
      creditsEarned: credits,
      burnAddress: BURN_ADDRESS,
      message: `Burned Your Wojak #${editionNumber}. Earned ${credits / 100} credits.`,
    });
  } catch (err) {
    console.error('Burn error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
```

**Step 3: Add burn detection to credit-tracker worker**

In `workers/credit-tracker/worker.ts`, add a new function to detect burn events from MintGarden:

```typescript
// Add to the run() function, after existing trade processing:

async function detectBurns(env: Env) {
  // Fetch recent events for the Phase 2 collection
  // Filter for type === 3 (burn events)
  // For each burn not already in wojak_burns:
  //   1. Look up vote scores
  //   2. Calculate credits
  //   3. Insert into wojak_burns + credit_events
  //   4. Remove from did_holdings

  // Implementation follows the same pattern as existing trade detection
  // but filters for NftEvent.type === 3
}
```

**Step 4: Commit**

```bash
git add functions/migrations/047_burn_tracking.sql functions/api/game/burn.ts workers/credit-tracker/worker.ts
git commit -m "feat: add burn tracking and credit rewards

Burn credits: heavily disliked = 20 credits, liked = 2 credits
Path B (UI): POST /api/game/burn records and awards credits
Path A (Sage): credit-tracker worker detects MintGarden burn events
Removes burned NFTs from did_holdings, logs to activity feed"
```

---

### Task B3: Burn UI + WalletConnect Integration

**Files:**
- Modify: `src/sage-wallet/SageWalletProvider.tsx` — add `chia_transferNFT` to required methods
- Modify: `src/sage-wallet/useSageWalletStandalone.ts` — add `chia_transferNFT` to required methods
- Create: `src/components/game/BurnButton.tsx`
- Create: `src/components/game/BurnConfirmDialog.tsx`

**Context:** Burn address: `xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqm6ks6e8mvy`. WalletConnect method: `chia_transferNFT`. Currently NOT in the required methods list — must be added.

**Step 1: Add chia_transferNFT to WalletConnect required methods**

In `src/sage-wallet/SageWalletProvider.tsx` (line ~270-276), add to the methods array:

```typescript
methods: [
  'chip0002_getPublicKeys',
  'chia_signMessageByAddress',
  'chia_getAddress',
  'chia_takeOffer',
  'chia_send',
  'chip0002_getAssetBalance',
  'chia_transferNFT',  // NEW: needed for burn-via-UI
],
```

Same change in `src/sage-wallet/useSageWalletStandalone.ts` (line ~191-204).

**Step 2: Create BurnConfirmDialog**

Create `src/components/game/BurnConfirmDialog.tsx`:

```typescript
import { useState } from 'react';

const BURN_ADDRESS = 'xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqm6ks6e8mvy';

interface BurnConfirmDialogProps {
  nftName: string;
  editionNumber: number;
  likes: number;
  dislikes: number;
  estimatedCredits: number;
  onConfirm: () => void;
  onCancel: () => void;
  burning: boolean;
}

export function BurnConfirmDialog({
  nftName, editionNumber, likes, dislikes, estimatedCredits,
  onConfirm, onCancel, burning,
}: BurnConfirmDialogProps) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div className="card-static p-6 max-w-md w-full flex flex-col gap-4">
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-error)' }}>
          🔥 Burn {nftName}?
        </h2>

        <div className="flex flex-col gap-2 text-sm">
          <p className="text-secondary">
            This action is <strong>permanent and irreversible</strong>.
            Your Wojak #{editionNumber} will be destroyed forever.
          </p>
          <div className="flex justify-between">
            <span className="text-secondary">Votes:</span>
            <span>👍 {likes} · 👎 {dislikes}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary">Credits earned:</span>
            <span className="text-accent font-bold">{(estimatedCredits / 100).toFixed(0)} credits</span>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          I understand this cannot be undone
        </label>

        <div className="flex gap-3">
          <button className="btn btn-ghost flex-1" onClick={onCancel} disabled={burning}>
            Cancel
          </button>
          <button
            className="btn flex-1"
            style={{ background: 'var(--color-error)', color: 'white' }}
            onClick={onConfirm}
            disabled={!confirmed || burning}
          >
            {burning ? 'Burning...' : '🔥 Burn Forever'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/sage-wallet/SageWalletProvider.tsx src/sage-wallet/useSageWalletStandalone.ts src/components/game/BurnButton.tsx src/components/game/BurnConfirmDialog.tsx
git commit -m "feat: add burn UI with WalletConnect integration

Add chia_transferNFT to WalletConnect required methods
BurnConfirmDialog: irreversible confirmation with credit preview
Sends NFT to burn address via chia_transferNFT, records in backend"
```

---

### Task B4: Anti-Wash-Trading Detection

**Files:**
- Modify: `workers/credit-tracker/worker.ts` — add self-buy detection

**Context:** Wash trading = buying your own NFT to earn credits. Detection: if `buyer_address` matches `phase2_mints.wallet_address` for that edition, it's a self-buy. Withhold credits. The 2% treasury royalty is still paid (real cost to wash traders).

**Step 1: Add self-buy check to credit-tracker**

In `workers/credit-tracker/worker.ts`, in the trade processing section, add:

```typescript
// Before awarding credits for a Phase 2 secondary purchase:
// Check if buyer is also the creator
const mint = await env.DB.prepare(
  'SELECT wallet_address FROM phase2_mints WHERE mintgarden_launcher_id = ?'
).bind(nftId).first();

if (mint && mint.wallet_address === buyerAddress) {
  console.log(`[Anti-Wash] Self-buy detected: ${buyerAddress.slice(0, 15)}... bought own edition`);
  // Record the event but with 0 credits
  // Insert into credit_events with credits_earned = 0 and source = 'self_buy_blocked'
  continue; // Skip credit award
}
```

**Step 2: Commit**

```bash
git add workers/credit-tracker/worker.ts
git commit -m "feat: add anti-wash-trading detection

Self-buy detection: if buyer matches phase2_mints.wallet_address,
credits are withheld (logged as 'self_buy_blocked').
The 2% treasury royalty still applies, making wash trading costly."
```

---

## END OF PHASE B

**Phase B delivers:** SplitXCH royalty integration (12% split), burn mechanic with credit rewards, burn confirmation UI, WalletConnect `chia_transferNFT` support, anti-wash-trading detection.

---

## Phase C: Competition

**What ships:** Battle system (queue-based matchmaking, 24-hour voting, W/L records)

---

### Task C1: Battle Database Schema

**Files:**
- Create: `functions/migrations/048_battles.sql`

**Step 1: Create migration**

```sql
-- 048_battles.sql
-- Battle system tables

CREATE TABLE IF NOT EXISTS battles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nft_a_id TEXT NOT NULL,                     -- Challenger NFT
  nft_a_edition INTEGER NOT NULL,
  nft_a_owner_did TEXT NOT NULL,
  nft_b_id TEXT NOT NULL,                     -- Opponent NFT
  nft_b_edition INTEGER NOT NULL,
  nft_b_owner_did TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('active', 'completed', 'cancelled', 'draw')),
  winner_nft_id TEXT,                         -- NULL until resolved
  votes_a INTEGER NOT NULL DEFAULT 0,
  votes_b INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ends_at TEXT NOT NULL,                      -- started_at + 24 hours
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_battles_status ON battles(status, ends_at);
CREATE INDEX IF NOT EXISTS idx_battles_nft_a ON battles(nft_a_id);
CREATE INDEX IF NOT EXISTS idx_battles_nft_b ON battles(nft_b_id);

-- Battle votes (1 per user per battle, separate from daily cap)
CREATE TABLE IF NOT EXISTS battle_votes (
  battle_id INTEGER NOT NULL,
  voter_did TEXT NOT NULL,
  voted_for TEXT NOT NULL,                    -- 'a' or 'b'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (battle_id, voter_did)
);

-- Battle queue (waiting for matchmaking)
CREATE TABLE IF NOT EXISTS battle_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nft_id TEXT NOT NULL UNIQUE,                -- One queue entry per NFT
  edition_number INTEGER NOT NULL,
  owner_did TEXT NOT NULL,
  queued_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Battle roster (which NFTs are battle-ready)
CREATE TABLE IF NOT EXISTS battle_roster (
  did_id TEXT NOT NULL,
  nft_id TEXT NOT NULL,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (did_id, nft_id)
);
```

**Step 2: Commit**

```bash
git add functions/migrations/048_battles.sql
git commit -m "feat: add battle system database schema (048)

Tables: battles, battle_votes, battle_queue, battle_roster
Supports: 24h battles, 1 vote per user per battle, queue matchmaking"
```

---

### Task C2: Battle APIs

**Files:**
- Create: `functions/api/game/battle-queue.ts` — join/leave queue
- Create: `functions/api/game/battle-vote.ts` — vote in a battle
- Create: `functions/api/game/battle-list.ts` — get active battles
- Create: `functions/api/game/battle-resolve.ts` — cron to resolve ended battles

**Context:** Queue-based: user puts NFT in queue, system matches two random queued NFTs. Battle lasts 24h. 1 vote per user per battle. Min 10 votes to count (otherwise draw). Winner gets organic likes.

The battle APIs follow the same patterns as the voting APIs (Tasks A2-A4). Each endpoint validates DID + Phase 1, checks ownership, enforces limits.

**Step 1: Create battle-queue.ts**

POST to join queue, DELETE to leave. Automatic matchmaking when 2+ NFTs are queued.

**Step 2: Create battle-vote.ts**

POST with battle_id, voter_did, voted_for ('a' or 'b'). 1 vote per user per battle, separate from daily cap.

**Step 3: Create battle-list.ts**

GET active battles with vote counts. GET battle history for a specific NFT.

**Step 4: Create battle-resolve.ts**

Called by cron (or manually). Finds battles past `ends_at`, resolves winner based on votes. Min 10 votes required, otherwise draw. Records battle votes as regular likes/dislikes on the NFTs.

**Step 5: Commit**

```bash
git add functions/api/game/battle-*.ts
git commit -m "feat: add battle system APIs

POST /api/game/battle-queue — join/leave with auto-matchmaking
POST /api/game/battle-vote — 1 vote per user per battle
GET /api/game/battle-list — active battles + history
Cron: battle-resolve — resolves after 24h, min 10 votes"
```

---

### Task C3: Battle UI

**Files:**
- Create: `src/components/game/BattleCard.tsx`
- Create: `src/components/game/BattleView.tsx`
- Create: `src/pages/GameBattles.tsx`
- Modify: `src/App.tsx` — add battle route

**Context:** Side-by-side display of two Wojaks. Users tap to vote for A or B. Shows live vote count. Timer counting down from 24h. Battle history shows W/L record per NFT.

**Step 1: Build components following the same patterns as VotingFeed/SwipeCard.**

**Step 2: Add route: `/games/your-wojak/battles`**

**Step 3: Commit**

```bash
git add src/components/game/Battle*.tsx src/pages/GameBattles.tsx src/App.tsx
git commit -m "feat: add battle UI with side-by-side voting

BattleCard: side-by-side Wojak display with vote buttons
BattleView: active battles list, queue management, history
Route: /games/your-wojak/battles"
```

---

## END OF PHASE C

**Phase C delivers:** Queue-based battles, 24-hour voting, auto-matchmaking, W/L records, battle UI.

---

## Phase D: DeFi

**What ships:** CHIP-0051 NFT Staking + PLP Distribution

**Note:** Phase D requires deploying Chialisp on-chain. This phase is more of a guide than step-by-step code — it depends heavily on the CHIP-0051 tooling available at implementation time.

---

### Task D1: Research & Deploy CHIP-0051

**This is a research + deployment task, not a coding task.**

1. Study [CHIP-0051 spec](https://github.com/Chia-Network/chips/blob/822146272b41db9b8160a97f96286d9041071bd4/CHIPs/chip-0051.md)
2. Study [DIG Network's implementation](https://x.com/digdotnet/status/1961449065574441198)
3. Contact DIG Network or Yakuhito for tooling/libraries
4. Deploy reward distributor singleton on Chia mainnet
5. Configure: collection filter (only Your Wojak NFTs), reward token (PLP)
6. Fund with initial PLP tokens

### Task D2: Staking Database & API

**Files:**
- Create: `functions/migrations/049_staking.sql`
- Create: `functions/api/game/stake.ts`
- Create: `functions/api/game/unstake.ts`

**Schema:**

```sql
CREATE TABLE IF NOT EXISTS nft_stakes (
  nft_id TEXT PRIMARY KEY,
  owner_did TEXT NOT NULL,
  staked_at TEXT NOT NULL DEFAULT (datetime('now')),
  unstaked_at TEXT,
  reward_distributor_id TEXT,
  FOREIGN KEY (owner_did) REFERENCES game_players(did_id)
);
```

### Task D3: Staking UI

**Files:**
- Create: `src/components/game/StakeButton.tsx`
- Modify: `src/pages/GameDashboard.tsx` — add staking section

Show stake/unstake buttons on owned NFTs. Display PLP earnings on dashboard. Staked indicator badge on profiles.

---

## END OF PHASE D

**Phase D delivers:** CHIP-0051 staking, PLP yield, stake/unstake UI.

---

## Summary: All Tasks

| Phase | Task | Description |
|-------|------|-------------|
| **A** | A1 | Game database schema (migration 045) |
| **A** | A2 | Player registration + Phase 1 verification APIs |
| **A** | A3 | Voting API + weighted random feed |
| **A** | A4 | Power Level calculation + leaderboard APIs |
| **A** | A5 | DID holdings indexer worker |
| **A** | A6 | NFT naming in mint flow |
| **A** | A7 | Voting UI (Tinder-style swipe) |
| **A** | A8 | Dashboard + profile page |
| **A** | A9 | Name input UI in generator |
| **B** | B1 | SplitXCH integration |
| **B** | B2 | Burn detection + credits |
| **B** | B3 | Burn UI + WalletConnect |
| **B** | B4 | Anti-wash-trading detection |
| **C** | C1 | Battle database schema (migration 048) |
| **C** | C2 | Battle APIs |
| **C** | C3 | Battle UI |
| **D** | D1 | CHIP-0051 research + deploy |
| **D** | D2 | Staking database + API |
| **D** | D3 | Staking UI |

**Total: 19 tasks across 4 phases.**

---

*This implementation plan is the companion to `docs/plans/2026-02-17-your-wojak-game-design.md`. The design doc is the source of truth for WHAT to build. This plan is the guide for HOW to build it.*
