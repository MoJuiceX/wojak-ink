# Handoff: Wojak Swipe Launch

> Execute these tasks for Friday launch.
> Full research spec: `docs/specs/your-wojak-next-phase.md`
> Read that file first for all context, code snippets, file paths, and line numbers.

---

## Task Order (execute sequentially)

### Task 1: Fix DID Indexer Collection IDs
**File:** `workers/did-indexer/worker.ts` lines 11-12
**Action:** Replace both collection ID constants:
```ts
const PHASE1_COLLECTION = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah';
const PHASE2_COLLECTION = 'col1rhrjj6f28tge783rp0lrj8ct7vnq79xsnklx3up49lgpnge62ensr2tyfx';
```
**Why:** Both are currently wrong. Phase 1 has a bogus ID, Phase 2 has Phase 1's ID.
**Commit message:** `fix: correct collection IDs in DID indexer (Phase 1 = Wojak Farmers Plot, Phase 2 = Your Wojak)`

---

### Task 2: Rebrand Routes to /swipe
**Files:** `src/App.tsx`
**Action:**
- Change all `path="your-wojak"` to `path="swipe"`
- Change `path="your-wojak/dashboard"` to `path="swipe/dashboard"`
- Change `path="your-wojak/battles"` to `path="swipe/battles"`
- Change `path="your-wojak/leaderboard"` to `path="swipe/leaderboard"`
- Add redirect routes: `<Route path="your-wojak" element={<Navigate to="/swipe" replace />} />`
- Same for your-wojak/dashboard, your-wojak/battles, your-wojak/leaderboard
- Search codebase for any other references to `/your-wojak` and update them

**Also update:** Any `<Link to="/your-wojak">` or `navigate('/your-wojak')` calls in components.
**Commit message:** `feat: rebrand routes from /your-wojak to /swipe (Wojak Swipe)`

---

### Task 3: Add Wojak Swipe to Navigation
**File:** `src/config/routes.ts`
**Action:** Add to PRIMARY_NAV_ITEMS array (after Games, before Leaderboard):
```ts
{
  id: 'swipe',
  path: '/swipe',
  label: 'Wojak Swipe',
  shortLabel: 'Swipe',
  icon: Heart,  // import { Heart } from 'lucide-react'
  badge: 'dot',
  children: [
    { id: 'swipe-dashboard', path: '/swipe/dashboard', label: 'Dashboard', icon: Heart },
    { id: 'swipe-battles', path: '/swipe/battles', label: 'Battles', icon: Heart },
    { id: 'swipe-leaderboard', path: '/swipe/leaderboard', label: 'Leaderboard', icon: Heart },
  ]
},
```
Add `Heart` to the lucide-react import at top of file.
**Commit message:** `feat: add Wojak Swipe to sidebar navigation`

---

### Task 4: Add WojakSwipeCard to GamesHub
**File:** Create `src/components/game/WojakSwipeCard.tsx`, edit `src/pages/GamesHub.tsx`
**Action:**
- Create a card component linking to `/swipe` with "Wojak Swipe" branding
- Use `card-static` class, `btn btn-primary`, theme CSS classes (no inline colors)
- Insert it in GamesHub center column BEFORE `{gamesGridWithVoting}` (see spec section 4 for exact line numbers)
- Insert in both desktop and mobile layouts
**Commit message:** `feat: add Wojak Swipe entry card to GamesHub`

---

### Task 5: Add PageSEO to All Swipe Pages
**Files:** `src/pages/GameVoting.tsx`, `src/pages/GameDashboard.tsx`, `src/pages/GameBattles.tsx`, `src/pages/GameLeaderboard.tsx`
**Action:**
- Replace `document.title` hack in GameVoting.tsx with `<PageSEO>` component
- Add `<PageSEO>` to other 3 pages (see spec section 5 for exact props)
- Import from `@/components/seo`
**Commit message:** `feat: add PageSEO to all Wojak Swipe pages`

---

### Task 6: Set Up Battle Resolution Cron
**Action:** Add a scheduled trigger that calls POST `/api/game/battle-resolve` every hour.
Options:
- Cloudflare Cron Trigger in the DID indexer worker's `wrangler.toml`
- Or a separate lightweight worker
**Commit message:** `feat: add hourly battle resolution cron trigger`

---

### Task 7 (if time): Wire Up DID Retrieval
**Files:** `src/sage-wallet/useSageWalletStandalone.ts`, `src/components/game/GateChecklist.tsx`, `src/contexts/GameContext.tsx`
**Action:** See spec section 3 for two approaches:
- Option A: Call `chia_getNFTWalletsWithDIDs` via WalletConnect RPC
- Option B: Query MintGarden API `https://api.mintgarden.io/address/${address}/dids`
Auto-register when DID is found. Update GateChecklist to reflect detected state.
**Commit message:** `feat: auto-detect DID from wallet and register for Wojak Swipe`

---

## Verification

After all tasks, run:
```bash
npx tsc -b          # TypeScript clean
npm run build        # Build succeeds
```

Search for any remaining references to old routes:
```bash
grep -r "your-wojak" src/ --include="*.tsx" --include="*.ts"
```
Should return 0 results (only redirects in App.tsx are acceptable).
