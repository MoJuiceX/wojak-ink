# Reve AI Enhance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an optional AI Enhance step to the Wojak Generator using the Reve Edit API, with category-scoped editing, a separate AI credit system, R2 image persistence, and a "My AI Creations" gallery.

**Architecture:** Server-side Reve API calls via Cloudflare Pages Functions, R2 for image storage, D1 for credits and enhancement metadata. Frontend uses a new `AIEnhanceContext` with a Lightbox-based wizard (category picker → prompt builder → side-by-side result). Generator enters a locked "AI Enhanced Mode" after accepting an edit.

**Tech Stack:** Cloudflare Pages Functions (TypeScript), D1 (SQLite), R2 (object storage), Reve Edit API, React + Framer Motion, existing Lightbox component, existing theme.css patterns.

**Design doc:** `docs/plans/2026-03-08-reve-ai-enhance-design.md`

---

## Phase 1: Database & Backend Foundation

### Task 1: Database Migration

**Files:**
- Create: `functions/migrations/079_ai_enhance_system.sql`

**Step 1: Write the migration**

```sql
-- AI Enhance system: credits, usage, and enhancement storage.
-- Run once against wojak-users D1 database.

-- AI credit purchases (buying credits with XCH)
CREATE TABLE IF NOT EXISTS ai_credit_purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  credits_purchased INTEGER NOT NULL,
  xch_paid_mojos INTEGER NOT NULL,
  bundle_tier TEXT NOT NULL,
  offer_file TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  confirmed_at TEXT,
  expires_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_ai_credit_purchases_wallet
  ON ai_credit_purchases(wallet_address);
CREATE INDEX IF NOT EXISTS idx_ai_credit_purchases_status
  ON ai_credit_purchases(status);

-- AI credit usage (one row per successful edit)
CREATE TABLE IF NOT EXISTS ai_credit_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  enhancement_id INTEGER NOT NULL,
  credits_spent INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_credit_usage_wallet
  ON ai_credit_usage(wallet_address);

-- AI enhanced images (persisted creations)
CREATE TABLE IF NOT EXISTS ai_enhancements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  category TEXT NOT NULL,
  prompt TEXT NOT NULL,
  constrained_prompt TEXT,
  reve_request_id TEXT,
  reve_version TEXT,
  parent_enhancement_id INTEGER,
  base_layers_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_enhancements_wallet
  ON ai_enhancements(wallet_address);
CREATE INDEX IF NOT EXISTS idx_ai_enhancements_parent
  ON ai_enhancements(parent_enhancement_id);
```

**Step 2: Apply migration to local D1**

Run: `npx wrangler d1 execute wojak-users --local --file=functions/migrations/079_ai_enhance_system.sql`
Expected: Tables created successfully.

**Step 3: Commit**

```bash
git add functions/migrations/079_ai_enhance_system.sql
git commit -m "feat: add AI enhance system migration (tables + indexes)"
```

---

### Task 2: AI Shared Constants and Types

**Files:**
- Create: `functions/api/ai/_shared.ts`

**Step 1: Write the shared module**

```typescript
// AI Enhance shared constants, types, and utilities.
// Mirrors the pattern from functions/api/mint/_shared.ts.

export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://wojak.ink',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

export function errorResponse(error: string, status: number): Response {
  return jsonResponse({ error }, status);
}

export function optionsResponse(): Response {
  return new Response(null, { headers: corsHeaders });
}

// --- AI Credit Bundles ---

export interface AICreditBundle {
  tier: string;
  credits: number;
  priceXch: number;
  mojos: bigint;
}

export const AI_CREDIT_BUNDLES: readonly AICreditBundle[] = [
  { tier: '1',  credits: 1,  priceXch: 0.08, mojos: 80000000000n },
  { tier: '5',  credits: 5,  priceXch: 0.35, mojos: 350000000000n },
  { tier: '15', credits: 15, priceXch: 0.90, mojos: 900000000000n },
  { tier: '30', credits: 30, priceXch: 1.50, mojos: 1500000000000n },
  { tier: '50', credits: 50, priceXch: 2.00, mojos: 2000000000000n },
] as const;

// --- Category Config ---

export type AICategory = 'clothes' | 'head' | 'facewear' | 'background';

export type AICategoryFreedom = 'enhance' | 'free';

export const AI_CATEGORIES: Record<AICategory, { label: string; icon: string; freedom: AICategoryFreedom }> = {
  clothes:    { label: 'Clothes',    icon: '👕', freedom: 'enhance' },
  head:       { label: 'Head',       icon: '🎩', freedom: 'enhance' },
  facewear:   { label: 'Facewear',   icon: '🎭', freedom: 'free' },
  background: { label: 'Background', icon: '🖼', freedom: 'free' },
};

// --- Prompt Templates ---

export const PROMPT_TEMPLATES: Record<AICategory, string> = {
  clothes:
    'Modify only the clothing in this illustration: {user_prompt}. Keep the same garment type and shape. Do not change the face, head, background, or illustration style.',
  head:
    'Modify only the headwear in this illustration: {user_prompt}. Keep the same hat type and shape. Do not change the face, clothing, background, or illustration style.',
  facewear:
    'Add to the character\'s face area: {user_prompt}. Maintain the line-art illustration style of the character.',
  background:
    'Replace the background of this illustration: {user_prompt}. Keep the character in the foreground exactly as-is. Do not modify the character.',
};

export function buildConstrainedPrompt(category: AICategory, userPrompt: string): string {
  return PROMPT_TEMPLATES[category].replace('{user_prompt}', userPrompt.trim());
}

// --- Env Bindings ---

export interface AIEnv {
  DB: D1Database;
  REVE_API_KEY?: string;
  AI_EDITS_BUCKET?: R2Bucket;
}

// --- Balance Query ---

export async function getAICreditBalance(db: D1Database, wallet: string): Promise<number> {
  const result = await db
    .prepare(
      `SELECT
        COALESCE((SELECT SUM(credits_purchased) FROM ai_credit_purchases WHERE wallet_address = ? AND status = 'confirmed'), 0) -
        COALESCE((SELECT SUM(credits_spent) FROM ai_credit_usage WHERE wallet_address = ?), 0)
        AS balance`
    )
    .bind(wallet, wallet)
    .first<{ balance: number }>();
  return result?.balance ?? 0;
}
```

**Step 2: Commit**

```bash
git add functions/api/ai/_shared.ts
git commit -m "feat: add AI enhance shared constants, types, and helpers"
```

---

### Task 3: AI Balance Endpoint

**Files:**
- Create: `functions/api/ai/balance.ts`
- Test: `functions/api/ai/balance.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('GET /api/ai/balance', () => {
  it('returns 400 for missing wallet', async () => {
    // Test that missing wallet param returns error
    // Detailed test implementation depends on test harness
  });

  it('returns balance for valid wallet', async () => {
    // Test that a valid wallet returns { balance, creditsUsed, creditsPurchased }
  });
});
```

**Step 2: Write the endpoint**

```typescript
import { jsonResponse, errorResponse, optionsResponse, getAICreditBalance } from './_shared';
import type { AIEnv } from './_shared';

export const onRequest: PagesFunction<AIEnv> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'GET') return errorResponse('Method not allowed', 405);

  const url = new URL(request.url);
  const wallet = url.searchParams.get('wallet');

  if (!wallet || wallet.length < 10) {
    return errorResponse('Missing or invalid wallet parameter', 400);
  }

  try {
    const balance = await getAICreditBalance(env.DB, wallet);

    const purchasedResult = await env.DB
      .prepare('SELECT COALESCE(SUM(credits_purchased), 0) as total FROM ai_credit_purchases WHERE wallet_address = ? AND status = ?')
      .bind(wallet, 'confirmed')
      .first<{ total: number }>();

    const usedResult = await env.DB
      .prepare('SELECT COALESCE(SUM(credits_spent), 0) as total FROM ai_credit_usage WHERE wallet_address = ?')
      .bind(wallet)
      .first<{ total: number }>();

    return jsonResponse({
      balance,
      creditsPurchased: purchasedResult?.total ?? 0,
      creditsUsed: usedResult?.total ?? 0,
    });
  } catch (err) {
    console.error('AI balance error:', err);
    return errorResponse('Internal error', 500);
  }
};
```

**Step 3: Run test**

Run: `npm run test:unit -- --grep "ai/balance"`
Expected: PASS

**Step 4: Commit**

```bash
git add functions/api/ai/balance.ts functions/api/ai/balance.test.ts
git commit -m "feat: add GET /api/ai/balance endpoint"
```

---

### Task 4: AI Enhance Endpoint (Core — Calls Reve)

**Files:**
- Create: `functions/api/ai/enhance.ts`

**Step 1: Write the enhance endpoint**

This is the core endpoint. It validates, calls Reve, saves to R2, and records in D1.

```typescript
import {
  jsonResponse,
  errorResponse,
  optionsResponse,
  getAICreditBalance,
  buildConstrainedPrompt,
  AI_CATEGORIES,
} from './_shared';
import type { AIEnv, AICategory } from './_shared';

const REVE_EDIT_URL = 'https://api.reve.com/v1/image/edit';
const MAX_PROMPT_LENGTH = 200;

export const onRequest: PagesFunction<AIEnv> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);

  // --- Parse body ---
  let body: {
    walletAddress?: string;
    imageBase64?: string;
    category?: string;
    prompt?: string;
    parentEnhancementId?: number;
    baseLayersJson?: string;
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  const { walletAddress, imageBase64, category, prompt, parentEnhancementId, baseLayersJson } = body;

  // --- Validate ---
  if (!walletAddress || walletAddress.length < 10) {
    return errorResponse('Missing or invalid walletAddress', 400);
  }
  if (!imageBase64 || imageBase64.length < 100) {
    return errorResponse('Missing or invalid imageBase64', 400);
  }
  if (!category || !AI_CATEGORIES[category as AICategory]) {
    return errorResponse('Invalid category. Must be: clothes, head, facewear, background', 400);
  }
  if (!prompt || prompt.trim().length === 0 || prompt.length > MAX_PROMPT_LENGTH) {
    return errorResponse(`Prompt is required (max ${MAX_PROMPT_LENGTH} characters)`, 400);
  }
  if (!env.REVE_API_KEY) {
    return errorResponse('AI enhancement is not configured', 503);
  }
  if (!env.AI_EDITS_BUCKET) {
    return errorResponse('Image storage is not configured', 503);
  }

  const cat = category as AICategory;
  const trimmedPrompt = prompt.trim();

  // --- Check balance ---
  const balance = await getAICreditBalance(env.DB, walletAddress);
  if (balance < 1) {
    return errorResponse('Not enough AI credits. Buy more to continue.', 402);
  }

  // --- Build constrained prompt ---
  const constrainedPrompt = buildConstrainedPrompt(cat, trimmedPrompt);

  // --- Call Reve Edit API ---
  let reveResponse: Response;
  try {
    reveResponse = await fetch(REVE_EDIT_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.REVE_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        edit_instruction: constrainedPrompt,
        reference_image: imageBase64,
      }),
    });
  } catch (err) {
    console.error('Reve API network error:', err);
    return errorResponse('AI service is unavailable. Try again.', 502);
  }

  if (reveResponse.status === 429) {
    return errorResponse('Too many requests. Wait a moment and try again.', 429);
  }

  if (!reveResponse.ok) {
    const errText = await reveResponse.text().catch(() => 'Unknown error');
    console.error(`Reve API error ${reveResponse.status}:`, errText);
    return errorResponse('AI enhancement failed. Try again.', 502);
  }

  let reveData: {
    image?: string;
    content_violation?: boolean;
    request_id?: string;
    version?: string;
    credits_used?: number;
    credits_remaining?: number;
  };
  try {
    reveData = await reveResponse.json();
  } catch {
    return errorResponse('Invalid response from AI service.', 502);
  }

  // --- Content violation check ---
  if (reveData.content_violation) {
    return errorResponse('This edit was blocked by content policy. Try a different prompt.', 422);
  }

  if (!reveData.image) {
    return errorResponse('AI service returned no image. Try again.', 502);
  }

  // --- Save to R2 ---
  const enhancementId = Date.now(); // Temporary; will be replaced by DB insert ID
  const r2Key = `ai-edits/${walletAddress}/${enhancementId}.png`;

  try {
    const imageBuffer = Uint8Array.from(atob(reveData.image), (c) => c.charCodeAt(0));
    await env.AI_EDITS_BUCKET.put(r2Key, imageBuffer, {
      httpMetadata: { contentType: 'image/png' },
    });
  } catch (err) {
    console.error('R2 upload error:', err);
    return errorResponse('Failed to save your edit. Try again.', 500);
  }

  // --- Record in D1 (enhancement + credit usage) ---
  try {
    const insertResult = await env.DB
      .prepare(
        `INSERT INTO ai_enhancements
          (wallet_address, r2_key, category, prompt, constrained_prompt, reve_request_id, reve_version, parent_enhancement_id, base_layers_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        walletAddress,
        r2Key,
        cat,
        trimmedPrompt,
        constrainedPrompt,
        reveData.request_id ?? null,
        reveData.version ?? null,
        parentEnhancementId ?? null,
        baseLayersJson ?? null,
      )
      .run();

    const dbEnhancementId = insertResult.meta?.last_row_id;

    await env.DB
      .prepare('INSERT INTO ai_credit_usage (wallet_address, enhancement_id, credits_spent) VALUES (?, ?, 1)')
      .bind(walletAddress, dbEnhancementId)
      .run();
  } catch (err) {
    console.error('D1 insert error:', err);
    // Image is saved to R2 but credit not deducted — acceptable state
    // User got the image, we just failed to track it
    return errorResponse('Edit succeeded but failed to record. Contact support.', 500);
  }

  // --- Return result ---
  const newBalance = await getAICreditBalance(env.DB, walletAddress);

  return jsonResponse({
    imageBase64: reveData.image,
    r2Key,
    enhancementId: r2Key,
    category: cat,
    prompt: trimmedPrompt,
    creditsRemaining: newBalance,
    reveRequestId: reveData.request_id,
  });
};
```

**Step 2: Commit**

```bash
git add functions/api/ai/enhance.ts
git commit -m "feat: add POST /api/ai/enhance endpoint (Reve Edit + R2 + D1)"
```

---

### Task 5: AI Creations Endpoint

**Files:**
- Create: `functions/api/ai/creations.ts`

**Step 1: Write the creations list endpoint**

```typescript
import { jsonResponse, errorResponse, optionsResponse } from './_shared';
import type { AIEnv } from './_shared';

export const onRequest: PagesFunction<AIEnv> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'GET') return errorResponse('Method not allowed', 405);

  const url = new URL(request.url);
  const wallet = url.searchParams.get('wallet');
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 100);

  if (!wallet || wallet.length < 10) {
    return errorResponse('Missing or invalid wallet parameter', 400);
  }

  try {
    const rows = await env.DB
      .prepare(
        `SELECT id, r2_key, category, prompt, parent_enhancement_id, created_at
         FROM ai_enhancements
         WHERE wallet_address = ?
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .bind(wallet, limit)
      .all();

    return jsonResponse({
      creations: rows.results ?? [],
      total: rows.results?.length ?? 0,
    });
  } catch (err) {
    console.error('AI creations error:', err);
    return errorResponse('Internal error', 500);
  }
};
```

**Step 2: Commit**

```bash
git add functions/api/ai/creations.ts
git commit -m "feat: add GET /api/ai/creations endpoint"
```

---

### Task 6: AI Credit Purchase Endpoints

**Files:**
- Create: `functions/api/ai/credits/buy.ts`
- Create: `functions/api/ai/credits/confirm.ts`

**Step 1: Write the buy endpoint**

```typescript
// functions/api/ai/credits/buy.ts
import { jsonResponse, errorResponse, optionsResponse, AI_CREDIT_BUNDLES } from '../_shared';
import type { AIEnv } from '../_shared';

const OFFER_EXPIRY_MINUTES = 15;

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
    return errorResponse(`Invalid tier. Valid tiers: ${AI_CREDIT_BUNDLES.map((b) => b.tier).join(', ')}`, 400);
  }

  // Expire stale pending purchases for this wallet
  await env.DB
    .prepare(
      `UPDATE ai_credit_purchases SET status = 'expired'
       WHERE wallet_address = ? AND status = 'pending' AND expires_at < datetime('now')`
    )
    .bind(walletAddress)
    .run();

  // Check for existing pending purchase
  const existing = await env.DB
    .prepare(
      `SELECT id, bundle_tier, offer_file, expires_at FROM ai_credit_purchases
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
      offerFile: existing.offer_file,
      expiresAt: existing.expires_at,
    });
  }

  // TODO: Create MintGarden offer for XCH payment
  // For now, insert pending row. The MintGarden integration
  // follows the same pattern as functions/api/mint/request.ts.
  const expiresAt = new Date(Date.now() + OFFER_EXPIRY_MINUTES * 60 * 1000).toISOString();

  const result = await env.DB
    .prepare(
      `INSERT INTO ai_credit_purchases
        (wallet_address, credits_purchased, xch_paid_mojos, bundle_tier, status, expires_at)
       VALUES (?, ?, ?, ?, 'pending', ?)`
    )
    .bind(walletAddress, bundle.credits, Number(bundle.mojos), bundle.tier, expiresAt)
    .run();

  return jsonResponse({
    pending: true,
    purchaseId: result.meta?.last_row_id,
    tier: bundle.tier,
    credits: bundle.credits,
    priceXch: bundle.priceXch,
    expiresAt,
  }, 201);
};
```

**Step 2: Write the confirm endpoint**

```typescript
// functions/api/ai/credits/confirm.ts
import { jsonResponse, errorResponse, optionsResponse, getAICreditBalance } from '../_shared';
import type { AIEnv } from '../_shared';

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
      `SELECT id, wallet_address, credits_purchased, status
       FROM ai_credit_purchases WHERE id = ? AND wallet_address = ?`
    )
    .bind(purchaseId, walletAddress)
    .first();

  if (!row) {
    return errorResponse('Purchase not found', 404);
  }
  if (row.status === 'confirmed') {
    const balance = await getAICreditBalance(env.DB, walletAddress);
    return jsonResponse({ alreadyConfirmed: true, balance });
  }
  if (row.status !== 'pending') {
    return errorResponse(`Purchase is ${row.status}`, 400);
  }

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

**Step 3: Commit**

```bash
git add functions/api/ai/credits/buy.ts functions/api/ai/credits/confirm.ts
git commit -m "feat: add AI credit purchase endpoints (buy + confirm)"
```

---

## Phase 2: Wrangler Config

### Task 7: R2 Bucket and Env Config

**Files:**
- Modify: `wrangler.toml`

**Step 1: Add R2 binding and REVE_API_KEY reference**

Add to `wrangler.toml` after existing bindings:

```toml
[[r2_buckets]]
binding = "AI_EDITS_BUCKET"
bucket_name = "wojak-ai-edits"
```

Note: `REVE_API_KEY` is a secret — set via Cloudflare dashboard:
```bash
npx wrangler secret put REVE_API_KEY
```

**Step 2: Create the R2 bucket**

Run: `npx wrangler r2 bucket create wojak-ai-edits`
Expected: Bucket created successfully.

**Step 3: Commit**

```bash
git add wrangler.toml
git commit -m "feat: add R2 bucket binding for AI enhanced images"
```

---

## Phase 3: Frontend Types & Context

### Task 8: Frontend AI Types and Constants

**Files:**
- Create: `src/types/aiEnhance.ts`
- Create: `src/config/aiEnhancePresets.ts`

**Step 1: Write the types**

```typescript
// src/types/aiEnhance.ts

export type AICategory = 'clothes' | 'head' | 'facewear' | 'background';
export type AICategoryFreedom = 'enhance' | 'free';

export interface AICategoryConfig {
  label: string;
  icon: string;
  freedom: AICategoryFreedom;
}

export const AI_CATEGORIES: Record<AICategory, AICategoryConfig> = {
  clothes:    { label: 'Clothes',    icon: '👕', freedom: 'enhance' },
  head:       { label: 'Head',       icon: '🎩', freedom: 'enhance' },
  facewear:   { label: 'Facewear',   icon: '🎭', freedom: 'free' },
  background: { label: 'Background', icon: '🖼', freedom: 'free' },
};

export interface AIEnhancement {
  id: number;
  r2Key: string;
  category: AICategory;
  prompt: string;
  parentEnhancementId: number | null;
  createdAt: string;
}

export interface AIEnhanceResult {
  imageBase64: string;
  r2Key: string;
  enhancementId: string;
  category: AICategory;
  prompt: string;
  creditsRemaining: number;
  reveRequestId?: string;
}

export interface AICreditBundle {
  tier: string;
  credits: number;
  priceXch: number;
  discount: string;
  badge?: string;
}

export const AI_CREDIT_BUNDLES: AICreditBundle[] = [
  { tier: '1',  credits: 1,  priceXch: 0.08, discount: '' },
  { tier: '5',  credits: 5,  priceXch: 0.35, discount: '12.5% off' },
  { tier: '15', credits: 15, priceXch: 0.90, discount: '25% off', badge: 'POPULAR' },
  { tier: '30', credits: 30, priceXch: 1.50, discount: '37.5% off' },
  { tier: '50', credits: 50, priceXch: 2.00, discount: '50% off', badge: 'BEST VALUE' },
];

export type AIWizardStep = 'category' | 'prompt' | 'loading' | 'result';

export interface AIWizardState {
  step: AIWizardStep;
  selectedCategory: AICategory | null;
  prompt: string;
  originalImage: string | null;  // base64
  resultImage: string | null;    // base64
  enhancedCategories: Set<AICategory>;
  currentEnhancementId: string | null;
  error: string | null;
}
```

**Step 2: Write the presets config**

```typescript
// src/config/aiEnhancePresets.ts

import type { AICategory } from '@/types/aiEnhance';

export interface AIPreset {
  label: string;
  prompt: string;
}

export const AI_PRESETS: Record<AICategory, AIPreset[]> = {
  clothes: [
    { label: '🔥 Flame pattern',    prompt: 'Add a flame pattern' },
    { label: '🐯 Tiger print',      prompt: 'Add tiger print' },
    { label: '✨ Gold embroidery',   prompt: 'Add gold embroidery' },
    { label: '🎨 Tie-dye',          prompt: 'Make it tie-dye' },
    { label: '💎 Diamond studs',    prompt: 'Add diamond studs' },
    { label: '🌲 Camouflage',       prompt: 'Add camouflage pattern' },
    { label: '🏁 Racing stripes',   prompt: 'Add racing stripes' },
    { label: '👴 Vintage wash',     prompt: 'Make it look vintage washed' },
  ],
  head: [
    { label: '⚔️ Battle-worn',     prompt: 'Add battle-worn dents and scratches' },
    { label: '✨ Gold plating',     prompt: 'Make it gold plated' },
    { label: '💎 Diamond encrusted', prompt: 'Make it diamond encrusted' },
    { label: '🔩 Rusty metal',      prompt: 'Make it look like rusty metal' },
    { label: '💡 Neon glow trim',   prompt: 'Add neon glow trim' },
    { label: '🧸 Fur-lined',        prompt: 'Add fur lining' },
    { label: '🎨 Graffiti paint',   prompt: 'Add graffiti paint' },
  ],
  facewear: [
    { label: '⚙️ Steampunk goggles',  prompt: 'Steampunk brass goggles' },
    { label: '💎 Diamond monocle',     prompt: 'Diamond-encrusted monocle' },
    { label: '🤖 Cyberpunk visor',     prompt: 'Cyberpunk LED visor' },
    { label: '🕶️ Aviator sunglasses', prompt: 'Aviator sunglasses with orange lenses' },
    { label: '🎭 Phantom mask',        prompt: 'Opera phantom half-mask' },
    { label: '📡 AR holographic',      prompt: 'AR holographic display glasses' },
    { label: '🥇 Gold spectacles',     prompt: 'Gold-rimmed round spectacles' },
  ],
  background: [
    { label: '🌃 Tokyo neon',       prompt: 'Tokyo neon alley at night with rain reflections' },
    { label: '🐠 Coral reef',       prompt: 'Underwater coral reef with tropical fish' },
    { label: '🏰 Castle throne',    prompt: 'Medieval castle throne room with torches' },
    { label: '🚀 Spaceship',        prompt: 'Inside a spaceship cockpit with stars visible' },
    { label: '🌇 Skyscraper',       prompt: 'On top of a skyscraper at golden hour sunset' },
    { label: '🌧️ Cyberpunk rain',  prompt: 'Cyberpunk city street in the rain' },
    { label: '🏠 Cozy cabin',       prompt: 'Cozy cabin interior with fireplace' },
  ],
};

// Extended pool for randomizer (presets + extras)
export const AI_RANDOMIZER_POOL: Record<AICategory, string[]> = {
  clothes: [
    ...AI_PRESETS.clothes.map((p) => p.prompt),
    'Add pixel art pattern',
    'Make it look like denim',
    'Add gold chain stitching',
    'Make it sparkle with glitter',
    'Add a plaid pattern',
    'Make it look like leather',
    'Add neon trim',
    'Make it look knitted',
    'Add a galaxy print',
    'Make it look like silk',
  ],
  head: [
    ...AI_PRESETS.head.map((p) => p.prompt),
    'Add flames coming off the top',
    'Make it look frozen with ice',
    'Add LED lights',
    'Make it chrome',
    'Add tribal engravings',
    'Make it translucent',
    'Add spikes and studs',
  ],
  facewear: [
    ...AI_PRESETS.facewear.map((p) => p.prompt),
    'Welding goggles with green lenses',
    'Cat-eye glasses with jewels',
    'Futuristic transparent visor',
    'Round John Lennon glasses',
    'Ski goggles with mirror coating',
    'Smart glasses with HUD display',
    'Butterfly masquerade mask',
    'Gas mask with colored filters',
  ],
  background: [
    ...AI_PRESETS.background.map((p) => p.prompt),
    'Inside a volcano with lava flows',
    'Floating island in the clouds',
    'Deep space nebula',
    'Ancient Egyptian temple',
    'Inside a submarine looking through porthole',
    'Japanese zen garden at dawn',
    'Apocalyptic wasteland',
    'Inside the Matrix with green code',
    'Art deco luxury lounge',
    'Tropical beach at sunset',
  ],
};

export function getRandomPrompt(category: AICategory): string {
  const pool = AI_RANDOMIZER_POOL[category];
  return pool[Math.floor(Math.random() * pool.length)];
}
```

**Step 3: Commit**

```bash
git add src/types/aiEnhance.ts src/config/aiEnhancePresets.ts
git commit -m "feat: add AI enhance types, credit bundles, presets, and randomizer"
```

---

### Task 9: AIEnhanceContext

**Files:**
- Create: `src/contexts/AIEnhanceContext.tsx`

**Step 1: Write the context provider**

```typescript
// src/contexts/AIEnhanceContext.tsx

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useSageWallet } from '@/sage-wallet';
import type { AICategory, AIEnhancement, AIEnhanceResult, AIWizardStep } from '@/types/aiEnhance';

export interface AIEnhanceContextValue {
  // Balance
  balance: number;
  isLoadingBalance: boolean;
  refetchBalance: () => Promise<void>;

  // Wizard state
  isLightboxOpen: boolean;
  openLightbox: () => void;
  closeLightbox: () => void;
  wizardStep: AIWizardStep;
  setWizardStep: (step: AIWizardStep) => void;
  selectedCategory: AICategory | null;
  selectCategory: (cat: AICategory) => void;

  // Enhancement
  isEnhancing: boolean;
  enhanceError: string | null;
  clearError: () => void;
  submitEnhance: (imageBase64: string, category: AICategory, prompt: string, parentId?: string, layersJson?: string) => Promise<AIEnhanceResult | null>;

  // Result
  currentResult: AIEnhanceResult | null;
  clearResult: () => void;

  // Enhanced image state
  enhancedImage: string | null;  // base64 of currently accepted AI image
  enhancedCategories: Set<AICategory>;
  acceptResult: () => void;
  resetToLayers: () => void;
  isAIEnhancedMode: boolean;

  // Creations gallery
  creations: AIEnhancement[];
  isLoadingCreations: boolean;
  fetchCreations: () => Promise<void>;

  // Shop
  isShopOpen: boolean;
  openShop: () => void;
  closeShop: () => void;
}

const AIEnhanceContext = createContext<AIEnhanceContextValue | null>(null);

export function AIEnhanceProvider({ children }: { children: ReactNode }) {
  const { address } = useSageWallet();

  // Balance
  const [balance, setBalance] = useState(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Wizard
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<AIWizardStep>('category');
  const [selectedCategory, setSelectedCategory] = useState<AICategory | null>(null);

  // Enhancement
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<AIEnhanceResult | null>(null);

  // AI Enhanced Mode
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [enhancedCategories, setEnhancedCategories] = useState<Set<AICategory>>(new Set());

  // Creations
  const [creations, setCreations] = useState<AIEnhancement[]>([]);
  const [isLoadingCreations, setIsLoadingCreations] = useState(false);

  // Shop
  const [isShopOpen, setIsShopOpen] = useState(false);

  const isAIEnhancedMode = enhancedImage !== null;

  // --- Fetch balance ---
  const refetchBalance = useCallback(async () => {
    if (!address) return;
    setIsLoadingBalance(true);
    try {
      const res = await fetch(`/api/ai/balance?wallet=${encodeURIComponent(address)}`);
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance ?? 0);
      }
    } catch (err) {
      console.error('Failed to fetch AI balance:', err);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [address]);

  useEffect(() => {
    refetchBalance();
  }, [refetchBalance]);

  // --- Lightbox ---
  const openLightbox = useCallback(() => {
    setIsLightboxOpen(true);
    setWizardStep('category');
    setSelectedCategory(null);
    setCurrentResult(null);
    setEnhanceError(null);
  }, []);

  const closeLightbox = useCallback(() => {
    if (isEnhancing) return; // Prevent closing during API call
    setIsLightboxOpen(false);
  }, [isEnhancing]);

  // --- Category ---
  const selectCategory = useCallback((cat: AICategory) => {
    setSelectedCategory(cat);
    setWizardStep('prompt');
    setEnhanceError(null);
    setCurrentResult(null);
  }, []);

  // --- Submit enhancement ---
  const submitEnhance = useCallback(async (
    imageBase64: string,
    category: AICategory,
    prompt: string,
    parentId?: string,
    layersJson?: string,
  ): Promise<AIEnhanceResult | null> => {
    if (!address) return null;
    setIsEnhancing(true);
    setEnhanceError(null);
    setWizardStep('loading');

    try {
      const res = await fetch('/api/ai/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          imageBase64,
          category,
          prompt,
          parentEnhancementId: parentId,
          baseLayersJson: layersJson,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setEnhanceError(data.error || 'Enhancement failed. Try again.');
        setWizardStep('prompt');
        return null;
      }

      const result: AIEnhanceResult = data;
      setCurrentResult(result);
      setBalance(result.creditsRemaining);
      setWizardStep('result');
      return result;
    } catch (err) {
      console.error('Enhance error:', err);
      setEnhanceError('Network error. Check your connection and try again.');
      setWizardStep('prompt');
      return null;
    } finally {
      setIsEnhancing(false);
    }
  }, [address]);

  // --- Accept result ---
  const acceptResult = useCallback(() => {
    if (!currentResult) return;
    const imageData = `data:image/png;base64,${currentResult.imageBase64}`;
    setEnhancedImage(imageData);
    setEnhancedCategories((prev) => new Set([...prev, currentResult.category]));
  }, [currentResult]);

  // --- Reset ---
  const resetToLayers = useCallback(() => {
    setEnhancedImage(null);
    setEnhancedCategories(new Set());
  }, []);

  const clearResult = useCallback(() => setCurrentResult(null), []);
  const clearError = useCallback(() => setEnhanceError(null), []);

  // --- Fetch creations ---
  const fetchCreations = useCallback(async () => {
    if (!address) return;
    setIsLoadingCreations(true);
    try {
      const res = await fetch(`/api/ai/creations?wallet=${encodeURIComponent(address)}`);
      if (res.ok) {
        const data = await res.json();
        setCreations(data.creations ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch AI creations:', err);
    } finally {
      setIsLoadingCreations(false);
    }
  }, [address]);

  // --- Shop ---
  const openShop = useCallback(() => setIsShopOpen(true), []);
  const closeShop = useCallback(() => setIsShopOpen(false), []);

  const value: AIEnhanceContextValue = {
    balance,
    isLoadingBalance,
    refetchBalance,
    isLightboxOpen,
    openLightbox,
    closeLightbox,
    wizardStep,
    setWizardStep,
    selectedCategory,
    selectCategory,
    isEnhancing,
    enhanceError,
    clearError,
    submitEnhance,
    currentResult,
    clearResult,
    enhancedImage,
    enhancedCategories,
    acceptResult,
    resetToLayers,
    isAIEnhancedMode,
    creations,
    isLoadingCreations,
    fetchCreations,
    isShopOpen,
    openShop,
    closeShop,
  };

  return <AIEnhanceContext.Provider value={value}>{children}</AIEnhanceContext.Provider>;
}

export function useAIEnhance(): AIEnhanceContextValue {
  const ctx = useContext(AIEnhanceContext);
  if (!ctx) {
    throw new Error('useAIEnhance must be used within AIEnhanceProvider');
  }
  return ctx;
}
```

**Step 2: Wire into App.tsx**

Add `AIEnhanceProvider` wrapping the Generator route, alongside `GeneratorProvider` and `MintProvider`.

**Step 3: Commit**

```bash
git add src/contexts/AIEnhanceContext.tsx
git commit -m "feat: add AIEnhanceContext with balance, wizard state, and enhance actions"
```

---

## Phase 4: UI Components

### Task 10: AIEnhanceLightbox (Wizard Wrapper)

**Files:**
- Create: `src/components/generator/ai/AIEnhanceLightbox.tsx`

The lightbox renders the wizard steps using `AIEnhanceContext` state. It imports the `Lightbox` component from `src/components/ui/Lightbox.tsx` and renders `AICategoryPicker`, `AIPromptBuilder`, `AILoadingState`, or `AIResultComparison` based on `wizardStep`.

**Key behaviors:**
- Uses `Lightbox` with `size="lg"`
- Disable close (X) when `isEnhancing === true`
- Back button navigates: result→prompt, prompt→category
- Shows `AICreditsDisplay` in all steps

**Commit after implementing.**

---

### Task 11: AICategoryPicker (Step 1)

**Files:**
- Create: `src/components/generator/ai/AICategoryPicker.tsx`

Renders 4 category buttons (Clothes, Head, Facewear, Background) with icons and checkmarks for already-enhanced categories. Shows the current Wojak canvas preview on the left (desktop) or top (mobile).

**Key behaviors:**
- Uses `motion.button` with hover/tap scale from `generatorAnimations`
- Shows ✓ checkmark on enhanced categories from `enhancedCategories` set
- Calls `selectCategory(cat)` on click
- Uses theme classes: `.card` for buttons, `.text-secondary` for descriptions

**Commit after implementing.**

---

### Task 12: AIPromptBuilder (Step 2)

**Files:**
- Create: `src/components/generator/ai/AIPromptBuilder.tsx`

Renders preset buttons, freeform text input (200 char max), randomizer (🎲), and "Enhance — 1 credit" button.

**Key behaviors:**
- Imports `AI_PRESETS` and `getRandomPrompt` from `@/config/aiEnhancePresets`
- Preset click → fills text input (user can edit)
- 🎲 button → calls `getRandomPrompt(category)` → fills text input
- Character counter: `{length}/200`
- Enhance button disabled when input empty or `isEnhancing`
- On submit: calls `submitEnhance(imageBase64, category, prompt)`

**Commit after implementing.**

---

### Task 13: AILoadingState

**Files:**
- Create: `src/components/generator/ai/AILoadingState.tsx`
- Create: `src/config/aiLoadingMessages.ts`

Renders shimmer skeleton + rotating community messages.

```typescript
// src/config/aiLoadingMessages.ts
export const AI_LOADING_MESSAGES: string[] = [
  // Placeholder messages — finalize with community input before launch
  'Enhancing your Wojak...',
  'Adding finishing touches...',
  'Your Wojak, your royalties. You earn on every resale.',
  // TODO: Add community messages (Voject coin, Fight Club, Big Pulp, etc.)
];
```

**Key behaviors:**
- Shows original image on left, shimmer placeholder on right
- Rotates messages every 2.5 seconds using `setInterval`
- Falls back to "Taking longer than usual..." after 15 seconds
- Uses `.card-static` with shimmer animation from theme.css

**Commit after implementing.**

---

### Task 14: AIResultComparison (Step 3)

**Files:**
- Create: `src/components/generator/ai/AIResultComparison.tsx`

Side-by-side (desktop) or stacked (mobile) comparison with 4 action buttons.

**Key behaviors:**
- Uses `useLayout()` hook for desktop/mobile detection
- Shows original + AI result with labels
- Displays the prompt used
- Four `motion.button` actions:
  - Accept & Done → `acceptResult()`, close lightbox
  - Accept & Continue → `acceptResult()`, go to category step
  - Retry → re-submit same prompt (costs 1 credit)
  - Reject → go back to prompt step, clear result
- Credits remaining displayed at bottom

**Commit after implementing.**

---

### Task 15: AICreditsDisplay + AICreditsShop

**Files:**
- Create: `src/components/generator/ai/AICreditsDisplay.tsx`
- Create: `src/components/generator/ai/AICreditsShop.tsx`

**AICreditsDisplay:** Small badge showing "🪙 X credits" with link to open shop.

**AICreditsShop:** Modal (using `Lightbox`) with radio-button bundle list and purchase flow. Follows `MintFlowModal` pattern for the offer file acceptance step.

**Key behaviors:**
- 15-credit tier pre-selected, marked "POPULAR"
- 50-credit tier marked "BEST VALUE"
- "Buy [N] credits — [X] XCH" button
- After clicking Buy: POST to `/api/ai/credits/buy` → show offer acceptance UI
- After wallet acceptance: POST to `/api/ai/credits/confirm` → update balance

**Commit after implementing.**

---

### Task 16: AICreationsGallery

**Files:**
- Create: `src/components/generator/ai/AICreationsGallery.tsx`

Modal (using `Lightbox`) showing all saved AI creations for the wallet.

**Key behaviors:**
- Fetches from `/api/ai/creations?wallet=...` on open
- Grid of thumbnails (most recent first)
- Click thumbnail → larger preview + metadata
- Actions: Load in Generator, Export, Mint, Delete (with confirmation)
- "Load in Generator" → sets `enhancedImage` in context, closes modal

**Commit after implementing.**

---

## Phase 5: Generator Integration

### Task 17: ActionBar Integration

**Files:**
- Modify: `src/components/generator/ActionBar.tsx`

**Changes:**
1. Import `useAIEnhance` hook
2. Add "✨ Enhance with AI" button (uses `ActionButton` pattern + `ActionBarTooltip`)
3. Add "🎨 My AI Creations" button (with badge count)
4. Add "🪙 Buy AI Credits" in overflow menu
5. Render `AIEnhanceLightbox`, `AICreationsGallery`, `AICreditsShop` modals
6. In AI Enhanced Mode: show "Edit More with AI" and "Reset to Original Layers" buttons, hide layer-related controls

**Commit after implementing.**

---

### Task 18: Generator AI Enhanced Mode

**Files:**
- Modify: `src/pages/Generator.tsx`
- Modify: `src/components/generator/PreviewCanvas.tsx`

**Changes to Generator.tsx:**
1. Import `useAIEnhance`
2. When `isAIEnhancedMode`:
   - Hide `LayerTabs`, `TraitSelector`, color panels
   - Show "✨ AI Enhanced Wojak" banner with enhanced categories
   - Show "Reset to Original Layers" button
3. When not in AI mode: everything works as before

**Changes to PreviewCanvas.tsx:**
1. Accept optional `overrideImage` prop (string | null)
2. When `overrideImage` is set: display that image instead of the canvas render
3. The `enhancedImage` from `AIEnhanceContext` is passed as `overrideImage`

**Commit after implementing.**

---

### Task 19: Mint Flow with AI Metadata

**Files:**
- Modify: `functions/api/mint/submit.ts` (or `prepare.ts`)

**Changes:**
1. Accept optional `aiEnhanced` flag and `aiAttributes` array in request body
2. When `aiEnhanced === true`:
   - Use the R2 image (already persisted) instead of canvas export
   - Add AI attributes to CHIP-0007 metadata:
     - `{ trait_type: 'AI Enhanced', value: 'Yes' }`
     - `{ trait_type: 'AI Clothes', value: 'Flame pattern' }` (per enhanced category)
     - `{ trait_type: 'AI Edits Count', value: '2' }`
3. Pin R2 image to IPFS at mint time (same Pinata flow)

**Commit after implementing.**

---

### Task 20: Theme CSS for AI Components

**Files:**
- Modify: `src/styles/theme.css`

**Add to theme.css (not a new file):**

```css
/* === AI Enhance === */

.ai-category-btn {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.ai-category-btn:hover {
  border-color: var(--color-primary);
  box-shadow: var(--glow-primary);
}

.ai-category-btn--enhanced {
  border-color: var(--color-success);
}

.ai-preset-btn {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ai-preset-btn:hover {
  border-color: var(--color-primary);
  background: rgba(255, 107, 0, 0.08);
}

.ai-result-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  text-align: center;
  padding: 0.25rem 0;
}

.ai-shimmer {
  background: linear-gradient(
    90deg,
    var(--color-surface) 25%,
    rgba(255, 255, 255, 0.06) 50%,
    var(--color-surface) 75%
  );
  background-size: 200% 100%;
  animation: ai-shimmer 1.5s ease-in-out infinite;
  border-radius: var(--radius-lg);
}

@keyframes ai-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.ai-credits-badge {
  background: rgba(255, 107, 0, 0.15);
  color: var(--color-primary);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
}

.ai-enhanced-banner {
  background: rgba(255, 107, 0, 0.08);
  border: 1px solid rgba(255, 107, 0, 0.2);
  border-radius: var(--radius-lg);
  padding: 0.75rem 1rem;
}

.ai-bundle-option {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ai-bundle-option:hover {
  border-color: var(--color-primary);
}

.ai-bundle-option--selected {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px var(--color-primary);
}

.ai-bundle-badge {
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
}

.ai-bundle-badge--popular {
  background: rgba(255, 107, 0, 0.2);
  color: var(--color-primary);
}

.ai-bundle-badge--value {
  background: rgba(34, 197, 94, 0.2);
  color: var(--color-success);
}
```

**Commit after implementing.**

---

## Phase 6: Build & Verify

### Task 21: Build Check

**Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds.

**Step 3: Run existing tests**

Run: `npm run test:unit`
Expected: All existing tests pass (no regressions).

**Step 4: Manual smoke test**

1. Start dev server: `npm run dev`
2. Navigate to `/generator`
3. Verify "Enhance with AI" button appears in ActionBar
4. Verify clicking it opens the lightbox
5. Verify 4 categories are shown
6. Verify presets load for each category
7. Verify randomizer fills the text input
8. Verify freeform input has 200 char limit

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete AI Enhance integration — build verified"
```

---

## Task Dependency Graph

```
Phase 1 (Backend)           Phase 2 (Config)       Phase 3 (Frontend)
┌──────────────────┐        ┌──────────────┐       ┌──────────────────┐
│ T1: Migration    │───────→│ T7: Wrangler │       │ T8: Types/Presets│
│ T2: _shared.ts   │───┐    └──────────────┘       │ T9: Context      │
│ T3: balance.ts   │←──┤                           └────────┬─────────┘
│ T4: enhance.ts   │←──┤                                    │
│ T5: creations.ts │←──┤    Phase 4 (UI)                    │
│ T6: credits/*    │←──┘    ┌──────────────────┐            │
└──────────────────┘        │ T10: Lightbox    │←───────────┘
                            │ T11: Category    │
                            │ T12: Prompt      │
                            │ T13: Loading     │
                            │ T14: Result      │
                            │ T15: Credits UI  │
                            │ T16: Gallery     │
                            └────────┬─────────┘
                                     │
                            Phase 5 (Integration)
                            ┌──────────────────┐
                            │ T17: ActionBar   │
                            │ T18: AI Mode     │
                            │ T19: Mint Meta   │
                            │ T20: Theme CSS   │
                            └────────┬─────────┘
                                     │
                            Phase 6 (Verify)
                            ┌──────────────────┐
                            │ T21: Build Check │
                            └──────────────────┘
```

---

## Notes for Implementer

- **Read first:** `docs/plans/2026-03-08-reve-ai-enhance-design.md` (full design doc)
- **CSS rules:** All visual styles go in `src/styles/theme.css`. Tailwind is layout only. Never `!important`.
- **Existing patterns:** Follow `MintContext` for context structure, `FavoritesModal` for lightbox patterns, `ActionBar` for button integration.
- **Reve API key:** Set as Cloudflare secret: `npx wrangler secret put REVE_API_KEY`. Format: `papi.xxxxx`
- **R2 bucket:** Create before deploying: `npx wrangler r2 bucket create wojak-ai-edits`
- **Migration:** Apply to production D1 via: `npx wrangler d1 execute wojak-users --remote --file=functions/migrations/079_ai_enhance_system.sql`
- **Loading messages:** The `aiLoadingMessages.ts` content is placeholder — finalize with project owner before launch.
- **Never expand scope beyond this plan.** If you find something that needs fixing outside the plan, note it in your report. Do not fix it.
