# SPEC: Pre-Launch Audit — Full System Verification

> **For Claude CLI:** Read this entire spec. Execute every section in order. Fix any issues found. Then go BEYOND this checklist — use your own judgment to explore the codebase, find inconsistencies, edge cases, or bugs that this spec doesn't cover. Report everything.

---

## Context

Phases 0–7 have been implemented:
- Mint pipeline audit (6 fixes)
- Frontend pricing display
- Generator info panel
- Credit Formula V2
- Launch readiness doc
- E2E test script
- Admin dashboard
- Holder airdrop (112 wallets, 226 free mints)

This audit verifies that **everything actually works together** before the real mint test. **No mints should be created.** No destructive actions. Read-only verification plus code review.

---

## Files to Read First

1. `CLAUDE.md` — project conventions
2. `docs/SPEC-MINT-PIPELINE-AUDIT.md` — the 6 fixes that were implemented
3. `docs/SPEC-HOLDER-AIRDROP.md` — airdrop wallet list and formula
4. `docs/SPEC-CREDIT-FORMULA-V2.md` — credit formula spec
5. `docs/LAUNCH-READINESS.md` — should be up to date
6. `docs/BRAND-VOICE.md` — copy/tone guidelines

---

## SECTION 1: Build Health

### 1.1 TypeScript Compilation

```bash
npm run typecheck
```

**Expected:** Zero errors, zero warnings about types.

**If errors found:** Fix them. Report what was wrong.

### 1.2 Production Build

```bash
npm run build
```

**Expected:** Build completes successfully. Output in `dist/`.

**If errors found:** Fix them. Report what was wrong.

### 1.3 Dependency Check

```bash
npm audit --production
```

**Expected:** No critical or high severity vulnerabilities.

**Report:** List any vulnerabilities found with severity.

---

## SECTION 2: Surcharge Formula Verification

### 2.1 Read the Formula Code

Read `functions/api/mint/_shared.ts` and verify these constants exist:

```typescript
TOTAL_SUPPLY = 4200
SURCHARGE_RAMP_RATE = 1.0
SURCHARGE_PENALTY_SCALE = 8.0
SURCHARGE_PENALTY_EXPONENT = 2.0
DECAY_HALF_LIFE_DAYS = 30

SURCHARGE_FAIR_SHARES = {
  'Head': 105,       // round(4200/40)
  'Clothes': 117,    // round(4200/36)
  'Face Wear': 233,  // round(4200/18)
}

SURCHARGE_CATEGORIES = Set(['Head', 'Clothes', 'Face Wear'])

SURCHARGE_EXEMPT_TRAITS = Set(['No Headgear', 'No Face Wear'])
```

**Verify:** Each value matches exactly. If `Math.round(4200/40)` !== 105, flag it.

### 2.2 Formula Math Tests

Write a temporary test script (delete after). Import `surchargeXch` and `applyDecay` from `_shared.ts`.

| Test | Input | Expected | Tolerance |
|------|-------|----------|-----------|
| Zero usage | `surchargeXch(0, 'Head', 'Crown')` | 0 | exact |
| At fair share | `surchargeXch(105, 'Head', 'Crown')` | 1.000 | ±0.01 |
| 143% of fair share | `surchargeXch(150, 'Head', 'Crown')` | 2.898 | ±0.05 |
| 190% of fair share | `surchargeXch(200, 'Head', 'Crown')` | 8.454 | ±0.05 |
| Clothes at fair share | `surchargeXch(117, 'Clothes', 'Suit')` | 1.000 | ±0.01 |
| Face Wear at fair share | `surchargeXch(233, 'Face Wear', 'Aviators')` | 1.000 | ±0.01 |
| Excluded: Mouth | `surchargeXch(100, 'Mouth', 'Cig')` | 0 | exact |
| Excluded: Face | `surchargeXch(100, 'Face', 'Classic')` | 0 | exact |
| Excluded: Background | `surchargeXch(100, 'Background', 'Moon')` | 0 | exact |
| Exempt: No Headgear | `surchargeXch(100, 'Head', 'No Headgear')` | 0 | exact |
| Exempt: No Face Wear | `surchargeXch(100, 'Face Wear', 'No Face Wear')` | 0 | exact |

### 2.3 Decay Math Tests

| Test | Input | Expected | Tolerance |
|------|-------|----------|-----------|
| 30 days (1 half-life) | `applyDecay(100, 30_days_ago)` | 50 | ±1 |
| 0 days | `applyDecay(100, now)` | 100 | ±0.1 |
| 60 days (2 half-lives) | `applyDecay(100, 60_days_ago)` | 25 | ±1 |
| Zero input | `applyDecay(0, 30_days_ago)` | 0 | exact |
| 1 day | `applyDecay(100, 1_day_ago)` | ~97.7 | ±0.5 |

Delete the test script after all tests pass.

---

## SECTION 3: API Endpoint Verification

Start the local dev server:

```bash
npx wrangler pages dev dist
```

### 3.1 Pricing Endpoint

```
GET /api/mint/pricing
```

**Verify:**
- [ ] Response is valid JSON
- [ ] Has `traits` object (non-empty)
- [ ] Has `supply` object with `minted` (number >= 0) and `total` (4200)
- [ ] Each trait entry has: `usageCount`, `effectiveUsage`, `surchargeXch`, `fairShare`
- [ ] Key format: `"{Category}_{TraitName}"` (e.g., `"Head_Crown"`)
- [ ] Surcharge categories have `fairShare` > 0
- [ ] Non-surcharge categories have `surchargeXch` === 0 for ALL traits
- [ ] Exempt traits have `surchargeXch` === 0

### 3.2 Wallet Validation

```
GET /api/credits/balance?wallet=xch1short          → expect 400
GET /api/credits/balance?wallet=not_a_wallet        → expect 400
GET /api/credits/balance?wallet=                    → expect 400
GET /api/credits/balance                            → expect 400
GET /api/credits/balance?wallet=xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq2mge0z → expect 200
```

**Verify:** Invalid wallets always get 400. Valid wallet gets 200 with a balance response.

### 3.3 Leaderboard

```
GET /api/credits/leaderboard
```

**Verify:**
- [ ] Returns array of wallet entries
- [ ] Each entry has wallet, credits (or similar fields)
- [ ] At least some wallets appear (trading + airdrop)
- [ ] Spot check: wallet `xch1st3p4m2vluaa6we9anvqcjc0d23gn4v59cfuezh6td7wtxqeq60sp6uuz5` should have airdrop credits included (40000 stored units = 400 display credits from airdrop alone, plus any trading credits)

### 3.4 Credit History

```
GET /api/credits/history?wallet=xch1st3p4m2vluaa6we9anvqcjc0d23gn4v59cfuezh6td7wtxqeq60sp6uuz5
```

**Verify:**
- [ ] Returns history events
- [ ] At least one event has `event_type` = `'holder_airdrop'`
- [ ] Airdrop event shows `credits_earned` = 40000 (4 free mints × 10000)
- [ ] Metadata includes `held`, `freeMints`, `snapshot` fields

### 3.5 Credit Status

```
GET /api/credits/status
```

**Verify:** Returns valid response with system status info.

---

## SECTION 4: Anti-Pattern Greps

Run each grep. ALL must return **zero results**:

```bash
# Old surcharge formula remnants
grep -r "SURCHARGE_BASE\b" functions/ --include="*.ts"
grep -r "SURCHARGE_USES_DIVISOR" functions/ --include="*.ts"

# Old validation pattern
grep -r "startsWith('xch1')" functions/ --include="*.ts"

# Old credit formula constants
grep -r "CREDITS_PER_FLOOR" workers/ functions/ scripts/ src/ --include="*.ts" --include="*.tsx"
grep -r "WHALE_COEFFICIENT" workers/ functions/ scripts/ src/ --include="*.ts" --include="*.tsx"

# Removed functions that should not exist
grep -r "cleanTraitDisplayName\|applyDisplayCorrections" functions/ --include="*.ts"

# Self-fetch anti-pattern
grep -r "new URL.*'/api/mint/upload'" functions/api/mint/ --include="*.ts"

# !important in CSS (never allowed)
grep -r "!important" src/styles/ --include="*.css"
```

**If ANY grep returns results:** Report the file, line number, and fix it.

---

## SECTION 5: Frontend Code Review

### 5.1 MintContext — Pricing Fetch

Read `src/contexts/MintContext.tsx`.

**Verify:**
- [ ] Fetches `/api/mint/pricing` (not just balance or supply)
- [ ] Auto-refresh interval exists (~60 seconds)
- [ ] Pricing data stored in context state accessible by components
- [ ] Helper function exists to get total mint price (base + highest surcharge)
- [ ] Free mint path does NOT show surcharge

### 5.2 ActionBar — Price Breakdown

Read `src/components/generator/ActionBar.tsx`.

**Verify:**
- [ ] Shows total price prominently
- [ ] When surcharge > 0, shows breakdown format matching BRAND-VOICE.md
- [ ] Expected format: `"0.45 XCH (base 0.20 + 0.25 Crown surcharge)"`
- [ ] When surcharge === 0, shows just `"0.20 XCH"` (no breakdown clutter)
- [ ] Does NOT show "fair share", "effective usage", or formula details

### 5.3 Trait Selector — Usage Badges

Read the trait selector component(s) in `src/components/generator/`.

**Verify:**
- [ ] Usage count ("N minted") shown on trait items
- [ ] Surcharge amount shown for Head, Clothes, Face Wear traits (when > 0)
- [ ] Non-surcharge categories show usage count but NO surcharge
- [ ] Does NOT show "fair share" or percentage

### 5.4 Generator Info Panel

Read `src/components/generator/GeneratorInfo.tsx`.

**Verify:**
- [ ] Has 5 content sections:
  1. "What is Your Wojak?" (or similar)
  2. "How to Create" (or similar)
  3. "Pricing" (or similar)
  4. "Free Mints" (or similar)
  5. "Why It's Special" (or similar)
- [ ] Pricing section mentions base price 0.20 XCH
- [ ] Pricing section explains surcharges without formula details
- [ ] Pricing section mentions only Head, Clothes, Face Wear have surcharges
- [ ] Free Mints section mentions 100 credits = 1 free mint
- [ ] Tone matches BRAND-VOICE.md (meme-native, clear over clever, "Mint" not "Buy", "Wojak" not "NFT")
- [ ] Uses existing CSS classes (card-static, text-secondary, etc.)
- [ ] No `!important` in any inline or component styles

### 5.5 Admin Stats Page

Read the admin page (likely `src/pages/Admin.tsx` or `src/pages/AdminStats.tsx` — check which one is imported in `App.tsx`).

**Verify:**
- [ ] Route is registered in App.tsx (check which file is imported: `Admin.tsx` or `AdminStats.tsx`)
- [ ] Shows trait distribution table (per surcharge category)
- [ ] Shows supply progress (minted / 4200)
- [ ] Has some access control (query param or admin wallet check)
- [ ] Uses existing CSS classes from theme.css
- [ ] **Orphan cleanup:** If `AdminStats.tsx` and `AdminStats.css` exist but are NOT imported by `App.tsx`, they are dead code from before Phase 6. Delete them. The new admin page is `Admin.tsx`. This also fixes a CSS architecture violation (`AdminStats.css` breaks the "no new CSS files" rule from `CLAUDE.md`).

---

## SECTION 6: Database Migrations

### 6.1 Migration File Integrity

Read ALL migration files in `functions/migrations/`.

**Verify:**
- [ ] `034_trait_decay.sql` — adds `effective_usage` and `last_decay_at` to `trait_usage`
- [ ] `035_holder_airdrop_schema.sql` (or similar) — adds `event_type` column to `credit_events` if needed
- [ ] `036_holder_airdrop.sql` (or similar) — inserts 112 airdrop credit events
- [ ] No SQL syntax errors
- [ ] Airdrop migration uses `event_type = 'holder_airdrop'`
- [ ] Airdrop credits are correct: 4-mint wallets get 40000, 3-mint get 30000, 2-mint get 20000, 1-mint get 10000

### 6.2 Airdrop Data Verification

Count the INSERT statements in the airdrop migration:

**Expected:** Exactly 112 wallet inserts with total credits = 2,260,000 stored units.

Breakdown:
- 7 wallets × 40000 = 280,000
- 28 wallets × 30000 = 840,000
- 37 wallets × 20000 = 740,000
- 40 wallets × 10000 = 400,000
- **Total: 2,260,000**

---

## SECTION 7: Trait Name Map Consistency

### 7.1 Server-Client Map Sync

Compare `functions/lib/traitNameMap.ts` with `src/lib/traitNameMap.ts`.

**Verify:** Both files have identical entries. If the server has an entry the client doesn't (or vice versa), flag it.

### 7.2 Metadata Coverage

Run the trait name verification script:

```bash
node -e '
const data = require("./public/assets/nft-data/metadata.json");
const seen = new Set();
let issues = 0;
for (const nft of data) {
  for (const attr of nft.attributes || []) {
    const key = attr.trait_type + ":" + attr.value;
    if (seen.has(key)) continue;
    seen.add(key);
    const lower = attr.value.toLowerCase();
    const titleCased = lower.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    if (titleCased !== attr.value && !lower.startsWith("$")) {
      console.log("NEEDS MAP ENTRY: " + JSON.stringify(lower) + " -> " + JSON.stringify(attr.value));
      issues++;
    }
  }
}
console.log(issues === 0 ? "All trait names covered." : issues + " missing entries found.");
'
```

**Expected:** "All trait names covered." If any output, add the missing entries to BOTH map files.

---

## SECTION 8: Credit System Integrity

### 8.1 Credit Formula Constants

Read `workers/credit-tracker/worker.ts`.

**Verify:**
- [ ] `CREDITS_PER_XCH = 50`
- [ ] `MAX_WHALE_BONUS = 0.30`
- [ ] `MIN_EFFECTIVE_FLOOR = 0.5`
- [ ] Whale multiplier formula: `1 + (MAX_WHALE_BONUS * (1 - 1 / priceRatio))`
- [ ] No old constants: `CREDITS_PER_FLOOR`, `WHALE_COEFFICIENT`

### 8.2 FREE_MINT_COST Consistency

Search for `FREE_MINT_COST` or equivalent (10000 stored units = 100 display credits):

```bash
grep -rn "FREE_MINT_COST\|10000\|free.*mint.*cost" functions/api/mint/prepare.ts functions/api/credits/ src/contexts/MintContext.tsx --include="*.ts" --include="*.tsx"
```

**Verify:** The value is consistent everywhere (10000 stored units per free mint).

### 8.3 Balance Endpoint Includes Airdrop

Read `functions/api/credits/balance.ts`.

**Verify:** The SQL query sums ALL credit_events (not filtered by event_type). Airdrop credits should be included in the balance naturally.

### 8.4 Leaderboard Endpoint Includes Airdrop

Read `functions/api/credits/leaderboard.ts`.

**Verify:** Same as above — sums all credit_events regardless of event_type.

---

## SECTION 9: Routing and Navigation

### 9.1 Route Registration

Read `src/App.tsx` (or routing configuration).

**Verify these routes exist:**
- [ ] `/generator` — generator page
- [ ] `/admin` or `/admin-stats` — admin dashboard
- [ ] Other existing routes still intact: `/gallery`, `/bigpulp`, `/games`, `/leaderboard`, `/shop`, `/guild`, `/treasury`, `/settings`, `/account`

### 9.2 No Broken Imports

```bash
npm run typecheck
```

This catches missing imports, broken references, and type mismatches.

---

## SECTION 10: Go Beyond — Your Own Audit

**This is the most important section.**

You've verified everything the specs asked for. Now use your own judgment. Read through the code with fresh eyes and look for:

### 10.1 Edge Cases

- What happens if the pricing endpoint returns an error? Does the frontend degrade gracefully?
- What happens if a wallet has both trading credits AND airdrop credits and tries to free mint? Does the deduction work correctly?
- What happens if all 4,200 NFTs are minted? Does the UI handle sold-out state?
- What happens if `effective_usage` gets very large (e.g., 1000)? Does `surchargeXch` overflow or return unreasonable values?
- What happens if `last_decay_at` is in the future? Does `applyDecay` handle it?
- What happens if `last_decay_at` is NULL or an invalid date string? Does `applyDecay` return NaN? If so, add a guard: `if (isNaN(daysSinceDecay) || daysSinceDecay <= 0) return effectiveUsage;`
- What happens if a non-surcharge trait (Mouth, Face, Background) still has decay data in the DB? Does the pricing endpoint correctly return `surchargeXch: 0` regardless?

### 10.2 Security

- Are all API endpoints validating wallet addresses with `isValidChiaAddress()`?
- Can someone pass a negative `effective_usage` to get a negative surcharge?
- Is the admin page actually protected? Could anyone access it?
- Are there any SQL injection vectors in the credit or mint endpoints?

### 10.3 Consistency

- Does the pricing endpoint response shape match what MintContext expects?
- Does the ActionBar price breakdown match what the prepare endpoint actually charges?
- Are there any hardcoded values that should be constants (e.g., 4200, 0.20)?
- Are there any TODO or FIXME comments left behind from the audit?

### 10.4 Performance

- Does the 60-second pricing refresh cause unnecessary re-renders?
- Are there any N+1 query patterns in the pricing or leaderboard endpoints?
- Does the admin dashboard page make too many API calls on load?

### 10.5 UX

- Is the info panel content actually helpful? Would a first-time user understand it?
- Are error states handled with clear messages per BRAND-VOICE.md?
- Does the price breakdown update immediately when traits are selected, or is there a delay?

---

## Report Format

After completing all sections, provide a structured report:

```
## Pre-Launch Audit Report

### Section 1: Build Health
- [ ] 1.1 TypeScript: ✓/✗
- [ ] 1.2 Build: ✓/✗
- [ ] 1.3 Dependencies: ✓/✗

### Section 2: Surcharge Formula
- [ ] 2.1 Constants: ✓/✗
- [ ] 2.2 Formula tests (11): N/11 passed
- [ ] 2.3 Decay tests (5): N/5 passed

### Section 3: API Endpoints
- [ ] 3.1 Pricing: ✓/✗
- [ ] 3.2 Wallet validation: ✓/✗
- [ ] 3.3 Leaderboard: ✓/✗
- [ ] 3.4 Credit history: ✓/✗
- [ ] 3.5 Credit status: ✓/✗

### Section 4: Anti-Patterns
- [ ] All 8 greps: ✓/✗ (list any matches)

### Section 5: Frontend
- [ ] 5.1 MintContext: ✓/✗
- [ ] 5.2 ActionBar: ✓/✗
- [ ] 5.3 Trait selector: ✓/✗
- [ ] 5.4 Info panel: ✓/✗
- [ ] 5.5 Admin page: ✓/✗

### Section 6: Migrations
- [ ] 6.1 Files: ✓/✗
- [ ] 6.2 Airdrop data: ✓/✗ (112 wallets, 2,260,000 credits)

### Section 7: Trait Names
- [ ] 7.1 Map sync: ✓/✗
- [ ] 7.2 Metadata coverage: ✓/✗

### Section 8: Credit System
- [ ] 8.1 Formula constants: ✓/✗
- [ ] 8.2 FREE_MINT_COST: ✓/✗
- [ ] 8.3 Balance includes airdrop: ✓/✗
- [ ] 8.4 Leaderboard includes airdrop: ✓/✗

### Section 9: Routing
- [ ] 9.1 Routes: ✓/✗
- [ ] 9.2 Imports: ✓/✗

### Section 10: Beyond — Issues Found
[List everything you found on your own, categorized by severity]
- CRITICAL: [blocks launch]
- HIGH: [should fix before launch]
- MEDIUM: [fix soon after launch]
- LOW: [nice to have]

### Summary
- Total checks: N
- Passed: N
- Failed: N
- Issues found in Section 10: N
- Launch ready: YES / NO (with reasoning)
```

**Fix any CRITICAL or HIGH issues before finishing.** For MEDIUM and LOW, document them but don't block the audit.
