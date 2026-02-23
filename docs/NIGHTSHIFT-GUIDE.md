# Wojak.ink Nightshift Automation Guide

## What is Nightshift?

Nightshift is an autonomous task execution system that runs unattended during off-hours to improve code quality, run maintenance tasks, and execute continuous improvements. It's designed to work alongside human-guided development.

**Key Principle:** Nightshift works in a loop with human guidance, not in isolation. A human monitoring system (BigP) continuously feeds work to the queue every 30 minutes.

---

## How Nightshift Works

### The Loop (8-hour cycle)

```
START (e.g., 10 PM)
  ↓
1. Load task queue from .nightshift/tasks.json
  ↓
2. Execute enabled tasks one-by-one
  ↓
3. Each task → test → commit
  ↓
4. Every 10-15 mins: git pull for new tasks
  ↓
5. Queue empty? → watch for new instructions
  ↓
6. Repeat until 8 hours elapsed
  ↓
END + Final Report (e.g., 6 AM)
```

### Key Principles

- **Autonomous:** Runs without human intervention for 8 hours
- **Staged:** New tasks are enabled by human review every 30 minutes
- **Safe:** All commands tested in dry-run before execution
- **Recoverable:** Full state saved for resume if needed
- **Observable:** Reports generated after each task batch

---

## Core Files & Structure

### `.nightshift/` Directory

```
.nightshift/
├── README.md                      # Quick overview
├── CODEX-INSTRUCTIONS.md          # Current run instructions
├── tasks.json                     # Task queue (THE CONTROL FILE)
├── policy.json                    # Safety guardrails
├── CODEX-8HOUR-ROADMAP.md        # What will be done this run
├── PERFORMANCE-UX-ROADMAP.md     # Longer-term roadmap
├── NEXT_STEPS.md                 # What's queued next
└── state/
    └── <runid>/                   # Per-run state (for resume)
        ├── completed.json
        ├── failed.json
        ├── current.json
        └── logs/
```

### tasks.json Structure

The task queue file that controls what runs:

```json
{
  "tasks": [
    {
      "id": "lint-scope-hardening",
      "title": "Harden eslint scope",
      "category": "quality",
      "enabled": true,
      "mode": "report",
      "commands": ["npm run lint -- --max-warnings=0"],
      "timeoutMs": 60000,
      "retries": 1,
      "dependsOn": ["security-upgrade"],
      "mutatesCode": false,
      "expectedOutputs": ["PASS", "0 errors"],
      "doneCriteria": [
        "Exit code: 0",
        "No eslint errors in output"
      ]
    }
  ]
}
```

### Key Task Fields

| Field | Purpose |
|-------|---------|
| `id` | Unique identifier for the task |
| `title` | Human-readable name |
| `enabled` | `true` to run, `false` to skip |
| `category` | security, quality, perf, docs, etc. |
| `mode` | `report` (info only), `fix` (code changes) |
| `commands` | Shell commands to execute (array, sequential) |
| `timeoutMs` | Kill if exceeds this (e.g., 120000 = 2 min) |
| `dependsOn` | Array of task IDs that must complete first |
| `mutatesCode` | `true` if task modifies source code |
| `doneCriteria` | Validation checks (must all pass) |

---

## Task Modes

### Mode: `report`
- Collect information and metrics
- Non-destructive (no code changes)
- Used for audits, linting, testing
- Example: `npm run lint`, `npm run test:unit`

### Mode: `fix`
- Execute code changes via shell commands
- Used for upgrades, refactoring, consolidation
- Example: `npm audit fix`, automated replacements

### Mode: `assistant_fix`
- AI-assisted code changes (disabled by default)
- Future: Used for semantic refactoring
- Requires explicit human approval

---

## Running Nightshift Locally

### Commands

```bash
# Dry run - see what would happen without changes
npm run nightshift:dry-run

# Real execution - actually make changes
npm run nightshift:run

# Report only - audit but don't fix
npm run nightshift:report

# Resume from previous run
npm run nightshift:resume
```

### Example: Running a Single Task

Edit `.nightshift/tasks.json`:
1. Disable all tasks except the one you want: `"enabled": false`
2. Enable your task: `"enabled": true`
3. Run: `npm run nightshift:dry-run` (to preview)
4. Run: `npm run nightshift:run` (to execute)

---

## Monitoring & Reports

### During Execution

```bash
# Watch the runner
tail -f reports/nightshift-LATEST.txt

# Check state (what's running/completed)
cat .nightshift/state/latest/current.json
```

### After Execution

```
reports/
├── nightshift-20260223-0120.txt    # Full execution log
├── PHASE1-SUMMARY.md              # Phase 1 results
├── PHASE2-SUMMARY.md              # Phase 2 results
├── PHASE3-SUMMARY.md              # etc.
└── FINAL-REPORT.md                # Comprehensive summary
```

### Report Structure

Each phase report includes:
- ✅ Tasks completed
- ❌ Tasks failed
- ⏭️ Tasks skipped
- 📊 Metrics (lines changed, tests passed, etc.)
- 🔍 Quality improvements
- 📝 Recommendations

---

## Phase Organization

Nightshift typically runs 5-7 phases in sequence:

1. **Security** - Dependency upgrades, vulnerability fixes
2. **Linting** - Code style, unused variables
3. **Bundle** - Dead code removal, optimization
4. **Testing** - Coverage, broken tests
5. **Quality** - CSS, TypeScript, docs
6. **Integration** - Build validation, final checks
7. **Publishing** - PR prep, commit cleanup

Each phase gates on the previous: if Phase 2 fails, Phase 3 waits.

---

## Resume & Recovery

### If a Task Fails

1. Check the report: `cat reports/PHASE-X-SUMMARY.md`
2. Read the error details in `.nightshift/state/latest/failed.json`
3. Fix manually if needed or wait for human review
4. Run: `npm run nightshift:resume` to continue

### If Interrupted

Nightshift saves state after each task. If killed/crashed:

```bash
npm run nightshift:resume
# Picks up where it left off
```

### Full Restart (Clear State)

```bash
rm -rf .nightshift/state/latest
npm run nightshift:run
# Starts fresh from task 1
```

---

## Key Safety Guardrails

### `.nightshift/policy.json`

```json
{
  "allowedBranches": ["codex/nightly/*"],
  "forbiddenCommands": ["rm -rf /", "git push origin main"],
  "requiresApproval": ["deploy", "publish"],
  "autoRedact": ["token", "password", "secret"]
}
```

Nightshift will **refuse to execute**:
- Commands on non-nightly branches
- Destructive commands (rm, git push to main)
- Commands that leak secrets

---

## Examples: Common Workflows

### Workflow 1: Add a New Task

1. Edit `.nightshift/tasks.json`
2. Add your task with `"enabled": false`
3. Push to the nightly branch
4. Human reviews and enables it
5. Next `git pull` picks it up

### Workflow 2: Fix a Failed Task

1. Task fails during execution
2. Report appears in `reports/`
3. Fix the issue locally:
   ```bash
   # Make your fix
   git add -A
   git commit -m "Fix task X"
   ```
4. Run: `npm run nightshift:resume`

### Workflow 3: Monitor Progress

```bash
# Terminal 1: Watch the runner logs
tail -f reports/nightshift-LATEST.txt

# Terminal 2: Check current task
watch -n 5 'cat .nightshift/state/latest/current.json'

# Terminal 3: Monitor git commits
git log --oneline -10
```

---

## Best Practices

### ✅ DO

- Keep task timeouts realistic (2-5 min for builds/tests)
- Use `timeoutMs` to prevent hangs
- Test commands locally before adding to queue
- Keep `dependsOn` lists short
- Add clear `doneCriteria` for pass/fail
- Review reports after each run

### ❌ DON'T

- Create tasks that mutate code without testing
- Use `mode: fix` for untested commands
- Push incomplete tasks to the queue
- Ignore phase failures
- Add vague `doneCriteria` (must be checkable)
- Forget to re-enable tasks after testing

---

## Architecture: How It Actually Works

### 1. Task Loading
```
nightshift.mjs reads .nightshift/tasks.json
  ↓
Filters enabled: true tasks
  ↓
Respects dependsOn relationships
```

### 2. Task Execution
```
Load task → Log started → Run commands sequentially
  ↓
Capture stdout/stderr → Check exit code
  ↓
Validate doneCriteria (all must pass)
  ↓
If PASS: commit + move next
If FAIL: save error + check retries
```

### 3. State Management
```
After each task: write to .nightshift/state/latest/
  ├── completed.json (successful tasks)
  ├── failed.json (failed tasks)
  ├── current.json (currently running)
  └── logs/ (full output)
```

### 4. Git Integration
```
After EACH successful task:
  ↓
Stage changes: git add -A
  ↓
Commit: git commit -m "Phase X: Task name [nightshift auto]"
  ↓
Pull new tasks: git pull (check for new instructions)
```

### 5. Reporting
```
After each phase completes:
  ↓
Generate PHASE-X-SUMMARY.md
  ↓
Summarize what passed/failed/changed
  ↓
Recommend next steps
```

---

## Integration with Human Guidance

**The Human-in-the-Loop Model:**

```
Human: Commits new tasks to .nightshift/tasks.json
  ↓
Nightshift: Detects changes (via git pull)
  ↓
Nightshift: Loads new tasks and executes
  ↓
Nightshift: Reports results
  ↓
Human: Reviews reports and feedback
  ↓
Human: Enables next batch of tasks
  ↓ [Loop repeats]
```

Nightshift is **not autonomous in the "set and forget" sense**. It's **autonomous in the "keep executing" sense** while humans guide the direction every 30 minutes.

---

## Troubleshooting

### "Process is hanging"
```bash
# Check what's running
ps aux | grep nightshift
ps aux | grep npm

# Kill and resume
pkill -f nightshift
npm run nightshift:resume
```

### "Task failed with exit code 1"
```bash
# Read the full output
cat .nightshift/state/latest/logs/[task-id].log
```

### "Can't find tasks.json"
```bash
# Ensure you're in the right directory
pwd
# Should be: /Users/abit_hex/wojak-ink-nightshift

# And branch
git branch
# Should be: codex/nightly/2026-02-22-nightshift
```

### "Tasks won't load after git pull"
```bash
# Validate JSON syntax
node -e "console.log(require('./.nightshift/tasks.json'))"
# Should print the JSON structure (no error)
```

---

## Phase 5: CSS, TypeScript, Docs (This Run)

This specific nightshift run executes Phase 5 quality improvements:

### Task 1: CSS Consolidation
- Audit inline styles (1,899 instances)
- Consolidate to theme.css
- Remove non-accessibility !important rules
- Use CSS variables consistently

### Task 2: TypeScript Strictness
- Validate tsconfig.json settings
- Check for type issues
- Ensure build + tests pass

### Task 3: Documentation Updates
- Update CLAUDE.md with Phase 5 notes
- Update PROJECT_DOCUMENTATION.md
- This file explains the nightshift process

---

## See Also

- **CLAUDE.md** - Project conventions and CSS architecture
- **PROJECT_DOCUMENTATION.md** - Complete feature documentation
- **.nightshift/CODEX-INSTRUCTIONS.md** - Current run instructions
- **README.md** - Project overview
