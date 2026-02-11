#!/usr/bin/env bash
# Credit Leaderboard — One-shot go-live script
#
# Prerequisites:
#   - npx wrangler logged in (wrangler login) or CLOUDFLARE_API_TOKEN set
#   - Backfill already run: npx tsx scripts/backfill-credits.ts --since=2026-01-05
#   - Generated file exists: scripts/backfill-credits-data.sql
#
# Run from repo root:
#   ./scripts/leaderboard-go-live.sh
#
# Steps: 1) D1 migration  2) D1 backfill  3) Deploy credit-tracker worker  4) Build + deploy Pages

set -e
cd "$(dirname "$0")/.."

echo "============================================================"
echo "  Credit Leaderboard — Go Live"
echo "============================================================"
echo ""

# 1. D1 migration (idempotent: CREATE TABLE IF NOT EXISTS)
echo "[1/4] Applying D1 migration (030_credit_system.sql)..."
npx wrangler d1 execute wojak-users --remote --file=functions/migrations/030_credit_system.sql
echo "  Done."
echo ""

# 2. D1 backfill (credit_events + floor snapshot)
if [[ ! -f scripts/backfill-credits-data.sql ]]; then
  echo "[2/4] No backfill-credits-data.sql found. Run first:"
  echo "  npx tsx scripts/backfill-credits.ts --since=2026-01-05"
  exit 1
fi
echo "[2/4] Applying backfill SQL to D1..."
npx wrangler d1 execute wojak-users --remote --file=scripts/backfill-credits-data.sql
echo "  Done."
echo ""

# 3. Deploy credit-tracker worker (cron every 30 min)
echo "[3/4] Deploying credit-tracker worker..."
cd workers/credit-tracker
npx wrangler deploy
cd ../..
echo "  Done."
echo ""

# 4. Build and deploy Pages
echo "[4/4] Building and deploying Pages..."
npm run build
npx wrangler pages deploy dist --project-name=wojak-ink
echo "  Done."
echo ""

echo "============================================================"
echo "  Leaderboard is live."
echo "  - API: /api/credits/leaderboard, /api/credits/history"
echo "  - Worker: runs every 30 min, adds new sales to D1"
echo "  - Open the Generator and click Leaderboard (trophy), or"
echo "    /credit-leaderboard-verifier.html"
echo "============================================================"
