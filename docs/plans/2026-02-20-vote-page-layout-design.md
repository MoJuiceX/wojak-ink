# Vote Page Layout — Design Doc

**Date:** 2026-02-20
**Status:** Approved

---

## Goal

The Wojak image on the Vote tab is too small (~420px wide despite a 480px cap) because two 220px side panels consume 440px of the 1000px container. The name/edition label below the card gets clipped. Fix by shrinking the side panels and uncapping the card — three targeted number changes, no behavior changes.

---

## Layout (Approach A — Shrink panels, uncap the card)

### Before
```
┌──────────────────────────────────────────────────┐  max 1000px
│  Leaderboard  │    Wojak card    │  Your Stats   │
│    220px      │  ~420px (capped) │    220px      │
└──────────────────────────────────────────────────┘
```

### After
```
┌──────────────────────────────────────────────────┐  max 1100px
│  Leaderboard  │      Wojak card      │ Your Stats│
│    160px      │    ~720px (free)     │   160px   │
└──────────────────────────────────────────────────┘
```

---

## Changes

### 1 — GameVoting.tsx

| Property | Current | New |
|----------|---------|-----|
| `grid-template-columns` | `220px 1fr 220px` | `160px 1fr 160px` |
| Outer container `max-width` | `1000px` | `1100px` |

### 2 — theme.css (.vote-card)

| Property | Current | New |
|----------|---------|-----|
| `max-width` | `480px` | *(removed)* |

Name/edition label clip is fixed automatically — `.vote-card-info` bar content is unchanged.

### 3 — VoteButtons.tsx

Replace the two 56px circle icon buttons with full-width pill buttons.

| Property | Current | New |
|----------|---------|-----|
| Button shape | 56px circle | Pill (`border-radius: 50px`) |
| Button width | Fixed 56px, centered, `gap: 40px` | `flex: 1` each |
| Button height | 56px | 52px |
| Pass style | Icon only | `btn btn-secondary` + 👎 icon + "Pass" label |
| Like style | Icon only | `btn btn-primary` + ❤️ icon + "Like" label |
| Container | `flex items-center gap-40` | `flex gap-3` (full width) |

---

## Responsive Behaviour

| Breakpoint | Side panels | Card | Buttons |
|-----------|-------------|------|---------|
| Desktop (>768px) | `160px` each | fills remaining ~720px | full-width pills |
| Mobile (≤768px) | MobileStatsBar — **unchanged** | full-width | full-width pills |

Mobile layout (MobileStatsBar replacing both panels) is untouched.

---

## CSS Rules

- No new CSS files
- No `!important`
- No inline color values — use `btn btn-primary` / `btn btn-secondary` from theme.css
- Swipe/drag gesture logic in SwipeCard is untouched
- Card stack (3-card depth effect with scale/opacity) is untouched

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/GameVoting.tsx` | Grid columns `160px 1fr 160px`, max-width `1100px` |
| `src/styles/theme.css` | Remove `max-width: 480px` from `.vote-card` |
| `src/components/game/VoteButtons.tsx` | Pill buttons replacing circle buttons |

---

## Out of Scope

- Swipe gesture behavior — no changes
- Card stack depth effect — no changes
- MobileStatsBar — no changes
- Side panel content (MiniLeaderboard, VotingStatsPanel) — no changes
- Any other FightClub tab
