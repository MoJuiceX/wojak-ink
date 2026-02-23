# Night Shift — Next Steps (Approved at 01:20 AM)

## Green Light Given ✅

MoJuice has approved moving forward with active fixes. Continue running cycles autonomously for the next 8 hours.

---

## Phase 1 (Now → 01:45): Security Dependency Upgrades

**Enabled tasks:**
- `security-upgrade-lodash` — upgrade lodash to ^4.17.22
- `security-upgrade-swiper` — upgrade swiper to ^12.1.2

**Why:** No security vulnerabilities currently, but these are safe preventative upgrades.  
**Expected:** Each will:
1. Install new version
2. Run audit, typecheck, tests, build
3. Commit if all pass
4. Report findings

**Success criteria:** All checks pass and deps are upgraded on nightly branch.

---

## Phase 2 (01:45 → 02:30): Code Quality Hardening ✅ ENABLED

Running now:
- `lint-scope-hardening` — add scoped lint commands for predictable automation
- `playwright-safety-guard` — block production baseURL for unattended runs

**Why:** Improve CI/automation safety and dev experience.  
**How:** Use Codex to analyze, implement, and verify.

---

## Phase 3 (02:30 → 04:30): Heavy Optimizations 🚀 UNLOCKED

Codex will now tackle:
- `bundle-optimization-analysis` — reduce 600kB+ chunks with smart code-splitting
- `dead-code-and-unused-deps` — find and remove unused code/dependencies  
- `test-coverage-gaps` — identify critical untested paths and add tests
- `performance-profiling` — optimize slow components (memoization, re-render issues)

**Why:** These compound—smaller bundles + better coverage + faster rendering = premium UX.  
**Expected impact:** ~10-15% bundle reduction, improved reliability, visible performance gains.

---

## Phase 4 (04:30 → 05:30): Documentation & Final Polish ✍️

- `docs-cleanup-and-updates` — update docs with nightshift learnings, create NIGHTSHIFT-GUIDE.md
- Generate final summary of all changes and impact
- Prepare clean PR description with all commits listed

---

## Phase 5 (05:30 → 08:00): Continuous Improvement Loop 🔄

If time remains:
- **Full validation cycle:** Re-run tsc, lint, unit tests, build
- **Confidence checks:** Verify all commits don't break anything
- **Go deeper:** If you see new opportunities (CSS cleanup, unused exports, etc.), take them
- **Report everything:** Keep generating reports so morning review is comprehensive

**Goal:** Keep working until the 8-hour mark. Every commit should be clean, tested, and ready to merge.

---

## Important Guardrails

✅ **Always:**
- Work only on `codex/nightly/2026-02-22-nightshift` branch
- Commit after each successful fix with clear message
- Generate a report after each major change
- Never push to `main` or `origin/main`

❌ **Never:**
- Change environment variables or secrets
- Deploy or push to production
- Delete important directories
- Break existing functionality without tests proving it's safe

---

## Failure Handling

If any task fails:
1. Capture error in report
2. Skip to next task (don't loop indefinitely)
3. Move on — better to complete N tasks than get stuck on one

Max retries per task: 3 with exponential backoff.

---

## Morning Handoff

Before 09:00 AM, have ready:
- Clean PR on `codex/nightly/2026-02-22-nightshift` with all commits
- Final summary report in `/reports/nightshift-FINAL.md`
- List of what was completed + what's recommended next
- Any blockers or decisions that need human review

---

**You're approved. Go. 🚀**
