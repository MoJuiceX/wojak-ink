# SPEC: Phase 0 — Verify Audit Implementation

> **For Claude CLI:** Run all verification checks to confirm the Mint Pipeline Audit was implemented correctly. Do not proceed to other phases until every check passes.

---

## Context

The Mint Pipeline Audit (`docs/SPEC-MINT-PIPELINE-AUDIT.md`) has been implemented. This phase verifies correctness before we build on top of it.

## Files to Read First

1. `docs/SPEC-MINT-PIPELINE-AUDIT.md` — the spec that was implemented
2. `functions/api/mint/_shared.ts` — new surcharge formula
3. `functions/api/mint/prepare.ts` — core pipeline (should use resolveTraitName, uploadToIPFS)
4. `functions/lib/traitNameMap.ts` — server-side trait name map (should exist and match src/)
5. `functions/lib/validation.ts` — shared wallet validation (should exist)
6. `functions/migrations/034_trait_decay.sql` — decay migration (should exist)
7. `src/lib/traitNameMap.ts` — client-side source of truth

---

## Step 1: Build Check

```bash
npm run typecheck && npm run build
```

If either fails, fix the errors before continuing.

---

## Step 2: Trait Name Map Verification

Run this script to verify every Phase 1 trait value resolves correctly:

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
      console.log("NEEDS MAP ENTRY: " + JSON.stringify(lower) + " -> " + JSON.stringify(attr.value) + " (fallback gives: " + JSON.stringify(titleCased) + ")");
      issues++;
    }
  }
}
if (issues === 0) console.log("✓ All trait names resolve correctly.");
else console.log("✗ " + issues + " traits need map entries. Add them to BOTH src/lib/traitNameMap.ts AND functions/lib/traitNameMap.ts.");
'
```

**Expected:** Zero issues. If any appear, add the missing entries to BOTH files.

---

## Step 3: Anti-Pattern Greps

Each grep should return **zero results**:

```bash
echo "=== Check 1: Old trait name functions ==="
grep -r "cleanTraitDisplayName\|applyDisplayCorrections" functions/

echo "=== Check 2: Weak wallet validation ==="
grep -r "startsWith('xch1')" functions/

echo "=== Check 3: Self-fetch anti-pattern ==="
grep -r "new URL.*'/api/mint/upload'" functions/api/mint/prepare.ts

echo "=== Check 4: Old surcharge constants ==="
grep -r "SURCHARGE_BASE\|SURCHARGE_USES_DIVISOR" functions/
```

If any check finds matches, the corresponding fix from the audit was not fully applied. Fix it.

---

## Step 4: Surcharge Formula Verification

Create a temporary test file, run it, then delete it:

```typescript
// File: /tmp/test-surcharge.mjs (temporary — delete after)
// Copy the surchargeXch function and constants from _shared.ts, then test:

const TOTAL_SUPPLY = 4200;
const SURCHARGE_RAMP_RATE = 1.0;
const SURCHARGE_PENALTY_SCALE = 8.0;
const SURCHARGE_PENALTY_EXPONENT = 2.0;

const SURCHARGE_FAIR_SHARES = {
  'Head': Math.round(TOTAL_SUPPLY / 40),       // 105
  'Clothes': Math.round(TOTAL_SUPPLY / 36),     // 117
  'Face Wear': Math.round(TOTAL_SUPPLY / 18),   // 233
};

const SURCHARGE_CATEGORIES = new Set(Object.keys(SURCHARGE_FAIR_SHARES));

const SURCHARGE_EXEMPT_TRAITS = new Set([
  'No Headgear',
  'No Face Wear',
]);

function surchargeXch(effectiveUsage, traitCategory, traitDisplayName) {
  const fairShare = SURCHARGE_FAIR_SHARES[traitCategory];
  if (!fairShare) return 0;
  if (traitDisplayName && SURCHARGE_EXEMPT_TRAITS.has(traitDisplayName)) return 0;
  const ratio = effectiveUsage / fairShare;
  const ramp = SURCHARGE_RAMP_RATE * ratio;
  const overshoot = Math.max(0, ratio - 1);
  const penalty = SURCHARGE_PENALTY_SCALE * Math.pow(overshoot, SURCHARGE_PENALTY_EXPONENT);
  return ramp + penalty;
}

// Test cases
const tests = [
  { args: [0, 'Head', 'Crown'], expected: 0, label: 'Zero usage' },
  { args: [105, 'Head', 'Crown'], expected: 1.0, label: 'Head at fair share' },
  { args: [117, 'Clothes', 'Suit'], expected: 1.0, label: 'Clothes at fair share' },
  { args: [233, 'Face Wear', 'Aviators'], expected: 1.0, label: 'Face Wear at fair share' },
  { args: [150, 'Head', 'Crown'], expected: 2.898, label: 'Crown at 150 (price wall)' },
  { args: [200, 'Head', 'Crown'], expected: 8.454, label: 'Crown at 200 (blocked)' },
  { args: [100, 'Mouth', 'Cig'], expected: 0, label: 'Mouth excluded' },
  { args: [100, 'Face', 'Classic'], expected: 0, label: 'Face excluded' },
  { args: [100, 'Background', 'Moon'], expected: 0, label: 'Background excluded' },
  { args: [100, 'Head', 'No Headgear'], expected: 0, label: 'No Headgear exempt' },
  { args: [100, 'Face Wear', 'No Face Wear'], expected: 0, label: 'No Face Wear exempt' },
];

let passed = 0;
let failed = 0;
for (const t of tests) {
  const result = surchargeXch(...t.args);
  const tolerance = 0.01;
  const ok = Math.abs(result - t.expected) < tolerance;
  console.log((ok ? '✓' : '✗') + ' ' + t.label + ': expected ' + t.expected.toFixed(3) + ', got ' + result.toFixed(3));
  if (ok) passed++; else failed++;
}
console.log('\n' + passed + ' passed, ' + failed + ' failed.');
```

Run with `node /tmp/test-surcharge.mjs`. **Expected:** All 11 tests pass.

Delete the temp file after.

---

## Step 5: File Existence Check

Verify these files were created by the audit:

| File | Should Exist |
|------|-------------|
| `functions/lib/traitNameMap.ts` | ✓ Created by FIX 1 |
| `functions/lib/validation.ts` | ✓ Created by FIX 4 |
| `functions/api/mint/uploadToIPFS.ts` | ✓ Created by FIX 2 |
| `functions/migrations/034_trait_decay.sql` | ✓ Created by FIX 5 |

Check each exists. If any are missing, the corresponding fix was not implemented.

---

## Step 6: Server-Side / Client-Side Map Sync

Verify the two traitNameMap files are in sync:

```bash
# Extract just the TRAIT_NAME_MAP entries from both files and diff
diff <(grep -E "^\s+'[^']+': '[^']+'," src/lib/traitNameMap.ts | sort) \
     <(grep -E "^\s+'[^']+': '[^']+'," functions/lib/traitNameMap.ts | sort)
```

**Expected:** No differences (or only comment differences).

---

## Step 7: Final Build

```bash
npm run typecheck && npm run build
```

**Expected:** Clean build with zero errors.

---

## Report

After all steps, report:

1. ✓ or ✗ for each step
2. Any issues found and how they were fixed
3. Confirmation that all 6 fixes from the audit are in place
