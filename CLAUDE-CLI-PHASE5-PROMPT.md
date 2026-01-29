# CLAUDE CLI - PHASE 5 EXECUTION PROMPT

## YOUR MISSION

Remove ALL Ionic dependencies from this codebase. Replace with existing native components.

## INSTRUCTION FILE

**Read this file FIRST:**
```
CSS-CLEANUP-PHASE5.md
```

It contains:
- Complete replacement code for each file
- CSS additions needed
- Icon mappings
- Verification steps

## FILES TO MODIFY (in order)

### 1. src/main.tsx
Remove these 3 things:
- `import { setupIonicReact } from '@ionic/react'`
- `import '@ionic/react/css/core.css'`
- The `setupIonicReact({ mode: 'ios' })` call

### 2. src/components/auth/SignInButton.tsx
**FULL REWRITE** - Replace entire file with code from Phase 5 doc.
Also update `src/components/auth/SignInButton.css` with the new styles.

### 3. src/components/settings/NotificationSettings.tsx
**FULL REWRITE** - Replace entire file with code from Phase 5 doc.
Also update `src/components/settings/NotificationSettings.css` with the new styles.

### 4. src/components/TraitValues.tsx
**FULL REWRITE** - Replace entire file with code from Phase 5 doc.
Also update `src/components/TraitValues.css` with the search input styles.

### 5. src/components/AskBigPulp.tsx
**FIND/REPLACE** operations:
- Replace Ionic imports with lucide-react imports
- Replace all `<IonImg` → `<img` (add `loading="lazy"`)
- Replace all `<IonSpinner />` → `<LoadingSpinner size={24} />`
- Replace all `<IonSpinner name="dots" />` → `<LoadingDots size={8} />`
- Replace all `<IonIcon icon={...}` with lucide-react components

Icon mapping:
| ionicons | lucide-react |
|----------|--------------|
| chevronForward | ChevronRight |
| chevronBack | ChevronLeft |
| diamond | Diamond |
| statsChart | BarChart3 |
| school | GraduationCap |
| flame | Flame |
| pricetag | Tag |

### 6. Run npm uninstall
```bash
npm uninstall @ionic/react ionicons
```

## VERIFICATION

After all changes:

```bash
# Must pass with no errors
npm run build

# Should return NOTHING
grep -r "@ionic" src/ --include="*.tsx" --include="*.ts"
grep -r "ionicons" src/ --include="*.tsx" --include="*.ts"
```

## IMPORTANT NOTES

- **DO NOT COMMIT** - User will review and commit manually
- The codebase already has these components you should use:
  - `src/components/ui/LoadingSpinner.tsx` (exports LoadingSpinner and LoadingDots)
  - `src/components/ui/Toggle.tsx`
  - `src/components/ui/Dropdown.tsx`
- Theme classes like `.btn`, `.btn-primary`, `.input` are in `src/styles/theme.css`
- Use `lucide-react` for all icons (already installed)

## EXECUTION ORDER

1. Read `CSS-CLEANUP-PHASE5.md` thoroughly
2. Modify `main.tsx`
3. Rewrite `SignInButton.tsx` + CSS
4. Rewrite `NotificationSettings.tsx` + CSS
5. Rewrite `TraitValues.tsx` + CSS
6. Update `AskBigPulp.tsx` (find/replace)
7. Run `npm uninstall @ionic/react ionicons`
8. Run `npm run build` to verify
9. Run grep checks to confirm no Ionic remains
10. Report completion status

## SUCCESS CRITERIA

- [ ] Build passes with zero errors
- [ ] No `@ionic` imports anywhere in src/
- [ ] No `ionicons` imports anywhere in src/
- [ ] All spinners use LoadingSpinner/LoadingDots
- [ ] All toggles use Toggle component
- [ ] All selects use Dropdown component
- [ ] All icons use lucide-react
