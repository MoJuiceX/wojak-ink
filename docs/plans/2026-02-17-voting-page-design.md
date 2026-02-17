# Your Wojak — Voting Page Design

**Route:** `/games/your-wojak`
**Purpose:** Tinder-style card swiping to vote on community Wojaks. The heartbeat of the entire game — every other system depends on this data.

---

## 1. Page Layout

### Desktop (≥768px) — 3-Column

```
┌──────────────────────────────────────────────────┐
│                  Header (64px)                    │
├──────────┬────────────────────────┬───────────────┤
│          │                        │               │
│ LEADER-  │     SWIPE CARD         │  YOUR STATS   │
│ BOARD    │     (380px max)        │  (220px)      │
│ (220px)  │                        │               │
│          │  ┌────────────────┐    │  ⚡ 2,450      │
│ 1  8,200 │  │                │    │  Serious      │
│ 2  7,100 │  │    WOJAK       │    │               │
│ 3  6,800 │  │    IMAGE       │    │  ███████░░░   │
│ ...      │  │                │    │  7/10 votes   │
│ 10 3,200 │  └────────────────┘    │               │
│ ──────── │  Name         #42      │  ───────────  │
│ You: #47 │                        │  Onboarding   │
│          │     ✕         ♥        │  (if needed)  │
├──────────┴────────────────────────┴───────────────┤
│                  Footer/Nav                       │
└──────────────────────────────────────────────────┘
```

- **Max content width: 1000px** (tight framing around the card, not 1400px)
- **Grid:** `220px 1fr 220px` with 20px gap
- **Side panels:** `card-static`, padding 16px, sticky at `top: 80px`
- **Center column:** card centered with `margin: 0 auto`

### Mobile (<768px) — Single Column

```
┌─────────────────────────┐
│  Header (56px)          │
├─────────────────────────┤
│  ⚡ 2,450 │ 🗳️ 7/10    │  ← Compact bar (44px, 2 segments)
├─────────────────────────┤
│                         │
│  ┌───────────────────┐  │
│  │                   │  │
│  │     WOJAK         │  │
│  │     IMAGE         │  │
│  │                   │  │
│  └───────────────────┘  │
│  Name            #42    │
│                         │
│      ✕           ♥      │
│                         │
│  Swipe → like           │  ← Hides after 3 votes
├─────────────────────────┤
│  Mobile Nav (60px)      │
└─────────────────────────┘
```

- Card width: `calc(100vw - 32px)` (16px padding each side)
- No leaderboard on mobile (accessible from `/leaderboard`)
- No onboarding checklist on mobile (accessible from dashboard)

---

## 2. Compact Stats Bar (Mobile)

Replaces side panels on mobile. Only 2 segments (not 3 — rank is secondary).

```
┌──────────────┬──────────────┐
│  ⚡ 2,450     │  🗳️ 7/10    │
│  Serious     │  votes left  │
└──────────────┴──────────────┘
```

- **Height:** 44px
- **Background:** `var(--color-surface)`
- **Border-bottom:** 1px `var(--color-border)`
- **2 equal segments** divided by 1px vertical border
- **Numbers:** 16px bold. Power Level uses tier color.
- **Labels:** 11px `text-muted`
- **Tap either segment** → navigates to `/games/your-wojak/dashboard`

---

## 3. The Swipe Card

The hero element. Centered, dominant, clean.

### Dimensions
- **Desktop:** 380px max-width
- **Mobile:** `calc(100vw - 32px)`
- **Border radius:** `var(--radius-lg)` (14px) — consistent with all other cards
- **Background:** `var(--color-surface)`
- **Border:** 1px solid `var(--color-border)`
- **Shadow:** `var(--shadow-card)`

### Structure
```
┌────────────────────────────────┐
│                                │
│                                │
│        WOJAK IMAGE             │  ← 1:1 square, object-fit: cover
│        (full bleed within      │     Image bleeds to card edges (no padding)
│         card, no inner padding)│     Rounded top corners match card radius
│                                │
│                                │
├────────────────────────────────┤
│  Your Wojak #42: Moon Boy  #42 │  ← Info bar: 48px height
│  name (16px semibold)   muted  │     Name left, edition right
└────────────────────────────────┘
```

- **Image:** No padding inside the card — image fills edge-to-edge within the card border. Top corners rounded to match card. Bottom is cut off by the info bar.
- **Info bar:** 48px, padding 16px horizontal. Name left-aligned (16px, semibold, white). Edition right-aligned (14px, `text-muted`).
- **Image loading:** Dominant color placeholder (extracted from image, or `var(--color-surface)`) with pulsing opacity animation. Fades to real image over 200ms when loaded.

### Drag Behavior
- `drag="x"` with `dragElastic={0.7}` and `dragDirectionLock` (prevents scroll conflicts)
- **Rotation:** x [-200, 200] → rotate [-12°, 12°] (reduced from ±15° for subtlety)
- **Swipe threshold:** 100px offset
- **Shadow lift:** As |x| increases, shadow grows slightly (card lifting off the stack)

### Drag Feedback (What Users See While Dragging)

**No text stamps.** No "LIKE" / "NOPE" overlays. Instead:

- **Border glow:** Dragging right → green glow on right edge intensifies. Dragging left → red glow on left edge intensifies. Mapped from x [0, 100] → glow opacity [0, 0.5].
- **Background tint:** Subtle color wash over the image. Green at 12% opacity (right), red at 12% opacity (left).
- **Icon reveal:** A ✓ icon (right drag) or ✕ icon (left drag) fades in at center of image, 48px, white with drop shadow. Opacity mapped from x [50, 100] → [0, 1]. Only appears past half-threshold.
- **Color-blind safe:** The ✓ and ✕ icons ensure feedback is not color-dependent.

### Release Behavior
- **Past threshold (≥100px):** Card animates to x=±500, opacity→0, rotation continues in swipe direction. Duration: 200ms, ease-out. Vote API fires immediately (don't wait for response).
- **Before threshold (<100px):** Spring snap-back using `snappy` preset (stiffness 400, damping 25).

### Parallax (Desktop Only)
- On hover, image shifts 2-3px opposite to mouse position (subtle depth)
- On drag start, image scales to 1.02 ("picking up" feel)
- Only on `@media (hover: hover)` — no effect on touch devices

---

## 4. Card Stack

Three cards rendered for smooth transitions and network buffering:

```
┌────────┐ ← Current card (z-index 3, interactive)
│  CARD  │
└────────┘
  ┌──────┐ ← Next card (z-index 2, scale 0.95, y +8px, opacity 0.7)
  │      │    aria-hidden="true"
  └──────┘
   ┌────┐  ← Preloaded card (z-index 1, scale 0.90, y +16px, opacity 0.4)
   │    │    aria-hidden="true", images prefetched
   └────┘
```

- **Current card:** Full size, interactive, drag enabled
- **Next card:** scale 0.95, translateY +8px, opacity 0.7. Non-interactive, `aria-hidden="true"`, `pointer-events: none`
- **Preloaded card:** scale 0.90, translateY +16px, opacity 0.4. Non-interactive, `aria-hidden="true"`, `pointer-events: none`

**On swipe:**
1. Current card exits (200ms)
2. Next card springs to full position using `defaultSpring` (stiffness 200, damping 20)
3. Preloaded card springs to next position
4. New card fetched and placed in preloaded slot
5. Next 2 images prefetched via `new Image().src = url`

**First card wiggle (replaces welcome overlay):**
- On first-ever visit (localStorage check), the first card does a subtle horizontal wiggle: translateX [0, 20, -20, 10, -10, 0] over 800ms with `ease-in-out`
- Communicates "this is swipeable" without blocking the screen
- Combined with instruction text below buttons

---

## 5. Vote Buttons

Two circular buttons below the card. Secondary to swiping, but always available.

```
       ✕              ♥
   (dislike)       (like)
```

### Button Spec
- **Size:** 56px diameter (desktop), 64px diameter (mobile)
- **Gap:** 40px between buttons (consistent across breakpoints)
- **Icons:** Custom SVG, 2px stroke, 24px size
  - Like: Heart or flame icon, `var(--color-success)` stroke
  - Dislike: X/cross icon, `var(--color-error)` stroke
- **Border:** 2px solid (green for like, red for dislike)
- **Background:** transparent
- **Hover (desktop):** `scale: 1.1`, background fills with color at 10% opacity. `@media (hover: hover)` only.
- **Tap:** `scale: 0.85` (deep press). Brief color glow pulse (150ms): green glow for like, red glow for dislike.

### Undo Button
Small circular button between the two vote buttons, slightly above:

```
          ↩
       (undo)
    ✕          ♥
```

- **Size:** 36px diameter
- **Icon:** Undo/rewind arrow, `var(--color-text-muted)` stroke
- **Opacity:** 0.5 normally, 1.0 when an undo is available
- **Behavior:** Reverts the most recent vote. Card animates back from off-screen. Limit: **1 undo per session** (prevents gaming). After use, button grays out permanently for the session.
- **Disabled state:** `opacity: 0.2, pointer-events: none` when no undo available or already used.

### Keyboard Shortcuts (Desktop)
- **→ Right arrow:** Like
- **← Left arrow:** Dislike
- **Z key:** Undo
- Hint text on desktop (below buttons, first session only): `or use ← → arrow keys`

---

## 6. Instruction Text

Below the buttons:

```
Swipe right to like · Swipe left to dislike
```

- **Style:** 13px, `text-muted`, centered
- **Visibility:** Shows on first 3 votes, then fades out (opacity transition 500ms)
- **Storage:** `localStorage.getItem('wojak_vote_instructions_seen')` read once on mount, written via `requestIdleCallback` (not during swipe animation)

---

## 7. Left Panel — Mini Leaderboard (Desktop Only)

```
┌──────────────────┐
│ ⚡ POWER LEVEL    │  ← 12px uppercase, text-muted, letter-spacing 1px
├──────────────────┤
│                  │
│ 1  🔥  8,200     │  ← Row: rank (14px muted) · tier emoji · score (16px bold)
│    WojakKing     │     Name below (13px text-secondary, truncated)
│                  │
│ 2  ⚡  7,100     │
│    MoonChad      │
│                  │
│ ...              │
│                  │
│ 10    3,200      │
│    Anon42        │
│                  │
├──────────────────┤
│                  │
│ You  #47         │  ← Orange accent, always pinned at bottom
│      2,450       │     Separated by 1px border
│                  │
├──────────────────┤
│ View Full →      │  ← 12px, text-muted, hover turns orange
└──────────────────┘
```

- **Container:** `card-static`, padding 16px
- **Row spacing:** 8px gap between rows
- **Tier emojis** (top 3 only): 🔥 legend (≥9000), ⚡ top tier (≥5000), rest no emoji
- **Names:** 13px `text-secondary`, truncated with ellipsis
- **Scores:** 16px bold, white
- **"You" row:** Name in `var(--color-primary)`, always visible regardless of rank
- **"View Full →":** Links to `/leaderboard`

---

## 8. Right Panel — Your Stats (Desktop Only)

```
┌──────────────────┐
│ YOUR GAME        │  ← 12px uppercase, text-muted
├──────────────────┤
│                  │
│   ⚡ 2,450       │  ← 24px bold, centered
│   Serious        │     Tier label (14px, tier color)
│   Rank #47       │     Rank (13px, text-muted)
│                  │
├──────────────────┤
│                  │
│   Votes Today    │  ← Section label (12px, text-muted)
│                  │
│   ███████░░░     │  ← Progress bar
│   7/10 remaining │     (13px, text-secondary)
│                  │
├──────────────────┤  ← Only if onboarding incomplete:
│                  │
│   Getting Started│
│   ✅ DID         │
│   ✅ Phase 1 NFT │
│   ☐ First mint   │
│   ☐ First vote   │
│                  │
│   3/5 complete   │
│                  │
├──────────────────┤
│ Dashboard →      │
└──────────────────┘
```

- **Container:** `card-static`, padding 16px
- **Power Level:** Centered, large number uses `power-level-badge` tier styling
- **Progress bar:** 6px height, `var(--radius-full)` rounded. Filled: `var(--color-primary)`. Empty: `rgba(255,255,255,0.08)`.
- **Onboarding:** Auto-hides when all milestones complete
- **"Dashboard →":** Links to `/games/your-wojak/dashboard`

---

## 9. Gate States

Instead of 5 separate dead-end screens, use a **single progressive checklist card** that replaces the swipe card area. The checklist shows all remaining requirements and lets users complete steps in order.

```
┌────────────────────────────────┐
│                                │
│         🗳️                     │
│                                │
│   Your Wojak                   │  ← 22px bold
│   Complete these steps to      │  ← 14px, text-secondary
│   start voting.                │
│                                │
│   ✅ Connect wallet            │  ← Completed steps grayed
│   ☐ Create a DID               │  ← Current step highlighted
│      Set up a DID in Sage      │     with description + action
│      ┌────────────────────┐    │
│      │  Learn How →       │    │     ← btn btn-ghost, inline
│      └────────────────────┘    │
│   ○ Get a Wojak Farmers Plot   │  ← Future steps dimmed
│   ○ Start voting               │
│                                │
└────────────────────────────────┘
```

**States per step:**
- ✅ **Completed:** Green checkmark, text grayed, no action needed
- ☐ **Current:** White checkbox, description visible, action button shown
- ○ **Future:** Muted circle, text muted, no description

**Steps in order:**
1. Connect wallet (can be done inline via existing wallet connect button)
2. Create a DID (links to Sage docs or settings)
3. Get a Wojak Farmers Plot NFT (links to MintGarden collection)
4. Start voting (auto-completes when above 3 are done → transitions to feed)

**Auto-progression:** When a step completes (e.g., wallet connects), the checklist animates: checkmark appears, next step expands with its description. When all steps complete, the checklist card transitions (fade + scale down) to reveal the first swipe card underneath.

**Same container as swipe card:** Same width, same position, `card-static` styling. Feels like a natural precursor, not a separate screen.

---

## 10. Post-Round Summary

When the user casts their 10th vote, instead of showing the "All Votes Cast" empty state immediately, show a brief summary of their session:

```
┌────────────────────────────────┐
│                                │
│   🗳️ Session Complete          │  ← 20px bold
│                                │
│   You voted on 10 Wojaks       │  ← 14px, text-secondary
│                                │
│   ♥ 7 liked  ·  ✕ 3 disliked  │  ← 16px, green/red accents
│                                │
│   ──────────────────────────   │
│                                │
│   ⚡ Power Level: 2,480 (+30)  │  ← Updated score, delta shown
│                                │
│   Come back tomorrow for       │
│   10 more votes.               │
│                                │
│   ┌──────────────────────┐     │
│   │  View Leaderboard     │     │  ← btn btn-primary
│   └──────────────────────┘     │
│   ┌──────────────────────┐     │
│   │  Go to Dashboard      │     │  ← btn btn-secondary
│   └──────────────────────┘     │
│                                │
└────────────────────────────────┘
```

- Same card container size/position
- Like/dislike counts with corresponding icon colors
- Power Level delta: shows how much their Power Level changed this session (may be 0 if they don't hold any of the voted NFTs — that's fine, still shows the number)
- Two CTAs: leaderboard (primary) and dashboard (secondary)
- Animates in after the last card exits, using `defaultSpring`

---

## 11. Loading, Error & Empty States

### Loading (feed fetching)
A skeleton card in the same position/size as the swipe card:

```
┌────────────────────────────────┐
│                                │
│   ┌────────────────────────┐   │
│   │ ░░░░░░░░░░░░░░░░░░░░░ │   │  ← Pulsing gradient
│   │ ░░░░░░░░░░░░░░░░░░░░░ │   │     (#1a1a24 → #24242e → #1a1a24)
│   │ ░░░░░░░░░░░░░░░░░░░░░ │   │     1.5s infinite ease-in-out
│   │ ░░░░░░░░░░░░░░░░░░░░░ │   │
│   └────────────────────────┘   │
│   ░░░░░░░░░░░░░░       ░░░░   │  ← Name + edition skeleton
└────────────────────────────────┘
```

- Pulsing opacity on skeleton blocks (0.3 → 0.6 → 0.3, 1.5s loop)
- Same card dimensions as swipe card
- Shows during initial feed fetch and when feed runs out and more are loading

### Error (API failure)
```
┌────────────────────────────────┐
│                                │
│         ⚠️                      │
│                                │
│   Something went wrong         │  ← 18px semibold
│                                │
│   Couldn't load the next       │  ← 14px, text-secondary
│   Wojak. Check your            │
│   connection and try again.    │
│                                │
│   ┌──────────────────────┐     │
│   │  Try Again            │     │  ← btn btn-primary
│   └──────────────────────┘     │
│                                │
└────────────────────────────────┘
```

### Feed Empty (all voted)
```
│         ✨                      │
│   All Caught Up!               │
│   You've seen every available  │
│   Wojak. Check back after      │
│   new mints drop!              │
│                                │
│   Mint a Wojak →               │  ← link to /generator
```

All empty/error states use the same card container. Same width, same position.

---

## 12. Animations

### Timing Reference
| Animation | Duration | Easing | Spring Config |
|-----------|----------|--------|---------------|
| Card snap-back | — | spring | stiffness 400, damping 25 (`snappy`) |
| Card exit | 200ms | ease-out | — |
| Next card entrance | — | spring | stiffness 200, damping 20 (`defaultSpring`) |
| Button tap scale | 150ms | ease-out | — |
| Button glow pulse | 150ms | ease-out | — |
| Counter update | 150ms | ease-out | — |
| Skeleton pulse | 1500ms | ease-in-out | infinite loop |
| Instruction fade | 500ms | ease-out | — |
| First card wiggle | 800ms | ease-in-out | — |
| Gate checklist step transition | 300ms | ease-out | — |
| Post-round summary entrance | — | spring | stiffness 200, damping 20 |

### Counter Update Animation
Vote counter (7/10 → 6/10): number does a subtle scale bounce (1 → 1.08 → 1, 150ms) with a brief orange color flash. Progress bar segment deactivates with opacity transition (200ms).

### `prefers-reduced-motion`
When user prefers reduced motion:
- Cards fade in/out instead of flying (200ms opacity transition)
- No rotation during drag
- No parallax on hover
- No card wiggle on first visit
- Counter changes without bounce (instant update)
- Skeleton uses opacity fade instead of pulsing gradient

---

## 13. Accessibility

### ARIA
- Card container: `role="application"`, `aria-label="Vote on Wojak NFTs. Swipe right to like, left to dislike."`
- Like button: `aria-label="Like this Wojak"`
- Dislike button: `aria-label="Dislike this Wojak"`
- Undo button: `aria-label="Undo last vote"`
- Next/preloaded cards: `aria-hidden="true"`
- Current card image: `alt="Your Wojak #42: Moon Boy"` (use full NFT name)

### Color Independence
- Like feedback: green border glow + ✓ icon (not just green)
- Dislike feedback: red border glow + ✕ icon (not just red)
- Progress bar: text label ("7/10") alongside visual bar

### Keyboard
- `→` Right arrow: Like
- `←` Left arrow: Dislike
- `Z`: Undo
- `Tab`: Navigate between buttons
- Hint on desktop: "or use ← → arrow keys" (first session only, 12px text-muted)

---

## 14. Milestone Toasts

When an onboarding milestone completes (first vote, first mint, etc.):

```
┌────────────────────────────────────────┐
│  🎯 First Vote!           +2 credits  │
└────────────────────────────────────────┘
```

- Slides down from top of viewport, 300ms ease-out
- Stays 3 seconds
- Slides back up, 200ms ease-in
- **Background:** `var(--color-surface)` with gradient left edge (orange → transparent)
- **Border:** 1px `var(--color-border)`, radius `var(--radius-lg)`
- **Shadow:** `var(--shadow-card)`
- **Text:** Milestone name left (14px semibold), credit amount right (`var(--color-primary)`, 14px bold)
- Does not interrupt voting flow — appears above the card area
- Max 1 toast at a time (queue if multiple milestones trigger simultaneously)

---

## 15. Performance

### Image Preloading
- On feed load: prefetch images for next 3 cards via `new Image().src = url`
- On each swipe: prefetch the new 3rd-in-line image
- Use IPFS gateway URL from feed response

### Card Rendering
- Only 3 cards in DOM at any time
- `will-change: transform` on the active card (remove when not dragging)
- Background tint and glow use CSS transitions (not per-frame JS)
- `requestAnimationFrame` for drag-related visual updates

### State Management
- `localStorage` read once on component mount, stored in React state
- Writes to `localStorage` via `requestIdleCallback`
- Vote API calls fire-and-forget on swipe (optimistic — UI doesn't wait for response)
- Feed auto-refills when ≤2 cards remain in the local buffer

---

## Summary of Key Decisions

| Element | Decision |
|---------|----------|
| Route | `/games/your-wojak` — dedicated full page |
| Desktop | 3-column, 1000px max width |
| Mobile | 2-segment stats bar + full-width card |
| Card content | Image + name + edition. Art speaks for itself. |
| Interaction | Tinder drag + fallback tap buttons + keyboard arrows |
| Feedback | Instant, blind. Border glow + ✓/✕ icons during drag. No score reveal. |
| Buttons | Custom SVG icons (heart/flame + X), not emoji |
| Undo | 1 per session, small button above vote buttons |
| Card stack | 3 cards (current + next + preloaded) |
| Gate flow | Single progressive checklist card, not 5 separate screens |
| Post-round | Summary screen after 10/10 with like/dislike counts + Power Level delta |
| Welcome | First-card wiggle + instruction text (no overlay) |
| Loading | Skeleton card with pulsing gradient |
| Error | Same-size card with retry button |
| Animations | Reduced motion support. Springs for card physics, ease-out for UI transitions. |
| Accessibility | ARIA labels, color-blind icons, keyboard nav, reduced motion |
| Sound | None. Haptics only (mobile, feature-detected). |
