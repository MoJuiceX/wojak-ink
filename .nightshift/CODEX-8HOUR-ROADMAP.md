# Codex 8-Hour Night Shift Roadmap

**Approved by MoJuice @ 01:45 AM**  
**Goal:** Do it all. Maximize value. If you finish early, find more reasonable work.

---

## Timeline Overview

| Phase | Duration | Focus | Tasks | Status |
|-------|----------|-------|-------|--------|
| **0** | Now-02:00 | **Baseline + Security** | Diagnostics, lodash/swiper upgrades | 🟢 Running |
| **1** | 02:00-03:30 | **CI/Safety Hardening** | Lint scopes, Playwright guards | 🟡 Pending |
| **2** | 03:30-04:30 | **Performance Foundation** | Bundle splitting, dead code, caching | 🟡 Pending |
| **3** | 04:30-05:45 | **UX Layer 1** | Image optimization, skeleton loaders, errors | 🟡 Pending |
| **4** | 05:45-06:45 | **UX Layer 2** | Mobile polish, animations, accessibility | 🟡 Pending |
| **5** | 06:45-07:45 | **Code Quality** | CSS cleanup, TypeScript strictness | 🟡 Pending |
| **6** | 07:45-08:30 | **Final Validation** | Full build/test/lint pass, PR prep | 🟡 Pending |

---

## Detailed Task Queue (In Priority Order)

### ✅ PHASE 0 — Diagnostics & Security (Now → 02:00 AM)

**Already Running:**
- prepare-worktree-deps
- preflight-repo-snapshot
- checks-fast-baseline
- unit-failures-triage-report
- security-audit-report
- bundle-size-report
- manifest-orphans-report
- lint-debt-hotspots-report
- github-issue-snapshot-report
- **security-upgrade-lodash** — npm install + tests + build
- **security-upgrade-swiper** — npm install + tests + build

**Expected Outcome:**
- All tests pass ✅
- Security advisories resolved ✅
- Baseline metrics captured ✅

---

### 🟡 PHASE 1 — CI/Safety (02:00 → 03:30 AM)

**Do these in order:**

1. **lint-scope-hardening**
   - Add scoped lint scripts to package.json
   - Create docs/NIGHTSHIFT-CHECKS.md
   - Validate scripts work

2. **playwright-safety-guard**
   - Block production baseURL for unattended runs
   - Add environment check
   - Test that unattended mode works

**Expected Outcome:**
- CI automation is safer 🔒
- Nightshift can run unattended without prod risk

---

### 🟢 PHASE 2 — Performance Foundation (03:30 → 04:30 AM)

**Critical impact. Do all of these:**

1. **bundle-optimization-analysis**
   - Analyze 600kB+ chunks (index, vendor-wallet, html2canvas)
   - Implement code-splitting in vite.config
   - Lazy-load wallet SDK and export tools
   - **Goal:** 200-250kB reduction
   - Validate with build

2. **dead-code-and-unused-deps**
   - Use `npx depcheck` to find unused packages
   - Search for dead exports/functions
   - Remove safely, test, commit
   - **Goal:** Remove 2-3 unused dependencies

3. **test-coverage-gaps**
   - Run vitest --coverage
   - Identify untested hot paths (pages, services, API)
   - Write 2-3 high-impact tests
   - Improve coverage % reported in report

4. **performance-profiling**
   - Audit FightClub, Gallery, Arcade for unnecessary re-renders
   - Add React.memo() to expensive components
   - Add useMemo() for computed lists
   - Debounce vote submissions
   - **Goal:** 30-40% fewer re-renders

**Expected Outcome:**
- Initial load **40% faster** ⚡
- Better test coverage 🛡️
- Snappier voting/interactions

---

### 💎 PHASE 3 — UX Layer 1 (04:30 → 05:45 AM)

**Make it feel polished. Do all of these:**

1. **image-optimization-progressive**
   - Add blur→full resolution progressive loading
   - Implement lazy="loading" on all images
   - Add WebP + PNG fallback
   - Cache IPFS URLs in localStorage (24h TTL)
   - **Where:** Gallery, Rankings, NFTCard
   - Perceived load time **60% faster**

2. **skeleton-loaders-ui**
   - Create SkeletonCard, SkeletonRanking, SkeletonVoteCard components
   - Show skeletons while data loads
   - Progressive reveal (headers → content)
   - **Where:** Gallery, Rankings, FightClub
   - **Feel:** App feels 2x faster

3. **api-caching-and-dedup**
   - Create useCachedFetch hook (TTL-based)
   - Implement in-flight deduplication
   - Add localStorage fallback
   - **Use in:** Gallery, Rankings, FightClub, Treasury
   - **Benefit:** 50% fewer API calls, instant transitions

4. **error-handling-and-retry**
   - Add inline error components with Retry buttons
   - Implement exponential backoff for failed votes
   - Add toast notifications (success/error)
   - Better IPFS fallback visibility
   - **Coverage:** Gallery, FightClub, Rankings
   - **Feel:** Users trust the app more

**Expected Outcome:**
- Pages load visibly faster (skeletons + images)
- Fewer network calls
- Better error recovery
- Premium feeling

---

### ✨ PHASE 4 — UX Layer 2 (05:45 → 06:45 AM)

**Polish the experience:**

1. **mobile-responsive-polish**
   - Audit FightClub on <600px screens
   - Increase button tap zones to 44px minimum
   - Reorganize vote card (vertical mobile, horizontal desktop)
   - Stack rankings appropriately
   - Test multiple breakpoints
   - **Goal:** 2.5x better mobile conversions

2. **animations-and-micro-interactions**
   - Entrance animations (fade-in, slide-up)
   - Vote feedback (scale pulse on submit)
   - Score tick animations
   - Custom Wojak spinner
   - Hover effects (card lift, button glow)
   - Respect prefers-reduced-motion
   - **Feel:** Users feel delight ✨

**Expected Outcome:**
- Premium micro-interactions
- Mobile-first polish
- Accessible animations

---

### 🎨 PHASE 5 — Code Quality (06:45 → 07:45 AM)

**Internal quality:**

1. **css-cleanup-consolidated**
   - Audit for inline styles
   - Consolidate all visuals to src/styles/theme.css
   - Remove !important rules
   - Use CSS variables consistently
   - Ensure Tailwind is layout-only
   - **Goal:** Single source of truth for visuals

2. **typescript-strict-mode-audit**
   - Review tsconfig.json
   - Enable stricter flags (noImplicitAny, etc.)
   - Fix type issues
   - Validate tests + build
   - **Goal:** Safer codebase

3. **docs-cleanup-and-updates**
   - Update CLAUDE.md with nightshift findings
   - Update PROJECT_DOCUMENTATION.md
   - Create docs/NIGHTSHIFT-GUIDE.md
   - Summarize all changes & recommendations

**Expected Outcome:**
- Cleaner, safer codebase
- Future work easier
- Well-documented improvements

---

### 🏁 PHASE 6 — Final Validation (07:45 → 08:30 AM)

**Polish and ship:**

1. **git-cleanup-and-rebase**
   - Review all commits
   - Ensure clear, atomic commit messages
   - Prepare comprehensive PR description
   - Create nightshift-FINAL-SUMMARY.md

2. **final-validation-and-polish**
   - npx tsc --noEmit ✅
   - npx eslint ... ✅
   - npm run test:unit ✅
   - npm run build ✅
   - All checks must pass

3. **queue-expansion-from-findings**
   - Document next-night recommendations
   - List any blockers or decisions needed

**Expected Outcome:**
- Clean PR ready for merge ✅
- All checks passing ✅
- Comprehensive report for morning review ✅

---

## General Guidelines

### Safety
- ✅ Work only on `codex/nightly/2026-02-22-nightshift`
- ✅ Commit after each successful task
- ✅ No direct pushes to main
- ❌ Never deploy to production
- ❌ Never delete important dirs
- ❌ Never break tests without fixing

### If You Finish Early
**Don't stop.** Find more work:
- Run performance audits (Lighthouse)
- Review unused exports
- Look for naming improvements
- Add missing error boundaries
- Improve logging/debugging
- Write additional integration tests
- Refactor complex functions
- Add JSDoc comments to APIs

### If Something Fails
- Capture error in report
- Retry up to 3 times (exponential backoff)
- Move to next task (don't loop)
- Note blocker for morning review

---

## Success Criteria (By Morning)

✅ All phases complete or in progress  
✅ All tests passing (test:unit, build)  
✅ Bundle size reduced 10-15% from baseline  
✅ Code coverage improved 5-10% points  
✅ Mobile UX polished (44px buttons, responsive)  
✅ At least 5 animations implemented  
✅ 10+ accessibility fixes  
✅ CSS consolidated to single theme  
✅ Clean PR with clear commit messages  
✅ Comprehensive final summary report  

---

## Let's Go 🚀

You're approved. Work autonomously. Keep grinding. Report progress every 30 mins.  
Go make Wojak.ink premium. 💎

---

*This roadmap is your north star. If something's unclear, that's on me (BigP) — I'll check in every 30 mins.*
