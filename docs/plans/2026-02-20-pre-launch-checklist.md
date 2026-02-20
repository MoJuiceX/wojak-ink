# Pre-Launch Checklist — Wojak Generator Mint (Public Launch)

Use this before opening the **Wojak Generator mint** to the public (free mint credits + paid mints). Completing these steps ensures production has the latest code, DB schema, and secrets so rankings, combat, and mint all work.

---

## What “launch” means

- **Public** can use **free mint credits** (earned from secondary sales) to mint Your Wojak NFTs from the Generator.
- **Public** can **pay XCH** (base + fair-share surcharge) to mint.
- That will create many new NFTs and drive **voting** and **Fight Club** usage; production DB will start filling `wojak_scores`, `combat_fighters`, etc.

---

## Before you launch — do these in order

### 1. Code and deploy

- [ ] **Commit** all current work (see `docs/plans/2026-02-20-deploy-and-migrations-runbook.md`).
- [ ] **Apply migrations** to **production** D1 (068, 075, 076 — and 034 if not already applied). Same runbook has exact commands.
- [ ] **Build**: `npm run build` — must pass.
- [ ] **Deploy**: `npx wrangler pages deploy dist --project-name=wojak-ink` (with `CLOUDFLARE_API_TOKEN` or `wrangler login`).
- [ ] **Smoke-check**: https://wojak.ink/fight-club/rankings (Wojaks tab), https://wojak.ink/generator (mint UI loads).

### 2. Secrets and config (mint pipeline)

From **`docs/LAUNCH-READINESS.md`** §1 and §2:

- [ ] **Secrets** set in Cloudflare Pages:
  - `MINTGARDEN_API_KEY`, `PINATA_JWT`, `INTERNAL_MINT_SECRET`, `CLERK_DOMAIN`, etc.
  - Verify: `npx wrangler pages secret list --project-name=wojak-ink`
- [ ] **Migrations** for **mint** already applied on production:
  - 030 (credit_events, phase2_mints, trait_usage, etc.)
  - 031 (mint_counter, seeded)
  - 032 (mint_audit_log, audit columns)
  - 034 (trait_usage: effective_usage, last_decay_at)
- [ ] **Mint counter** seeded: `SELECT * FROM mint_counter;` — `next_number` = next available mint number (or 1 if no mints yet).

### 3. Test plan (mint + credits)

From **`docs/LAUNCH-READINESS.md`** §8:

- [ ] **Free mint** end-to-end: connect wallet → design → Mint (free) → success + MintGarden link.
- [ ] **Credits** deducted after free mint; balance API correct.
- [ ] **Paid mint** flow: Mint (paid) → countdown → Accept in Wallet → confirm → success.
- [ ] **Expired offer**: countdown to 0:00 → buttons disappear, message shown.
- [ ] **Upload guard**: `curl -X POST https://wojak.ink/api/mint/upload` without internal header → 401.

### 4. Rankings and Fight Club (optional but recommended)

- [ ] After deploy, **Rankings → Wojaks** loads without error (empty list is fine until production has votes).
- [ ] **Rankings → Players** loads (empty or with test accounts is fine).
- [ ] No 500s on `/api/combat/power-leaderboard?type=wojaks` or `type=players` (check Network tab).

### 5. Rollback and monitoring

- [ ] You know how to **disable minting** quickly (e.g. clear or invalidate `MINTGARDEN_API_KEY`; see LAUNCH-READINESS §9).
- [ ] You have **post-launch queries** handy (phase2_mints counts, credit balance sanity, failed audit steps; see LAUNCH-READINESS §10).

---

## Summary

| Area | Action |
|------|--------|
| **Deploy** | Commit → apply 068/075/076 (and 034 if needed) → build → deploy. Runbook: `2026-02-20-deploy-and-migrations-runbook.md` |
| **Secrets** | Confirm mint + IPFS + Clerk secrets set; `wrangler pages secret list` |
| **DB** | Migrations 030, 031, 032, 034, 068, 075, 076 applied; mint_counter seeded |
| **Test** | Free mint, paid mint, credits, expired offer, upload guard (LAUNCH-READINESS §8) |
| **Rollback** | LAUNCH-READINESS §9 — disable mint, check failed mints, rollback deploy if needed |

Once these are done, you’re ready to open the Generator mint to the public.
