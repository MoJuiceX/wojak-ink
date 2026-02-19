# Fight Club UX Redesign

## Overview

Redesign Fight Club to prioritize voting as the primary entry point. Remove friction by eliminating the hero banner, reordering tabs to lead with the open (ungated) feature, and converting the Guide to a modal overlay.

## Goals

1. Make Vote the default tab - everyone can participate immediately
2. Remove hero section to maximize content space
3. Simplify navigation with minimal title bar
4. Add Guide modal with proper close functionality

## Design

### Page Layout

```
┌─────────────────────────────────────────────────────┐
│  ⚔️ Fight Club                      [Guide] [↻]    │  ← Minimal title bar (~48px)
├─────────────────────────────────────────────────────┤
│  [Vote]  [Battle]  [Rankings]  [Burn]              │  ← Tab bar
├─────────────────────────────────────────────────────┤
│                                                     │
│              Tab content area                       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Title Bar

- Left: Swords icon + "Fight Club" text
- Right: Guide button (opens modal) + Refresh button (existing)
- Height: ~48px, single row

### Tab Order

Changed from: Battle → Vote → Rankings → Burn
Changed to: **Vote → Battle → Rankings → Burn**

Rationale: Vote is open to everyone without wallet connection or NFT ownership. Lead with the lowest-friction feature.

### Default Route

- `/fight-club` now defaults to Vote tab (was Battle)
- `getActiveTab()` returns 'vote' for base path

### Guide Modal

Instead of navigating to separate `/fight-club/guide` page:

- Clicking "Guide" button opens modal overlay
- Modal contains existing HowItWorks content (collapsible sections)
- Close via: X button, backdrop click, Escape key
- `/fight-club/guide` route redirects to `/fight-club`

### Gating (unchanged)

- Vote & Rankings: Open to everyone
- Battle & Burn: Require Farmers Plot NFT

## Files to Modify

1. `src/pages/FightClub.tsx` - Remove hero, reorder tabs, add modal state
2. `src/components/combat/FightClubGuideModal.tsx` - New modal component
3. `src/App.tsx` - Update /fight-club/guide route to redirect
4. `src/components/combat/FightClubHero.tsx` - Can be deleted after refactor

## Out of Scope

- Voting UI changes (separate effort)
- Battle/Rankings/Burn tab content
- Mobile-specific layout changes
