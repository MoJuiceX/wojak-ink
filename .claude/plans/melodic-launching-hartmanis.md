# Plan: Redesign `public/free-mints.html`

Minimalistic, premium redesign of the standalone free-mints leaderboard page.
Target: ~375 lines (down from ~950). Single file rewrite — all inline HTML/CSS/JS.

---

## Goals

1. **Primary**: Showcase biggest supporters of Wojak Farmers Plot
2. **Secondary**: Show connected users their personal free mint credits
3. Clean, minimal, premium feel — less visual noise

---

## What Changes

### Remove
- Formula box + info popover (lines 347-362, 794-816)
- Expandable purchase history rows (lines 124-145, 569-588, 645-728)
- Sort column controls (lines 62-63, 114-115, 622-642)
- Skeleton loading table (lines 51-58, 369-382)
- Expandable wallet card with chevron (lines 219-296, 853-932)
- "Jump to my rank" button
- Paid Mints column
- `fetchHistory()`, `fetchNftInfo()`, `renderExpandContent()`, `truncateId()`
- `historyCache`, `nftCache`, `currentSort`, MintGarden API constants

### Keep
- `getConnectedWallet()` (reads `sage-wallet-session` localStorage)
- `wallet-connect-standalone.js` script + `sage-wallet-connected` event listener
- Top bar (wallet button + close button)
- Top 3 rank styling (gold/silver/bronze)
- User row highlighting (orange)
- Load more pagination
- Audit JSON fallback
- All CSS variables (`:root` block)

### Add / Redesign
- **Title**: "Top Supporters" (was "Free Mint Credits Leaderboard")
- **Subtitle**: 2-line explanation + earning method note (holder airdrop + secondary market)
- **Personal card**: Always-visible (no expand), shows rank (clickable → scrolls to row), credits, free mints
- **Table**: 4 columns only: `#` | `Wallet` | `Credits` | `Free Mints`
- **Loading**: Simple spinner (no skeleton rows)

---

## New Page Structure

```
<body>
  Top bar (wallet + close buttons)            -- KEEP
  <div class="container">
    <header>
      h1: "Top Supporters"
      p: Brief description (2 lines)
      p: How credits are earned (1 line, muted)
    </header>
    #error                                     -- KEEP (hidden)
    #loading                                   -- Simplified spinner
    #personal-card                             -- NEW: always-visible stats card
      wallet address + green dot
      3-stat grid: Rank (clickable), Credits, Free Mints
    #table-wrap                                -- Simplified
      4-col table: # | Wallet | Credits | Free Mints
      No expand rows, no sort headers
    #load-more-wrap                            -- KEEP
    .trust-line                                -- Simplified to centered text
  </div>
  wallet-connect-standalone.js                 -- KEEP
  sage-wallet-connected listener               -- KEEP
</body>
```

---

## CSS (~140 lines)

| Section | Details |
|---------|---------|
| `:root` variables | Unchanged |
| Reset + body | Keep, adjust padding to `16px 20px 40px` |
| `.container` | max-width: `820px` (narrower = more premium) |
| Header | `h1` 24px, `.header-desc` 14px, new `.how-it-works` 13px muted |
| Loading | `.spinner-wrap` centered, `.spinner` 32px, `@keyframes spin` |
| `.error` | Keep as-is |
| `.personal-card` | Surface bg, subtle orange border, 14px radius. Top row: green dot + address. Stat grid: 3 items flex row. `.stat-rank` has `cursor:pointer` + orange hover |
| `.table-wrap` + table | Keep core styles, remove expand/sort styles. 4 columns. Simple `hover: surface-hover` on rows |
| Rank styling | Top 3: gold/silver/bronze border-left + gradient bg. User row: orange |
| Load more + trust line | Keep, minor style refresh |
| Top bar | Keep as-is |
| Responsive `@media (max-width: 600px)` | Personal card grid → 2 cols, smaller table font |

---

## JavaScript (~160 lines)

### Keep (simplified)
- `PAGE_SIZE`, `FULL_LOAD_SIZE`, `leaderboard`, `hasMore`, `loadingMore`
- `getConnectedWallet()` — unchanged
- `truncateWallet()` — unchanged
- `fetchLeaderboard()` — remove `sort` param, always fetch `sort=earned`
- `fromAuditJson()` — strip `purchases` mapping
- `loadFromApi()` — remove sort refs, keep wallet-connected full load (500)
- `loadMore()` — remove sort refs
- Wallet button IIFE — unchanged
- Load more button listener — unchanged

### Rewrite: `renderTable()`
1. Clear tbody
2. For each row: single `<tr>` with 4 cells (rank, wallet, credits, free mints)
   - Classes: `data-row`, `rank-1`/`rank-2`/`rank-3` for top 3, `user-row` if connected
   - No expand row, no expand icon, no paid mints cell
3. Populate `#personal-card`:
   - If wallet connected: show card with address, rank (clickable), credits, free mints
   - Rank click → `document.querySelector('.user-row')?.scrollIntoView({behavior:'smooth',block:'center'})`
   - If wallet not in leaderboard: show "No credits earned yet"
   - If no wallet: hide card
4. No auto-scroll on load (removed — rank click in personal card is the scroll trigger)
5. No sort column handlers

---

## File

| File | Action |
|------|--------|
| `public/free-mints.html` | REWRITE (~375 lines, down from ~950) |

No other files modified.

---

## Verification

1. Open `http://localhost:5173/free-mints.html` (or deployed site)
2. **Disconnected state**: No personal card visible, leaderboard loads with spinner, top 3 have gold/silver/bronze styling
3. **Connect wallet**: Personal card appears with rank/credits/free mints. User row highlighted orange in table. Click rank number in personal card → smooth scroll to user's row
4. **Load more**: Button loads next 50 entries
5. **Mobile**: Personal card and table responsive at 600px breakpoint
6. **Fallback**: If API fails, loads from `audit-credits-report.json`
7. **Page reload**: Wallet stays connected (reads localStorage), personal card repopulates
