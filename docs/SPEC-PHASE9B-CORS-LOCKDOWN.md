# SPEC: Phase 9B — CORS Origin Lockdown

> **For Claude CLI:** Read this entire spec first. This is the largest fix — 50+ files need updating. Follow `CLAUDE.md` for all conventions.

---

## Problem

Every API endpoint in the project uses `Access-Control-Allow-Origin: '*'`. This means **any website on the internet** can call our APIs from JavaScript. For the mint and credit endpoints, this enables cross-site abuse and data scraping.

The scope is much larger than initially estimated: **50+ files** across `functions/api/` all define local `corsHeaders` with `'*'`.

---

## Strategy

**Do NOT** refactor all 50+ files to import from a shared location. That's too invasive and risky before launch.

**Instead:** Simple find-and-replace. Change `'*'` to `'https://wojak.ink'` in every CORS header, with **two exceptions** (see below).

---

## Files to Read First

1. `functions/api/mint/_shared.ts` — shared CORS for mint endpoints (prepare, confirm, status, upload, pricing)
2. `functions/api/mint/audit.ts` — local CORS (admin endpoint)
3. `functions/api/mint/refund.ts` — local CORS (admin endpoint)
4. `functions/api/chat/token.ts` — **ALREADY has proper origin checking** — DO NOT TOUCH

---

## Exceptions — DO NOT CHANGE

### 1. `functions/api/chat/token.ts`, `functions/api/chat/presence.ts`, `functions/api/chat/verify-eligibility.ts`

These three files already use **dynamic origin validation** with a variable called `allowedOrigin`. They do NOT use `'*'`. **Leave them as-is.**

### 2. Proxy endpoints (CoinGecko, Spacescan, MintGarden, Dexie)

These files act as **CORS proxies** — their entire purpose is to relay third-party API responses to the frontend. They need `'*'` or the proxied origin for the flow to work. However, since our frontend is the only consumer, we should lock them down too.

Files:
- `functions/api/coingecko/[[path]].ts`
- `functions/api/spacescan/[[path]].ts`
- `functions/api/mintgarden/[[path]].ts`
- `functions/api/dexie/[[path]].ts`

**Change these too** — our frontend is the only consumer, and it runs on `https://wojak.ink`.

---

## Complete File List

Run this command to get the definitive list:

```bash
grep -rl "Access-Control-Allow-Origin.*\*" functions/ --include="*.ts"
```

As of this spec, the expected files are (grouped by domain):

### Mint (shared + local):
- `functions/api/mint/_shared.ts` — shared (used by prepare, confirm, status, upload, pricing)
- `functions/api/mint/audit.ts` — local CORS
- `functions/api/mint/refund.ts` — local CORS

### Admin:
- `functions/api/admin/credit-stats.ts` — local CORS
- `functions/api/admin/recent-mints.ts` — local CORS

### Credits:
- `functions/api/credits/leaderboard.ts`
- `functions/api/credits/balance.ts`
- `functions/api/credits/status.ts`
- `functions/api/credits/history.ts`
- `functions/api/credits/audit-events.ts`

### Currency (in-game economy):
- `functions/api/currency/index.ts`
- `functions/api/currency/balance.ts`
- `functions/api/currency/earn.ts`
- `functions/api/currency/spend.ts`
- `functions/api/currency/transactions.ts`
- `functions/api/currency/login-streak.ts`
- `functions/api/currency/achievements.ts`
- `functions/api/currency/init.ts`
- `functions/api/currency/daily-challenges.ts`

### User/Profile/Friends:
- `functions/api/me.ts`
- `functions/api/profile.ts`
- `functions/api/profile/[userId].ts`
- `functions/api/friends.ts`
- `functions/api/friends/[friendId].ts`
- `functions/api/inventory.ts`
- `functions/api/user/stats.ts`

### Games/Leaderboard:
- `functions/api/game/start.ts`
- `functions/api/game/heartbeat.ts`
- `functions/api/gameplay/complete.ts`
- `functions/api/leaderboard/submit.ts`
- `functions/api/leaderboard/[gameId].ts`
- `functions/api/leaderboard/top-per-game.ts`
- `functions/api/scores/[userId].ts`

### Shop/Drawer:
- `functions/api/shop/items.ts`
- `functions/api/shop/purchase.ts`
- `functions/api/shop/bigpulp.ts`
- `functions/api/shop/display.ts`
- `functions/api/shop/equip.ts`
- `functions/api/shop/ring.ts`
- `functions/api/shop/inventory.ts`
- `functions/api/shop/consumables.ts`
- `functions/api/drawer/[userId].ts`
- `functions/api/drawer/customization/purchase.ts`

### Messaging/Votes/Other:
- `functions/api/messages/index.ts`
- `functions/api/messages/unread-count.ts`
- `functions/api/messages/[id]/read.ts`
- `functions/api/votes/index.ts`
- `functions/api/votes/positions.ts`
- `functions/api/votes/counts.ts`
- `functions/api/achievements/claim.ts`
- `functions/api/challenges/claim.ts`
- `functions/api/daily-login/claim.ts`
- `functions/api/gift.ts`

### Sales Data:
- `functions/api/sales/stats.ts`
- `functions/api/sales/history.ts`
- `functions/api/sales/sync-status.ts`
- `functions/api/sales/token-rates.ts`
- `functions/api/trade-values.ts`

### Proxy Endpoints:
- `functions/api/coingecko/[[path]].ts` — has multiple CORS instances (3)
- `functions/api/spacescan/[[path]].ts` — has multiple CORS instances (3)
- `functions/api/mintgarden/[[path]].ts` — has multiple CORS instances (3)
- `functions/api/dexie/[[path]].ts` — has multiple CORS instances (3)

### Debug:
- `functions/api/auth-debug.ts`

---

## Exact Change Per File

In every file listed above, change:

```typescript
'Access-Control-Allow-Origin': '*',
```

to:

```typescript
'Access-Control-Allow-Origin': 'https://wojak.ink',
```

That's it. One string replacement per CORS header declaration.

**For proxy endpoints** (`coingecko`, `spacescan`, `mintgarden`, `dexie`): These files have **3 CORS declarations each** (success response, error response, and default). Change all 3 in each file.

---

## Local Development Note

After this change, `localhost:5173` will get CORS errors when calling the **production** API. This is expected and fine because:

1. Local dev uses `wrangler pages dev` which serves the API locally — same-origin, no CORS needed
2. Production API should only serve `wojak.ink`

If developers ever need to hit production API from localhost, they can temporarily use a browser CORS extension. This is standard practice.

---

## Verification

```bash
# Zero wildcard CORS remaining
grep -rn "Allow-Origin.*'\*'" functions/ --include="*.ts"
# Expected: ZERO results

# All files now use wojak.ink
grep -rn "Allow-Origin" functions/ --include="*.ts" | head -5
# Expected: every line shows 'https://wojak.ink'

# Chat files untouched (they use allowedOrigin variable)
grep -n "allowedOrigin" functions/api/chat/*.ts
# Expected: still present in token.ts, presence.ts, verify-eligibility.ts

# Build passes
npm run typecheck && npm run build
```

---

## Order of Operations

1. Run the initial grep to confirm the file list
2. Change `_shared.ts` first (covers 5 mint endpoints automatically)
3. Change all other files alphabetically or by directory
4. Run verification greps
5. Build check
