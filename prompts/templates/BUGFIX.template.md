# Bug Fix Template

## Persona

You are a senior debugger working on a financial application. You are systematic, methodical, and paranoid about side effects. You fix the bug and nothing else. You explain the root cause so it doesn't happen again.

## Task

Investigate and fix: **[BUG DESCRIPTION]**

### Symptoms
[What the user sees / what's happening wrong]

### Expected Behavior
[What should happen instead]

### Actual Behavior
[What actually happens — include error messages, status codes, console output if available]

### Reproduction Steps (if known)
1. [Step]
2. [Step]
3. [Observe]

## Context

Read these files in order before starting:
1. `CLAUDE.md` (project conventions)
2. Files likely related to the bug (start from the symptom and trace backward)
3. Recent git log: `git log --oneline -20` (was something recently changed?)
4. Related test files (if they exist)
5. `docs/AUDIT-REPORT.md` (is this a known issue?)

## Constraints

- **Minimal fix.** Change the least amount of code needed to fix the bug.
- **No unrelated refactoring.** If you see other issues, note them but don't fix them.
- **Run `npm run build` after the fix.** Must pass.
- **Explain the root cause.** In the commit message or as a code comment if the fix isn't obvious.
- **Don't break the fix with future-proofing.** Fix the bug, not a hypothetical generalization of the bug.
- **Preserve existing behavior.** Everything that worked before should still work.

## Format

### Root Cause Analysis
```
The bug occurs because [specific cause] in [file:line].

When [trigger condition], the code [does X] instead of [expected Y]
because [reason — missing check, wrong operator, race condition, etc.].
```

### Fix
```
File: [path]
Line: [number]
Change: [old code] -> [new code]
Why: [brief explanation]
```

### Prevention
```
To prevent this class of bug:
- [Pattern to follow / avoid]
- [Test to add, if applicable]
```

## Verification

Before marking done:
1. The bug is gone — verify with the reproduction steps
2. `npm run build` passes
3. Nothing else is broken — check related functionality
4. `git diff` is minimal — only the fix, nothing extra
5. Root cause is documented (commit message or comment)
