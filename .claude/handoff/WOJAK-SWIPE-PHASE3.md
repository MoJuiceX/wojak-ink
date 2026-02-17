# Wojak Swipe Phase 3 — Handoff for CLI Session

> Written by macOS app session (advisor role).
> Date: 2026-02-17
> Full spec: `docs/specs/wojak-swipe-phase3.md`

---

## Overview

Phase 3 completes the Wojak Swipe feature with:
1. Functional burn button in the NFT detail modal
2. Vote activity logging to game_activity
3. Battle resolution cron worker
4. Production database verification
5. Deploy

## Read First

- `docs/specs/wojak-swipe-phase3.md` — **full spec with code samples**
- `src/components/game/CollectionScroll.tsx` — NftDetailModal to modify
- `src/components/game/BurnButton.tsx` — existing burn component to wire in
- `functions/api/game/vote.ts` — vote endpoint needing activity logs
- `functions/api/game/burn.ts` — has `calculateBurnCredits` to extract

---

## Tasks (in order)

### Task 1: Create shared `calculateBurnCredits` utility
- Create `src/lib/burnCredits.ts` with the credit estimation formula (copied from burn.ts lines 13-27)
- Commit: `feat: extract calculateBurnCredits to shared utility`

### Task 2: Wire BurnButton into NftDetailModal
- Modify `src/components/game/CollectionScroll.tsx`
- Replace no-op Burn button with on-demand coin ID fetch + real BurnButton
- **KEY**: Must test `https://api.mintgarden.io/nfts/{nftId}` to find correct coin ID field name (`nft_coin_id`, `coin_id`, or `encoded_id`)
- See spec section 1 for full code sample
- Commit: `feat: wire burn button into NFT detail modal with on-demand coin ID fetch`

### Task 3: Add vote activity logging
- Modify `functions/api/game/vote.ts`
- Add activity inserts to batch: first vote + every 10th vote
- See spec section 2 for exact code
- Commit: `feat: log vote milestones to game_activity (1st + every 10th vote)`

### Task 4: Create battle resolution cron worker
- Create `workers/battle-cron/worker.ts` — hourly POST to `/api/game/battle-resolve`
- Create `workers/battle-cron/wrangler.toml` — cron: `0 * * * *`
- Commit: `feat: add hourly battle resolution cron worker`

### Task 5: Verify database migrations
```bash
npx wrangler d1 execute wojak-users --remote --command \
  "SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE 'game_%' OR name LIKE 'battle%' OR name LIKE 'wojak%' OR name = 'did_holdings' OR name = 'nft_names') ORDER BY name;"
```
If missing, apply: `045_game_foundation.sql`, `048_burn_tracking.sql`, `049_battles.sql`

### Task 6: Deploy battle-cron worker
```bash
cd workers/battle-cron && npx wrangler deploy
```

### Verification
```bash
npx tsc -b          # TypeScript clean
npm run build       # Build succeeds
```

## Items Already Confirmed — No Changes Needed
- **QuickActions burn** — already scrolls to `#collection-section` correctly
- **Cross-navigation** — all 20+ links use `/swipe/*` consistently
- **DID indexer cron** — configured and running every 30 minutes
