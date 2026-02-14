# SPEC: Phase 4 — Launch Readiness Update

> **For Claude CLI:** Read this entire spec, then read every file listed in "Files to Read First" before making changes. This phase updates the launch readiness documentation to reflect all audit fixes, the new surcharge system, and the credit formula V2.

---

## Context

The following have been completed:
- **Mint Pipeline Audit** — 6 fixes applied (see `SPEC-MINT-PIPELINE-AUDIT.md`)
- **Fair-share surcharge system** — Head, Clothes, Face Wear categories with decay
- **Credit Formula V2** — asymptotic whale multiplier capped at 1.30
- **Frontend pricing display** — usage counts and surcharges visible in generator

`docs/LAUNCH-READINESS.md` needs to be updated to reflect ALL of these changes so it serves as the single pre-launch reference document.

---

## Files to Read First

1. `docs/LAUNCH-READINESS.md` — **the file you will modify** (read in full)
2. `docs/SPEC-MINT-PIPELINE-AUDIT.md` — all 6 fixes with details
3. `docs/SPEC-CREDIT-FORMULA-V2.md` — the credit formula spec
4. `functions/api/mint/_shared.ts` — current surcharge constants and formula
5. `functions/lib/validation.ts` — shared wallet validation module
6. `functions/migrations/034_trait_decay.sql` — decay migration

---

## Update 1: Security Audit Section

Add or update a "Security Audit" section documenting:

### Self-Fetch Eliminated (FIX 2)
- The `prepare.ts → /api/mint/upload` self-fetch anti-pattern was removed
- `uploadToIPFS.ts` is now a direct function import, not an HTTP call
- No more circular fetch dependencies

### Wallet Validation Hardened (FIX 3 + FIX 4)
- All 4 mint endpoints now use `isValidChiaAddress()` (bech32m regex validation)
- Old `startsWith('xch1')` pattern fully removed
- Shared validation module: `functions/lib/validation.ts`
- Endpoints hardened: `prepare.ts`, `confirm.ts`, `status.ts` (all endpoints that accept wallet input)

### Trait Name Consistency (FIX 1 + FIX 1a)
- Server-side `functions/lib/traitNameMap.ts` mirrors client-side `src/lib/traitNameMap.ts`
- `lookupTraitName()` function used in `prepare.ts` for metadata attribute names
- All Phase 1 trait values verified against metadata.json

### Mint Number Assignment (FIX 3)
- Mint numbers now assigned atomically at prepare time using `UPDATE...RETURNING`
- No more `SELECT MAX` pattern
- Metadata name is correct from first IPFS upload

---

## Update 2: Pricing Section

Add or update a "Pricing" section documenting:

### Base Price
- `BASE_PRICE_XCH = 0.20` (defined in `prepare.ts`)

### Surcharge Formula — Fair-Share System
- Formula: `surcharge = RAMP_RATE × r + PENALTY_SCALE × max(0, r-1)²`
- Where `r = effectiveUsage / fairShare`
- Constants: `RAMP_RATE=1.0`, `PENALTY_SCALE=8.0`, `PENALTY_EXPONENT=2.0`

### Surcharge Categories

| Category | Options | Fair Share | Reason |
|----------|:---:|:---:|--------|
| Head | 40 | 105 | Large variety, high visual impact |
| Clothes | 36 | 117 | Large variety, high visual impact |
| Face Wear | 18 | 233 | Moderate variety, distinctive |

### Excluded from Surcharge

| Category | Reason |
|----------|--------|
| Mouth | Mandatory base system + rarity override |
| Face | Core identity, only 6 options |
| Background | Cosmetic backdrop only |
| Base | Always "Wojak" |

### Exempt Traits
- "No Headgear" (Head category) — always surcharge 0
- "No Face Wear" (Face Wear category) — always surcharge 0

### Pricing Behavior
- Only the highest surcharge among all 7 selected traits is charged
- Total price = base (0.20) + highest surcharge
- Free mints are free regardless of trait surcharges

### Time Decay
- 30-day half-life exponential decay on effective_usage
- If a trait stops being popular, its surcharge drops over time
- D1 SQL: `exp(ln(0.5) * (julianday('now') - julianday(last_decay_at)) / 30)`

---

## Update 3: Database Migrations Section

Add migration 034 to the list:

| Migration | Description |
|-----------|-------------|
| `034_trait_decay.sql` | Adds `effective_usage`, `last_decay_at` columns to `trait_usage` table. Enables time-based decay of trait popularity. |

---

## Update 4: Known Gaps Section

Update the status of these items:

| Gap | Status | Notes |
|-----|--------|-------|
| Self-fetch in prepare.ts | ✅ **RESOLVED** | FIX 2 — replaced with direct `uploadToIPFS()` import |
| Metadata drift (trait names) | ✅ **RESOLVED** | FIX 1 — `lookupTraitName()` with single source of truth |
| Weak wallet validation | ✅ **RESOLVED** | FIX 4 — `isValidChiaAddress()` everywhere |
| Mint number waste on IPFS failure | ⚠️ **Accepted** | Low severity. A mint number is consumed even if IPFS upload fails. Acceptable trade-off for atomic assignment. |
| Credit formula wash trade risk | ✅ **RESOLVED** | Credit Formula V2 — asymptotic whale multiplier caps at 1.30 |

---

## Update 5: Test Plan Section

Add these test cases to the test plan:

### Surcharge Tests
1. `surchargeXch(0, 'Head', 'Crown')` returns 0
2. `surchargeXch(105, 'Head', 'Crown')` returns ≈ 1.000 (at fair share)
3. `surchargeXch(150, 'Head', 'Crown')` returns ≈ 2.898 (price wall)
4. `surchargeXch(200, 'Head', 'Crown')` returns ≈ 8.454 (effectively blocked)
5. `surchargeXch(100, 'Mouth', 'Cig')` returns 0 (excluded category)
6. `surchargeXch(100, 'Face', 'Classic')` returns 0 (excluded category)
7. `surchargeXch(100, 'Background', 'Moon')` returns 0 (excluded category)
8. `surchargeXch(100, 'Head', 'No Headgear')` returns 0 (exempt trait)
9. `surchargeXch(100, 'Face Wear', 'No Face Wear')` returns 0 (exempt trait)

### Decay Tests
10. Trait with `effective_usage=100`, `last_decay_at=30 days ago` → effective_usage ≈ 50
11. Trait with `last_decay_at=now` → effective_usage unchanged

### Credit Formula V2 Tests
12. `calculateCredits(2.0, 2.0)` → 10000 stored units (100 display = 1 free mint)
13. `calculateCredits(4.0, 2.0)` → ≈ 23000 stored units (multiplier ≈ 1.15)
14. `calculateCredits(100.0, 2.0)` → multiplier ≈ 12970 (near 1.30 cap)
15. Old constants `CREDITS_PER_FLOOR`, `WHALE_COEFFICIENT` not in codebase

### Wallet Validation Tests
16. `isValidChiaAddress('xch1short')` returns false
17. `isValidChiaAddress('xch1' + 58 valid bech32m chars)` returns true

---

## Verification

After all changes:

```bash
npm run typecheck && npm run build
```

Both must pass with zero errors.

### Report

After updating, confirm:
1. All sections were updated
2. No stale information remains from pre-audit
3. The document is consistent with the actual codebase
