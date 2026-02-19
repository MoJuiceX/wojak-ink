# Health Check Skill

Run a comprehensive health check on the wojak-ink codebase to catch issues before they reach CI.

## What This Checks

1. **ESLint Errors** - Code style and potential bugs
2. **TypeScript Errors** - Type safety issues
3. **Build Status** - Whether the project builds successfully
4. **Test Status** - Whether tests pass

## Instructions

Run these checks in order and report results:

### 1. ESLint Check (Critical)
```bash
npm run lint 2>&1 | tail -5
```
Report the error/warning count. If there are errors, list them.

### 2. TypeScript Check
```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -20
```
Report any type errors found.

### 3. Build Check
```bash
npm run build 2>&1 | tail -10
```
Confirm build succeeds or report failures.

### 4. Test Check (if tests exist)
```bash
npm test 2>&1 | tail -20
```
Report test results.

## Output Format

Provide a summary like:

```
## Health Check Results

| Check | Status | Details |
|-------|--------|---------|
| ESLint | PASS/FAIL | X errors, Y warnings |
| TypeScript | PASS/FAIL | X errors |
| Build | PASS/FAIL | Built in Xs |
| Tests | PASS/FAIL | X passed, Y failed |

### Issues Found
- [List any errors that need fixing]

### Recommended Actions
- [Steps to fix issues]
```

## Auto-Fix Mode

If errors are found and they're simple fixes (unused vars, const vs let, missing types), offer to fix them automatically.
