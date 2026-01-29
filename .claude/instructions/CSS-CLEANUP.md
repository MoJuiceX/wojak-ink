# CSS CLEANUP INSTRUCTIONS

## STATUS: Phase 1-3 ✅ | Phase 4 ⏳ Required

## REQUIRED: Read This File

**`CSS-CLEANUP-PHASE4.md`** - Fix broken code (DO THIS NOW)

---

## Phase 4 Summary

### 4A: RESTORE Ambient CSS (keep effects)
Add ambient background and noise overlay CSS to `src/styles/theme.css`.
The CSS is provided in CSS-CLEANUP-PHASE4.md - copy it to the end of theme.css.

### 4B: Remove Unused npm Packages
```bash
npm uninstall @ionic/react @studio-freight/lenis crypto-js
```

### 4C: Delete Empty Folders
```bash
rm -rf src/theme/
```

### 4D: Verify
```bash
npm run build
npm run dev
```

---

## What Was Found

| Issue | Fix |
|-------|-----|
| AmbientBackground CSS missing | ADD to theme.css |
| noise-overlay CSS missing | ADD to theme.css |
| @ionic/react (0 imports) | npm uninstall |
| @studio-freight/lenis (0 imports) | npm uninstall |
| crypto-js (0 imports) | npm uninstall |
| src/theme/ empty folder | DELETE |

---

## Previous Phases (DONE)

| Phase | Files Deleted | Result |
|-------|---------------|--------|
| 1 | 13 | CSS systems consolidated |
| 2 | 9 | Theme switching removed |
| 3 | 32 | Dead hooks/components removed |

---

## Rules

- ALL visual styles in theme.css
- NO unused npm packages
- NO empty folders
- Game files untouched
