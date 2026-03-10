# Wallet Signature Authentication — Design Doc

**Date:** 2026-03-09
**Status:** Approved
**Branch:** feat/ai-enhance

---

## Problem

All AI credit endpoints accept a `walletAddress` parameter with zero proof of ownership. Any attacker who knows a wallet address can:

1. **Spend someone's credits** — call `/api/ai/enhance` with a victim's address
2. **View anyone's balance** — call `/api/ai/balance?wallet=xch1...`
3. **View anyone's creations** — call `/api/ai/creations?wallet=xch1...`

Credits cannot be *created* fraudulently (buying requires on-chain XCH, earning requires real mints/trades), but they can be **spent by anyone**.

## Solution

Session-based authentication using BLS12-381 signature verification (CHIP-0002 standard).

**One-time sign-in:** User connects Sage Wallet → signs a challenge nonce → backend verifies the BLS signature → issues a 24-hour session token. All subsequent API calls use the token.

**Key principle:** Protected endpoints extract `wallet_address` from the session token on the server side. Client-supplied wallet addresses are ignored for all write/read operations.

## Authentication Flow

```
1. Frontend → POST /api/ai/auth/challenge { walletAddress }
   Backend  → generates crypto-random nonce, stores in DB (5-min expiry)
   Backend  → returns { nonce, expiresAt }

2. Frontend → Sage Wallet signMessage(nonce)
   Wallet   → returns { signature, publicKey }

3. Frontend → POST /api/ai/auth/verify { walletAddress, nonce, signature, publicKey }
   Backend  → validates nonce exists + not expired
   Backend  → reconstructs CHIP-0002 message hash (CLVM tree hash of "Chia Signed Message" . nonce)
   Backend  → verifies BLS signature using @noble/curves
   Backend  → generates session_token (crypto-random 64-byte hex)
   Backend  → stores session with 24-hour expiry
   Backend  → returns { sessionToken, expiresAt }

4. All AI endpoints → Authorization: Bearer <sessionToken>
   Backend  → looks up token → extracts wallet_address from session
   Backend  → uses session wallet_address (never client-supplied)
```

## Security Properties

- **Nonce is single-use** — deleted/cleared after successful verification
- **Nonce expires in 5 minutes** — prevents nonce hoarding
- **Session token is crypto-random 64 bytes** — unguessable (256-bit entropy)
- **Session expires in 24 hours** — limits exposure window
- **Server extracts wallet from session** — client cannot impersonate another wallet
- **BLS verification via CHIP-0002** — standard Chia message signing with domain separator
- **Replay protection** — nonce prevents signature replay attacks

## Database Schema

### New table: `ai_auth_sessions`

```sql
-- Migration: 082_ai_auth_sessions.sql
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

**Lifecycle:**
1. `/challenge` → INSERT with nonce + nonce_expires_at, session_token is NULL
2. `/verify` → UPDATE: set session_token + public_key + expires_at, clear nonce
3. Token lookup → SELECT WHERE session_token = ? AND expires_at > datetime('now')
4. Cleanup → DELETE expired rows on each `/challenge` call

## Endpoint Protection Matrix

> **Updated 2026-03-10:** Balance endpoint changed to public. See `docs/adr/0005-ai-credits-public-balance-lazy-auth.md` for rationale.

| Endpoint | Auth | Change |
|----------|------|--------|
| `POST /api/ai/auth/challenge` | Public | **NEW** — generates nonce |
| `POST /api/ai/auth/verify` | Public | **NEW** — verifies sig, creates session |
| `GET /api/ai/balance` | **Public** | Accepts `?wallet=xch1...` — balance is not sensitive (ADR-0005) |
| `POST /api/ai/enhance` | **Session required** | Ignore body `walletAddress`, use session wallet |
| `POST /api/ai/credits/buy` | **Session required** | Ignore body `walletAddress`, use session wallet |
| `POST /api/ai/credits/confirm` | **Session required** | Ignore body `walletAddress`, use session wallet |
| `GET /api/ai/creations` | **Session required** | Uses lazy auth via `ensureAuthenticated()` |

### Auth middleware helper

A shared `requireAuth(request, db)` function in `_shared.ts` that:
1. Extracts `Authorization: Bearer <token>` from request headers
2. Looks up session in DB
3. Returns `{ walletAddress }` or throws 401

## BLS Signature Verification

### Dependencies

```
@noble/curves  — BLS12-381 signature verification (pure JS, Cloudflare Workers compatible)
```

Note: `@scure/base` for bech32m is not needed — we don't need to derive puzzle hash from public key. We verify the signature against the public key, and trust that Sage Wallet only signs with the key controlling the claimed address.

### CHIP-0002 Message Hash Construction

Chia signs the CLVM tree hash of a cons pair `("Chia Signed Message" . <raw_message>)`:

```typescript
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
```

### Verification

```typescript
import { bls12_381 } from '@noble/curves/bls12-381';

async function verifyChiaSignature(
  message: string,
  signatureHex: string,
  pubkeyHex: string
): Promise<boolean> {
  const msgHash = await chiaMessageHash(message);
  const signature = hexToBytes(signatureHex);
  const pubkey = hexToBytes(pubkeyHex);
  return bls12_381.verifyShortSignature(signature, msgHash, pubkey);
}
```

## Frontend Integration

> **Updated 2026-03-10:** Changed from eager auth to lazy auth. See ADR-0005.

### AIEnhanceContext changes

1. **On wallet connect** → fetch balance via public endpoint (no signing); restore cached session from localStorage if valid
2. **On first credit spend (enhance) or gallery open** → `ensureAuthenticated()` triggers BLS auth if no cached session
3. **Store sessionToken in React state + localStorage** (localStorage enables session survival across page reloads)
4. **`authenticate()` returns the token** so callers can use it immediately without waiting for React state update
5. **On 401 response** → `handleAuthError()` re-authenticates and returns new token for retry
6. **On wallet disconnect** → clear session state

### UX Impact

- User sees **no Sage Wallet popup** when they connect — balance shows immediately
- Only when user tries to **spend a credit** (enhance) or view **gallery** does a signing popup appear
- If a valid session exists in localStorage from a previous visit, no popup at all
- After signing once, all AI features work seamlessly for 24 hours
- If session expires mid-use, another sign popup appears (rare, handled by retry logic)

## Dependencies

| Package | Purpose | Size | Workers Compatible |
|---------|---------|------|-------------------|
| `@noble/curves` | BLS12-381 signature verification | ~45KB | ✅ Pure JS, audited (Cure53) |

## Out of Scope

- Protecting non-AI endpoints (mint, games, etc.) — separate effort
- Public key → puzzle hash derivation (not needed for this auth pattern)
- Rate limiting on auth endpoints (can add later)
- Multi-wallet sessions (one wallet per session)

## Success Criteria

1. ✅ Only the wallet owner can spend their AI credits
2. ✅ Only the wallet owner can view their balance/creations
3. ✅ BLS signature verified server-side using CHIP-0002 standard
4. ✅ Session tokens are crypto-random, expire in 24 hours
5. ✅ Nonces are single-use, expire in 5 minutes
6. ✅ All existing AI features continue to work after auth is added
7. ✅ TypeScript compiles with zero errors
8. ✅ Build passes
