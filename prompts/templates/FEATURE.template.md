# New Feature Template

## Persona

You are a full-stack TypeScript developer building on React 19, Cloudflare Workers, and D1. You write clean, minimal code that follows existing patterns. You don't over-engineer. You don't add features that weren't asked for.

## Task

Implement: **[FEATURE NAME]**

### Current State
[What exists now — relevant files, current behavior]

### Desired State
[What should exist after — new behavior, new files, changed behavior]

### User Story
As a [who], I want to [what], so that [why].

### Acceptance Criteria
- [ ] [Specific, testable criterion]
- [ ] [Another criterion]
- [ ] Build passes (`npm run build`)

## Context

Read these files in order before starting:
1. `CLAUDE.md` (project conventions, CSS rules)
2. `.claude/instructions/PROMPT-PRINCIPLES.md` (constraints)
3. Similar existing features (identify the closest pattern)
4. Files that will be modified or consumed by this feature
5. `docs/BRAND-VOICE.md` (for any user-facing copy)

## Constraints

- **Follow existing patterns.** Find the most similar existing feature and match its structure.
- **No new dependencies without justification.** Explain in the commit message why it's needed.
- **No schema changes without a migration file.** Use `functions/migrations/NNN_description.sql`.
- **TypeScript strict mode must pass.** No `any`, no unused variables, no unhandled `undefined`.
- **Handle errors per BRAND-VOICE.** What happened, why, what to do.
- **Run `npm run build` before finishing.** Both `tsc -b` and `vite build` must pass.
- **Mobile-first.** Test at 375px width minimum.
- **Use existing CSS classes.** Check `src/styles/theme.css` before creating styles.
- **Tailwind for layout only.** `flex`, `grid`, `gap`, `p-*`, `m-*`, `w-*`, `h-*`, responsive.

## Format

### File Structure
Follow the existing directory structure:
```
src/components/[feature]/   — React components
src/contexts/               — React context providers
src/hooks/                  — Custom hooks
src/services/               — API calls, business logic
src/types/                  — TypeScript types
functions/api/[feature]/    — Backend endpoints
functions/migrations/       — Database migrations
```

### Code Style
- JSDoc header on every new file (purpose, key behavior)
- Props interfaces for all components
- Handle all states: loading, error, empty, success
- Use `isSelectionPathEmpty()` not `=== 'None'` or `=== ''`
- Use `isValidChiaAddress()` not `startsWith('xch1')`
- Use `jsonResponse()`/`errorResponse()` from `_shared.ts` for API endpoints

## Verification

Before marking done:
1. `npm run build` passes
2. No orphan files (every new file is imported somewhere)
3. API endpoints return proper error codes (400, 401, 403, 404, 500)
4. `git diff` shows only changes related to this feature
5. User-facing copy follows brand voice
6. All UI states render correctly (loading, error, empty, success)
