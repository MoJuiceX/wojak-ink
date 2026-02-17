# Wojak Swipe — Launch Spec

> Research document for the terminal CLI session.
> Written by macOS app session (advisor role). Do NOT commit this directly — the CLI session should commit it alongside implementation.
> Date: 2026-02-17

---

## Branding Decision

| Concept | Name | Notes |
|---------|------|-------|
| **NFT collection** (on-chain, MintGarden) | **Your Wojak** | Already minted. Do not change. |
| **Feature/experience** (on wojak.ink) | **Wojak Swipe** | The voting, battles, leaderboard system |
| **Individual NFT** | "Your Wojak #42" | Shown on cards, gallery |
| **Route** | `/swipe` | Change from `/your-wojak` to `/swipe` |

### Where "Wojak Swipe" appears:
- Sidebar nav label
- GamesHub entry card
- Page titles (e.g. "Wojak Swipe | Wojak.ink")
- Headings on voting/battle/leaderboard pages

### Where "Your Wojak" appears:
- NFT card names ("Your Wojak #42")
- Collection references on MintGarden
- Metadata/on-chain references
- Generator: "Mint Your Wojak"

### Route Migration

| Old Route | New Route |
|-----------|-----------|
| `/your-wojak` | `/swipe` |
| `/your-wojak/dashboard` | `/swipe/dashboard` |
| `/your-wojak/battles` | `/swipe/battles` |
| `/your-wojak/leaderboard` | `/swipe/leaderboard` |

Add redirects from old routes to new routes in App.tsx (`<Navigate to="/swipe" replace />`).

---

## 1. DID Indexer — Fix Collection IDs

### File: `workers/did-indexer/worker.ts`

### Collection IDs — CURRENTLY WRONG

The indexer currently has:
```ts
const PHASE1_COLLECTION = 'col1z0ef7w5n4vq9qkue67y8jns89re570npt0s4wwtcmpv3lxsmjq4yqs9ser0h';  // WRONG
const PHASE2_COLLECTION = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah';    // WRONG (this is actually Phase 1!)
```

**CORRECT collection IDs (confirmed by user):**

| Collection | Name | Correct ID |
|------------|------|------------|
| Phase 1 | Wojak Farmers Plot | `col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah` |
| Phase 2 | Your Wojak | `col1rhrjj6f28tge783rp0lrj8ct7vnq79xsnklx3up49lgpnge62ensr2tyfx` |

**Both constants are wrong.** The value currently in `PHASE2_COLLECTION` is actually the Phase 1 ID, and `PHASE1_COLLECTION` has a completely wrong ID. Fix to:

```ts
const PHASE1_COLLECTION = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah';
const PHASE2_COLLECTION = 'col1rhrjj6f28tge783rp0lrj8ct7vnq79xsnklx3up49lgpnge62ensr2tyfx';
```

### How the Indexer Works

1. Runs every 30 minutes via Cloudflare Scheduled Worker (`scheduled` handler, line 17)
2. Fetches all registered players from `game_players` table (line 35-37)
3. For each player, calls `syncDIDHoldings(env, did)` with 500ms rate limiting between players
4. For each DID, fetches NFTs from both collections via MintGarden API

### MintGarden API Call

**URL pattern** (line 147):
```
https://api.mintgarden.io/nfts?collection_id=${collectionId}&owner_did=${did}&size=100&page=${page}
```

**Expected response shape** (line 158-164):
```ts
{
  items: Array<{
    id: string;                                    // NFT ID (used as primary key)
    data?: { metadata_json?: { edition_number?: number } };  // Nested edition number
    minter_address?: string;                       // Creator wallet address
  }>;
}
```

### How edition_number and creator_wallet are extracted (lines 168-174):

```ts
for (const item of data.items) {
  nfts.push({
    id: item.id,
    edition: item.data?.metadata_json?.edition_number,  // Deep nested
    creator: item.minter_address,                        // Top-level field
  });
}
```

### DB Insert (lines 108-112):

```sql
INSERT OR IGNORE INTO did_holdings (did_id, nft_id, edition_number, collection, creator_wallet)
VALUES (?, ?, ?, ?, ?)
```

Phase 2 NFTs get `collection = 'phase2'` with edition + creator.
Phase 1 NFTs get `collection = 'phase1'` with no edition/creator (undefined -> null).

### Phase 1 Verification (lines 126-129):

After syncing holdings, the indexer auto-updates `phase1_verified` on `game_players`:
```sql
UPDATE game_players SET phase1_verified = ?, updated_at = datetime('now') WHERE did_id = ?
```
Set to `1` if the DID holds any Phase 1 NFTs, `0` otherwise.

---

## 2. Sidebar Navigation — Add Wojak Swipe

### File: `src/config/routes.ts`

The sidebar imports from this file. Current PRIMARY_NAV_ITEMS:

| Icon | Label | Path |
|------|-------|------|
| `Camera` | Gallery | `/gallery` |
| `Lightbulb` | BigPulp | `/bigpulp` |
| `Palette` | Generator | `/generator` |
| `Gamepad2` | Games | `/games` |
| `Trophy` | Leaderboard | `/leaderboard` |

Mobile bottom nav: Gallery, Generator, BigPulp (center FAB), Games, More

**Wojak Swipe is NOT in the nav.** Add it.

### Recommended: Add to PRIMARY_NAV_ITEMS

Add after Games, before Leaderboard:

```ts
{
  id: 'swipe',
  path: '/swipe',
  label: 'Wojak Swipe',
  shortLabel: 'Swipe',
  icon: Heart,  // or Flame from lucide-react — swipe/dating vibe
  badge: 'dot', // Draw attention at launch
  children: [
    { id: 'swipe-dashboard', path: '/swipe/dashboard', label: 'Dashboard', icon: Heart },
    { id: 'swipe-battles', path: '/swipe/battles', label: 'Battles', icon: Heart },
    { id: 'swipe-leaderboard', path: '/swipe/leaderboard', label: 'Leaderboard', icon: Heart },
  ]
},
```

Import `Heart` (or `Flame`) from `lucide-react` at top of routes.ts.

**Mobile nav**: Add to MOBILE_NAV_ITEMS or make it accessible from the "More" menu. Don't exceed 5 bottom tab items — either replace one or keep it in More.

### Also add a prominent card on GamesHub

In `src/pages/GamesHub.tsx`, add a "Wojak Swipe" card above the games grid in the center column. See section 4 for exact insertion points.

---

## 3. Wallet -> DID Flow

### CRITICAL GAP: No DID retrieval from wallet

The Sage wallet hook (`useSageWalletStandalone.ts`) provides:
- `address` (XCH address)
- `connect()` / `disconnect()`
- `signMessage()`
- `getNFTs()`
- `hasRequiredNFTs()`

**BUT: There is no `did` property or method to get the user's DID.**

The wallet requests `chia_getNFTWalletsWithDIDs` in its required namespaces (line 202) but **never calls it**. The method exists in `sage-wallet-types.ts` (line 65):

```ts
GetNftWalletsWithDids: 'chia_getNFTWalletsWithDIDs',
```

### Current Registration Flow (broken)

1. Wallet connects -> `useSageWallet()` returns `{ address, status: 'connected' }`
2. **??? DID obtained somehow ???** -> This step is missing
3. `GameContext.register(did, walletAddress)` called -> POST `/api/game/register`
4. Player created in DB with `did_id` + `wallet_address`
5. DID indexer runs later (cron) and populates `did_holdings`

### What the CLI Session Needs to Implement

The wallet -> DID -> register flow:

1. User connects Sage wallet -> get `address`
2. Call `chia_getNFTWalletsWithDIDs` via WalletConnect RPC to get the user's DID(s)
3. If user has a DID, auto-call `register(did, address)`
4. If user has no DID, show the "Create a DID" step in GateChecklist
5. After registration, the DID indexer handles the rest on cron

### Code to Add in `useSageWalletStandalone.ts`

New method:
```ts
const getDIDs = useCallback(async (): Promise<string[]> => {
  const client = signClientRef.current;
  const sess = currentSessionRef.current;
  if (!client || !sess) throw new Error('Not connected');

  const result = await client.request({
    topic: sess.topic,
    chainId: CHIA_CHAIN,
    request: { method: ChiaMethod.GetNftWalletsWithDids, params: {} },
  });

  // Result shape from Sage wallet — needs testing:
  // Array of { did_id: string, wallet_id: number } or similar
  return (result as Array<{ did_id: string }>).map(r => r.did_id);
}, []);
```

**Note: The exact response shape of `chia_getNFTWalletsWithDIDs` from Sage wallet needs to be tested.** Check Sage docs or test empirically.

### Alternative Approach (simpler, no RPC needed)

1. Get the user's address from wallet
2. Query MintGarden: `https://api.mintgarden.io/address/${address}/dids`
3. Use the first DID returned

This avoids needing a new WalletConnect RPC call.

---

## 4. GamesHub — Add Wojak Swipe Card

### File: `src/pages/GamesHub.tsx` (557 lines)

### Page Structure

**Desktop (line 390-486): 3-column grid**
```
gridTemplateColumns: '220px 1fr 220px', gap 20px, maxWidth 1400px
Left: LeaderboardPanel | Center: Games Grid | Right: StatsPanel + FlickModeToggle
```

**Mobile (line 490-555): Single column**

### Where to Insert Wojak Swipe Card

**Desktop — center column, BEFORE games grid (around line 427-428):**

```tsx
<div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', minHeight: 0 }}>
  {/* Wojak Swipe entry card */}
  <WojakSwipeCard />
  {gamesGridWithVoting}
</div>
```

**Mobile — before games grid (around line 499):**

```tsx
<div style={{ paddingBottom: '96px', paddingTop: '16px' }}>
  <WojakSwipeCard />
  {gamesGridWithVoting}
```

### WojakSwipeCard component design:

```tsx
// src/components/game/WojakSwipeCard.tsx
// Use card-static class, btn btn-primary, text-secondary
// Link to /swipe
// Show: "Wojak Swipe" heading, brief description, CTA button
// Optionally show user's power level if registered
```

---

## 5. Page Title / SEO Pattern

### Component: `src/components/seo/PageSEO.tsx`

Uses `react-helmet-async`. All pages use `<PageSEO>` directly (no usePageTitle hook).

```tsx
import { PageSEO } from '@/components/seo';

<PageSEO
  title="Page Title"           // Auto-appends " | Wojak.ink"
  description="Description..."
  path="/route-path"
  type="website"               // Optional: 'website' | 'article' | 'game'
/>
```

### For Wojak Swipe pages:

```tsx
// Voting page (/swipe)
<PageSEO
  title="Wojak Swipe - Vote on Community NFTs"
  description="Swipe through Wojak NFTs. Like or pass. Climb the leaderboard."
  path="/swipe"
  type="game"
/>

// Dashboard (/swipe/dashboard)
<PageSEO
  title="Wojak Swipe Dashboard"
  description="Track your power level, collection, and swipe stats"
  path="/swipe/dashboard"
/>

// Battles (/swipe/battles)
<PageSEO
  title="Wojak Swipe Battles"
  description="Two Wojaks enter. Community votes. Only one wins."
  path="/swipe/battles"
  type="game"
/>

// Leaderboard (/swipe/leaderboard)
<PageSEO
  title="Wojak Swipe Leaderboard"
  description="Top players and most popular Wojaks ranked by community votes"
  path="/swipe/leaderboard"
/>
```

**Note:** GameVoting.tsx currently uses `document.title = 'Vote - Your Wojak'` via useEffect. Replace with `<PageSEO>` for consistency.

---

## 6. Battle System Readiness

### Status: FUNCTIONAL but needs cron setup

### Backend APIs (all under `functions/api/game/`)

| File | Method | Endpoint | Status |
|------|--------|----------|--------|
| `battle-queue.ts` | POST | `/api/game/battle-queue` | Complete |
| `battle-queue.ts` | DELETE | `/api/game/battle-queue` | Complete |
| `battle-list.ts` | GET | `/api/game/battle-list` | Complete |
| `battle-vote.ts` | POST | `/api/game/battle-vote` | Complete |
| `battle-resolve.ts` | POST | `/api/game/battle-resolve` | Complete (needs scheduler) |

### What's Missing

1. **No cron trigger for battle resolution** — Endpoint exists, nothing calls it. Add Cloudflare Cron Trigger (every hour) or external scheduler.

2. **No "Queue My NFT" button on BattleView** — Users can't queue from the battles page, only from dashboard.

3. **No battle thumbnails** — BattleCard may not render NFT artwork.

4. **No link from GamesHub to battles** — Users can only reach `/swipe/battles` if they know the URL.

---

## Summary: Priority Actions for CLI Session

### CRITICAL (before Friday launch):

1. **Fix BOTH collection IDs** in `workers/did-indexer/worker.ts` lines 11-12:
   - `PHASE1_COLLECTION`: Change to `col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah` (Wojak Farmers Plot)
   - `PHASE2_COLLECTION`: Change to `col1rhrjj6f28tge783rp0lrj8ct7vnq79xsnklx3up49lgpnge62ensr2tyfx` (Your Wojak)

2. **Rebrand routes from `/your-wojak` to `/swipe`** in App.tsx. Add redirects from old routes. Update all internal links.

3. **Wire up DID retrieval** — Either via `chia_getNFTWalletsWithDIDs` RPC or MintGarden API lookup from address. The GateChecklist step 2 ("Create a DID") needs to auto-detect existing DIDs and auto-register.

4. **Set up battle resolution cron** — Add scheduled trigger for `/api/game/battle-resolve` every hour.

5. **Add Wojak Swipe entry points**:
   - Add to PRIMARY_NAV_ITEMS in `src/config/routes.ts` (icon: Heart or Flame, label: "Wojak Swipe", path: "/swipe")
   - Add WojakSwipeCard component on GamesHub page (center column, above games grid)

6. **Add `<PageSEO>` to all Wojak Swipe pages** — Replace the `document.title` hack in GameVoting.tsx. Add SEO to Dashboard, Battles, Leaderboard pages.

### NICE TO HAVE (post-launch):

7. Add "Queue for Battle" button to BattleView
8. NFT thumbnails in battle cards
9. Wojak Swipe in mobile bottom nav (replace one item or add to More menu)
