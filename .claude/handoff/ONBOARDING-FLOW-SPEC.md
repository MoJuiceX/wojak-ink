# Onboarding Flow Spec — Launch Friday

**Context:** Read `docs/plans/2026-02-19-fight-club-design.md` for full design.
**Priority:** HIGH — this is what new users see on launch day.

---

## The User Journey

```
1. Visit wojak.ink → Gallery (already the default '/' route)
2. Browse Wojaks → Get curious → Connect wallet
3. See Fight Club ⚔️ in sidebar → Click it
4. Gate check → 3 possible states
5. Guided into action based on state
```

---

## Task 1: Fight Club Gate Screen (No Farmers Plot)

**Where:** `src/pages/FightClub.tsx` (should already exist from FIGHT-CLUB-IMPLEMENTATION.md)

When user has NO Wojak Farmers Plot NFT in their DID:

- Full-page gate screen (replaces all Fight Club content)
- Card-style layout, centered, using `.card` class from theme.css
- Content:
  - ⚔️ Swords icon (large, `var(--color-primary)`)
  - Heading: "Welcome to Fight Club"
  - Subtext: "Hold a Wojak Farmers Plot NFT to vote, battle, and climb the rankings."
  - Current floor price if available (fetch from `/api/mint/pricing` which has `floorPrice`)
  - Primary CTA button: "Buy on MintGarden" → opens `https://mintgarden.io/collections/wojak-farmers-plot` in new tab
  - Below CTA, 3 small feature cards showing what Fight Club offers:
    1. "Vote" — Rate Wojaks, shape the meta
    2. "Battle" — Turn-based combat, earn Power
    3. "Rankings" — Climb the leaderboard
- Use theme.css classes: `.card`, `.btn .btn-primary`, Tailwind for layout
- No `!important`, no inline color styles

---

## Task 2: Fight Club Banner (Has Farmers Plot, No Wojaks)

**Where:** `src/pages/FightClub.tsx` — inside the Battle tab

When user has a Farmers Plot but ZERO Wojaks (new collection) in their DID:

- Vote tab and Rankings tab work normally (no gate)
- Battle tab shows a prominent banner at the TOP:
  - Background: `var(--color-surface)` with `var(--glow-primary)` subtle border
  - Icon: 🎨 or Generator icon
  - Heading: "Mint your first fighter!"
  - Subtext: "Create a Wojak in the Generator to enter the arena."
  - Button: `.btn .btn-primary` → navigates to `/generator`
- Below the banner: show the Rankings component or recent battle replays as "spectate" content so the page isn't empty

---

## Task 3: Connected but No Wallet State

**Where:** `src/pages/FightClub.tsx`

When user hasn't connected their wallet at all:

- Show a connect wallet prompt
- Use existing wallet connection flow (useSageWallet)
- Message: "Connect your wallet to access Fight Club"
- Reuse whatever wallet-connect UI pattern exists in the app

---

## Task 4: Gallery Landing Page Polish

**Where:** `src/pages/Gallery.tsx` (or wherever the Gallery component is)

The Gallery is already the `/` route. For launch, ensure:
- Gallery loads fast with no errors
- Wojak images display correctly
- No broken empty states if no Wojaks have been minted yet
- If there ARE minted Wojaks, they display in a grid
- Consider adding a subtle banner or CTA somewhere: "Create your own Wojak" → `/generator`

This is low-priority polish, not a redesign. Just make sure it works and looks good.

---

## Task 5: Internal Link Updates

Search the ENTIRE codebase and update any links that point to old routes:

- `"/swipe"` → `"/fight-club/vote"`
- `"/arena"` → `"/fight-club/battle"`
- `"/leaderboard"` → `"/fight-club/rankings"`
- `"/swipe/leaderboard"` → `"/fight-club/rankings"`
- `"/arena/leaderboard"` → `"/fight-club/rankings"`

Check: `src/components/game/OnboardingChecklist.tsx`, any nav components, any CTA buttons, any empty state links.

---

## Rules
- Run `npm run build` after each task
- Commit and `git push origin main` after each task
- Use theme.css classes, Tailwind for layout only
- No `!important` ever
- No new CSS files — add to theme.css if needed
