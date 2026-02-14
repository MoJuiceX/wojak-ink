# SPEC: Phase 9C — Code Quality & Cleanup

> **For Claude CLI:** Read this entire spec, then read every file in each fix's "Files to Read" before making changes. Follow `CLAUDE.md` for all conventions. Execute fixes in order 1-6.

---

## Fix 1: Image MIME Validation (MEDIUM — Security)

### Problem

`uploadToIPFS.ts` accepts any base64 data and uploads it to IPFS via Pinata. There's no validation that the data is actually a WebP image. Someone could store arbitrary data permanently on IPFS under the project's Pinata account.

### Files to Read

1. `functions/api/mint/uploadToIPFS.ts` — the upload function

### Exact Changes

The insertion point is `uploadToIPFS.ts` line 42, right after `base64ToUint8Array()` and before the size check. Add the WebP validation function and the check:

**1a.** Add this function BEFORE the `uploadToIPFS` function (after `sha256Hex`, around line 22):

```typescript
/** Validate WebP magic bytes: RIFF at offset 0, WEBP at offset 8 */
function isValidWebP(buffer: Uint8Array): boolean {
  if (buffer.length < 12) return false;
  return (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && // RIFF
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50   // WEBP
  );
}
```

**1b.** Inside `uploadToIPFS()`, right after `const imageBytes = base64ToUint8Array(imageBase64);` (line 41) and BEFORE the size check (line 42), add:

```typescript
  if (!isValidWebP(imageBytes)) {
    throw new Error('Invalid image format: expected WebP');
  }
```

The final order should be:
1. `base64ToUint8Array(imageBase64)`
2. `isValidWebP(imageBytes)` check
3. Size check (`imageBytes.length > 2 * 1024 * 1024`)

### Verification

```bash
grep -n "isValidWebP\|RIFF\|0x52" functions/api/mint/uploadToIPFS.ts
# Expected: function definition + usage
```

---

## Fix 2: Leaderboard SQL Optimization (MEDIUM — Performance)

### Problem

`functions/api/credits/leaderboard.ts` fetches **every wallet** from the database into JavaScript, sorts in memory with `.sort()`, then paginates with `.slice()`. With ~200 wallets this works but it's architecturally wrong.

### Files to Read

1. `functions/api/credits/leaderboard.ts` — the full file

### Current Code (lines 103-133)

```typescript
// BAD: All rows loaded into memory
const entries = (rows.results || []).map((r) => { ... });

// BAD: Sort in JS
entries.sort((a, b) => b.earned - a.earned);

// BAD: Paginate in JS
const top = entries.slice(offset, offset + limit).map((e, i) => ({ ... }));
```

### Exact Changes

**2a.** Create an `ORDER BY` map (add before the `try` block, around line 47):

```typescript
const orderByMap: Record<string, string> = {
  earned: 'COALESCE(e.total, 0) DESC',
  available: '(COALESCE(e.total, 0) - COALESCE(s.total, 0)) DESC, COALESCE(e.total, 0) DESC',
  bought: 'COALESCE(b.cnt, 0) DESC, COALESCE(e.total, 0) DESC',
};
const orderBy = orderByMap[sort] || orderByMap.earned;
```

**2b.** Append `ORDER BY`, `LIMIT`, and `OFFSET` to the main SQL query. The query currently ends at the `FROM wallets w LEFT JOIN ... LEFT JOIN bought b` line. Append:

```sql
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
```

And bind `limit` and `offset`:

```typescript
rows = await env.DB.prepare(`${query} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
  .bind(limit, offset)
  .all<...>();
```

This is safe because `orderBy` comes from a fixed map, not user input.

**2c.** Remove the JS `.sort()` call entirely (lines 116-122). Delete this block:

```typescript
if (sort === 'available') {
  entries.sort((a, b) => b.freeMints - a.freeMints || b.earned - a.earned);
} else if (sort === 'bought') {
  entries.sort((a, b) => b.yourWojakBought - a.yourWojakBought || b.earned - a.earned);
} else {
  entries.sort((a, b) => b.earned - a.earned);
}
```

**2d.** Change the `.slice()` to just `.map()`. Replace:

```typescript
const top = entries.slice(offset, offset + limit).map((e, i) => ({
  rank: offset + i + 1,
```

With:

```typescript
const top = entries.map((e, i) => ({
  rank: offset + i + 1,
```

Since the database now handles pagination, `entries` already contains only the right rows.

**2e.** Apply the same `ORDER BY` + `LIMIT` + `OFFSET` to the **fallback query** (the `catch` block around lines 82-97). The fallback query also needs the same treatment:

```typescript
rows = await env.DB.prepare(
  `WITH wallets AS (...)
   ...
   FROM wallets w
   LEFT JOIN earned e ON w.wallet_address = e.wallet_address
   LEFT JOIN spent s ON w.wallet_address = s.wallet_address
   ORDER BY ${orderBy}
   LIMIT ? OFFSET ?`
).bind(limit, offset).all<...>();
```

### Verification

```bash
grep -n "ORDER BY" functions/api/credits/leaderboard.ts
# Expected: at least 2 results (main query + fallback)

grep -n "\.sort\(" functions/api/credits/leaderboard.ts
# Expected: ZERO results

grep -n "\.slice\(" functions/api/credits/leaderboard.ts
# Expected: ZERO results
```

---

## Fix 3: Frontend Wallet Validation (MEDIUM — Consistency)

### Problem

The frontend uses `startsWith('xch1')` in 7 places across 3 files. `CLAUDE.md` says: "Never `startsWith('xch1')` for wallet validation — use `isValidChiaAddress()` (bech32m regex)."

### Files to Read

1. `functions/lib/validation.ts` — the canonical server-side function
2. `src/contexts/MintContext.tsx` — 2 instances (lines 126, 153)
3. `src/sage-wallet/SageWalletProvider.tsx` — 2 instances (lines 203, 413)
4. `src/sage-wallet/useSageWalletStandalone.ts` — 2 instances (lines 151, 300)

**Note:** The original spec said MintContext.tsx had 3 instances. After reading the actual file, line 261 (`!address.startsWith('xch1')`) is **also** an instance that needs fixing. So it IS 3 in MintContext. Verify by running:

```bash
grep -n "startsWith.*xch1" src/contexts/MintContext.tsx src/sage-wallet/SageWalletProvider.tsx src/sage-wallet/useSageWalletStandalone.ts
```

### Exact Changes

**3a.** Create `src/lib/validation.ts` — a frontend copy of the server-side function:

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

**3b.** `src/contexts/MintContext.tsx` — add import and replace all instances:

```typescript
import { isValidChiaAddress } from '@/lib/validation';
```

Replace each `!address.startsWith('xch1')` with `!isValidChiaAddress(address)`. Preserve the null guards:

```typescript
// Before: if (!address || !address.startsWith('xch1')) return;
// After:  if (!address || !isValidChiaAddress(address)) return;
```

**3c.** `src/sage-wallet/SageWalletProvider.tsx` — add import and replace both instances:

```typescript
import { isValidChiaAddress } from '@/lib/validation';
```

- Line 203: `if (!address || !address.startsWith('xch1'))` → `if (!address || !isValidChiaAddress(address))`
- Line 413: `if (!state.address || !state.address.startsWith('xch1'))` → `if (!state.address || !isValidChiaAddress(state.address))`

**3d.** `src/sage-wallet/useSageWalletStandalone.ts` — add import and replace both instances:

```typescript
import { isValidChiaAddress } from '@/lib/validation';
```

- Line 151: `if (!addr.startsWith('xch1'))` → `if (!isValidChiaAddress(addr))`
- Line 300: `if (!address?.startsWith('xch1')` → `if (!address || !isValidChiaAddress(address)`

**Important for line 300:** The original uses optional chaining (`address?.startsWith`). Since `isValidChiaAddress` expects a string, add an explicit null guard: `if (!address || !isValidChiaAddress(address) || !collectionId?.trim())`

### Verification

```bash
# Zero startsWith('xch1') remaining in frontend
grep -rn "startsWith.*xch1" src/ --include="*.ts" --include="*.tsx"
# Expected: ZERO results

# New validation file exists
cat src/lib/validation.ts
# Expected: isValidChiaAddress function with bech32m regex

# Same regex as server-side
grep "xch1\[a-z0-9\]" functions/lib/validation.ts src/lib/validation.ts
# Expected: identical regex in both files

# Build passes
npm run typecheck && npm run build
```

---

## Fix 4: Delete Orphan Pages (LOW — Cleanup)

### Problem

Four page files exist in `src/pages/` but are NOT imported in `App.tsx`. They are dead code:

- `src/pages/Landing.tsx` (6,127 bytes) — replaced by redirect: `/landing` → `/gallery`
- `src/pages/Onboarding.tsx` (12,640 bytes) — replaced by redirect: `/onboarding` → `/gallery`
- `src/pages/SettingsPage.tsx` (3,879 bytes) — replaced by `Settings.tsx`
- `src/pages/Game.tsx` (24,366 bytes) — replaced by individual game components

### Files to Read

1. `src/App.tsx` — confirm none are imported

### Pre-Check

Before deleting, verify no imports exist ANYWHERE (not just App.tsx):

```bash
grep -rn "from.*pages/Landing" src/ --include="*.ts" --include="*.tsx"
grep -rn "from.*pages/Onboarding['\"]" src/ --include="*.ts" --include="*.tsx"
grep -rn "from.*pages/SettingsPage" src/ --include="*.ts" --include="*.tsx"
grep -rn "from.*pages/Game['\"]" src/ --include="*.ts" --include="*.tsx"
```

**All four greps must return zero results.** If any file imports one of these pages, DO NOT delete it — report the finding instead.

**Note:** A grep for `Onboarding` might match `OnboardingModal` — that's a different component (`src/components/auth/OnboardingModal.tsx`). Only exact matches for the pages listed above count.

### Exact Changes

Delete these 4 files:
- `src/pages/Landing.tsx`
- `src/pages/Onboarding.tsx`
- `src/pages/SettingsPage.tsx`
- `src/pages/Game.tsx`

Also check for companion CSS files:
```bash
ls src/pages/Landing.css src/pages/Onboarding.css src/pages/SettingsPage.css src/pages/Game.css 2>/dev/null
```
Delete any that exist.

**Do NOT** remove the redirect routes in `App.tsx` (`/landing` → `/gallery`, `/onboarding` → `/gallery`). Those protect users with old bookmarks.

### Verification

```bash
# Files are gone
ls src/pages/Landing.tsx src/pages/Onboarding.tsx src/pages/SettingsPage.tsx src/pages/Game.tsx 2>/dev/null
# Expected: No such file (all four)

# Build passes
npm run typecheck && npm run build
```

---

## Fix 5: Stale TODO Cleanup (LOW — Hygiene)

### Problem

The original spec called for removing a stale TODO in `functions/api/mint/prepare.ts` about the self-fetch anti-pattern.

### Pre-Check

```bash
grep -n "TODO" functions/api/mint/prepare.ts
```

**If this returns zero results:** The TODO has already been removed. Skip this fix entirely — report it as "already resolved."

**If it returns results:** Remove only the stale self-fetch TODO. Leave any other TODOs that are legitimate future work.

---

## Fix 6: CSS Accessibility Comment (LOW — Documentation)

### Problem

Three `!important` rules exist in `src/styles/theme.css` inside the `@media (prefers-reduced-motion: reduce)` block. `CLAUDE.md` says never use `!important`, but these are the standard accessibility exception.

### Files to Read

1. `src/styles/theme.css` — find the block around line 557

### Exact Change

Add a comment above the `@media` block (before line 557) explaining the exception:

```css
/* Accessibility: !important is intentional here — must override all animations
   for users who prefer reduced motion. This is the ONLY acceptable use of
   !important per CLAUDE.md conventions. */
@media (prefers-reduced-motion: reduce) {
```

**Do NOT** remove the `!important` rules themselves. They are correct and necessary.

### Verification

```bash
grep -n "Accessibility.*!important\|ONLY acceptable" src/styles/theme.css
# Expected: 1-2 results showing the new comment

# No OTHER !important rules exist outside this block
grep -n "!important" src/styles/theme.css
# Expected: exactly 3 results, all inside the reduced-motion block
```

---

## Final Verification (After ALL Fixes)

```bash
npm run typecheck && npm run build
```

Both must pass with zero errors.

---

## Report

After all fixes, report for each (1-6):
- Applied / Skipped / Already resolved
- Any unexpected issues
- Grep verification results
- Build output (pass/fail)
