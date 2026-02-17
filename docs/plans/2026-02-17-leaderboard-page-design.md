# Leaderboard Page UI/UX Design Spec

> **For Claude:** This is a design spec, not an implementation plan. Use with `superpowers:writing-plans` to create the implementation plan.

**Goal:** A full leaderboard page for the "Your Wojak" game with two tabs — Players ranked by Power Level, and Top Wojaks ranked by net vote score. Podium for top 3, clean list for the rest, sticky "Your Position" bar.

**Route:** `/your-wojak/leaderboard`

**Visual Language:** Follows patterns established in voting page and dashboard design specs. Dark theme, `card-static` containers, Lucide icons, tier colors from theme.css.

---

## 1. Page Layout

Single column, centered, max-width 720px (wider than dashboard's 640px for list rows).

- **Padding:** 16px
- **Wrapper:** `PageTransition` for route animation

**Structure (top to bottom):**

1. Tab bar — "Players" / "Top Wojaks"
2. Podium — Top 3, special visual treatment
3. List — Rank #4 down, paginated
4. Sticky "Your Position" bar — fixed to bottom viewport

**Tab bar:** Two tabs, horizontally centered. Active tab: white text + orange underline 2px `var(--color-primary)`. Inactive tab: `text-muted`. No background — just text + underline. Padding 12px 20px per tab. `gap: 0`. Tap switches tab content without page reload.

**Mobile:** Same layout. Podium cards shrink (smaller thumbnails). List rows unchanged. Sticky bar unchanged.

---

## 2. Players Tab — Podium (Top 3)

Three cards in a row. #1 center (taller), #2 left, #3 right. Classic podium arrangement.

**Each podium card:** `card-static`, centered content.

| Element | #1 | #2, #3 |
|---------|-----|--------|
| NFT avatar | 64px | 48px |
| Card padding | 20px | 16px |
| Power Level | 18px bold | 15px bold |
| Glow | `var(--glow-gold)` | subtle silver/bronze |

**Card content (top to bottom):**
- Rank badge: circular, overlapping top-left of avatar. "#1" / "#2" / "#3"
- NFT avatar: top-performing Wojak thumbnail, `border-radius: var(--radius-md)`
- Truncated DID: 12px, `text-secondary`
- Power Level: bold, white
- Tier label: 11px pill badge in tier color ("Legend", "Top Tier", etc.)

**Rank badge colors:**
- #1: `var(--color-gold)` background, dark text
- #2: `rgba(192,192,192,0.8)` (silver), dark text
- #3: `rgba(205,127,50,0.8)` (bronze), dark text

**#1 elevated:** Extra padding, `var(--glow-gold)` shadow. #2 and #3 equal height, subtler glow.

**Layout:** `flex items-end justify-center gap-3` — items-end so #2 and #3 align to bottom while #1 is taller.

---

## 3. Players Tab — List (Rank #4+)

Clean rows below the podium.

**Row layout:** `flex items-center gap-3`, padding 10px 14px.

| Element | Size | Color | Notes |
|---------|------|-------|-------|
| Rank number | 14px, medium | `text-muted` | Fixed 32px width |
| NFT avatar | 36px square | — | `border-radius: var(--radius-md)` |
| Truncated DID | 13px | `text-secondary` | Fills available space |
| Tier dot | 8px circle | tier color | Inline after DID, subtle indicator |
| Power Level | 15px, bold | white | Right-aligned |

**Row states:**
- Default: subtle bottom border `rgba(255,255,255,0.04)`
- Hover: background `rgba(255,255,255,0.03)`
- Current user: left border 2px `var(--color-primary)` + background `rgba(255,107,0,0.05)`
- Tap: no action for now (future: navigate to player profile)

**Pagination:** 50 per page. "Load More" `btn btn-ghost` at bottom. Above button: "Showing 50 of 247 players" in 12px `text-muted`. No infinite scroll.

**Loading state:** 8 skeleton rows (pulsing rectangles matching row layout).

---

## 4. Top Wojaks Tab

Ranks individual NFTs by net vote score. Same podium + list structure.

### Podium (Top 3 Wojaks)

Same 3-card layout, adapted for NFTs:

| Element | #1 | #2, #3 |
|---------|-----|--------|
| NFT image | 80px | 56px |
| Net score | 18px bold | 15px bold |

**Card content (top to bottom):**
- Rank badge (same gold/silver/bronze)
- NFT image: the actual Wojak artwork, `border-radius: var(--radius-md)`
- NFT name: 13px, white ("Moon Boy" or "Your Wojak #42")
- Net score: bold, "+342 votes"
- Creator DID: 11px, `text-muted`, "by abc...xyz"

### List Rows (Rank #4+)

| Element | Size | Color | Notes |
|---------|------|-------|-------|
| Rank number | 14px, medium | `text-muted` | Fixed 32px |
| NFT thumbnail | 36px square | — | `border-radius: var(--radius-md)` |
| NFT name | 13px | white | Fill |
| Edition | 11px | `text-muted` | Below name, "#42" |
| Net score | 15px, bold | white | Right-aligned |
| Like ratio | 11px | `text-muted` | Below score, "87% liked" |

**Your NFTs highlighted:** Any NFT you own gets the orange left border + subtle orange background (same as player row highlight).

**Pagination:** Same pattern — 50 at a time, "Load More" button.

**New API needed:** `GET /api/game/top-wojaks?limit=50&offset=0` reading from `wojak_scores` ordered by `net_score DESC`. Returns: rank, nft_id, edition_number, name, net_score, likes, dislikes, total_votes, creator_wallet.

---

## 5. Sticky "Your Position" Bar

Fixed to bottom viewport. Always visible.

**Container:** `position: fixed`, `bottom: 0`, full viewport width. Background `var(--color-surface)`, top border `var(--color-border)`. Inner content max-width 720px, centered. Padding 12px 16px. Flex row, `items-center`.

### Players Tab Content

| Element | Size | Color | Position |
|---------|------|-------|----------|
| "You" label | 13px, medium | `var(--color-primary)` | Left |
| Rank | 14px, bold | white | "#47" |
| Power Level | 14px | `text-secondary` | After rank |
| Gap to next | 12px | `text-muted` | Right, "142 pts to #46" |

### Top Wojaks Tab Content

| Element | Size | Color | Position |
|---------|------|-------|----------|
| NFT thumbnail | 28px | — | Left |
| NFT name | 13px | `var(--color-primary)` | After thumb |
| Rank | 14px, bold | white | "#23" |
| Net score | 12px | `text-muted` | Right, "+124 votes" |

Shows your best-ranked Wojak.

### Not Registered State

Bar shows: "Join the game" `btn btn-primary` (small) → `/your-wojak/dashboard`.

**Page bottom padding:** ~60px to prevent sticky bar from covering last list rows.

---

## 6. Empty & Edge States

### No Players Yet (Fresh Game)
- Podium: 3 placeholder cards with `?` silhouette, "Unclaimed" text
- Empty list: "Be the first on the leaderboard" centered, `text-muted`
- CTA: `btn btn-primary` "Get Started" → `/your-wojak/dashboard`

### No Top Wojaks Yet (No Votes Cast)
- Same placeholder podium
- "No votes cast yet" + `btn btn-primary` "Vote Now" → `/games/your-wojak`

### Player Not Registered
- Leaderboard fully viewable (public data)
- Sticky bar shows "Join the game" CTA
- No orange-highlighted row in list

### Loading State
- Podium: 3 skeleton cards (pulsing)
- List: 8 skeleton rows
- Sticky bar: skeleton line

### Error State
- Centered card: `AlertCircle` icon (24px, `text-error`), "Couldn't load leaderboard", "Retry" `btn btn-primary`

---

## 7. API Requirements

**Existing endpoints (no changes):**
- `GET /api/game/leaderboard?limit=50&offset=0` — players ranked by Power Level

**Existing endpoint needs extension:**
- `GET /api/game/leaderboard` — needs to also return each player's top NFT image URL for avatars. Add `topNft: { nftId, editionNumber, imageUrl }` to each entry.

**New endpoints needed:**
- `GET /api/game/top-wojaks?limit=50&offset=0` — NFTs ranked by net_score from `wojak_scores` table. Returns: rank, nft_id, edition_number, name (from `nft_names`), net_score, likes, dislikes, total_votes, creator_wallet, owner_did (from `did_holdings`).

---

## 8. Navigation

**How users get here:**
- MiniLeaderboard "View Full →" link on voting page
- Dashboard Power Level hero rank tap
- Direct URL: `/your-wojak/leaderboard`
- Event banner tap on leaderboard change events

**How users leave:**
- Browser back
- Tap on "Join the game" / "Get Started" CTAs → dashboard
- Tap on "Vote Now" CTA → voting page

**Cross-linking:**
- Update `MiniLeaderboard.tsx` "View Full →" link from `/leaderboard` to `/your-wojak/leaderboard`
