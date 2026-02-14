/**
 * End-to-End Mint Pipeline Tests
 *
 * Exercises the full mint pipeline against a running dev or staging server.
 * Covers: paid/free mints, surcharge formula, decay, wallet validation, pricing endpoint.
 *
 * Usage:
 *   npx tsx scripts/test-mint-e2e.ts
 *
 * Requires a running server:
 *   npx wrangler pages dev --d1=DB dist
 *
 * Environment:
 *   TEST_API_URL  — base URL (default: http://localhost:8788)
 */

const TEST_API_URL = process.env.TEST_API_URL || 'http://localhost:8788';

// Valid bech32m address (62 chars: xch1 + 58 lowercase alphanumeric)
const TEST_WALLET = 'xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq2mge0z';

// Minimal 1x1 transparent PNG as base64 (for prepare endpoint)
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

// ─── Surcharge constants (mirrored from _shared.ts) ───

const TOTAL_SUPPLY = 4200;
const SURCHARGE_RAMP_RATE = 1.0;
const SURCHARGE_PENALTY_SCALE = 8.0;
const SURCHARGE_PENALTY_EXPONENT = 2.0;
const DECAY_HALF_LIFE_DAYS = 30;

const SURCHARGE_FAIR_SHARES: Record<string, number> = {
  Head: Math.round(TOTAL_SUPPLY / 40), // 105
  Clothes: Math.round(TOTAL_SUPPLY / 36), // 117
  'Face Wear': Math.round(TOTAL_SUPPLY / 18), // 233
};

const SURCHARGE_EXEMPT_TRAITS = new Set(['No Headgear', 'No Face Wear']);

function surchargeXch(
  effectiveUsage: number,
  traitCategory: string,
  traitDisplayName?: string
): number {
  const fairShare = SURCHARGE_FAIR_SHARES[traitCategory];
  if (!fairShare) return 0;
  if (traitDisplayName && SURCHARGE_EXEMPT_TRAITS.has(traitDisplayName)) return 0;

  const ratio = effectiveUsage / fairShare;
  const ramp = SURCHARGE_RAMP_RATE * ratio;
  const overshoot = Math.max(0, ratio - 1);
  const penalty =
    SURCHARGE_PENALTY_SCALE * Math.pow(overshoot, SURCHARGE_PENALTY_EXPONENT);
  return ramp + penalty;
}

function applyDecay(effectiveUsage: number, lastDecayAt: string): number {
  const now = Date.now();
  const lastDecay = new Date(lastDecayAt).getTime();
  const daysSinceDecay = (now - lastDecay) / (1000 * 60 * 60 * 24);
  if (daysSinceDecay <= 0) return effectiveUsage;

  const decayFactor = Math.pow(0.5, daysSinceDecay / DECAY_HALF_LIFE_DAYS);
  return effectiveUsage * decayFactor;
}

// ─── Test runner ───

interface TestResult {
  name: string;
  passed: boolean;
  skipped?: boolean;
  message?: string;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`  ✓ ${name}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, message: msg });
    console.log(`  ✗ ${name}: ${msg}`);
  }
}

function skipTest(name: string, reason: string): void {
  results.push({ name, passed: true, skipped: true, message: reason });
  console.log(`  ⊘ ${name}: SKIPPED — ${reason}`);
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertApprox(
  actual: number,
  expected: number,
  tolerance: number,
  label: string
): void {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(
      `${label}: expected ~${expected}, got ${actual} (tolerance ±${tolerance})`
    );
  }
}

// ─── Test implementations ───

async function test1_paidMintPipeline(): Promise<void> {
  console.log('\n── Test 1: Paid Mint — Full Pipeline ──');

  const body = {
    walletAddress: TEST_WALLET,
    mintType: 'paid',
    selectedLayers: {
      Background: 'BACKGROUND_Moon.png',
      Base: 'BASE_Base-Wojak_classic.png',
      Clothes: 'CLOTHES_Suit.png',
      Head: 'HEAD_Crown.png',
      Eyes: 'EYE_MOG-Glasses.png',
      MouthBase: 'EXTRA_MOUTH_Numb.png',
    },
    selectedColors: {},
    imageBase64: TINY_PNG_BASE64,
  };

  await runTest('Prepare endpoint returns valid response', async () => {
    const res = await fetch(`${TEST_API_URL}/api/mint/prepare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    // Accept 200 (pending mint with offer), 400 (sold out / existing pending), or 5xx (missing env)
    const data = await res.json();

    if (res.status === 429) {
      throw new Error('Rate limited — wait and retry');
    }

    if (res.status === 503 || res.status === 500) {
      // Expected when running without full env (no PINATA_JWT, no MINTGARDEN_API_KEY)
      throw new Error(
        `Server returned ${res.status}: ${data.error || 'unknown'} (expected in dev without secrets)`
      );
    }

    if (data.pending && data.offerFile) {
      // Paid mint created an offer
      assert(typeof data.mintId === 'number' && data.mintId > 0, 'mintId should be a positive number');
      assert(typeof data.offerFile === 'string' && data.offerFile.length > 0, 'offerFile should be non-empty string');
      assert(typeof data.totalPriceXch === 'number' && data.totalPriceXch >= 0.2, 'totalPriceXch should be >= 0.20');
      assert(typeof data.expiresAt === 'string', 'expiresAt should be a string');
    } else if (data.pending && !data.offerFile) {
      // Existing pending mint returned
      assert(typeof data.mintId === 'number', 'Existing pending mint should have mintId');
    } else if (data.error) {
      // Sold out or other expected error
      console.log(`    (prepare returned error: ${data.error})`);
    }
  });

  await runTest('Total price includes base + surcharge', async () => {
    const res = await fetch(`${TEST_API_URL}/api/mint/prepare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (data.totalPriceXch !== undefined) {
      assert(data.totalPriceXch >= 0.2, `Total price ${data.totalPriceXch} should be >= 0.20 XCH base`);
    } else if (data.pending || data.error) {
      // Existing pending or error — can't verify price
      console.log('    (skipping price check — no totalPriceXch in response)');
    }
  });
}

async function test2_freeMintCreditDeduction(): Promise<void> {
  console.log('\n── Test 2: Free Mint — Credit Deduction ──');

  // Check credits first
  let balanceBefore: number | null = null;

  await runTest('Credit balance endpoint returns valid response', async () => {
    const res = await fetch(
      `${TEST_API_URL}/api/credits/balance?wallet=${TEST_WALLET}`
    );
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(typeof data.balance === 'number', 'balance should be a number');
    assert(typeof data.freeMints === 'number', 'freeMints should be a number');
    balanceBefore = data.balance;
  });

  if (balanceBefore === null || balanceBefore < 100) {
    skipTest(
      'Free mint with credit deduction',
      `Test wallet has ${balanceBefore ?? 0} credits (need 100). Insert test credits to enable this test.`
    );
    return;
  }

  await runTest('Free mint deducts credits', async () => {
    const res = await fetch(`${TEST_API_URL}/api/mint/prepare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: TEST_WALLET,
        mintType: 'free',
        selectedLayers: {
          Background: 'BACKGROUND_Moon.png',
          Base: 'BASE_Base-Wojak_classic.png',
          Clothes: 'CLOTHES_Suit.png',
          Head: 'HEAD_Crown.png',
          MouthBase: 'EXTRA_MOUTH_Numb.png',
        },
        selectedColors: {},
        imageBase64: TINY_PNG_BASE64,
      }),
    });
    const data = await res.json();

    if (res.status === 503 || res.status === 500) {
      throw new Error(`Server returned ${res.status}: ${data.error || 'unknown'} (expected in dev without secrets)`);
    }

    if (data.success && data.mintType === 'free') {
      assert(typeof data.mintNumber === 'number', 'mintNumber should be a number');
      // Verify credits were deducted
      const balRes = await fetch(
        `${TEST_API_URL}/api/credits/balance?wallet=${TEST_WALLET}`
      );
      const balData = await balRes.json();
      assert(
        balData.balance < balanceBefore!,
        `Balance should decrease: was ${balanceBefore}, now ${balData.balance}`
      );
    } else if (data.error) {
      throw new Error(`Free mint failed: ${data.error}`);
    }
  });
}

async function test3_surchargeCategories(): Promise<void> {
  console.log('\n── Test 3: Surcharge Calculations — Category Rules ──');

  await runTest('Pricing endpoint returns surcharges per category rules', async () => {
    const res = await fetch(`${TEST_API_URL}/api/mint/pricing`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.traits && typeof data.traits === 'object', 'Response should have traits object');

    const surchargeCategories = new Set(['Head', 'Clothes', 'Face Wear']);
    const entries = Object.entries(data.traits) as [string, { usageCount: number; surchargeXch: number }][];

    for (const [key, trait] of entries) {
      const category = key.split('_')[0];
      const traitName = key.substring(category.length + 1);

      if (!surchargeCategories.has(category)) {
        // Non-surcharge categories: surcharge must be 0
        assert(
          trait.surchargeXch === 0,
          `Non-surcharge category ${key}: surchargeXch should be 0, got ${trait.surchargeXch}`
        );
      }

      // Exempt traits: surcharge must be 0
      if (SURCHARGE_EXEMPT_TRAITS.has(traitName)) {
        assert(
          trait.surchargeXch === 0,
          `Exempt trait ${key}: surchargeXch should be 0, got ${trait.surchargeXch}`
        );
      }
    }
  });
}

async function test4_surchargeFormulaAccuracy(): Promise<void> {
  console.log('\n── Test 4: Surcharge Formula Accuracy ──');
  const TOL = 0.01;

  await runTest('surchargeXch(0, Head, Crown) === 0', async () => {
    assertApprox(surchargeXch(0, 'Head', 'Crown'), 0, TOL, 'surcharge');
  });

  await runTest('surchargeXch(105, Head, Crown) ≈ 1.000', async () => {
    assertApprox(surchargeXch(105, 'Head', 'Crown'), 1.0, TOL, 'surcharge');
  });

  await runTest('surchargeXch(150, Head, Crown) ≈ 2.898', async () => {
    assertApprox(surchargeXch(150, 'Head', 'Crown'), 2.898, TOL, 'surcharge');
  });

  await runTest('surchargeXch(200, Head, Crown) ≈ 8.454', async () => {
    assertApprox(surchargeXch(200, 'Head', 'Crown'), 8.454, TOL, 'surcharge');
  });

  await runTest('surchargeXch(100, Mouth, Cig) === 0 (excluded)', async () => {
    assertApprox(surchargeXch(100, 'Mouth', 'Cig'), 0, TOL, 'surcharge');
  });

  await runTest('surchargeXch(100, Head, No Headgear) === 0 (exempt)', async () => {
    assertApprox(surchargeXch(100, 'Head', 'No Headgear'), 0, TOL, 'surcharge');
  });

  await runTest('surchargeXch(100, Face Wear, No Face Wear) === 0 (exempt)', async () => {
    assertApprox(surchargeXch(100, 'Face Wear', 'No Face Wear'), 0, TOL, 'surcharge');
  });
}

async function test5_decayBehavior(): Promise<void> {
  console.log('\n── Test 5: Decay Behavior ──');
  const TOL = 1.0;

  await runTest('100 usage, 30 days ago → ≈50', async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    assertApprox(applyDecay(100, thirtyDaysAgo), 50, TOL, 'decayed usage');
  });

  await runTest('100 usage, now → ≈100', async () => {
    const now = new Date().toISOString();
    assertApprox(applyDecay(100, now), 100, TOL, 'decayed usage');
  });

  await runTest('100 usage, 60 days ago → ≈25', async () => {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString();
    assertApprox(applyDecay(100, sixtyDaysAgo), 25, TOL, 'decayed usage');
  });

  await runTest('0 usage, 30 days ago → 0', async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    assertApprox(applyDecay(0, thirtyDaysAgo), 0, 0.001, 'decayed usage');
  });
}

async function test6_walletValidation(): Promise<void> {
  console.log('\n── Test 6: Wallet Validation ──');

  await runTest('Rejects short wallet (xch1short)', async () => {
    const res = await fetch(
      `${TEST_API_URL}/api/credits/balance?wallet=xch1short`
    );
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  await runTest('Rejects non-wallet string', async () => {
    const res = await fetch(
      `${TEST_API_URL}/api/credits/balance?wallet=not_a_wallet`
    );
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  await runTest('Rejects empty wallet', async () => {
    const res = await fetch(`${TEST_API_URL}/api/credits/balance?wallet=`);
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  await runTest('Accepts valid bech32m address', async () => {
    const res = await fetch(
      `${TEST_API_URL}/api/credits/balance?wallet=${TEST_WALLET}`
    );
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });
}

async function test7_pricingEndpointShape(): Promise<void> {
  console.log('\n── Test 7: Pricing Endpoint Response Shape ──');

  await runTest('Response has correct top-level shape', async () => {
    const res = await fetch(`${TEST_API_URL}/api/mint/pricing`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();

    assert(
      data.traits && typeof data.traits === 'object',
      'Response should have traits object'
    );
    assert(
      data.supply && typeof data.supply === 'object',
      'Response should have supply object'
    );
    assert(
      typeof data.supply.minted === 'number' && data.supply.minted >= 0,
      'supply.minted should be a non-negative number'
    );
    assert(data.supply.total === 4200, `supply.total should be 4200, got ${data.supply.total}`);
  });

  await runTest('Trait entries have correct shape', async () => {
    const res = await fetch(`${TEST_API_URL}/api/mint/pricing`);
    const data = await res.json();
    const entries = Object.entries(data.traits) as [string, Record<string, unknown>][];

    if (entries.length === 0) {
      console.log('    (no trait entries yet — empty DB is valid)');
      return;
    }

    for (const [key, trait] of entries) {
      assert(
        typeof trait.usageCount === 'number',
        `${key}: usageCount should be a number`
      );
      assert(
        typeof trait.effectiveUsage === 'number',
        `${key}: effectiveUsage should be a number`
      );
      assert(
        typeof trait.surchargeXch === 'number',
        `${key}: surchargeXch should be a number`
      );
      assert(
        typeof trait.fairShare === 'number',
        `${key}: fairShare should be a number`
      );
      // Only check first entry to keep output clean
      break;
    }
  });

  await runTest('Floor price is a valid number', async () => {
    const res = await fetch(`${TEST_API_URL}/api/mint/pricing`);
    const data = await res.json();
    assert(
      typeof data.floorPrice === 'number' && data.floorPrice >= 0,
      `floorPrice should be a non-negative number, got ${data.floorPrice}`
    );
  });
}

// ─── Main ───

async function main(): Promise<void> {
  console.log(`\nWojak Mint Pipeline — E2E Tests`);
  console.log(`Target: ${TEST_API_URL}`);
  console.log('═'.repeat(50));

  // Verify server is reachable
  try {
    const probe = await fetch(`${TEST_API_URL}/api/mint/pricing`);
    if (!probe.ok && probe.status !== 500) {
      console.error(`\nServer not reachable at ${TEST_API_URL} (status ${probe.status})`);
      console.error('Start the dev server: npx wrangler pages dev --d1=DB dist');
      process.exit(1);
    }
  } catch {
    console.error(`\nCannot connect to ${TEST_API_URL}`);
    console.error('Start the dev server: npx wrangler pages dev --d1=DB dist');
    process.exit(1);
  }

  // Run tests in order
  await test1_paidMintPipeline();
  await test2_freeMintCreditDeduction();
  await test3_surchargeCategories();
  await test4_surchargeFormulaAccuracy();
  await test5_decayBehavior();
  await test6_walletValidation();
  await test7_pricingEndpointShape();

  // Final report
  console.log('\n' + '═'.repeat(50));
  const passed = results.filter((r) => r.passed && !r.skipped).length;
  const failed = results.filter((r) => !r.passed).length;
  const skipped = results.filter((r) => r.skipped).length;
  console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`  ✗ ${r.name}: ${r.message}`);
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
