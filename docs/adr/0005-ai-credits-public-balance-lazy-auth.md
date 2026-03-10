# ADR-0005: AI Credits — Public Balance, Lazy BLS Auth

## Status
ACCEPTED (supersedes balance row in ADR wallet-auth-design endpoint matrix)

## Context

The AI credit system originally required BLS12-381 signature authentication (CHIP-0002) for **all** endpoints, including viewing a credit balance. This was architecturally incorrect:

### The Problem
After wallet connect, users saw **0 credits** even though the database had correct balances. Three successive fixes targeting the BLS auth flow all failed:

1. **Fix 1:** Sage wallet changed response field names (`publicKey` → other variants) — added multi-field detection. Still failed.
2. **Fix 2:** WalletConnect `session_delete` events fired for old sessions, clearing the current session mid-auth — made handler topic-aware. Still failed.
3. **Fix 3:** BLS verification tried both hex and UTF-8 message encodings. Still failed.

After 3+ failed patches, systematic debugging revealed the root cause was **architectural, not implementational**: requiring BLS auth to view a credit count has ~6 failure modes and zero security benefit.

### Why Balance Doesn't Need Auth
- A credit count is **not sensitive data** — knowing someone has 10 AI credits reveals nothing exploitable
- Phase 2 credits (`/api/credits/balance?wallet=xch1...`) already expose MORE financial data (XCH amounts, leaderboard position) with zero auth — and it works perfectly
- The **real security boundary** is spending credits — that's where wallet ownership proof matters
- BLS auth for viewing balance is "security theater that actively harms UX"

### Two Credit Systems Comparison

| Aspect | Phase 2 Credits | AI Credits (before fix) | AI Credits (after fix) |
|--------|----------------|------------------------|----------------------|
| Balance endpoint | `?wallet=xch1...` | `Authorization: Bearer` | `?wallet=xch1...` |
| Auth for viewing | None | BLS session required | **None** |
| Auth for spending | XCH on-chain tx | BLS session token | BLS session token |
| Failure modes (view) | 0 | ~6 | **0** |
| Works on connect | Always | Never reliably | **Always** |

## Decision

### 1. Balance endpoint is public
`GET /api/ai/balance?wallet=xch1...` — accepts wallet address as query parameter, validates with `isValidChiaAddress()`, returns balance. No auth headers needed.

### 2. BLS auth is lazy (deferred to spending)
BLS signing prompt only appears when the user **first tries to spend** a credit (enhance action), not on wallet connect. The `ensureAuthenticated()` helper:
1. Returns existing session token if available
2. Tries to restore from `localStorage` (cached from previous session)
3. Only if both fail: triggers the BLS challenge-sign-verify flow

### 3. Wallet connect = immediate balance
When wallet connects, balance fetches immediately using just the wallet address. Zero dependencies on BLS, WalletConnect session state, or signing.

## Implementation

### Files Changed

| File | Change |
|------|--------|
| `functions/api/ai/balance.ts` | Removed `requireAuth`, accepts `?wallet=` query param |
| `src/contexts/AIEnhanceContext.tsx` | `refetchBalance` uses public endpoint; `submitEnhance` uses `ensureAuthenticated()` for lazy auth |
| `functions/api/ai/_shared.ts` | Fixed `@noble/curves/bls12-381` import (no `.js` suffix) |

### Endpoint Protection Matrix (Updated)

| Endpoint | Auth | Why |
|----------|------|-----|
| `POST /api/ai/auth/challenge` | Public | Generates nonce for BLS flow |
| `POST /api/ai/auth/verify` | Public | Verifies BLS signature, creates session |
| `GET /api/ai/balance` | **Public** | Balance is not sensitive; wallet param only |
| `POST /api/ai/enhance` | **Session required** | Spends credits — must prove wallet ownership |
| `POST /api/ai/credits/buy` | **Session required** | Initiates purchase |
| `POST /api/ai/credits/confirm` | **Session required** | Confirms purchase |
| `GET /api/ai/creations` | **Session required** | Returns user's images (lazy auth on gallery open) |

### Auth Flow: When Does the User See a Signing Prompt?

```
Wallet connects
  → Balance fetches immediately (public endpoint, no signing)
  → User sees their credit count ✅

User opens AI gallery (creations)
  → ensureAuthenticated() checks:
    1. Session token in React state? → use it
    2. Valid token in localStorage? → restore it
    3. Neither? → BLS challenge-sign-verify (user sees Sage popup)

User clicks "Enhance" (first time)
  → Same ensureAuthenticated() flow
  → If already authenticated from gallery, no popup
  → If not, user sees one Sage signing popup
  → Then enhance proceeds with session token
```

### The `ensureAuthenticated()` Pattern

```typescript
const ensureAuthenticated = async (): Promise<string | null> => {
  // 1. Already have a token in React state
  if (sessionToken) return sessionToken;

  // 2. Try to restore from localStorage (survives page reload)
  const stored = localStorage.getItem('ai_session');
  if (stored && stored.walletAddress === address && !expired) {
    setSessionToken(stored.token);
    return stored.token;
  }

  // 3. Authenticate fresh (user will see Sage signing popup)
  return authenticate(); // returns token directly for immediate use
};
```

Key detail: `authenticate()` **returns** the token (not just sets state) so callers can use it in the same tick without waiting for React re-render.

## Consequences

### Positive
- **Balance always shows on connect** — zero failure modes for viewing
- **No signing prompt on connect** — smoother UX, user only signs when actually using AI features
- **localStorage caching** — returning users with valid sessions see no popups at all
- **Follows proven pattern** — identical to Phase 2 credits which has worked flawlessly
- **Retry on 401** — if session expires mid-use, `handleAuthError` re-authenticates and retries once

### Negative
- **Balance is publicly queryable** — anyone can check any wallet's AI credit count (this is intentionally accepted as non-sensitive)
- **Gallery/enhance may show a signing popup** — but only on first use, not on every page load

### Neutral
- BLS auth still protects all write operations (enhance, buy, confirm)
- Session token mechanism unchanged (24-hour expiry, crypto-random)
- Database schema unchanged

## References
- `docs/plans/2026-03-09-wallet-auth-design.md` — Original BLS auth design (endpoint matrix updated by this ADR)
- `docs/adr/0002-clerk-authentication.md` — Clerk auth pattern (different system, similar principles)
- Commit `4316646` — Implementation of this decision
- Phase 2 credits balance: `functions/api/credits/balance.ts` — The pattern this follows
