# Phase 3: Live XCH Price Feed

## What This Is

The XCH price is currently hardcoded to `$5.35` in `src/stores/walletStore.ts` line 91. The Treasury page shows portfolio values based on this stale number. You will replace it with a live price that updates automatically.

## Before You Start

1. Read `CLAUDE.md` for project conventions (especially: never hardcode XCH prices, use constants or env vars)
2. Read `src/stores/walletStore.ts` — find the `xchPrice = 5.35` TODO on line 91
3. Read `functions/api/coingecko/` — there may already be a CoinGecko proxy endpoint
4. Read `src/pages/Treasury.tsx` — understand how Treasury uses the price
5. Read `functions/migrations/043_server_state.sql` — the `server_state` table is a key-value store that already exists

## Architecture Context

- **Frontend:** React + Zustand stores + Vite (localhost:5173)
- **Backend:** Cloudflare Pages Functions (API routes)
- **Database:** Cloudflare D1 (SQLite)
- **Existing pattern:** `server_state` table stores key-value flags (e.g., `sold_out`, `minting_paused`)
- **Existing endpoint directory:** `functions/api/coingecko/` — check if there's already something here

## What to Build

Use `/brainstorm` to explore the approach, then `/write-plan`, then `/execute-plan`.

### Option A: Client-Side CoinGecko Fetch (Simplest)

The frontend directly calls the CoinGecko free API:
```
GET https://api.coingecko.com/api/v3/simple/price?ids=chia&vs_currencies=usd
```
Response: `{ "chia": { "usd": 5.35 } }`

- Fetch on app load, cache in Zustand store
- Refresh every 5 minutes
- Fallback to last known price if fetch fails
- No backend changes needed

### Option B: Server-Side Cache in D1 (More Robust)

1. Create `functions/api/xch-price.ts` — GET endpoint that reads from `server_state` WHERE key = `xch_price_usd`
2. Create a cron worker or GitHub Action that updates the price every 5 minutes:
   - Fetch from CoinGecko
   - UPSERT into `server_state` with key `xch_price_usd`
3. Frontend calls your own endpoint instead of CoinGecko directly

### Recommended: Option A with fallback

CoinGecko's free tier allows 10-30 calls/min. With client-side fetching + 5-min cache, you'll never hit the limit. Server-side caching is better long-term but more infrastructure for a simple price display.

### Implementation Details

**In `walletStore.ts`:**
- Replace `const xchPrice = 5.35;` with a store value
- Add `xchPrice: number` to the store state (default: 0 or null)
- Add `fetchXchPrice()` action that calls CoinGecko
- Call `fetchXchPrice()` on store initialization
- Set up a 5-minute refresh interval
- On fetch failure: keep the last successful price, log the error

**In Treasury or wherever the price is displayed:**
- Show a loading state if price hasn't loaded yet
- Show "Price unavailable" if the first fetch fails
- Show the price with a subtle "updated X min ago" indicator (optional)

### CoinGecko API Details

- **Free tier:** No API key needed for simple price endpoint
- **Rate limit:** 10-30 calls/min (varies)
- **Endpoint:** `https://api.coingecko.com/api/v3/simple/price?ids=chia&vs_currencies=usd`
- **Response:** `{ "chia": { "usd": 5.35 } }`
- **CORS:** Allowed from browser

## What NOT to Do

- Do NOT hardcode a new price — use a live feed
- Do NOT add a paid API key — free tier is sufficient
- Do NOT call CoinGecko on every render — cache with interval
- Do NOT add new npm dependencies for this — `fetch` is built in
- Do NOT break the Treasury page if the fetch fails — always have a fallback
- Do NOT use `!important` in any CSS

## Constraints

- Follow the CSS rules in CLAUDE.md (theme.css for visuals, Tailwind for layout)
- If you add a backend endpoint, put it in `functions/api/` following existing patterns
- Use `jsonResponse()` and `errorResponse()` from the existing shared helpers if adding backend
- The price should be in USD
- Store should handle the case where CoinGecko is temporarily down
