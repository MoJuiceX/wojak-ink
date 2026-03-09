# AI Credit Earning Pathways — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add two new AI credit earning pathways: 1 credit per paid Wojak mint, and `floor(priceXch)` credits per Farmer Plot NFT trade. Includes migration, backend integration, balance endpoint update, and frontend UI.

**Architecture:** New `ai_credit_events` table stores all non-purchase AI credit grants. Mint reward is inserted atomically during `finalizeJob()` in `process.ts`. Farmer Plot reward piggybacks on the existing `credit-tracker` worker's trade detection. Balance query sums purchases + earned - spent.

**Tech Stack:** Cloudflare D1 (SQL), Cloudflare Workers (credit-tracker cron), React + TypeScript frontend, existing toast system.

---

## Task 1: Create `ai_credit_events` Migration

**Files:**
- Create: `functions/migrations/081_ai_credit_events.sql`

**Step 1: Write the migration file**

```sql
-- AI credit earning events: non-purchase credit grants.
-- Run once against wojak-users D1 database.

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

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: Zero errors (migration SQL is not TypeScript-checked, but ensures file exists).

**Step 3: Commit**

```
feat(db): add ai_credit_events migration for earning pathways
```

---

## Task 2: Update `getAICreditBalance` to Include Earned Credits

**Files:**
- Modify: `functions/api/ai/_shared.ts:110-121`

**Step 1: Update the `getAICreditBalance` function**

Replace lines 110–121 with:

```typescript
export async function getAICreditBalance(db: D1Database, wallet: string): Promise<number> {
  const result = await db
    .prepare(
      `SELECT
        COALESCE((SELECT SUM(credits_purchased) FROM ai_credit_purchases WHERE wallet_address = ? AND status = 'confirmed'), 0) +
        COALESCE((SELECT SUM(credits_earned) FROM ai_credit_events WHERE wallet_address = ?), 0) -
        COALESCE((SELECT SUM(credits_spent) FROM ai_credit_usage WHERE wallet_address = ?), 0)
        AS balance`
    )
    .bind(wallet, wallet, wallet)
    .first<{ balance: number }>();
  return result?.balance ?? 0;
}
```

Key change: adds `+ COALESCE((SELECT SUM(credits_earned) FROM ai_credit_events WHERE wallet_address = ?), 0)` and a third bind parameter.

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: Zero errors.

---

## Task 3: Update Balance Endpoint to Return Breakdown

**Files:**
- Modify: `functions/api/ai/balance.ts:17-34`

**Step 1: Add earned credits query and update response**

Replace lines 17–34 (the try block body) with:

```typescript
    const balance = await getAICreditBalance(env.DB, wallet);

    const purchasedResult = await env.DB
      .prepare('SELECT COALESCE(SUM(credits_purchased), 0) as total FROM ai_credit_purchases WHERE wallet_address = ? AND status = ?')
      .bind(wallet, 'confirmed')
      .first<{ total: number }>();

    const earnedResult = await env.DB
      .prepare('SELECT COALESCE(SUM(credits_earned), 0) as total FROM ai_credit_events WHERE wallet_address = ?')
      .bind(wallet)
      .first<{ total: number }>();

    const usedResult = await env.DB
      .prepare('SELECT COALESCE(SUM(credits_spent), 0) as total FROM ai_credit_usage WHERE wallet_address = ?')
      .bind(wallet)
      .first<{ total: number }>();

    return jsonResponse({
      balance,
      creditsPurchased: purchasedResult?.total ?? 0,
      creditsEarned: earnedResult?.total ?? 0,
      creditsUsed: usedResult?.total ?? 0,
    });
```

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: Zero errors.

**Step 3: Commit (Tasks 2+3 together)**

```
feat(ai): include earned credits in balance calculation and endpoint
```

---

## Task 4: Grant AI Credit on Paid Mint Finalization

**Files:**
- Modify: `functions/api/mint/process.ts:663` (after `await env.DB.batch(batchStmts)`)

**Step 1: Add AI credit grant after the atomic batch**

After line 663 (`await env.DB.batch(batchStmts);`), before the `// Get the phase2_mint_id` comment on line 665, insert:

```typescript
  // Grant 1 AI credit for paid mints
  if (job.mint_type === 'paid' && job.mint_number) {
    try {
      await env.DB.prepare(
        `INSERT OR IGNORE INTO ai_credit_events
          (wallet_address, event_id, event_type, credits_earned, source_ref, metadata, event_timestamp)
         VALUES (?, ?, 'mint_reward', 1, ?, ?, datetime('now'))`
      ).bind(
        job.wallet_address,
        `mint_reward_${job.mint_number}`,
        String(job.mint_number),
        JSON.stringify({ mintType: 'paid', priceXch: job.xch_price_mojos ? Number(job.xch_price_mojos) / 1_000_000_000_000 : null })
      ).run();
    } catch (e) {
      // Non-critical — log but don't fail the mint
      console.error('[AI Credit] Failed to grant mint reward:', e);
    }
  }
```

Key points:
- `INSERT OR IGNORE` ensures idempotency if `finalizeJob` retries
- `event_id: mint_reward_{mint_number}` is unique per mint
- Wrapped in try/catch so a failure here never blocks the mint
- Only for `mint_type === 'paid'`

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: Zero errors.

**Step 3: Commit**

```
feat(ai): grant 1 AI credit on paid mint finalization
```

---

## Task 5: Grant AI Credits on Farmer Plot Trades

**Files:**
- Modify: `workers/credit-tracker/worker.ts:362-370` (after the batch credit_events insert)

**Step 1: Add AI credit inserts after the XCH trade batch**

After the existing batch insert loop for `credit_events` (line 362–370), add a parallel AI credit insert. Find the `try` block that starts at line 362:

```typescript
      try {
        await stmt.bind(...bound).run();
        inserted += batch.length;
        for (const r of batch) insertedTimestamps.push(r.timestamp);
      } catch (e) {
        if (String(e).includes('UNIQUE')) {
          for (const r of batch) insertedTimestamps.push(r.timestamp);
          continue;
```

After the closing of this try/catch block (around line 373), add:

```typescript
      // Grant AI credits for Farmer Plot trades (1 per 1.0 XCH)
      for (const r of batch) {
        const aiCredits = Math.floor(r.price_xch);
        if (aiCredits > 0) {
          try {
            await env.DB.prepare(
              `INSERT OR IGNORE INTO ai_credit_events
                (wallet_address, event_id, event_type, credits_earned, source_ref, metadata, event_timestamp)
               VALUES (?, ?, 'farmer_plot_trade', ?, ?, ?, ?)`
            ).bind(
              r.wallet,
              `farmer_plot_${r.event_id}`,
              aiCredits,
              r.nft_id,
              JSON.stringify({ priceXch: r.price_xch, collection: 'farmer_plot' }),
              r.timestamp
            ).run();
          } catch (e) {
            if (!String(e).includes('UNIQUE')) {
              console.error('[CreditTracker] AI credit insert error:', e);
            }
          }
        }
      }
```

Key points:
- `Math.floor(r.price_xch)` — 1 AI credit per 1.0 XCH (a 2.3 XCH sale = 2 AI credits)
- `event_id: farmer_plot_{original_event_id}` — tied to the trade event for dedup
- Same anti-wash-trading protections apply (these trades already passed the checks above)
- `INSERT OR IGNORE` for idempotency

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: Zero errors.

**Step 3: Commit**

```
feat(ai): grant AI credits on Farmer Plot trades in credit-tracker
```

---

## Task 6: Add "Earn Credits" Section to Credits Shop UI

**Files:**
- Modify: `src/components/generator/ai/AICreditsShop.tsx:263-267` (before the disclaimer)
- Modify: `src/styles/theme.css` (add styles for earn section)

**Step 1: Add the earn section to AICreditsShop.tsx**

Before the disclaimer `<p>` tag (line 264), insert:

```tsx
        {/* Earn credits info */}
        <div className="ai-shop-earn-section">
          <div className="ai-shop-earn-divider">
            <span>or earn for free</span>
          </div>
          <div className="ai-shop-earn-methods">
            <div className="ai-shop-earn-method">
              <span className="ai-shop-earn-icon">🎨</span>
              <span className="ai-shop-earn-text">
                Mint a Wojak <span className="text-accent">= +1 credit</span>
              </span>
            </div>
            <div className="ai-shop-earn-method">
              <span className="ai-shop-earn-icon">🌾</span>
              <span className="ai-shop-earn-text">
                Trade Farmer Plots <span className="text-accent">= +1 credit per XCH</span>
              </span>
            </div>
          </div>
        </div>
```

**Step 2: Add CSS styles to theme.css**

In `src/styles/theme.css`, find the AI credits shop section (around line 3740+). Add after the existing `.ai-shop-bundle` styles:

```css
/* Earn credits section */
.ai-shop-earn-section {
  margin-top: 4px;
}

.ai-shop-earn-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.ai-shop-earn-divider::before,
.ai-shop-earn-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

.ai-shop-earn-divider span {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.ai-shop-earn-methods {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ai-shop-earn-method {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.ai-shop-earn-icon {
  font-size: 1.1rem;
  line-height: 1;
}

.ai-shop-earn-text {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}
```

**Step 3: Verify**

Run: `npx tsc --noEmit && npm run build`
Expected: Zero errors, clean build.

**Step 4: Commit**

```
feat(ai): add "earn credits" section to AI credits shop UI
```

---

## Task 7: Show Toast on Paid Mint AI Credit Earned

**Files:**
- Modify: `src/contexts/MintContext.tsx:339-344` (the `completed` step handler)

**Step 1: Import useToast and add toast on paid mint completion**

First, add the import at the top of MintContext.tsx (with other imports):

```typescript
import { useToast } from '@/contexts/ToastContext';
```

Inside the `MintProvider` component, add:

```typescript
const { success: showSuccessToast } = useToast();
```

Then modify the `completed` handler (lines 339–344). Replace:

```typescript
      if (data.step === 'completed') {
        setMintStep('success');
        postAcceptFastUntilRef.current = 0;
        stopPolling();
        refetchCredits();
      }
```

With:

```typescript
      if (data.step === 'completed') {
        setMintStep('success');
        postAcceptFastUntilRef.current = 0;
        stopPolling();
        refetchCredits();
        // Show AI credit earned toast for paid mints
        if (pendingMintParams?.mintType === 'paid') {
          showSuccessToast('✨ +1 AI Credit earned!', {
            title: 'Mint Reward',
            duration: 4000,
          });
        }
      }
```

Note: Check if `ToastOptions` supports `title` and `duration` — the existing toast context uses these fields based on the `ToastOptions` type in `src/types/settings.ts`.

**Step 2: Verify**

Run: `npx tsc --noEmit && npm run build`
Expected: Zero errors.

**Step 3: Commit**

```
feat(ai): show toast notification when paid mint earns AI credit
```

---

## Task 8: Final Build Verification

**Step 1: TypeScript check**

Run: `npx tsc --noEmit`
Expected: Zero errors.

**Step 2: Production build**

Run: `npm run build`
Expected: Clean build with no warnings.

**Step 3: Review all changes**

Run: `git diff --stat HEAD~4` (or however many commits were made)
Expected files changed:
- `functions/migrations/081_ai_credit_events.sql` (new)
- `functions/api/ai/_shared.ts` (balance query update)
- `functions/api/ai/balance.ts` (breakdown response)
- `functions/api/mint/process.ts` (mint reward insert)
- `workers/credit-tracker/worker.ts` (Farmer Plot AI credit insert)
- `src/components/generator/ai/AICreditsShop.tsx` (earn section UI)
- `src/styles/theme.css` (earn section styles)
- `src/contexts/MintContext.tsx` (toast notification)

---

## Commit Summary

| # | Commit Message | Files |
|---|---------------|-------|
| 1 | `feat(db): add ai_credit_events migration` | `081_ai_credit_events.sql` |
| 2 | `feat(ai): include earned credits in balance` | `_shared.ts`, `balance.ts` |
| 3 | `feat(ai): grant 1 AI credit on paid mint` | `process.ts` |
| 4 | `feat(ai): grant AI credits on Farmer Plot trades` | `worker.ts` |
| 5 | `feat(ai): add earn section to shop + mint toast` | `AICreditsShop.tsx`, `theme.css`, `MintContext.tsx` |
