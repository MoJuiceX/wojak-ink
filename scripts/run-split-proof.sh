#!/usr/bin/env bash
# Run the SplitXCH-on-chain proof and save the report.
# Usage: ADMIN_SECRET=your_secret ./scripts/run-split-proof.sh
# Or:    ADMIN_SECRET=your_secret bash scripts/run-split-proof.sh

set -euo pipefail

if [ -z "${ADMIN_SECRET:-}" ]; then
  echo "Error: ADMIN_SECRET is not set."
  echo "Usage: ADMIN_SECRET=your_secret $0"
  exit 1
fi

OUTPUT_FILE="split-proof-$(date +%Y%m%d-%H%M%S).txt"
echo "Running verification and saving to ${OUTPUT_FILE} ..."
BASE_URL="${BASE_URL:-https://wojak.ink}" ADMIN_SECRET="$ADMIN_SECRET" npx tsx scripts/verify-split-on-mints.ts 2>&1 | tee "$OUTPUT_FILE"
EXIT=$?
echo ""
echo "Output saved to: ${OUTPUT_FILE}"
if [ $EXIT -eq 0 ]; then
  echo "Proof complete: all minted NFTs have SplitXCH set on-chain. Keep ${OUTPUT_FILE} as evidence."
else
  echo "Verification reported mismatches or errors. Check ${OUTPUT_FILE}."
fi
exit $EXIT
