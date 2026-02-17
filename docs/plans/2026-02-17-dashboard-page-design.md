# Dashboard Page UI/UX Design Spec

> **For Claude:** This is a design spec, not an implementation plan. Use with `superpowers:writing-plans` to create the implementation plan.

**Goal:** A focused Player HQ dashboard for the "Your Wojak" game — answers "what should I do next?" with your Power Level, quick actions, collection, and active battles.

**Route:** `/games/your-wojak/dashboard`

**Visual Language:** Follows patterns established in the voting page design spec. Dark theme, `card-static` containers, Lucide icons, `text-secondary`/`text-muted` hierarchy.

---

## 1. Page Layout

Single column, centered, vertically stacked.

- **Max width:** 640px, centered with `mx-auto`
- **Padding:** 16px (desktop), 12px (mobile)
- **Gap between sections:** 16px
- **Wrapper:** `PageTransition` for route animations, content in `GameProvider`

**Section order (top to bottom):**

1. Latest Event Banner
2. Power Level Hero
3. Quick Actions
4. Collection Scroll
5. Active Battle Card
6. Onboarding Checklist (auto-hides when complete)

**Mobile:** Same order, same column. No layout changes — it's mobile-first by default.

**Desktop:** Centered with breathing room on sides. No side panels.

---

## 2. Power Level Hero

The centerpiece. `card-static` with 24px padding. All content centered.

**Content stack (top to bottom):**

| Element | Size | Color | Notes |
|---------|------|-------|-------|
| Rank | 13px | `text-muted` | "#47" |
| Power Level | 36px, bold | white | The main number |
| Tier badge | pill | tier color | "Active Player", uses existing tier logic |
| Credits | 13px | `text-muted` | "Credits: 450" — only if > 0 |
| Breakdown toggle | ghost button | `text-secondary` | "View Breakdown" — expands inline |

**Breakdown (expanded):**
- Holdings: +340 (quality + value + breadth) — 13px, `text-secondary`
- Creations: +180 (community reception) — 13px, `text-secondary`
- Collapses on second tap

**Tier colors (from theme.css):**
- Legend (9000+): gold gradient
- Top Tier (5000+): purple
- Serious (2000+): cyan
- Active (500+): green
- Casual/New (0-499): `text-secondary`

**Implementation note:** Upgrade existing `PowerLevelDisplay.tsx` — add `rank` prop, make breakdown collapsible, increase score font size to 36px, add credits line.

---

## 3. Latest Event Banner

Slim single-line banner at the very top. Shows most recent activity event.

**Layout:** Full width within 640px column. Background `rgba(255,255,255,0.04)`, `border-radius: var(--radius-md)`, padding 10px 14px. Flexed horizontally.

**Content row:**

| Element | Size | Color | Position |
|---------|------|-------|----------|
| Event icon | 16px Lucide | tier-colored | Left |
| Message | 13px | `text-secondary` | Fill, truncate to 1 line |
| Timestamp | 12px | `text-muted` | Right |
| Dismiss X | 16px ghost | `text-muted` | Far right |

**Event type → icon mapping:**
- Battle result: `Swords`
- Leaderboard change: `TrendingUp`
- Vote milestone: `Heart`
- Burn: `Flame`
- Mint: `Sparkles`

**Tap behavior:** Tapping the message navigates to the relevant page (battles, leaderboard, etc.).

**"View All" link:** Small `text-accent` link below the banner, right-aligned: "View all activity →". Links to future activity page (can be `/games/your-wojak/activity` placeholder).

**Empty state:** Banner doesn't render if no activity events exist.

**Dismiss behavior:** Hides current event, shows next-most-recent. If no more events, banner disappears.

---

## 4. Quick Actions

Three equal-width buttons in a horizontal row.

**Layout:** `flex gap-3`. Each button `flex-1`.

**Button style:** `btn btn-secondary`, vertical stack layout. Icon (20px Lucide) on top, label (13px, medium weight) below. Padding 14px vertical. ~70px height.

**Buttons:**

| Button | Icon | Label | Badge/Indicator | Link |
|--------|------|-------|-----------------|------|
| Vote | `Heart` | "Vote" | "7 left" in `text-muted` if votes remaining | `/games/your-wojak` |
| Battle | `Swords` | "Battle" | Red dot on icon if active battle | `/games/your-wojak/battles` |
| Burn | `Flame` | "Burn" | None | Opens burn flow |

**Disabled state:** If player not verified (no Phase 1 NFT), Battle and Burn show `opacity: 0.4`, `cursor: not-allowed`. Vote always available (only requires DID).

**Mobile:** Same row. Three buttons at ~33% width works down to 320px.

---

## 5. Collection Scroll

Horizontal scrollable row of your Wojak NFTs.

**Header row:** "Your Collection" (14px, medium, `text-secondary`) left-aligned + count `badge` ("12") right-aligned.

**Scroll container:**
- `overflow-x: auto`, `gap: 12px`
- `scroll-snap-type: x mandatory`
- Hide scrollbar: `-webkit-scrollbar: none`

**Each thumbnail:**
- 80x80px square image
- `border-radius: var(--radius-md)`
- `object-fit: cover`
- `scroll-snap-align: start`
- Below image: net vote count, 11px `text-muted`, centered (e.g. "+24")

**Tap → detail sheet (modal/bottom sheet):**
- Larger image (200px)
- Full name ("Your Wojak #42: Moon Boy")
- Stats: Likes / Dislikes / Net score
- Battle record (W/L) if any
- "Enter Battle" `btn btn-primary` if not queued
- "Burn" `btn btn-ghost` (destructive action, secondary placement)

**Sort order:** By net score descending (best-performing first).

**Empty state:** Single placeholder card (80x80, dashed border): "No Wojaks yet" text + `btn btn-primary` "Mint Your First" → `/generator`.

**Loading state:** 4 skeleton rectangles (80x80, pulsing animation) in a row.

---

## 6. Active Battle Card

Context-aware — different content based on battle state.

### State A: Active Battle

`card-static`, 16px padding.

**Header:** "Active Battle" (14px, medium, `text-secondary`) + time remaining `badge badge-cyan` ("2h 14m left").

**Body:** Two NFT thumbnails (60x60) side by side. Your NFT on the left. "VS" text (12px, `text-muted`) centered between them.

**Vote counts:** "142 vs 98" in 13px below thumbnails. Winning side gets subtle green tint, losing side subtle red tint. Neutral if tied.

**Action:** "View Battle" `btn btn-secondary` full-width at bottom → `/games/your-wojak/battles`.

**Multiple battles:** Show only the one ending soonest. Below: "+2 more active" in 12px `text-accent` → battles page.

### State B: Pending Challenge

Same layout but header: "You've Been Challenged!" in `text-accent` (orange).

Shows challenger's NFT vs your NFT.

Two buttons side by side: "Accept" `btn btn-primary` + "Decline" `btn btn-ghost`.

### State C: No Active Battle

`card-static`, 16px padding, centered content.

- `Swords` icon (24px, `text-muted`)
- "No active battles" (13px, `text-muted`)
- "Find a Battle" `btn btn-primary` → `/games/your-wojak/battles`

---

## 7. Onboarding Checklist

Shows when any milestone is incomplete. Returns `null` (auto-hides) when all 5 are done.

**Layout:** `card-static`, 16px padding.

**Header:** "Getting Started" (14px, medium weight) + "3/5" progress in `text-muted`.

**Milestones (in order):**

| # | Milestone | Label | Action Link |
|---|-----------|-------|------------|
| 1 | Connect DID | "Link your DID to play" | "Connect" |
| 2 | Own Phase 1 NFT | "Hold a Phase 1 Wojak" | "Get One" → marketplace |
| 3 | Mint a Wojak | "Create your first Wojak" | "Go to Generator" → `/generator` |
| 4 | Cast a Vote | "Vote on a Wojak" | "Vote Now" → `/games/your-wojak` |
| 5 | Win a Battle | "Enter and win a battle" | "Battle" → `/games/your-wojak/battles` |

**Each row:**
- Icon: `CheckCircle` (16px, green) if complete, `Circle` (16px, `text-muted`) if not
- Label: 13px
- Action link: right-aligned, `text-accent`, only on incomplete items

**Implementation note:** Upgrade existing `OnboardingChecklist.tsx` — add action links, refine styling, add progress count in header.

---

## 8. Loading & Error States

### Full Page Loading
Skeleton layout matching section structure:
- 40px tall banner skeleton (subtle pulse)
- 120px tall hero card skeleton
- 70px tall quick actions row skeleton (3 blocks)
- 80px tall collection row skeleton (4 square blocks)
- 100px tall battle card skeleton
- Use existing skeleton animation pattern from codebase

### Error State
Centered card with:
- `AlertCircle` icon (24px, `text-error`)
- "Couldn't load dashboard" (14px)
- "Retry" `btn btn-primary`

### Partial Failures
Individual sections can fail independently. Show inline retry for that section only — don't block the whole dashboard.

---

## 9. API Requirements

**Existing endpoints (no changes needed):**
- `GET /api/game/power-level?did=` — Power Level + breakdown
- `GET /api/game/leaderboard?limit=&offset=` — for rank lookup
- `GET /api/game/battle-list?status=active` — active battles
- `GET /api/game/feed?did=&limit=` — for collection data

**New endpoints needed:**
- `GET /api/game/activity?did=&limit=1` — latest activity event (reads `game_activity` table)
- `GET /api/game/collection?did=` — player's NFT collection with vote counts (reads `did_holdings` + `wojak_scores`)
- `GET /api/game/credits?did=` — credits balance (or add credits to power-level endpoint response)

**Alternatively:** The `power-level` endpoint could be extended to return rank, credits, and latest activity in one call to reduce round-trips. This is an implementation decision for the plan.

---

## 10. Navigation

**How users get here:**
- "Dashboard →" link in voting page right panel
- "Dashboard" link in mobile stats bar on voting page
- Direct URL: `/games/your-wojak/dashboard`
- Games Hub tile (if added)

**How users leave:**
- Quick action buttons (Vote, Battle, Burn)
- Collection NFT detail → Battle/Burn actions
- Event banner tap → relevant page
- Browser back → previous page
