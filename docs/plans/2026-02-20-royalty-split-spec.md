# SPEC: Enable SplitXCH Royalty Split (Minter 10% + Treasury 2%)

**Date:** 2026-02-20
**From:** User + Claude (MacOS app)
**Independent:** Yes — does not depend on any other pending spec

---

## Design Intent (Read This First)

Currently, ALL royalties from secondary NFT sales go to the minter's own wallet.
The SplitXCH integration is already fully coded but DORMANT — `TREASURY_ADDRESS`
is not set in `wrangler.toml`, so the split code never runs.

This spec activates it by:
1. Setting the fixed treasury address in `wrangler.toml`
2. Raising the total on-chain royalty from 10% to 12% (= 10% minter + 2% treasury)

After this change, every future mint will have its royalty address set to a
deterministic SplitXCH puzzle address (unique per minter, cached in DB), which
automatically distributes secondary sale royalties at the correct split.

**This affects real on-chain financial transactions. Make the changes exactly
as specified. Do NOT change any other values.**

---

## Context Files to Read First

1. `CLAUDE.md`
2. `wrangler.toml` — read lines 26–43 in full before touching
3. `functions/api/mint/splitxch.ts` — read for awareness, do NOT modify
4. `functions/api/mint/process.ts` lines 298–325 — read for awareness, do NOT modify

---

## The One File to Modify

**Only file:** `wrangler.toml`

No other files change.

---

## The Two Changes

### Change 1 — Add TREASURY_ADDRESS

Find this line in `wrangler.toml`:

```toml
PHASE2_ROYALTY_ADDRESS = "DYNAMIC_PER_MINTER"  # Each creator receives royalties for their own NFT
PHASE2_ROYALTY_PCT = "10"
```

Replace with:

```toml
PHASE2_ROYALTY_ADDRESS = "DYNAMIC_PER_MINTER"  # split: 10% minter + 2% treasury via SplitXCH
TREASURY_ADDRESS = "xch13afmxv0xpyz03t3jfdmcrtv5ecwe5n52977vxd3z2x995f9quunsre5vkd"
PHASE2_ROYALTY_PCT = "12"
```

### Why 12%?

The NFT encodes the TOTAL royalty on-chain. The SplitXCH puzzle distributes it:
- Minter receives:   8,258 / 10,000 × 12% ≈ **10% of sale price**
- Treasury receives: 1,592 / 10,000 × 12% ≈ **2% of sale price**
- SplitXCH fee:        150 / 10,000 × 12% = **0.18% of sale price**
- Total:            10,000bp = **12% of sale price** ✓

This math is already implemented correctly in `splitxch.ts` Wave 1 config.
Do NOT change the basis points in `splitxch.ts`.

---

## Constraints

- Modify ONLY `wrangler.toml`
- Do NOT change `splitxch.ts` (basis points already correct)
- Do NOT change `process.ts`
- Do NOT change `request.ts`
- Do NOT create new files
- Treasury address must be copied EXACTLY:
  `xch13afmxv0xpyz03t3jfdmcrtv5ecwe5n52977vxd3z2x995f9quunsre5vkd`

---

## Success Criteria (self-check before reporting done)

- [ ] `TREASURY_ADDRESS` line added with exact address
- [ ] `PHASE2_ROYALTY_PCT` changed from `"10"` to `"12"`
- [ ] No other lines in `wrangler.toml` changed
- [ ] Build passes: `npm run build`
- [ ] TypeScript passes: `npx tsc --noEmit`
- [ ] Verification script passes: `bash scripts/verify-royalty-split.sh`

---

## Verification

Run the dedicated verification script:

```bash
bash scripts/verify-royalty-split.sh
```

Expected output: all checks GREEN, final line: `✅ ROYALTY SPLIT CONFIGURATION CORRECT`

Also run manually:

```bash
# Confirm TREASURY_ADDRESS is present
grep "TREASURY_ADDRESS" wrangler.toml
# Expected: TREASURY_ADDRESS = "xch13afmxv0xpyz03t3jfdmcrtv5ecwe5n52977vxd3z2x995f9quunsre5vkd"

# Confirm royalty pct is 12
grep "PHASE2_ROYALTY_PCT" wrangler.toml
# Expected: PHASE2_ROYALTY_PCT = "12"

# Confirm old value "10" is gone
grep 'PHASE2_ROYALTY_PCT = "10"' wrangler.toml
# Expected: no output

# Build
npm run build
```

---

## What Happens After This Change

Every new mint:
1. `process.ts` sees `TREASURY_ADDRESS` is set
2. Calls `getOrCreateSplitterAddress(minterWallet, wave=1)`
3. SplitXCH API creates (or returns cached) puzzle address for this minter
4. That puzzle address is set as `royalty_address` with MintGarden
5. NFT is minted with 12% royalty encoded on-chain to the puzzle address
6. On every secondary sale: minter gets ~10%, treasury gets ~2%, SplitXCH keeps ~0.18%

Fallback: if SplitXCH API is unreachable, falls back to minter's wallet at 12%
(minter temporarily gets the full 12% — non-ideal but non-breaking).

---

## Suggested Commit Message

```
feat(mint): activate SplitXCH royalty split — 10% minter / 2% treasury

Sets TREASURY_ADDRESS and raises PHASE2_ROYALTY_PCT to 12% to activate
the already-coded SplitXCH integration. Secondary sale royalties will now
split: ~10% to the minter, ~2% to the project treasury, 0.18% SplitXCH fee.

SplitXCH puzzle addresses are deterministic per minter and cached in DB
(splitter_addresses table, migration 047). No code changes — config only.

Only file changed: wrangler.toml
```

---

## Report Format When Done

```
DONE: Enable SplitXCH Royalty Split
Files changed: wrangler.toml (only)
Build: PASS / FAIL
TypeScript: PASS / FAIL
Verification script: PASS / FAIL
Self-checks:
  - TREASURY_ADDRESS present with correct address: PASS/FAIL
  - PHASE2_ROYALTY_PCT = "12": PASS/FAIL
  - Old value "10" gone: PASS/FAIL
  - No other wrangler.toml lines changed: PASS/FAIL
Notes: [anything unexpected]
```
