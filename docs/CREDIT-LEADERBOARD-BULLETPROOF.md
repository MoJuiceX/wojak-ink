# Credit Leaderboard — Bulletproof & Industry-Standard Guide

How to make the Freemint Credits system **never lose data**, **always work**, and be **efficient** and **auditable** so the community can rely on it.

---

## 1. Never lose data

### 1.1 Worker: idempotency (already in place)
- **Event identity:** `event_id = nft_id + event_index + timestamp` is unique. Inserts use this; duplicates are skipped (SELECT check + UNIQUE constraint).
- **KV cursor:** `last_credit_event_timestamp` is updated only at the **end** of a successful run. If the worker crashes mid-run, the next run re-fetches and re-processes; existing events are skipped. **No events are dropped.**

### 1.2 Worker: only advance cursor for inserted events (implemented)
- We only call `setLastTimestamp` with the **max timestamp among events we actually inserted** this run. If we insert 0 (e.g. DB error or all duplicates), we don’t advance. That way a failed run doesn’t skip events.

### 1.3 Worker: retry external APIs
- **MintGarden** can throttle (429) or fail (5xx). Add **retries with exponential backoff** (e.g. 3 attempts: 1s, 2s, 4s) for:
  - `GET /collections/:id` (floor snapshot)
  - `GET /events` (trade events)
- On final failure: for **floor**, use `getLatestFloorStored()` and don’t write today’s snapshot (no data loss; today’s events may use yesterday’s floor). For **events**, don’t update `last_credit_event_timestamp` so the next run retries the same window.

### 1.4 Backfill: idempotency (already in place)
- `INSERT OR IGNORE` and unique `event_id` ensure re-runs don’t duplicate. Use `--since=YYYY-MM-DD` so only intended events are in the generated SQL.

### 1.5 Audit trail
- **credit_events** is append-only (no UPDATE/DELETE). **credit_spends** is append-only per free mint. Keep it that way. Any “fix” for bad data should be a corrective insert or a documented one-off migration, not silent overwrites.

---

## 2. Always work (reliability)

### 2.1 Worker: retries (see 1.3)
- Prevents transient MintGarden/network failures from leaving the pipeline stuck.

### 2.2 Worker: batch inserts
- Replace per-event `INSERT` with **batched INSERTs** (e.g. up to 20 rows per statement). Fewer D1 round-trips, lower chance of partial failure and easier to reason about “inserted set” for cursor advancement.

### 2.3 Worker: batch “existing” check
- Instead of `SELECT 1 FROM credit_events WHERE event_id = ?` per event, collect a page’s event IDs and run **one** `WHERE event_id IN (...)` (or chunk into batches of 100). Reduces read load and latency.

### 2.4 Floor snapshot: graceful degradation
- If the collection API fails after retries, **do not** fail the whole run. Use last known floor and skip writing today’s snapshot. Events still get credits (with last known floor).

### 2.5 Leaderboard API: read-only and robust
- No writes; use a single aggregated query (see Efficiency) so one D1 query is enough. On error return 500 with a generic message; don’t expose internal details.

### 2.6 Health / status endpoint
- Add **GET /api/credits/status** (or **/api/credits/health**) that returns:
  - `lastEventTimestamp` (from KV or latest row in `credit_events`)
  - `lastFloorSnapshotDate`
  - `eventsLast24h` (count of credit_events in last 24 hours)
  - Optional: `workerLastRun` if you store it (e.g. in KV when worker finishes)
- Enables **alerting**: cron hits worker `POST /run`, then hits `/api/credits/status` and checks that `lastEventTimestamp` or `eventsLast24h` is advancing when trades are expected.

---

## 3. Efficiency

### 3.1 Leaderboard: single aggregation query
- **Current:** Three separate queries (earned, spent, bought) then merge in JS.
- **Target:** One query that returns all wallets with earned, spent, bought (e.g. CTE with UNION of wallet addresses + LEFT JOINs to aggregated earned/spent/bought). Then sort and slice in JS. Fewer round-trips and less memory.

### 3.2 Worker: batch INSERT and batch SELECT (see 2.2, 2.3)
- Cuts D1 round-trips per run and speeds up each run.

### 3.3 Optional: short TTL cache for leaderboard
- If traffic grows, add `Cache-Control: public, max-age=60` (or 120) on the leaderboard response. Balance freshness vs D1 load. Invalidate or keep TTL low so “new credits” appear within 1–2 minutes.

### 3.4 Indexes (already in place)
- `credit_events(wallet_address)`, `credit_events(event_timestamp)`, `credit_spends(wallet_address)`, `floor_price_snapshots(snapshot_date)`. Keep these; they support the aggregation and worker queries.

---

## 4. Industry standard / operability

### 4.1 Observability
- **Worker:** Log structured summary per run: `processed`, `inserted`, `failedFetch`, `lastTimestamp`. Optionally log to a dashboard (e.g. Workers Analytics or external).
- **Health endpoint:** See 2.6. Use it for uptime checks and alerting.

### 4.2 Alerting
- **Cron:** Every 30 min (or daily): trigger worker `POST /run`, then GET `/api/credits/status`. If no new events in 24h and you expect activity, alert. If worker returns 5xx, alert.
- **Reconciliation:** Periodically run `audit-credits-since-date.ts --since=2026-01-05 --compare=https://wojak.ink`. If status is `MISSING_EVENTS`, investigate and re-run backfill or fix worker.

### 4.3 Single source of truth for formula
- Credit formula and constants live in **worker** and **backfill** (and possibly a shared module or doc). Document in this repo:
  - `CREDITS_PER_FLOOR`, `MIN_EFFECTIVE_FLOOR`, `WHALE_COEFFICIENT`
  - Rule: “Only XCH trades; floor at time of purchase from snapshots; backfill uses fixed 1.0 XCH.”
- Avoid changing formula without a migration/backfill plan and a note in CREDIT-LEADERBOARD-GO-LIVE-PLAN or this doc.

### 4.4 Audit endpoint
- **GET /api/credits/audit-events** is for ops/scripts. Optionally rate-limit or restrict by API key / internal only so it isn’t abused. Keep it for reconciliation.

### 4.5 Verifier page and docs
- Public **credit-leaderboard-verifier.html** and **CREDITS-AUDIT-GUIDE.md** let the community verify leaderboard data. Link to the formula doc so “how credits are calculated” is transparent.

---

## 5. Checklist (summary)

| Area | Action |
|------|--------|
| **Data loss** | Only advance KV timestamp for events actually inserted; retry MintGarden with backoff; keep credit_events/credit_spends append-only. |
| **Reliability** | Worker: retries, batch INSERT, batch “existing” check; floor failure → use last floor; health endpoint for monitoring. |
| **Efficiency** | Leaderboard: one aggregated query; worker: batch DB operations; optional short cache on leaderboard. |
| **Ops** | Health/status endpoint; cron + alerting on status; periodic audit script; document formula and constants. |

---

## 6. Alerting, reconciliation, and docs (implemented)

- **Alerting:** Worker `workers/credits-alert` runs daily (cron `0 8 * * *`). Optionally triggers the credit-tracker, then fetches `GET SITE_BASE_URL/api/credits/status`. If `eventsLast24h === 0` and `totalEvents > 50`, or status request fails, POSTs to `ALERT_WEBHOOK_URL` (Slack/Discord). Set `SITE_BASE_URL`, optional `CREDIT_TRACKER_RUN_URL`, and secret `ALERT_WEBHOOK_URL` in the worker.
- **Reconciliation:** Script `scripts/credits-reconcile.ts` runs the audit (`audit-credits-since-date.ts --since=2026-01-05 --compare=...`) and exits 1 if status is `MISSING_EVENTS`. GitHub Actions workflow `.github/workflows/credits-reconcile.yml` runs weekly (Sunday 7 UTC), runs the script, and on failure uploads the report artifact. Set repo var `SITE_BASE_URL` if your site is not `https://wojak.ink`.
- **Docs:** [CREDITS-FORMULA.md](./CREDITS-FORMULA.md) is the single source of truth for the formula and constants. [credits-docs.html](../public/credits-docs.html) is a short public page (formula + link to repo docs). The verifier page links to it as “Formula & ops guide”. CREDITS-AUDIT-GUIDE.md and CREDIT-LEADERBOARD-GO-LIVE-PLAN.md link to this bulletproof doc and the formula doc.

---

## 7. Implemented in this repo

- **Worker:** Retries with backoff for MintGarden (events + collection), batch “existing” check (`WHERE event_id IN (...)`), batch INSERT (10 rows per statement), and cursor advancement only for successfully inserted events. See `workers/credit-tracker/worker.ts`.
- **Leaderboard:** Single CTE query for earned/spent/bought; fallback when `phase2_mints` is missing. See `functions/api/credits/leaderboard.ts`.
- **Status endpoint:** `GET /api/credits/status` returns `lastEventTimestamp`, `lastFloorSnapshotDate`, `eventsLast24h`, `totalEvents` for alerting and ops. See `functions/api/credits/status.ts`.
