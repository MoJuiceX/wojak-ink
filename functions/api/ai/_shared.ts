/**
 * AI Enhance shared constants, types, and utilities.
 * Mirrors the pattern from functions/api/mint/_shared.ts.
 */

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
  clothes:    { label: 'Clothes',    icon: '\u{1F455}', freedom: 'enhance' },
  head:       { label: 'Head',       icon: '\u{1F3A9}', freedom: 'enhance' },
  facewear:   { label: 'Facewear',   icon: '\u{1F3AD}', freedom: 'free' },
  background: { label: 'Background', icon: '\u{1F5BC}', freedom: 'free' },
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
