# Audit: Why Wojak Rankings Show Empty on localhost:5174

## Summary

On localhost:5174, Fight Club → Rankings → Wojaks shows "No Wojak rankings yet" even when 14 Wojaks have been voted on. This audit explains why and what to do.

## Root cause (most likely)

### 1. Local dev uses **production** API

In `vite.config.ts`, `/api` is proxied to **production**:

```ts
proxy: {
  '/api': { target: 'https://wojak.ink', changeOrigin: true, secure: true },
  ...
}
```

So when you open `http://localhost:5174/fight-club/rankings` and the frontend calls:

- `GET /api/combat/power-leaderboard?type=wojaks&limit=50`

that request goes to **https://wojak.ink**, not to a local backend. The response (and any empty list) comes from **production’s database**.

### 2. Data lives where votes were cast

- Votes are written to `wojak_scores` by `functions/api/game/vote.ts` (and battle-resolve).
- If the 14 Wojaks were voted on **only in local** (e.g. wrangler dev + local D1), those rows exist only in the **local** DB. Production’s `wojak_scores` would have no (or fewer) rows, so production correctly returns an empty (or smaller) Wojak list.
- If the 14 were voted on **on production** (wojak.ink), then production’s `wojak_scores` should have rows and the **deployed** power-leaderboard logic must be the one that includes them.

### 3. Deploy and code version

The Wojak ranking list is built by:

- `functions/api/combat/power-leaderboard.ts` with `type=wojaks`
- A CTE `all_nfts` = `phase2_mints` (minted) **UNION** `wojak_scores` (voted, not already in phase2_mints)
- So **any** NFT that appears in `wojak_scores` should appear in the list (even if not in `phase2_mints`).

If **production has not been deployed** with this version of the power-leaderboard, production might still be running older code that:

- Only reads from `phase2_mints`, or
- Uses a different query that returns no Wojaks,

and you would see an empty list even when production’s `wojak_scores` has data.

### 4. API errors look like “empty”

The Rankings UI treats both cases the same:

- API returns 200 with `{ wojaks: [] }` → “No Wojak rankings yet”
- API returns 500 or network error → `usePowerLeaderboard` throws → same empty state and message

So you cannot tell from the UI whether the list is truly empty or the request failed.

## What to do

1. **Confirm where the 14 Wojaks were voted on**  
   - If only in local/dev DB → rankings on localhost will keep showing production data; either point dev at a local API or accept that rankings reflect production.

2. **Ensure production has the latest code and migrations**  
   - Deploy the current `power-leaderboard.ts` (with the CTE + `wojak_scores` UNION).  
   - Ensure production has run migration `068_burn_tracking.sql` (adds `combat_fighters.burned_at`), which the current query uses.

3. **Inspect the real API response**  
   - Open DevTools → Network.  
   - Reload Fight Club → Rankings → Wojaks.  
   - Find the request to `power-leaderboard?type=wojaks&limit=50`.  
   - Check: status (200 vs 4xx/5xx) and response body (`wojaks` array length and content).  
   - If 500, check production logs for the power-leaderboard handler.

4. **Optional: distinguish error vs empty in the UI**  
   - Show a different message when the leaderboard request fails (e.g. “Couldn’t load rankings. Try again.”) so “No Wojak rankings yet” is reserved for a successful empty list.

## Files involved

- **Proxy:** `vite.config.ts` (server.proxy `/api` → wojak.ink)
- **API:** `functions/api/combat/power-leaderboard.ts` (wojaks branch: CTE + `wojak_scores`)
- **UI:** `src/components/combat/FightClubRankings.tsx` (WojaksTab, `usePowerLeaderboard('wojaks')`)
- **Vote write:** `functions/api/game/vote.ts` (writes to `wojak_scores`)

## Self-check

- [ ] Production deployed with latest `power-leaderboard.ts`
- [ ] Production DB has migration 068 (combat_fighters.burned_at)
- [ ] Network tab shows 200 and `wojaks` array for `type=wojaks`
- [ ] If 200 and empty, confirm the 14 votes exist in production’s `wojak_scores` (e.g. via DB or another API that reads it)
