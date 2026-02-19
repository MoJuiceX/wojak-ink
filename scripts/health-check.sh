#!/bin/bash
# Quick health check script for wojak-ink
# Run: ./scripts/health-check.sh

set -e

echo "========================================"
echo "  Wojak.ink Health Check"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# 1. ESLint
echo "Checking ESLint..."
LINT_OUTPUT=$(npm run lint 2>&1 || true)
LINT_ERRORS=$(echo "$LINT_OUTPUT" | grep -E "^\s*[0-9]+ errors" | grep -oE "[0-9]+ errors" | head -1 || echo "0 errors")
LINT_WARNINGS=$(echo "$LINT_OUTPUT" | grep -E "[0-9]+ warnings" | grep -oE "[0-9]+ warnings" | head -1 || echo "0 warnings")

if echo "$LINT_ERRORS" | grep -q "^0"; then
  echo -e "${GREEN}✓ ESLint: PASS${NC} ($LINT_WARNINGS)"
else
  echo -e "${RED}✗ ESLint: FAIL${NC} ($LINT_ERRORS, $LINT_WARNINGS)"
  ERRORS=$((ERRORS + 1))
fi

# 2. TypeScript
echo "Checking TypeScript..."
TSC_OUTPUT=$(npx tsc --noEmit --skipLibCheck 2>&1 || true)
TSC_ERROR_COUNT=$(echo "$TSC_OUTPUT" | grep -c "error TS" 2>/dev/null || echo "0")
TSC_ERROR_COUNT=$(echo "$TSC_ERROR_COUNT" | head -1 | tr -d '[:space:]')

if [ "$TSC_ERROR_COUNT" = "0" ] || [ -z "$TSC_ERROR_COUNT" ]; then
  echo -e "${GREEN}✓ TypeScript: PASS${NC}"
else
  echo -e "${RED}✗ TypeScript: FAIL${NC} ($TSC_ERROR_COUNT errors)"
  ERRORS=$((ERRORS + 1))
fi

# 3. Build
echo "Checking Build..."
BUILD_OUTPUT=$(npm run build 2>&1 || true)
if echo "$BUILD_OUTPUT" | grep -q "built in"; then
  BUILD_TIME=$(echo "$BUILD_OUTPUT" | grep "built in" | tail -1)
  echo -e "${GREEN}✓ Build: PASS${NC} ($BUILD_TIME)"
else
  echo -e "${RED}✗ Build: FAIL${NC}"
  ERRORS=$((ERRORS + 1))
fi

echo ""
echo "========================================"
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}All checks passed!${NC}"
  exit 0
else
  echo -e "${RED}$ERRORS check(s) failed${NC}"
  echo ""
  echo "Run 'npm run lint' to see ESLint details"
  echo "Run 'npx tsc --noEmit' to see TypeScript details"
  exit 1
fi
