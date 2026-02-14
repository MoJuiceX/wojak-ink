# SPEC: Phase 5 — End-to-End Testing

> **For Claude CLI:** Read this entire spec, then read every file listed in "Files to Read First" before writing any code. This phase creates an end-to-end test script that exercises the full mint pipeline.

---

## Context

All audit fixes, surcharge system, credit formula V2, and frontend pricing are implemented. This phase creates a comprehensive test script that runs against a local or staging D1 database to verify everything works together end-to-end.

The test script is a developer tool — not production code. It uses `fetch()` against the Cloudflare Pages dev server (wrangler pages dev) or a staging URL.

---

## Files to Read First

1. `docs/LAUNCH-READINESS.md` — updated test plan (Phase 4 output)
2. `docs/SPEC-MINT-PIPELINE-AUDIT.md` — all 6 fixes
3. `functions/api/mint/prepare.ts` — the prepare endpoint (core pipeline)
4. `functions/api/mint/confirm.ts` — the confirm endpoint
5. `functions/api/mint/pricing.ts` — the pricing endpoint
6. `functions/api/mint/_shared.ts` — surcharge formula, constants
7. `functions/api/credits/balance.ts` — credit balance endpoint
8. `functions/lib/validation.ts` — wallet validation

---

## Output File

Create: `scripts/test-mint-e2e.ts`

This is a TypeScript file that runs with `npx tsx scripts/test-mint-e2e.ts` (or compiled and run with node).

---

## Configuration

```typescript
const TEST_API_URL = process.env.TEST_API_URL || 'http://localhost:8788';

// Test wallet — must be a valid bech32m xch1 address (62 chars total)
// Use a known test address that won't conflict with real wallets
const TEST_WALLET = 'xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq2mge0z';
```

---

## Test Cases

### Test 1: Paid Mint — Full Pipeline

**What to test:**
1. Call `POST /api/mint/prepare` with:
   - `walletAddress`: valid test wallet
   - `mint_type`: `'paid'`
   - 7 trait selections (include Crown for Head to trigger surcharge)
   - A dummy base64 image (small 1x1 PNG is fine)
2. Verify the response includes:
   - `mintId` (integer > 0)
   - `mint_number` (integer > 0)
   - `offerFile` (string, non-empty)
   - `totalPriceXch` (number > 0.20, should include Crown surcharge if Crown has usage)
3. Verify metadata in response has correct trait names (from `TRAIT_NAME_MAP`)
4. Verify IPFS URIs are returned (should be arrays with multiple gateway URLs)

**Expected result:** Response has all required fields, total price ≥ 0.20 XCH.

### Test 2: Free Mint — Credit Deduction

**What to test:**
1. First, check if the test wallet has enough credits via `GET /api/credits/balance?wallet={TEST_WALLET}`
2. If not enough credits, this test should SKIP (not fail) with a message explaining why
3. If credits available: Call `POST /api/mint/prepare` with `mint_type: 'free'`
4. Verify response includes `mintId` and `mint_number`
5. Verify credits were deducted (check balance again)

**Expected result:** Credits deducted atomically, mint created.

**Note:** This test may not work in all environments (requires pre-existing credit_events). It's OK to skip with a clear message.

### Test 3: Surcharge Calculations

**What to test:**
1. Call `GET /api/mint/pricing`
2. Parse the response `traits` map
3. For each surcharge category trait (Head, Clothes, Face Wear):
   - Verify `surchargeXch` is a number ≥ 0
   - If `usageCount > 0`, verify surchargeXch > 0 (unless it's an exempt trait)
4. For non-surcharge categories (Mouth, Face, Background, Base):
   - Verify `surchargeXch === 0`
5. For exempt traits ("No Headgear", "No Face Wear"):
   - Verify `surchargeXch === 0` regardless of usage

**Expected result:** Surcharges correct per category rules.

### Test 4: Surcharge Formula Accuracy

**What to test:**
Run the surcharge formula locally with known inputs and compare:

```typescript
// Import or reimplement the formula
const TOTAL_SUPPLY = 4200;
const SURCHARGE_RAMP_RATE = 1.0;
const SURCHARGE_PENALTY_SCALE = 8.0;
const SURCHARGE_PENALTY_EXPONENT = 2.0;
const SURCHARGE_FAIR_SHARES = {
  'Head': Math.round(TOTAL_SUPPLY / 40),       // 105
  'Clothes': Math.round(TOTAL_SUPPLY / 36),     // 117
  'Face Wear': Math.round(TOTAL_SUPPLY / 18),   // 233
};

function surchargeXch(effectiveUsage, category, displayName) { ... }

// Test: surchargeXch(0, 'Head', 'Crown') === 0
// Test: surchargeXch(105, 'Head', 'Crown') ≈ 1.000
// Test: surchargeXch(150, 'Head', 'Crown') ≈ 2.898
// Test: surchargeXch(200, 'Head', 'Crown') ≈ 8.454
// Test: surchargeXch(100, 'Mouth', 'Cig') === 0
// Test: surchargeXch(100, 'Head', 'No Headgear') === 0
// Test: surchargeXch(100, 'Face Wear', 'No Face Wear') === 0
```

**Expected result:** All formula tests pass within tolerance (±0.01).

### Test 5: Decay Behavior

**What to test:**
1. Reimplement `applyDecay` locally:
   ```typescript
   function applyDecay(effectiveUsage, lastDecayAt) {
     const daysSince = (Date.now() - new Date(lastDecayAt).getTime()) / 86400000;
     return effectiveUsage * Math.pow(0.5, daysSince / 30);
   }
   ```
2. Test: `applyDecay(100, 30_days_ago)` ≈ 50
3. Test: `applyDecay(100, now)` ≈ 100
4. Test: `applyDecay(100, 60_days_ago)` ≈ 25
5. Test: `applyDecay(0, 30_days_ago)` === 0

**Expected result:** Decay halves every 30 days.

### Test 6: Wallet Validation

**What to test:**
1. Call `GET /api/credits/balance?wallet=xch1short` — expect 400
2. Call `GET /api/credits/balance?wallet=not_a_wallet` — expect 400
3. Call `GET /api/credits/balance?wallet=` (empty) — expect 400
4. Call `GET /api/credits/balance?wallet={TEST_WALLET}` — expect 200

**Expected result:** Invalid wallets rejected, valid wallet accepted.

### Test 7: Pricing Endpoint Response Shape

**What to test:**
1. Call `GET /api/mint/pricing`
2. Verify response has `traits` (object) and `supply` (object)
3. Verify `supply.minted` is a number ≥ 0
4. Verify `supply.total` === 4200
5. For each trait entry, verify shape: `{ usageCount, effectiveUsage, surchargeXch, fairShare }`
6. Verify at least some traits are returned (the endpoint should return all known traits)

**Expected result:** Response shape matches the documented API contract.

---

## Test Runner Structure

```typescript
interface TestResult {
  name: string;
  passed: boolean;
  skipped?: boolean;
  message?: string;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`✓ ${name}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, message: msg });
    console.log(`✗ ${name}: ${msg}`);
  }
}

function skipTest(name: string, reason: string) {
  results.push({ name, passed: true, skipped: true, message: reason });
  console.log(`⊘ ${name}: SKIPPED — ${reason}`);
}

// ... run all tests ...

// Final report
const passed = results.filter(r => r.passed && !r.skipped).length;
const failed = results.filter(r => !r.passed).length;
const skipped = results.filter(r => r.skipped).length;
console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped.`);
process.exit(failed > 0 ? 1 : 0);
```

---

## Verification

After creating the script:

```bash
npm run typecheck
```

Must pass. The script doesn't need to be part of the build — just type-safe.

### To Run the Tests

```bash
# Start local dev server (in another terminal)
npx wrangler pages dev --d1=DB dist

# Run tests
npx tsx scripts/test-mint-e2e.ts
```

### Report

After running, report:
1. PASS/FAIL/SKIP for each test
2. Any unexpected failures and their root cause
3. Whether the mint pipeline is working end-to-end
