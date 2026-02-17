# Wojak Swipe — Phase 3 Spec

> Research document for the terminal CLI session.
> Written by macOS app session (advisor role).
> Date: 2026-02-17

---

## 1. NFT Detail Modal — Wire Burn Button

### Current State

`CollectionScroll.tsx` already has an `NftDetailModal` (lines 20-88) with:
- Large image, edition number, likes/dislikes/net score/total votes
- "Enter Battle" button (links to `/swipe/battles`)
- "Burn" button — **currently a no-op** (just calls `onClose`)

### The Problem: BurnButton Requires `nftCoinId`

`BurnButton.tsx` (lines 7-17) requires these props:
```ts
interface BurnButtonProps {
  nftId: string;         // MintGarden launcher_id
  nftCoinId: string;     // On-chain coin ID — REQUIRED for transferNFT()
  editionNumber: number;
  nftName: string;
  likes: number;
  dislikes: number;
  estimatedCredits: number;
  burnerDid?: string;
  onBurned?: (credits: number) => void;
}
```

The `nftCoinId` is the on-chain coin ID needed to call `transferNFT(nftCoinId, BURN_ADDRESS)` via WalletConnect. This is NOT the same as `nftId` (which is the MintGarden launcher_id).

### Where to Get nftCoinId

**Option A: From MintGarden API**

The MintGarden NFT response includes a `coin_id` field. The wallet provider's `getNFTs()` method already fetches from MintGarden:
```
GET https://api.mintgarden.io/address/{address}/nfts?type=owned&collection_id={id}
```

The response items include (from `sage-wallet-types.ts` `MintGardenNFT` interface):
```ts
interface MintGardenNFT {
  id: string;           // launcher_id
  data?: {
    metadata_json?: { ... };
  };
  // coin_id may not be in the current type — needs verification
}
```

**We need to verify:** Does the MintGarden API return `coin_id` in the NFT response? Check:
```
https://api.mintgarden.io/address/{address}/nfts?type=owned&collection_id=col1rhrjj6f28tge783rp0lrj8ct7vnq79xsnklx3up49lgpnge62ensr2tyfx
```

If MintGarden returns `coin_id`, add it to the `CollectionNft` interface and fetch it in CollectionScroll.

**Option B: From Sage Wallet RPC**

Call `chia_getNFTs` or query the wallet for the NFT's current coin ID. This adds complexity.

**Option C: Separate API call when burn is clicked**

When user taps "Burn" in the modal, fetch the coin ID on-demand:
```
GET https://api.mintgarden.io/nfts/{nftId}
```
This returns the full NFT object including the current coin_id.

### Recommended: Option C (on-demand fetch)

Least invasive — only fetches when needed, doesn't change the collection API.

### Implementation

**File: `src/components/game/CollectionScroll.tsx`**

Replace the Burn button in `NftDetailModal` (lines 77-83) with actual BurnButton:

```tsx
import { useState } from 'react';
import { BurnButton } from './BurnButton';
import { useGame } from '@/contexts/GameContext';

function NftDetailModal({ nft, onClose }: { nft: CollectionNft; onClose: () => void }) {
  const { player } = useGame();
  const [coinId, setCoinId] = useState<string | null>(null);
  const [loadingCoinId, setLoadingCoinId] = useState(false);

  const handleBurnClick = async () => {
    if (coinId) return; // Already loaded
    setLoadingCoinId(true);
    try {
      const res = await fetch(`https://api.mintgarden.io/nfts/${nft.nftId}`);
      const data = await res.json();
      // MintGarden returns encoded_id or nft_coin_id — verify exact field name
      setCoinId(data.nft_coin_id || data.encoded_id || '');
    } catch {
      // Handle error
    } finally {
      setLoadingCoinId(false);
    }
  };

  // Estimate credits using same formula as burn.ts
  const estimatedCredits = calculateBurnCredits(nft.likes, nft.dislikes);

  return (
    // ... existing modal structure ...
    <div className="flex gap-3">
      <Link to="/swipe/battles" className="btn btn-primary flex-1 text-center" style={{ fontSize: 13 }}>
        Enter Battle
      </Link>
      {coinId ? (
        <BurnButton
          nftId={nft.nftId}
          nftCoinId={coinId}
          editionNumber={nft.editionNumber}
          nftName={nft.name}
          likes={nft.likes}
          dislikes={nft.dislikes}
          estimatedCredits={estimatedCredits}
          burnerDid={player?.did}
          onBurned={() => {
            onClose();
            // Optionally refresh collection
          }}
        />
      ) : (
        <button
          className="btn btn-ghost flex-1"
          style={{ fontSize: 13, color: 'var(--color-error)' }}
          onClick={handleBurnClick}
          disabled={loadingCoinId}
        >
          {loadingCoinId ? 'Loading...' : 'Burn'}
        </button>
      )}
    </div>
  );
}
```

### Credit Estimation Helper

The `calculateBurnCredits` formula from `burn.ts` (lines 13-27) should be extracted to a shared utility so the frontend can show estimated credits without an API call:

```ts
// src/lib/burnCredits.ts
export function calculateBurnCredits(likes: number, dislikes: number): number {
  const total = likes + dislikes;
  if (total === 0) return 500;
  const dislikeRatio = dislikes / total;
  if (dislikeRatio > 0.7) return 2000;
  if (dislikeRatio > 0.5) return 1200;
  if (dislikeRatio > 0.3) return 500;
  return 200;
}
```

### Key Unknown: MintGarden NFT Coin ID Field Name

**MUST TEST before implementing.** Fetch:
```
curl https://api.mintgarden.io/nfts/{any_known_nft_id}
```

Look for fields like: `nft_coin_id`, `coin_id`, `encoded_id`, `latest_coin_id`. The exact field name determines the implementation.

---

## 2. Vote Activity Logging

### Current State

The vote endpoint (`functions/api/game/vote.ts`) does NOT log to `game_activity` table. Burns and battles both log activity, but votes don't.

### The Gap (vote.ts lines 79-132)

After inserting the vote (line 80-84) and updating scores (line 96-109), the code updates `game_players.votes_today` and `total_votes_cast` (lines 113-121), handles first-vote milestone (lines 124-130), then batch executes (line 132). **No activity insert anywhere.**

### game_activity Schema (migration 045, lines 84-92)

```sql
CREATE TABLE IF NOT EXISTS game_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  did_id TEXT NOT NULL,
  event_type TEXT NOT NULL,        -- 'vote_milestone', 'leaderboard_change', 'battle_result', 'burn', 'mint'
  event_data TEXT NOT NULL,        -- JSON payload
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### What to Log

Per the original design spec, log:
1. **First vote** — `event_type: 'vote_milestone'`
2. **Every 10th total vote** — `event_type: 'vote_milestone'`

### Implementation

**File: `functions/api/game/vote.ts`**

Add to the `statements` batch array (after line 121, before the first-vote check):

```ts
// Log vote activity milestones
const newTotalVotes = (player.total_votes_cast as number) + 1;

// Log on first vote
if (newTotalVotes === 1) {
  statements.push(
    context.env.DB.prepare(`
      INSERT INTO game_activity (did_id, event_type, event_data)
      VALUES (?, 'vote_milestone', ?)
    `).bind(
      voterDid,
      JSON.stringify({ milestone: 'first_vote', totalVotes: 1, editionNumber })
    )
  );
}

// Log every 10th vote
if (newTotalVotes > 1 && newTotalVotes % 10 === 0) {
  statements.push(
    context.env.DB.prepare(`
      INSERT INTO game_activity (did_id, event_type, event_data)
      VALUES (?, 'vote_milestone', ?)
    `).bind(
      voterDid,
      JSON.stringify({ milestone: `voted_${newTotalVotes}`, totalVotes: newTotalVotes })
    )
  );
}
```

Insert this BEFORE the `isFirstVote` check (line 124) since both use the same batch. The full statements array becomes:
1. Update `votes_today` + `total_votes_cast` (existing)
2. Vote milestone activity log (NEW)
3. First vote onboarding flag (existing)

---

## 3. QuickActions Burn Wiring

### Current State: Already Works

`QuickActions.tsx` (lines 69-71) already handles the Burn button correctly:

```tsx
onClick={() => {
  document.getElementById('collection-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}}
```

And `CollectionScroll.tsx` already renders with `id="collection-section"` (line 153). Clicking "Burn" in QuickActions scrolls to the collection, where the user taps an NFT thumbnail to open the detail modal, then taps "Burn" in the modal.

### This is the correct UX flow:

1. User taps "Burn" in QuickActions
2. Page scrolls to collection section
3. User taps the NFT they want to burn
4. Detail modal opens with stats + burn button
5. User confirms burn in BurnConfirmDialog

### No Changes Needed

The only work is in Task 1 (wiring the actual BurnButton into the modal). QuickActions is already wired correctly.

---

## 4. Cross-Navigation Audit

### Result: ALL CLEAR

Every cross-link in the Swipe system uses `/swipe/*` paths consistently.

**Verified files and their links:**

| File | Links To | Status |
|------|----------|--------|
| `CollectionScroll.tsx:74` | `/swipe/battles` | OK |
| `OnboardingChecklist.tsx:19-20` | `/swipe`, `/swipe/battles` | OK |
| `PostRoundSummary.tsx:73,76` | `/swipe/leaderboard`, `/swipe/dashboard` | OK |
| `QuickActions.tsx:15,29` | `/swipe`, `/swipe/battles` | OK |
| `LatestEventBanner.tsx:26-29` | `/swipe/battles`, `/swipe/leaderboard`, `/swipe`, `/swipe/dashboard` | OK |
| `MobileStatsBar.tsx:11` | `/swipe/dashboard` | OK |
| `WojakSwipeCard.tsx:8` | `/swipe` | OK |
| `ActiveBattleCard.tsx:61,121,126` | `/swipe/battles` | OK |
| `VotingStatsPanel.tsx:90` | `/swipe/dashboard` | OK |
| `MiniLeaderboard.tsx:123` | `/swipe/leaderboard` | OK |
| `GamePositionBar.tsx:40` | `/swipe/dashboard` | OK |
| `GameLeaderboard.tsx:248` | `/swipe` | OK |
| `App.tsx:384-387` | Redirects from `/your-wojak/*` to `/swipe/*` | OK |
| `MoreMenu.tsx:38` | `/swipe` | OK |

**Stale `/your-wojak` references:** Only the 4 redirect routes in `App.tsx` — correct behavior.

**PowerLevelDisplay.tsx:** Contains no navigation links (display-only component).

### No Changes Needed

---

## 5. Production Environment Readiness

### DID Indexer Worker

**File: `workers/did-indexer/wrangler.toml`**
```toml
name = "wojak-did-indexer"
main = "worker.ts"
compatibility_date = "2024-12-01"

[triggers]
crons = ["*/30 * * * *"]    # Every 30 minutes

[[d1_databases]]
binding = "DB"
database_name = "wojak-users"
database_id = "32e7fa5f-524e-4913-b541-f9a339c126c6"
```

**Status:** Cron trigger configured and running every 30 minutes. Collection IDs were fixed in Phase 1.

### Battle Resolution Cron

**STATUS: MISSING**

There is no battle-resolve cron configured anywhere. The `battle-resolve.ts` endpoint exists at `functions/api/game/battle-resolve.ts` but no scheduled worker calls it.

**Options to fix:**

**Option A: Add a dedicated worker** (recommended)
Create `workers/battle-cron/worker.ts` + `wrangler.toml`:
```ts
// workers/battle-cron/worker.ts
export default {
  async scheduled(_event: ScheduledEvent, _env: unknown, _ctx: ExecutionContext) {
    // Call the battle-resolve Pages Function endpoint
    await fetch('https://wojak.ink/api/game/battle-resolve', { method: 'POST' });
  }
};
```
```toml
# workers/battle-cron/wrangler.toml
name = "wojak-battle-cron"
main = "worker.ts"
compatibility_date = "2024-12-01"

[triggers]
crons = ["0 * * * *"]  # Every hour
```

**Option B: Add to DID indexer** (simpler, but mixes concerns)
Add a battle-resolve call to the existing DID indexer's `run()` function.

**Option C: Cloudflare Pages _middleware approach**
Not viable — Pages Functions don't support scheduled triggers.

**Recommended: Option A** — separate worker keeps concerns clean.

### API Endpoints Verification

| Endpoint | File Exists | Status |
|----------|-------------|--------|
| POST `/api/game/register` | `register.ts` | OK |
| POST `/api/game/verify-phase1` | `verify-phase1.ts` | OK |
| POST `/api/game/vote` | `vote.ts` | OK |
| GET `/api/game/feed` | `feed.ts` | OK |
| GET `/api/game/collection` | `collection.ts` | OK |
| GET `/api/game/power-level` | `power-level.ts` | OK |
| GET `/api/game/leaderboard` | `leaderboard.ts` | OK |
| GET `/api/game/top-wojaks` | `top-wojaks.ts` | OK |
| GET `/api/game/activity` | `activity.ts` | OK |
| POST `/api/game/battle-queue` | `battle-queue.ts` | OK |
| GET `/api/game/battle-list` | `battle-list.ts` | OK |
| POST `/api/game/battle-vote` | `battle-vote.ts` | OK |
| POST `/api/game/battle-resolve` | `battle-resolve.ts` | OK |
| POST `/api/game/burn` | `burn.ts` | OK |

All 14 endpoints have matching files.

### Database Migrations

| Migration | File | Tables Created |
|-----------|------|----------------|
| `045_game_foundation.sql` | Exists | `game_players`, `did_holdings`, `wojak_votes`, `wojak_scores`, `game_activity`, `nft_names` |
| `048_burn_tracking.sql` | Exists | `wojak_burns` |
| `049_battles.sql` | Exists | `battles`, `battle_queue`, `battle_votes` |

**STATUS:** All migration files exist. Must verify they've been applied to the production D1 database:

```bash
npx wrangler d1 execute wojak-users --remote --command \
  "SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE 'game_%' OR name LIKE 'battle%' OR name LIKE 'wojak%' OR name = 'did_holdings' OR name = 'nft_names') ORDER BY name;"
```

### Missing: `collection.ts` in worktree

**NOTE:** `collection.ts` and `activity.ts` and `top-wojaks.ts` exist in the main tree but NOT in the `interesting-bardeen` worktree. This means they were committed in the `dashboard-leaderboard` worktree or directly to main. The CLI session should verify these are on the branch it's working on.

---

## Summary: Task List for CLI Session

### Task 1: Create shared `calculateBurnCredits` utility
**Files to create:**
- `src/lib/burnCredits.ts` — export the credit estimation formula
**Files to modify:**
- `functions/api/game/burn.ts` — import from shared utility (or leave backend copy if shared imports are complex)
**Commit message:** `feat: extract calculateBurnCredits to shared utility`

### Task 2: Wire BurnButton into CollectionScroll's NftDetailModal
**Files to modify:**
- `src/components/game/CollectionScroll.tsx` — replace no-op Burn button with on-demand coin ID fetch + BurnButton component
**Key dependencies:**
- Must test MintGarden API `https://api.mintgarden.io/nfts/{nftId}` to find the correct field for coin ID (`nft_coin_id`, `coin_id`, or `encoded_id`)
- Import `BurnButton` from `./BurnButton`
- Import `useGame` from `@/contexts/GameContext` for `player.did`
**Commit message:** `feat: wire burn button into NFT detail modal with on-demand coin ID fetch`

### Task 3: Add vote activity logging
**Files to modify:**
- `functions/api/game/vote.ts` — add activity inserts to the batch (first vote + every 10th vote)
**Commit message:** `feat: log vote milestones to game_activity (1st + every 10th vote)`

### Task 4: Create battle resolution cron worker
**Files to create:**
- `workers/battle-cron/worker.ts` — scheduled worker that POSTs to `/api/game/battle-resolve`
- `workers/battle-cron/wrangler.toml` — hourly cron trigger
**Commit message:** `feat: add hourly battle resolution cron worker`

### Task 5: Verify database migrations applied
**Action:** Run the verification query against production D1:
```bash
npx wrangler d1 execute wojak-users --remote --command \
  "SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE 'game_%' OR name LIKE 'battle%' OR name LIKE 'wojak%' OR name = 'did_holdings' OR name = 'nft_names') ORDER BY name;"
```
If any tables are missing, apply the relevant migration:
```bash
npx wrangler d1 execute wojak-users --remote < functions/migrations/045_game_foundation.sql
npx wrangler d1 execute wojak-users --remote < functions/migrations/048_burn_tracking.sql
npx wrangler d1 execute wojak-users --remote < functions/migrations/049_battles.sql
```
**No commit needed — this is a runtime operation.**

### Task 6: Deploy battle-cron worker
```bash
cd workers/battle-cron && npx wrangler deploy
```
**No commit needed — this is a deploy operation.**

### Verification
```bash
npx tsc -b          # TypeScript clean
npm run build       # Build succeeds
```

### Items Confirmed as NOT Needing Changes
- **QuickActions burn wiring** — already scrolls to `#collection-section` correctly
- **Cross-navigation audit** — all 20+ links use `/swipe/*` consistently, no stale paths
- **DID indexer cron** — configured and running every 30 minutes
