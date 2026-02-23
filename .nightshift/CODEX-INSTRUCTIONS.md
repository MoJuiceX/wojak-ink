# 🚀 CODEX NIGHT SHIFT — YOUR CONTINUOUS WORK LOOP

## What You're Doing

You're working **autonomously through the night** (until 8 hours from now) on the `codex/nightly/2026-02-22-nightshift` worktree.

Your human (MoJuice) and your guide (BigP) will **continuously feed you work** through:
1. **Task queue updates** (`.nightshift/tasks.json` changes)
2. **Roadmap files** (`.nightshift/CODEX-8HOUR-ROADMAP.md`, etc.)
3. **Real-time instruction commits** to the nightly branch

## Your Loop (Never Stop)

```
1. Start nightshift runner:   node scripts/nightshift.mjs --real
2. Execute enabled tasks one by one
3. Each task completes → commit automatically
4. After each batch → check for NEW tasks in .nightshift/tasks.json
5. If new tasks exist → load them immediately
6. If queue empty but time remains → watch for new instructions
7. Repeat until 8 hours elapsed
```

## Key Rules

✅ **DO:**
- Work continuously for 8 hours
- Run one task at a time
- Commit after each successful task
- Check `git pull` every 10-15 mins for new instructions
- Report progress every 30 mins
- If queue empties: `git pull` and check for new tasks
- Push commits to origin periodically so human can see progress

❌ **NEVER:**
- Stop working and wait
- Let the runner exit without restarting
- Push to `main` or `origin/main`
- Deploy to production
- Skip error checks or tests
- Delete important directories

## What BigP Is Doing

Every 30 minutes, BigP will:
1. Check your latest reports
2. See what completed
3. Enable next batch of tasks
4. Commit new tasks to the nightly branch
5. You'll pull them on your next git refresh

## How to Know There's New Work

Watch for these signs:
- New files in `.nightshift/` (roadmaps, instructions)
- Changes to `.nightshift/tasks.json` (new tasks enabled)
- New commits on `codex/nightly/2026-02-22-nightshift` branch

When you see these → `git pull` → load new tasks immediately.

## Right Now (01:53 AM)

Your nightshift runner is active with 20+ tasks queued.

**Current queue status:** 
- Security upgrades: ✅ DONE
- Next: lint-scope-hardening, playwright-safety-guard
- Then: bundle optimization, dead code, coverage, perf
- Then: images, skeletons, caching, errors
- Then: mobile, animations, a11y
- Then: CSS, TypeScript, docs
- Final: validation & PR prep

Keep executing. Don't stop.

---

## If You Get Stuck

1. Check `.nightshift/state/` for the latest run state
2. Read the most recent report in `reports/`
3. See what failed and why
4. If it's a blocker → note it, move to next task
5. Report the blocker so BigP can help

---

## The Goal

By 8 AM (in ~6 hours):
- ✅ All enabled tasks complete
- ✅ Clean commits on nightly branch
- ✅ Tests passing
- ✅ Build successful
- ✅ Ready-to-merge PR
- ✅ Comprehensive final report

**You are not a tool.** You are **working autonomously with human guidance**. Keep grinding. 💪

---

*This is your north star. If something's unclear, we'll clarify it in the next push.*
