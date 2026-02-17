# Generator Premium Polish — Implementation Plan

**Design doc:** `docs/plans/2026-02-16-generator-premium-polish-design.md`
**Scope:** 12 frontend-only features. Zero backend changes.

**Before starting:** Read `CLAUDE.md`, `.claude/instructions/PROMPT-PRINCIPLES.md`, `docs/GENERATOR-CODE-HEALTH.md`

---

## Implementation Order

Features are ordered by dependency and risk. Low-risk standalone changes first, then features that modify shared state, then features that touch multiple files.

---

## Phase 1: Quick Wins (No Shared State Changes)

### Step 1: Mobile Mini Preview Brand Fix (Feature 12)

**File:** `src/components/generator/StickyMiniPreview.tsx`

**Changes:**
- Find all instances of `#3B82F6` (blue) and replace with `var(--color-primary)`
- The border color and pulse ring animation both use this blue — change both to orange
- The pulse ring keyframe (if inline) should use `rgba(255, 107, 0, 0.4)` fading to `rgba(255, 107, 0, 0)` instead of blue equivalents

**Verify:** Run dev server, view on mobile (or narrow viewport), scroll past the main preview — the sticky mini preview should have an orange border and orange pulse, not blue.

---

### Step 2: Trait Labels on Hover (Feature 3)

**Files:**
- `src/components/generator/TraitSelector.tsx`
- `src/styles/theme.css`

**Changes to TraitSelector.tsx:**

In `ImageCard` component (around line 132-196):
- Add a hover overlay `<div>` inside the card, positioned absolutely at the bottom
- The overlay contains the trait name text
- Use the existing `cleanDisplayName` / `formatDisplayLabel` from `@/lib/traitOptions` (already imported in MetadataPreview) to get the display name from the file path
- Wrap in a hover state — use CSS `:hover` on the parent card to show/hide the overlay (simpler and more performant than framer-motion for this)

```tsx
// Inside each ImageCard, after the <img>:
<div className="trait-label-overlay">
  <span className="trait-label-text">{displayName}</span>
</div>
```

In `BaseImageCard` component (around line 222-299):
- Same treatment — add the hover label overlay

**Changes to theme.css:**

```css
/* Trait hover label */
.trait-label-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px 6px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.75));
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  opacity: 0;
  transition: opacity 150ms ease-out;
  pointer-events: none;
}

/* Only show on desktop hover */
@media (hover: hover) {
  .trait-card:hover .trait-label-overlay {
    opacity: 1;
  }
}

.trait-label-text {
  color: white;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}
```

**Note:** Make sure the card's parent div has `position: relative` and `overflow: hidden` (it likely already does from the rounded corners). Add a className like `trait-card` to the parent for the CSS hover selector.

**Verify:** Hover over trait thumbnails on desktop — name fades in at bottom. On mobile, no label appears. Long names truncate with ellipsis.

---

### Step 3: Trait Selection Micro-Interaction (Feature 7)

**Files:**
- `src/components/generator/TraitSelector.tsx`
- `src/styles/theme.css`

**Changes to TraitSelector.tsx:**

In `ImageCard` and `BaseImageCard`, when a trait is selected (onClick fires):
1. Add a CSS class `trait-select-glow` to the card momentarily (use a state + setTimeout to add/remove after 300ms)
2. Add `navigator.vibrate?.(10)` on click for mobile haptic
3. Adjust framer-motion animation: on selection, use a spring animation `{ scale: [1, 1.04, 1], transition: { duration: 0.2 } }`

**Changes to theme.css:**

```css
@keyframes trait-select-glow {
  0% { box-shadow: 0 0 0 rgba(255, 107, 0, 0); }
  40% { box-shadow: 0 0 16px rgba(255, 107, 0, 0.5); }
  100% { box-shadow: 0 0 0 rgba(255, 107, 0, 0); }
}

.trait-select-glow {
  animation: trait-select-glow 300ms ease-out;
}
```

**Implementation detail:** Don't fire the glow on every click — only when the trait actually CHANGES (i.e., the user clicks a different trait than the currently selected one). Clicking the already-selected trait should not re-trigger.

**Verify:** Click traits in the grid — brief subtle glow pulse and slight scale bounce. On mobile, feel a tiny haptic tap. Rapidly clicking different traits should feel smooth, not janky.

---

### Step 4: Pricing Lightbox Sort + Selection Highlight (Feature 10)

**File:** `src/components/generator/PricingLightbox.tsx`

**Changes:**

A. **Add sort state:**
```tsx
const [sortMode, setSortMode] = useState<'popular' | 'price' | 'az'>('popular');
```

B. **Add sort toggle UI** — place below the header bar, next to "Base: 0.2 XCH":
```tsx
<div className="flex gap-2">
  {(['popular', 'price', 'az'] as const).map((mode) => (
    <button
      key={mode}
      onClick={() => setSortMode(mode)}
      className="text-xs px-2 py-1 rounded"
      style={{
        color: sortMode === mode ? 'var(--color-primary)' : 'var(--color-text-muted)',
        background: sortMode === mode ? 'rgba(255,107,0,0.1)' : 'transparent',
      }}
    >
      {mode === 'popular' ? 'Popular' : mode === 'price' ? 'Price' : 'A–Z'}
    </button>
  ))}
</div>
```

C. **Apply sort to trait rows** within each category section. Currently traits are likely in an array — sort before rendering:
```tsx
const sortedTraits = [...traits].sort((a, b) => {
  if (sortMode === 'popular') return b.usageCount - a.usageCount;
  if (sortMode === 'price') return b.surchargeXch - a.surchargeXch;
  return a.name.localeCompare(b.name);
});
```

D. **Highlight current selection:**
- Import `useGeneratorOptional` from GeneratorContext
- Get current `selectedLayers` and resolve trait names using the same name resolution as MetadataPreview
- For each row, check if the trait name matches the user's current selection for that category
- If match: add `style={{ borderLeft: '3px solid var(--color-primary)', background: 'rgba(255,107,0,0.08)' }}`

**Verify:** Open Pricing lightbox. Toggle between Popular/Price/A-Z — rows reorder within each category. If you have Beer Hat selected, its row in Head section has an orange left border.

---

### Step 5: Mobile Mini Preview Brand Fix is already done in Step 1. Moving on.

---

## Phase 2: Layout & Tab Changes

### Step 6: Category Tab Reorder + Filled/Unfilled State (Feature 8)

**Files:**
- `src/lib/layerRegistry.ts`
- `src/components/generator/LayerTabs.tsx`
- `src/styles/theme.css`

**Changes to layerRegistry.ts:**

Change `UI_ORDER` from:
```ts
export const UI_ORDER: UILayerName[] = [
  'Base', 'Clothes', 'MouthBase', 'MouthItem', 'FacialHair', 'Mask', 'Eyes', 'Head', 'Background',
];
```
To:
```ts
export const UI_ORDER: UILayerName[] = [
  'Base', 'MouthBase', 'MouthItem', 'FacialHair', 'Mask', 'Head', 'Eyes', 'Clothes', 'Background',
];
```

**IMPORTANT:** Do NOT change `RENDER_ORDER`. That's compositing order (bottom to top for canvas rendering). Only `UI_ORDER` controls the tab display order.

Note: `MouthItem` and `FacialHair` are in `HIDDEN_TABS` in LayerTabs.tsx, so they won't show as separate tabs. The visible order becomes:
`Face · Mouth · Mask · Head · Eyes · Clothes · Background`

**Changes to LayerTabs.tsx:**

The `hasSelection` indicator is already implemented (lines 94-103) — orange dot with glow at top-right. But the spec wants:
- **Filled tabs:** Icon at full brightness (white)
- **Unfilled tabs (no selection):** Icon stays muted (`var(--color-text-secondary)`)
- **Small dot below icon** (4px) instead of at top-right corner

Update the LayerTab component:
1. Change the `color` style: if `hasSelection` is true AND not the active tab, use `white` instead of `var(--color-text-secondary)`. Active tab is already white.
2. Move the selection indicator dot from `absolute top-1 right-1` to below the label text, centered. Change size from `w-2 h-2` to `w-1 h-1` (4px).
3. Keep the required indicator (red dot) for unfilled required categories.

```tsx
// Updated color logic:
color: isActive
  ? 'white'
  : isBlocked
    ? 'var(--color-text-muted)'
    : hasSelection
      ? 'rgba(255, 255, 255, 0.9)'  // bright when filled
      : 'var(--color-text-secondary)',  // muted when empty
```

**Verify:** Tabs appear in new order: Face · Mouth · Mask · Head · Eyes · Clothes · Background. Tabs with selections are brighter. Small indicator dots appear below filled tabs.

---

### Step 7: Toolbar Mint CTA Cleanup (Feature 4)

**File:** `src/components/generator/ActionBar.tsx`

This is the most complex single-file change. Work carefully.

**Changes:**

A. **Stack Undo/Redo vertically:**

Find the Undo and Redo buttons (around lines 492-509). Currently they're two side-by-side `ActionButton` components. Wrap them in a flex-col container with smaller icons:

```tsx
<div className="flex flex-col gap-0.5">
  <ActionBarTooltip content="Undo">
    <ActionButton
      onClick={undo}
      disabled={!canUndo}
      icon={<Undo2 size={14} />}
      label=""
    />
  </ActionBarTooltip>
  <ActionBarTooltip content="Redo">
    <ActionButton
      onClick={redo}
      disabled={!canRedo}
      icon={<Redo2 size={14} />}
      label=""
    />
  </ActionBarTooltip>
</div>
```

Remove the text labels from undo/redo (label="") since they're stacked and space is tight. Tooltips are sufficient.

B. **Remove Copy to Clipboard button:**

Find the Copy button (around lines 567-594, desktop only). Delete it entirely. Remove the associated handler if it's only used here.

C. **Show price always (not just wallet-connected):**

Currently the price display (lines 714-755) is wrapped in `{isWalletConnected && ...}`. Change this:
- Always show the total price computed from `getTotalMintPrice()`
- When not connected: show price + "Connect" wallet button
- When connected: show price + "Mint" button (existing behavior)
- Simplify the price to a single total number: just `{price.totalXch.toFixed(2)} XCH` — remove the surcharge breakdown sub-line

D. **Supply counter always visible:**

Currently wrapped in `{isWalletConnected && (...)}` at lines 782-786. Remove the conditional — always show `{totalMinted}/{maxSupply}`.

**Verify:** Toolbar is tighter. Undo/redo stacked vertically. No copy button. Price shows even when wallet not connected. Supply counter always visible.

---

## Phase 3: State & Initialization Changes

### Step 8: Premium Default Background (Feature 2)

**Files:**
- `src/contexts/GeneratorContext.tsx`
- `src/lib/layerRegistry.ts`

**Changes to layerRegistry.ts:**

1. Change Background `required: false` → `required: true`:
```ts
Background: {
  label: 'Background',
  required: true,  // Changed from false
  icon: 'Image',
  description: 'Choose a background scene',
},
```

2. Add `REQUIRED_LAYERS_FOR_EXPORT` — add 'Background' if not already present.

3. Add a list of scene background paths for random selection:
```ts
export const SCENE_BACKGROUNDS: string[] = [
  '/assets/wojak-layers/BACKGROUND/BACKGROUND_bepe-barracks.png',
  '/assets/wojak-layers/BACKGROUND/BACKGROUND_chia-farm.png',
  '/assets/wojak-layers/BACKGROUND/BACKGROUND_hell.png',
  '/assets/wojak-layers/BACKGROUND/BACKGROUND_matrix.png',
  '/assets/wojak-layers/BACKGROUND/BACKGROUND_moms-basement.png',
  '/assets/wojak-layers/BACKGROUND/BACKGROUND_moon.png',
  '/assets/wojak-layers/BACKGROUND/BACKGROUND_nyse-dump.png',
  '/assets/wojak-layers/BACKGROUND/BACKGROUND_nyse-pump.png',
  '/assets/wojak-layers/BACKGROUND/BACKGROUND_nesting-grounds.png',
  '/assets/wojak-layers/BACKGROUND/BACKGROUND_one-market.png',
  '/assets/wojak-layers/BACKGROUND/BACKGROUND_orange-grove.png',
  '/assets/wojak-layers/BACKGROUND/BACKGROUND_ronin-dojo.png',
  '/assets/wojak-layers/BACKGROUND/BACKGROUND_route-66.png',
  '/assets/wojak-layers/BACKGROUND/BACKGROUND_silicon-net-data-center.png',
  '/assets/wojak-layers/BACKGROUND/BACKGROUND_spell-room.png',
  '/assets/wojak-layers/BACKGROUND/BACKGROUND_white-house.png',
];
```

**IMPORTANT:** Verify these exact filenames exist in `public/assets/wojak-layers/BACKGROUND/` before using them. Run `ls public/assets/wojak-layers/BACKGROUND/` to get the exact names. The filenames above are guesses based on folder names — they might use different casing or separators.

**Changes to GeneratorContext.tsx:**

In the initial state / initialization logic, add a random scene background:

```ts
import { SCENE_BACKGROUNDS } from '@/lib/layerRegistry';

// In the initial state or init effect:
const randomScene = SCENE_BACKGROUNDS[Math.floor(Math.random() * SCENE_BACKGROUNDS.length)];

// Set as initial background selection
// Add to DEFAULT_SELECTIONS or apply in the init logic
```

Look at how `DEFAULT_SELECTIONS` is applied on mount (currently sets MouthBase and Clothes). Add Background the same way:

```ts
export const DEFAULT_SELECTIONS: Partial<Record<UILayerName, string>> = {
  MouthBase: '/assets/wojak-layers/MOUTH/MOUTH_numb.png',
  Clothes: '/assets/wojak-layers/CLOTHES/CLOTHES_Tee_blue.png',
  // Background is handled dynamically (random scene) in GeneratorContext init
};
```

The random selection should happen in the context init, NOT in the static config, so it's different each page load.

**Changes to mint readiness:**

In ActionBar.tsx, the `has7Traits` check (line 176) uses `metadataAttributes.filter((a) => a.value !== '').length`. Since Background is now required and starts with a selection, this should naturally work. But verify: if the user clicks "No Background" (∅), the Background attribute should become empty, and `has7Traits` should become false, disabling mint.

**Verify:**
1. Refresh generator — Wojak appears with a random scene background, not checkered grid
2. Click "No Background" (∅) in Background tab — goes to checkered grid, mint button disables
3. Select any background — mint button re-enables
4. Each page refresh shows a different random scene

---

### Step 9: First-Visit Auto-Open "How It Works" (Feature 11)

**Files:**
- `src/pages/Generator.tsx` or `src/components/generator/ActionBar.tsx`
- `src/components/generator/GeneratorInfo.tsx`

**Changes:**

In Generator.tsx (or wherever the info modal state lives):

```tsx
// Check first visit
useEffect(() => {
  const seen = localStorage.getItem('wojak_generator_seen');
  if (!seen) {
    const timer = setTimeout(() => {
      setShowInfo(true); // or however the How It Works modal is triggered
    }, 500);
    return () => clearTimeout(timer);
  }
}, []);

// When info modal closes:
const handleInfoClose = () => {
  setShowInfo(false);
  localStorage.setItem('wojak_generator_seen', 'true');
};
```

Find how `GeneratorInfo` is currently opened. It's triggered from the ActionBar overflow menu. There must be a state variable controlling its visibility — likely in ActionBar or passed down. Hook into that same state.

**Changes to GeneratorInfo.tsx:**

Add an `initialOpenSection` prop:
```tsx
interface GeneratorInfoProps {
  initialOpenSection?: number; // Index of section to open by default
  // ... existing props
}
```

When auto-opened on first visit, pass `initialOpenSection={0}` so the first section ("What is Your Wojak?") is expanded by default.

**Verify:** Clear localStorage (`localStorage.removeItem('wojak_generator_seen')`), refresh generator. After 500ms, How It Works modal auto-opens with first section expanded. Close it. Refresh — it does NOT auto-open again.

---

## Phase 4: Animation & Visual Polish

### Step 10: Trait Transition Animation — Canvas Crossfade (Feature 6)

**File:** `src/components/generator/PreviewCanvas.tsx`

**Note:** PreviewCanvas already has a "glow flash" on update (lines 37-52) — it sets `showUpdateGlow` for 400ms on image change. The crossfade builds on this same detection.

**Changes:**

1. Add a ref to store the previous preview image URL: `prevImageForFade`
2. When `previewImage` changes (but NOT due to color changes — see below):
   - Set the previous image as the overlay
   - Fade the overlay from opacity 1 → 0 over 200ms
   - After fade completes, clear the overlay

```tsx
const [fadeOverlay, setFadeOverlay] = useState<string | null>(null);
const fadeTimerRef = useRef<number>();

useEffect(() => {
  if (previewImage && prevImageRef.current && previewImage !== prevImageRef.current) {
    // Cancel any existing fade
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);

    // Set the old image as overlay (starts at opacity 1)
    setFadeOverlay(prevImageRef.current);

    // After a frame, the CSS transition kicks in (opacity → 0)
    requestAnimationFrame(() => {
      // The CSS transition handles the fade
      fadeTimerRef.current = window.setTimeout(() => {
        setFadeOverlay(null);
      }, 250); // slightly longer than 200ms transition to ensure completion
    });
  }
  prevImageRef.current = previewImage;
}, [previewImage]);
```

3. In the JSX, render the overlay image on top of the real preview:
```tsx
{fadeOverlay && (
  <img
    src={fadeOverlay}
    className="generator-canvas-fade-overlay"
    alt=""
    style={{ opacity: 0 }} // Starts at 1 via CSS, immediately transitions to 0
  />
)}
```

Wait — this won't work because setting opacity 0 immediately won't trigger a transition. Better approach:

```tsx
const [fadeOverlay, setFadeOverlay] = useState<{ src: string; fading: boolean } | null>(null);

// When image changes:
setFadeOverlay({ src: prevImage, fading: false });
requestAnimationFrame(() => {
  setFadeOverlay(prev => prev ? { ...prev, fading: true } : null);
});
// After 200ms, clear:
setTimeout(() => setFadeOverlay(null), 250);
```

```tsx
{fadeOverlay && (
  <img
    src={fadeOverlay.src}
    className="generator-canvas-fade-overlay"
    style={{ opacity: fadeOverlay.fading ? 0 : 1 }}
    alt=""
  />
)}
```

**Distinguishing trait changes from color changes:**

Color changes update the preview image too. To avoid crossfade on color picks:
- Track which layers changed. If only `selectedColors` changed (not `selectedLayers`), skip the fade.
- Or: add a flag in the generator context like `lastChangeType: 'trait' | 'color'` that the canvas can check.
- Simplest approach: debounce. Color changes happen rapidly (dragging color picker), trait changes are discrete clicks. Use a debounce of 100ms — if multiple preview changes happen within 100ms, skip the fade (it's a color drag). Single discrete changes = trait change = show fade.

**Changes to theme.css:**

```css
.generator-canvas-fade-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  transition: opacity 200ms ease-out;
  z-index: 1;
}
```

**Verify:** Click a different face — brief smooth crossfade. Click rapidly — no stacking, each new click cancels the previous. Drag color picker — no crossfade. Randomize — one single crossfade.

---

### Step 11: Right Sidebar Visual Elevation (Feature 5)

**Files:**
- `src/components/generator/MetadataPreview.tsx`
- `src/components/generator/GeneratorRightPanel.tsx`
- `src/styles/theme.css`

**Changes to MetadataPreview.tsx:**

A. **Trait rows as subtle cards** — update the row style (around line 308-315):
```tsx
style={{
  background: 'rgba(255,255,255,0.04)',  // slightly more visible
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  opacity: isEmpty ? 0.4 : 1,
}}
```
Increase padding to `px-3 py-2`. Increase gap between rows to `gap-2`.

B. **Completion indicators** — add a small indicator at the left of each row:
```tsx
<div className="flex items-center gap-2">
  {/* Completion indicator */}
  <div
    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
    style={{
      background: attr.value !== ''
        ? 'var(--color-primary)'  // filled = orange dot
        : isRequired(attr.trait_type)
          ? 'var(--color-text-muted)'  // required but empty = muted ring
          : 'var(--color-text-muted)',  // optional none = muted
      border: attr.value === '' && isRequired(attr.trait_type)
        ? '1px solid var(--color-text-muted)'
        : 'none',
    }}
  />
  {/* Existing content */}
  <div className="flex-1">...</div>
</div>
```

Add a helper to check if a trait type is required:
```tsx
const REQUIRED_TRAIT_TYPES = ['Face', 'Mouth', 'Clothes', 'Background'];
const isRequired = (traitType: string) => REQUIRED_TRAIT_TYPES.includes(traitType);
```
Note: Base is always fixed ("Wojak"), Head and Face Wear are optional.

C. **Progress counter** — replace the `{selectedCount}/7` badge with a segmented progress bar:
```tsx
<div className="flex items-center gap-1.5">
  <span className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
    Traits
  </span>
  <div className="flex gap-0.5">
    {Array.from({ length: 7 }).map((_, i) => (
      <div
        key={i}
        className="w-2.5 h-1 rounded-full"
        style={{
          background: i < selectedCount
            ? 'var(--color-primary)'
            : 'rgba(255,255,255,0.1)',
          transition: 'background 200ms ease',
        }}
      />
    ))}
  </div>
  <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
    {selectedCount}/7
  </span>
</div>
```

D. **Trait type label styling** — change from cyan to muted:
```tsx
// Old:
style={{ color: 'var(--color-cyan)', fontSize: '10px', fontWeight: 600 }}

// New:
style={{
  color: 'var(--color-text-secondary)',
  fontSize: '10px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}}
```

E. **"No Headgear" / "No Face Wear" in muted color:**
```tsx
// For the value text:
style={{
  color: isEmpty
    ? 'var(--color-text-muted)'
    : (attr.value === 'No Headgear' || attr.value === 'No Face Wear')
      ? 'var(--color-text-muted)'
      : 'var(--color-text)',
  fontSize: '12px',
  fontWeight: 500,
}}
```

**Changes to GeneratorRightPanel.tsx:**

F. **Add "Coloring: [layer name]" context label** at the top of the color picker:

Find where the color picker section starts (around line 376). Add above it:
```tsx
{/* Context label */}
<div className="px-1 mb-1">
  <span
    className="text-[10px] font-semibold uppercase"
    style={{
      color: 'var(--color-text-secondary)',
      letterSpacing: '0.5px',
    }}
  >
    Coloring: {LAYER_CONFIG[activeLayer]?.label || activeLayer}
  </span>
</div>
```

**Verify:** Switch to Traits/Metadata view — rows are visually elevated cards with completion dots and segmented progress bar. Labels are muted uppercase, values are bold white (except "No Headgear" which is muted). Switch to Color view — "Coloring: Eyes" (or whichever layer) shows at the top.

---

## Phase 5: New Components

### Step 12: Supply Counter Hover Tooltip (Feature 1)

**New files:**
- `src/lib/supplyMessages.ts`
- `src/components/generator/SupplyTooltip.tsx`

**Changes to:** `src/components/generator/ActionBar.tsx`

**Create `src/lib/supplyMessages.ts`:**

```ts
// Hype lines by mint tier
export const HYPE_TIERS: { maxMinted: number; messages: string[] }[] = [
  {
    maxMinted: 10,
    messages: [
      'Single digits. Legendary.',
      'You\'re looking at genesis-tier scarcity.',
      'Fewer than 10 in existence.',
      'The first chapter is being written.',
      'History starts here.',
    ],
  },
  {
    maxMinted: 50,
    messages: [
      'First wave minter territory.',
      'Under 50 — the OG club.',
      'This early? Respect.',
      'The collection is just beginning.',
      'Early adopter energy.',
    ],
  },
  {
    maxMinted: 100,
    messages: [
      'Sub-100 club is still open.',
      'Double digits won\'t last.',
      'Still in the first hundred.',
      'The ground floor is right here.',
      'Under 100 — blink and it\'s gone.',
    ],
  },
  {
    maxMinted: 500,
    messages: [
      'The collection is taking shape.',
      'Under 500 — still early.',
      'Momentum is building.',
      'The first 500 define the collection.',
      'Building something real.',
    ],
  },
  {
    maxMinted: 1000,
    messages: [
      'Past 500. The movement is real.',
      'Heating up.',
      'Four figures incoming.',
      'The community is growing.',
      'Word is spreading.',
    ],
  },
  {
    maxMinted: 2100,
    messages: [
      'Past the halfway mark.',
      'Over 1,000 Wojaks walk the chain.',
      'The floor has a memory.',
      'Halfway there. The window is closing.',
      'The collection speaks for itself.',
    ],
  },
  {
    maxMinted: 3500,
    messages: [
      'Over half claimed. Tick tock.',
      'Supply shrinking fast.',
      'The window is closing.',
      'Scarcity is setting in.',
      'The late game has begun.',
    ],
  },
  {
    maxMinted: 4100,
    messages: [
      'Final stretch. Under 700 left.',
      'This is the endgame.',
      'Late minters pay more. But they still mint.',
      'Almost gone.',
      'The end is in sight.',
    ],
  },
  {
    maxMinted: 4190,
    messages: [
      'Double digits remaining.',
      'Count them on your fingers.',
      'Almost over.',
      'The last few.',
      'Blink and they\'re gone.',
    ],
  },
  {
    maxMinted: 4200,
    messages: [
      'Single digits left. Last call.',
      'The final chapter.',
      'History in the making.',
      'The last ones standing.',
      'This is it.',
    ],
  },
];

export function getHypeLine(minted: number): string {
  const tier = HYPE_TIERS.find((t) => minted <= t.maxMinted) || HYPE_TIERS[HYPE_TIERS.length - 1];
  return tier.messages[Math.floor(Math.random() * tier.messages.length)];
}

// Stat generators — each returns a string computed from available data
export type StatInput = {
  minted: number;
  total: number;
  traits?: Record<string, { usageCount: number; surchargeXch: number }>;
};

export function getStatLine(input: StatInput): string {
  const { minted, total, traits } = input;
  const remaining = total - minted;
  const pct = ((remaining / total) * 100).toFixed(1);

  const stats: string[] = [
    `${pct}% of supply still unminted`,
    `${remaining.toLocaleString()} slots remaining`,
  ];

  if (minted < 100) {
    stats.push(`Only ${minted} Wojaks on-chain`);
  }

  if (traits) {
    const entries = Object.entries(traits);
    if (entries.length > 0) {
      const sorted = entries.sort((a, b) => b[1].usageCount - a[1].usageCount);
      const top = sorted[0];
      if (top[1].usageCount > 0) {
        stats.push(`${top[0]} leads with ${top[1].usageCount} mints`);
      }
      const maxUsage = top[1].usageCount;
      if (maxUsage > 0 && maxUsage < 10) {
        stats.push(`Every trait still under ${maxUsage + 1} mints`);
      }
    }
  }

  stats.push('Base price: 0.20 XCH');

  return stats[Math.floor(Math.random() * stats.length)];
}
```

**Create `src/components/generator/SupplyTooltip.tsx`:**

A component that renders the tooltip on hover. Use `useState` for hover state, positioned absolutely below the counter. Import `getHypeLine` and `getStatLine` from supplyMessages.

Key implementation details:
- Generate new random hype + stat on each hover-enter (not on render)
- Store the current hype/stat in state so they don't flicker during the hover
- Animate with CSS: `opacity 0→1` and `translateY -4px→0` over 150ms
- Dark surface background with faint orange border glow
- Small upward caret/triangle

**Changes to ActionBar.tsx:**

Extract the supply counter span (lines 782-786) into the `<SupplyTooltip>` component:
```tsx
<SupplyTooltip minted={totalMinted} total={maxSupply} traits={traitPricing} />
```

Pass the pricing data so the tooltip can compute stats.

**Verify:** Hover over the supply counter — tooltip appears smoothly below with a hype line and a stat. Each hover shows different messages. Move mouse away — tooltip disappears.

---

### Step 13: Mint Celebration (Feature 9)

**New file:** `src/components/shared/CelebrationOverlay.tsx`

**Changes to:** `src/components/treasury/CryptoBubbles.tsx`, mint flow component

**Create `src/components/shared/CelebrationOverlay.tsx`:**

Extract the following from `CryptoBubbles.tsx`:
1. The `createConfetti()` function (spawns 90 particles from 3 directions)
2. The physics animation loop (gravity, friction, fade)
3. The render logic (fixed overlay with positioned emojis)
4. The celebration sound (ascending arpeggio)
5. The haptic feedback

Package as a self-contained component:
```tsx
interface CelebrationOverlayProps {
  show: boolean;
  onComplete?: () => void;
  emojis?: string[];
}

export function CelebrationOverlay({ show, onComplete, emojis }: CelebrationOverlayProps) {
  // ... extracted confetti logic
  // When show becomes true, create confetti and start animation
  // After 8 seconds, call onComplete
}
```

Default emojis: `['🎉', '🎊', '✨', '💫', '⭐', '🌟', '🍊']`

**Refactor CryptoBubbles.tsx:**

Replace the inline confetti code with:
```tsx
import { CelebrationOverlay } from '@/components/shared/CelebrationOverlay';

// In the render:
<CelebrationOverlay show={showConfetti} onComplete={() => setShowConfetti(false)} />
```

Verify Treasury still works identically after refactor.

**Trigger in Generator:**

Find where mint success is handled in the mint flow (likely in MintContext or a mint modal component). When mint status reaches "confirmed"/"success":
```tsx
const [showCelebration, setShowCelebration] = useState(false);

// On mint success:
setShowCelebration(true);

// In render:
<CelebrationOverlay
  show={showCelebration}
  onComplete={() => setShowCelebration(false)}
/>
```

**Verify:** Complete a mint (or mock the success state in dev). Full-screen emoji confetti from 3 directions with sound and haptics. Treasury bubble pop celebration still works unchanged.

---

## Phase 6: Final Polish

### Step 14: Verify All Features Together

After implementing all features, do a full walkthrough:

1. **Fresh visit:** localStorage cleared. Generator loads with Classic Wojak + random scene background. How It Works modal auto-opens after 500ms.
2. **Tab order:** Face · Mouth · Mask · Head · Eyes · Clothes · Background
3. **Pick traits:** Click through tabs, selecting traits. Each click shows subtle scale bounce + glow. Canvas crossfades smoothly between trait changes.
4. **Hover labels:** Hover over trait thumbnails on desktop — names appear at bottom.
5. **Tab indicators:** Filled tabs are bright with orange dots. Unfilled tabs are muted.
6. **Sidebar:** Traits view shows card-style rows, progress bar fills as traits are selected, completion indicators work.
7. **Color picker:** Shows "Coloring: [layer]" label at top.
8. **Pricing:** Open Prices from "..." menu. Sort toggle works. Current selections highlighted.
9. **Toolbar:** Undo/redo stacked. No copy button. Price always visible. Supply counter always visible.
10. **Supply tooltip:** Hover over 4/4200 — hype + stat tooltip appears.
11. **Mobile:** Sticky mini preview has orange border (not blue).
12. **Mint:** Complete a mint — confetti celebration plays.

---

## Risk Notes

- **Feature 2 (default background):** Changing Background to required is a behavioral change. Verify that existing saved favorites without backgrounds still load correctly (they just won't be mintable until a background is added).
- **Feature 6 (crossfade):** The debounce to distinguish trait vs color changes needs careful tuning. If it's wrong, color picker will feel laggy. Test with rapid color dragging.
- **Feature 8 (tab reorder):** Only change `UI_ORDER`, never `RENDER_ORDER`. The render order is critical for correct layer compositing.
- **Feature 9 (celebration):** The Treasury refactor must be tested thoroughly — don't break an existing production feature to add a new one.
- **Feature 4 (toolbar):** The ActionBar is ~800 lines with complex conditional rendering. Work carefully, test all states: connected/disconnected, free/paid, minting paused, sold out.
