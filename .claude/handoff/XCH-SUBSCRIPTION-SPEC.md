# XCH Premium Subscription — Fight Club

---

## Overview

Premium subscribers get 4 battles/day instead of 1. Cost: 1 XCH/month. Payment via Sage wallet in-app.

All users start with a 2-week free trial (4 battles/day). After trial expires, they drop to 1 battle/day unless they subscribe.

---

## Task 1: Create Subscription Migration

**File:** `functions/migrations/069_subscriptions.sql` (NEW)

```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  did_id TEXT PRIMARY KEY,
  tier TEXT NOT NULL DEFAULT 'trial',  -- 'trial', 'free', 'premium'
  trial_started_at TEXT,
  trial_expires_at TEXT,
  premium_started_at TEXT,
  premium_expires_at TEXT,
  total_paid_xch REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Track payment transactions
CREATE TABLE IF NOT EXISTS subscription_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  did_id TEXT NOT NULL,
  amount_xch REAL NOT NULL,
  tx_id TEXT,  -- Chia transaction ID for verification
  payment_address TEXT,
  status TEXT DEFAULT 'pending',  -- 'pending', 'confirmed', 'failed'
  days_granted INTEGER DEFAULT 30,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (did_id) REFERENCES subscriptions(did_id)
);
```

---

## Task 2: Subscription Status API

**File:** `functions/api/subscription/status.ts` (NEW)

**GET /api/subscription/status?did=xxx**

Logic:
1. Look up subscription for this DID
2. If no record → create one with `tier = 'trial'`, `trial_started_at = now()`, `trial_expires_at = now + 14 days`
3. If trial and not expired → return `{ tier: 'trial', battlesPerDay: 4, expiresAt: trial_expires_at }`
4. If trial expired and no premium → return `{ tier: 'free', battlesPerDay: 1 }`
5. If premium and not expired → return `{ tier: 'premium', battlesPerDay: 4, expiresAt: premium_expires_at }`
6. If premium expired → downgrade to free, return `{ tier: 'free', battlesPerDay: 1 }`

Also return: `battlesToday` (count of battles this DID has fought today) and `battlesRemaining`.

---

## Task 3: Battle Limit Enforcement

**File:** `functions/api/combat/queue.ts`

Before allowing a user to join the battle queue:
1. Call subscription status logic (inline, not HTTP call)
2. Count battles today for this DID
3. If `battlesToday >= battlesPerDay` → return 429 with message "Daily battle limit reached. Upgrade to Premium for 4 battles/day."
4. Otherwise → proceed with queue join

---

## Task 4: Payment API

**File:** `functions/api/subscription/pay.ts` (NEW)

**POST /api/subscription/pay**

Body: `{ did: string, txId: string }`

The flow:
1. User clicks "Subscribe" in the app
2. Frontend creates a Sage wallet transaction sending 1 XCH to the treasury address
3. Frontend gets the transaction ID
4. Frontend calls this endpoint with DID + txId
5. Backend verifies the transaction (check amount = 1 XCH, check destination = treasury)
6. If valid: create subscription_payments record, update subscription to premium for 30 days
7. Return: `{ success: true, tier: 'premium', expiresAt: '...' }`

**Treasury address:** Use an environment variable `TREASURY_XCH_ADDRESS` (set in Cloudflare).

Transaction verification: Use Chia RPC or check via MintGarden/explorer API. If verification is complex, start with a simpler approach — record the payment as pending, and a worker verifies it later.

---

## Task 5: Subscribe UI

**File:** Add to `src/pages/FightClub.tsx` or `src/pages/Settings.tsx`

Show subscription status in Fight Club:

**If trial:**
- Banner: "Free trial: X days remaining. 4 battles/day."
- Small "Subscribe" link

**If free:**
- Banner: "Free plan: 1 battle/day. Upgrade for 4 battles/day — 1 XCH/month"
- "Subscribe" button → triggers Sage wallet payment flow

**If premium:**
- Small badge: "Premium" with expiry date
- "Renew" button if within 7 days of expiry

**Subscribe button flow:**
1. User clicks "Subscribe"
2. Confirmation modal: "Pay 1 XCH for 30 days of Premium (4 battles/day)?"
3. User confirms → Sage wallet opens with pre-filled transaction (1 XCH to treasury)
4. User approves in wallet → frontend receives txId
5. Frontend calls POST /api/subscription/pay
6. Success → refresh status, show "Premium activated!"

---

## Task 6: Battle Tab — Show Remaining Battles

**File:** `src/pages/FightClub.tsx` or Battle tab component

In the Battle tab, show:
- "Battles today: 2/4" (or "1/1" for free users)
- If limit reached: "Come back tomorrow" or "Upgrade to Premium"
- Progress bar or counter near the queue join button

---

## Constants

| Constant | Value |
|----------|-------|
| TRIAL_DURATION_DAYS | 14 |
| TRIAL_BATTLES_PER_DAY | 4 |
| FREE_BATTLES_PER_DAY | 1 |
| PREMIUM_BATTLES_PER_DAY | 4 |
| PREMIUM_PRICE_XCH | 1.0 |
| PREMIUM_DURATION_DAYS | 30 |

---

## Rules
- Run `npm run build` after each task
- Commit and `git push origin main`
- The Sage wallet transaction is handled CLIENT-SIDE — backend only verifies
- Treasury address comes from env var, never hardcoded
- No `!important`, theme.css for visuals
