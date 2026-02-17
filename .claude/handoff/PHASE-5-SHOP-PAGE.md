# Phase 5: Shop Page — Launch-Ready State

## What This Is

The shop page currently shows "More items arriving soon. Stay tuned." — an empty stub. For launch, it needs to either be a proper "coming soon" page that looks intentional and polished, or be hidden from navigation. You will make it look intentional.

## Before You Start

1. Read `CLAUDE.md` for CSS conventions — theme.css for visuals, Tailwind for layout only
2. Read `src/styles/theme.css` for available classes (`.card`, `.btn`, `.badge`, CSS variables)
3. Read `src/pages/Shop.tsx` — the current stub
4. Read `src/components/Shop/` — the ShopComponent
5. Read `docs/BRAND-VOICE.md` — for tone and copy style
6. Read other polished pages for style reference: `src/pages/Gallery.tsx` or `src/pages/Treasury.tsx`

## Architecture Context

- **CSS Architecture:** Single `theme.css` for all visuals. Tailwind for layout only (flex, grid, gap, padding, margin, width, height, responsive). No `!important` ever. No inline styles for colors. Use `.card`, `.btn`, `.badge` classes.
- **Route:** `/shop` — do NOT rename this route
- **Current state:** Renders `<ShopComponent />` which is a mostly-built shop UI with currency system (oranges, gems) but an empty catalog

## What to Build

Use `/brainstorm` to explore the approach, then `/write-plan`, then `/execute-plan`.

### Option A: Polished "Coming Soon" Page (Recommended for Launch)

Replace the stub with a visually appealing coming soon page that:

1. **Hero section** — Large heading "The Shop" with a subheading like "Stock is being loaded..." or "Shelves are being stocked" (check BRAND-VOICE.md for tone — it should be playful/degen-adjacent)
2. **Preview cards** — 3-4 card-static cards showing blurred/silhouetted item categories:
   - Profile Frames
   - Chat Badges
   - Generator Unlocks
   - Custom Colors
3. **Visual polish** — Use the existing design language:
   - `var(--color-surface)` background cards
   - `var(--color-primary)` accent for highlights
   - `var(--glow-primary)` for a subtle glow on the heading
   - Responsive grid (1 col mobile, 2 col tablet, 3-4 col desktop)
4. **No fake countdown timer** — Just a clean static page

### Option B: Hide from Navigation

If the shop is too unfinished, hide the nav link but keep the route working (so existing links don't break):

1. Remove "Shop" from the navigation component
2. Keep the route in the router
3. Show a simple "Coming soon" message if someone navigates directly

### Implementation Notes

**Use these CSS patterns from theme.css:**
```tsx
// Page container
<div className="p-4 md:p-6 max-w-6xl mx-auto">

// Section heading with glow
<h1 className="text-3xl font-bold" style={{ textShadow: 'var(--glow-primary)' }}>

// Preview cards in responsive grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <div className="card-static p-6 flex flex-col items-center gap-3">
    <span className="text-4xl">icon</span>
    <h3 className="font-semibold">Category Name</h3>
    <span className="badge">Coming Soon</span>
  </div>
</div>

// Muted description text
<p className="text-secondary text-center">
```

**Brand voice reference:** The site has a playful, degen-friendly tone. Think "Shelves are being stocked. Your credits are safe." Not corporate. Not cringe.

## What NOT to Do

- Do NOT build actual shop functionality (purchasing, inventory, etc.) — that's post-launch
- Do NOT add new CSS files — use theme.css classes
- Do NOT use `!important` in CSS
- Do NOT use inline styles for colors — use CSS variables or theme classes
- Do NOT rename the `/shop` route
- Do NOT add new dependencies
- Do NOT create a countdown timer or email signup form
- Do NOT remove the ShopComponent file — just don't render it on the coming-soon page (keep it for later)

## Constraints

- Follow CSS architecture strictly: theme.css for visuals, Tailwind for layout
- Use existing component patterns: `.card-static`, `.btn`, `.badge`, `.text-secondary`
- Make it responsive (mobile-first)
- Keep it under 100 lines — this is a simple page
- Match the visual quality of Treasury or Gallery pages
