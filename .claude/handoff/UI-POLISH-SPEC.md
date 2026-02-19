# UI Polish — Mobile & Desktop Experience

---

## Overview

Comprehensive UI polish pass across all pages. Focus: mobile experience, Fight Club tabs, navigation consolidation, loading states, and visual consistency.

The codebase already has excellent responsive foundations (5 breakpoints, safe-area handling, touch targets, scroll hiding). This spec targets specific gaps and improvements.

---

## Task 1: Fix Mobile Navigation — Add Fight Club to Bottom Nav

**File:** `src/config/routes.ts`

**Problem:** Fight Club is in the sidebar (desktop) and MoreMenu (mobile slide-up), but NOT in the mobile bottom nav. It's the app's main feature and users have to tap "More" to find it. The bottom nav currently shows: Gallery, Generator, BigPulp, Games, More.

**Fix:** Replace BigPulp in the mobile bottom nav with Fight Club. BigPulp moves to the More menu.

Change `MOBILE_NAV_ITEMS`:
```typescript
export const MOBILE_NAV_ITEMS: NavItem[] = [
  PRIMARY_NAV_ITEMS[0], // Gallery
  PRIMARY_NAV_ITEMS[2], // Generator
  PRIMARY_NAV_ITEMS[3], // Fight Club (center - featured)
  PRIMARY_NAV_ITEMS[4], // Games
  MORE_NAV_ITEM,
];
```

Also update the Fight Club nav item to be `featured: true` so it gets the center FAB-style treatment (glowing icon, slightly larger).

Remove the `featured: true` from BigPulp's entry in PRIMARY_NAV_ITEMS.

**File:** `src/components/navigation/MoreMenu.tsx`

Add BigPulp as the first item in the MoreMenu (before Fight Club, or after it — put it second):
```typescript
{
  icon: Lightbulb,
  label: 'BigPulp',
  description: 'AI-powered Wojak assistant',
  route: '/bigpulp',
  badge: 'AI',
  iconColor: '#f59e0b',
  iconBg: 'rgba(245, 158, 11, 0.15)',
},
```

Import `Lightbulb` from lucide-react.

---

## Task 2: Fight Club Tab Bar — Mobile Polish

**File:** `src/styles/theme.css`

The `.fight-club-tabs` and `.fight-club-tab` classes exist but need mobile refinements.

Add responsive styles:

```css
/* Mobile: full-width tabs with tighter padding */
@media (max-width: 640px) {
  .fight-club-tabs {
    gap: var(--space-1);
    padding: 3px;
    border-radius: var(--radius-md);
  }

  .fight-club-tab {
    padding: var(--space-2) var(--space-3);
    font-size: 13px;
    border-radius: calc(var(--radius-md) - 2px);
  }
}
```

Also add a subtle transition for tab switching:

```css
.fight-club-tab {
  position: relative;
  /* existing styles... */
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    transform 0.1s ease;
}

.fight-club-tab:active {
  transform: scale(0.97);
}
```

---

## Task 3: Rankings Podium — Mobile Layout Fix

**File:** `src/styles/theme.css`

The rankings podium (top 3 players) shows side-by-side but can look cramped on narrow screens.

Add responsive podium styles:

```css
@media (max-width: 480px) {
  .rankings-podium {
    gap: var(--space-2);
    padding: var(--space-3) var(--space-2);
  }

  .podium-entry {
    padding: var(--space-2);
    min-width: 0; /* prevent overflow */
  }

  .podium-name {
    font-size: 12px;
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .podium-power {
    font-size: 13px;
  }

  .podium-avatar {
    width: 36px;
    height: 36px;
  }
}

/* Wojak rankings row - prevent overflow on mobile */
@media (max-width: 640px) {
  .wojak-row {
    flex-wrap: nowrap;
    gap: var(--space-2);
  }

  .wojak-row-image img {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-sm);
  }

  .wojak-row-info {
    min-width: 0;
    flex: 1;
  }

  .wojak-row-power {
    flex-shrink: 0;
    text-align: right;
  }

  .power-breakdown {
    display: none; /* Hide vote/battle split on very small screens */
  }
}
```

---

## Task 4: CombatArena Inline Styles → Theme Classes

**File:** `src/pages/CombatArena.tsx`

The CombatArena page uses several inline styles that should use theme classes or CSS variables for consistency:

1. Line 131: `style={{ color: 'var(--color-primary)' }}` on the Swords icon → add `className="text-primary"` and remove the style.

2. Line 134: `style={{ maxWidth: 480 }}` → use Tailwind: `max-w-lg` (which is 512px, close enough).

3. Line 154: `style={{ background: 'rgba(255, 107, 0, 0.1)' }}` → use `style={{ background: 'var(--color-primary-10)' }}`.

4. Line 162: `style={{ color: 'var(--color-text-muted)' }}` → use `className="text-muted"`.

---

## Task 5: Loading State Consistency

Several pages use different loading patterns. Standardize to skeleton loaders.

**File:** `src/pages/CombatArena.tsx`

Replace line 174's text-based loading:
```tsx
{isConnected && isLoadingFighters && (
  <div className="text-muted text-sm text-center py-4">Loading fighters...</div>
)}
```

With a skeleton card:
```tsx
{isConnected && isLoadingFighters && (
  <div className="w-full flex flex-col gap-3">
    <div className="card-static p-4 flex flex-col gap-3 animate-pulse">
      <div className="h-4 w-32 rounded" style={{ background: 'var(--color-white-8)' }} />
      <div className="h-10 w-full rounded" style={{ background: 'var(--color-white-5)' }} />
      <div className="h-10 w-full rounded" style={{ background: 'var(--color-white-5)' }} />
    </div>
  </div>
)}
```

**File:** `src/components/combat/FightClubRankings.tsx`

Replace the spinner-based loading in `PlayersTab` and `WojaksTab`:
```tsx
<div className="rankings-loading">
  <div className="spinner" />
  <span>Loading rankings...</span>
</div>
```

With skeleton rows:
```tsx
<div className="rankings-content">
  <div className="flex flex-col gap-2">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="card-static p-3 flex items-center gap-3 animate-pulse">
        <div className="w-8 h-8 rounded-full" style={{ background: 'var(--color-white-8)' }} />
        <div className="flex-1 flex flex-col gap-1">
          <div className="h-3 w-24 rounded" style={{ background: 'var(--color-white-8)' }} />
          <div className="h-2 w-16 rounded" style={{ background: 'var(--color-white-5)' }} />
        </div>
        <div className="h-4 w-12 rounded" style={{ background: 'var(--color-white-8)' }} />
      </div>
    ))}
  </div>
</div>
```

---

## Task 6: Fight Club Access Gate — Mobile Polish

**File:** `src/pages/FightClub.tsx`

The `ConnectWalletPrompt` and `FightClubGate` components use inline styles for layout. Convert to Tailwind + theme classes:

**ConnectWalletPrompt:** Replace the outer div's inline style:
```tsx
// FROM:
<div style={{ padding: contentPadding, display: 'flex', flexDirection: 'column', ... }}>

// TO:
<div className="flex flex-col items-center justify-center text-center" style={{ padding: contentPadding, minHeight: '60vh' }}>
```

**FightClubGate:** Same treatment. Also add a subtle animation to the feature cards:
```tsx
import { motion } from 'framer-motion';

// Wrap each feature preview card:
<motion.div
  className="flex items-center gap-3 p-3 rounded-lg"
  style={{ background: 'var(--color-white-5)' }}
  initial={{ opacity: 0, x: -10 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ delay: idx * 0.1 }}
>
```

Where `idx` is the index of each feature (0, 1, 2).

---

## Task 7: MintFighterBanner — Responsive

**File:** `src/pages/FightClub.tsx`

The `MintFighterBanner` uses a horizontal layout that may look cramped on very small phones.

Add a stack-on-mobile pattern:
```tsx
<div
  className="card flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-4 mb-4"
  style={{
    borderColor: 'var(--color-primary)',
    borderWidth: 1,
    borderStyle: 'solid',
  }}
>
  <div className="flex items-center gap-3 w-full sm:w-auto">
    <div
      className="flex items-center justify-center shrink-0"
      style={{
        width: 48,
        height: 48,
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-primary-15)',
      }}
    >
      <Palette size={24} className="text-primary" />
    </div>
    <div className="flex-1 sm:flex-initial">
      <p className="font-bold" style={{ fontSize: 15 }}>Mint your first fighter!</p>
      <p className="text-secondary" style={{ fontSize: 13 }}>
        Create a Wojak in the Generator to enter the arena.
      </p>
    </div>
  </div>
  <Link to="/generator" className="btn btn-primary w-full sm:w-auto shrink-0">
    Generator
  </Link>
</div>
```

---

## Task 8: QueuePanel Empty State — Bigger CTA

**File:** `src/components/combat/QueuePanel.tsx`

The empty state (no fighters) is functional but could be more visually prominent:

Replace the current empty state (lines 50-63) with:
```tsx
if (fighters.length === 0) {
  return (
    <div className="card-static p-8 flex flex-col items-center gap-4 text-center">
      <div
        className="p-4 rounded-full"
        style={{ background: 'var(--color-primary-15)' }}
      >
        <Swords size={32} className="text-primary" />
      </div>
      <div>
        <p className="font-bold text-lg">No fighters ready</p>
        <p className="text-secondary text-sm mt-1">
          Mint a Wojak in the Generator to start battling.
        </p>
      </div>
      <Link to="/generator" className="btn btn-primary">
        Create a Fighter
      </Link>
    </div>
  );
}
```

Import `Swords` from lucide-react (already imported in CombatArena).

---

## Task 9: Voting Page — Mobile Full-Height

**File:** `src/pages/GameVoting.tsx`

The mobile voting page already works well, but the `VotingPageMobile` can be improved:

1. Add bottom padding to account for the mobile nav bar:
```tsx
function VotingPageMobile() {
  return (
    <div className="flex flex-col" style={{ minHeight: '100dvh' }}>
      <MobileStatsBar />
      <div className="flex flex-col items-center p-4 gap-4" style={{ flex: 1, paddingBottom: 80 }}>
        <VotingFeed />
      </div>
    </div>
  );
}
```

The `paddingBottom: 80` ensures the card and swipe buttons aren't hidden behind the bottom nav.

---

## Task 10: GamesHub — Play/Scores Tab Toggle on Mobile

**File:** `src/pages/GamesHub.tsx` (on main — already has Play/Scores tabs)

Verify the Play/Scores tab toggle works on mobile. If the tabs are full-width on desktop, ensure they're compact on mobile. Add to theme.css if needed:

```css
/* Games Hub Play/Scores toggle */
.games-tab-toggle {
  display: flex;
  gap: var(--space-1);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: 3px;
  border: 1px solid var(--color-border);
}

.games-tab-toggle button {
  flex: 1;
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  border-radius: calc(var(--radius-md) - 2px);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.games-tab-toggle button:hover {
  color: var(--color-text);
}

.games-tab-toggle button.active {
  color: var(--color-text);
  background: var(--color-primary);
  color: var(--color-text-inverse);
}
```

Check if GamesHub already has a tab toggle styled — if so, make sure it uses these theme classes. If the Play/Scores toggle already uses `fight-club-tabs` style classes, that's fine too.

---

## Task 11: Remove Old Standalone Routes

**File:** `src/App.tsx`

Check if old routes still exist and redirect them:

1. `/swipe` → redirect to `/fight-club/vote`
2. `/arena` → redirect to `/fight-club/battle`
3. `/leaderboard` → redirect to `/games` (Scores tab)

Use React Router's `Navigate`:
```tsx
import { Navigate } from 'react-router-dom';

// In route definitions:
<Route path="/swipe" element={<Navigate to="/fight-club/vote" replace />} />
<Route path="/swipe/*" element={<Navigate to="/fight-club/vote" replace />} />
<Route path="/arena" element={<Navigate to="/fight-club/battle" replace />} />
<Route path="/arena/*" element={<Navigate to="/fight-club/battle" replace />} />
<Route path="/leaderboard" element={<Navigate to="/games" replace />} />
```

Only add these redirects — do NOT delete the actual page files yet (they're lazy-loaded by FightClub.tsx).

---

## Task 12: Sidebar — Clean Up Old Items

**File:** `src/config/routes.ts`

The sidebar (`PRIMARY_NAV_ITEMS`) should NOT have separate entries for `swipe`, `arena`, or `leaderboard` since they're now inside Fight Club. Check if they still exist and remove them.

Current `PRIMARY_NAV_ITEMS` on main already has `fight-club` and removed `swipe`/`arena`/`leaderboard` — verify this is the case. If any old entries remain, remove them.

---

## Task 13: MoreMenu — Remove Old Entries

**File:** `src/components/navigation/MoreMenu.tsx`

Verify the MoreMenu doesn't still have entries for Arena, Swipe, or Leaderboard as separate items. Currently it has Fight Club which is correct. Just double-check no stale entries.

---

## Task 14: Generator Mobile — Better Panel Visibility

**File:** `src/pages/Generator.tsx` (or `src/pages/Generator.css`)

On mobile, the Generator shows: ActionBar → Preview → LayerTabs → TraitSelector. The trait selector takes up the bottom half of the screen.

Improvement: Add a sticky mini-preview that appears when the user scrolls down into the trait grid, so they can always see their Wojak while picking traits.

Check if `StickyMiniPreview` component already exists (it's imported but only used conditionally). Ensure it appears on mobile when scrolled past the main preview.

If `StickyMiniPreview` is already working, skip this task.

---

## Rules
- Run `npm run build` after each task
- Commit and `git push origin main` after each task
- No `!important` — all visual changes in theme.css
- Tailwind for layout only
- Use existing theme classes (`.card`, `.btn`, `.badge`, etc.)
- Test mobile layouts at 375px (iPhone SE) and 390px (iPhone 14)
- Preserve all existing functionality — these are polish changes, not rewrites
