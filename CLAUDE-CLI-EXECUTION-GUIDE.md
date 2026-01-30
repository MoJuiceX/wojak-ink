# Claude CLI Execution Guide — Premium Upgrade

## Codebase Status (January 29, 2026)

| Check | Status |
|-------|--------|
| TypeScript errors | 0 ✓ |
| ESLint errors | 0 ✓ |
| Bundle optimized | 63% smaller ✓ |
| Layout fixed | ✓ (restored `@theme`, `body`, `#root`) |
| Branch | `main` |

**Important:** The `src/index.css` file contains a critical `@theme` block for Tailwind v4. DO NOT modify `index.css`. All CSS additions go to `src/styles/theme.css`.

---

## Implementation Documents

| Document | Purpose |
|----------|---------|
| `PREMIUM-UPGRADE-MASTER.md` | Overview and architecture |
| `CSS-PREMIUM-ADDITIONS.md` | All CSS to append to theme.css |
| `COMPONENT-UPGRADES.md` | Files to create and modify |
| `BIGPULP-AI-ENHANCEMENT.md` | BigPulp streaming UI (critical) |

---

## Execution Order

### Phase 1: CSS Foundation (20 min)

**File:** `src/styles/theme.css`

1. Open `CSS-PREMIUM-ADDITIONS.md`
2. Add all variables to existing `:root` section:
   - Rarity colors
   - Matrix theme colors
   - Glass morphism variables
3. Append all component styles after existing sections:
   - Premium cards
   - Enhanced buttons
   - Loading states
   - Info button
   - Account styles
   - BigPulp/Matrix theme
   - Tabs
   - Rarity badges
   - Glow animations
   - Scroll-driven animations

**Verify:**
```bash
npm run build
```

---

### Phase 2: Type Definitions (5 min)

**Create:** `src/types/bigpulp.ts`

Copy from `COMPONENT-UPGRADES.md` section 5.

---

### Phase 3: Common Components (15 min)

**Create:**
1. `src/components/common/InfoButton.tsx`
2. `src/components/common/PageInfoContent.tsx`
3. `src/components/common/index.ts` (exports)

Copy from `COMPONENT-UPGRADES.md` sections 1-2.

**Verify:**
```bash
npm run build
```

---

### Phase 4: Account Components (15 min)

**Create:**
1. `src/components/Account/ProfileHero.tsx`
2. `src/components/Account/QuickStats.tsx`
3. `src/components/Account/index.ts` (exports)

Copy from `COMPONENT-UPGRADES.md` sections 3-4.

---

### Phase 5: BigPulp Hook (5 min)

**Create:** `src/hooks/useContextualPrompts.ts`

Copy from `COMPONENT-UPGRADES.md` section 6.

---

### Phase 6: Page Modifications (30 min)

Follow `COMPONENT-UPGRADES.md` "Files to Modify" section:

1. **`src/pages/GamesHub.tsx`**
   - Filter to playable games only
   - Consolidate to single right sidebar
   - Add collapsible "Coming Soon" section
   - Add `<InfoButton page="games" />`

2. **`src/pages/Shop.tsx`**
   - Filter to categories with items
   - Add footer text
   - Add `<InfoButton page="shop" />`

3. **`src/config/routes.ts`**
   - Add `hidden: true` to Guild nav item

4. **`src/pages/Settings.tsx`**
   - Remove "Coming Soon" settings
   - Group settings into sections
   - Add footer text

5. **`src/pages/Account.tsx`**
   - Import ProfileHero, QuickStats
   - Restructure layout
   - Add `<InfoButton page="account" />`

**Verify:**
```bash
npm run build
```

---

### Phase 7: Add InfoButtons to All Pages (10 min)

Add to each page:
```tsx
import { InfoButton } from '@/components/common/InfoButton';
// ... at end of return:
<InfoButton page="..." />
```

| File | page prop |
|------|-----------|
| `src/pages/Gallery.tsx` | `"gallery"` |
| `src/pages/BigPulp.tsx` | `"bigpulp"` |
| `src/pages/Generator.tsx` | `"generator"` |
| `src/pages/Leaderboard.tsx` | `"leaderboard"` |
| `src/pages/ChatHub.tsx` | `"chat"` |
| `src/pages/Treasury.tsx` | `"treasury"` |

---

### Phase 8: BigPulp AI Enhancement (40 min)

**This is the most critical phase.** Follow `BIGPULP-AI-ENHANCEMENT.md`:

1. **Create components:**
   - `src/components/bigpulp/StreamingIndicator.tsx`
   - `src/components/bigpulp/AIResponseCard.tsx`
   - `src/components/bigpulp/QuickPrompts.tsx`

2. **Modify `src/pages/BigPulp.tsx`:**
   - Simplify tabs (2 instead of 3)
   - Keep mascot prominent
   - Integrate streaming indicator
   - Add quick prompts

3. **Modify `src/components/bigpulp/AskTab.tsx`:**
   - Use StreamingIndicator
   - Use AIResponseCard
   - Use QuickPrompts
   - Use useContextualPrompts hook

**Verify:**
```bash
npm run build
```

---

### Phase 9: NFT Rarity Glows (10 min)

**File:** `src/components/gallery/NFTGridItem.tsx` (or equivalent)

Add rarity class helper:
```tsx
const getRarityClass = (rarityRank: number, totalSupply: number = 4200) => {
  const percentile = (rarityRank / totalSupply) * 100;
  if (percentile <= 1) return 'rarity-mythic';
  if (percentile <= 5) return 'rarity-legendary';
  if (percentile <= 15) return 'rarity-epic';
  if (percentile <= 35) return 'rarity-rare';
  if (percentile <= 60) return 'rarity-uncommon';
  return 'rarity-common';
};

// Use in component:
<div className={`nft-card ${getRarityClass(nft.rarityRank)}`}>
```

---

### Phase 10: Final Verification (10 min)

```bash
# Build
npm run build

# Lint
npm run lint

# Start dev server
npm run dev
```

**Manual checks:**
- [ ] Layout renders correctly (not shrunken)
- [ ] Info button (ⓘ) visible on all pages
- [ ] Info button pulses on first visit
- [ ] Info lightbox opens with correct content
- [ ] No "Coming Soon" in main navigation
- [ ] Games hub shows only playable games
- [ ] Shop shows only available categories
- [ ] Account page has avatar hero
- [ ] Account stats animate on load
- [ ] NFT cards glow by rarity on hover
- [ ] BigPulp shows streaming indicator
- [ ] BigPulp quick prompts visible
- [ ] BigPulp mascot is prominent

---

## Time Estimates

| Phase | Duration |
|-------|----------|
| 1. CSS Foundation | 20 min |
| 2. Type Definitions | 5 min |
| 3. Common Components | 15 min |
| 4. Account Components | 15 min |
| 5. BigPulp Hook | 5 min |
| 6. Page Modifications | 30 min |
| 7. InfoButtons | 10 min |
| 8. BigPulp Enhancement | 40 min |
| 9. NFT Rarity Glows | 10 min |
| 10. Final Verification | 10 min |
| **Total** | **~2.5-3 hours** |

---

## Troubleshooting

### Layout Broken
If layout appears shrunken after changes:
1. Check `src/index.css` — must have `@theme`, `body`, `#root` styles
2. Restart dev server (`npm run dev`)
3. Hard refresh browser (Cmd+Shift+R)

### CSS Not Applying
1. Check for syntax errors in theme.css
2. Verify class names match exactly
3. Check CSS variable names are correct

### Build Errors
1. Run `npx tsc --noEmit` for TypeScript errors
2. Check imports are correct (path aliases)
3. Verify all required packages installed

### Framer Motion Not Working
```bash
npm ls framer-motion
# Should show framer-motion installed
```

---

## Post-Implementation

After all phases complete:

1. **Commit changes:**
```bash
git add -A
git commit -m "feat: premium upgrade - glass cards, info buttons, streaming AI, rarity glows"
```

2. **Create PR or push to main**

3. **Test on production build:**
```bash
npm run build
npm run preview
```

---

*Claude CLI Execution Guide*
*Premium Upgrade Implementation*
*January 29, 2026*
