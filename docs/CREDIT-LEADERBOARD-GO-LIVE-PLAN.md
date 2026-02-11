# Credit Leaderboard — Go-Live Plan

Step-by-step plan to make the credit leaderboard public with all data since **January 5th** and ongoing sales, using **floor price at time of purchase** for credit calculation. Follow this order; each step assumes the previous ones are done.

**See also:** **[CREDIT-LEADERBOARD-SYSTEM.md](./CREDIT-LEADERBOARD-SYSTEM.md)** — full system documentation (purpose, architecture, workers, APIs, runbooks). [CREDIT-LEADERBOARD-BULLETPROOF.md](./CREDIT-LEADERBOARD-BULLETPROOF.md) for alerting, reconciliation, health endpoint, and ops. [CREDITS-FORMULA.md](./CREDITS-FORMULA.md) for the formula and constants.

---

## Run everything (one script)

From repo root, after generating the backfill SQL:

```bash
npx tsx scripts/backfill-credits.ts --since=2026-01-05   # if not already done
./scripts/leaderboard-go-live.sh
```

Requires: `wrangler login` (or `CLOUDFLARE_API_TOKEN`). The script: (1) applies D1 migration, (2) applies backfill SQL, (3) deploys credit-tracker worker, (4) builds and deploys Pages.

---

## 1. Clarify “floor price” for credits

- **Option A — Floor at time of purchase (recommended):** Each sale earns credits using the **floor price on the day of that sale**. Fair: buyers are compared to the market that day. Requires daily floor snapshots (worker already writes one per day).
- **Option B — Current floor:** Credits use today’s floor for everyone. Simpler but retroactively changes credit totals when floor moves.

**Recommendation:** Use **floor at time of purchase**. Worker already stores daily floor in `floor_price_snapshots`; we use the snapshot for the event’s date (or latest before that date) when calculating credits for new events.

---

## 2. Code change: Worker uses floor at time of event

**Current behavior:** Worker uses fixed `FLOOR_XCH_FIXED = 100` (1.0 XCH) for every new event.

**Target behavior:** For each MintGarden event with timestamp `T`:

1. Derive date from `T` (e.g. `2026-02-11`).
2. Get floor for that date: `SELECT floor_xch FROM floor_price_snapshots WHERE snapshot_date <= ? ORDER BY snapshot_date DESC LIMIT 1` (bind event date). If none, use latest snapshot overall; if still none, fallback to 1.0 XCH (100).
3. Calculate credits with that floor and insert into `credit_events` with `floor_at_time` = that value.

**Files to edit:** `workers/credit-tracker/worker.ts`

- Remove or stop using `FLOOR_XCH_FIXED` for `processEvents`.
- In `processEvents`, for each event: call a small helper `getFloorForDate(env.DB, eventDate)` that returns floor_xch (or 100). Use it in `calculateCredits(event.xch_price, floorXch)` and in the INSERT for `floor_at_time`.

**Order of operations in worker:** Keep `ensureFloorSnapshot(env, today)` at the start of the run so today’s floor is in the DB before we process today’s events.

---

## 3. Backfill: Sales since January 5th only

**Goal:** Insert into `credit_events` every XCH trade from **2026-01-05** onward that is not already in the DB.

**Options:**

- **A. Use existing backfill script + filter:** Ensure `scripts/backfill-credits.ts` supports a cutoff date (e.g. `--since=2026-01-05`). When generating SQL, skip events with `event.timestamp < '2026-01-05'`. Generate only INSERTs for events on or after Jan 5. For **historical** events we don’t have daily floor data; keep using **fixed 1.0 XCH** for backfill (document that in the script and in this plan).
- **B. New script:** If you prefer a dedicated “since date” script, add e.g. `scripts/backfill-credits-since.ts` that fetches events, filters to `timestamp >= since`, and generates the same SQL shape with fixed floor 1.0 XCH.

**Steps:**

1. Add or confirm `--since=2026-01-05` in the backfill script. Filter events before generating INSERTs.
2. Run: `npx tsx scripts/backfill-credits.ts --since=2026-01-05` (or equivalent). This produces/updates `scripts/backfill-credits-data.sql`.
3. Apply to **production D1**:  
   `npx wrangler d1 execute wojak-users --remote --file=scripts/backfill-credits-data.sql`  
   (Use the same DB name/id as your Pages project.)
4. Optionally verify: run audit script for “since 2026-01-05” and compare to `/api/credits/audit-events?since=2026-01-05` after deploy.

**Note:** Backfill uses fixed 1.0 XCH floor for all historical events (no historical daily floor data). Going forward, the worker uses floor-at-time from snapshots.

---

## 4. Worker: Schedule and deploy

**Current:** Cron `*/30 * * * *` (every 30 minutes) in `workers/credit-tracker/wrangler.toml`.

**Recommendation:** Keep **every 30 minutes** so new sales show up within at most 30 minutes. If you prefer “every hour”, use `0 * * * *`; if “every day”, use `0 0 * * *` (once at midnight). For a “bulletproof” leaderboard that always adds new data when sales occur, 30 minutes is a good balance.

**Deploy steps:**

1. From repo root (or worker root):  
   `npx wrangler deploy` in the directory that contains `workers/credit-tracker/` (or run from `workers/credit-tracker` if wrangler.toml is there).
2. Ensure bindings are set:
   - **D1:** `DB` → `wojak-users` (same as Pages).
   - **KV:** `TRADE_VALUES_KV` (for `last_credit_event_timestamp` and `last_floor_snapshot_date`).
   - **Var:** `COLLECTION_ID` = Wojak Farmers Plot collection ID.
3. If you use a MintGarden API key:  
   `npx wrangler secret put MINTGARDEN_API_KEY` in the same worker directory.

**Verification:** After deploy, trigger once manually:  
`curl -X POST https://<your-worker-subdomain>.workers.dev/run`  
Then check D1 for new rows in `credit_events` and `floor_price_snapshots` (today’s date).

---

## 5. Ensure D1 and migrations are applied (production)

1. **Migrations:** Apply `functions/migrations/030_credit_system.sql` to production D1 if not already:  
   `npx wrangler d1 execute wojak-users --remote --file=functions/migrations/030_credit_system.sql`
2. **Tables used by leaderboard:** `credit_events`, `credit_spends`, `floor_price_snapshots`, `phase2_mints`. Confirm they exist and that Pages Functions use the same D1 binding name `DB` and database.

---

## 6. Pages / API: Leaderboard and audit endpoints

- **Leaderboard:** `GET /api/credits/leaderboard?limit=100&sort=earned` — used by the app and the verifier page. No change needed if it already reads from `credit_events` + `credit_spends` + `phase2_mints`.
- **Audit:** `GET /api/credits/audit-events?since=2026-01-05` — for verifying that all events since Jan 5 are in the DB. Optional: add a simple “last run” or “newest event” in response for ops.

Ensure the Pages project is deployed with the same D1 database as the worker so both read/write the same `credit_events` and `floor_price_snapshots`.

---

## 7. Make leaderboard “public”

- **Generator:** The “Leaderboard” (Trophy) button already opens the Credit Leaderboard modal; no change required for “going public” other than deploying the app.
- **Verifier page:** If you use `credit-leaderboard-verifier.html`, ensure it’s deployed and linked where you want (e.g. from generator or docs). It calls `/api/credits/leaderboard` and `/api/credits/history`; those must be live on the same origin.
- **Optional:** Add a nav or footer link to the verifier page so the leaderboard is easy to find.

---

## 8. Bulletproof “always add new sales” behavior

| What | How |
|------|-----|
| New sales appear in DB | Worker runs every 30 min; fetches MintGarden events (type=2, XCH only), inserts new `event_id`s into `credit_events`. Idempotent: duplicates skipped by UNIQUE on `event_id`. |
| Resume after gap | Worker uses KV `last_credit_event_timestamp`; next run fetches events and only processes those with `timestamp > lastTs`. No need to reprocess old events. |
| Floor for new events | Worker writes today’s floor once per day to `floor_price_snapshots`. For each new event, use floor for event’s date (step 2). |
| No double credit | `event_id = nft_id + event_index + timestamp` is unique; INSERT is “insert or skip” in worker; backfill uses `INSERT OR IGNORE`. |
| CAT vs XCH | Only events with `xch_price > 0` are credited; CAT-only trades are skipped. |

**Optional hardening:**

- **Alerting:** If you have a cron that hits an “ops” endpoint, have it call the worker’s `POST /run` and then check that the number of `credit_events` rows (or newest `event_timestamp`) has advanced when there were known sales.
- **Daily audit:** Run `audit-credits-since-date.ts --since=2026-01-05 --compare=https://wojak.ink` periodically and fix any reported missing events (e.g. re-run backfill for a date range or fix worker logic).

---

## 9. Checklist (summary)

- [x] **Floor logic:** Worker uses floor at time of purchase (floor for event date from `floor_price_snapshots`); backfill uses fixed 1.0 XCH for historical events. *(Implemented in worker via `getFloorForDate()`.)*
- [x] **Worker code:** `workers/credit-tracker/worker.ts` uses `getFloorForDate(DB, eventDate)` in `processEvents` with per-date cache.
- [x] **Backfill script:** `scripts/backfill-credits.ts` supports `--since=2026-01-05`; generates SQL only for events on or after that date.
- [ ] **Backfill run:** `npx tsx scripts/backfill-credits.ts --since=2026-01-05` → then apply generated SQL to production D1.
- [ ] **Migrations:** Apply `030_credit_system.sql` to production D1 if not already.
- [ ] **Worker deploy:** Deploy credit-tracker worker with cron (e.g. `*/30 * * * *`), D1, KV, COLLECTION_ID (and optional MINTGARDEN_API_KEY).
- [ ] **Manual trigger:** Once after deploy: `POST .../run` and verify new rows / today’s floor snapshot.
- [ ] **Pages deploy:** App and Functions deployed; same D1 as worker; `/api/credits/leaderboard` and `/api/credits/history` work.
- [ ] **Verify:** Open leaderboard in app and verifier page; optionally run audit script and compare with MintGarden.

After this, the leaderboard is public, includes all sales since January 5th (backfill) and going forward (worker), and credits for new sales are calculated using the floor price at the time of each purchase.
