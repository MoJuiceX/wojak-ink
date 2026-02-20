#!/usr/bin/env bash
# =============================================================================
# verify-launch-ready.sh
# Full pre-launch readiness check for Wojak.ink minting pipeline.
# Run from project root: bash scripts/verify-launch-ready.sh
# =============================================================================

set -euo pipefail

PASS=0
FAIL=0
WARN=0
SECTION_FAILS=0

green()  { echo -e "  \033[32m✓\033[0m $1"; }
red()    { echo -e "  \033[31m✗\033[0m $1"; }
yellow() { echo -e "  \033[33m⚠\033[0m $1"; }
header() { echo -e "\n\033[1m[$1]\033[0m $2"; SECTION_FAILS=0; }

check() {
  local label="$1" result="$2" detail="${3:-}"
  if [ "$result" = "pass" ]; then
    green "$label"; PASS=$((PASS+1))
  elif [ "$result" = "warn" ]; then
    yellow "$label${detail:+ — $detail}"; WARN=$((WARN+1))
  else
    red "$label${detail:+ — $detail}"; FAIL=$((FAIL+1)); SECTION_FAILS=$((SECTION_FAILS+1))
  fi
}

db() {
  # Run a D1 remote query and return output
  npx wrangler d1 execute wojak-users --remote --command "$1" 2>/dev/null
}

# =============================================================================
# 1. Code — TypeScript + Build
# =============================================================================
header "1" "Code — TypeScript + Build"

if npx tsc --noEmit --project tsconfig.json > /tmp/tsc_out.txt 2>&1; then
  check "TypeScript (npx tsc --noEmit)" "pass"
else
  ERRORS=$(wc -l < /tmp/tsc_out.txt | tr -d ' ')
  check "TypeScript (npx tsc --noEmit)" "fail" "$ERRORS error lines — see /tmp/tsc_out.txt"
fi

if npm run build > /tmp/build_out.txt 2>&1; then
  check "Build (npm run build)" "pass"
else
  check "Build (npm run build)" "fail" "Build failed — see /tmp/build_out.txt"
fi

# =============================================================================
# 2. Specs Applied — Code Correctness
# =============================================================================
header "2" "Specs Applied"

# Combat-in-metadata
if grep -q "buildCombatAttributes" functions/api/mint/process.ts && \
   grep -qn "attributes.push.*buildCombatAttributes" functions/api/mint/process.ts 2>/dev/null; then
  check "Combat identity in IPFS metadata (buildCombatAttributes called)" "pass"
else
  check "Combat identity in IPFS metadata (buildCombatAttributes called)" "fail" \
    "combat-in-metadata spec may not be applied"
fi

# Balanced nature fix
if grep -q "isBalanced" src/lib/combat/identity-calculator.ts && \
   ! grep -q "allClose" src/lib/combat/identity-calculator.ts; then
  check "Balanced nature fix (isBalanced, no allClose)" "pass"
else
  check "Balanced nature fix (isBalanced, no allClose)" "fail" \
    "balanced-nature-fix spec may not be applied"
fi

# Name randomizer — Tang Gang words
if grep -q "'Bepe'" src/lib/nameGenerator.ts && \
   grep -q "'Honk'" src/lib/nameGenerator.ts && \
   grep -q "'Peel'" src/lib/nameGenerator.ts && \
   grep -q "'Winners Win'" src/lib/nameGenerator.ts; then
  check "Name randomizer — Tang Gang word pools present" "pass"
else
  check "Name randomizer — Tang Gang word pools present" "fail" \
    "name-randomizer spec may not be applied"
fi

# Old generic names gone
if grep -q "'Moon'" src/lib/nameGenerator.ts || grep -q "'Donut'" src/lib/nameGenerator.ts; then
  check "Old generic name pool removed" "fail" "Old words (Moon, Donut) still in nameGenerator.ts"
else
  check "Old generic name pool removed" "pass"
fi

# =============================================================================
# 3. wrangler.toml — Config
# =============================================================================
header "3" "wrangler.toml Configuration"

TREASURY="xch13afmxv0xpyz03t3jfdmcrtv5ecwe5n52977vxd3z2x995f9quunsre5vkd"

if grep -q "TREASURY_ADDRESS = \"$TREASURY\"" wrangler.toml; then
  check "TREASURY_ADDRESS set to correct address" "pass"
else
  check "TREASURY_ADDRESS set to correct address" "fail" "Expected address: $TREASURY"
fi

if grep -q 'PHASE2_ROYALTY_PCT = "12"' wrangler.toml; then
  check "PHASE2_ROYALTY_PCT = \"12\" (10% minter + 2% treasury)" "pass"
else
  check "PHASE2_ROYALTY_PCT = \"12\"" "fail" "Still set to old value"
fi

if grep -q "PHASE2_COLLECTION_UUID" wrangler.toml && \
   grep -q "PHASE2_PROFILE_ID" wrangler.toml; then
  check "MintGarden collection UUID + profile ID present" "pass"
else
  check "MintGarden collection UUID + profile ID present" "fail"
fi

if grep -q "PINATA_GATEWAY" wrangler.toml; then
  check "PINATA_GATEWAY configured" "pass"
else
  check "PINATA_GATEWAY configured" "fail"
fi

# =============================================================================
# 4. Remote DB — Critical Tables
# =============================================================================
header "4" "Remote DB — Tables"

DB_TABLES=$(db "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;" 2>/dev/null)

for table in mint_jobs mint_counter phase2_mints mint_audit_log \
             credit_events credit_spends trait_usage server_state \
             splitter_addresses combat_fighters; do
  if echo "$DB_TABLES" | grep -q "\"$table\""; then
    check "Table: $table" "pass"
  else
    check "Table: $table" "fail" "Missing — may need migration applied"
  fi
done

# =============================================================================
# 5. Remote DB — Critical Columns
# =============================================================================
header "5" "Remote DB — Columns"

MINT_JOBS_COLS=$(db "PRAGMA table_info(mint_jobs);" 2>/dev/null)
TRAIT_COLS=$(db "PRAGMA table_info(trait_usage);" 2>/dev/null)

if echo "$MINT_JOBS_COLS" | grep -q '"custom_name"'; then
  check "mint_jobs.custom_name (migration 046)" "pass"
else
  check "mint_jobs.custom_name (migration 046)" "fail" "Migration 046 may not be applied"
fi

if echo "$MINT_JOBS_COLS" | grep -q '"combat_moves_json"'; then
  check "mint_jobs.combat_moves_json (migration 061)" "pass"
else
  check "mint_jobs.combat_moves_json (migration 061)" "fail" "Migration 061 may not be applied"
fi

if echo "$TRAIT_COLS" | grep -q '"effective_usage"' && \
   echo "$TRAIT_COLS" | grep -q '"last_decay_at"'; then
  check "trait_usage decay columns — effective_usage + last_decay_at (migration 034)" "pass"
else
  check "trait_usage decay columns" "fail" "Migration 034 may not be applied"
fi

# =============================================================================
# 6. Remote DB — Live State
# =============================================================================
header "6" "Remote DB — Live State"

# mint_counter seeded
NEXT_NUM=$(db "SELECT next_number FROM mint_counter WHERE id=1;" 2>/dev/null | grep '"next_number"' | grep -o '[0-9]*')
if [ -n "$NEXT_NUM" ] && [ "$NEXT_NUM" -gt 0 ]; then
  check "mint_counter seeded (next_number = $NEXT_NUM)" "pass"
else
  check "mint_counter seeded" "fail" "mint_counter not seeded or missing"
fi

# minting_paused flag
PAUSED=$(db "SELECT value FROM server_state WHERE key='minting_paused';" 2>/dev/null | grep '"value"' | grep -o '"[^"]*"' | tail -1 | tr -d '"')
if [ "$PAUSED" = "true" ]; then
  check "minting_paused = true (intentionally OFF before launch)" "warn" \
    "Remember to flip to 'false' when ready: UPDATE server_state SET value='false' WHERE key='minting_paused'"
elif [ "$PAUSED" = "false" ]; then
  check "minting_paused = false (minting is LIVE)" "warn" "Minting is active right now"
else
  check "minting_paused flag present in server_state" "fail" "Flag missing — insert before launch"
fi

# No stuck in-flight jobs
INFLIGHT=$(db "SELECT COUNT(*) as c FROM mint_jobs WHERE step NOT IN ('completed','failed','refunded') AND created_at < datetime('now','-30 minutes');" 2>/dev/null | grep '"c"' | grep -o '[0-9]*')
if [ -z "$INFLIGHT" ] || [ "$INFLIGHT" -eq 0 ]; then
  check "No stale in-flight jobs (>30 min old)" "pass"
else
  check "No stale in-flight jobs" "fail" "$INFLIGHT job(s) stuck — check mint_jobs table"
fi

# Supply headroom
MINTED=$(db "SELECT COUNT(*) as c FROM phase2_mints WHERE status='minted';" 2>/dev/null | grep '"c"' | grep -o '[0-9]*')
if [ -n "$MINTED" ]; then
  REMAINING=$((4200 - MINTED))
  if [ "$REMAINING" -gt 0 ]; then
    check "Supply available ($MINTED / 4200 minted, $REMAINING remaining)" "pass"
  else
    check "Supply available" "fail" "SOLD OUT — 4200/4200 minted"
  fi
else
  check "Supply check" "fail" "Could not query phase2_mints"
fi

# No pending expired offers
EXPIRED=$(db "SELECT COUNT(*) as c FROM phase2_mints WHERE status='pending' AND expires_at < datetime('now');" 2>/dev/null | grep '"c"' | grep -o '[0-9]*')
if [ -z "$EXPIRED" ] || [ "$EXPIRED" -eq 0 ]; then
  check "No expired pending offers stuck in DB" "pass"
else
  check "Expired pending offers" "warn" "$EXPIRED expired offer(s) still marked pending — minor, auto-expires on next submit"
fi

# =============================================================================
# 7. External APIs
# =============================================================================
header "7" "External APIs"

# SplitXCH
SPLITXCH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
  -X OPTIONS https://splitxch.com/api/compute/fast 2>/dev/null || echo "000")
if [ "$SPLITXCH_STATUS" != "000" ]; then
  check "SplitXCH API reachable (HTTP $SPLITXCH_STATUS)" "pass"
else
  check "SplitXCH API reachable" "fail" "Timeout or unreachable — royalty split will fall back to minter wallet"
fi

# Pinata
PINATA_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
  https://api.pinata.cloud 2>/dev/null || echo "000")
if [ "$PINATA_STATUS" != "000" ]; then
  check "Pinata API reachable (HTTP $PINATA_STATUS)" "pass"
else
  check "Pinata API reachable" "fail" "IPFS uploads will fail"
fi

# MintGarden
MG_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
  https://api.mintgarden.io 2>/dev/null || echo "000")
if [ "$MG_STATUS" != "000" ]; then
  check "MintGarden API reachable (HTTP $MG_STATUS)" "pass"
else
  check "MintGarden API reachable" "fail" "Minting will fail"
fi

# =============================================================================
# 8. Test Plan Reminder
# =============================================================================
header "8" "Pre-Live Test Checklist"

echo "  Run these manually after applying migration 047 + deploying:"
echo ""
echo "  [ ] Free mint end-to-end (custom name + random name)"
echo "  [ ] NFT attributes include: Combat Type, Nature, Ability, Move 1-4"
echo "  [ ] NFT name matches what was entered"
echo "  [ ] Credits deducted after free mint"
echo "  [ ] SELECT * FROM splitter_addresses; — one row for your wallet"
echo "  [ ] SELECT * FROM combat_fighters ORDER BY id DESC LIMIT 1; — your NFT"
echo "  [ ] Royalty address on new NFT = SplitXCH puzzle (NOT your wallet)"
echo "      Check on: https://www.spacescan.io/ or https://mintgarden.io/"
echo "  [ ] Paid mint end-to-end — offer appears in Sage wallet"
echo "  [ ] Accept offer in Sage — confirmation screen appears"
echo "  [ ] Sell new NFT to second wallet — royalty split arrives:"
echo "      ~10% to minter wallet, ~2% to treasury"
echo "  [ ] New backgrounds visible in generator"
echo "  [ ] Generator supply counter increments after each mint"
echo "  [ ] Reload during paid countdown — countdown resumes"
echo ""

check "Test checklist printed (run items above manually)" "warn" "Manual tests still required"

# =============================================================================
# Summary
# =============================================================================
echo ""
echo "══════════════════════════════════════════════════════════"
echo "  RESULT: $PASS passed   $FAIL failed   $WARN warnings"
echo "══════════════════════════════════════════════════════════"

if [ "$FAIL" -eq 0 ] && [ "$WARN" -le 2 ]; then
  echo -e "\033[32m✅ READY FOR TEST MINT — apply migration 047, deploy, then test\033[0m"
  echo ""
  echo "  Final launch sequence:"
  echo "  1. npx wrangler d1 execute wojak-users --remote --file functions/migrations/047_splitxch.sql"
  echo "  2. npm run build && npx wrangler pages deploy dist --project-name=wojak-ink"
  echo "  3. Run test mints (see checklist above)"
  echo "  4. npx wrangler d1 execute wojak-users --remote --command \\"
  echo "       \"UPDATE server_state SET value='false', updated_at=datetime('now') WHERE key='minting_paused';\""
  echo "  5. 🍊 GO LIVE"
elif [ "$FAIL" -eq 0 ]; then
  echo -e "\033[33m⚠️  CLOSE — review warnings above before proceeding\033[0m"
else
  echo -e "\033[31m❌ NOT READY — $FAIL issue(s) must be resolved before launch\033[0m"
fi

exit $FAIL
