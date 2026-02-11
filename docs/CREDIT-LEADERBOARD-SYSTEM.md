# Credit Leaderboard System — Full Documentation

Complete documentation of the **Free Mint Credits Leaderboard** for the Wojak Generator (Your Wojak). Purpose: so another developer or maintainer can fully understand the system and continue working on it.

---

## 1. Purpose and context

### 1.1 Why the leaderboard exists

- **Wojak Generator** lets users design a custom Wojak (layers, colors) and mint it on Chia as a **Your Wojak** NFT. Mints can be **paid** (XCH) or **free** (spending credits).
- **Credits** are earned by buying **Wojak Farmers Plot** NFTs with **XCH** on the open market (e.g. MintGarden, Dexie). The more you spend above floor, the more credits you earn (with a whale bonus).
- **100 credits = 1 free mint.** So collectors who support the collection by buying with XCH are rewarded with free Your Wojak mints.
- The **Credit Leaderboard** gives the community a transparent, verifiable view of who has earned the most credits, how many free mints they have available, and how many Your Wojak NFTs they have bought (paid). It builds trust and makes the economy visible.

### 1.2 Product flow (user perspective)

1. User buys Wojak Farmers Plot NFTs with **XCH** on a marketplace → each trade is a “purchase” that can earn credits.
2. Credits are calculated using **floor price at time of purchase** and a **whale bonus** (see formula below). They are stored and shown in the Generator.
3. In the **Generator**, the user sees their balance and “X free mints” (balance ÷ 100). They can choose **Free mint** to spend 100 credits and mint a Your Wojak NFT without paying XCH.
4. The **leaderboard** shows all wallets ranked by credits earned, credits spent, balance, free mints available, and “Your Wojak bought” (paid mints). A **verifier page** lets anyone drill into a wallet’s purchase history.

### 1.3 What is *not* credited

- **CAT-only** trades (no XCH) do **not** earn credits. Only events with `xch_price > 0` are processed.

---

## 2. Architecture overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  External                                                                     │
│  MintGarden Events API (trades)   MintGarden Collection API (floor)         │
└───────────────┬─────────────────────────────┬────────────────────────────────┘
                │                             │
                ▼                             ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  credit-tracker worker (cron every 30 min)                                    │
│  • Fetches new trade events (type=2, XCH)                                     │
│  • Writes daily floor snapshot → floor_price_snapshots                        │
│  • For each new event: floor for event date → calculate credits → credit_events│
│  • KV: last_credit_event_timestamp, last_floor_snapshot_date                  │
└─────────────────────────────────────┬─────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  D1 (wojak-users)                                                              │
│  • credit_events       — one row per XCH trade (earned credits)               │
│  • credit_spends        — one row per free mint (100 credits spent)             │
│  • floor_price_snapshots — one row per day (floor at date)                     │
│  • phase2_mints         — all Your Wojak mints (paid + free); used for “bought” │
└─────────────────────────────────────┬─────────────────────────────────────────┘
                │
    ┌───────────┼───────────┬─────────────────────┐
    ▼           ▼           ▼                     ▼
┌─────────┐ ┌─────────┐ ┌─────────┐  ┌─────────────────────┐
│ Leader- │ │ Balance │ │ History │  │ mint/prepare (free)   │
│ board   │ │         │ │         │  │ → INSERT credit_spends│
│ API     │ │ API     │ │ API     │  └─────────────────────┘
└────┬────┘ └────┬────┘ └────┬────┘
     │           │           │
     ▼           ▼           ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  Frontend                                                                      │
│  • Generator: MintContext → /api/credits/balance, ActionBar free/paid toggle   │
│  • CreditLeaderboard.tsx → /api/credits/leaderboard (lightbox)                 │
│  • credit-leaderboard-verifier.html → leaderboard + /api/credits/history        │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data model and storage

### 3.1 Tables (D1)

| Table | Purpose |
|-------|--------|
| **credit_events** | One row per XCH trade that earns credits. Columns: `wallet_address`, `nft_id`, `event_id` (unique), `price_xch`, `floor_at_time`, `credits_earned` (stored ×100), `whale_multiplier`, `source`, `event_timestamp`. |
| **credit_spends** | One row per free mint. Columns: `wallet_address`, `mint_id`, `credits_spent` (always 10000 = 100 credits). |
| **floor_price_snapshots** | One row per calendar day. Columns: `floor_xch` (×100), `source`, `snapshot_date` (YYYY-MM-DD). |
| **phase2_mints** | All Your Wojak mints (paid and free). Leaderboard uses `mint_type = 'paid' AND status = 'minted'` to count “Your Wojak bought” per wallet. |

Migration: `functions/migrations/030_credit_system.sql`.

### 3.2 Units

- **Credits** in DB are stored in **hundredths**: 1 credit = 100 units. One free mint = 100 credits = **10,000 units**.
- **APIs** that return “credits” to the client usually divide by 100 (e.g. leaderboard returns `earned / 100`). Balance API returns `earned`, `spent`, `balance` in display units (already ÷100).
- **Floor** in snapshots is stored as integer ×100 (e.g. 1.0 XCH = 100).

### 3.3 Event identity

- **event_id** = `nft_id` + `event_index` + `timestamp` (from MintGarden). Unique per trade; used to avoid duplicate rows (worker and backfill use `INSERT OR IGNORE` / uniqueness check).

---

## 4. How we derive the information

### 4.1 Source of “buys” and prices

- **MintGarden Events API:** `GET https://api.mintgarden.io/events?collection=<COLLECTION_ID>&type=2&size=100` (and cursor). `type=2` = trade/sale. Each item has: `address.encoded_id` (buyer), `xch_price`, `timestamp`, `nft_id`, `event_index`. We do **not** derive prices from our own system; we use MintGarden as the source of truth for trades and prices.

### 4.2 Floor price

- **Live:** Once per day the credit-tracker worker calls **MintGarden collection endpoint** (`GET /collections/:id`) and reads `floor` or `floor_price`. It stores that value (×100) in **floor_price_snapshots** with `snapshot_date = today`. KV key `last_floor_snapshot_date` prevents writing the same day twice.
- **Per event:** For each new trade, we use **floor at time of purchase**: lookup `floor_price_snapshots` for the event’s date (`snapshot_date <= event_date` ORDER BY `snapshot_date` DESC LIMIT 1). If none exists, fallback 1.0 XCH (100).
- **Backfill:** Historical floor data is not available; the backfill script uses a **fixed 1.0 XCH** for all backfilled events.

### 4.3 Credit formula

- Constants: `CREDITS_PER_FLOOR = 50`, `MIN_EFFECTIVE_FLOOR = 0.5`, `WHALE_COEFFICIENT = 0.2`.
- Steps:
  - `effectiveFloor = max(0.5, floorXch)`
  - `priceRatio = max(1, priceXch / effectiveFloor)`
  - `whaleMultiplier = 1 + 0.2 × ln(priceRatio)`
  - `rawCredits = 50 × priceRatio × whaleMultiplier`
  - Stored: `credits_earned = round(rawCredits × 100)` (hundredths).
- Same formula in: **credit-tracker worker** and **backfill script**. See `docs/CREDITS-FORMULA.md` as single source of truth.

---

## 5. Workers

### 5.1 credit-tracker (`workers/credit-tracker/`)

- **Role:** Ingest new XCH trades and daily floor; write to D1.
- **Schedule:** Cron `*/30 * * * *` (every 30 minutes).
- **Steps each run:**
  1. **Floor:** If today’s snapshot not yet written, fetch collection from MintGarden, insert into `floor_price_snapshots`, set KV `last_floor_snapshot_date`.
  2. **Events:** Fetch events (paginated, cursor). For each event with `xch_price > 0` and `event_timestamp > last_credit_event_timestamp`: check if `event_id` already in DB; if not, get floor for event date, compute credits, batch INSERT into `credit_events`. Advance KV `last_credit_event_timestamp` only to the max timestamp of **inserted** events (so we never skip events on partial failure).
- **Bindings:** D1 `DB` (wojak-users), KV `TRADE_VALUES_KV`, var `COLLECTION_ID`. Optional secret: `MINTGARDEN_API_KEY`.
- **Resilience:** Retries with backoff for MintGarden requests; batch “existing” check and batch INSERT; cursor advancement only for inserted events. See `docs/CREDIT-LEADERBOARD-BULLETPROOF.md`.

### 5.2 credits-alert (`workers/credits-alert/`)

- **Role:** Daily health check; alert if credits pipeline looks stuck.
- **Schedule:** Cron `0 8 * * *` (daily 8:00 UTC).
- **Steps:** Optionally POST to `CREDIT_TRACKER_RUN_URL` to trigger the credit-tracker; then GET `SITE_BASE_URL/api/credits/status`. If status request fails or `eventsLast24h === 0` and `totalEvents > 50`, POST a message to `ALERT_WEBHOOK_URL` (Slack/Discord).
- **Bindings:** Vars `SITE_BASE_URL`, optional `CREDIT_TRACKER_RUN_URL`; secret `ALERT_WEBHOOK_URL`.

---

## 6. APIs (Pages Functions)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/credits/leaderboard` | GET | Top wallets by earned/available/bought; query params: `limit`, `offset`, `sort` (earned \| available \| bought). Returns earned/spent/balance in display credits (÷100), freeMints, mintsUsed, yourWojakBought. |
| `/api/credits/balance` | GET | Balance for one wallet (`?wallet=`). Returns earned, spent, balance, freeMints, totalPurchases, totalXchSpent. Expires stale pending mints. |
| `/api/credits/history` | GET | Earning history for one wallet (`?wallet=&limit=`). Returns items with nftId, priceXch, creditsEarned, eventTimestamp. |
| `/api/credits/audit-events` | GET | Ops: event_ids (and optionally full rows) since a date (`?since=YYYY-MM-DD`, `?full=1`). Used by audit scripts. |
| `/api/credits/status` | GET | Ops: lastEventTimestamp, lastFloorSnapshotDate, eventsLast24h, totalEvents. Used by alerting and monitoring. |

All under `functions/api/credits/`. CORS allows `*`; no auth (wallet-based).

---

## 7. Frontend usage

- **Generator:** `MintContext` fetches `/api/credits/balance?wallet=...` and exposes `credits.free_mints_available`, etc. `ActionBar` shows “X free” and the Free/Paid toggle when the user has free mints. The trophy button opens the **Credit Leaderboard** lightbox (`CreditLeaderboard.tsx`), which fetches `/api/credits/leaderboard?limit=100&sort=earned`.
- **Verifier page:** `public/credit-leaderboard-verifier.html` — standalone page that loads the leaderboard and, per wallet, can load `/api/credits/history` for drill-down. Linked from Generator; deploy with the app so it’s on the same origin as the APIs.
- **Public formula/ops page:** `public/credits-docs.html` — short explanation of formula and pointer to repo docs (bulletproof, audit). Linked from verifier as “Formula & ops guide”.

---

## 8. Backfill and reconciliation

### 8.1 Backfill (historical events)

- **Script:** `scripts/backfill-credits.ts`. Fetches all trade events from MintGarden (same API as worker), filters by `--since=YYYY-MM-DD` (e.g. `2026-01-05`), computes credits with **fixed 1.0 XCH** floor, outputs SQL with `INSERT OR IGNORE` into `credit_events`.
- **Output:** `scripts/backfill-credits-data.sql` (or similar). Apply to production D1: `npx wrangler d1 execute wojak-users --remote --file=scripts/backfill-credits-data.sql`.
- **Idempotent:** Duplicate `event_id` are ignored.

### 8.2 Reconciliation (detect missing events)

- **Script:** `scripts/audit-credits-since-date.ts --since=2026-01-05 --compare=https://wojak.ink`. Fetches MintGarden events since date, fetches DB event_ids from `/api/credits/audit-events`, compares; writes report with status `OK` or `MISSING_EVENTS`.
- **Wrapper:** `scripts/credits-reconcile.ts` runs the audit and **exits 1** if status is `MISSING_EVENTS` so CI/cron can alert.
- **GitHub Actions:** `.github/workflows/credits-reconcile.yml` runs weekly (Sunday 7 UTC), runs reconcile script; on failure uploads report artifacts. Repo var `SITE_BASE_URL` can override compare URL (default `https://wojak.ink`).

---

## 9. File and doc index

| Area | Files / docs |
|------|----------------|
| **Workers** | `workers/credit-tracker/worker.ts`, `wrangler.toml`; `workers/credits-alert/worker.ts`, `wrangler.toml` |
| **Migrations** | `functions/migrations/030_credit_system.sql` |
| **APIs** | `functions/api/credits/leaderboard.ts`, `balance.ts`, `history.ts`, `audit-events.ts`, `status.ts` |
| **Mint (spend credits)** | `functions/api/mint/prepare.ts` (free mint path: check balance, INSERT `credit_spends`, create mint) |
| **Generator UI** | `src/contexts/MintContext.tsx`, `src/components/generator/ActionBar.tsx`, `src/components/generator/CreditLeaderboard.tsx` |
| **Static pages** | `public/credit-leaderboard-verifier.html`, `public/credits-docs.html`, `public/credit-leaderboard-preview.html` (mock) |
| **Scripts** | `scripts/backfill-credits.ts`, `scripts/audit-credits-since-date.ts`, `scripts/credits-reconcile.ts`, `scripts/audit-credits-full.ts`, `scripts/audit-credits.ts` / `audit-credits.mjs` |
| **Docs** | `docs/CREDITS-FORMULA.md`, `docs/CREDIT-LEADERBOARD-BULLETPROOF.md`, `docs/CREDITS-AUDIT-GUIDE.md`, `docs/CREDIT-LEADERBOARD-GO-LIVE-PLAN.md`, `docs/CREDIT-LEADERBOARD-VERIFIER-PLAN.md`, **this file** |

---

## 10. Glossary

| Term | Meaning |
|------|--------|
| **Credits (display)** | User-facing units; 100 credits = 1 free mint. |
| **Credits (stored)** | DB units = display × 100 (hundredths). e.g. 50 credits = 5000 stored. |
| **event_id** | Unique per trade: `nft_id` + `event_index` + `timestamp`. |
| **floor_at_time** | Floor price (×100) used for that event’s credit calculation (snapshot on or before event date). |
| **Free mint** | Your Wojak mint that costs 100 credits (10,000 units) from `credit_spends`. |
| **Your Wojak bought** | Count of phase2_mints with `mint_type = 'paid'` and `status = 'minted'` for that wallet. |

---

## 11. Runbooks (common tasks)

### 11.1 “Leaderboard is missing recent sales”

- Check credit-tracker worker: last run, logs. Trigger manually: `POST <credit-tracker-url>/run`.
- Check `GET /api/credits/status`: `lastEventTimestamp`, `eventsLast24h`. If worker runs but events don’t increase, check MintGarden API and worker bindings (D1, KV, COLLECTION_ID).
- Run reconciliation: `npx tsx scripts/credits-reconcile.ts --since=2026-01-05 --compare=https://wojak.ink`. If MISSING_EVENTS, run backfill for the missing window or fix worker and re-run.

### 11.2 “Add a new cutoff date for the leaderboard”

- Backfill: `npx tsx scripts/backfill-credits.ts --since=YYYY-MM-DD` → apply generated SQL to D1. Document the cutoff in go-live plan or this doc.

### 11.3 “Change the credit formula”

- Formula and constants live in: `workers/credit-tracker/worker.ts`, `scripts/backfill-credits.ts`. Update both and any shared copy. Document in `docs/CREDITS-FORMULA.md`. Changing the formula does **not** recompute existing rows; only new events (and any re-backfill you run) use the new formula.

### 11.4 “Alerting not firing”

- Ensure credits-alert worker is deployed and `ALERT_WEBHOOK_URL` is set. Check that `SITE_BASE_URL` and optional `CREDIT_TRACKER_RUN_URL` are correct. Trigger manually: `POST <credits-alert-url>/run` and check worker logs and webhook delivery.

---

## 12. Related docs (deep dives)

- **Formula and constants:** [CREDITS-FORMULA.md](./CREDITS-FORMULA.md)
- **Reliability, alerting, reconciliation:** [CREDIT-LEADERBOARD-BULLETPROOF.md](./CREDIT-LEADERBOARD-BULLETPROOF.md)
- **Audit and compare with MintGarden:** [CREDITS-AUDIT-GUIDE.md](./CREDITS-AUDIT-GUIDE.md)
- **Go-live steps (backfill, worker deploy, Pages):** [CREDIT-LEADERBOARD-GO-LIVE-PLAN.md](./CREDIT-LEADERBOARD-GO-LIVE-PLAN.md)
- **Verifier page plan:** [CREDIT-LEADERBOARD-VERIFIER-PLAN.md](./CREDIT-LEADERBOARD-VERIFIER-PLAN.md)
- **Phase 2 / Your Wojak branding:** [PHASE2-COLLECTION-BRANDING.md](./PHASE2-COLLECTION-BRANDING.md)
