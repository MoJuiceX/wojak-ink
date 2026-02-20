# Wojak.ink — Development Workflow Protocol

**Last updated:** 2026-02-20

---

## The Three Parties

| Party | Role |
|-------|------|
| **User** | Product owner, decisions, final approval |
| **Claude (MacOS app)** | Advisor, researcher, spec writer, reviewer |
| **Claude CLI** | Implementer — reads specs, codes, tests, commits, deploys |

---

## The Loop

This loop never stops. It runs on every task, every day.

```
User + Claude        Claude CLI
─────────────        ─────────
Write Spec N    →    Implement Spec N
Review Spec N-1 ←    Commit Spec N-1
Write Spec N+1  →    Implement Spec N+1
```

**Key discipline:**
- While Claude CLI is coding, User + Claude are writing the NEXT spec. Never wait idle.
- After every Claude CLI commit, User + Claude review the output against the spec before releasing the next spec.
- Claude CLI never proceeds to the next task without explicit release from User + Claude.

---

## Spec Format (What Claude CLI Receives)

Every spec handed to Claude CLI must contain these sections. Incomplete specs get sent back.

```markdown
# SPEC: [Task Title]

## Context files to read first
- [exact file paths Claude CLI must read before touching anything]
- Always include CLAUDE.md

## Goal
[What to build or change — specific, not vague]

## Constraints
- [CSS rules that apply]
- [Anti-patterns from CLAUDE.md that are relevant]
- [What NOT to touch]

## Out of scope
- [Explicit list of things Claude CLI must not change]

## Success criteria (Claude CLI self-checks these before marking done)
- [ ] Build passes: `npm run build`
- [ ] [Specific functional check]
- [ ] [Specific visual or behavior check]
- [ ] No `!important` added to CSS
- [ ] No new CSS variable files created

## Suggested commit message
feat/fix/chore([scope]): [what changed and why]
```

---

## Review Gate (What User + Claude Check After Every Commit)

After Claude CLI commits, User + Claude run this gate:

1. **Spec compliance** — Did Claude CLI implement exactly what the spec said? No more, no less.
2. **Build** — Does `npm run build` pass?
3. **Success criteria** — Are all spec checkboxes met?
4. **Regressions** — Does anything that was working now break?
5. **CSS rules** — No `!important`, no inline colors, no new variable files.
6. **Scope creep** — Did Claude CLI change anything outside the spec?

**Gate outcomes:**
- ✅ **Pass** → Release next spec to Claude CLI
- ❌ **Fail** → Write a correction spec (not a conversation — another spec) and send to Claude CLI

---

## Claude CLI's Responsibilities

When Claude CLI receives a spec:

1. Read all context files listed in the spec
2. Read `CLAUDE.md` (always)
3. Implement exactly what the spec says — nothing more
4. Self-check all success criteria before committing
5. Commit with the suggested message format
6. Report back: what was done, what files changed, what was verified

When Claude CLI finishes, it must report:
```
DONE: [task title]
Files changed: [list]
Build: PASS / FAIL
Self-check results: [each criterion — pass/fail]
Notes: [anything unexpected found]
```

---

## Pipeline Rules

1. **Always one spec ahead** — User + Claude maintain a queue. Claude CLI always has a next task ready.
2. **Atomic specs** — Each spec is one commit. Not two, not zero.
3. **No verbal specs** — All specs are written documents. Nothing is communicated by conversation alone.
4. **No scope expansion** — Claude CLI does exactly the spec. If it discovers something adjacent that should be fixed, it notes it in the report. It does NOT fix it.
5. **No self-approval** — Claude CLI never decides its own work is done without reporting back.

---

## Spec Queue

Active and queued specs live in `docs/plans/`.

Naming: `YYYY-MM-DD-[topic]-spec.md`

Design docs (decisions + rationale): `YYYY-MM-DD-[topic]-design.md`

---

## Communication Pattern

```
User + Claude → Claude CLI:  "SPEC: [file path]"
Claude CLI → User + Claude:  "DONE: [report]"
User + Claude → Claude CLI:  "APPROVED. Next: SPEC: [file path]"
                        or: "CORRECTION NEEDED: SPEC: [file path]"
```

Short, precise, no ambiguity.
