# Wojak Swipe — Phase 4: Polish & Live Testing

> Research document for the terminal CLI session.
> Written by macOS app session (advisor role).
> Date: 2026-02-17

---

## ⛔ BLOCKERS — Fix Before Anything Else

### BLOCKER A: Collection IDs Are Wrong in Game System

**Verified from MintGarden URLs (screenshots 2026-02-17):**

| Collection | Correct ID | Items |
|---|---|---|
| **Wojak Farmers Plot** (Phase 1) | `col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah` | 4,208 |
| **Your Wojak** (Phase 2) | `col1rhrjj6f28tge783rp0lrj8ct7vnq79xsnklx3up49lgpnge62ensr2tyfx` | 4 |

**Current state (BROKEN):**

`workers/did-indexer/worker.ts`:
```
Line 11: PHASE1_COLLECTION = 'col1z0ef7w5n4vq9qkue67y8jns89re570npt0s4wwtcmpv3lxsmjq4yqs9ser0h'  ← BOGUS ID (nonexistent)
Line 12: PHASE2_COLLECTION = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah'   ← WRONG: this is Wojak Farmers Plot (Phase 1)
```

`functions/api/game/_shared.ts`:
```
Line 4: PHASE1_COLLECTION_ID = 'col1z0ef7w5n4vq9qkue67y8jns89re570npt0s4wwtcmpv3lxsmjq4yqs9ser0h'  ← SAME BOGUS ID
```

**Impact:**
1. DID indexer queries a nonexistent collection for Phase 1 → finds nothing → nobody gets verified via indexer
2. DID indexer indexes Wojak Farmers Plot as "phase2" → all `did_holdings` with `collection = 'phase2'` are actually Phase 1 NFTs
3. `verify-phase1.ts` uses `_shared.ts` → queries nonexistent collection → Phase 1 gate verification always fails
4. Your Wojak collection ID (`col1rhrjj6f28tge...`) appears NOWHERE in the codebase (0 grep matches)

**Fix — all 3 locations:**

```ts
// workers/did-indexer/worker.ts lines 11-12
const PHASE1_COLLECTION = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah';
const PHASE2_COLLECTION = 'col1rhrjj6f28tge783rp0lrj8ct7vnq79xsnklx3up49lgpnge62ensr2tyfx';

// functions/api/game/_shared.ts line 4
export const PHASE1_COLLECTION_ID = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah';
```

**After fixing:** Must wipe and re-index `did_holdings` since all existing data has wrong collection labels. Run:
```sql
DELETE FROM did_holdings;
```
Then trigger the DID indexer manually to re-populate with correct data.

**Commit:** `fix(critical): correct collection IDs in game system — Phase 1 gate and DID indexer were querying wrong/nonexistent collections`

---

### BLOCKER B: BurnButton Receives Wrong nftCoinId

`CollectionScroll.tsx` line 85 passes `nftCoinId={nft.nftId}` — this is the MintGarden launcher_id, NOT the on-chain coin ID that `transferNFT()` needs. **Every burn attempt will fail silently** because WalletConnect receives an invalid coin ID.

The Phase 3 spec recommended on-demand fetch from MintGarden API (`GET https://api.mintgarden.io/nfts/{nftId}`) to get the real coin ID. This was never implemented.

**Fix:** Implement the on-demand coin ID fetch as designed in Phase 3 spec section 1. The `nftCoinId` prop must come from a MintGarden API response, not from `nft.nftId`.

**Commit:** `fix(critical): fetch real nftCoinId from MintGarden before burn — was passing launcher_id which breaks transferNFT`

---

### BLOCKER C: Battle Resolution Logic Duplicated

`workers/did-indexer/worker.ts` lines 188-267 has a full `resolveBattles()` function that runs at the end of every 30-min indexer cron. `functions/api/game/battle-resolve.ts` has the same logic as a Pages Function. Phase 3 spec Task 4 may have also created a third copy at `workers/battle-cron/`.

**Risk:** Same battle could be resolved twice if both run concurrently, producing duplicate activity log entries.

**Fix:** Remove `resolveBattles()` from the DID indexer. Keep the Pages Function at `battle-resolve.ts` as the single source of truth. If a cron worker was created in Phase 3, have it call the Pages Function endpoint (not duplicate the logic). The `WHERE status = 'active'` check prevents double-resolution of battle status, but activity logs could duplicate.

**Commit:** `fix: remove duplicate battle resolution from DID indexer — use battle-resolve.ts as single source`

---

## 1. Power Level Recalculation

### Current Formula (`functions/api/game/power-level.ts`)

The power level is a composite score from two halves:

**Collector side (holdings):**
- Queries `did_holdings WHERE collection = 'phase2'`, joined with `wojak_scores` and `phase2_mints`
- Per NFT: `quality` (net_score * 1.0) + `value` (50 base + 30 * ln(1 + surcharge_xch)) + `breadth` (15 per unique creator, excluding own wallet)

**Creator side (creations):**
- Queries `wojak_scores` where `creator_wallet = player.wallet_address`
- `creatorQuality` = total_net_score * 0.5
- `creatorSpread` = unique collectors * 10

**Total:** Clamped to 0-9000 (POWER_LEVEL_MAX). Result cached in `game_players.power_level`.

### Is the Formula Computing Correctly?

**Yes, mostly.** The SQL joins are correct, the math is sound. Two observations:

1. **`phase2_mints` surcharge join** uses `pm.mint_number = dh.edition_number`. This assumes edition_number in `did_holdings` always matches `mint_number` in `phase2_mints`. Should be correct if the DID indexer populates correctly.

2. **Creator wallet resolution** in the creations query uses `player.wallet_address` directly, which is correct — the creator wallet stored in `wojak_scores` comes from `phase2_mints.wallet_address` at vote time.

### BUG: Power Level Does NOT Auto-Recalculate After Burn

**This is a real gap.** Here's the flow:

1. User burns NFT via BurnButton
2. `burn.ts` records the burn, awards credits, and **deletes from `did_holdings`** (line 67-69)
3. The frontend calls `onBurned()` which closes the modal
4. **No power level recalculation happens**

The burn endpoint removes the NFT from `did_holdings`, so the next time `power-level.ts` runs, that NFT won't be counted. But the cached `game_players.power_level` value remains stale until something triggers a recalc.

**When does recalc currently trigger?**
- `VotingFeed.tsx` line 176: `refreshPowerLevel()` after 10th vote (post-round summary)
- `GameDashboard.tsx` line 32: fetches power-level on mount
- Manually via GET/POST to `/api/game/power-level?did=X`

**After a burn, none of these trigger automatically.** The user would see their old power level until they navigate to the dashboard or vote again.

### FIX NEEDED: Recalc after burn

**Option A: Backend recalc in burn endpoint** (recommended)
Add a power level recalc call at the end of `burn.ts`, after the batch succeeds:

```ts
// After batch succeeds, recalculate power level
if (burnerDid) {
  // Fire and forget — don't block the burn response
  fetch(`${new URL(context.request.url).origin}/api/game/power-level`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ did: burnerDid }),
  }).catch(() => { /* silent */ });
}
```

**Problem:** This is a self-fetch anti-pattern flagged in CLAUDE.md. Instead, inline the recalc or call the function directly.

**Option B: Inline recalc in burn.ts** (better, avoids self-fetch)
Import the power level calculation logic directly:

```ts
// After batch succeeds in burn.ts:
// Recalculate power level inline (avoid self-fetch anti-pattern)
try {
  // Simple recalc: re-query holdings and update cache
  const holdings = await context.env.DB.prepare(`
    SELECT COUNT(*) as count FROM did_holdings WHERE did_id = ? AND collection = 'phase2'
  `).bind(burnerDid).first();

  // For a quick estimate, just re-call the full calculation
  // This duplicates logic but avoids the self-fetch pattern
  // Better: extract shared calculatePowerLevel function
} catch { /* silent */ }
```

**Option C: Frontend recalc after burn** (simplest)
In `CollectionScroll.tsx`, after `onBurned` fires, call `refreshPowerLevel()` from GameContext:

```tsx
onBurned={() => {
  onClose();
  refreshPowerLevel(); // Add this
}}
```

**Recommendation: Option C for now.** It's the least invasive and follows existing patterns. The dashboard already recalcs on mount, so the stale window is only during the burn session. Long-term, Option B with an extracted shared function would be cleaner.

### Implementation for Option C

**File: `src/components/game/CollectionScroll.tsx`**

The `NftDetailModal` already has `useGame()` imported. Add `refreshPowerLevel`:

```tsx
function NftDetailModal({ nft, onClose }: { nft: CollectionNft; onClose: () => void }) {
  const { player, refreshPowerLevel } = useGame();
  // ...existing code...

  <BurnButton
    // ...existing props...
    onBurned={() => {
      onClose();
      refreshPowerLevel();
    }}
  />
}
```

Also: after burn, the collection list should refresh to remove the burned NFT. Currently the collection scroll doesn't re-fetch — the user would still see the burned NFT thumbnail until they navigate away and back.

**Additional fix:** After burn, remove the NFT from the local `nfts` state in `CollectionScroll`. This requires lifting state or passing a callback. Simplest approach: trigger a re-fetch:

```tsx
// In CollectionScroll, add a refresh trigger
const [refreshKey, setRefreshKey] = useState(0);

// In the useEffect, depend on refreshKey
useEffect(() => {
  // existing fetch logic
}, [did, refreshKey]);

// Pass setRefreshKey to modal
<NftDetailModal
  nft={selectedNft}
  onClose={() => setSelectedNft(null)}
  onBurned={() => setRefreshKey(k => k + 1)}
/>
```

---

## 2. Feed Algorithm Analysis

### How It Works (`functions/api/game/feed.ts`)

**Selection:** All Phase 2 NFTs from `phase2_mints` where `status = 'minted'` and `mintgarden_launcher_id IS NOT NULL`.

**Exclusions (correct):**
- Already voted: `NOT EXISTS (SELECT 1 FROM wojak_votes WHERE voter_did = ? AND nft_id = ...)`
- Own creations: `pm.wallet_address != ?` (player's wallet)
- Own holdings: `NOT EXISTS (SELECT 1 FROM did_holdings WHERE did_id = ? AND nft_id = ...)`

**Ordering:** Weighted random — `ABS(RANDOM()) / weight` where:
- `weight = (1/(1 + total_votes)) * (1/(1 + days_since_mint))`
- Newer NFTs with fewer votes are weighted higher
- `ABS(RANDOM())` provides randomization within the weighting

**Limit:** 10 per request (max 20).

### Feed Exhaustion Problem

**With only 4 NFTs in the collection, the feed will be empty after 4 votes** (or fewer, if the voter holds or created any of them).

**Current exhaustion handling:**
- `VotingFeed.tsx` line 246-258: Shows "All Caught Up!" message with a link to the Generator
- `VotingFeed.tsx` line 169-171: Refills when `feed.length <= 3` — calls `loadFeed()` again
- `GameContext.tsx` line 98: `setFeed(data.feed)` — replaces the feed (doesn't append)

**Issue: Feed replaces rather than appends.** When `loadFeed()` refills, it sets the entire feed to the new results. This means if the user has voted on items locally (removed from state via `setFeed(prev => prev.filter(...))`) but the backend hasn't processed them yet, they might see already-voted items again. However, the backend check (`NOT EXISTS ... wojak_votes`) prevents duplicates from the server side, so this should be safe.

**Potential problem:** Race condition between optimistic vote removal and refill. If `castVote` is fire-and-forget (it is — line 162), and `loadFeed()` fires before the vote is recorded in D1, the just-voted NFT could appear again in the refill. However, since votes are immediate inserts (not queued), this race window is very narrow.

### Feed Exhaustion UX — Adequate for Launch

The "All Caught Up!" state is fine for launch. As more NFTs are minted, exhaustion will be rarer. The message correctly links to the Generator to encourage more minting.

### FIX: Append Instead of Replace for Feed Refills

To avoid brief flicker/duplicate issues, change `loadFeed` in `GameContext.tsx` to append new items instead of replacing:

```tsx
const loadFeed = useCallback(async () => {
  if (!player) return;
  setFeedLoading(true);
  try {
    const res = await fetch(`/api/game/feed?did=${player.did}&limit=10`);
    const data = await res.json();
    if (data.success) {
      setFeed(prev => {
        const existingIds = new Set(prev.map(item => item.nftId));
        const newItems = data.feed.filter((item: FeedItem) => !existingIds.has(item.nftId));
        return [...prev, ...newItems];
      });
    }
  } finally {
    setFeedLoading(false);
  }
}, [player]);
```

**Severity: Low.** This is a polish issue. The current replace behavior works for small collections.

---

## 3. LatestEventBanner + Activity Feed Event Shape Analysis

### How It Works

**`activity.ts`** — Simple query: `SELECT * FROM game_activity WHERE did_id = ? ORDER BY created_at DESC LIMIT ?`. Returns raw rows, parses `event_data` as JSON.

**`LatestEventBanner.tsx`** — Fetches latest 5 events, shows one at a time with dismiss cycling.

### Event Type Support

The banner supports these `event_type` values via `EVENT_ICONS` and `formatEvent()`:

| event_type | Icon | Format String | Link |
|---|---|---|---|
| `battle_result` | Swords | `Battle won/lost against {opponent}` | `/swipe/battles` |
| `leaderboard_change` | TrendingUp | `Moved to rank #{rank}` | `/swipe/leaderboard` |
| `vote_milestone` | Heart | `Reached {count} total votes` | `/swipe` |
| `burn` | Flame | `Burned Wojak #{editionNumber}` | `/swipe/dashboard` |
| `mint` | Sparkles | `Minted Wojak #{editionNumber}` | `/generator` |

### Event Data Shape Mismatches

**BUG: `vote_milestone` event data uses `count` but first-vote uses `milestone` + `count`.**

From `vote.ts` (Phase 3 implementation):
```ts
// First vote:
JSON.stringify({ count: 1, milestone: 'first_vote' })
// Every 10th:
JSON.stringify({ count: newTotal })
```

Banner `formatEvent` reads `data.count` — this works for both shapes since both include `count`. **No mismatch here.**

**BUG: `battle_result` event types don't match.**

The banner expects `event_type: 'battle_result'` with `data.won` (boolean) and `data.opponent`.

But `battle-resolve.ts` logs:
- `event_type: 'battle_won'` with `{ battleId, votes, opponentVotes }`
- `event_type: 'battle_lost'` with `{ battleId, votes, opponentVotes }`
- `event_type: 'battle_draw'` with `{ battleId, reason, totalVotes }`

**The banner will NEVER display battle results** because it looks for `event_type: 'battle_result'` but the backend logs `battle_won`, `battle_lost`, and `battle_draw` separately.

Additionally, the banner expects `data.opponent` but the backend provides `opponentVotes` (a number, not a name). There's no opponent name/identifier in the event data.

**FIX NEEDED:**

Option A: Update `LatestEventBanner.tsx` to handle the actual event types:

```tsx
const EVENT_ICONS: Record<string, typeof Swords> = {
  battle_won: Swords,
  battle_lost: Swords,
  battle_draw: Swords,
  leaderboard_change: TrendingUp,
  vote_milestone: Heart,
  burn: Flame,
  mint: Sparkles,
};

const EVENT_LINKS: Record<string, string> = {
  battle_won: '/swipe/battles',
  battle_lost: '/swipe/battles',
  battle_draw: '/swipe/battles',
  // ...rest unchanged
};

function formatEvent(event: ActivityEvent): string {
  const data = event.eventData;
  switch (event.eventType) {
    case 'battle_won': return `Won battle! (${data.votes}-${data.opponentVotes} votes)`;
    case 'battle_lost': return `Lost battle (${data.votes}-${data.opponentVotes} votes)`;
    case 'battle_draw': return `Battle ended in a draw (${data.totalVotes} total votes)`;
    case 'vote_milestone': return data.milestone === 'first_vote'
      ? 'Cast your first vote!'
      : `Reached ${data.count} total votes`;
    case 'burn': return `Burned Wojak #${data.editionNumber} (+${((data.creditsEarned as number) / 100).toFixed(0)} credits)`;
    case 'mint': return `Minted Wojak #${data.editionNumber}`;
    default: return 'New activity';
  }
}
```

Option B: Update `battle-resolve.ts` to log `event_type: 'battle_result'` with `{ won: true/false, opponent: ... }`.

**Recommendation: Option A.** The separate event types (`battle_won`, `battle_lost`, `battle_draw`) are more expressive and should stay. Update the banner to match reality.

### `leaderboard_change` Events — Never Generated

The banner supports `leaderboard_change` events, but **no code anywhere generates these events**. The leaderboard endpoint is read-only and doesn't track position changes. This is fine for launch — the event type can be implemented later when rank tracking is added.

### `mint` Events — Never Generated

Similarly, `mint` events are never logged to `game_activity`. The mint system predates the game system. This is fine for launch.

---

## 4. Mobile UX Testing Checklist

### Flow 1: Wallet Connect → Auto-Register → Gate Opens
**Path:** User opens `/swipe` → GateChecklist shown → Connect Wallet → getDIDs() → auto-register → gate opens

**Components:** `GateChecklist`, `SwipeAutoRegister`, `VotingFeed`

**Test steps:**
- [ ] Open `/swipe` on mobile without wallet connected
- [ ] GateChecklist renders with correct steps (Connect wallet → Link DID → Hold Farmers Plot → Start swiping)
- [ ] "Connect Wallet" button triggers WalletConnect modal
- [ ] After wallet connects, DID auto-detection happens via MintGarden API
- [ ] If DID found + Phase 1 verified, gate opens to voting feed
- [ ] If DID found but no Phase 1, step 3 highlights with "View Collection" link
- [ ] If no DID found, step 2 highlights with "Learn how to create one" link

**Potential mobile issues:**
- WalletConnect modal overlay: may fight with viewport height (`100dvh`)
- `SwipeAutoRegister` error handling: if getDIDs fails silently (returns []), user sees step 2 stuck. **No error message shown to user** — they just see "Link your DID" with a "Detecting..." hint but nothing happens

### Flow 2: Swipe Voting → Post-Round Summary
**Path:** Voting feed loads → swipe cards → vote 10 times → post-round summary

**Components:** `VotingFeed`, `SwipeCard`, `VoteButtons`, `MobileStatsBar`, `PostRoundSummary`

**Test steps:**
- [ ] Voting page loads with `MobileStatsBar` at top (power level + votes remaining)
- [ ] Card stack renders with 3 visible cards (top interactive, others behind)
- [ ] Swipe right → card exits right with green glow → like registered
- [ ] Swipe left → card exits left with red glow → dislike registered
- [ ] Vote buttons (thumbs up/down/undo) work as alternative to swipe
- [ ] Undo button works once per session
- [ ] Votes remaining counter updates in real-time (MobileStatsBar)
- [ ] After 10th vote → post-round summary shows (likes, dislikes, power level delta)
- [ ] Post-round summary CTAs navigate correctly (Leaderboard, Dashboard)
- [ ] First-time user sees instruction text ("Swipe right to like...")
- [ ] Instruction text fades after 3 votes

**Potential mobile issues:**
- Swipe threshold (100px) may be too high for small screens (320px width)
- Card touch area: `dragElastic={0.7}` means card can be dragged significantly; needs testing on small screens
- Card image aspect ratio: vote-card-image may overflow on very short phones (< 600px height)
- `MobileStatsBar` is clickable (navigates to dashboard) — may be confusing if user accidentally taps it

### Flow 3: Dashboard → Collection → NFT Detail → Burn
**Path:** `/swipe/dashboard` → scroll to collection → tap NFT → detail modal → burn

**Components:** `PowerLevelDisplay`, `QuickActions`, `CollectionScroll`, `NftDetailModal`, `BurnButton`, `BurnConfirmDialog`

**Test steps:**
- [ ] Dashboard loads with all sections: event banner, power level, quick actions, collection, battles, onboarding
- [ ] Power level hero card renders centered with tier badge
- [ ] Quick actions row: Vote, Battle, Burn buttons visible
- [ ] "Burn" quick action scrolls smoothly to collection section
- [ ] Collection scroll shows NFT thumbnails with horizontal scroll
- [ ] Tap NFT thumbnail → detail modal opens (fullscreen overlay)
- [ ] Detail modal shows: name, image, edition, likes/dislikes/net score, total votes
- [ ] "Enter Battle" button navigates to `/swipe/battles`
- [ ] "Burn" button opens BurnConfirmDialog
- [ ] BurnConfirmDialog: checkbox must be checked before "Burn Forever" enables
- [ ] After burn: WalletConnect prompt for transferNFT → backend records burn → modal closes
- [ ] After burn: collection should refresh (currently it does NOT — see section 1)

**Potential mobile issues:**
- NftDetailModal: `max-w-sm` (384px) is fine, but the 200x200 image + stats + 2 buttons may require scrolling on phones < 640px tall
- BurnConfirmDialog: stacks on top of NftDetailModal (both z-50) — ensure proper z-index ordering
- BurnConfirmDialog modal `p-6 max-w-md` may slightly overflow on 320px screens
- WalletConnect approval popup during burn: user must switch to wallet app and back — test this flow is smooth

### Flow 4: Battles → Queue NFT → Vote on Battle
**Path:** `/swipe/battles` → BattleQueuePanel → select NFT → queue → BattleView

**Components:** `BattleQueuePanel`, `BattleView`, `ActiveBattleCard`

**Test steps:**
- [ ] Battles page loads with BattleView component
- [ ] BattleQueuePanel shows dropdown of owned Phase 2 NFTs
- [ ] Select an NFT → "Enter Battle Queue" button enables
- [ ] Queue submission → success/match message appears
- [ ] If matched immediately, battle card appears
- [ ] Active battles show: your NFT vs opponent NFT with vote counts
- [ ] Time remaining badge updates
- [ ] Vote buttons on battle work correctly

**Potential mobile issues:**
- `<select>` dropdown: native mobile select works fine, but custom styling may look different across iOS/Android
- If no NFTs owned, empty state shows with "Go to Generator" link — verify link works
- Battle card images (60x60) are small but adequate for mobile

### Flow 5: Leaderboard → Position Bar
**Path:** `/swipe/leaderboard` → tabs → player list → sticky position bar

**Components:** `GameLeaderboard`, `GameLeaderboardList`, `GamePodium`, `GamePositionBar`

**Test steps:**
- [ ] Leaderboard loads with two tabs: Players, Top Wojaks
- [ ] Podium displays top 3 with avatars/names/scores
- [ ] Scrollable list below podium
- [ ] Sticky position bar at bottom shows user's rank
- [ ] Position bar tap navigates to dashboard
- [ ] Tab switching works smoothly

**Potential mobile issues:**
- Tab switching UI: needs adequate touch targets (min 44px)
- Sticky position bar: should not overlap with bottom nav bar (80px)
- Long names in leaderboard: verify text truncation with ellipsis
- Podium images: verify aspect ratios on narrow screens

### Flow 6: MoreMenu → Wojak Swipe Entry
**Path:** Bottom nav "More" → MoreMenu slides up → tap "Wojak Swipe"

**Components:** `MobileNavigation`, `MoreMenu`

**Test steps:**
- [ ] "More" tab opens slide-up sheet
- [ ] "Wojak Swipe" is first item with Heart icon and "New" badge
- [ ] Tap navigates to `/swipe`
- [ ] Swipe-to-dismiss on the sheet works
- [ ] Sheet doesn't block bottom nav (positioned at bottom: 80px)

---

## 5. Error States Audit

### MintGarden API Dependency Points

The system depends on MintGarden API at these points:

| Component | API Call | Failure Mode | Error Handling |
|---|---|---|---|
| `SageWalletProvider.getDIDs()` | `GET /address/{addr}/nfts?type=owned&size=1` | Returns `[]` | **SILENT** — returns empty array, user stuck at gate step 2 |
| `SwipeAutoRegister` | Calls `getDIDs()` | Returns `[]` | **SILENT** — logs error, allows retry on next render |
| `SwipeCard` images | `https://assets.mintgarden.io/thumbnails/medium/{id}.png` | Broken image | **NO HANDLER** — shows broken image icon |
| `CollectionScroll` images | Same as above | Broken image | **NO HANDLER** — shows broken image icon |
| `ActiveBattleCard` images | Same as above | Broken image | **NO HANDLER** — shows broken image icon |
| `NftDetailModal` image | Same as above | Broken image | **NO HANDLER** — shows broken image icon |
| `BurnButton` coin ID fetch | `GET /nfts/{id}` (if Phase 3 Option C used) | Coin ID null | **Burn button stays in "loading" state** |

**HIGH PRIORITY FIXES:**

1. **Image fallback for all MintGarden thumbnails**

Add an `onError` handler to show a placeholder:

```tsx
// Shared utility or inline
const FALLBACK_IMAGE = '/placeholder-wojak.png'; // or a data URI

<img
  src={`https://assets.mintgarden.io/thumbnails/medium/${nftId}.png`}
  onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
  alt={...}
/>
```

**Affected files:**
- `SwipeCard.tsx` (line 230) — most critical, this is the main voting UI
- `CollectionScroll.tsx` (lines 173-183, 44-53)
- `ActiveBattleCard.tsx` (lines 86-94, 105-113)

2. **getDIDs failure should show user-facing message**

Currently if MintGarden API is down, `getDIDs()` returns `[]` silently and the user sees the gate stuck at "Link your DID" with no explanation. The `GateChecklist` should show an error state:

```tsx
// In GateChecklist, when isCurrent && i === 1:
// Show error if DID detection failed
{isCurrent && i === 1 && didDetectionFailed && (
  <span className="text-sm" style={{ color: 'var(--color-error)' }}>
    Couldn't detect your DID. Check your connection and refresh.
  </span>
)}
```

This requires `SwipeAutoRegister` to expose error state, or a retry mechanism with error feedback.

### D1 Database Failure Points

| Endpoint | Failure Mode | Error Handling |
|---|---|---|
| `vote.ts` | 500 error | `castVote` is fire-and-forget — **vote appears to succeed but doesn't** |
| `feed.ts` | 500 error | `VotingFeed` shows error state with retry button — **GOOD** |
| `power-level.ts` | 500 error | Dashboard shows stale cached value — **acceptable** |
| `collection.ts` | 500 error | `CollectionScroll` silently shows empty — **NO ERROR UI** |
| `battle-list.ts` | 500 error | `ActiveBattleCard` silently shows "No active battles" — **misleading** |
| `battle-queue.ts` | 500 error | `BattleQueuePanel` shows "Network error" — **GOOD** |
| `activity.ts` | 500 error | `LatestEventBanner` shows nothing (empty events) — **acceptable** |
| `register.ts` | 500 error | `SwipeAutoRegister` logs error, allows retry — **acceptable** |
| `burn.ts` | 500 error | `BurnButton` logs error but doesn't show user message — **BAD** |

**HIGH PRIORITY FIXES:**

3. **`castVote` silent failure**

The vote is fire-and-forget (`VotingFeed.tsx` line 162: `castVote(...)` with no `.catch()`). If D1 is down:
- Card exits (animation plays)
- Session counters increment
- Vote is never recorded
- User has no idea

**Fix:** Check `castVote` return value and show a toast on failure:

```tsx
// In VotingFeed handleVote:
const success = await castVote(currentItem.nftId, currentItem.editionNumber, voteType);
if (!success) {
  toast.error('Vote failed — please try again');
  // Optionally: don't count in session stats
}
```

**Problem:** Making it `await` breaks the optimistic UI pattern. Alternative: fire-and-forget but add a `.catch()` toast:

```tsx
castVote(currentItem.nftId, currentItem.editionNumber, voteType)
  .then(ok => { if (!ok) toast.error('Vote failed to save'); })
  .catch(() => toast.error('Vote failed to save'));
```

4. **BurnButton error feedback**

`BurnButton.tsx` line 51: `catch (err) { console.error('Burn failed:', err); }` — no user-visible feedback.

**Fix:** Add error state:

```tsx
const [error, setError] = useState<string | null>(null);

// In handleBurn catch:
catch (err) {
  console.error('Burn failed:', err);
  setError('Burn failed. The NFT may not have been destroyed.');
}

// Render error in dialog:
{error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}
```

5. **CollectionScroll error state**

Currently if `collection.ts` returns an error, the catch block is `() => { /* silent */ }` and the component shows 0 NFTs (line 132: "No Wojaks yet"). This is misleading — the user might think they have no NFTs when really the API failed.

**Fix:** Add error state:

```tsx
const [error, setError] = useState(false);

// In the fetch .catch:
.catch(() => { setError(true); })

// Render:
if (error) {
  return (
    <div id="collection-section" className="flex flex-col gap-2">
      <span className="text-secondary" style={{ fontSize: 14, fontWeight: 500 }}>Your Collection</span>
      <div className="text-sm" style={{ color: 'var(--color-error)' }}>
        Couldn't load your collection. <button className="text-accent" onClick={() => { setError(false); setLoading(true); /* re-trigger */ }}>Retry</button>
      </div>
    </div>
  );
}
```

### WalletConnect Failures

| Scenario | Current Handling |
|---|---|
| WalletConnect session expired | Wallet provider handles reconnect — **adequate** |
| User rejects transferNFT in wallet | `BurnButton` catches error, logs it — **no user message** |
| transferNFT timeout | Same as above — **no user message** |
| Wallet app not open | WalletConnect shows "Open wallet" prompt — **adequate** |

---

## 6. Additional Issues Found During Review

### power-level.ts Missing `rank` and `credits` in Response

`GameDashboard.tsx` reads `data.rank` and `data.credits` from the power-level API response, but `power-level.ts` never returns these fields — only `powerLevel` and `breakdown`. The rank and credits sections in `PowerLevelDisplay` silently render nothing.

**Fix:** Add rank query and credits lookup to `power-level.ts`:
```ts
// After calculating powerLevel:
const rankResult = await context.env.DB.prepare(
  'SELECT COUNT(*) as rank FROM game_players WHERE power_level > ?'
).bind(powerLevel).first();
const rank = ((rankResult?.rank as number) || 0) + 1;

// Credits from credit_events
const creditsResult = await context.env.DB.prepare(
  'SELECT COALESCE(SUM(credits_earned), 0) as total FROM credit_events WHERE wallet_address = ?'
).bind(player.wallet_address).first();
const credits = (creditsResult?.total as number) || 0;

// Add to response:
return Response.json({ success: true, powerLevel, rank, credits, breakdown: { ... } });
```

### Vote Undo Is UI-Only (Misleading)

`VotingFeed.tsx` undo feature only decrements local session counters — the backend vote is already recorded and never reversed. The user thinks they undid their vote but it still counts. Either:
- A: Remove undo entirely (simplest, honest)
- B: Add backend undo endpoint (`DELETE FROM wojak_votes WHERE voter_did = ? AND nft_id = ?`) — more complex
- C: Keep as-is but rename to "Skip" or remove the feature label

**Recommendation:** Option A for launch. Real undo adds complexity (score rollback, feed re-insertion).

---

## Summary: Task List for CLI Session

### BLOCKERS (do these first, in order)

### Blocker A: Fix collection IDs in game system
**Files to modify:**
- `workers/did-indexer/worker.ts` lines 11-12 — correct both constants
- `functions/api/game/_shared.ts` line 4 — correct PHASE1_COLLECTION_ID
**After fixing:** Wipe `did_holdings` table and re-trigger indexer:
```bash
npx wrangler d1 execute wojak-users --remote --command "DELETE FROM did_holdings;"
# Then trigger indexer manually or wait for next cron
```
**Commit:** `fix(critical): correct collection IDs — Phase 1 gate and DID indexer were querying wrong collections`

### Blocker B: Fix nftCoinId in CollectionScroll burn
**Files to modify:**
- `src/components/game/CollectionScroll.tsx` — implement on-demand coin ID fetch from MintGarden API instead of passing `nft.nftId` as `nftCoinId`
**Must test first:**
```bash
curl https://api.mintgarden.io/nfts/{any_known_nft_id} | jq 'keys'
```
Find the correct field name for coin ID (`nft_coin_id`, `coin_id`, `encoded_id`).
**Commit:** `fix(critical): fetch real nftCoinId from MintGarden before burn`

### Blocker C: Deduplicate battle resolution
**Files to modify:**
- `workers/did-indexer/worker.ts` — remove `resolveBattles()` function and its call in `run()`
- If `workers/battle-cron/` was created in Phase 3, verify it calls the Pages Function endpoint (not duplicate logic)
**Commit:** `fix: remove duplicate battle resolution from DID indexer`

---

### POLISH (after blockers are resolved)

### Task 1: Power level recalc after burn
**Files to modify:**
- `src/components/game/CollectionScroll.tsx` — add `refreshPowerLevel()` call in `onBurned`, add collection refresh via `refreshKey` state pattern
**Commit:** `fix: recalculate power level and refresh collection after burn`

### Task 2: Fix LatestEventBanner event type mapping
**Files to modify:**
- `src/components/game/LatestEventBanner.tsx` — update `EVENT_ICONS`, `EVENT_LINKS`, and `formatEvent()` to handle `battle_won`, `battle_lost`, `battle_draw` instead of `battle_result`. Improve `vote_milestone` formatting for first-vote case. Add `creditsEarned` to burn format.
**Commit:** `fix: align LatestEventBanner with actual game_activity event types`

### Task 3: Image fallback for MintGarden thumbnails
**Files to modify:**
- `src/components/game/SwipeCard.tsx` — add `onError` fallback
- `src/components/game/CollectionScroll.tsx` — add `onError` fallback (both thumbnail and modal image)
- `src/components/game/ActiveBattleCard.tsx` — add `onError` fallback
**Create:**
- `public/placeholder-wojak.png` — a simple 200x200 placeholder (or use a CSS/SVG placeholder inline)
**Commit:** `fix: add image fallback for MintGarden thumbnail failures`

### Task 4: Vote failure feedback
**Files to modify:**
- `src/components/game/VotingFeed.tsx` — add `.catch()` toast on `castVote` failure
**Commit:** `fix: show toast when vote fails to save`

### Task 5: Burn error feedback
**Files to modify:**
- `src/components/game/BurnButton.tsx` — add error state and user-visible error message in BurnConfirmDialog
**Commit:** `fix: show error message when burn fails`

### Task 6: CollectionScroll error state
**Files to modify:**
- `src/components/game/CollectionScroll.tsx` — add error state with retry button instead of silent empty state
**Commit:** `fix: show error state when collection fails to load`

### Task 7: Add rank + credits to power-level response
**Files to modify:**
- `functions/api/game/power-level.ts` — add rank calculation and credits query to response
**Commit:** `feat: include rank and credits in power-level API response`

### Task 8 (optional): Feed append instead of replace
**Files to modify:**
- `src/contexts/GameContext.tsx` — change `loadFeed` to append new items (deduplicated) instead of replacing
**Commit:** `fix: append new feed items instead of replacing to prevent flicker`

### Task 9 (optional): Remove misleading vote undo
**Files to modify:**
- `src/components/game/VotingFeed.tsx` — remove undo state and logic
- `src/components/game/VoteButtons.tsx` — remove undo button
**Commit:** `chore: remove UI-only vote undo to avoid misleading users`

---

### Verification
```bash
npx tsc -b          # TypeScript clean
npm run build       # Build succeeds
```

### Items NOT Needing Changes
- **Feed algorithm** — correctly excludes voted/owned/created, weighted random is good
- **Feed exhaustion UX** — "All Caught Up!" message is adequate
- **Power level formula** — computes correctly
- **`leaderboard_change` events** — not yet generated, fine for launch
- **`mint` events** — not yet generated, fine for launch
- **Daily vote reset race condition** — theoretical only, not practical with 10 daily votes
