# Wallet Signature Authentication — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Protect all AI credit endpoints with BLS12-381 wallet signature authentication so only wallet owners can spend/view their credits.

**Architecture:** Challenge-response auth using CHIP-0002 message signing. Two new public endpoints (`/challenge`, `/verify`) issue 24-hour session tokens. All existing AI endpoints switch from trusting client-supplied wallet addresses to extracting wallet from server-side session lookup. Uses `@noble/curves` for BLS verification in Cloudflare Workers.

**Tech Stack:** `@noble/curves` (BLS12-381), Cloudflare Workers, D1 (SQLite), Sage Wallet via WalletConnect

**Design doc:** `docs/plans/2026-03-09-wallet-auth-design.md`

---

### Task 1: Install `@noble/curves` dependency

**Files:**
- Modify: `package.json`

**Step 1: Install the package**

Run:
```bash
npm install @noble/curves
```

**Step 2: Verify install**

Run:
```bash
node -e "const { bls12_381 } = require('@noble/curves/bls12-381'); console.log('BLS12-381 loaded OK');"
```
Expected: `BLS12-381 loaded OK`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add @noble/curves for BLS12-381 signature verification"
```

---

### Task 2: Database migration — `ai_auth_sessions` table

**Files:**
- Create: `functions/migrations/082_ai_auth_sessions.sql`

**Step 1: Write migration**

```sql
-- 082_ai_auth_sessions.sql
-- Wallet signature authentication sessions for AI credit endpoints.
-- Flow: challenge (nonce) → verify (BLS sig) → session_token (24h TTL).

CREATE TABLE IF NOT EXISTS ai_auth_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  session_token TEXT UNIQUE,
  public_key TEXT,
  nonce TEXT,
  nonce_expires_at TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_auth_token ON ai_auth_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_ai_auth_wallet ON ai_auth_sessions(wallet_address);
```

**Step 2: Verify syntax**

Run:
```bash
cat functions/migrations/082_ai_auth_sessions.sql
```
Expected: Clean SQL, no syntax errors.

**Step 3: Commit**

```bash
git add functions/migrations/082_ai_auth_sessions.sql
git commit -m "migration: 082 add ai_auth_sessions table for wallet signature auth"
```

---

### Task 3: Auth utilities — BLS verification + session middleware in `_shared.ts`

**Files:**
- Modify: `functions/api/ai/_shared.ts` (append after line 122)

**Step 1: Add CHIP-0002 message hash + BLS verify + `requireAuth` middleware**

Append the following after the existing `getAICreditBalance` function (after line 122):

```typescript
// --- BLS Signature Verification (CHIP-0002) ---

import { bls12_381 } from '@noble/curves/bls12-381';

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
    // Chia uses G2 signatures (96 bytes) with G1 public keys (48 bytes)
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
  return generateNonce(64); // 128 hex chars = 512-bit entropy
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

  const token = authHeader.slice(7); // Remove "Bearer " prefix
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
```

**Important:** The `import { bls12_381 }` statement must go at the top of the file with other imports. Move it there during implementation.

**Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```
Expected: Zero errors.

**Step 3: Commit**

```bash
git add functions/api/ai/_shared.ts
git commit -m "feat: add BLS signature verification and session auth middleware"
```

---

### Task 4: Auth endpoints — `/challenge` and `/verify`

**Files:**
- Create: `functions/api/ai/auth/challenge.ts`
- Create: `functions/api/ai/auth/verify.ts`

**Step 1: Create challenge endpoint**

`functions/api/ai/auth/challenge.ts`:
```typescript
// functions/api/ai/auth/challenge.ts
import { jsonResponse, errorResponse, optionsResponse, generateNonce } from '../_shared';
import type { AIEnv } from '../_shared';
import { isValidChiaAddress } from '../../../lib/validation';

const NONCE_EXPIRY_MINUTES = 5;

export const onRequest: PagesFunction<AIEnv> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);

  let body: { walletAddress?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  const { walletAddress } = body;
  if (!walletAddress || !isValidChiaAddress(walletAddress)) {
    return errorResponse('Missing or invalid walletAddress', 400);
  }

  // Clean up expired sessions for this wallet
  await env.DB
    .prepare(`DELETE FROM ai_auth_sessions WHERE wallet_address = ? AND expires_at < datetime('now')`)
    .bind(walletAddress)
    .run();

  // Also clean up stale nonces (uncompleted challenges)
  await env.DB
    .prepare(
      `DELETE FROM ai_auth_sessions
       WHERE wallet_address = ? AND session_token IS NULL AND nonce_expires_at < datetime('now')`
    )
    .bind(walletAddress)
    .run();

  const nonce = generateNonce();
  const nonceExpiresAt = new Date(Date.now() + NONCE_EXPIRY_MINUTES * 60 * 1000).toISOString();
  // Session expires_at is set to nonce expiry initially; updated to 24h on verify
  await env.DB
    .prepare(
      `INSERT INTO ai_auth_sessions (wallet_address, nonce, nonce_expires_at, expires_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind(walletAddress, nonce, nonceExpiresAt, nonceExpiresAt)
    .run();

  return jsonResponse({ nonce, expiresAt: nonceExpiresAt });
};
```

**Step 2: Create verify endpoint**

`functions/api/ai/auth/verify.ts`:
```typescript
// functions/api/ai/auth/verify.ts
import {
  jsonResponse,
  errorResponse,
  optionsResponse,
  verifyChiaSignature,
  generateSessionToken,
} from '../_shared';
import type { AIEnv } from '../_shared';
import { isValidChiaAddress } from '../../../lib/validation';

const SESSION_TTL_HOURS = 24;

export const onRequest: PagesFunction<AIEnv> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);

  let body: { walletAddress?: string; nonce?: string; signature?: string; publicKey?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 400);
  }

  const { walletAddress, nonce, signature, publicKey } = body;

  if (!walletAddress || !isValidChiaAddress(walletAddress)) {
    return errorResponse('Missing or invalid walletAddress', 400);
  }
  if (!nonce || nonce.length < 32) {
    return errorResponse('Missing or invalid nonce', 400);
  }
  if (!signature || signature.length < 96) {
    return errorResponse('Missing or invalid signature', 400);
  }
  if (!publicKey || publicKey.length < 48) {
    return errorResponse('Missing or invalid publicKey', 400);
  }

  // Look up the pending challenge
  const row = await env.DB
    .prepare(
      `SELECT id, nonce, nonce_expires_at FROM ai_auth_sessions
       WHERE wallet_address = ? AND nonce = ? AND session_token IS NULL`
    )
    .bind(walletAddress, nonce)
    .first<{ id: number; nonce: string; nonce_expires_at: string }>();

  if (!row) {
    return errorResponse('Invalid or expired nonce. Request a new challenge.', 400);
  }

  if (new Date(row.nonce_expires_at) < new Date()) {
    // Clean up expired nonce
    await env.DB.prepare(`DELETE FROM ai_auth_sessions WHERE id = ?`).bind(row.id).run();
    return errorResponse('Nonce expired. Request a new challenge.', 410);
  }

  // Verify BLS signature (CHIP-0002)
  const isValid = await verifyChiaSignature(nonce, signature, publicKey);
  if (!isValid) {
    return errorResponse('Signature verification failed.', 403);
  }

  // Create session token
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString();

  await env.DB
    .prepare(
      `UPDATE ai_auth_sessions
       SET session_token = ?, public_key = ?, nonce = NULL, nonce_expires_at = NULL, expires_at = ?
       WHERE id = ?`
    )
    .bind(sessionToken, publicKey, expiresAt, row.id)
    .run();

  return jsonResponse({ sessionToken, expiresAt });
};
```

**Step 3: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```
Expected: Zero errors.

**Step 4: Commit**

```bash
git add functions/api/ai/auth/challenge.ts functions/api/ai/auth/verify.ts
git commit -m "feat: add auth challenge + verify endpoints for wallet signature auth"
```

---

### Task 5: Protect existing endpoints — use `requireAuth` middleware

**Files:**
- Modify: `functions/api/ai/balance.ts`
- Modify: `functions/api/ai/enhance.ts`
- Modify: `functions/api/ai/credits/buy.ts`
- Modify: `functions/api/ai/credits/confirm.ts`
- Modify: `functions/api/ai/creations.ts`

**Goal:** Each endpoint stops trusting client-supplied `walletAddress`. Instead, it calls `requireAuth()` to extract the wallet from the session token.

**Step 1: Update `balance.ts`**

Replace the wallet extraction logic. The endpoint currently reads `wallet` from query params. Change to:

```typescript
import { jsonResponse, errorResponse, optionsResponse, getAICreditBalance, requireAuth } from './_shared';
import type { AIEnv } from './_shared';

export const onRequest: PagesFunction<AIEnv> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'GET') return errorResponse('Method not allowed', 405);

  // Auth: extract wallet from session token
  const auth = await requireAuth(request, env.DB);
  if (auth instanceof Response) return auth;
  const wallet = auth.walletAddress;

  try {
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
  } catch (err) {
    console.error('AI balance error:', err);
    return errorResponse('Internal error', 500);
  }
};
```

**Step 2: Update `enhance.ts`**

At the top of the handler, after OPTIONS/method checks, replace the walletAddress extraction:

```typescript
// Replace lines 39-41 (the walletAddress validation) with:
const auth = await requireAuth(request, env.DB);
if (auth instanceof Response) return auth;
const walletAddress = auth.walletAddress;
```

Remove `walletAddress` from the body destructuring (line 36). Keep extracting `imageBase64`, `category`, `prompt`, `mode`, `parentEnhancementId`, `baseLayersJson` from body.

**Step 3: Update `credits/buy.ts`**

At the top of the handler, after OPTIONS/method checks:

```typescript
// Replace lines 23-25 (the walletAddress validation) with:
const auth = await requireAuth(request, env.DB);
if (auth instanceof Response) return auth;
const walletAddress = auth.walletAddress;
```

Remove `walletAddress` from the body destructuring. Keep extracting `tier` from body.

**Step 4: Update `credits/confirm.ts`**

At the top of the handler, after OPTIONS/method checks:

```typescript
// Replace lines 57-59 (the walletAddress validation) with:
const auth = await requireAuth(request, env.DB);
if (auth instanceof Response) return auth;
const walletAddress = auth.walletAddress;
```

Remove `walletAddress` from the body destructuring. Keep extracting `purchaseId` from body.

**Step 5: Update `creations.ts`**

Replace wallet extraction from query params:

```typescript
import { jsonResponse, errorResponse, optionsResponse, requireAuth } from './_shared';
import type { AIEnv } from './_shared';

export const onRequest: PagesFunction<AIEnv> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'GET') return errorResponse('Method not allowed', 405);

  // Auth: extract wallet from session token
  const auth = await requireAuth(request, env.DB);
  if (auth instanceof Response) return auth;
  const wallet = auth.walletAddress;

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 100);

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

    const creations = (rows.results ?? []).map((row: Record<string, unknown>) => ({
      id: row.id,
      r2Key: row.r2_key,
      category: row.category,
      prompt: row.prompt,
      parentEnhancementId: row.parent_enhancement_id,
      createdAt: row.created_at,
    }));

    return jsonResponse({ creations, total: creations.length });
  } catch (err) {
    console.error('AI creations error:', err);
    return errorResponse('Internal error', 500);
  }
};
```

**Step 6: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```
Expected: Zero errors.

**Step 7: Commit**

```bash
git add functions/api/ai/balance.ts functions/api/ai/enhance.ts functions/api/ai/credits/buy.ts functions/api/ai/credits/confirm.ts functions/api/ai/creations.ts
git commit -m "feat: protect all AI endpoints with session auth middleware"
```

---

### Task 6: Frontend — auth flow in `AIEnhanceContext.tsx`

**Files:**
- Modify: `src/contexts/AIEnhanceContext.tsx`

**Goal:** When wallet connects, auto-trigger challenge → sign → verify flow. Store session token. Include `Authorization: Bearer <token>` header on all AI API calls. Re-auth on 401.

**Step 1: Add auth state and flow**

Add to the context interface (after `isShopOpen`):

```typescript
// Auth state
isAuthenticating: boolean;
isAuthenticated: boolean;
authenticate: () => Promise<void>;
```

Add to the provider state:

```typescript
const [sessionToken, setSessionToken] = useState<string | null>(null);
const [isAuthenticating, setIsAuthenticating] = useState(false);
const isAuthenticated = sessionToken !== null;
```

Add the `authenticate` function:

```typescript
const authenticate = useCallback(async () => {
  if (!address || !signMessage) return;
  setIsAuthenticating(true);
  try {
    // Step 1: Request challenge nonce
    const challengeRes = await fetch('/api/ai/auth/challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: address }),
    });
    if (!challengeRes.ok) throw new Error('Challenge request failed');
    const { nonce } = await challengeRes.json();

    // Step 2: Sign with Sage Wallet
    const { signature, publicKey } = await signMessage(nonce);

    // Step 3: Verify and get session token
    const verifyRes = await fetch('/api/ai/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: address,
        nonce,
        signature,
        publicKey,
      }),
    });
    if (!verifyRes.ok) throw new Error('Verification failed');
    const { sessionToken: token } = await verifyRes.json();

    setSessionToken(token);
  } catch (err) {
    console.error('[AI Auth] Authentication failed:', err);
    setSessionToken(null);
  } finally {
    setIsAuthenticating(false);
  }
}, [address, signMessage]);
```

Note: `signMessage` comes from `useSageWallet()`. Add it to the destructuring at the top:

```typescript
const { address, signMessage } = useSageWallet();
```

**Step 2: Auto-authenticate on wallet connect**

Add a useEffect that triggers auth when `address` changes:

```typescript
useEffect(() => {
  if (address && !sessionToken && !isAuthenticating) {
    authenticate();
  }
  if (!address) {
    setSessionToken(null);
  }
}, [address]); // Only react to address changes
```

**Step 3: Create auth header helper**

```typescript
const authHeaders = useCallback((): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
  }
  return headers;
}, [sessionToken]);
```

**Step 4: Update all fetch calls to use auth headers**

Update `refetchBalance` (line ~114):
```typescript
const res = await fetch('/api/ai/balance', {
  headers: authHeaders(),
});
```
(Remove the `?wallet=` query param — backend now uses session.)

Update `submitEnhance` (line ~193):
```typescript
const res = await fetch('/api/ai/enhance', {
  method: 'POST',
  headers: authHeaders(),
  body: JSON.stringify({
    imageBase64: imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64,
    category,
    prompt,
    mode: selectedMode ?? 'enhance',
    parentEnhancementId: parentId,
    baseLayersJson: layersJson,
  }),
});
```
(Remove `walletAddress` from the body — backend uses session.)

Update `fetchCreations` (line ~256):
```typescript
const res = await fetch('/api/ai/creations', {
  headers: authHeaders(),
});
```
(Remove the `?wallet=` query param.)

**Step 5: Add 401 re-auth handling**

In each fetch call's response handling, add re-auth on 401. Create a helper:

```typescript
const handleAuthError = useCallback(async (res: Response): Promise<boolean> => {
  if (res.status === 401) {
    setSessionToken(null);
    await authenticate();
    return true; // Caller should retry
  }
  return false;
}, [authenticate]);
```

Use in `refetchBalance`:
```typescript
if (!res.ok) {
  if (await handleAuthError(res)) return refetchBalance();
  return;
}
```

**Step 6: Update `AICreditsShop.tsx` fetch calls**

The shop component calls `/api/ai/credits/buy` and `/api/ai/credits/confirm`. It needs the session token.

Expose `authHeaders` from the context (or pass `sessionToken` to the shop). The simplest approach: add `sessionToken` to the context value and use it in the shop's fetch headers.

Add to the context interface:
```typescript
sessionToken: string | null;
```

In `AICreditsShop.tsx`, update buy/confirm fetch calls:
```typescript
const res = await fetch('/api/ai/credits/buy', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {}),
  },
  body: JSON.stringify({ tier: selectedBundle.tier }),
});
```
(Remove `walletAddress` from the body.)

Same pattern for the confirm call — remove `walletAddress`, add auth header.

**Step 7: Verify TypeScript compiles and build passes**

Run:
```bash
npx tsc --noEmit && npm run build
```
Expected: Zero errors.

**Step 8: Commit**

```bash
git add src/contexts/AIEnhanceContext.tsx src/components/generator/ai/AICreditsShop.tsx
git commit -m "feat: frontend wallet auth flow — auto sign-in + auth headers on all AI calls"
```

---

### Task 7: CORS — ensure `Authorization` header is allowed

**Files:**
- Verify: `functions/api/ai/_shared.ts` (line 9)

**Step 1: Verify CORS headers include Authorization**

Check line 9 of `_shared.ts`:
```typescript
'Access-Control-Allow-Headers': 'Content-Type, Authorization',
```

This is already correct — `Authorization` is listed. No change needed.

**Step 2: Verify OPTIONS preflight works for auth endpoints**

Both `challenge.ts` and `verify.ts` return `optionsResponse()` for OPTIONS requests — this is correct.

No commit needed for this task.

---

### Task 8: Build + type-check verification

**Files:** None (verification only)

**Step 1: TypeScript check**

Run:
```bash
npx tsc --noEmit
```
Expected: Zero errors.

**Step 2: Full build**

Run:
```bash
npm run build
```
Expected: Clean build with no errors.

**Step 3: Verify all endpoints have auth**

Grep to confirm no endpoint still reads wallet from query/body:
```bash
grep -rn "searchParams.get('wallet')" functions/api/ai/
grep -rn "body.walletAddress\|body\.wallet" functions/api/ai/ --include="*.ts" | grep -v auth/
```
Expected: Zero results from both (all wallet extraction moved to `requireAuth`).

---

## File Change Summary

| File | Action |
|------|--------|
| `package.json` | Add `@noble/curves` |
| `functions/migrations/082_ai_auth_sessions.sql` | **NEW** — auth sessions table |
| `functions/api/ai/_shared.ts` | Add BLS verification, `requireAuth` middleware |
| `functions/api/ai/auth/challenge.ts` | **NEW** — nonce generation endpoint |
| `functions/api/ai/auth/verify.ts` | **NEW** — signature verification + session creation |
| `functions/api/ai/balance.ts` | Switch from query param to `requireAuth` |
| `functions/api/ai/enhance.ts` | Switch from body param to `requireAuth` |
| `functions/api/ai/credits/buy.ts` | Switch from body param to `requireAuth` |
| `functions/api/ai/credits/confirm.ts` | Switch from body param to `requireAuth` |
| `functions/api/ai/creations.ts` | Switch from query param to `requireAuth` |
| `src/contexts/AIEnhanceContext.tsx` | Auth flow, session token, auth headers |
| `src/components/generator/ai/AICreditsShop.tsx` | Auth headers on buy/confirm calls |

## Parallelization Notes

Tasks can be grouped for parallel execution:

- **Agent A:** Tasks 1-3 (dependency install, migration, _shared.ts utilities)
- **Agent B:** Task 4 (auth endpoints — depends on Task 3 for imports)
- **Agent C:** Task 5 (protect existing endpoints — depends on Task 3 for `requireAuth`)
- **Agent D:** Task 6 (frontend auth flow — independent of backend changes)

Recommended order: Task 1 → Task 2 + Task 3 → Task 4 + Task 5 (parallel) → Task 6 → Task 7 + Task 8

Or more practically:
- **Agent A:** Tasks 1 + 2 + 3 (backend foundation)
- **Agent B:** Tasks 4 + 5 (backend endpoints — after Agent A)
- **Agent C:** Task 6 (frontend — can start after Agent A finishes)
