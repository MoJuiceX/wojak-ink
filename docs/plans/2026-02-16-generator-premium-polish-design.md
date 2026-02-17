# Generator Premium Polish — Design Doc

**Goal:** Elevate the Wojak Generator to feel like a $50M PFP project generator (Art Blocks / Azuki tier). Twelve targeted improvements, all visual/UX polish — no new backend work.

**Date:** 2026-02-16

---

## 1. Supply Counter Hover Tooltip

**What:** Hover over the `4/4200` supply counter → animated tooltip drops below showing a hype line + a real stat.

**Current state:** Plain muted text `{totalMinted}/{maxSupply}` in `ActionBar.tsx` (line 782-786). Only visible when wallet connected.

**Change:** Make supply counter always visible (not just wallet-connected). On hover, show a premium tooltip.

### Tooltip Visual Design

```
         4 / 4200
            ▼
┌──────────────────────────────┐
│  "Single digits. Legendary." │  ← hype line (bold, white, 13px)
│  96% of supply unminted      │  ← stat line (text-secondary, 11px)
└──────────────────────────────┘
```

- Background: `var(--color-surface)` with `1px solid rgba(255,107,0,0.15)` (faint orange border)
- Small upward-pointing caret/arrow connecting to the counter
- Animation: fade-in + translateY(-4px → 0) over 150ms ease-out
- Max width: 280px
- Border radius: `var(--radius-md)`

### Message Engine

**Tier buckets** — based on `totalMinted`, randomly pick one hype line per hover:

| Range | Sample Messages (5-8 per bucket) |
|-------|----------------------------------|
| 1–10 | "Single digits. Legendary." / "You're looking at genesis-tier scarcity." / "Fewer than 10 in existence." |
| 11–50 | "First wave minter territory." / "Under 50 — the OG club." / "This early? Respect." |
| 51–100 | "Sub-100 club is still open." / "Double digits won't last." / "99% of supply still waiting." |
| 101–500 | "The collection is taking shape." / "Under 500 — still early." / "Momentum is building." |
| 501–1000 | "Past 500. The movement is real." / "Heating up." / "Four figures incoming." |
| 1001–2100 | "Past the halfway mark." / "Over 1,000 Wojaks walk the chain." / "The floor has a memory." |
| 2101–3500 | "Over half claimed. Tick tock." / "Supply shrinking fast." / "The window is closing." |
| 3501–4100 | "Final stretch. Under 700 left." / "This is the endgame." / "Late minters pay more." |
| 4101–4190 | "Double digits remaining." / "Count them on your fingers." / "Almost over." |
| 4191–4200 | "Single digits left. Last call." / "The final chapter." / "History in the making." |

**Stat pool** — randomly pick one stat per hover, computed from pricing data already loaded:

- `"{percentage}% of supply still unminted"` (computed: `((maxSupply - totalMinted) / maxSupply * 100).toFixed(1)`)
- `"Only {totalMinted} Wojaks on-chain"` (when < 100)
- `"{slots remaining} slots remaining"` (computed: `maxSupply - totalMinted`)
- `"{traitName} leads with {count} mints"` (from pricing traits data — highest usage trait)
- `"Base price: 0.20 XCH"` (when no surcharges are significant)
- `"Every trait still under {n} mints"` (when max trait usage is low)

### Data Source

All from `MintContext` — already loaded, no new API calls:
- `totalMinted`, `maxSupply` — supply counter
- `traitPricing` — trait usage counts for stat computation

### File Changes

- `src/components/generator/ActionBar.tsx` — extract supply counter into its own `<SupplyCounter>` component with hover tooltip
- New file: `src/components/generator/SupplyTooltip.tsx` — tooltip component with message engine
- New file: `src/lib/supplyMessages.ts` — hype line tiers + stat generators (pure data, no components)

---

## 2. Premium Default Background

**What:** On first load, randomly select a Scene background instead of showing the checkered transparency grid. First impression = finished NFT.

**Current state:** Generator loads with no background selected. Canvas shows transparency checkerboard. Background is marked `required: false` in `layerRegistry.ts`.

### Behavior

1. **On generator mount:** pick a random Scene background from the available scenes and apply it as the initial selection
2. **Face always starts as Classic** (unchanged)
3. **First impression:** user sees Classic Wojak on a random scene — looks like a complete NFT
4. **User can change:** select any other background (scene or color), or select "No Background" (∅ icon)
5. **No Background = transparent:** checkered grid returns, but this is now a deliberate user choice

### Background as Required for Minting

- Background becomes a **required** category for minting
- Mint button is disabled if background is not selected
- Required categories: Face, Mouth, Eyes, Clothes, Background (5 total)
- Optional categories (can be None): Head ("No Headgear"), Face Wear ("No Face Wear")

### Scene Backgrounds Available (17)

From `public/assets/wojak-layers/BACKGROUND/`:
Bepe Barracks, Chia Farm, Hell, Matrix, Moms Basement, Moon, NYSE Dump, NYSE Pump, Nesting Grounds, One Market, Orange Grove, Ronin Dojo, Route 66, Silicon.net Data Center, Spell Room, White House

Plus one more (need to verify full list). Random selection on each page load from this pool (scenes only, not plain colors, not solid).

### File Changes

- `src/contexts/GeneratorContext.tsx` — on init, randomly select a scene background path and set it as initial `selectedLayers.Background`
- `src/lib/layerRegistry.ts` — change Background `required: false` → `required: true` (for mint validation)
- `src/components/generator/ActionBar.tsx` — update mint readiness check: require Background selection
- `src/components/generator/TraitSelector.tsx` — ensure "None" option (∅ icon) is available for Background category to allow deselection

### Important

- Do NOT modify any image assets or add visual effects to the canvas
- The actual scene PNG is rendered as-is, same as if the user selected it manually
- Export/mint uses whatever is selected (including no background if user chose ∅)

---

## 3. Trait Labels on Hover

**What:** Hover over any trait thumbnail → label fades in at the bottom of the card showing the trait name.

**Current state:** Trait thumbnails in the middle grid (`TraitSelector.tsx`) show only the image. No text labels. Components: `ImageCard` (line 132-196), `BaseImageCard` (line 222-299), `NoneCard` (line 72-119).

### Visual Design

```
┌─────────────────────┐
│                     │
│    [trait image]    │
│                     │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  ← dark gradient overlay (bottom 30%)
│  Crown              │  ← white text, 11px, semi-bold
└─────────────────────┘
```

- **Overlay:** Linear gradient from `transparent` to `rgba(0,0,0,0.75)`, covering bottom ~30% of the card
- **Text:** Trait name, white, 11px, font-weight 500, single line, truncated with ellipsis if too long
- **Animation:** Fade in over 150ms ease-out on hover
- **Positioning:** Absolutely positioned at the bottom of the card, inside the existing rounded corners

### Desktop Only

- On mobile, no hover exists — skip labels entirely
- Mobile users see the trait name in the right sidebar traits summary when they tap to select

### Trait Name Source

Use the same `cleanDisplayName()` / `formatDisplayLabel()` functions already used in `MetadataPreview.tsx` for consistent naming.

### File Changes

- `src/components/generator/TraitSelector.tsx` — add hover label overlay to `ImageCard` and `BaseImageCard` components
- Use framer-motion `whileHover` or CSS `:hover` for the fade effect
- No changes needed for `NoneCard` (it already shows ∅ icon, no label needed)

---

## 4. Toolbar Mint CTA Cleanup

**What:** Tighten the bottom toolbar to make room for a visible total price + mint button. Stack undo/redo, remove copy-to-clipboard.

**Current state:** ActionBar toolbar (line 418+) has these items left to right:
1. Randomize (with dropdown)
2. Undo
3. Redo
4. Save/Favorites (Heart)
5. Export/Download
6. Copy to clipboard (desktop only)
7. Overflow menu (...)
8. Separator
9. Free/Paid toggle (wallet connected)
10. Price display (wallet connected)
11. Mint/Connect button
12. Supply counter (wallet connected)

### Changes

**A. Stack Undo/Redo vertically:**
- Currently two side-by-side buttons
- Stack them into a single-width column: Undo on top, Redo below
- Smaller icons (14px instead of 18px) to fit the stacked layout
- Same functionality, same tooltips

**B. Remove Copy to Clipboard:**
- Delete the Copy button entirely from the toolbar
- Users can still export/download — clipboard copy is redundant

**C. Always show price + mint (not just when wallet connected):**
- **Not connected:** Show `0.20 XCH` price (or computed total) + Wallet connect button with "Connect" label
- **Connected:** Show total price + Mint button (existing behavior, but now with just the single total number)

**D. Price display simplification:**
- Currently shows: `0.21 XCH` with a sub-line `base 0.20 + 0.01 Crown surcharge`
- New: just show `0.21 XCH` — single total, no breakdown
- The breakdown is still available in the Prices modal (overflow menu → Prices)
- Price updates live as traits change

**E. Supply counter stays in toolbar:**
- Remains at the far right
- Now always visible (not just wallet-connected) — ties into Feature #1 (hover tooltip)

### New Toolbar Layout

```
🎨  [↩️]  ❤️  ⬇️  •••      0.21 XCH  [Mint⭐]  4/4200
     ↪️
```

### File Changes

- `src/components/generator/ActionBar.tsx`:
  - Stack undo/redo into a vertical group
  - Remove copy-to-clipboard button and its handler
  - Show price display always (compute from pricing data even before wallet connect)
  - Show supply counter always
  - Simplify price to single total number

---

## 5. Right Sidebar Visual Elevation

**What:** Elevate the right sidebar panels (Color picker + Traits/Metadata summary) from utilitarian to premium without changing functionality.

**Current state:**
- `GeneratorRightPanel.tsx` — color picker + G2 trait detail panels
- `MetadataPreview.tsx` — traits summary list (TRAITS 6/7 view)
- Toggle between modes via ActionBar overflow menu

### Changes to MetadataPreview (Traits Summary)

**A. Trait rows as subtle cards:**
- Current: `background: rgba(255,255,255,0.02)` with transparent border
- New: `background: rgba(255,255,255,0.04)` with `border: 1px solid var(--color-border)`, `border-radius: var(--radius-md)`
- Slightly more padding (py-2 px-3 instead of py-1.5 px-2)
- Small gap between cards (gap-2 instead of gap-1)

**B. Completion indicators:**
- Each trait row gets a small indicator on the left side:
  - ● Filled circle (orange/primary) = trait selected
  - ○ Empty ring (muted) = required trait, not yet selected
  - — Dash (muted) = optional trait set to "None" (valid, intentional)
- This subtly reinforces the "complete your build" feeling

**C. Progress counter upgrade:**
- Current: `{selectedCount}/7` badge with green/red background
- New: Small segmented progress bar (7 segments) or progress ring
  - Each segment represents one trait category
  - Filled segments = selected traits (orange fill)
  - Empty segments = unselected (dark/muted)
  - All filled = entire bar glows green briefly
- Keep the numeric `6/7` text alongside for clarity

**D. Trait type labels styling:**
- Current: cyan colored, 10px, font-weight 600
- New: text-secondary color (not cyan — save cyan for special callouts), 10px, uppercase, letter-spacing 0.5px
- This matches premium configurator patterns where labels are quiet and values pop

**E. Trait value styling:**
- Current: white text, 12px
- Keep white but bump to font-weight 500 (slightly bolder)
- "No Headgear" / "No Face Wear" in text-muted instead of white (they're empty states, should be visually quieter)

### Changes to Color Picker Panel

**F. Context label:**
- When color picker is active, show what layer is being colored at the top
- Add: `"Coloring: Eyes"` or `"Coloring: Clothes"` label above the hex display
- Uses text-secondary, 10px, same style as trait type labels
- This removes ambiguity about what the color picker is targeting

### File Changes

- `src/components/generator/MetadataPreview.tsx`:
  - Update trait row styling (cards, indicators, progress bar)
  - Update label/value typography
- `src/components/generator/GeneratorRightPanel.tsx`:
  - Add context label showing which layer is being colored
- `src/styles/theme.css`:
  - Add any new CSS classes needed (e.g., `.progress-bar-segment`)

---

## 6. Trait Transition Animation (Canvas Crossfade)

**What:** When the user switches a trait (clicks a new face, clothes, eyes, etc.), the preview canvas does a subtle crossfade instead of an instant snap.

**Current state:** Trait changes update the canvas immediately — new layers render in one frame. Functional but feels mechanical.

### Design

- **Effect:** 200ms opacity crossfade between the old state and the new state
- **Approach:** When a trait change is detected, briefly overlay the previous canvas frame at full opacity, then fade it out to 0 while the new state is already rendered underneath
- **Must be subtle:** The user should feel smoothness, not notice an animation. If it's perceptible as "an effect," it's too much.
- **No delay on interaction:** The new trait renders immediately. The crossfade is the *old* frame fading out, not the new frame fading in. This keeps it feeling instant but smooth.

### Technical Approach

- Before a trait change, capture the current canvas as an image (toDataURL or offscreen canvas)
- Overlay that captured image on top of the live canvas
- Fade the overlay from `opacity: 1` to `opacity: 0` over 200ms
- Remove the overlay after animation completes
- Use CSS transition for the fade (no JS animation loop needed)

### Edge Cases

- **Rapid clicking:** If the user clicks multiple traits quickly, each new click should cancel the previous fade and start fresh. No stacking of fade overlays.
- **Randomize button:** Same crossfade applies when randomize changes multiple layers at once — one single crossfade for the whole change.
- **Color changes:** Color picker changes should NOT trigger the crossfade (too frequent, would feel laggy). Only trait selection changes.

### File Changes

- `src/pages/Generator.tsx` or the canvas preview component — add crossfade overlay logic
- CSS transition class in `src/styles/theme.css`

---

## 7. Trait Selection Micro-Interaction

**What:** When the user clicks a trait thumbnail in the grid, give a subtle premium feedback — a brief scale bounce and/or glow pulse.

**Current state:** `TraitSelector.tsx` uses Framer Motion for hover/tap animations on `ImageCard` and `BaseImageCard`. Currently has basic hover scaling.

### Design

- **On click/tap:** Quick scale bounce `1.0 → 1.04 → 1.0` over ~200ms with ease-out
- **Plus:** A brief orange glow pulse on the card border (the selected state border is already orange — make it briefly glow brighter then settle)
- **Must be subtle:** The user feels satisfaction, not distraction. Think Apple's button feedback, not a video game.
- **Mobile:** Include a haptic pulse via `navigator.vibrate(10)` if available (same pattern used in games)

### Technical Approach

- Framer Motion `whileTap={{ scale: 0.97 }}` is likely already there — adjust to include a spring animation on selection
- Add a CSS keyframe for the border glow pulse: `@keyframes trait-select-glow` — border shadow goes from normal → bright orange → back to normal over 300ms
- Apply the glow keyframe class momentarily when a trait is selected

### File Changes

- `src/components/generator/TraitSelector.tsx` — enhance `ImageCard` and `BaseImageCard` tap/select animations
- `src/styles/theme.css` — add `@keyframes trait-select-glow` animation

---

## 8. Category Tab Reorder + Filled/Unfilled State

**What:** Reorder the category tabs to follow a natural creative flow, and visually indicate which categories have selections.

**Current tab order:** Face · Clothes · Mouth · Mask · Eyes · Head · Background

**New tab order:** Face · Mouth · Mask · Head · Eyes · Clothes · Background

This follows the creative journey: face expression → mouth details → mask overlay → headgear → eyewear → outfit → scene.

### Filled/Unfilled Visual State

- **Has selection:** Tab icon is full brightness (white/primary), looks active and "done"
- **No selection yet (required):** Tab icon is muted (`var(--color-text-muted)`), clearly "waiting"
- **No selection (optional — Head, Face Wear):** Tab icon is muted but acceptable (same muted state, since "None" is valid)
- **Currently active tab:** Existing active state (underline or highlight) remains unchanged

The brightness difference between filled and unfilled tabs creates a natural left-to-right progress feeling without any explicit stepper UI.

### Small Dot Indicator

- Add a tiny dot (4px circle) below each tab icon
- Filled dot (`var(--color-primary)`) = trait selected in this category
- No dot = no selection yet
- This is more explicit than icon brightness alone but still minimal

### File Changes

- `src/pages/Generator.tsx` or the tab bar component — reorder tabs array
- Tab bar component — add filled/unfilled state based on `selectedLayers` from GeneratorContext
- `src/styles/theme.css` — add `.tab-indicator-dot` style

---

## 9. Mint Celebration

**What:** When a mint successfully completes (user paid, NFT created), trigger a full-screen confetti + emoji celebration identical to the Treasury bubble-pop celebration.

**Current state:** The Treasury already has a working celebration system in `src/components/treasury/CryptoBubbles.tsx` (lines 150-200, 673-719). It spawns 90 emoji particles from three directions (top, left, right) with physics-based animation.

### Existing Treasury Celebration Details

- **Emojis:** `['🎉', '🎊', '✨', '💫', '⭐', '🌟', '🍊']`
- **90 particles:** 40 from top (falling), 25 from left (shooting right), 25 from right (shooting left)
- **Physics:** Gravity (`vy += 0.1`), friction (`vx *= 0.995`), fade out (`opacity -= 0.003`)
- **Duration:** 8 seconds max
- **Rendering:** Full-screen fixed overlay at `z-index: 9999`
- **Sound:** Ascending arpeggio (C5, E5, G5, C6)
- **Haptics:** Triple vibration burst

### Approach

**Option A (Recommended): Extract and reuse**
- Extract the `createConfetti()` function and physics loop from `CryptoBubbles.tsx` into a shared utility
- Create a reusable `<CelebrationOverlay>` component
- Both Treasury and Generator import from the same source
- Keeps behavior identical, no code duplication

**Option B: Copy and adapt**
- Copy the confetti logic into a generator-specific celebration component
- Simpler but creates duplication

### Trigger Point

- After the mint flow completes successfully (offer accepted, NFT confirmed on-chain)
- This happens in the mint modal/flow managed by `MintContext`
- Trigger: when mint status transitions to "confirmed" or "success"

### File Changes

- New file: `src/components/shared/CelebrationOverlay.tsx` — extracted reusable celebration component
- `src/components/treasury/CryptoBubbles.tsx` — refactor to import from shared component
- `src/components/generator/ActionBar.tsx` or mint flow component — trigger celebration on successful mint

---

## 10. Pricing Lightbox: Sort Toggle + Selection Highlight

**What:** Upgrade the Trait Prices modal with sorting options and highlight the user's current trait selections in the table.

**Current state:** `PricingLightbox.tsx` shows trait pricing grouped by category (Head, Clothes, Face Wear, Face). Each row shows trait name, minted count, price, credits. Rows are sorted by minted count descending. No sort controls, no indication of which traits the user currently has selected.

### Changes

**A. Sort toggle:**
- Add a small sort control at the top of the modal (below the header, next to "Base: 0.2 XCH")
- Three sort options as compact text buttons or a segmented control:
  - **Popular** (default) — sort by minted count, highest first (current behavior)
  - **Price** — sort by surcharge price, highest first (most expensive at top)
  - **A–Z** — alphabetical by trait name
- Sort applies within each category section independently
- Active sort option is highlighted (orange text or underline)

**B. Current selection highlight:**
- If the user has selected a trait that appears in the pricing table, highlight that row
- Visual: subtle left border in orange (`3px solid var(--color-primary)`) + slightly brighter background (`rgba(255,107,0,0.08)`)
- This helps the user immediately see "this is what I'm paying for" and "this is what I picked"
- Uses current generator selections from GeneratorContext

### File Changes

- `src/components/generator/PricingLightbox.tsx` — add sort state + toggle UI, add selection highlight logic
- Import `useGenerator` or `useGeneratorOptional` from GeneratorContext to read current selections

---

## 11. First-Visit Auto-Open "How It Works"

**What:** Automatically show the "How It Works" modal when a user visits the generator for the first time. After dismissing, it never auto-opens again.

**Current state:** The How It Works info is in `GeneratorInfo.tsx`, opened from the overflow menu ("..." → "How It Works"). New users have no way to discover it unless they explore the menu.

### Behavior

- On generator mount, check `localStorage` for a flag: `wojak_generator_seen`
- If flag doesn't exist → auto-open the How It Works modal after a short delay (500ms, so the page renders first)
- When the user closes the modal → set `localStorage.setItem('wojak_generator_seen', 'true')`
- All subsequent visits: modal stays closed, user can still access it from overflow menu
- First accordion section ("What is Your Wojak?") should be open by default when auto-opened

### File Changes

- `src/components/generator/ActionBar.tsx` or `src/pages/Generator.tsx` — add `useEffect` for first-visit check and auto-open trigger
- `src/components/generator/GeneratorInfo.tsx` — accept an `initialOpenSection` prop so the first section opens by default when auto-triggered

---

## 12. Mobile Mini Preview Brand Fix

**What:** Change the StickyMiniPreview border color from blue to orange to match the brand.

**Current state:** `StickyMiniPreview.tsx` uses `#3B82F6` (Tailwind blue-500) for the border and pulse ring. This is the only place in the generator using blue as a highlight color — everything else is orange.

### Changes

- Border: `#3B82F6` → `var(--color-primary)` (orange)
- Pulse ring: blue pulse → orange pulse using `var(--color-primary)` with reduced opacity
- Keep the same size, position, and behavior

### File Changes

- `src/components/generator/StickyMiniPreview.tsx` — update border color and pulse ring color

---

## Implementation Notes

### CSS Rules (from CLAUDE.md)
- All visual styles go in `src/styles/theme.css`
- Tailwind for layout only (flex, grid, gap, padding)
- No `!important` ever
- No new CSS variable files
- Use existing CSS variables for colors

### Key Files to Modify
```
src/components/generator/ActionBar.tsx          — Features 1, 4, 9, 11
src/components/generator/TraitSelector.tsx       — Features 3, 7
src/components/generator/MetadataPreview.tsx     — Feature 5
src/components/generator/GeneratorRightPanel.tsx — Feature 5
src/components/generator/PricingLightbox.tsx     — Feature 10
src/components/generator/GeneratorInfo.tsx       — Feature 11
src/components/generator/StickyMiniPreview.tsx   — Feature 12
src/contexts/GeneratorContext.tsx                — Feature 2 (random bg init)
src/lib/layerRegistry.ts                        — Feature 2 (bg required)
src/pages/Generator.tsx                         — Features 6, 8, 11 (crossfade, tab reorder, first-visit)
src/components/treasury/CryptoBubbles.tsx       — Feature 9 (extract celebration)
src/styles/theme.css                            — Features 3, 5, 6, 7 (new classes/animations)
```

### New Files
```
src/components/generator/SupplyTooltip.tsx     — Feature 1
src/lib/supplyMessages.ts                      — Feature 1 (hype lines + stat generators)
src/components/shared/CelebrationOverlay.tsx   — Feature 9 (reusable confetti)
```

### No Backend Changes
All twelve features are frontend-only. Pricing data is already loaded via `/api/mint/pricing`.

### Feature Summary
1. Supply Counter Hover Tooltip — hype + stat on hover
2. Premium Default Background — random scene on first load, bg required for mint
3. Trait Labels on Hover — name overlay on desktop hover
4. Toolbar Mint CTA Cleanup — stack undo/redo, remove copy, always show total price
5. Right Sidebar Elevation — card rows, indicators, progress bar, context label
6. Trait Transition Animation — 200ms canvas crossfade on trait change
7. Trait Selection Micro-Interaction — scale bounce + glow pulse on click
8. Category Tab Reorder + Filled State — new order, bright/muted indicator dots
9. Mint Celebration — full-screen confetti/emoji reusing Treasury system
10. Pricing Lightbox Sort + Selection Highlight — sort by popular/price/A-Z, highlight current picks
11. First-Visit Auto-Open How It Works — onboarding on first generator visit
12. Mobile Mini Preview Brand Fix — blue border → orange

### Testing Considerations
- Supply tooltip: verify random message selection, tier boundaries, stat accuracy
- Default background: verify random scene on load, verify "None" deselection works, verify mint blocks without background
- Hover labels: verify desktop-only (no mobile breakage), text truncation on long names
- Toolbar: verify stacked undo/redo works, price updates live, mint enable/disable logic with new required categories
- Sidebar: verify visual changes don't break G2 trait detail panels or color picker functionality
- Canvas crossfade: verify rapid clicking doesn't stack overlays, verify color changes DON'T trigger it
- Selection feedback: verify bounce/glow feels subtle not jarring, verify mobile haptic works
- Tab reorder: verify new order matches spec, verify filled/unfilled dots update reactively
- Mint celebration: verify triggers only on confirmed success, verify overlay dismisses cleanly, verify Treasury still works after refactor
- Pricing lightbox: verify sort toggle works across all categories, verify selection highlight matches actual generator state
- First visit: verify auto-open only fires once (localStorage flag), verify manual access from overflow still works
- Mobile preview: verify orange border renders correctly, verify pulse ring uses brand color
