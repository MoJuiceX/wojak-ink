# AGENTS.md

Single source for agent ops + project guidance. Read first. (Claude Code, Codex, Cursor.)

---

## Purpose

This repo = wojak-ink app. Specs in docs/plans/; context/routes in CLAUDE.md. Never expand scope beyond spec; note out-of-scope fixes in report.

---

## Do

- TypeScript/React. Tailwind + src/styles/theme.css only. Small components; use existing. Domain/anti-patterns: CLAUDE.md context table + Critical Anti-Patterns.
- Plan non-trivial in tasks/todo.md; verify (tests/logs); lessons in tasks/lessons.md. Simplicity first; no laziness; minimal impact. Cursor: .cursor/rules/agent-workflow-strategy.mdc.

## Don't

- No hardcoded colors; no `!important`; no new deps without approval; no renames of classes/methods/files without approval; no guessing business logic (ask); no READMEs/summary docs unless asked; no full-repo rewrites unless asked; no scope beyond spec. Always exact file paths when referencing code.

---

## Commands

File-scoped first: typecheck/lint/test changed files. Full build only when requested. `npm run lint`, `npx tsc --noEmit`, `npm test` (or equivalent). Run on changed files before done.

---

## Safety

OK without ask: read/list files, file-scoped typecheck/lint/test. Ask first: installs, git push, delete, full build/e2e, production/secrets.

---

## Workflow

Non-trivial: plan in tasks/todo.md → re-plan on blocker → verify (tests/logs) → lessons in tasks/lessons.md. Elegance for non-trivial; autonomous bug fix (logs/tests).

## Task (6 steps)

Plan → verify plan → track in todo.md → explain changes → document in todo review → capture lessons in lessons.md.

---

## When stuck

Ask; or propose short plan and get confirmation; or draft PR with notes. No large speculative changes. Prefer well-scoped tasks; big refactors/ambiguous bugs → propose plan first. Context saturated → summarize, fresh session with summary.

---

## PR/Done

Lint/typecheck/tests green; small focused diff; summary; remove debug/logs. Title e.g. `feat(scope): desc`.

---

## Test-first

New behavior: add/update tests then implement. Regressions: failing test then fix. Tests real (no fake/mock-only that always pass).

---

## Meta-prompting

After mistake: update AGENTS.md or tasks/lessons.md with rule that prevents recurrence. After successful non-trivial session: may propose 2–5 improvements to AGENTS.md; wait approval before edit.

---

## Project structure

- Routes: src/App.tsx
- Components: src/components/
- Theme: src/styles/theme.css
- API: functions/api/
- Domain context: CLAUDE.md table
- Specs: docs/plans/

---

## Prompting

Persona + task + context + format; verb required; iterate; review before use. Optional: docs/PROMPTING_GUIDE.md.

---

## Quick ref

| Goal | Action |
|------|--------|
| Start task | todo.md then implement |
| Blocker | Re-plan; update todo.md |
| Prove done | Tests + todo review |
| Lesson | lessons.md |
| Better prompt | Persona/task/context/format |
| Quality bar | Staff-engineer bar + core principles |

---

## References

CLAUDE.md, tasks/lessons.md, tasks/todo.md, .cursor/rules/agent-workflow-strategy.mdc. Discovery: root→cwd; closer overrides. Root <150 lines; combined <32 KiB (Codex). Use project/installed skills when task matches description. Conventions change → update this file or linked doc.
