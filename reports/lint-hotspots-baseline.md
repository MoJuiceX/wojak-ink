# Lint Hotspots Baseline

**Generated:** 2026-02-23 12:10 UTC

## Summary

This baseline captures known lint warnings in the codebase to track improvement over time.

- **Total warnings:** 27
- **Top categories:** `no-console`, `react-hooks/exhaustive-deps`, `no-explicit-any`
- **Scoped to:** `src/`, `functions/`, `workers/`

## Top Offenders

### 1. SageWalletProvider.tsx (15 warnings)
- **Path:** `.tmp/wc-vite-out/assets/Sage_wallet-connect/sage-wallet-react/SageWalletProvider.tsx`
- **Issues:**
  - Console statements (12)
  - React Hook dependency array issues (3)
- **Priority:** Low (vendored/temp dependency)

### 2. useSageWalletStandalone.ts (8 warnings)
- **Path:** `.tmp/wc-vite-out/assets/Sage_wallet-connect/sage-wallet-react/useSageWalletStandalone.ts`
- **Issues:**
  - Console statements (5)
  - React Hook dependency arrays (3)
- **Priority:** Low (vendored/temp dependency)

### 3. camera.ts (2 warnings)
- **Path:** `src/lib/juice/camera.ts`
- **Issues:** Console statements
- **Priority:** Medium (core library)

### 4. performanceDetector.ts (1 warning)
- **Path:** `src/lib/juice/performanceDetector.ts`
- **Issues:** Unused variable
- **Priority:** Low

### 5. generatorStateUtils.ts (1 warning)
- **Path:** `src/contexts/generatorStateUtils.ts`
- **Issues:** `no-explicit-any` type usage
- **Priority:** Medium

## Ignore Patterns

The following patterns should be excluded from lint enforcement:

```json
{
  "ignorePatterns": [
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/*.d.ts",
    "**/node_modules/**",
    "**/dist/**"
  ]
}
```

## Next Steps

1. **Review** - Periodically review this baseline against actual linting results
2. **Track** - Use this as a reference point for measuring progress
3. **Update** - Re-baseline when implementing fixes to hotspots
4. **Enforce** - Consider enabling stricter rules as codebase improves

## Strategy

- **Do not block CI** on these warnings
- **Focus on reductions** in new code and key files
- **Exemptions** for test files, type definitions, and generated code
- **Target:** Reduce console statements and fix React Hook issues in core libraries
