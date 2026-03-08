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

// --- Art Style Anchor ---
// Concise style description for Reve's auto-enhancement to build on.
// Kept short because Reve auto-enhances the edit_instruction internally.

const STYLE =
  'Wojak meme-style illustration with thick black outlines, flat solid colors, no gradients, no shading, no photorealism.';

// --- Prompt Templates ---
// Now mode-aware: each category has templates for 'enhance' and/or 'create_new'.

export type AIMode = 'enhance' | 'create_new';

export const PROMPT_TEMPLATES: Record<AICategory, Partial<Record<AIMode, string>>> = {
  clothes: {
    enhance:
      `${STYLE} Edit ONLY the clothing: {user_prompt}. Keep the same clothing shape and structure. Keep thick black outlines and flat color fills. Preserve all logos, emblems, and markings on other areas. Do not change face, head, skin, headwear, or background.`,
    create_new:
      `${STYLE} Replace the clothing entirely with: {user_prompt}. Keep thick black outlines and flat solid color fills. Keep the character's pose, face, skin, head, and background completely unchanged.`,
  },
  head: {
    enhance:
      `${STYLE} Edit ONLY the headwear: {user_prompt}. Keep the same headwear shape and structure. Keep thick black outlines and flat color fills. Preserve all logos, emblems, and markings on other areas. Do not change face, clothing, skin, or background.`,
    create_new:
      `${STYLE} Replace the headwear entirely with: {user_prompt}. Keep thick black outlines and flat solid color fills. Keep the character's face, clothing, skin, and background completely unchanged.`,
  },
  facewear: {
    enhance:
      `${STYLE} Edit ONLY the face accessory: {user_prompt}. Keep the same accessory shape and structure. Keep thick black outlines and flat color fills. Preserve all existing details on other areas. Do not change clothing, headwear, or background.`,
    create_new:
      `${STYLE} Add face accessory: {user_prompt}. Use thick black outlines and flat colors matching the illustration. Position naturally on the face, sitting under any hat brim. Preserve all existing details on other areas. Do not change clothing, headwear, or background.`,
  },
  background: {
    create_new:
      `${STYLE} Replace ONLY the background: {user_prompt}. Draw the background in the same flat cartoon illustration style with thick black outlines and solid color fills — no photorealism, no gradients, no realistic textures. Apply a very subtle soft-focus blur to the entire background for depth-of-field. Keep the center area mostly empty and clear so the character is unobstructed. Place scene details on the edges — top-left, top-right, left side, right side — with the middle open. Keep the character completely unchanged and sharp — same pose, outfit, colors, line-art. Preserve all details on the character.`,
  },
};

export function buildConstrainedPrompt(category: AICategory, userPrompt: string, mode: AIMode = 'enhance'): string {
  const categoryTemplates = PROMPT_TEMPLATES[category];
  const template = categoryTemplates[mode] ?? categoryTemplates.create_new ?? '';
  return template.replace('{user_prompt}', userPrompt.trim());
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
