# Launch Plan — Activating the Generator MINT Button

**Date:** 2026-02-20  
**Goal:** What must be done before we launch and activate the MINT button on the project generator, and whether everything is pushed/deployed.

---

## 1. Current Git and Deploy Status (as of this session)

### Not everything is pushed or committed

| Item | Status |
|------|--------|
| **Pushed to GitHub** | **No** — branch is **ahead of origin/main by 1 commit** (`6ee230d` — "Power leaderboard, rankings error handling, migrations 075/076, combat/burn/mint updates"). |
| **Uncommitted changes** | **Yes** — 4 modified files: `docs/plans/2026-02-20-deploy-and-migrations-runbook.md`, `package.json`, `scripts/verify-manifest-assets.mjs`, `src/lib/wojakRules.ts`. |
| **Deployed to Cloudflare** | **Unknown** — If you last deployed from **local** (e.g. `wrangler pages deploy dist`), production may have the 1 local commit. If you deploy from **GitHub/CI**, production does **not** have that commit until you push. |

### What to do first

1. **Commit** the 4 modified files (or discard if intentional).
2. **Push** to GitHub: `git push origin main`.
3. **Deploy** to Cloudflare (see §3 below) so production has the latest code.

---

## 2. How the MINT Button Is “Activated”

The MINT button is **already wired** in the UI. It is enabled when:

- User has a full design (7 traits), wallet connected, and minting is **not** paused.

“Activating” mint for launch means:

1. **Backend ready** — migrations, secrets, and APIs working.
2. **Database flag** — `server_state.minting_paused` set to `'false'` so `/api/mint/pricing` and `/api/mint/submit` allow mints.

The UI reads `mintingPaused` from `/api/mint/pricing`. If `minting_paused = 'true'` in D1, the button shows “Minting opens Friday!” and is disabled. When you set it to `'false'`, the button becomes active (subject to supply and credits).

---

## 3. Pre-Launch Checklist (in order)

Do these **before** setting `minting_paused = 'false'`.

### 3.1 Code and repo

- [ ] **Commit** all intended changes (including the 4 modified files above, or explicitly discard).
- [ ] **Push** to GitHub: `git push origin main`.
- [ ] **Build** passes: `npm run build`.

### 3.2 Migrations (production D1)

Apply in order. See `docs/plans/2026-02-20-deploy-and-migrations-runbook.md` for exact commands.

| Migration | Purpose | Required for |
|-----------|---------|--------------|
| 030 | Credit system, phase2_mints, trait_usage, etc. | Mint pipeline |
| 031 | mint_counter (atomic numbering) | Mint pipeline |
| 032 | mint_audit_log, refund columns | Mint pipeline |
| 034 | trait_usage effective_usage, last_decay_at | Fair-share surcharge + decay |
| 043 | server_state table | minting_paused flag |
| 068 | combat_fighters.burned_at, burned_by_did | Power leaderboard, burn |
| 075 | combat_fighters.owner_address | Mint pipeline, wallet identity |
| 076 | burn_power_grants | Burn +50 power |

**Ensure `server_state` has the pause flag** (if 043 doesn’t seed it):

```sql
-- Only if the row doesn't exist yet (e.g. after first applying 043)
INSERT OR IGNORE INTO server_state (key, value, updated_at)
VALUES ('minting_paused', 'true', datetime('now'));
```

Keep it `'true'` until you’re ready to go live.

### 3.3 Secrets (Cloudflare Pages)

From `docs/LAUNCH-READINESS.md` §1:

- [ ] `MINTGARDEN_API_KEY` — set and valid  
- [ ] `PINATA_JWT` — set and valid  
- [ ] `INTERNAL_MINT_SECRET` — set  
- [ ] Any others required (e.g. `CLERK_DOMAIN`, `CHAT_JWT_SECRET`)

Verify:

```bash
npx wrangler pages secret list --project-name=wojak-ink
```

### 3.4 Deploy

```bash
npm run build
npx wrangler pages deploy dist --project-name=wojak-ink
```

Then smoke-check:

- [ ] https://wojak.ink/generator — mint UI loads, supply/count shown.
- [ ] https://wojak.ink/fight-club/rankings — Wojaks/Players load or show empty (no 500).

### 3.5 Mint and credits tests

From `docs/LAUNCH-READINESS.md` §8 and `docs/plans/2026-02-20-pre-launch-checklist.md`:

- [ ] **Free mint** E2E: connect wallet → design → Mint (free) → success + MintGarden link.
- [ ] Credits deducted after free mint; balance API correct.
- [ ] **Paid mint** E2E: Mint (paid) → countdown → Accept in Wallet → confirm → success.
- [ ] **Expired offer**: countdown to 0:00 → buttons disappear, message shown.
- [ ] **Upload guard**: `curl -X POST https://wojak.ink/api/mint/upload` (no internal header) → 401.

(Optional) Run `scripts/verify-launch-ready.sh` if you use it (requires DB access and env).

### 3.6 Activate the MINT button (go live)

When all of the above are done:

```bash
npx wrangler d1 execute wojak-users --remote --command \
  "UPDATE server_state SET value='false', updated_at=datetime('now') WHERE key='minting_paused';"
```

If the row doesn’t exist (e.g. you never inserted it), insert then update:

```bash
npx wrangler d1 execute wojak-users --remote --command \
  "INSERT OR REPLACE INTO server_state (key, value, updated_at) VALUES ('minting_paused', 'false', datetime('now'));"
```

Within a short time (pricing refresh interval), the generator will show the MINT button as active (unless sold out or other conditions).

---

## 4. Rollback (Disable Mint Quickly)

To **pause** minting again without reverting code:

```bash
npx wrangler d1 execute wojak-users --remote --command \
  "UPDATE server_state SET value='true', updated_at=datetime('now') WHERE key='minting_paused';"
```

Or invalidate/clear `MINTGARDEN_API_KEY` so the API returns 500 (see `docs/LAUNCH-READINESS.md` §9).

---

## 5. Summary

| Question | Answer |
|----------|--------|
| **Pushed to GitHub?** | **No** — 1 commit ahead of origin/main; 4 files uncommitted. |
| **Deployed to Cloudflare?** | **Unclear** — Push first, then deploy so production matches GitHub. |
| **What to do before “activating” MINT?** | Commit → push → apply migrations → verify secrets → build → deploy → run mint/credit tests → set `minting_paused = 'false'`. |
| **How to activate the MINT button?** | Set `server_state.minting_paused` to `'false'` in production D1 (after all pre-launch steps are done). |

---

## 6. References

- **Launch readiness (mint pipeline):** `docs/LAUNCH-READINESS.md`
- **Deploy + migrations runbook:** `docs/plans/2026-02-20-deploy-and-migrations-runbook.md`
- **Pre-launch checklist:** `docs/plans/2026-02-20-pre-launch-checklist.md`
- **Rollback and monitoring:** `docs/LAUNCH-READINESS.md` §9 and §10
