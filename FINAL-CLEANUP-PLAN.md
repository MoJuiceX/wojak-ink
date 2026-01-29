# FINAL CLEANUP PLAN - Updated v2

**Current State:**
- ✅ Phase 5 (Ionic removal) - DONE (not committed)
- ✅ Unused npm packages removed (66 packages) - DONE (not committed)
- ⏳ Fix bundle size warning - NOT DONE
- ⏳ Phase A (unused components, empty dirs, CSS utilities) - NOT DONE
- ⏳ Commit everything - NOT DONE
- ⏳ Delete planning files - NOT DONE

---

## STEP 1: Fix Bundle Size + Remove Ionic Reference (10 min)

**File:** `vite.config.ts`

### 1.1 Remove @ionic/react from dedupe array (line 41)

**Find and delete this line:**
```typescript
'@ionic/react',
```

### 1.2 Add build configuration with manualChunks

**Add this after the `optimizeDeps` block (after line 55), before `server`:**

```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        // React core
        'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        // Animation library (large)
        'framer': ['framer-motion'],
        // Icons (many small files)
        'icons': ['lucide-react'],
        // Auth
        'clerk': ['@clerk/clerk-react'],
        // Data fetching
        'query': ['@tanstack/react-query'],
        // Google OAuth
        'oauth': ['@react-oauth/google'],
      },
    },
  },
  chunkSizeWarningLimit: 600, // Slightly raise limit for remaining chunks
},
```

### Full vite.config.ts after changes:

```typescript
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const useHttps = process.env.HTTPS === 'true'

  return {
    plugins: [
      react(),
      tailwindcss(),
      useHttps && basicSsl(),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': '/src',
        '@components': '/src/components',
        '@pages': '/src/pages',
        '@hooks': '/src/hooks',
        '@utils': '/src/utils',
        '@assets': '/src/assets',
        'react': path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime'),
        'react/jsx-dev-runtime': path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime'),
      },
      dedupe: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        '@tanstack/react-query',
        '@tanstack/query-core',
        'framer-motion',
        // REMOVED: '@ionic/react' - no longer used
      ],
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        '@tanstack/react-query',
        'framer-motion',
      ],
      force: false,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'framer': ['framer-motion'],
            'icons': ['lucide-react'],
            'clerk': ['@clerk/clerk-react'],
            'query': ['@tanstack/react-query'],
            'oauth': ['@react-oauth/google'],
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
    server: {
      host: true,
      allowedHosts: ['localhost', '.trycloudflare.com', '.loca.lt', '.ngrok.io', '.ngrok-free.app'],
      proxy: {
        '/api': {
          target: 'https://wojak.ink',
          changeOrigin: true,
          secure: true,
        },
        '/spacescan-api': {
          target: 'https://api.spacescan.io',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/spacescan-api/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (env.VITE_SPACESCAN_API_KEY) {
                proxyReq.setHeader('x-api-key', env.VITE_SPACESCAN_API_KEY);
              }
            });
          },
        },
        '/coingecko-api': {
          target: 'https://api.coingecko.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/coingecko-api/, ''),
        },
        '/mintgarden-api': {
          target: 'https://api.mintgarden.io',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/mintgarden-api/, ''),
        },
        '/dexie-api': {
          target: 'https://api.dexie.space',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/dexie-api/, ''),
        },
        '/parsebot-api': {
          target: 'https://api.parse.bot',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/parsebot-api/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('x-api-key', env.VITE_PARSEBOT_API_KEY || '');
            });
          },
        },
      },
    },
  }
})
```

---

## STEP 2: Verify Build (2 min)

```bash
npm run build
```

**Expected:** No chunk size warnings (or minimal warnings under 600KB)

---

## STEP 3: Phase A - Delete Unused Components (5 min)

```bash
# Check if GlowContainer and GlassCard exist
ls src/components/theme/GlowContainer.tsx src/components/theme/GlassCard.tsx 2>/dev/null

# If they exist, verify not used elsewhere
grep -r "GlowContainer\|GlassCard" src/ --include="*.tsx" --include="*.ts" | grep -v "src/components/theme"

# If grep returns nothing, delete them
rm -f src/components/theme/GlowContainer.tsx
rm -f src/components/theme/GlassCard.tsx
```

**Then update `src/components/theme/index.ts`** - remove exports for deleted files.

---

## STEP 4: Phase A - Delete Empty Directories (2 min)

```bash
find src -type d -empty -delete
find src -type d -empty
# Expected: nothing
```

---

## STEP 5: Phase A - Add CSS Utility Classes (5 min)

**Check if utilities already exist:**
```bash
grep "\.text-primary\|\.bg-surface\|\.flex-center" src/styles/theme.css
```

**If NOT found, add at END of `src/styles/theme.css`:**

```css
/* ═══════════════════════════════════════════════════════════════════════════════
   UTILITY CLASSES
   ═══════════════════════════════════════════════════════════════════════════════ */

.text-primary { color: var(--color-text); }
.text-secondary { color: var(--color-text-secondary); }
.text-muted { color: var(--color-text-muted); }
.text-accent { color: var(--color-primary); }
.text-success { color: var(--color-success); }
.text-warning { color: var(--color-warning); }
.text-error { color: var(--color-error); }

.bg-base { background: var(--color-bg); }
.bg-surface { background: var(--color-surface); }
.bg-elevated { background: var(--color-elevated); }
.bg-primary { background: var(--color-primary); }

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

.opacity-muted { opacity: 0.6; }
.opacity-subtle { opacity: 0.3; }
```

---

## STEP 6: Final Build Verification (2 min)

```bash
npm run build
```

Must pass with no errors and no large chunk warnings.

---

## STEP 7: Commit Everything (3 min)

```bash
git add -A

git commit -m "$(cat <<'EOF'
refactor: major cleanup - Ionic removal, deps cleanup, bundle optimization

IONIC REMOVAL (Phase 5):
- Remove @ionic/react and ionicons packages completely
- Update 24+ files to use native components
- Replace IonSpinner → LoadingSpinner/LoadingDots
- Replace IonToggle → Toggle
- Replace IonSelect → Dropdown
- Replace ionicons → lucide-react icons

DEPENDENCY CLEANUP:
- Remove 66 unused npm packages
- Including: @dnd-kit/sortable, @radix-ui/*, @tanstack/react-query-devtools
- Including: bech32, @ffmpeg/*, ffmpeg-static, @types/crypto-js
- Package count: 528 → 462

BUNDLE OPTIMIZATION:
- Add manualChunks to split large vendors
- Separate: react-vendor, framer, icons, clerk, query, oauth
- Remove stale @ionic/react from vite dedupe config
- Eliminates chunk size warnings

PHASE A - Code Cleanup:
- Delete unused GlowContainer and GlassCard components
- Remove empty directories
- Add CSS utility classes to theme.css

Build passes. No functional changes.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## STEP 8: Delete Planning Files (3 min)

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
rm -f CLAUDE-CLI-FINAL-CLEANUP.md
rm -f AUDIT-EXECUTIVE-SUMMARY.md
rm -f COMPREHENSIVE-CLEANUP-AUDIT.md
rm -f CLEANUP-ACTION-PLAN.md
rm -f CLEANUP-FINDINGS-DETAILED.md
rm -f CLEANUP-AUDIT-INDEX.md
rm -f FINAL-CLEANUP-PLAN.md
```

---

## STEP 9: Final Commit (2 min)

```bash
git add -A

git commit -m "$(cat <<'EOF'
chore: remove cleanup planning files

All cleanup phases complete. Removing temporary documentation.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## STEP 10: Verify Final State (2 min)

```bash
# Build passes without warnings
npm run build 2>&1 | grep -i "warning\|error" || echo "No warnings!"

# No Ionic
grep -r "@ionic\|ionicons" src/ --include="*.tsx" --include="*.ts" | wc -l
# Expected: 0

# No empty directories
find src -type d -empty | wc -l
# Expected: 0

# Git log shows 2 commits
git log --oneline -3
```

---

## SUMMARY

| Step | Action | Time |
|------|--------|------|
| 1 | Fix vite.config.ts (chunks + remove ionic) | 10 min |
| 2 | Verify build | 2 min |
| 3 | Delete unused components | 5 min |
| 4 | Delete empty directories | 2 min |
| 5 | Add CSS utilities | 5 min |
| 6 | Final build verification | 2 min |
| 7 | Commit everything | 3 min |
| 8 | Delete planning files | 3 min |
| 9 | Final commit | 2 min |
| 10 | Verify final state | 2 min |
| **TOTAL** | | **36 min** |

---

## SUCCESS CRITERIA

- [ ] Build passes with no chunk size warnings
- [ ] 2 clean commits in git history
- [ ] No @ionic or ionicons imports
- [ ] No empty directories
- [ ] CSS utilities in theme.css
- [ ] All planning MD files deleted
- [ ] Package count at 462
