# Manual DID Indexer Refresh

---

## Overview

The DID indexer runs every 30 minutes automatically. Users shouldn't have to wait that long after minting or transferring an NFT. Add a "Refresh" button that triggers an indexer sync for just their DID.

---

## Task 1: Create Manual Refresh API

**File:** `functions/api/profile/refresh-did.ts` (NEW)

**POST /api/profile/refresh-did**

Body: `{ did: string }`

This endpoint:
1. Validates the DID format
2. Rate limits: max 1 refresh per DID per 5 minutes (prevent spam)
3. Runs the SAME sync logic as the DID indexer, but for just this ONE DID:
   - Fetch NFT holdings from MintGarden for this DID
   - Update `did_holdings` table
   - Sync `combat_fighters.owner_did` for any newly detected Wojaks
4. Returns: `{ success: true, nftsFound: number, fightersLinked: number }`

Rate limit implementation: Store `last_refresh_at` in a KV or in-memory check. If < 5 minutes ago, return 429 Too Many Requests.

---

## Task 2: Add Refresh Button to Fight Club

**File:** `src/pages/FightClub.tsx` (or a shared component)

Add a small refresh icon button (🔄 or lucide `RefreshCw`) near the top of the page or in the Battle tab fighter list.

- Click → calls POST /api/profile/refresh-did with user's DID
- Show loading spinner while refreshing
- On success: show toast "Synced! Found X NFTs" and re-fetch fighter list
- On rate limit (429): show toast "Please wait 5 minutes between refreshes"
- Use `.btn .btn-ghost` style, small icon button

---

## Task 3: Add Refresh Button to Account/Settings

**File:** `src/pages/Account.tsx` or `src/pages/Settings.tsx`

Same refresh button in the account area, for users who want to sync their holdings outside of Fight Club.

---

## Rules
- Run `npm run build` after each task
- Commit and `git push origin main`
- Reuse the DID indexer's existing sync logic — don't duplicate it, extract it into a shared function if needed
