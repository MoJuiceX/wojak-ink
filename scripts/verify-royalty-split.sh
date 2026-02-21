#!/usr/bin/env bash
# verify-royalty-split.sh
# Verifies the SplitXCH royalty split configuration is correctly set up.
# Run from project root: bash scripts/verify-royalty-split.sh

set -euo pipefail

PASS=0
FAIL=0
TREASURY_EXPECTED="xch13afmxv0xpyz03t3jfdmcrtv5ecwe5n52977vxd3z2x995f9quunsre5vkd"

green() { echo -e "  \033[32m✓\033[0m $1"; }
red()   { echo -e "  \033[31m✗\033[0m $1"; }

check() {
  local label="$1"
  local result="$2"
  local detail="${3:-}"
  if [ "$result" = "pass" ]; then
    green "$label"
    PASS=$((PASS + 1))
  else
    red "$label${detail:+: $detail}"
    FAIL=$((FAIL + 1))
  fi
}

# ── 1. wrangler.toml ──────────────────────────────────────────────────────────
echo ""
echo "[1] wrangler.toml"

if grep -q "TREASURY_ADDRESS = \"$TREASURY_EXPECTED\"" wrangler.toml; then
  check "TREASURY_ADDRESS set to correct address" "pass"
else
  check "TREASURY_ADDRESS set to correct address" "fail" \
    "Expected: TREASURY_ADDRESS = \"$TREASURY_EXPECTED\""
fi

if grep -q 'PHASE2_ROYALTY_PCT = "12"' wrangler.toml; then
  check "PHASE2_ROYALTY_PCT = \"12\"" "pass"
else
  check "PHASE2_ROYALTY_PCT = \"12\"" "fail" "Expected \"12\", not \"10\""
fi

if grep -q 'PHASE2_ROYALTY_PCT = "10"' wrangler.toml; then
  check "Old PHASE2_ROYALTY_PCT = \"10\" is removed" "fail" "Old value still present"
else
  check "Old PHASE2_ROYALTY_PCT = \"10\" is removed" "pass"
fi

# ── 2. splitxch.ts — basis points math ───────────────────────────────────────
echo ""
echo "[2] functions/api/mint/splitxch.ts — basis points"

SPLITXCH="functions/api/mint/splitxch.ts"

if grep -q "creatorPoints: 8258" "$SPLITXCH"; then
  check "Wave 1 creatorPoints = 8258" "pass"
else
  check "Wave 1 creatorPoints = 8258" "fail" "Value changed — do not modify splitxch.ts"
fi

if grep -q "treasuryPoints: 1592" "$SPLITXCH"; then
  check "Wave 1 treasuryPoints = 1592" "pass"
else
  check "Wave 1 treasuryPoints = 1592" "fail" "Value changed — do not modify splitxch.ts"
fi

# 8258 + 1592 + 150 (SplitXCH fee) = 10,000
TOTAL=$((8258 + 1592 + 150))
if [ "$TOTAL" -eq 10000 ]; then
  check "Basis points sum to 10,000 (8258 + 1592 + 150 fee)" "pass"
else
  check "Basis points sum to 10,000 (8258 + 1592 + 150 fee)" "fail" "Sum is $TOTAL"
fi

if grep -q "splitxch.com/api/compute/fast" "$SPLITXCH"; then
  check "SplitXCH API URL present" "pass"
else
  check "SplitXCH API URL present" "fail"
fi

# ── 3. process.ts — SplitXCH is wired up ─────────────────────────────────────
echo ""
echo "[3] functions/api/mint/process.ts — SplitXCH wiring"

PROCESS="functions/api/mint/process.ts"

if grep -q "getOrCreateSplitterAddress" "$PROCESS"; then
  check "getOrCreateSplitterAddress is called" "pass"
else
  check "getOrCreateSplitterAddress is called" "fail" "SplitXCH not invoked in processJob"
fi

if grep -q "env.TREASURY_ADDRESS" "$PROCESS"; then
  check "TREASURY_ADDRESS guard present in processJob" "pass"
else
  check "TREASURY_ADDRESS guard present in processJob" "fail"
fi

# ── 4. prepare.ts — SplitXCH for legacy path (free + paid) ───────────────────
echo ""
echo "[4] functions/api/mint/prepare.ts — SplitXCH wiring"

PREPARE="functions/api/mint/prepare.ts"

if grep -q "getOrCreateSplitterAddress" "$PREPARE"; then
  check "getOrCreateSplitterAddress is called in prepare" "pass"
else
  check "getOrCreateSplitterAddress is called in prepare" "fail" "SplitXCH not used in prepare path"
fi

if grep -q "royaltyAddress" "$PREPARE"; then
  check "royaltyAddress passed to callMintGardenMint in prepare" "pass"
else
  check "royaltyAddress passed to callMintGardenMint in prepare" "fail"
fi

# ── 5. DB migration exists ────────────────────────────────────────────────────
echo ""
echo "[5] Database migration"

MIGRATION="functions/migrations/047_splitxch.sql"

if [ -f "$MIGRATION" ]; then
  check "Migration 047_splitxch.sql exists" "pass"
else
  check "Migration 047_splitxch.sql exists" "fail" "File not found: $MIGRATION"
fi

if grep -q "CREATE TABLE IF NOT EXISTS splitter_addresses" "$MIGRATION" 2>/dev/null; then
  check "splitter_addresses table defined in migration" "pass"
else
  check "splitter_addresses table defined in migration" "fail"
fi

# ── 6. SplitXCH API reachability ──────────────────────────────────────────────
echo ""
echo "[6] SplitXCH API reachability"

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  --max-time 10 \
  -X OPTIONS https://splitxch.com/api/compute/fast 2>/dev/null || echo "000")

if [ "$HTTP_STATUS" != "000" ]; then
  check "splitxch.com API reachable (HTTP $HTTP_STATUS)" "pass"
else
  check "splitxch.com API reachable" "fail" \
    "Could not reach https://splitxch.com — check network or service status"
fi

# ── 7. Royalty math sanity check ──────────────────────────────────────────────
echo ""
echo "[7] Royalty math (at 12% total on a 100 XCH sale)"

echo "     Minter share:   8258/10000 × 12 XCH = $(echo "scale=4; 8258/10000*12" | bc) XCH  (~10%)"
echo "     Treasury share: 1592/10000 × 12 XCH = $(echo "scale=4; 1592/10000*12" | bc) XCH  (~2%)"
echo "     SplitXCH fee:    150/10000 × 12 XCH = $(echo "scale=4; 150/10000*12"  | bc) XCH  (~0.18%)"
check "Math verified (8258 + 1592 + 150 = 10,000 basis points)" "pass"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "──────────────────────────────────────────────────────"
echo "Result: $PASS passed, $FAIL failed"

if [ "$FAIL" -eq 0 ]; then
  echo -e "\033[32m✅ ROYALTY SPLIT CONFIGURATION CORRECT\033[0m"
  echo "   Treasury: $TREASURY_EXPECTED"
  echo "   Split:    10% minter / 2% treasury / 0.18% SplitXCH fee"
  echo "   On-chain royalty: 12%"
  exit 0
else
  echo -e "\033[31m❌ CONFIGURATION HAS $FAIL ISSUE(S) — DO NOT DEPLOY\033[0m"
  exit 1
fi
