# AI Enhance v2 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the AI Enhance feature by wiring up real XCH payments, metadata integration, combat stats, and preset pruning.

**Architecture:** Four independent workstreams that can be committed separately: (1) credit pricing update, (2) credits purchase flow with SageWallet + Spacescan, (3) AI option labels replacing trait values in CHIP-0007 metadata, (4) AI combat mappings feeding into the identity calculator. Plus a preset catalog prune from 917→569 options.

**Tech Stack:** React + TypeScript, Cloudflare Pages Functions (D1, R2, KV), Chia blockchain (SageWallet `sendXCH`), Spacescan API (coin verification via existing proxy), Framer Motion (animations).

---

## Task 1: Update Backend Credit Pricing

**Files:**
- Modify: `functions/api/ai/_shared.ts:27-40`

**Step 1: Update the `AICreditBundle` interface and `AI_CREDIT_BUNDLES` array**

Replace lines 27–40 with the new 4-tier pricing:

```typescript
export interface AICreditBundle {
  tier: string;
  credits: number;
  priceXch: number;
  mojos: bigint;
}

export const AI_CREDIT_BUNDLES: readonly AICreditBundle[] = [
  { tier: '1',  credits: 1,  priceXch: 0.10, mojos: 100_000_000_000n },
  { tier: '10', credits: 10, priceXch: 0.80, mojos: 800_000_000_000n },
  { tier: '25', credits: 25, priceXch: 1.50, mojos: 1_500_000_000_000n },
  { tier: '50', credits: 50, priceXch: 2.40, mojos: 2_400_000_000_000n },
] as const;
```

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: Zero errors (no other file imports mojos from this source at build time).

---

## Task 2: Update Frontend Credit Pricing

**Files:**
- Modify: `src/types/aiEnhance.ts:61-75`

**Step 1: Update `AI_CREDIT_BUNDLES` array with new 4-tier pricing**

Replace lines 61–75:

```typescript
export interface AICreditBundle {
  tier: string;
  credits: number;
  priceXch: number;
  discount: string;
  badge?: string;
}

export const AI_CREDIT_BUNDLES: AICreditBundle[] = [
  { tier: '1',  credits: 1,  priceXch: 0.10, discount: '' },
  { tier: '10', credits: 10, priceXch: 0.80, discount: '20% off' },
  { tier: '25', credits: 25, priceXch: 1.50, discount: '40% off', badge: 'POPULAR' },
  { tier: '50', credits: 50, priceXch: 2.40, discount: '52% off', badge: 'BEST VALUE' },
];
```

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: Zero errors.

---

## Task 3: Update Credits Shop Constants

**Files:**
- Modify: `src/components/generator/ai/AICreditsShop.tsx:10,16`

**Step 1: Update BASE_PRICE_PER_CREDIT and default selected tier**

Change line 10:
```typescript
const BASE_PRICE_PER_CREDIT = 0.10; // XCH — tier 1 single credit
```

Change line 16:
```typescript
const [selectedTier, setSelectedTier] = useState('25');
```

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: Zero errors.

**Step 3: Commit**

```bash
git add functions/api/ai/_shared.ts src/types/aiEnhance.ts src/components/generator/ai/AICreditsShop.tsx
git commit -m "feat(ai): update credit pricing to 4-tier structure

New pricing: 1/0.10, 10/0.80, 25/1.50, 50/2.40 XCH.
Default selection changed to 25 credits (POPULAR).
Base price per credit updated from 0.08 to 0.10.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Rewrite Buy Endpoint — Unique Mojo Amounts

**Files:**
- Modify: `functions/api/ai/credits/buy.ts` (full rewrite)

**Step 1: Rewrite the buy endpoint**

The new buy endpoint generates a unique mojo amount (base + random 1–9999 offset) for each purchase so payments can be matched on-chain by exact coin amount.

```typescript
// functions/api/ai/credits/buy.ts
import { jsonResponse, errorResponse, optionsResponse, AI_CREDIT_BUNDLES } from '../_shared';
import type { AIEnv } from '../_shared';

const PURCHASE_EXPIRY_MINUTES = 30;
const TREASURY_ADDRESS = 'xch13afmxv0xpyz03t3jfdmcrtv5ecwe5n52977vxd3z2x995f9quunsre5vkd';

export const onRequest: PagesFunction<AIEnv> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);

  let body: { walletAddress?: string; tier?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  const { walletAddress, tier } = body;

  if (!walletAddress || walletAddress.length < 10) {
    return errorResponse('Missing or invalid walletAddress', 400);
  }

  const bundle = AI_CREDIT_BUNDLES.find((b) => b.tier === tier);
  if (!bundle) {
    return errorResponse(
      `Invalid tier. Valid tiers: ${AI_CREDIT_BUNDLES.map((b) => b.tier).join(', ')}`,
      400
    );
  }

  // Expire stale pending purchases for this wallet
  await env.DB
    .prepare(
      `UPDATE ai_credit_purchases SET status = 'expired'
       WHERE wallet_address = ? AND status = 'pending' AND expires_at < datetime('now')`
    )
    .bind(walletAddress)
    .run();

  // Check for existing pending purchase — return it so user can retry payment
  const existing = await env.DB
    .prepare(
      `SELECT id, bundle_tier, xch_paid_mojos, expires_at FROM ai_credit_purchases
       WHERE wallet_address = ? AND status = 'pending' AND expires_at > datetime('now')
       LIMIT 1`
    )
    .bind(walletAddress)
    .first();

  if (existing) {
    return jsonResponse({
      pending: true,
      purchaseId: existing.id,
      tier: existing.bundle_tier,
      amountMojos: String(existing.xch_paid_mojos),
      treasuryAddress: TREASURY_ADDRESS,
      expiresAt: existing.expires_at,
    });
  }

  // Generate unique mojo amount: base + random offset (1–9999)
  // This ensures each payment is uniquely identifiable on-chain
  const baseMojos = Number(bundle.mojos);
  const offset = Math.floor(Math.random() * 9999) + 1;
  const uniqueMojos = baseMojos + offset;

  const expiresAt = new Date(Date.now() + PURCHASE_EXPIRY_MINUTES * 60 * 1000).toISOString();

  const result = await env.DB
    .prepare(
      `INSERT INTO ai_credit_purchases
        (wallet_address, credits_purchased, xch_paid_mojos, bundle_tier, status, expires_at)
       VALUES (?, ?, ?, ?, 'pending', ?)`
    )
    .bind(walletAddress, bundle.credits, uniqueMojos, bundle.tier, expiresAt)
    .run();

  return jsonResponse({
    purchaseId: result.meta?.last_row_id,
    amountMojos: String(uniqueMojos),
    treasuryAddress: TREASURY_ADDRESS,
    tier: bundle.tier,
    credits: bundle.credits,
    priceXch: bundle.priceXch,
    expiresAt,
  }, 201);
};
```

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: Zero errors.

---

## Task 5: Rewrite Confirm Endpoint — Spacescan Verification

**Files:**
- Modify: `functions/api/ai/credits/confirm.ts` (full rewrite)

**Step 1: Rewrite the confirm endpoint**

The new confirm endpoint polls Spacescan for a matching coin on the treasury address by exact mojo amount. Uses the existing proxy at `/api/spacescan/`.

```typescript
// functions/api/ai/credits/confirm.ts
import { jsonResponse, errorResponse, optionsResponse, getAICreditBalance } from '../_shared';
import type { AIEnv } from '../_shared';

const TREASURY_PUZZLE_HASH = '8f53b331e60904f8ae324b7781ad94ce1d9a4e8a2fbcc33622518a5a24a0e727';
const MAX_POLL_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 6000; // 6 seconds between polls

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface SpacescanCoin {
  amount: number;
  timestamp: number;
  confirmed_block_index?: number;
}

/**
 * Check Spacescan for a coin matching the exact mojo amount on the treasury address.
 * Uses the existing proxy at /api/spacescan/ with 5-min edge caching.
 */
async function findMatchingCoin(
  expectedMojos: number,
  purchaseCreatedAt: string,
  baseUrl: string
): Promise<boolean> {
  try {
    const url = `${baseUrl}/api/spacescan/coin/address/${TREASURY_PUZZLE_HASH}`;
    const res = await fetch(url);
    if (!res.ok) return false;

    const data = await res.json() as { coins?: SpacescanCoin[] };
    if (!Array.isArray(data.coins)) return false;

    const purchaseTime = new Date(purchaseCreatedAt).getTime() / 1000;

    // Find a coin with exact mojo amount created after the purchase was initiated
    return data.coins.some(
      (coin) => coin.amount === expectedMojos && coin.timestamp >= purchaseTime - 60
    );
  } catch {
    return false;
  }
}

export const onRequest: PagesFunction<AIEnv> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);

  let body: { purchaseId?: number; walletAddress?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  const { purchaseId, walletAddress } = body;

  if (!purchaseId || !walletAddress) {
    return errorResponse('Missing purchaseId or walletAddress', 400);
  }

  const row = await env.DB
    .prepare(
      `SELECT id, wallet_address, credits_purchased, xch_paid_mojos, status, created_at, expires_at
       FROM ai_credit_purchases WHERE id = ? AND wallet_address = ?`
    )
    .bind(purchaseId, walletAddress)
    .first<{
      id: number;
      wallet_address: string;
      credits_purchased: number;
      xch_paid_mojos: number;
      status: string;
      created_at: string;
      expires_at: string;
    }>();

  if (!row) {
    return errorResponse('Purchase not found', 404);
  }
  if (row.status === 'confirmed') {
    const balance = await getAICreditBalance(env.DB, walletAddress);
    return jsonResponse({ alreadyConfirmed: true, creditsAdded: row.credits_purchased, balance });
  }
  if (row.status !== 'pending') {
    return errorResponse(`Purchase is ${row.status}`, 400);
  }

  // Check if purchase has expired
  if (new Date(row.expires_at) < new Date()) {
    await env.DB
      .prepare(`UPDATE ai_credit_purchases SET status = 'expired' WHERE id = ?`)
      .bind(purchaseId)
      .run();
    return errorResponse('Purchase expired. Please start a new purchase.', 410);
  }

  // Poll Spacescan for matching coin
  const baseUrl = new URL(request.url).origin;
  let found = false;

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    found = await findMatchingCoin(row.xch_paid_mojos, row.created_at, baseUrl);
    if (found) break;
    if (attempt < MAX_POLL_ATTEMPTS - 1) {
      await sleep(POLL_INTERVAL_MS);
    }
  }

  if (!found) {
    return jsonResponse({
      confirmed: false,
      message: 'Payment not yet detected on-chain. Try again in a minute.',
      purchaseId: row.id,
    }, 202);
  }

  // Payment confirmed — update status and credit the account
  await env.DB
    .prepare(
      `UPDATE ai_credit_purchases SET status = 'confirmed', confirmed_at = datetime('now')
       WHERE id = ?`
    )
    .bind(purchaseId)
    .run();

  const balance = await getAICreditBalance(env.DB, walletAddress);

  return jsonResponse({
    confirmed: true,
    creditsAdded: row.credits_purchased,
    balance,
  });
};
```

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: Zero errors.

**Step 3: Commit**

```bash
git add functions/api/ai/credits/buy.ts functions/api/ai/credits/confirm.ts
git commit -m "feat(ai): implement real payment backend with unique mojo amounts

buy.ts: Generates unique mojo amount (base + random 1-9999 offset)
for each purchase. Returns amountMojos + treasuryAddress for
frontend to call sendXCH.

confirm.ts: Polls Spacescan for matching coin on treasury address
by exact mojo amount. Up to 10 attempts with 6s intervals.
Handles expiry, already-confirmed, and not-yet-detected states.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Rewrite Credits Shop — SageWallet Integration

**Files:**
- Modify: `src/components/generator/ai/AICreditsShop.tsx` (full rewrite)

**Context to read first:**
- `src/sage-wallet/sage-wallet-types.ts` — `sendXCH(address, amount, fee)` signature
- `src/sage-wallet/SageWalletProvider.tsx` — `useSageWallet()` hook

**Step 1: Rewrite the shop component**

Replace the entire component. Key changes:
- Import `useSageWallet` for `sendXCH()` and `isConnected`/`address`
- Multi-state UI: `idle` → `sending` → `confirming` → `success`/`error`
- Call POST `/api/ai/credits/buy` to get unique mojo amount + treasury address
- Call `sendXCH(treasuryAddress, amountMojos)` via SageWallet
- Poll POST `/api/ai/credits/confirm` with purchaseId
- Show "Connect wallet" prompt if wallet not connected

```typescript
// src/components/generator/ai/AICreditsShop.tsx

import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Lightbox } from '@/components/ui/Lightbox';
import { useAIEnhance } from '@/contexts/AIEnhanceContext';
import { useSageWallet } from '@/sage-wallet';
import { AI_CREDIT_BUNDLES } from '@/types/aiEnhance';
import { Sparkles } from 'lucide-react';

const BASE_PRICE_PER_CREDIT = 0.10;
const loadConfetti = () => import('canvas-confetti').then(m => m.default);

type PurchaseState = 'idle' | 'buying' | 'sending' | 'confirming' | 'success' | 'error';

export function AICreditsShop() {
  const { isShopOpen, closeShop, balance, refetchBalance } = useAIEnhance();
  const { address, isConnected, sendXCH } = useSageWallet();
  const prefersReducedMotion = useReducedMotion();
  const [selectedTier, setSelectedTier] = useState('25');
  const [purchaseState, setPurchaseState] = useState<PurchaseState>('idle');
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const selectedBundle = AI_CREDIT_BUNDLES.find((b) => b.tier === selectedTier);

  // Reset state when shop opens/closes
  useEffect(() => {
    if (!isShopOpen) {
      setPurchaseState('idle');
      setPurchaseError(null);
      setPurchaseSuccess(null);
      setStatusMessage(null);
    }
  }, [isShopOpen]);

  // Confetti burst on successful purchase
  useEffect(() => {
    if (purchaseSuccess && !prefersReducedMotion) {
      loadConfetti().then(confetti => {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.5 },
          colors: ['#F97316', '#FFD700', '#FF6B00', '#EA580C'],
        });
      });
    }
  }, [purchaseSuccess, prefersReducedMotion]);

  const handlePurchase = async () => {
    if (!selectedBundle || purchaseState !== 'idle' || !address) return;

    setPurchaseError(null);
    setPurchaseSuccess(null);

    try {
      // Step 1: Get unique mojo amount from backend
      setPurchaseState('buying');
      setStatusMessage('Preparing purchase...');

      const buyRes = await fetch('/api/ai/credits/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, tier: selectedBundle.tier }),
      });

      const buyData = await buyRes.json();

      if (!buyRes.ok) {
        throw new Error(buyData.error || 'Failed to create purchase.');
      }

      // If already confirmed (race), just refetch
      if (buyData.alreadyConfirmed) {
        setPurchaseSuccess('Credits already added!');
        setPurchaseState('success');
        await refetchBalance();
        return;
      }

      const purchaseId = buyData.purchaseId ?? buyData.id;
      const amountMojos = Number(buyData.amountMojos);
      const treasuryAddress = buyData.treasuryAddress;

      if (!purchaseId || !amountMojos || !treasuryAddress) {
        throw new Error('Invalid purchase response from server.');
      }

      // Step 2: Send XCH via SageWallet
      setPurchaseState('sending');
      setStatusMessage('Confirm in your Sage wallet...');

      // sendXCH expects amount in XCH (not mojos)
      const amountXch = amountMojos / 1_000_000_000_000;
      await sendXCH(treasuryAddress, amountXch);

      // Step 3: Confirm payment on-chain via Spacescan
      setPurchaseState('confirming');
      setStatusMessage('Verifying payment on-chain...');

      const confirmRes = await fetch('/api/ai/credits/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId, walletAddress: address }),
      });

      const confirmData = await confirmRes.json();

      if (confirmData.confirmed || confirmData.alreadyConfirmed) {
        setPurchaseSuccess(`Added ${confirmData.creditsAdded} credits!`);
        setPurchaseState('success');
        await refetchBalance();
      } else {
        // Not yet detected — let user know to retry
        setPurchaseError(
          confirmData.message || 'Payment sent but not yet confirmed. Try again in a minute.'
        );
        setPurchaseState('idle');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Purchase failed.';
      // User rejected wallet transaction
      if (message.toLowerCase().includes('rejected') || message.toLowerCase().includes('denied')) {
        setPurchaseError('Transaction cancelled.');
      } else {
        setPurchaseError(message);
      }
      setPurchaseState('idle');
    } finally {
      setStatusMessage(null);
    }
  };

  const isPurchasing = purchaseState !== 'idle' && purchaseState !== 'success' && purchaseState !== 'error';

  return (
    <Lightbox
      isOpen={isShopOpen}
      onClose={closeShop}
      title="AI Credits"
      size="md"
    >
      <div className="flex flex-col gap-4">
        {/* Hero balance + info */}
        <div className="ai-shop-balance">
          <div className="ai-shop-balance-icon">
            <Sparkles size={18} />
          </div>
          <span className="ai-shop-balance-count">{balance}</span>
          <span className="ai-shop-balance-label">
            credit{balance !== 1 ? 's' : ''} remaining
          </span>
          <span className="ai-shop-info-pill">
            1 credit = 1 enhancement
          </span>
        </div>

        {/* Wallet connection check */}
        {!isConnected && (
          <p className="text-sm text-center text-warning">
            Connect your wallet to purchase credits.
          </p>
        )}

        {/* Bundle list */}
        <div className="flex flex-col gap-2">
          {AI_CREDIT_BUNDLES.map((bundle) => {
            const isSelected = selectedTier === bundle.tier;
            const perCredit = bundle.priceXch / bundle.credits;
            const savings =
              bundle.credits > 1
                ? (BASE_PRICE_PER_CREDIT * bundle.credits - bundle.priceXch)
                : 0;

            return (
              <motion.button
                type="button"
                key={bundle.tier}
                className={`ai-shop-bundle ${isSelected ? 'ai-shop-bundle--selected' : ''}`}
                onClick={() => setSelectedTier(bundle.tier)}
                disabled={isPurchasing}
                whileHover={prefersReducedMotion ? {} : { scale: 1.01 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.99 }}
              >
                {/* Left: credits number + label + badge inline */}
                <div className="ai-shop-bundle-left">
                  <span className="ai-shop-bundle-credits">
                    {bundle.credits}
                  </span>
                  <span className="ai-shop-bundle-label">
                    credit{bundle.credits !== 1 ? 's' : ''}
                  </span>
                  {bundle.badge && (
                    <span
                      className={`ai-bundle-badge ${
                        bundle.badge === 'POPULAR'
                          ? 'ai-bundle-badge--popular'
                          : 'ai-bundle-badge--value'
                      }`}
                    >
                      {bundle.badge}
                    </span>
                  )}
                </div>

                {/* Right: price top, details bottom */}
                <div className="ai-shop-bundle-right">
                  <span className="ai-shop-bundle-price">
                    {bundle.priceXch} XCH
                  </span>
                  <span className="ai-shop-bundle-details">
                    {perCredit.toFixed(3)}/credit
                    {bundle.discount && (
                      <> &middot; <span className="ai-shop-bundle-discount">{bundle.discount}</span></>
                    )}
                    {savings > 0 && (
                      <> &middot; <span className="ai-shop-bundle-savings">save {savings.toFixed(2)}</span></>
                    )}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Status message (during purchase flow) */}
        {statusMessage && (
          <p className="text-sm text-center text-accent">
            {statusMessage}
          </p>
        )}

        {/* Error / Success */}
        {purchaseError && (
          <p className="text-sm text-center text-error">
            {purchaseError}
          </p>
        )}
        {purchaseSuccess && (
          <p className="text-sm text-center text-success">
            {purchaseSuccess}
          </p>
        )}

        {/* Buy button */}
        <motion.button
          type="button"
          className="btn btn-primary w-full"
          onClick={purchaseState === 'success' ? closeShop : handlePurchase}
          disabled={isPurchasing || !isConnected || !selectedBundle}
          whileHover={!isPurchasing && !prefersReducedMotion ? { scale: 1.02 } : {}}
          whileTap={!isPurchasing && !prefersReducedMotion ? { scale: 0.98 } : {}}
        >
          {purchaseState === 'buying' && 'Preparing...'}
          {purchaseState === 'sending' && 'Waiting for wallet...'}
          {purchaseState === 'confirming' && 'Verifying on-chain...'}
          {purchaseState === 'success' && 'Done!'}
          {(purchaseState === 'idle' || purchaseState === 'error') &&
            `Buy ${selectedBundle?.credits ?? 0} credits \u2014 ${selectedBundle?.priceXch ?? 0} XCH`}
        </motion.button>

        {/* Disclaimer */}
        <p className="text-muted text-xs text-center" style={{ opacity: 0.6 }}>
          Credits are non-refundable. Powered by Reve AI.
        </p>
      </div>
    </Lightbox>
  );
}
```

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: Zero errors. Confirm `sendXCH` is exported from the `useSageWallet()` hook. If the return type doesn't match, check `sage-wallet-types.ts` and adjust the destructuring.

**Step 3: Commit**

```bash
git add src/components/generator/ai/AICreditsShop.tsx
git commit -m "feat(ai): wire real XCH payments in credits shop

Replace stub with full SageWallet integration:
- POST /api/ai/credits/buy → get unique mojo amount
- sendXCH() via SageWallet → user approves in wallet
- POST /api/ai/credits/confirm → Spacescan verification
Multi-state UI: idle → buying → sending → confirming → success.
Shows wallet connection prompt when disconnected.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Track Accepted AI Option Labels in Context

**Files:**
- Modify: `src/contexts/AIEnhanceContext.tsx`

**Context to read first:**
- `src/types/aiEnhance.ts` — `AICategory`, `AIPresetOption` types

**Step 1: Add `acceptedOptions` state to the context**

This tracks which AI preset option label was accepted for each category. Needed for metadata integration and combat stats.

In the context interface (`AIEnhanceContextValue`), add after line 48 (`acceptResult`):
```typescript
  /** Map of category → accepted option label (for metadata + combat) */
  acceptedOptions: Partial<Record<AICategory, AIPresetOption>>;
```

In the provider, add state after line 94 (`enhancedCategories`):
```typescript
  const [acceptedOptions, setAcceptedOptions] = useState<Partial<Record<AICategory, AIPresetOption>>>({});
```

Update `acceptResult` callback (around line 227) to also store the selected option:
```typescript
  const acceptResult = useCallback(() => {
    if (!currentResult || !selectedOption) return;
    const imageData = `data:image/png;base64,${currentResult.imageBase64}`;
    setEnhancedImage(imageData);
    setEnhancedCategories((prev) => new Set([...prev, currentResult.category]));
    setAcceptedOptions((prev) => ({ ...prev, [currentResult.category]: selectedOption }));
  }, [currentResult, selectedOption]);
```

Update `resetToLayers` callback (around line 235) to also clear accepted options:
```typescript
  const resetToLayers = useCallback(() => {
    setEnhancedImage(null);
    setEnhancedCategories(new Set());
    setAcceptedOptions({});
  }, []);
```

Add `acceptedOptions` to the value object and the dependency array.

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: Zero errors.

---

## Task 8: Wire AI Data Through Mint Submission

**Files:**
- Modify: `src/contexts/MintContext.tsx`
- Modify: `src/components/generator/ActionBar.tsx`

**Step 1: Extend PendingMintParams and prepareMint to include AI data**

In `MintContext.tsx`, update the `pendingMintParams` state type (around line 176):
```typescript
  const [pendingMintParams, setPendingMintParams] = useState<{
    imageBlob: Blob;
    selectedLayers: Record<string, string>;
    selectedColors: Record<string, string>;
    mintType: 'free' | 'paid';
    aiEnhanced?: boolean;
    aiAttributes?: Array<{ category: string; label: string }>;
  } | null>(null);
```

Update `prepareMint` signature in the interface (around line 116) and implementation (around line 593):
```typescript
  prepareMint: (
    imageBlob: Blob,
    selectedLayers: Record<string, string>,
    selectedColors: Record<string, string>,
    mintType: 'free' | 'paid',
    aiData?: { aiEnhanced: boolean; aiAttributes: Array<{ category: string; label: string }> }
  ) => void;
```

Implementation:
```typescript
  const prepareMint = useCallback(
    (
      imageBlob: Blob,
      selectedLayers: Record<string, string>,
      selectedColors: Record<string, string>,
      mintType: 'free' | 'paid',
      aiData?: { aiEnhanced: boolean; aiAttributes: Array<{ category: string; label: string }> }
    ) => {
      setPendingMintParams({
        imageBlob, selectedLayers, selectedColors, mintType,
        aiEnhanced: aiData?.aiEnhanced,
        aiAttributes: aiData?.aiAttributes,
      });
      setIdempotencyKey(crypto.randomUUID());
      setMintStep('confirming');
      setErrorMessage(null);
    },
    []
  );
```

Update `confirmMint` to include AI data in the POST body (around line 629):
```typescript
      const res = await fetch('/api/mint/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          selectedLayers: params.selectedLayers,
          selectedColors: params.selectedColors,
          imageBase64,
          mintType: params.mintType,
          idempotencyKey: key,
          customName: customName.trim() || undefined,
          aiEnhanced: params.aiEnhanced || undefined,
          aiAttributes: params.aiAttributes || undefined,
        }),
      });
```

**Step 2: Update ActionBar to pass AI enhancement data**

In `ActionBar.tsx`, the `handleMintClick` callback (around line 230) needs to pass AI data:

```typescript
      // Build AI attributes from accepted options
      const aiData = isAIEnhancedMode && enhancedCategories.size > 0
        ? {
            aiEnhanced: true,
            aiAttributes: Object.entries(acceptedOptions)
              .filter(([, opt]) => opt != null)
              .map(([category, opt]) => ({ category, label: opt!.label })),
          }
        : undefined;

      setIsMintModalOpen(true);
      prepareMint(imageBlob, layersForApi, colorsForApi, effectiveMintType, aiData);
```

This requires importing `acceptedOptions` from `useAIEnhance()` in ActionBar. Locate the existing `useAIEnhance()` destructuring and add `acceptedOptions`.

**Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: Zero errors. The `aiAttributes` shape has changed from `{ category, prompt }` to `{ category, label }` — the backend will be updated in the next task.

---

## Task 9: Update Backend Metadata — Replace Trait Values

**Files:**
- Modify: `functions/api/mint/submit.ts:54-67` — update interface to accept `label`
- Modify: `functions/api/mint/process.ts:225-246` — replace trait values with AI labels

**Context to read first:**
- `functions/api/mint/traitResolver.ts` — `LAYER_TO_TRAIT_TYPE` mapping
- `functions/api/mint/process.ts:183-246` — current attribute assembly

**Step 1: Update the SubmitBody interface in submit.ts**

Change the `aiAttributes` type (line 66):
```typescript
  /** AI edit details: [{ category: 'clothes', label: 'Tiger Stripes' }, ...] */
  aiAttributes?: Array<{ category: string; label: string }>;
```

Update the serialization (line 362):
```typescript
      const aiMetadataJson = aiEnhanced ? JSON.stringify({ aiEnhanced, aiAttributes }) : null;
```

No other changes needed in submit.ts — it just passes through to the job row.

**Step 2: Update process.ts to replace trait values**

In `process.ts`, replace the AI Enhancement attributes section (lines 225-246) with logic that:
1. Replaces the original trait value in the attributes array
2. Still adds `AI Enhanced: Yes` and `AI Edits Count`

```typescript
      // ── AI Enhancement metadata (replaces trait values) ──
      if (job.ai_metadata_json) {
        try {
          const aiMeta = JSON.parse(job.ai_metadata_json) as {
            aiEnhanced?: boolean;
            aiAttributes?: Array<{ category: string; label?: string; prompt?: string }>;
          };
          if (aiMeta.aiEnhanced && Array.isArray(aiMeta.aiAttributes) && aiMeta.aiAttributes.length > 0) {
            // Category → trait_type mapping (matches LAYER_TO_TRAIT_TYPE)
            const categoryToTraitType: Record<string, string> = {
              clothes: 'Clothes',
              head: 'Head',
              background: 'Background',
              facewear: 'Face Wear',
            };

            // Replace trait values for AI-enhanced categories
            for (const attr of aiMeta.aiAttributes) {
              if (!attr.category) continue;
              const traitType = categoryToTraitType[attr.category];
              const displayValue = attr.label || attr.prompt; // prefer label, fallback to prompt for legacy
              if (!traitType || !displayValue) continue;

              const existing = attributes.find((a) => a.trait_type === traitType);
              if (existing) {
                existing.value = displayValue;
              } else {
                attributes.push({ trait_type: traitType, value: displayValue });
              }
            }

            // Add AI metadata attributes (after the main trait attributes)
            attributes.push({ trait_type: 'AI Enhanced', value: 'Yes' });
            attributes.push({ trait_type: 'AI Edits Count', value: String(aiMeta.aiAttributes.length) });
          }
        } catch {
          console.warn(`[MintProcessor] Job ${jobId} has invalid ai_metadata_json, skipping AI attributes`);
        }
      }
```

**Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: Zero errors.

**Step 4: Commit**

```bash
git add src/contexts/AIEnhanceContext.tsx src/contexts/MintContext.tsx src/components/generator/ActionBar.tsx functions/api/mint/submit.ts functions/api/mint/process.ts
git commit -m "feat(ai): wire AI metadata into mint flow

- Track accepted option labels per category in AIEnhanceContext
- Pass aiEnhanced + aiAttributes through MintContext to submit API
- AI option labels now REPLACE original trait values in CHIP-0007
  metadata (e.g., Clothes: 'Tiger Stripes' instead of original layer)
- Both enhance and create_new modes produce the same metadata shape
- Non-AI mints completely unchanged

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 10: Create AI Combat Mapping Data File

**Files:**
- Create: `src/lib/combat/data/ai-combat-map.ts`

**Context to read first:**
- `src/lib/combat/types.ts` — `CombatType`, `StatName` types
- `src/lib/combat/data/trait-type-map.ts` — reference for mapping structure
- `docs/plans/2026-03-08-ai-enhance-v2-design.md` — Section 5 for family→type assignments

**Step 1: Create the AI combat mapping file**

This file defines combat type/nature contributions for every AI preset family, with per-option overrides for the 8 diverse families.

```typescript
// src/lib/combat/data/ai-combat-map.ts
//
// Combat mappings for AI enhancement presets.
// Family-level defaults for uniform families (43),
// per-option overrides for diverse families (8).

import type { CombatType, StatName } from '../types';

export interface AICombatMapping {
  primaryType: CombatType;
  primaryPts: number;
  secondaryType: CombatType;
  secondaryPts: number;
  natureStat: StatName;
  natureStatPts: number;
}

// ---------- Family Defaults ----------
// Key: family label (matches AIStyleFamily.label from aiEnhancePresets.ts)

const FAMILY_DEFAULTS: Record<string, AICombatMapping> = {
  // ── UNIVERSAL ENHANCE ──
  'Animal Prints':       { primaryType: 'VENOM',    primaryPts: 5, secondaryType: 'INSECT',   secondaryPts: 2, natureStat: 'speed',   natureStatPts: 2 },
  'Elemental':           { primaryType: 'FIRE',     primaryPts: 5, secondaryType: 'WATER',    secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },  // overrides below
  'Precious Metals':     { primaryType: 'METAL',    primaryPts: 6, secondaryType: 'STONE',    secondaryPts: 2, natureStat: 'defense',  natureStatPts: 2 },
  'Energy & Power':      { primaryType: 'ELECTRIC', primaryPts: 5, secondaryType: 'COSMIC',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },  // overrides below
  'Camouflage':          { primaryType: 'GRASS',    primaryPts: 5, secondaryType: 'EARTH',    secondaryPts: 2, natureStat: 'defense',  natureStatPts: 2 },
  'Magical':             { primaryType: 'MYSTIC',   primaryPts: 5, secondaryType: 'PSYCHE',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },  // overrides below
  'Material Swap':       { primaryType: 'ICE',      primaryPts: 5, secondaryType: 'STONE',    secondaryPts: 2, natureStat: 'defense',  natureStatPts: 2 },  // overrides below

  // ── CLOTHES ENHANCE ──
  'Distressed & Worn':   { primaryType: 'EARTH',    primaryPts: 5, secondaryType: 'GHOST',    secondaryPts: 2, natureStat: 'defense',  natureStatPts: 2 },
  'Luxury Upgrade':      { primaryType: 'LIGHT',    primaryPts: 5, secondaryType: 'METAL',    secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Tech Mods':           { primaryType: 'ELECTRIC', primaryPts: 5, secondaryType: 'METAL',    secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Seasonal':            { primaryType: 'GRASS',    primaryPts: 5, secondaryType: 'ICE',      secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Cultural Motifs':     { primaryType: 'PSYCHE',   primaryPts: 5, secondaryType: 'MYSTIC',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Battle Damage':       { primaryType: 'MARTIAL',  primaryPts: 5, secondaryType: 'FIRE',     secondaryPts: 2, natureStat: 'attack',  natureStatPts: 2 },

  // ── HEAD ENHANCE ──
  'Crown & Royalty':     { primaryType: 'LIGHT',    primaryPts: 6, secondaryType: 'DRAGON',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Military Mods':       { primaryType: 'MARTIAL',  primaryPts: 5, secondaryType: 'METAL',    secondaryPts: 2, natureStat: 'attack',  natureStatPts: 2 },
  'Weather Effects':     { primaryType: 'ICE',      primaryPts: 5, secondaryType: 'AIR',      secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },

  // ── CLOTHES CREATE ──
  'Streetwear':          { primaryType: 'DARK',     primaryPts: 5, secondaryType: 'FIRE',     secondaryPts: 2, natureStat: 'speed',   natureStatPts: 2 },
  'Historical Armor':    { primaryType: 'METAL',    primaryPts: 6, secondaryType: 'MARTIAL',  secondaryPts: 2, natureStat: 'defense',  natureStatPts: 2 },
  'Fantasy & Magical':   { primaryType: 'MYSTIC',   primaryPts: 5, secondaryType: 'GHOST',    secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },  // overrides below
  'Sci-Fi & Futuristic': { primaryType: 'ELECTRIC', primaryPts: 5, secondaryType: 'COSMIC',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Athletic & Sport':    { primaryType: 'FIRE',     primaryPts: 5, secondaryType: 'MARTIAL',  secondaryPts: 2, natureStat: 'speed',   natureStatPts: 2 },
  'Formal & Elegant':    { primaryType: 'LIGHT',    primaryPts: 5, secondaryType: 'PSYCHE',   secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Cultural & Traditional': { primaryType: 'EARTH', primaryPts: 5, secondaryType: 'MYSTIC',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Horror & Dark':       { primaryType: 'DARK',     primaryPts: 6, secondaryType: 'GHOST',    secondaryPts: 2, natureStat: 'attack',  natureStatPts: 2 },
  'Food & Fun':          { primaryType: 'GRASS',    primaryPts: 5, secondaryType: 'NEUTRAL',  secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Occupational':        { primaryType: 'METAL',    primaryPts: 5, secondaryType: 'FIRE',     secondaryPts: 2, natureStat: 'defense',  natureStatPts: 2 },

  // ── HEAD CREATE ──
  'Crowns & Royalty':    { primaryType: 'LIGHT',    primaryPts: 6, secondaryType: 'DRAGON',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Military & Tactical': { primaryType: 'MARTIAL',  primaryPts: 5, secondaryType: 'METAL',    secondaryPts: 2, natureStat: 'attack',  natureStatPts: 2 },
  'Fantasy & Creature':  { primaryType: 'DRAGON',   primaryPts: 5, secondaryType: 'MYSTIC',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },  // overrides below
  'Sci-Fi & Tech':       { primaryType: 'ELECTRIC', primaryPts: 5, secondaryType: 'COSMIC',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Sport & Athletic':    { primaryType: 'FIRE',     primaryPts: 5, secondaryType: 'AIR',      secondaryPts: 2, natureStat: 'speed',   natureStatPts: 2 },
  'Hats & Classic':      { primaryType: 'AIR',      primaryPts: 5, secondaryType: 'NEUTRAL',  secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Food & Novelty':      { primaryType: 'GRASS',    primaryPts: 5, secondaryType: 'NEUTRAL',  secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Horror & Dark':       { primaryType: 'GHOST',    primaryPts: 6, secondaryType: 'DARK',     secondaryPts: 2, natureStat: 'attack',  natureStatPts: 2 },
  'Cultural & Festival': { primaryType: 'PSYCHE',   primaryPts: 5, secondaryType: 'MYSTIC',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Nature & Animal':     { primaryType: 'GRASS',    primaryPts: 5, secondaryType: 'VENOM',    secondaryPts: 2, natureStat: 'speed',   natureStatPts: 2 },

  // ── BACKGROUND CREATE ──
  'Urban & City':        { primaryType: 'DARK',     primaryPts: 5, secondaryType: 'METAL',    secondaryPts: 2, natureStat: 'speed',   natureStatPts: 2 },
  'Nature & Wild':       { primaryType: 'WATER',    primaryPts: 5, secondaryType: 'GRASS',    secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },  // overrides below
  'Cosmic & Space':      { primaryType: 'COSMIC',   primaryPts: 6, secondaryType: 'PSYCHE',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Fantasy & Magical':   { primaryType: 'MYSTIC',   primaryPts: 5, secondaryType: 'DRAGON',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Indoor Scenes':       { primaryType: 'DARK',     primaryPts: 5, secondaryType: 'PSYCHE',   secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Historical & Ancient':{ primaryType: 'STONE',    primaryPts: 6, secondaryType: 'EARTH',    secondaryPts: 2, natureStat: 'defense',  natureStatPts: 2 },
  'Apocalyptic':         { primaryType: 'FIRE',     primaryPts: 5, secondaryType: 'GHOST',    secondaryPts: 2, natureStat: 'attack',  natureStatPts: 2 },
  'Action & Extreme':    { primaryType: 'FIRE',     primaryPts: 5, secondaryType: 'AIR',      secondaryPts: 2, natureStat: 'speed',   natureStatPts: 2 },  // overrides below
  'Serene & Peaceful':   { primaryType: 'WATER',    primaryPts: 5, secondaryType: 'GRASS',    secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
};

// Note: Some family labels appear in multiple sections (e.g., 'Fantasy & Magical' for both
// clothes_create and background_create). When the same family label exists in multiple
// categories, the family default applies to all. This is intentional — the categories
// are disambiguated by the AICategory context in lookupAICombat().
// If label collisions cause issues, prefix with section: 'BG: Fantasy & Magical'.

// ---------- Per-Option Overrides ----------
// Key: option label (matches AIPresetOption.label from aiEnhancePresets.ts)

const OPTION_OVERRIDES: Record<string, AICombatMapping> = {
  // ── Elemental (12 options — each element gets its own type) ──
  'Flame pattern':       { primaryType: 'FIRE',     primaryPts: 6, secondaryType: 'EARTH',    secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Ice frost':           { primaryType: 'ICE',      primaryPts: 6, secondaryType: 'WATER',    secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Lightning bolts':     { primaryType: 'ELECTRIC', primaryPts: 6, secondaryType: 'AIR',      secondaryPts: 2, natureStat: 'speed',   natureStatPts: 2 },
  'Lava cracks':         { primaryType: 'FIRE',     primaryPts: 5, secondaryType: 'STONE',    secondaryPts: 3, natureStat: 'attack',  natureStatPts: 2 },
  'Sandstorm grit':      { primaryType: 'EARTH',    primaryPts: 6, secondaryType: 'AIR',      secondaryPts: 2, natureStat: 'defense',  natureStatPts: 2 },
  'Tidal wave splash':   { primaryType: 'WATER',    primaryPts: 6, secondaryType: 'ICE',      secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Tornado debris':      { primaryType: 'AIR',      primaryPts: 6, secondaryType: 'EARTH',    secondaryPts: 2, natureStat: 'speed',   natureStatPts: 2 },
  'Acid rain drips':     { primaryType: 'VENOM',    primaryPts: 6, secondaryType: 'WATER',    secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Arctic blizzard':     { primaryType: 'ICE',      primaryPts: 6, secondaryType: 'AIR',      secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Earthquake cracks':   { primaryType: 'STONE',    primaryPts: 6, secondaryType: 'EARTH',    secondaryPts: 2, natureStat: 'defense',  natureStatPts: 2 },
  'Solar flare scorch':  { primaryType: 'FIRE',     primaryPts: 5, secondaryType: 'COSMIC',   secondaryPts: 3, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Swamp murk':          { primaryType: 'GRASS',    primaryPts: 5, secondaryType: 'VENOM',    secondaryPts: 3, natureStat: 'sp_def',  natureStatPts: 2 },

  // ── Energy & Power (11 options) ──
  'Plasma core':         { primaryType: 'ELECTRIC', primaryPts: 6, secondaryType: 'FIRE',     secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Cosmic energy':       { primaryType: 'COSMIC',   primaryPts: 6, secondaryType: 'PSYCHE',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Solar powered':       { primaryType: 'LIGHT',    primaryPts: 6, secondaryType: 'FIRE',     secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Shadow aura':         { primaryType: 'DARK',     primaryPts: 6, secondaryType: 'GHOST',    secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Spirit flame':        { primaryType: 'MYSTIC',   primaryPts: 5, secondaryType: 'FIRE',     secondaryPts: 3, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Quantum flux':        { primaryType: 'COSMIC',   primaryPts: 5, secondaryType: 'ELECTRIC', secondaryPts: 3, natureStat: 'speed',   natureStatPts: 2 },
  'Void energy':         { primaryType: 'DARK',     primaryPts: 5, secondaryType: 'COSMIC',   secondaryPts: 3, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Thunder charged':     { primaryType: 'ELECTRIC', primaryPts: 6, secondaryType: 'AIR',      secondaryPts: 2, natureStat: 'speed',   natureStatPts: 2 },

  // ── Magical (11 options) ──
  'Enchanted glow':      { primaryType: 'MYSTIC',   primaryPts: 6, secondaryType: 'LIGHT',    secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Cursed markings':     { primaryType: 'DARK',     primaryPts: 6, secondaryType: 'GHOST',    secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Fire enchant':        { primaryType: 'FIRE',     primaryPts: 6, secondaryType: 'MYSTIC',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Frost enchant':       { primaryType: 'ICE',      primaryPts: 6, secondaryType: 'MYSTIC',   secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Nature vines':        { primaryType: 'GRASS',    primaryPts: 6, secondaryType: 'MYSTIC',   secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Spirit wisps':        { primaryType: 'GHOST',    primaryPts: 6, secondaryType: 'MYSTIC',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Arcane circuits':     { primaryType: 'PSYCHE',   primaryPts: 5, secondaryType: 'ELECTRIC', secondaryPts: 3, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Blood magic':         { primaryType: 'DARK',     primaryPts: 5, secondaryType: 'VENOM',    secondaryPts: 3, natureStat: 'attack',  natureStatPts: 2 },

  // ── Material Swap (11 options) ──
  'Stone carved':        { primaryType: 'STONE',    primaryPts: 6, secondaryType: 'EARTH',    secondaryPts: 2, natureStat: 'defense',  natureStatPts: 2 },
  'Ice sculpture':       { primaryType: 'ICE',      primaryPts: 6, secondaryType: 'WATER',    secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Wood grain':          { primaryType: 'GRASS',    primaryPts: 6, secondaryType: 'EARTH',    secondaryPts: 2, natureStat: 'defense',  natureStatPts: 2 },
  'Cloud material':      { primaryType: 'AIR',      primaryPts: 6, secondaryType: 'WATER',    secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Ghost form':          { primaryType: 'GHOST',    primaryPts: 6, secondaryType: 'DARK',     secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Sand form':           { primaryType: 'EARTH',    primaryPts: 6, secondaryType: 'AIR',      secondaryPts: 2, natureStat: 'speed',   natureStatPts: 2 },
  'Coral growth':        { primaryType: 'WATER',    primaryPts: 5, secondaryType: 'GRASS',    secondaryPts: 3, natureStat: 'defense',  natureStatPts: 2 },
  'Lava stone':          { primaryType: 'FIRE',     primaryPts: 5, secondaryType: 'STONE',    secondaryPts: 3, natureStat: 'attack',  natureStatPts: 2 },
  'Mushroom growth':     { primaryType: 'GRASS',    primaryPts: 5, secondaryType: 'VENOM',    secondaryPts: 3, natureStat: 'sp_def',  natureStatPts: 2 },

  // ── Fantasy & Magical clothes (12 options) ──
  'Druid robes':         { primaryType: 'GRASS',    primaryPts: 6, secondaryType: 'MYSTIC',   secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Necromancer cloak':   { primaryType: 'GHOST',    primaryPts: 6, secondaryType: 'DARK',     secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Sea serpent armor':   { primaryType: 'WATER',    primaryPts: 6, secondaryType: 'DRAGON',   secondaryPts: 2, natureStat: 'defense',  natureStatPts: 2 },
  'Storm mage robes':    { primaryType: 'ELECTRIC', primaryPts: 6, secondaryType: 'AIR',      secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Phoenix feather cape': { primaryType: 'FIRE',    primaryPts: 6, secondaryType: 'MYSTIC',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Crystal armor':       { primaryType: 'ICE',      primaryPts: 5, secondaryType: 'STONE',    secondaryPts: 3, natureStat: 'defense',  natureStatPts: 2 },
  'Shadow cloak':        { primaryType: 'DARK',     primaryPts: 6, secondaryType: 'GHOST',    secondaryPts: 2, natureStat: 'speed',   natureStatPts: 2 },
  'Fairy wings vest':    { primaryType: 'MYSTIC',   primaryPts: 5, secondaryType: 'AIR',      secondaryPts: 3, natureStat: 'speed',   natureStatPts: 2 },

  // ── Fantasy & Creature head (12 options) ──
  'Dragon horns':        { primaryType: 'DRAGON',   primaryPts: 6, secondaryType: 'FIRE',     secondaryPts: 2, natureStat: 'attack',  natureStatPts: 2 },
  'Unicorn horn':        { primaryType: 'LIGHT',    primaryPts: 6, secondaryType: 'MYSTIC',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Dark elf ears':       { primaryType: 'DARK',     primaryPts: 6, secondaryType: 'SHADOW',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Phoenix crest':       { primaryType: 'FIRE',     primaryPts: 6, secondaryType: 'MYSTIC',   secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Medusa snakes':       { primaryType: 'VENOM',    primaryPts: 6, secondaryType: 'STONE',    secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Troll tusks':         { primaryType: 'STONE',    primaryPts: 6, secondaryType: 'EARTH',    secondaryPts: 2, natureStat: 'attack',  natureStatPts: 2 },
  'Kraken tentacles':    { primaryType: 'WATER',    primaryPts: 6, secondaryType: 'DRAGON',   secondaryPts: 2, natureStat: 'attack',  natureStatPts: 2 },
  'Fairy crown':         { primaryType: 'MYSTIC',   primaryPts: 5, secondaryType: 'LIGHT',    secondaryPts: 3, natureStat: 'sp_def',  natureStatPts: 2 },
  'Demon horns':         { primaryType: 'DARK',     primaryPts: 5, secondaryType: 'FIRE',     secondaryPts: 3, natureStat: 'attack',  natureStatPts: 2 },

  // ── Nature & Wild bg (12 options) ──
  'Tropical beach':      { primaryType: 'WATER',    primaryPts: 6, secondaryType: 'GRASS',    secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Deep forest':         { primaryType: 'GRASS',    primaryPts: 6, secondaryType: 'INSECT',   secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Volcanic crater':     { primaryType: 'FIRE',     primaryPts: 6, secondaryType: 'STONE',    secondaryPts: 2, natureStat: 'attack',  natureStatPts: 2 },
  'Arctic tundra':       { primaryType: 'ICE',      primaryPts: 6, secondaryType: 'AIR',      secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Coral reef':          { primaryType: 'WATER',    primaryPts: 6, secondaryType: 'GRASS',    secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Mountain peak':       { primaryType: 'STONE',    primaryPts: 6, secondaryType: 'AIR',      secondaryPts: 2, natureStat: 'defense',  natureStatPts: 2 },
  'Swamp bayou':         { primaryType: 'GRASS',    primaryPts: 5, secondaryType: 'VENOM',    secondaryPts: 3, natureStat: 'sp_def',  natureStatPts: 2 },
  'Desert oasis':        { primaryType: 'EARTH',    primaryPts: 5, secondaryType: 'WATER',    secondaryPts: 3, natureStat: 'sp_def',  natureStatPts: 2 },
  'Thunderstorm field':  { primaryType: 'ELECTRIC', primaryPts: 6, secondaryType: 'AIR',      secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Crystal cavern':      { primaryType: 'STONE',    primaryPts: 5, secondaryType: 'ICE',      secondaryPts: 3, natureStat: 'sp_def',  natureStatPts: 2 },

  // ── Action & Extreme bg (12 options) ──
  'Race track':          { primaryType: 'FIRE',     primaryPts: 5, secondaryType: 'ELECTRIC', secondaryPts: 3, natureStat: 'speed',   natureStatPts: 2 },
  'Lightning storm':     { primaryType: 'ELECTRIC', primaryPts: 6, secondaryType: 'AIR',      secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Haunted graveyard':   { primaryType: 'GHOST',    primaryPts: 6, secondaryType: 'DARK',     secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Underwater ruins':    { primaryType: 'WATER',    primaryPts: 6, secondaryType: 'STONE',    secondaryPts: 2, natureStat: 'sp_def',  natureStatPts: 2 },
  'Tornado alley':       { primaryType: 'AIR',      primaryPts: 6, secondaryType: 'EARTH',    secondaryPts: 2, natureStat: 'speed',   natureStatPts: 2 },
  'Meteor shower':       { primaryType: 'COSMIC',   primaryPts: 6, secondaryType: 'FIRE',     secondaryPts: 2, natureStat: 'sp_atk',  natureStatPts: 2 },
  'Tsunami wave':        { primaryType: 'WATER',    primaryPts: 5, secondaryType: 'AIR',      secondaryPts: 3, natureStat: 'attack',  natureStatPts: 2 },
  'Earthquake zone':     { primaryType: 'EARTH',    primaryPts: 6, secondaryType: 'STONE',    secondaryPts: 2, natureStat: 'defense',  natureStatPts: 2 },
};

// ---------- Lookup Function ----------

/**
 * Look up the combat mapping for an AI enhancement.
 * Checks per-option overrides first, falls back to family default.
 *
 * @param familyLabel - The AI style family label (e.g., 'Elemental')
 * @param optionLabel - The selected option label (e.g., 'Ice frost')
 * @returns AICombatMapping or undefined if family not found
 */
export function lookupAICombat(
  familyLabel: string,
  optionLabel: string
): AICombatMapping | undefined {
  // Per-option override takes priority
  const override = OPTION_OVERRIDES[optionLabel];
  if (override) return override;

  // Fall back to family default
  // Strip emoji prefix if present (family labels start with emoji + space)
  const cleanLabel = familyLabel.replace(/^[^\w\s]+\s*/, '').trim();
  return FAMILY_DEFAULTS[cleanLabel] ?? FAMILY_DEFAULTS[familyLabel];
}
```

> **Implementation note:** The option labels above must match EXACTLY the labels in `src/config/aiEnhancePresets.ts` after pruning. During implementation, cross-reference the preset file to verify all 8 diverse families have matching overrides. Some option labels may need minor adjustments after the preset pruning task (Task 13).

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: Zero errors. `CombatType` includes `COSMIC` — if not, check `types.ts` for the correct type name (it may be `MYSTIC` instead). Adjust accordingly.

> **IMPORTANT:** The `CombatType` union in `types.ts` uses `MYSTIC` not `COSMIC`, `SHADOW` not `DARK`, `PSYCHE` not `PSYCHIC`. Verify all type names against `COMBAT_TYPES` in `src/lib/combat/types.ts` before committing. The names used above may need correction during implementation — the implementer MUST cross-reference `types.ts` line 4-8.

**Step 3: Commit**

```bash
git add src/lib/combat/data/ai-combat-map.ts
git commit -m "feat(combat): add AI enhancement combat mappings

51 family-level defaults + ~93 per-option overrides for 8 diverse
families (Elemental, Energy & Power, Magical, Material Swap,
Fantasy & Magical clothes, Fantasy & Creature head, Nature & Wild
bg, Action & Extreme bg). All 18 combat types covered.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 11: Integrate AI Combat Mappings into Identity Calculator

**Files:**
- Modify: `src/lib/combat/identity-calculator.ts`
- Modify: `functions/api/mint/process.ts`

**Context to read first:**
- `src/lib/combat/data/ai-combat-map.ts` — `lookupAICombat()`, `AICombatMapping`
- `src/lib/combat/types.ts` — `CombatType`, `StatName`

**Step 1: Extend IdentityInput and trait loop**

Add an optional `aiEnhancements` field to `IdentityInput`:

```typescript
interface IdentityInput {
  traits: TraitInput[];
  colors: Record<string, string>;
  details: Record<string, string>;
  logoOption?: string;
  /** AI enhancement combat overrides by layer name (e.g., 'Clothes', 'Head', 'Background') */
  aiEnhancements?: Record<string, AICombatMapping>;
}
```

Import `AICombatMapping`:
```typescript
import type { AICombatMapping } from './data/ai-combat-map';
```

Modify the trait points loop (Source 1, around line 33) to check AI overrides:

```typescript
  // Source 1: Trait points (with AI enhancement overrides)
  const aiOverriddenLayers = new Set<string>();

  // Apply AI enhancement overrides first
  if (input.aiEnhancements) {
    for (const [layer, mapping] of Object.entries(input.aiEnhancements)) {
      aiOverriddenLayers.add(layer);
      typeScores[mapping.primaryType] += mapping.primaryPts;
      if (mapping.secondaryType) {
        typeScores[mapping.secondaryType] += mapping.secondaryPts;
      }
      if (mapping.natureStat) {
        statScores[mapping.natureStat] += mapping.natureStatPts;
      }
    }
  }

  // Regular trait points (skip layers overridden by AI)
  for (const { traitId, layer } of input.traits) {
    if (aiOverriddenLayers.has(layer)) continue;
    const entry = getTraitCombat(traitId);
    if (!entry) continue;
    typeScores[entry.typePoints.primary] += entry.typePoints.primaryPts;
    if (entry.typePoints.secondary && entry.typePoints.secondaryPts) {
      typeScores[entry.typePoints.secondary] += entry.typePoints.secondaryPts;
    }
    if (entry.natureStat && entry.natureStatPts) {
      statScores[entry.natureStat] += entry.natureStatPts;
    }
  }
```

**Step 2: Pass AI combat mappings in process.ts**

In `process.ts`, after building `combatTraitEntries` and before calling `calculateCombatIdentity()` (around line 210), build the AI combat overrides from `ai_metadata_json`:

```typescript
      // Build AI combat overrides (if AI-enhanced)
      let aiCombatOverrides: Record<string, import('../../../src/lib/combat/data/ai-combat-map').AICombatMapping> | undefined;

      if (job.ai_metadata_json) {
        try {
          const aiMeta = JSON.parse(job.ai_metadata_json) as {
            aiEnhanced?: boolean;
            aiAttributes?: Array<{ category: string; label?: string; familyLabel?: string }>;
          };
          if (aiMeta.aiEnhanced && Array.isArray(aiMeta.aiAttributes)) {
            const { lookupAICombat } = await import('../../../src/lib/combat/data/ai-combat-map');
            const categoryToLayer: Record<string, string> = {
              clothes: 'Clothes',
              head: 'Head',
              background: 'Background',
            };

            aiCombatOverrides = {};
            for (const attr of aiMeta.aiAttributes) {
              const layer = categoryToLayer[attr.category];
              if (!layer || !attr.label) continue;
              const mapping = lookupAICombat(attr.familyLabel ?? '', attr.label);
              if (mapping) {
                aiCombatOverrides[layer] = mapping;
              }
            }
            if (Object.keys(aiCombatOverrides).length === 0) {
              aiCombatOverrides = undefined;
            }
          }
        } catch {
          // Skip AI combat overrides on parse error
        }
      }

      const combatIdentity = calculateCombatIdentity({
        traits: combatTraitEntries,
        colors: combatColorMap,
        details: {},
        aiEnhancements: aiCombatOverrides,
      });
```

Also update the second `calculateCombatIdentity` call in `finalizeJob()` (around line 583) with the same AI override logic. Extract the AI combat override building into a helper function to avoid duplication:

```typescript
// At the top of process.ts, add import:
import { lookupAICombat, type AICombatMapping } from '../../../src/lib/combat/data/ai-combat-map';

// Helper function:
function buildAICombatOverrides(
  aiMetadataJson: string | null
): Record<string, AICombatMapping> | undefined {
  if (!aiMetadataJson) return undefined;
  try {
    const aiMeta = JSON.parse(aiMetadataJson) as {
      aiEnhanced?: boolean;
      aiAttributes?: Array<{ category: string; label?: string; familyLabel?: string }>;
    };
    if (!aiMeta.aiEnhanced || !Array.isArray(aiMeta.aiAttributes)) return undefined;

    const categoryToLayer: Record<string, string> = {
      clothes: 'Clothes',
      head: 'Head',
      background: 'Background',
    };

    const overrides: Record<string, AICombatMapping> = {};
    for (const attr of aiMeta.aiAttributes) {
      const layer = categoryToLayer[attr.category];
      if (!layer || !attr.label) continue;
      const mapping = lookupAICombat(attr.familyLabel ?? '', attr.label);
      if (mapping) overrides[layer] = mapping;
    }
    return Object.keys(overrides).length > 0 ? overrides : undefined;
  } catch {
    return undefined;
  }
}
```

Then use it in both locations:
```typescript
const aiCombatOverrides = buildAICombatOverrides(job.ai_metadata_json);
const combatIdentity = calculateCombatIdentity({
  traits: combatTraitEntries,
  colors: combatColorMap,
  details: {},
  aiEnhancements: aiCombatOverrides,
});
```

**Step 3: Update frontend to include familyLabel in aiAttributes**

In `ActionBar.tsx`, update the `aiData` assembly to include the family label:

```typescript
      const aiData = isAIEnhancedMode && enhancedCategories.size > 0
        ? {
            aiEnhanced: true,
            aiAttributes: Object.entries(acceptedOptions)
              .filter(([, opt]) => opt != null)
              .map(([category, opt]) => ({
                category,
                label: opt!.label,
                familyLabel: acceptedFamilies?.[category as AICategory] ?? '',
              })),
          }
        : undefined;
```

This requires also tracking `acceptedFamilies` in the context (add alongside `acceptedOptions`).

In `AIEnhanceContext.tsx`, add:
```typescript
  // In interface:
  acceptedFamilies: Partial<Record<AICategory, string>>;

  // In provider state:
  const [acceptedFamilies, setAcceptedFamilies] = useState<Partial<Record<AICategory, string>>>({});

  // In acceptResult:
  setAcceptedFamilies((prev) => ({
    ...prev,
    [currentResult.category]: selectedFamily?.label ?? '',
  }));

  // In resetToLayers:
  setAcceptedFamilies({});

  // Add to value object + dependency array
```

**Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: Zero errors.

**Step 5: Commit**

```bash
git add src/lib/combat/identity-calculator.ts functions/api/mint/process.ts src/contexts/AIEnhanceContext.tsx src/components/generator/ActionBar.tsx
git commit -m "feat(combat): integrate AI enhancements into identity calculator

- identity-calculator.ts accepts aiEnhancements override map
- AI combat mappings replace regular layer contributions per category
- process.ts builds overrides from ai_metadata_json using lookupAICombat()
- Both processJob and finalizeJob use the same helper function
- Frontend passes familyLabel in aiAttributes for combat lookup
- Context tracks acceptedFamilies alongside acceptedOptions

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 12: Prune Preset Catalog (917 → 569)

**Files:**
- Modify: `src/config/aiEnhancePresets.ts` (1231 lines)

**Context to read first:**
- `docs/plans/2026-03-08-ai-enhance-v2-design.md` — Section 5 for per-family cut counts
- Current presets file — understand family/option structure

**Step 1: Apply pruning cuts per family**

This is a data-only change. For each family, remove the weakest options according to the cut criteria from the design doc. Keep all 51 families, trim each from 18 to 10–12 options.

**Per-section target counts:**

| Section | Before | After |
|---------|--------|-------|
| UNIVERSAL_ENHANCE (7 families) | 126 | 81 |
| CLOTHES_ENHANCE (6 families) | 162→108 est. | 101 |
| HEAD_ENHANCE (3 families) | 108→54 est. | 64 |
| CLOTHES_CREATE (10 families) | 180 | 115 |
| HEAD_CREATE (10 families) | 180 | 101 |
| BACKGROUND_CREATE (9 families) | 161 | 107 |

**Cut criteria (remove options that match any):**
1. Too similar to another option in same family (keep the stronger one)
2. Too niche/obscure for most users
3. Cross-family redundancy (already covered by another family)
4. Literal duplicates (3 found — remove exact copies)
5. Culturally sensitive without clear value

**Approach:** Go through each family systematically. For each 18-option family, cut to ~11. Prioritize keeping options that:
- Are visually distinct from each other
- Have clear, recognizable names (good metadata)
- Cover diverse combat types (especially for the 8 override families)
- Are fun and appealing to a broad audience

> **Implementation note:** The implementer should read the full presets file, apply cuts per the target counts above, and verify the total reaches ~569. Remove the cut options entirely (don't comment them out). After pruning, update any option labels that don't match the combat map override keys in `ai-combat-map.ts`.

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: Zero errors (presets are just data — type structure unchanged).

Run: `npm run build`
Expected: Clean build.

**Step 3: Commit**

```bash
git add src/config/aiEnhancePresets.ts
git commit -m "feat(ai): prune preset catalog from 917 to ~569 options

Remove weakest options per cut criteria: similarity, obscurity,
redundancy, duplicates, and cultural sensitivity. All 51 families
retained, each trimmed from 18 to 10-12 options. Combat type
coverage verified across all 18 types.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 13: Final Build Verification

**Step 1: Full type check**

Run: `npx tsc --noEmit`
Expected: Zero errors.

**Step 2: Full build**

Run: `npm run build`
Expected: Clean build, no warnings.

**Step 3: Verify git status**

Run: `git status`
Expected: Clean working tree (all changes committed).

Run: `git log --oneline -10`
Expected: All commits from this plan visible in order.

---

## Summary of Commits

| # | Message | Files |
|---|---------|-------|
| 1 | `feat(ai): update credit pricing to 4-tier structure` | `_shared.ts`, `aiEnhance.ts`, `AICreditsShop.tsx` |
| 2 | `feat(ai): implement real payment backend with unique mojo amounts` | `buy.ts`, `confirm.ts` |
| 3 | `feat(ai): wire real XCH payments in credits shop` | `AICreditsShop.tsx` |
| 4 | `feat(ai): wire AI metadata into mint flow` | `AIEnhanceContext.tsx`, `MintContext.tsx`, `ActionBar.tsx`, `submit.ts`, `process.ts` |
| 5 | `feat(combat): add AI enhancement combat mappings` | `ai-combat-map.ts` (new) |
| 6 | `feat(combat): integrate AI enhancements into identity calculator` | `identity-calculator.ts`, `process.ts`, `AIEnhanceContext.tsx`, `ActionBar.tsx` |
| 7 | `feat(ai): prune preset catalog from 917 to ~569 options` | `aiEnhancePresets.ts` |

---

## Important Notes for Implementer

1. **CombatType names**: The types in `types.ts` are `NEUTRAL`, `FIRE`, `WATER`, `ELECTRIC`, `GRASS`, `ICE`, `MARTIAL`, `VENOM`, `EARTH`, `AIR`, `PSYCHE`, `INSECT`, `STONE`, `GHOST`, `DRAGON`, `SHADOW`, `METAL`, `MYSTIC`. The design doc used some informal names (COSMIC, DARK, PSYCHIC, LIGHT) — map these to the correct enum values. **COSMIC→MYSTIC or a new value? DARK→SHADOW? LIGHT→?** Cross-reference `types.ts` carefully. If the 18 types don't include COSMIC/DARK/LIGHT, the combat map needs correction.

2. **sendXCH signature**: Verify `useSageWallet()` exposes `sendXCH`. Check `sage-wallet-types.ts` for the exact function signature. The amount parameter may be in XCH (floating point) or mojos (integer) — confirm before wiring.

3. **Spacescan coin API**: The existing proxy at `/api/spacescan/[[path]].ts` forwards to `api.spacescan.io`. Verify the exact endpoint for listing coins by puzzle hash. It may be `/coin/address/{puzzleHash}` or `/coins/{puzzleHash}`. Test with a real request before finalizing confirm.ts.

4. **Family label deduplication**: Some family labels appear in multiple sections (e.g., "Fantasy & Magical" for both clothes_create and background_create). The combat map uses the label as-is. If this causes lookup issues, prefix with the category context in the lookup function.

5. **Preset label matching**: After pruning, ensure every option label in `ai-combat-map.ts` OPTION_OVERRIDES still exists in `aiEnhancePresets.ts`. Remove any orphaned overrides.
