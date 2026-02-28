# Trait Grid Sort Controls — Design

**Date:** 2026-02-28
**Status:** Approved

## Problem

The `TraitUsageBadge` (Hot/Rare badges on trait cards) doesn't fit the generator's visual style. Users need a way to sort traits by popularity or alphabetically, rather than having static badges that only flag a few items.

## Solution

Replace badges with **sort controls** — three icon-only toggle buttons right-aligned above the trait grid. Three sort modes: Hot (most used first), Not (least used first), A-Z (alphabetical).

## Sort Modes

| Icon | Name | Behavior |
|------|------|----------|
| 🔥 | Hot | Descending by `usageCount` — most minted traits first |
| 💎 | Not | Ascending by `usageCount` — least minted (rarest) first |
| A→Z | Az | Alphabetical by display name |

## Behavior

- **Default**: 🔥 Hot active on first load
- **Always-active**: One sort is always selected, no "unsorted" state
- **Applies everywhere**: All categories (Head, Clothes, Eyes, Mask, Mouth, Background, Base)
- **Session-only**: Sort preference resets on page reload

## UI

Three small icon buttons, right-aligned, inside the grid container above the trait cards.

```
                              🔥  💎  Az
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│     │ │     │ │     │ │     │
└─────┘ └─────┘ └─────┘ └─────┘
```

- **Height**: ~28px row
- **Active state**: Icon with subtle background pill in primary color
- **Inactive**: Muted icon color, no background
- **Accessibility**: `aria-label`, `aria-pressed`
- **Identical on mobile and desktop**

## Sorting Logic

- **Hot/Not**: Sort by `usageCount` from `getTraitPricing()`. Traits with no pricing data treated as 0 usage (sort to end for Hot, to start for Not).
- **A→Z**: Sort by `trait.name` using `localeCompare()`.
- **"None" card**: Always first regardless of sort.
- **Solid color / Price overlay cards** (Background): Stay in current positions.
- **Tiebreaker**: Equal usage counts fall back to existing custom orders (Clothes: CLOTHES_TOP_ORDER; Mouth: MOUTH_BASE_ORDER).

## What Gets Removed

- `TraitUsageBadge` component and all its render calls
- `isTop3Trait()` calls from TraitSelector render loop
- `.trait-popularity-badge` CSS in theme.css
- `isTop3` prop threading through card components

## Data Flow

Sort state lives as `useState` in TraitSelector. When sort mode changes, `unifiedTraits` is re-sorted client-side (pricing data already loaded in MintContext). MouthLayerSelector receives sort mode via prop.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/generator/TraitSelector.tsx` | Add sort state + controls, sort logic, remove badges |
| `src/components/generator/MouthLayerSelector.tsx` | Accept sort prop, apply sort, remove badges |
| `src/styles/theme.css` | Remove badge CSS, add sort control styles |

## Not in Scope

- Persisting sort preference across sessions (localStorage)
- Price-specific sort (Hot/Not already correlates with price)
- Filter controls (show/hide traits)
