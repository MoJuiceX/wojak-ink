import { bls12_381 } from '@noble/curves/bls12-381.js';

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
  background: { label: 'Background', icon: '\u{1F5BC}', freedom: 'enhance' },
};

// --- Prompt Templates (Pruna AI / Replicate) ---
// Tested format: [Action across target]. Preserve [everything else] and all other elements unchanged.
// This exact structure produced correct results in Replicate playground testing.

export type AIMode = 'enhance' | 'create_new';

export const PROMPT_TEMPLATES: Record<AICategory, Partial<Record<AIMode, string>>> = {
  clothes: {
    enhance:
      'Apply {user_prompt} across the clothing only. Preserve the character\'s face, headwear, background, and all other elements unchanged.',
    create_new:
      'Replace the clothing with {user_prompt}. Draw it in flat cartoon style with thick black outlines. Preserve the character\'s face, headwear, background, and all other elements unchanged.',
  },
  head: {
    enhance:
      'Apply {user_prompt} to the headwear only. Preserve the character\'s face, clothing, background, and all other elements unchanged.',
    create_new:
      'Replace the headwear with {user_prompt}. Draw it in flat cartoon style with thick black outlines. Preserve the character\'s face, clothing, background, and all other elements unchanged.',
  },
  facewear: {
    enhance:
      'Apply {user_prompt} to the face accessory only. Preserve the character\'s face, clothing, headwear, background, and all other elements unchanged.',
    create_new:
      'Add {user_prompt} as a face accessory in flat cartoon style with thick black outlines. Preserve the character\'s face, clothing, headwear, background, and all other elements unchanged.',
  },
  background: {
    enhance:
      'Add {user_prompt} in the background behind the character. Preserve the character exactly — same size, position, pose, outfit, and all other elements unchanged.',
    create_new:
      'Replace the background with {user_prompt}. Preserve the character exactly — same size, position, pose, outfit, and all other elements unchanged.',
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
  REPLICATE_API_TOKEN?: string;
  AI_EDITS_BUCKET?: R2Bucket;
  SPACESCAN_API_KEY?: string;
}

// --- Spacescan Helpers ---

/**
 * Check the on-chain mojo balance of a Chia address via Spacescan.
 * Returns mojos as a number, or null if the address has no balance or the
 * request fails. Each purchase has its own dedicated address so any balance
 * on that address is proof of payment.
 */
export async function getAddressBalance(address: string, apiKey?: string): Promise<number | null> {
  try {
    const url = `https://api.spacescan.io/address/xch-balance/${address}`;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'wojak.ink/1.0',
    };
    if (apiKey) headers['x-api-key'] = apiKey;
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const data = await res.json() as { status?: string; mojo?: number };
    if (data.status !== 'success' || typeof data.mojo !== 'number') return null;
    return data.mojo;
  } catch {
    return null;
  }
}

// --- Purchase Helpers ---

/**
 * Mark a purchase as expired and release its payment address back to the pool.
 */
export async function expireAndReleasePurchase(
  db: D1Database,
  purchaseId: number,
  paymentAddress: string | null,
): Promise<void> {
  await db.prepare(`UPDATE ai_credit_purchases SET status = 'expired' WHERE id = ?`).bind(purchaseId).run();
  if (paymentAddress) {
    await db.prepare(`UPDATE ai_payment_addresses SET purchase_id = NULL WHERE address = ?`).bind(paymentAddress).run();
  }
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
 *
 * @param hexDecode - When true, hex-decodes the message bytes before hashing
 * (older Sage wallet behaviour). When false, uses UTF-8 encoded message bytes
 * (newer Sage wallet behaviour where message is treated as a plain string).
 */
async function chiaMessageHash(message: string, hexDecode: boolean): Promise<Uint8Array> {
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

  const isHex = /^[0-9a-fA-F]+$/.test(message) && message.length % 2 === 0;
  const messageBytes = (hexDecode && isHex) ? hexToBytes(message) : encoder.encode(message);

  const prefixHash = await atomHash(encoder.encode('Chia Signed Message'));
  const messageHash = await atomHash(messageBytes);
  return pairHash(prefixHash, messageHash);
}

const AUG_DST = 'BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_AUG_';

/**
 * Verify a Chia BLS12-381 signature (CHIP-0002 / AugSchemeMPL).
 *
 * Tries both hex-decoded and UTF-8 message interpretations to handle
 * different Sage wallet versions (some hex-decode the nonce before hashing,
 * others treat it as a plain string). Returns true if either passes.
 */
export async function verifyChiaSignature(
  message: string,
  signatureHex: string,
  pubkeyHex: string,
): Promise<boolean> {
  try {
    // @noble/curves v2 API: sign/verify use Point objects, not raw bytes.
    // Must hash-to-curve manually and deserialize pubkey/sig from hex.
    const pubPoint = bls12_381.G1.Point.fromHex(pubkeyHex);
    const sigPoint = bls12_381.longSignatures.Signature.fromHex(signatureHex);
    const pubBytes = pubPoint.toBytes();

    for (const hexDecode of [true, false]) {
      try {
        const msgHash = await chiaMessageHash(message, hexDecode);
        // AugSchemeMPL: augmented message = pubkey_bytes || message_hash
        const augMsg = new Uint8Array(pubBytes.length + msgHash.length);
        augMsg.set(pubBytes, 0);
        augMsg.set(msgHash, pubBytes.length);
        // Hash augmented message to G2 curve point
        const msgG2 = bls12_381.G2.hashToCurve(augMsg, { DST: AUG_DST });
        if (bls12_381.longSignatures.verify(sigPoint, msgG2, pubPoint)) {
          return true;
        }
      } catch {
        // try the other interpretation
      }
    }
    return false;
  } catch (err) {
    console.error('[AI Auth] BLS verify error:', err);
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
