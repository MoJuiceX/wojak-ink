import { bls12_381 } from '@noble/curves/bls12-381';

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
  { tier: '1',  credits: 1,  priceXch: 0.10, mojos: 100_000_000_000n },
  { tier: '10', credits: 10, priceXch: 0.80, mojos: 800_000_000_000n },
  { tier: '25', credits: 25, priceXch: 1.50, mojos: 1_500_000_000_000n },
  { tier: '50', credits: 50, priceXch: 2.40, mojos: 2_400_000_000_000n },
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
// Strong style anchor to keep Reve faithful to the wojak illustration style.
// Emphasizes preservation of the original character at all costs.

const STYLE =
  'Wojak meme-style illustration with thick black outlines, flat solid colors, no gradients, no shading, no photorealism.';

const PRESERVE =
  'CRITICAL: The character MUST remain EXACTLY the same size, position, proportions, and zoom level as the reference image. Do NOT resize, zoom out, crop, reposition, or redraw the character. Maintain pixel-perfect fidelity to the original character illustration including all line weights, facial features, and color fills.';

// --- Prompt Templates ---
// Now mode-aware: each category has templates for 'enhance' and/or 'create_new'.

export type AIMode = 'enhance' | 'create_new';

export const PROMPT_TEMPLATES: Record<AICategory, Partial<Record<AIMode, string>>> = {
  clothes: {
    enhance:
      `${STYLE} ${PRESERVE} Edit ONLY the clothing: {user_prompt}. Keep the same clothing shape and structure. Keep thick black outlines and flat color fills. Preserve all logos, emblems, and markings on other areas. Do not change face, head, skin, headwear, or background. Do not change the character's size or position.`,
    create_new:
      `${STYLE} ${PRESERVE} Replace the clothing entirely with: {user_prompt}. Keep thick black outlines and flat solid color fills. Keep the character's pose, face, skin, head, and background completely unchanged. Do not change the character's size or position.`,
  },
  head: {
    enhance:
      `${STYLE} ${PRESERVE} Edit ONLY the headwear: {user_prompt}. Keep the same headwear shape and structure. Keep thick black outlines and flat color fills. Preserve all logos, emblems, and markings on other areas. Do not change face, clothing, skin, or background. Do not change the character's size or position.`,
    create_new:
      `${STYLE} ${PRESERVE} Replace the headwear entirely with: {user_prompt}. Keep thick black outlines and flat solid color fills. Keep the character's face, clothing, skin, and background completely unchanged. Do not change the character's size or position.`,
  },
  facewear: {
    enhance:
      `${STYLE} ${PRESERVE} Edit ONLY the face accessory: {user_prompt}. Keep the same accessory shape and structure. Keep thick black outlines and flat color fills. Preserve all existing details on other areas. Do not change clothing, headwear, or background.`,
    create_new:
      `${STYLE} ${PRESERVE} Add face accessory: {user_prompt}. Use thick black outlines and flat colors matching the illustration. Position naturally on the face, sitting under any hat brim. Preserve all existing details on other areas. Do not change clothing, headwear, or background.`,
  },
  background: {
    create_new:
      `${STYLE} ${PRESERVE} Replace ONLY the background: {user_prompt}. IMPORTANT STYLE RULES: Draw the background as a simple, minimalistic flat cartoon — like a Wojak meme background. Use only flat solid color fills, thick black outlines, and very simple shapes. NO realistic detail, NO complex textures, NO photorealism, NO gradients, NO lighting effects, NO shadows, NO 3D depth. Think simple MS Paint-level drawing with clean shapes. Apply a gentle gaussian blur to the entire background so it sits behind the character. COMPOSITION: The center of the image MUST be empty and clear — no objects, no detail, no visual clutter in the middle. ALL scene elements (furniture, walls, objects, landscape features) go ONLY on the far left edge, far right edge, top edge, and bottom edge. The middle 50% of the background should be a simple flat color or very minimal. The character must remain EXACTLY the same — same size, same position, same pose, same outfit, same colors, same line-art, same zoom level. Do not alter the character in any way.`,
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
        COALESCE((SELECT SUM(credits_purchased) FROM ai_credit_purchases WHERE wallet_address = ? AND status = 'confirmed'), 0) +
        COALESCE((SELECT SUM(credits_earned) FROM ai_credit_events WHERE wallet_address = ?), 0) -
        COALESCE((SELECT SUM(credits_spent) FROM ai_credit_usage WHERE wallet_address = ?), 0)
        AS balance`
    )
    .bind(wallet, wallet, wallet)
    .first<{ balance: number }>();
  return result?.balance ?? 0;
}

// --- BLS Signature Verification (CHIP-0002) ---

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compute the CHIP-0002 message hash for Chia signed messages.
 * Signs the CLVM tree hash of ("Chia Signed Message" . <raw_message>).
 */
async function chiaMessageHash(message: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();

  async function atomHash(data: Uint8Array): Promise<Uint8Array> {
    const buf = new Uint8Array(1 + data.length);
    buf[0] = 0x01;
    buf.set(data, 1);
    return new Uint8Array(await crypto.subtle.digest('SHA-256', buf));
  }

  async function pairHash(left: Uint8Array, right: Uint8Array): Promise<Uint8Array> {
    const buf = new Uint8Array(1 + 32 + 32);
    buf[0] = 0x02;
    buf.set(left, 1);
    buf.set(right, 33);
    return new Uint8Array(await crypto.subtle.digest('SHA-256', buf));
  }

  const prefixHash = await atomHash(encoder.encode('Chia Signed Message'));
  const messageHash = await atomHash(encoder.encode(message));
  return pairHash(prefixHash, messageHash);
}

/**
 * Verify a Chia BLS12-381 signature (CHIP-0002 standard).
 * Returns true if the signature is valid for the given message and public key.
 */
export async function verifyChiaSignature(
  message: string,
  signatureHex: string,
  pubkeyHex: string,
): Promise<boolean> {
  try {
    const msgHash = await chiaMessageHash(message);
    const signature = hexToBytes(signatureHex);
    const pubkey = hexToBytes(pubkeyHex);
    return bls12_381.verify(signature, msgHash, pubkey);
  } catch {
    return false;
  }
}

/**
 * Generate a crypto-random hex nonce.
 */
export function generateNonce(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return bytesToHex(arr);
}

/**
 * Generate a crypto-random session token.
 */
export function generateSessionToken(): string {
  return generateNonce(64);
}

// --- Session Auth Middleware ---

export interface AuthSession {
  walletAddress: string;
  sessionId: number;
}

/**
 * Extract and validate session token from Authorization header.
 * Returns the authenticated wallet address or an error response.
 */
export async function requireAuth(request: Request, db: D1Database): Promise<AuthSession | Response> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse('Authentication required. Connect your wallet.', 401);
  }

  const token = authHeader.slice(7);
  if (!token || token.length < 64) {
    return errorResponse('Invalid session token.', 401);
  }

  const session = await db
    .prepare(
      `SELECT id, wallet_address FROM ai_auth_sessions
       WHERE session_token = ? AND expires_at > datetime('now')`
    )
    .bind(token)
    .first<{ id: number; wallet_address: string }>();

  if (!session) {
    return errorResponse('Session expired. Please reconnect your wallet.', 401);
  }

  return { walletAddress: session.wallet_address, sessionId: session.id };
}
