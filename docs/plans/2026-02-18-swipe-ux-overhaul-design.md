# Wojak Swipe UX Overhaul — Design

## Goal

Transform Wojak Swipe from a collection of disconnected screens into a cohesive, premium-feeling game experience. Every NFT becomes clickable, DIDs disappear from the UI, navigation becomes obvious, and empty states guide users forward.

## Architecture

Seven changes, ordered by impact:

1. NFT Profile Page (new page)
2. Remove DIDs from UI (display changes)
3. Swipe sub-navigation bar (new component)
4. Clickable NFTs everywhere (Link wrappers)
5. Battle history tab (tab toggle + resolved card)
6. Better empty states (copy + CTAs)
7. Onboarding auto-detect (GateChecklist + SwipeAutoRegister)

---

## 1. NFT Profile Page

**Route:** `/swipe/wojak/:edition`

Full-page profile for each Wojak NFT. This is the connective tissue — leaderboard, battles, feed, and dashboard all link here.

### Layout

Desktop: 2-column hero (image left, info right) + full-width sections below.
Mobile: single stack.

```
+----------------------------------------------+
|  [< Back to {previous}]                     |
+-------------------+--------------------------+
|                   |  Your Wojak #7           |
|   [NFT IMAGE]     |  "Sigma Grind"           |
|   (large, ~300px) |  Owned by xch18t...pxk   |
|                   +--------------------------+
|                   |  +12 net | 15L | 3D | 18T|
+-------------------+--------------------------+
|  BATTLE RECORD               2W - 1L - 0D   |
|  +--------+----------+----------+-----------+|
|  | vs #4  | Won +3   | Feb 18   | +5 bonus ||
|  | vs #12 | Lost -2  | Feb 17   | -2 bonus ||
|  +--------+----------+----------+-----------+|
+----------------------------------------------+
|  SALES HISTORY                               |
|  +----------+---------+--------+------------+|
|  | Feb 12   | 0.5 XCH | $1.40  | Dexie     ||
|  | Jan 28   | 0.3 XCH | $0.85  | Dexie     ||
|  +----------+---------+--------+------------+|
+----------------------------------------------+
```

### New API Endpoint

`GET /api/game/wojak/:edition`

Returns:
```json
{
  "nft": {
    "nftId": "hex...",
    "edition": 7,
    "name": "Sigma Grind",
    "customName": "Sigma Grind",
    "fullName": "Your Wojak #7: Sigma Grind",
    "imageUri": "https://...",
    "ownerWallet": "xch18t...pxk",
    "ownerDid": "did:chia:1...",
    "creatorWallet": "xch18t...pxk"
  },
  "scores": {
    "likes": 15,
    "dislikes": 3,
    "netScore": 12,
    "totalVotes": 18
  },
  "battles": {
    "total": 3,
    "wins": 2,
    "losses": 1,
    "draws": 0,
    "history": [
      {
        "id": 5,
        "opponentEdition": 4,
        "opponentName": "Your Wojak #4",
        "result": "win",
        "scoreDelta": 3,
        "bonus": 5,
        "resolvedAt": "2026-02-18T..."
      }
    ]
  },
  "sales": [
    {
      "date": "2026-02-12",
      "price": "0.5",
      "currency": "XCH",
      "usdValue": 1.40,
      "source": "dexie"
    }
  ]
}
```

SQL joins: `phase2_mints` + `nft_names` + `wojak_scores` + `did_holdings` + `game_players` for NFT data. Separate queries for battles (from `battles` table filtered by nft_id) and sales (from `sales_history` filtered by edition).

### Component

`src/pages/WojakProfile.tsx` — full page component inside GameLayout.

Hero section: image + info card using `card-static`.
Battle record: summary line (2W-1L-0D) + table rows. Each opponent is a Link to their profile.
Sales history: simple table. Empty state if no sales.

Styling follows existing theme: `card-static`, `badge`, `text-secondary`, `text-muted`. Orange accent on positive scores, red on negative.

---

## 2. Remove DIDs from UI

Replace all DID displays with truncated wallet addresses (`xch1` prefix is recognizable to Chia users).

| Component | Current | Replacement |
|-----------|---------|-------------|
| `GamePodium.tsx` | `truncateDid(did)` → "did:ch...0n4q" | `truncateWallet(wallet)` → "xch18t...pxk" |
| `GameLeaderboardList.tsx` (PlayerRow) | `truncateDid(did)` | `truncateWallet(wallet)` |
| `MiniLeaderboard.tsx` | `truncateDid(did)` | `truncateWallet(wallet)` |
| `GamePositionBar.tsx` | Check if DID shown | Replace if so |

Utility function:
```ts
function truncateWallet(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 7)}...${addr.slice(-3)}`;
}
// "xch18tc...pxk"
```

### API changes

- `top-wojaks.ts`: Already returns `ownerDid`. Add `ownerWallet` by joining `game_players.wallet_address`.
- `leaderboard.ts`: Already returns `walletAddress`. No change needed.

---

## 3. Swipe Sub-Navigation Bar

A horizontal nav strip rendered inside `GameLayout`, between the header and the `<Outlet />`.

```
 Vote  |  Dashboard  |  Battles  |  Leaderboard  |  Activity
─────────────────────────────────────────────────────────────
```

### Component

`src/components/game/SwipeNav.tsx`

- 5 items, each a `NavLink` from react-router-dom
- Active item: orange underline + white text
- Inactive: `text-muted`, no underline
- Desktop: centered, fixed width
- Mobile: horizontally scrollable pill bar, sticky below header

Rendered in `GameLayout` (in `App.tsx`) above the `<Outlet />`:
```tsx
function GameLayout() {
  return (
    <GameProvider>
      <SwipeAutoRegister />
      <SwipeNav />
      <Outlet />
    </GameProvider>
  );
}
```

Only visible when player is registered (no nav bar during onboarding gate).

---

## 4. Clickable NFTs Everywhere

Wrap NFT images and names in `<Link to={`/swipe/wojak/${edition}`}>` in these components:

| Component | What becomes clickable |
|-----------|----------------------|
| `GamePodium.tsx` | NFT image + name text |
| `GameLeaderboardList.tsx` (WojakRow) | Entire row |
| `GameLeaderboardList.tsx` (PlayerRow) | Top NFT thumbnail |
| `BattleCard.tsx` | Both NFT images + names |
| `ActiveBattleCard.tsx` | Both NFT images |
| `CollectionScroll.tsx` | Each NFT card |

Not clickable:
- Swipe feed cards (would interfere with swipe gesture)
- MiniLeaderboard (text-only, no images)

Hover effect on clickable NFT images: subtle brightness increase + cursor pointer. Use existing hover transition from theme.css.

---

## 5. Battle History Tab

Add tab system to `/swipe/battles` page.

```
[Active]  [History]
```

### Active tab (existing)
Current BattleView with spectator cards, countdown timers.

### History tab (new)
Fetches `battle-list?status=history&limit=20`. Shows resolved battles:

```
+------------------------------------------+
| [img] #7  vs  [img] #4     Feb 18       |
| Sigma Grind    Cope Lord                  |
|        Winner: Sigma Grind  (+3 delta)   |
+------------------------------------------+
```

- Winner side: green border, "Won" badge
- Loser side: dimmed, "Lost" badge
- Draw: both neutral, "Draw" badge
- NFT images clickable → profile page
- Pagination: "Load More" button

`BattleView.tsx` gets a `tab` state and renders either the existing active view or a new `BattleHistoryList` component.

---

## 6. Better Empty States

Each empty state includes: icon/emoji, descriptive text, and a CTA button pointing to the logical next action.

| Location | Text | CTA |
|----------|------|-----|
| Feed (voted all) | "You've seen all {n} Wojaks! Check back when more are minted." | "View Leaderboard" → `/swipe/leaderboard` |
| Feed (no others exist) | "You're early! Mint a Wojak and invite others to play." | "Mint a Wojak" → `/generator` (use Link, not anchor) |
| Battles (no active) | "No active battles right now." | "Queue a Wojak" → dashboard |
| Battle history (none) | "No battles resolved yet. Queue a Wojak to start one." | "Queue a Wojak" → dashboard |
| NFT profile (no battles) | "No battles yet." | "Send to Battle" (if user owns it) |
| NFT profile (no sales) | "No sales recorded." | None |
| Leaderboard (empty) | "No players yet. Start swiping to climb the ranks." | "Start Swiping" → `/swipe` |

Also fix the `<a href="/generator">` in VotingFeed.tsx → `<Link to="/generator">` (prevents full page reload).

---

## 7. Onboarding Auto-Detect

Make the common path zero-input: connect wallet → auto-detect DID → auto-verify Phase 1 → start swiping.

### Changes to GateChecklist

Step 2 label: "Link your DID" → "Detect your identity"

When wallet connects, show: "Detecting your identity..." with a subtle spinner for up to 5 seconds while `SwipeAutoRegister` runs `getDIDs()`. If DID found and registration succeeds, step 2 auto-completes with the checkmark animation.

Manual DID paste input only appears as fallback after auto-detect fails. Show a smaller "Enter DID manually" link that expands the input.

### Changes to SwipeAutoRegister

Current behavior: attempts `getDIDs()` up to 3 times with 3s delay. This is fine. The change is in how GateChecklist responds — it should show a detecting state rather than immediately presenting the manual input.

### Flow

```
1. Connect wallet → step 1 complete
2. "Detecting your identity..." (spinner, 3-9 seconds)
   → Success: step 2 auto-completes, proceed to step 3
   → Failure: "Could not detect DID automatically."
              [Enter DID manually] (collapsible input)
3. "Checking for Wojak Farmers Plot..." (auto)
   → Found: step 3 auto-completes → start swiping
   → Not found: Show retry + manual launcher ID input
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `functions/api/game/wojak/[edition].ts` | NFT profile API |
| `src/pages/WojakProfile.tsx` | NFT profile page |
| `src/components/game/SwipeNav.tsx` | Sub-navigation bar |
| `src/components/game/BattleHistoryList.tsx` | Resolved battles list |

## Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Add WojakProfile route inside GameLayout |
| `src/App.tsx` | Add SwipeNav to GameLayout |
| `functions/api/game/top-wojaks.ts` | Add ownerWallet |
| `src/components/game/GamePodium.tsx` | wallet display, clickable NFTs |
| `src/components/game/GameLeaderboardList.tsx` | wallet display, clickable NFTs |
| `src/components/game/MiniLeaderboard.tsx` | wallet display |
| `src/components/game/BattleCard.tsx` | clickable NFTs |
| `src/components/game/ActiveBattleCard.tsx` | clickable NFTs |
| `src/components/game/CollectionScroll.tsx` | clickable NFTs |
| `src/components/game/BattleView.tsx` | tab system + history |
| `src/components/game/VotingFeed.tsx` | better empty states, fix anchor tag |
| `src/components/game/GateChecklist.tsx` | auto-detect flow |
| `src/pages/GameBattles.tsx` | pass tab state |

---

## Not in Scope

- Player profile page (dashboard already serves this purpose)
- Notifications system (separate feature)
- NFT trading/marketplace integration
- Mobile app-specific optimizations beyond responsive layout
