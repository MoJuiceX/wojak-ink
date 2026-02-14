# Credit Leaderboard Audit Guide

**See also:** [CREDITS-FORMULA.md](./CREDITS-FORMULA.md) (formula and constants) · [CREDIT-LEADERBOARD-BULLETPROOF.md](./CREDIT-LEADERBOARD-BULLETPROOF.md) (alerting, reconciliation, health endpoint).

---

## Run the Audit

```bash
node scripts/audit-credits.mjs
```

Outputs:
- Full wallet list with purchase breakdown
- `scripts/audit-credits-report.json` for programmatic use

---

## Audit All Buys Since a Date (e.g. January 5th)

To verify that **all XCH NFT buys since a cutoff date** are included in the leaderboard:

### 1. Fetch MintGarden snapshot and compare to DB

```bash
npx tsx scripts/audit-credits-since-date.ts --since=2026-01-05 --compare=https://wojak.ink
```

- Fetches all XCH trade events from MintGarden
- Filters to `event_timestamp >= 2026-01-05`
- Compares `event_id`s to your deployed DB via `/api/credits/audit-events`
- Reports: missing events (in MintGarden but not in DB), extras (in DB but not MintGarden)

### 2. Outputs

- `scripts/audit-mintgarden-since-20260105.json` — MintGarden events since date
- `scripts/audit-credits-since-20260105-report.json` — diff report (`status: "OK"` or `"MISSING_EVENTS"`)

### 3. Without DB comparison (snapshot only)

```bash
npx tsx scripts/audit-credits-since-date.ts --since=2026-01-05
```

Only fetches and saves the MintGarden snapshot. Use this to inspect expected events before comparing.

### 4. If events are missing

- Run the backfill to insert historical events: `npx tsx scripts/backfill-credits.ts`
- Then apply the generated SQL: `npx wrangler d1 execute wojak-users --remote --file=scripts/backfill-credits-data.sql`
- The credit-tracker worker picks up new events on its next run; for urgent gaps, trigger it: `POST /run` on the worker

---

## Full Audit (Floor 1.0 XCH)

To audit the entire leaderboard using a fixed floor of 1.0 XCH:

```bash
npx tsx scripts/audit-credits-full.ts --db-file=scripts/backfill-credits-data.sql
```

Or against production API (requires deploy):

```bash
npx tsx scripts/audit-credits-full.ts --compare=https://wojak.ink
```

Outputs:

- `scripts/audit-expected-leaderboard.json` — Expected leaderboard from MintGarden (floor=1.0)
- `scripts/audit-credits-full-report.json` — Diff report (status: OK or DISCREPANCIES)
- `scripts/audit-credits-fix.sql` — If discrepancies, SQL to fix missing/wrong credits

The credit-tracker worker is configured to use floor=1.0 during the audit period. After the audit, switch to `getLatestFloorStored()` for correct historical floor.

---

## XCH and CAT Token Credits

**Both XCH and whitelisted CAT token purchases earn credits.**

### XCH trades
- Sourced from MintGarden Events API (`xch_price > 0`).
- Credits calculated directly from XCH price paid.

### CAT trades (whitelisted tokens only)
- Sourced from `sales_history` in D1 (populated by the `fetch-sales` worker via Dexie + MintGarden).
- Credits calculated from `xch_equivalent` (the XCH-equivalent value at time of trade, using the token's conversion rate from `cat_token_rates`).
- **Whitelisted tokens:** BEPE, Wand+Lightning, Sparkle+Mage, HOA, NeckCoin, $CHIA, PP.
- Non-whitelisted CAT tokens are excluded to limit pricing risk (unreliable conversions, token volatility).
- The whitelist is defined in `workers/credit-tracker/worker.ts` as `CAT_TOKEN_WHITELIST`.

---

## How Wallets Earn Free Mints

1. **Buy Wojak Farmers Plot NFTs with XCH or whitelisted CAT tokens** on MintGarden/Dexie.
2. **Each qualifying trade** creates a row in `credit_events` with:
   - `wallet_address` (buyer)
   - `nft_id` (NFT launcher)
   - `price_xch` (or `xch_equivalent` for CAT trades)
   - `credits_earned` (stored ×100; divide by 100 for display)
3. **Credit formula (V2):**

   ```
   effectiveFloor  = max(0.5, floorXch)
   priceRatio      = max(1, priceXch / effectiveFloor)
   whaleMultiplier = 1 + 0.30 × (1 − 1/priceRatio)
   rawCredits      = 50 × priceXch × whaleMultiplier
   credits_earned  = round(rawCredits × 100)
   ```

   Above-floor buys get an asymptotic whale bonus capped at 1.30×.
4. **1 free mint = 100 credits = 10,000 stored units.**

---

## How to Audit That Everything Is Correct

### 1. Cross-check MintGarden Events API

```http
GET https://api.mintgarden.io/events?collection=col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah&type=2&size=100
```

For each event:
- `address.encoded_id` = wallet
- `nft_id` = NFT
- `xch_price` = price in XCH
- `event_index` + `timestamp` = part of unique `event_id`

### 2. Recompute credits for a sample trade

```ts
// From scripts/backfill-credits.ts
const CREDITS_PER_XCH = 50;
const MAX_WHALE_BONUS = 0.30;
const MIN_EFFECTIVE_FLOOR = 0.5;

function calculateCredits(priceXch: number, floorXch: number) {
  const effectiveFloor = Math.max(MIN_EFFECTIVE_FLOOR, floorXch);
  const priceRatio = Math.max(1, priceXch / effectiveFloor);
  const whaleMultiplier = 1 + (MAX_WHALE_BONUS * (1 - 1 / priceRatio));
  const rawCredits = CREDITS_PER_XCH * priceXch * whaleMultiplier;
  return Math.round(rawCredits * 100);  // stored units
}
```

### 3. Use the Credits History API per wallet

```http
GET /api/credits/history?wallet=xch1...&limit=50
```

Returns `eventId`, `priceXch`, `creditsEarned`, `eventTimestamp`. Compare to the audit report.

### 4. Spot-check balances

```http
GET /api/credits/balance?wallet=xch1...
```

`earned - spent` should equal the audit’s total credits minus any free mints used.

---

## NFT Lookup

To get NFT names/edition numbers, use MintGarden:

```
https://mintgarden.io/nfts/{nft_id}
```

Or search by launcher ID on [Spacescan](https://www.spacescan.io) or MintGarden.
