# FINAL CLEANUP - Execute Everything Now

**Time Budget:** 1 hour
**Goal:** Verify Phase 5 + Commit + Execute Phase A + Phase B + Commit

---

## STEP 1: Verify Phase 5 Build (5 min)

```bash
cd /sessions/optimistic-stoic-bell/mnt/wojak-ink

# Build must pass
npm run build

# Verify no Ionic remains
grep -r "@ionic" src/ --include="*.tsx" --include="*.ts" | wc -l
# Expected: 0

grep -r "ionicons" src/ --include="*.tsx" --include="*.ts" | wc -l
# Expected: 0
```

If build passes and counts are 0, proceed to Step 2.

---

## STEP 2: Commit Phase 5 (2 min)

```bash
git add -A

git commit -m "$(cat <<'EOF'
refactor: remove Ionic completely (Phase 5)

- Remove @ionic/react and ionicons packages
- Update 24 files to use native components
- Replace IonSpinner → LoadingSpinner/LoadingDots
- Replace IonToggle → Toggle
- Replace IonSelect → Dropdown
- Replace ionicons → lucide-react

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## STEP 3: Phase A - Delete Unused Components (5 min)

### A.1 Verify and delete GlowContainer and GlassCard

```bash
# Verify not used anywhere
grep -r "GlowContainer\|GlassCard" src/ --include="*.tsx" --include="*.ts" | grep -v "src/components/theme"

# If nothing returned, delete them
rm -f src/components/theme/GlowContainer.tsx
rm -f src/components/theme/GlassCard.tsx
```

### A.2 Update barrel export

**File:** `src/components/theme/index.ts`

Remove or comment out these lines:
```typescript
export { GlowContainer } from './GlowContainer';
export { GlassCard } from './GlassCard';
```

---

## STEP 4: Phase A - Delete Empty Directories (3 min)

```bash
# Delete all empty directories
rmdir src/components/features 2>/dev/null || true
rmdir src/components/media/shared 2>/dev/null || true
rmdir src/games/WojakRunner/components 2>/dev/null || true
rmdir src/games/OrangePong/components 2>/dev/null || true
rmdir src/games/OrangeJuggle/components 2>/dev/null || true
rmdir src/games/Orange2048/components 2>/dev/null || true
rmdir src/games/MemoryMatch/components 2>/dev/null || true
rmdir src/games/ColorReaction/components 2>/dev/null || true
rmdir src/games/KnifeGame/components 2>/dev/null || true

# Verify no empty dirs remain
find src -type d -empty
```

---

## STEP 5: Phase A - Fix voting.css !important (5 min)

**File:** `src/styles/voting.css`

Find lines with `!important` related to cursor and fix them by using higher specificity instead.

**Pattern to find:**
```css
cursor: crosshair !important;
```

**Replace with (use specificity):**
```css
cursor: crosshair;
```

If there's a specificity issue, wrap in a more specific selector:
```css
.voting-grid .vote-cell {
  cursor: crosshair;
}
```

---

## STEP 6: Phase A - Add CSS Utility Classes (10 min)

**File:** `src/styles/theme.css`

**Add at END of file:**

```css
/* ═══════════════════════════════════════════════════════════════════════════════
   UTILITY CLASSES
   For common inline style patterns - reduces JavaScript style={{}} usage
   ═══════════════════════════════════════════════════════════════════════════════ */

/* Text Color Utilities */
.text-primary { color: var(--color-text); }
.text-secondary { color: var(--color-text-secondary); }
.text-muted { color: var(--color-text-muted); }
.text-accent { color: var(--color-primary); }
.text-success { color: var(--color-success); }
.text-warning { color: var(--color-warning); }
.text-error { color: var(--color-error); }

/* Background Color Utilities */
.bg-base { background: var(--color-bg); }
.bg-surface { background: var(--color-surface); }
.bg-elevated { background: var(--color-elevated); }
.bg-primary { background: var(--color-primary); }

/* Flex Utilities (supplement Tailwind) */
.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Opacity Utilities */
.opacity-muted { opacity: 0.6; }
.opacity-subtle { opacity: 0.3; }

/* Cursor Utilities */
.cursor-pointer { cursor: pointer; }
.cursor-default { cursor: default; }
```

---

## STEP 7: Verify Phase A (3 min)

```bash
# Build must still pass
npm run build

# Check theme components are gone
ls src/components/theme/

# Check no empty dirs
find src -type d -empty

# Check utilities in theme.css
grep "text-primary\|bg-surface\|flex-center" src/styles/theme.css | wc -l
# Expected: 3+
```

---

## STEP 8: Phase B - Consolidate Game CSS Files (10 min)

### B.1 Check if game CSS files exist and their content

```bash
ls -la src/styles/game-*.css
wc -l src/styles/game-*.css
```

### B.2 If game-colors.css and game-container.css both exist, merge them

```bash
# Create merged file
cat src/styles/game-colors.css > src/styles/game-ui.css
echo "" >> src/styles/game-ui.css
echo "/* === GAME CONTAINER STYLES === */" >> src/styles/game-ui.css
cat src/styles/game-container.css >> src/styles/game-ui.css

# Delete old files
rm src/styles/game-colors.css
rm src/styles/game-container.css
```

### B.3 Update import in index.css

**File:** `src/index.css`

Find and replace:
```css
@import './styles/game-colors.css';
@import './styles/game-container.css';
```

With:
```css
@import './styles/game-ui.css';
```

---

## STEP 9: Final Build Verification (5 min)

```bash
# Full build
npm run build

# Start dev server briefly to check
npm run dev &
sleep 10
kill %1

# If no errors, ready to commit
```

---

## STEP 10: Commit Phase A + B (2 min)

```bash
git add -A

git commit -m "$(cat <<'EOF'
refactor: cleanup unused code and consolidate CSS (Phase A+B)

Phase A - Quick Wins:
- Delete unused GlowContainer and GlassCard components
- Remove 9 empty directories
- Add CSS utility classes to theme.css (.text-*, .bg-*, .flex-*)

Phase B - Consolidation:
- Merge game-colors.css + game-container.css → game-ui.css
- Update imports in index.css

No functional changes. Build passes.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## STEP 11: Cleanup Planning Files (5 min)

Delete all the planning/audit files we created:

```bash
rm -f CSS-CLEANUP-AUDIT.md
rm -f CSS-CLEANUP-EXECUTION.md
rm -f CSS-CLEANUP-PHASE2.md
rm -f CSS-CLEANUP-PHASE3.md
rm -f CSS-CLEANUP-PHASE4.md
rm -f CSS-CLEANUP-PHASE5.md
rm -f CSS-CLEANUP-DEFINITIVE.md
rm -f CSS-CLEANUP-VERIFICATION.md
rm -f CLAUDE-CLI-PHASE5-PROMPT.md
rm -f AUDIT-EXECUTIVE-SUMMARY.md
rm -f COMPREHENSIVE-CLEANUP-AUDIT.md
rm -f CLEANUP-ACTION-PLAN.md
rm -f CLEANUP-FINDINGS-DETAILED.md
rm -f CLEANUP-AUDIT-INDEX.md
rm -f CLAUDE-CLI-FINAL-CLEANUP.md
```

---

## STEP 12: Final Commit (2 min)

```bash
git add -A

git commit -m "$(cat <<'EOF'
chore: remove cleanup planning files

All CSS cleanup phases complete. Removing temporary planning documents.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## SUMMARY

| Step | Action | Time |
|------|--------|------|
| 1 | Verify Phase 5 build | 5 min |
| 2 | Commit Phase 5 | 2 min |
| 3 | Delete unused components | 5 min |
| 4 | Delete empty directories | 3 min |
| 5 | Fix voting.css | 5 min |
| 6 | Add CSS utilities | 10 min |
| 7 | Verify Phase A | 3 min |
| 8 | Consolidate game CSS | 10 min |
| 9 | Final build verification | 5 min |
| 10 | Commit Phase A+B | 2 min |
| 11 | Delete planning files | 5 min |
| 12 | Final commit | 2 min |
| **TOTAL** | | **57 min** |

---

## SUCCESS CRITERIA

After all steps:

- [ ] Build passes with zero errors
- [ ] No @ionic imports in codebase
- [ ] No ionicons imports in codebase
- [ ] GlowContainer and GlassCard deleted
- [ ] No empty directories in src/
- [ ] CSS utility classes in theme.css
- [ ] Game CSS consolidated to game-ui.css
- [ ] All planning files deleted
- [ ] 3 clean commits in git history

---

## IF SOMETHING FAILS

1. **Build fails after any step:** `git checkout .` to revert, investigate, fix
2. **Missing file:** Skip that step, note in commit message
3. **Import not found:** Check actual import path, adjust accordingly

The changes are all non-breaking. If any step is problematic, skip it and move on.
