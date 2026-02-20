# Deploy and Migrations Runbook — Power Leaderboard + Launch

Use this when deploying the latest code (including Power Leaderboard and Rankings) and ensuring production D1 has all required migrations before opening the Wojak Generator mint to the public.

---

## 1. Uncommitted changes

You have local changes (combat, rankings, burn, mint, etc.). **Commit them first** so the deploy includes:

- `functions/api/combat/power-leaderboard.ts` (Wojak rankings from `wojak_scores` + `phase2_mints`)
- `src/components/combat/FightClubRankings.tsx` (error vs empty state)
- Migrations 075, 076 and any other modified APIs

```bash
git status
git add -A
git commit -m "Power leaderboard, rankings error handling, migrations 075/076, combat/burn/mint updates"
```

---

## 2. Apply migrations to production D1 (in order)

Run these from the **project root** with `CLOUDFLARE_API_TOKEN` set (or use `wrangler login`). Order matters: 068 → 075 → 076.

### 2.1 Check if 068 is already applied (optional)

```bash
npx wrangler d1 execute wojak-users --remote --command \
  "PRAGMA table_info(combat_fighters);"
```

If you see a column `burned_at`, 068 is already applied. If not, run 2.2.

### 2.2 Migration 068 — Burn tracking (power-leaderboard depends on this)

Required for: `power-leaderboard.ts` (Players and Wojaks), burn flow, burn-eligible.

```bash
npx wrangler d1 execute wojak-users --remote --file=functions/migrations/068_burn_tracking.sql
```

### 2.3 Migration 075 — Owner address on combat_fighters

Required for: mint pipeline (`process.ts` inserts `owner_address`), wallet-based identity on leaderboard.

```bash
npx wrangler d1 execute wojak-users --remote --file=functions/migrations/075_owner_address.sql
```

### 2.4 Migration 076 — Burn power bonus table

Required for: burn-assign-power, burn-power-bonus, `_powerLevel.ts` / power-level (optional; only if you use burn +50 power).

```bash
npx wrangler d1 execute wojak-users --remote --file=functions/migrations/076_burn_power_bonus.sql
```

### 2.5 Verify

```bash
npx wrangler d1 execute wojak-users --remote --command \
  "PRAGMA table_info(combat_fighters);"
# Expect: burned_at, burned_by_did, owner_address

npx wrangler d1 execute wojak-users --remote --command \
  "SELECT name FROM sqlite_master WHERE type='table' AND name='burn_power_grants';"
# Expect: one row
```

---

## 3. Build and deploy to Cloudflare Pages

### 3.1 Build

```bash
npm run build
```

If this fails, fix errors before deploying.

### 3.2 Deploy

```bash
npx wrangler pages deploy dist --project-name=wojak-ink
```

This deploys the **static output** (`dist`) and your **Pages Functions** (including `functions/api/combat/power-leaderboard.ts`) from the repo. Cloudflare uses the `functions/` directory at project root when building the deployment.

### 3.3 Purge cache (optional)

If you changed layer assets or want to force fresh JS/CSS:

```bash
CLOUDFLARE_PURGE_TOKEN=$(cat ~/.cloudflare-purge-token 2>/dev/null)
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/cf75e020a68dcccd84405950df016860/purge_cache" \
  -H "Authorization: Bearer $CLOUDFLARE_PURGE_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

### 3.4 Verify

- Open https://wojak.ink/fight-club/rankings → Wojaks. You should see “No Wojak rankings yet” (empty is correct until production has votes) or “Couldn’t load rankings” only if the API errors.
- Open https://wojak.ink/generator and confirm the mint UI loads.

---

## 4. Quick reference — migrations this runbook applies

| Migration | File | Purpose |
|-----------|------|---------|
| 068 | `068_burn_tracking.sql` | `combat_fighters.burned_at`, `burned_by_did`; required for power-leaderboard and burn |
| 075 | `075_owner_address.sql` | `combat_fighters.owner_address`; required for mint pipeline and wallet identity |
| 076 | `076_burn_power_bonus.sql` | `burn_power_grants` table; required for burn +50 power assign |

Existing mint-related migrations (030, 031, 032, 034) are documented in `docs/LAUNCH-READINESS.md`; ensure those are applied as well before launch.
