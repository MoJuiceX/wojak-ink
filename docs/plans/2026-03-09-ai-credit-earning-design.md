# AI Credit Earning Pathways — Design Document

**Date:** 2026-03-09
**Status:** Approved

---

## Overview

Currently, AI enhancement credits can only be obtained by purchasing them directly with XCH. This design adds two additional earning pathways so users are rewarded for engaging with the Wojak ecosystem:

1. **Paid Wojak mints** — earn 1 AI credit per paid mint
2. **Farmer Plot NFT trades** — earn 1 AI credit per 1.0 XCH spent on Farmer Plot purchases

These pathways supplement direct purchase (which remains unchanged). A future LP farming pathway (TibetSwap WOJAK/XCH liquidity provision) is planned but out of scope for this iteration.

---

## 1. Earning Pathways

### 1A. Paid Wojak Mint Reward

**Rate:** 1 AI credit per paid mint (free mints do not earn AI credits)

**Economics:**
- Average paid mint: ~0.30 XCH ($0.75 at XCH = $2.50)
- AI credit cost to us: $0.086 (ReV API)
- Subsidy rate: 11.5% of mint revenue

**Mechanism:**
- Granted atomically during mint finalization in `process.ts`
- Only when `mint_type === 'paid'`
- Inserted into `ai_credit_events` table with `event_type: 'mint_reward'`
- `event_id: 'mint_reward_{mint_number}'` prevents double-granting

**User notification:** Toast message "✨ +1 AI Credit earned!" shown after mint completes.

### 1B. Farmer Plot NFT Trade Reward

**Rate:** `floor(priceXch / 1.0)` AI credits per trade (1 credit per 1.0 XCH spent)

**Economics:**
- Typical Farmer Plot price: 1.5–2.5 XCH
- 10% royalty on secondary sales → ~0.20 XCH revenue per sale
- A 2.0 XCH purchase = 2 AI credits ($0.172 cost vs $0.50 royalty revenue)
- Subsidy rate: 34% of royalty income

**Mechanism:**
- Piggybacks on the existing `credit-tracker` worker that already detects Farmer Plot trades on MintGarden
- When the worker processes a Farmer Plot trade and inserts a `credit_events` row (for free mint credits), it simultaneously inserts an `ai_credit_events` row
- Same anti-wash-trading rules apply (skip self-buys, dedup by event_id)
- `event_id: 'farmer_plot_{coin_id}_{timestamp}'`

**User notification:** Silent (worker runs every 30 min; no real-time notification path for async trade detection).

### 1C. Direct Purchase (Existing — Unchanged)

4-tier pricing via SageWallet + Spacescan verification. Already implemented. No changes.

| Tier | Credits | XCH |
|------|---------|-----|
| 1 | 1 | 0.10 |
| 10 | 10 | 0.80 |
| 25 | 25 | 1.50 |
| 50 | 50 | 2.40 |

---

## 2. Database

### New table: `ai_credit_events`

Mirrors the `credit_events` pattern used for free mint credits. Stores all non-purchase AI credit grants.

```sql
CREATE TABLE IF NOT EXISTS ai_credit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  credits_earned INTEGER NOT NULL,
  source_ref TEXT,
  metadata TEXT,
  event_timestamp TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_credit_events_wallet
  ON ai_credit_events(wallet_address);
CREATE INDEX IF NOT EXISTS idx_ai_credit_events_type
  ON ai_credit_events(event_type);
```

**Event types:**

| event_type | event_id format | credits_earned | source_ref | metadata |
|-----------|----------------|---------------|------------|----------|
| `mint_reward` | `mint_reward_{mint_number}` | 1 | mint number | `{"mintType":"paid","priceXch":0.30}` |
| `farmer_plot_trade` | `farmer_plot_{coin_id}_{ts}` | `floor(priceXch)` | coin ID | `{"priceXch":2.0,"collection":"farmer_plot"}` |

### Updated balance formula

```
AI balance = SUM(ai_credit_purchases.credits_purchased WHERE status='confirmed')
           + SUM(ai_credit_events.credits_earned)
           - SUM(ai_credit_usage.credits_spent)
```

---

## 3. Backend Changes

### 3A. Migration — `functions/migrations/081_ai_credit_events.sql`

Creates the `ai_credit_events` table with indexes.

### 3B. Mint reward — `functions/api/mint/process.ts`

In the finalization step (where `phase2_mints` is inserted), add to the D1 batch:

```typescript
// Only for paid mints
if (job.mintType === 'paid') {
  batch.push(
    env.DB.prepare(`
      INSERT OR IGNORE INTO ai_credit_events
        (wallet_address, event_id, event_type, credits_earned, source_ref, metadata, event_timestamp)
      VALUES (?, ?, 'mint_reward', 1, ?, ?, datetime('now'))
    `).bind(
      job.walletAddress,
      `mint_reward_${mintNumber}`,
      String(mintNumber),
      JSON.stringify({ mintType: 'paid', priceXch: job.totalPriceXch })
    )
  );
}
```

`INSERT OR IGNORE` ensures idempotency — if process.ts retries, no duplicate credit.

### 3C. Farmer Plot reward — `workers/credit-tracker/worker.ts`

In the existing trade processing loop, after inserting a `credit_events` row for a Farmer Plot trade:

```typescript
// Only for Farmer Plot collection trades
if (isFarmerPlotTrade(event)) {
  const aiCredits = Math.floor(priceXch);
  if (aiCredits > 0) {
    await env.DB.prepare(`
      INSERT OR IGNORE INTO ai_credit_events
        (wallet_address, event_id, event_type, credits_earned, source_ref, metadata, event_timestamp)
      VALUES (?, ?, 'farmer_plot_trade', ?, ?, ?, ?)
    `).bind(
      buyerWallet,
      `farmer_plot_${coinId}_${timestamp}`,
      aiCredits,
      coinId,
      JSON.stringify({ priceXch, collection: 'farmer_plot' }),
      tradeTimestamp
    ).run();
  }
}
```

### 3D. Balance endpoint — `functions/api/ai/balance.ts`

Update the balance query to include earned credits:

```sql
SELECT
  COALESCE((SELECT SUM(credits_purchased) FROM ai_credit_purchases
            WHERE wallet_address = ? AND status = 'confirmed'), 0) as purchased,
  COALESCE((SELECT SUM(credits_earned) FROM ai_credit_events
            WHERE wallet_address = ?), 0) as earned,
  COALESCE((SELECT SUM(credits_spent) FROM ai_credit_usage
            WHERE wallet_address = ?), 0) as spent
```

Return: `{ purchased, earned, spent, balance: purchased + earned - spent }`

---

## 4. Frontend Changes

### 4A. Credits shop — "Earn for free" section

Add below the purchase bundles in `AICreditsShop.tsx`:

```
── or earn for free ──
🎨 Mint a Wojak = +1 credit
🌾 Trade Farmer Plots = +1 credit per 1 XCH
```

Styled as a subtle info section with `text-secondary` color and small icons.

### 4B. Mint completion toast

After a paid mint completes successfully, show a toast notification:
"✨ +1 AI Credit earned!"

Uses the existing toast system (`ToastContainer.tsx`).

### 4C. Balance endpoint update

The balance endpoint returns `{ purchased, earned, spent, balance }`. The frontend can optionally show the breakdown (e.g., "8 purchased · 4 earned") but at minimum uses `balance` for the total.

---

## 5. Not In Scope

- **LP farming** — TibetSwap WOJAK/XCH liquidity provision (future iteration)
- **Retroactive grants** — no credits for mints that already completed
- **Changes to direct purchase flow** — pricing and SageWallet integration stay as-is
- **Regular Wojak trades** — only Farmer Plot trades earn AI credits
- **Free mints earning AI credits** — only paid mints qualify

---

## 6. Success Criteria

- [ ] `ai_credit_events` table created with migration 081
- [ ] Paid mints grant exactly 1 AI credit on finalization
- [ ] Free mints do not grant AI credits
- [ ] Farmer Plot trades grant `floor(priceXch)` AI credits
- [ ] Regular Wojak trades do not grant AI credits
- [ ] Balance endpoint includes earned credits in total
- [ ] Balance endpoint returns breakdown: `{ purchased, earned, spent, balance }`
- [ ] Credits shop shows "earn for free" section with pathway descriptions
- [ ] Toast notification appears after paid mint: "✨ +1 AI Credit earned!"
- [ ] No duplicate credits on retry (INSERT OR IGNORE idempotency)
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
