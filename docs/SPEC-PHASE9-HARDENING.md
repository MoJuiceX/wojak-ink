# SPEC: Phase 9 — Security Hardening & Cleanup

> **For Claude CLI:** Read this entire spec top to bottom, then read every file listed in each fix's "Files to Read" before making changes. Follow `CLAUDE.md` for all conventions. Execute fixes in order — some depend on earlier ones.

---

## Context

The Phase 8 pre-launch audit flagged 8 items. This spec addresses all of them, organized from highest severity to lowest. Fixes 1-2 are **mandatory before launch** (security). Fixes 3-5 are **strongly recommended**. Fixes 6-8 are **cleanup** (do if time allows).

---

## Fix 1: Admin Endpoint Authentication (HIGH — Security)

### Problem

The two admin API endpoints have **zero authentication**. Anyone who discovers the URLs can read internal data:
- `/api/admin/recent-mints` — exposes wallet addresses, mint details, pricing
- `/api/admin/credit-stats` — exposes aggregate credit system metrics

This is a data leak waiting to happen. Bots routinely scan for `/api/admin/*` paths.

### Files to Read

1. `functions/api/admin/credit-stats.ts` — **unprotected** admin endpoint
2. `functions/api/admin/recent-mints.ts` — **unprotected** admin endpoint
3. `functions/api/mint/audit.ts` — **has auth** (the pattern to copy)
4. `functions/api/mint/refund.ts` — **has auth** (same pattern)

### What the Auth Pattern Looks Like

The `audit.ts` and `refund.ts` endpoints already use `ADMIN_SECRET`:

```typescript
interface Env {
  DB: D1Database;
  ADMIN_SECRET?: string;  // Set via wrangler secret
}

// Inside the handler, before any DB queries:
const authHeader = request.headers.get('Authorization');
if (!env.ADMIN_SECRET || authHeader !== `Bearer ${env.ADMIN_SECRET}`) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: corsHeaders,
  });
}
```

### Solution

Apply the **exact same pattern** to both admin endpoints:

#### `functions/api/admin/credit-stats.ts`

1. Add `ADMIN_SECRET?: string;` to the `Env` interface
2. Add the auth check block (shown above) **immediately after** the method check (`if (request.method !== 'GET')`) and **before** the DB check (`if (!env.DB)`)
3. Add `'Authorization'` to the `Access-Control-Allow-Headers` CORS header (currently only `'Content-Type'`)

#### `functions/api/admin/recent-mints.ts`

Same three changes as above.

### Verification

After changes:
- Both files should have `ADMIN_SECRET` in `Env`
- Both files should return 401 when:
  - No `Authorization` header is sent
  - `ADMIN_SECRET` env var is not set
  - Bearer token doesn't match
- CORS headers should include `Authorization` in `Allow-Headers`
- Grep: `grep -r "ADMIN_SECRET" functions/api/admin/` should match both files

### Frontend Impact

The `Admin.tsx` page fetches these endpoints. It will need to send the auth header.

Read `src/pages/Admin.tsx` and find where it calls `/api/admin/recent-mints` and `/api/admin/credit-stats`. Update those `fetch()` calls to include:

```typescript
headers: {
  'Authorization': `Bearer ${adminSecret}`,
}
```

The admin secret should come from a URL query parameter: `?secret=xxx`. Read it with:

```typescript
const params = new URLSearchParams(window.location.search);
const adminSecret = params.get('secret') || '';
```

If the admin secret is missing or empty, show a message: "Admin access requires ?secret= parameter" instead of fetching data.

**Do NOT:**
- Store the admin secret in localStorage
- Hardcode the admin secret
- Create an env var or config file containing it on the frontend

---

## Fix 2: CORS Origin Restriction (HIGH — Security)

### Problem

Every API endpoint uses `Access-Control-Allow-Origin: '*'`. This means any website on the internet can make requests to the mint, credit, and admin APIs from JavaScript — enabling cross-site request abuse, data scraping, and potential CSRF-adjacent attacks.

### Files to Read

1. `functions/api/mint/_shared.ts` — centralized CORS for mint endpoints
2. `functions/api/admin/credit-stats.ts` — local CORS
3. `functions/api/admin/recent-mints.ts` — local CORS
4. `functions/api/credits/leaderboard.ts` — local CORS
5. `functions/api/credits/balance.ts` — local CORS
6. `functions/api/credits/history.ts` — local CORS

### Solution

**Step 1:** Update `functions/api/mint/_shared.ts` — change the origin:

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://wojak.ink',  // was '*'
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};
```

This automatically fixes all mint endpoints that import from `_shared.ts` (`prepare.ts`, `confirm.ts`, `status.ts`, `upload.ts`, `audit.ts`, `refund.ts`, `pricing.ts`).

**Step 2:** Update every other API file that defines its own `corsHeaders` locally. Search for them:

```bash
grep -rn "Access-Control-Allow-Origin" functions/ --include="*.ts"
```

For each file found, change `'*'` to `'https://wojak.ink'`.

**Expected files to update (confirm with grep):**
- `functions/api/admin/credit-stats.ts`
- `functions/api/admin/recent-mints.ts`
- `functions/api/credits/leaderboard.ts`
- `functions/api/credits/balance.ts`
- `functions/api/credits/history.ts`
- `functions/api/credits/status.ts`
- Any other files the grep finds

**Step 3:** Handle local development. Developers need `localhost:5173` to work. Add a helper function to `functions/api/mint/_shared.ts`:

```typescript
const ALLOWED_ORIGINS = ['https://wojak.ink', 'http://localhost:5173'];

export function getCorsOrigin(request: Request): string {
  const origin = request.headers.get('Origin') || '';
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}
```

Then update `corsHeaders` to be a function:

```typescript
export function makeCorsHeaders(request: Request) {
  return {
    'Access-Control-Allow-Origin': getCorsOrigin(request),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
    'Vary': 'Origin',  // Required when origin varies
  };
}
```

**Important:** This changes the signature. `corsHeaders` was a static object; `makeCorsHeaders(request)` takes the request. You will need to update:
- `jsonResponse` — now needs `request` parameter
- `errorResponse` — now needs `request` parameter
- `optionsResponse` — now needs `request` parameter
- Every caller of these functions

**This is a significant refactor.** If the scope feels too large, use a simpler approach:

**Simpler Alternative (if refactor is too invasive):**

Keep `corsHeaders` as a static object but set origin to `'https://wojak.ink'`. Skip the dynamic localhost handling. Developers can use a browser extension or proxy for local testing, or temporarily change it during development.

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://wojak.ink',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};
```

**Choose ONE approach** — dynamic (thorough) or static (simple). Both are acceptable. The dynamic approach is better engineering; the static approach ships faster.

### Verification

After changes:
- `grep -rn "Allow-Origin.*\*" functions/` should return **zero results**
- Every API file should use `https://wojak.ink` as the allowed origin
- Build must pass: `npm run typecheck && npm run build`

---

## Fix 3: Image MIME Validation (MEDIUM — Security)

### Problem

The upload endpoint (`/api/mint/upload.ts`) accepts any base64 data and uploads it to IPFS via Pinata. There's no validation that the uploaded data is actually a WebP image. Someone could upload arbitrary data (executable, HTML, etc.) and store it permanently on IPFS under the project's account.

### Files to Read

1. `functions/api/mint/upload.ts` — the upload endpoint
2. `functions/api/mint/uploadToIPFS.ts` — the actual IPFS upload function
3. `functions/api/mint/prepare.ts` — calls `uploadToIPFS()` directly

### Solution

Add a WebP magic byte check before uploading. WebP files start with bytes `RIFF` at offset 0 and `WEBP` at offset 8.

In `functions/api/mint/uploadToIPFS.ts` (or wherever the base64 is decoded to a buffer), add this validation **before** the Pinata API call:

```typescript
function isValidWebP(buffer: Uint8Array): boolean {
  if (buffer.length < 12) return false;
  // RIFF header at bytes 0-3
  const riff = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
  // WEBP signature at bytes 8-11
  const webp = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
  return riff && webp;
}
```

Use it right after decoding base64:

```typescript
const imageBuffer = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
if (!isValidWebP(imageBuffer)) {
  throw new Error('Invalid image: expected WebP format');
}
```

Read `uploadToIPFS.ts` to find exactly where the base64 is decoded and add the check there. If the base64 decoding happens in `prepare.ts` before calling `uploadToIPFS()`, add the check in `prepare.ts` instead.

### Verification

- Upload with valid WebP base64 should succeed (existing behavior)
- The `isValidWebP` function should exist somewhere in the upload flow
- Build must pass

---

## Fix 4: Leaderboard SQL Optimization (MEDIUM — Performance)

### Problem

`functions/api/credits/leaderboard.ts` fetches **every wallet** from the database into JavaScript, sorts in memory, then paginates with `Array.slice()`. With ~200 wallets this works, but it's architecturally wrong and will break at scale.

### Files to Read

1. `functions/api/credits/leaderboard.ts` — the full file (already uses CTEs)

### Current Pattern (Bad)

```typescript
// Fetches ALL rows
const rows = await env.DB.prepare(query).all();

// Sorts in JS
entries.sort((a, b) => b.earned - a.earned);

// Paginates in JS
const top = entries.slice(offset, offset + limit);
```

### Solution

Move sorting and pagination into SQL. The query already uses CTEs (`WITH wallets AS (...), earned AS (...), ...`). Add `ORDER BY` and `LIMIT/OFFSET` to the final SELECT:

```sql
-- For sort=earned (default):
ORDER BY COALESCE(e.total, 0) DESC
LIMIT ? OFFSET ?

-- For sort=available:
ORDER BY (COALESCE(e.total, 0) - COALESCE(s.total, 0)) DESC,
         COALESCE(e.total, 0) DESC
LIMIT ? OFFSET ?

-- For sort=bought:
ORDER BY COALESCE(b.cnt, 0) DESC,
         COALESCE(e.total, 0) DESC
LIMIT ? OFFSET ?
```

**Implementation approach:**

1. Build the ORDER BY clause dynamically based on the `sort` parameter
2. Append `LIMIT ? OFFSET ?` to the query
3. Bind `limit` and `offset` as parameters
4. Remove the JS `.sort()` and `.slice()` calls
5. The `.map()` for calculating `balance`, `freeMints`, etc. stays — that's fine

**Important:** The `sort` parameter must be validated against a whitelist (`earned`, `available`, `bought`). Do NOT interpolate user input into SQL. Build the ORDER BY string from a lookup object:

```typescript
const orderByMap: Record<string, string> = {
  earned: 'COALESCE(e.total, 0) DESC',
  available: '(COALESCE(e.total, 0) - COALESCE(s.total, 0)) DESC, COALESCE(e.total, 0) DESC',
  bought: 'COALESCE(b.cnt, 0) DESC, COALESCE(e.total, 0) DESC',
};
const orderBy = orderByMap[sort] || orderByMap.earned;
```

Then append to the query string: `` `${query} ORDER BY ${orderBy} LIMIT ? OFFSET ?` ``

This is safe because `orderBy` comes from a fixed map, not user input.

6. Also add `rank` calculation. Since we're no longer using JS index, calculate rank with SQL:

```sql
ROW_NUMBER() OVER (ORDER BY ...) AS rank
```

Or keep the simpler approach of `offset + index + 1` in the JS `.map()` since offset is known.

### Also Fix: The Fallback Query

The file has a `try/catch` fallback query (lines 82-97) for when `phase2_mints` table doesn't exist. Apply the same `ORDER BY` + `LIMIT` treatment to the fallback query.

### Verification

- Leaderboard API should return same results as before (same sort order, same data)
- JS code should NOT contain `.sort()` on the entries array
- JS code should NOT contain `.slice()` for pagination
- SQL query should contain `ORDER BY` and `LIMIT`
- Build must pass

---

## Fix 5: Frontend Wallet Validation (MEDIUM — Consistency)

### Problem

The frontend uses `startsWith('xch1')` in 7 places across 3 files for wallet address validation. This is explicitly listed as an anti-pattern in `CLAUDE.md`:

> **Never `startsWith('xch1')` for wallet validation** — use `isValidChiaAddress()` (bech32m regex)

The server-side already uses the proper validation everywhere. The frontend should match.

### Files to Read

1. `src/contexts/MintContext.tsx` — 3 instances
2. `src/sage-wallet/SageWalletProvider.tsx` — 2 instances
3. `src/sage-wallet/useSageWalletStandalone.ts` — 2 instances
4. `functions/lib/validation.ts` — the canonical validation function

### Solution

**Step 1:** Create a frontend copy of the validation function.

The server-side `functions/lib/validation.ts` can't be imported by frontend code (different build context). Create a frontend equivalent:

Create `src/lib/validation.ts`:

```typescript
/**
 * Validate Chia bech32m wallet address format.
 * xch1 prefix + 58 bech32 characters = 62 total.
 * Mirrors functions/lib/validation.ts — keep in sync.
 */
export function isValidChiaAddress(address: string): boolean {
  return /^xch1[a-z0-9]{58}$/.test(address);
}
```

**Step 2:** Replace all 7 instances.

In each file, find every `startsWith('xch1')` and replace with `isValidChiaAddress()`:

#### `src/contexts/MintContext.tsx` (3 instances)

Add import at top:
```typescript
import { isValidChiaAddress } from '../lib/validation';
```

Replace:
- `!address.startsWith('xch1')` → `!isValidChiaAddress(address)`
- All 3 occurrences

#### `src/sage-wallet/SageWalletProvider.tsx` (2 instances)

Add import:
```typescript
import { isValidChiaAddress } from '../lib/validation';
```

Replace:
- `!address.startsWith('xch1')` → `!isValidChiaAddress(address)`
- `!state.address.startsWith('xch1')` → `!isValidChiaAddress(state.address)`

**Note:** Check if any of these are checking a potentially undefined/null address. If so, keep the `!address ||` guard before the validation call:
```typescript
// Before: if (!address || !address.startsWith('xch1'))
// After:  if (!address || !isValidChiaAddress(address))
```

#### `src/sage-wallet/useSageWalletStandalone.ts` (2 instances)

Add import:
```typescript
import { isValidChiaAddress } from '../lib/validation';
```

Replace both instances. One throws an error — keep the throw:
```typescript
// Before: if (!addr.startsWith('xch1')) throw new Error('Invalid address');
// After:  if (!isValidChiaAddress(addr)) throw new Error('Invalid address');
```

### Verification

After changes:
- `grep -rn "startsWith.*xch1" src/` should return **zero results**
- `src/lib/validation.ts` should exist with the same regex as `functions/lib/validation.ts`
- Build must pass

---

## Fix 6: Remove Orphan Pages (LOW — Cleanup)

### Problem

Four page files exist but are not imported or used in `App.tsx`:
- `src/pages/Landing.tsx` (6,127 bytes)
- `src/pages/Onboarding.tsx` (12,640 bytes)
- `src/pages/SettingsPage.tsx` (3,879 bytes)
- `src/pages/Game.tsx` (24,366 bytes)

`App.tsx` has redirect routes for `/landing` → `/gallery` and `/onboarding` → `/gallery`, confirming these pages are deprecated. `SettingsPage.tsx` was replaced by `Settings.tsx`. `Game.tsx` was replaced by individual game components.

These files add dead weight to the codebase and could confuse future development.

### Files to Read

1. `src/App.tsx` — confirm none of these are imported
2. The four files themselves — skim to confirm they're not imported by anything else

### Solution

**Step 1:** Verify no imports exist anywhere:

```bash
grep -rn "from.*Landing" src/ --include="*.ts" --include="*.tsx"
grep -rn "from.*Onboarding" src/ --include="*.ts" --include="*.tsx"
grep -rn "from.*SettingsPage" src/ --include="*.ts" --include="*.tsx"
grep -rn "from.*pages/Game" src/ --include="*.ts" --include="*.tsx"
```

Each grep should return zero results (or only the file importing itself, which doesn't count).

**Step 2:** If confirmed unused, delete all four files:

- `src/pages/Landing.tsx`
- `src/pages/Onboarding.tsx`
- `src/pages/SettingsPage.tsx`
- `src/pages/Game.tsx`

**Step 3:** Check for associated CSS files. If any of these had companion `.css` files, delete those too:

```bash
ls src/pages/Landing.css src/pages/Onboarding.css src/pages/SettingsPage.css src/pages/Game.css 2>/dev/null
```

**Do NOT** delete the redirect routes in `App.tsx` — those are still useful for users who bookmarked old URLs.

### Verification

- The four `.tsx` files should no longer exist
- No import errors — build must pass
- Redirect routes in App.tsx still work

---

## Fix 7: Clean Up Stale TODOs (LOW — Hygiene)

### Problem

20 TODO comments remain in the codebase. Most are legitimate future work, but a few reference things that are already done or are misleading.

### Files to Read

Skim each file listed below. For each TODO, decide: is this still valid future work, or is it stale?

### TODOs to Clean Up

#### Stale — should be removed or updated:

1. **`functions/api/mint/prepare.ts:207`**
   ```
   // TODO: Extract upload logic into shared function to eliminate self-fetch
   ```
   **This was already done** (FIX 2 from the mint audit). The self-fetch is gone. `uploadToIPFS()` is now imported directly. **Delete this comment.**

#### Legitimate — leave as-is:

These are real future work items. Don't delete them, but if you want to be thorough, you can standardize the format to `// TODO(future):` so they're clearly flagged as non-blocking:

2. `src/services/dexieSalesService.ts:289` — Connect to NFT data for traits (future feature)
3. `src/services/bigpulpService.ts:841` — Fetch real XCH/USD price (future feature)
4. `src/contexts/AuthContext.tsx:229` — Sage Wallet connection (future feature)
5. `src/stores/walletStore.ts:91` — Get from price feed (future feature)
6. `src/components/chat/ChatRoom.tsx:336` — Display connection errors (future UX)
7. `src/pages/Profile.tsx:333` — Edit profile modal (future feature)
8. `src/pages/BigPulp.tsx:253` — Attribute drill-down (future feature)
9. `src/components/bigpulp/MarketTab.tsx:82` — Cell detail modal (future feature)
10. `src/components/ArcadeFrame.tsx:128` — Phase 2 edge pieces (future feature)
11. `scripts/generateTradesMarkdown.ts:64` — CoinGecko historical price (future accuracy)
12-18. `functions/api/profile/[userId].ts` — 7 TODOs for profile fields (future features)

### Solution

1. Delete the stale TODO in `prepare.ts` (item 1 above)
2. Leave all others — they're valid future work
3. **Optional:** If you want, add `(future)` to each remaining TODO to clarify they're non-blocking. This is optional.

### Verification

- The `prepare.ts` self-fetch TODO should be gone
- Build must pass

---

## Fix 8: CSS !important Audit (LOW — Accepted)

### Problem

Three `!important` rules exist in `src/styles/theme.css`. `CLAUDE.md` says "Never `!important` in CSS — ever."

### Files to Read

1. `src/styles/theme.css` — find the three `!important` rules (around line 561)

### Assessment

These three rules are in a `@media (prefers-reduced-motion: reduce)` block:

```css
animation-duration: 0.01ms !important;
animation-iteration-count: 1 !important;
transition-duration: 0.01ms !important;
```

This is a **standard accessibility pattern** recommended by MDN and web accessibility guidelines. The `!important` is necessary here because the reduced-motion override must win over all other animation declarations regardless of specificity. Without `!important`, any component-level animation would override the accessibility preference.

### Solution

**No changes needed.** This is the one legitimate exception to the `!important` rule.

Add a comment above the block explaining why (if one doesn't exist):

```css
/* Accessibility: !important is intentional here — must override all animations
   for users who prefer reduced motion. This is the ONLY acceptable use of
   !important per CLAUDE.md conventions. */
@media (prefers-reduced-motion: reduce) {
  ...
}
```

### Verification

- Comment exists explaining the exception
- No other `!important` rules exist: `grep -n "!important" src/styles/theme.css` should show only the 3 accessibility rules

---

## Execution Order

| Fix | Severity | Depends On | Estimated Scope |
|-----|----------|-----------|-----------------|
| **1: Admin Auth** | HIGH | None | 2 API files + 1 frontend file |
| **2: CORS Restriction** | HIGH | None | 1 shared file + ~6 local files |
| **3: Image MIME** | MEDIUM | None | 1 file |
| **4: Leaderboard SQL** | MEDIUM | None | 1 file |
| **5: Frontend Validation** | MEDIUM | None | 3 files + 1 new file |
| **6: Orphan Pages** | LOW | None | Delete 4 files |
| **7: Stale TODOs** | LOW | None | 1 file |
| **8: CSS Comment** | LOW | None | 1 file |

All fixes are independent — no dependencies between them. Execute in order 1-8.

---

## Final Verification

After ALL fixes:

```bash
npm run typecheck && npm run build
```

Both must pass with zero errors.

Then run these greps to confirm:

```bash
# Fix 1: Admin endpoints have auth
grep -l "ADMIN_SECRET" functions/api/admin/*.ts
# Should list both credit-stats.ts and recent-mints.ts

# Fix 2: No wildcard CORS
grep -rn "Allow-Origin.*\*" functions/ --include="*.ts"
# Should return zero results

# Fix 3: WebP validation exists
grep -rn "isValidWebP\|RIFF\|0x52.*0x49" functions/ --include="*.ts"
# Should return at least 1 result

# Fix 4: SQL has ORDER BY
grep -n "ORDER BY" functions/api/credits/leaderboard.ts
# Should return at least 1 result

# Fix 5: No startsWith('xch1') in frontend
grep -rn "startsWith.*xch1" src/ --include="*.ts" --include="*.tsx"
# Should return zero results

# Fix 6: Orphan pages deleted
ls src/pages/Landing.tsx src/pages/Onboarding.tsx src/pages/SettingsPage.tsx src/pages/Game.tsx 2>/dev/null
# Should return "No such file"

# Fix 7: Stale TODO gone
grep -n "Extract upload logic" functions/api/mint/prepare.ts
# Should return zero results

# Fix 8: Accessibility comment exists
grep -n "Accessibility.*!important" src/styles/theme.css
# Should return 1 result
```

---

## Report

After all fixes, report:

1. For each fix (1-8): applied / skipped / N/A with notes
2. Total files modified
3. Total files deleted
4. Any unexpected issues encountered
5. Full grep verification results
6. Build output (pass/fail)
