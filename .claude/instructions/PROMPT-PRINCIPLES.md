# Prompt Principles for Wojak Ink Development

## The Four Pillars

Every task should be framed with these four elements:

### 1. Persona
Define who the AI is acting as. Match expertise to the task domain.
- **Minting/Backend:** Senior serverless engineer, Cloudflare Workers, D1 (SQLite), financial transaction safety
- **Frontend:** Senior React 19 developer, TypeScript strict mode, accessibility, mobile-first
- **Security:** Adversarial security auditor, OWASP Top 10, race conditions, blockchain transaction integrity
- **Database:** D1/SQLite migration engineer, schema evolution, data integrity
- **Blockchain:** Chia ecosystem developer, CHIP-0007 metadata, bech32m addresses, XCH transactions

### 2. Task
State exactly what needs to be done. Include:
- Current state (what exists now)
- Desired state (what should exist after)
- Success criteria (how to verify it worked)
- Scope boundaries (what NOT to touch)

### 3. Context
Point the AI to the right files before it starts working. Use the Context Routing Table below.

### 4. Format
Specify what the output should look like:
- Code files with JSDoc headers
- Reports saved to `docs/`
- Audit findings with severity/file/line/description/impact/fix
- SQL migrations with header comments
- Commit messages following repo conventions

---

## Context Routing Table

Before starting any task, read the relevant files:

| Domain | Read These Files First |
|--------|----------------------|
| **Minting** | `functions/api/mint/*.ts`, `docs/LAUNCH-READINESS.md`, `docs/AUDIT-REPORT.md` |
| **Frontend** | `CLAUDE.md` (CSS rules), `src/styles/theme.css`, similar components in `src/components/` |
| **Database** | `functions/migrations/` (all, for schema + numbering), `functions/api/mint/_shared.ts` |
| **Wallet** | `src/sage-wallet/`, `src/contexts/MintContext.tsx` |
| **Games** | `src/pages/` game pages, `src/components/games/` |
| **Deployment** | `wrangler.toml`, `vite.config.ts`, `package.json` scripts |
| **Security** | `docs/AUDIT-REPORT.md`, `docs/LAUNCH-READINESS.md`, `functions/api/mint/_shared.ts` |
| **Brand/Copy** | `docs/BRAND-VOICE.md` |
| **Generator** | `docs/GENERATOR-CODE-HEALTH.md`, `src/contexts/GeneratorContext.tsx`, `src/lib/wojakRules.ts` |
| **Credits** | `functions/api/credits/`, `workers/credit-tracker/`, `functions/migrations/030_credit_system.sql` |

---

## Standard Constraints

These rules apply to ALL tasks. Violating any of them is a bug.

### Never Do

- **Never use `SELECT MAX` for sequential IDs.** Use `UPDATE ... RETURNING` on the `mint_counter` table. Race conditions are real.
- **Never use single IPFS URIs.** Always use `string[]` with gateway redundancy (`ipfs://`, Pinata gateway, `ipfs.io`).
- **Never self-fetch own API endpoints from Workers.** The `prepare.ts -> upload.ts` self-fetch is a known tech debt. Don't add more.
- **Never use `startsWith('xch1')` as wallet validation.** Use `isValidChiaAddress()` from `_shared.ts` (full bech32m regex: `^xch1[a-z0-9]{58}$`).
- **Never hardcode XCH prices.** Use constants or env vars. Prices change.
- **Never change schema without a migration file.** Migrations are in `functions/migrations/NNN_description.sql`.
- **Never add dependencies without documenting why.** Explain in the commit message.
- **Never use `!important` in CSS.** Ever.
- **Never create new CSS variable files.** All visuals go in `src/styles/theme.css`.
- **Never commit secrets.** `.env`, credentials, API keys stay out of git.

### Always Do

- **Always run `npm run build` before finishing.** Both `tsc -b` and `vite build` must pass.
- **Always ensure TypeScript strict mode passes.** No `any` types, no unused variables, no `string | undefined` where `string` is expected.
- **Always use parameterized queries (`.bind()`).** No string interpolation in SQL.
- **Always handle all UI states.** Loading, error, empty, success.
- **Always validate at system boundaries.** User input, external APIs, webhook payloads.
- **Always use existing patterns.** Check how similar code works before inventing something new.

---

## Self-Review Checklist

Before marking any task as done, verify:

1. **Re-read modified files.** Does the change make sense in context?
2. **Check for broken functionality.** Did you accidentally remove or break something?
3. **Run the build.** `npm run build` must pass cleanly.
4. **Check git diff scope.** Does the diff match what was asked? No unrelated changes?
5. **Verify new files are imported.** If you created a new module, is it imported where needed?
6. **Verify API callers still work.** If you changed an API response shape, did you update all consumers?
7. **Verify DB queries handle NULL.** Use `COALESCE`, `?? 0`, or explicit NULL checks.
8. **Check error messages.** Do they follow the brand voice? (What happened, Why, What to do)

---

## Iteration Principle

Large tasks should be broken into small, verifiable steps:

1. **Plan** — Identify all files that need to change
2. **Execute one change** — Make the smallest meaningful edit
3. **Verify** — Run `npx tsc --noEmit` or `npm run build`
4. **Repeat** — Next change, verify again
5. **Final check** — Full build, git diff review, self-review checklist

Never make 10 changes and then check if they work. Make 1, verify, repeat.
