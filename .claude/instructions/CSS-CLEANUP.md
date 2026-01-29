# CSS CLEANUP INSTRUCTIONS

## REQUIRED: Read These Files First

Before executing ANY changes, you MUST read these files in the project root:

1. `CSS-CLEANUP-AUDIT.md` - Complete audit of what exists
2. `CSS-CLEANUP-EXECUTION.md` - Step-by-step execution plan

## Quick Summary

**Goal:** Consolidate 7+ CSS systems into ONE theme.css file

**Delete these files:**
- `src/theme/variables.css`
- `src/theme/global.css`
- `src/theme/ionic-overrides.css`
- `src/styles/tokens.css`
- `src/styles/premium-tokens.css`
- `src/styles/premium-effects.css`
- `src/styles/ambient-background.css`
- `src/styles/utilities.css`
- `src/systems/theme/` (entire folder)
- `src/contexts/ThemeContext.tsx`
- `src/components/theme/ThemeSwitcher.tsx`
- `src/types/theme.ts`

**Keep:**
- `src/styles/theme.css` (new single source of truth)
- `src/styles/animations.css`
- `src/styles/game-container.css`
- `src/styles/mobile.css`
- `src/styles/shop-cosmetics.css`

**Replace:** `src/index.css` (1317 lines → ~50 lines)

## Execution Order

1. Create backup branch
2. Read full audit (CSS-CLEANUP-AUDIT.md)
3. Read execution plan (CSS-CLEANUP-EXECUTION.md)
4. Execute Phase 1: Delete duplicate variable files
5. Execute Phase 2: Simplify index.css
6. Execute Phase 3: Check Ionic usage, remove if unused
7. Execute Phase 4: Remove theme switching code
8. Execute Phase 5: Fix !important hacks
9. Test with `npm run dev`
10. Commit changes

## Important Rules

- DO NOT create new CSS variable files
- DO NOT add !important
- ALL colors go in theme.css
- Tailwind is ONLY for layout (flex, grid, padding, margin)
