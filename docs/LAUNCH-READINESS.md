# Your Wojak Minting — Launch Readiness

**Date:** 2026-02-14
**Last Deploy:** `881c6fa` (Pinata pinJSONToIPFS fix)
**Build:** `npm run build` (`tsc -b && vite build`) — PASS

---

## 1. Environment Secrets Checklist

Every secret the minting pipeline requires. One missing value = silent failure.

| Secret | Where Set | Purpose | How to Verify | Status |
|--------|-----------|---------|---------------|--------|
| `MINTGARDEN_API_KEY` | CF Pages env | Bearer token for MintGarden Dynamic Minting API | Test mint or `curl` with auth header | Verify before launch |
| `PINATA_JWT` | CF Pages env | Pinata IPFS upload API authentication | Test upload or check Pinata dashboard | Verify before launch |
| `INTERNAL_MINT_SECRET` | `wrangler pages secret put` | Guards `/api/mint/upload` from public abuse | `npx wrangler pages secret list --project-name=wojak-ink` | **Set** (2026-02-13) |
| `PHASE2_COLLECTION_UUID` | `wrangler.toml` [vars] | MintGarden collection identifier | Compare with MintGarden dashboard | In config |
| `PHASE2_PROFILE_ID` | `wrangler.toml` [vars] | Creator DID for minting | Compare with MintGarden profile | In config |
| `PHASE2_ROYALTY_PCT` | `wrangler.toml` [vars] | Royalty percentage (10%) | Check `wrangler.toml` line 36 | In config |
| `PINATA_GATEWAY` | `wrangler.toml` [vars] | Dedicated Pinata gateway domain | Verify gateway resolves | In config |

### Verification command

```bash
npx wrangler pages secret list --project-name=wojak-ink
```

Should show: `INTERNAL_MINT_SECRET`, `MINTGARDEN_API_KEY`, `PINATA_JWT` (plus others like `CLERK_DOMAIN`, `CHAT_JWT_SECRET`).

---

## 2. Database Migration Status

Migrations are one-way. If one is missing, queries will reference columns that don't exist and the endpoint will 500.

| Migration | File | What it creates | Applied |
|-----------|------|-----------------|---------|
| 030 | `functions/migrations/030_credit_system.sql` | `credit_events`, `credit_spends`, `floor_price_snapshots`, `phase2_mints`, `trait_usage` + indexes | Yes |
| 031 | `functions/migrations/031_mint_counter.sql` | `mint_counter` table, seeded from existing mints | Yes (2026-02-13) |
| 032 | `functions/migrations/032_mint_audit_trail.sql` | Audit columns on `phase2_mints` + `mint_audit_log` table + refund tracking columns | Yes (2026-02-13) |
| 034 | `functions/migrations/034_trait_decay.sql` | Adds `effective_usage`, `last_decay_at` columns to `trait_usage` table. Enables time-based decay of trait popularity. | Apply before launch |
| 068 | `functions/migrations/068_burn_tracking.sql` | Adds `burned_at`, `burned_by_did` to `combat_fighters`; required for power-leaderboard and burn. | Apply before launch (see runbook) |
| 075 | `functions/migrations/075_owner_address.sql` | Adds `owner_address` to `combat_fighters`; required for mint pipeline and wallet identity. | Apply before launch (see runbook) |
| 076 | `functions/migrations/076_burn_power_bonus.sql` | Creates `burn_power_grants` table; required for burn +50 power assign. | Apply before launch (see runbook) |

**Runbook:** `docs/plans/2026-02-20-deploy-and-migrations-runbook.md` — exact commands to apply 068, 075, 076 to production.

### Verification command

```bash
npx wrangler d1 execute wojak-users --remote --command \
  "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

Expected tables: `credit_events`, `credit_spends`, `floor_price_snapshots`, `mint_audit_log`, `mint_counter`, `phase2_mints`, `rate_limits`, `trait_usage`

### Verify trait_usage decay columns

```bash
npx wrangler d1 execute wojak-users --remote --command \
  "PRAGMA table_info(trait_usage);"
```

Should include: `effective_usage` (REAL), `last_decay_at` (TEXT).

### Verify counter is seeded

```bash
npx wrangler d1 execute wojak-users --remote --command \
  "SELECT * FROM mint_counter;"
```

`next_number` should equal `(highest existing mint_number) + 1`, or `1` if no mints exist yet.

---

## 3. End-to-End Flow

### Free Mint

```
User clicks Mint (free)
  -> ActionBar.handleMintClick()
  -> exportImage() produces WebP blob
  -> blobToBase64()
  -> MintContext.startMint()
  -> POST /api/mint/prepare
     {walletAddress, selectedLayers, selectedColors, imageBase64, mintType: 'free'}

prepare.ts:
  1. Validate wallet (bech32m: ^xch1[a-z0-9]{58}$)
  2. Validate layers (whitelist) and colors (hex format)
  3. Validate layer paths (no traversal: max 3 segments, no .. or .)
  4. Expire stale pending mints
  5. Check no existing pending mint for this wallet
  6. Supply check: COUNT(*) WHERE status='minted' < 4200
  7. Credit check: earned - spent >= 10000 units (100 credits)
  8. Reserve mint number (atomic UPDATE...RETURNING on mint_counter)
  9. Build CHIP-0007 metadata with real mint number
  10. uploadToIPFS() — direct function call (no HTTP self-fetch)
      a. Decode base64 -> WebP bytes, enforce 2MB limit
      b. SHA256(image) -> dataHash
      c. Pinata pinFileToIPFS (FormData) -> ipfsHash -> 3 gateway URIs
      d. SHA256(metadata JSON) -> metadataHash
      e. Pinata pinJSONToIPFS ({pinataContent: metadata}) -> metaIpfsHash -> 3 gateway URIs
  11. callMintGardenMint(free, no mojos) -> MintGarden mints NFT to wallet
  12. If no launcherId returned -> error 500
  13. INSERT phase2_mints (status='minted', minted_at=now)
  14. INSERT credit_spends (wallet, mintId, 10000)
  15. Log audit step
  16. INCREMENT trait_usage (effective_usage with decay for Head/Clothes/Face Wear)
  17. Return {success: true, mintNumber, launcherId, mintgardenUrl}

MintContext:
  18. Sets mintStep='success'
  19. MintFlowModal shows success + MintGarden link
```

### Paid Mint

```
Steps 1-10: Same as free mint

prepare.ts (continued):
  11. Calculate fair-share surcharge from trait_usage (highest single trait across Head/Clothes/Face Wear)
  12. totalPrice = 0.2 XCH + highest surcharge
  13. callMintGardenMint(paid, requested_mojos) -> MintGarden returns offer_file
  14. INSERT phase2_mints (status='pending', offer_file, expires_at=now+15min)
  15. Log audit step
  16. Return {pending: true, mintId, offerFile, expiresAt, totalPriceXch}

MintContext:
  17. Sets mintStep='signing', stores pendingMint
  18. MintFlowModal shows countdown + Accept/Copy buttons

User clicks "Accept in Wallet":
  19. MintContext.acceptOfferInWallet()
  20. takeOffer(offerFile, 0) via WalletConnect to Sage
  21. Sage wallet processes the offer
  22. POST /api/mint/confirm {mintId, walletAddress}

confirm.ts:
  23. Look up pending mint by ID
  24. Verify wallet matches (bech32m validation via isValidChiaAddress)
  25. Get launcherId (from body or existing record)
  26. If no launcherId -> return {pending: true} (try again later)
  27. INCREMENT trait_usage (effective_usage with decay for Head/Clothes/Face Wear)
  28. UPDATE phase2_mints SET status='minted', payment_verified=1
  29. Log audit step
  30. Return {success: true, mintNumber, launcherId, mintgardenUrl}

MintContext:
  31. Sets mintStep='success'
  32. MintFlowModal shows success + MintGarden link
```

### Failure Modes

| Failure Point | What Happens | User Sees |
|---------------|-------------|-----------|
| Wallet not connected | `connect()` called instead of minting | Wallet connect prompt |
| Invalid wallet format | 400 "Missing or invalid walletAddress" | Error in modal |
| Insufficient credits (free) | 400 "Insufficient credits" | Error in modal |
| Supply exhausted (>= 4200) | 400 "Sold out" | Error in modal |
| Existing pending mint | Returns pending mint info | Resume countdown |
| IPFS image upload fails | 502 "IPFS image upload failed" | Error in modal |
| IPFS metadata upload fails | 502 "IPFS metadata upload failed" | Error in modal |
| MintGarden API fails (free) | Retries 3x, then 500 error | Error in modal |
| MintGarden API fails (paid) | Retries 3x, offer_file=null | "Offer not created" message |
| User rejects offer in Sage | Catch block, back to signing step | Countdown resumes |
| Offer expires (15 min) | Timer hits 0:00, buttons hidden | "Offer expired. Close and mint again." |
| Page reload during countdown | Resume on load via /api/mint/status | Countdown resumes |
| Confirm without launcherId | Returns {pending: true} | "NFT not confirmed yet" message |
| Mint number reservation fails | Error thrown, 500 response | Error in modal |

---

## 4. Pricing — Fair-Share Surcharge System

### Base Price

`BASE_PRICE_XCH = 0.20` (defined in `prepare.ts`). All mints start at 0.20 XCH.

### Surcharge Formula

```
surcharge = RAMP_RATE * r + PENALTY_SCALE * max(0, r - 1)^2

where r = effectiveUsage / fairShare
      fairShare = 4200 / numberOfOptionsInCategory
```

Constants (from `_shared.ts`): `RAMP_RATE=1.0`, `PENALTY_SCALE=8.0`, `PENALTY_EXPONENT=2.0`

### Surcharge Categories

| Category | Options | Fair Share | Surcharge? | Reason |
|----------|:---:|:---:|:---:|--------|
| Head | 40 | 105 | Yes | Large variety, high visual impact |
| Clothes | 36 | 117 | Yes | Large variety, high visual impact |
| Face Wear | 18 | 233 | Yes | Moderate variety, distinctive |
| Mouth | 20 | — | No | Mandatory base system + rarity override |
| Face | 6 | — | No | Core identity, only 6 options |
| Background | 57 | — | No | Cosmetic backdrop only |
| Base | 1 | — | No | Always "Wojak" |

### Exempt Traits

- "No Headgear" (Head category) — always surcharge 0
- "No Face Wear" (Face Wear category) — always surcharge 0

### Pricing Behavior

- Only the **highest surcharge** among all 7 selected traits is charged
- Total price = base (0.20 XCH) + highest surcharge
- Free mints are free regardless of trait surcharges
- Every surcharge category reaches 1.00 XCH surcharge at its fair share (total 1.20 XCH)
- Past fair share, the quadratic wall makes overuse expensive (price wall effect)

### Time Decay

- 30-day half-life exponential decay on `effective_usage`
- If a trait stops being popular, its surcharge drops over time
- D1 SQL uses `exp(ln(0.5) * (julianday('now') - julianday(last_decay_at)) / 30)`
- On each mint, effective_usage is decayed to "now" and incremented by 1

---

## 5. Security Audit Results

Comprehensive audit completed — 6 fixes applied (see `docs/SPEC-MINT-PIPELINE-AUDIT.md`).

### Self-Fetch Eliminated (FIX 2)

- The `prepare.ts -> /api/mint/upload` self-fetch anti-pattern was removed
- `uploadToIPFS.ts` is now a direct function import, not an HTTP call
- No more circular fetch dependencies

### Wallet Validation Hardened (FIX 3 + FIX 4)

- All 4 mint endpoints now use `isValidChiaAddress()` (bech32m regex validation)
- Old `startsWith('xch1')` pattern fully removed from mint and credit endpoints
- Shared validation module: `functions/lib/validation.ts`
- Endpoints hardened: `prepare.ts`, `confirm.ts`, `status.ts`, `pricing.ts`, `balance.ts`, `history.ts`

### Trait Name Consistency (FIX 1 + FIX 1a)

- Server-side `functions/api/mint/traitResolver.ts` uses canonical `TRAIT_NAME_MAP`
- `resolveTraitName()` function used in `prepare.ts` for metadata attribute names
- All Phase 1 trait values verified against metadata.json
- Layer-specific overrides (Super Saiyan Uniform, SWAT Gear/Helmet)

### Mint Number Assignment (FIX 3)

- Mint numbers now assigned atomically at prepare time using `UPDATE...RETURNING`
- No more `SELECT MAX` pattern
- Metadata name is correct from first IPFS upload

### Threat Model

| Vector | Protection | File | Notes |
|--------|-----------|------|-------|
| Public upload abuse | `X-Internal-Mint-Request` header + `INTERNAL_MINT_SECRET` | upload.ts | Only the HTTP path uses this; prepare.ts calls uploadToIPFS() directly |
| Directory traversal | Path validation: max 3 segments, no `..` or `.` | prepare.ts | Blocks `../../etc/passwd` style payloads |
| Wallet spoofing | Full bech32m regex: `^xch1[a-z0-9]{58}$` | functions/lib/validation.ts | Used in all endpoints via `isValidChiaAddress()` |
| Mint number race condition | Atomic `UPDATE...RETURNING` on mint_counter | mintNumberHelper.ts | Replaced `SELECT MAX() + 1` |
| Double-spend credits | Balance check + atomic INSERT...SELECT credit deduction | prepare.ts | Credits deducted after successful mint only |
| Confirm another wallet's mint | Wallet ownership check with bech32m validation | confirm.ts | Rejects invalid or mismatched wallets |
| Supply bypass | `COUNT(*) WHERE status='minted'` checked before every mint | prepare.ts | Pending mints don't count toward supply |
| Expired offer clickable | `isExpired` state hides Accept/Copy buttons | MintFlowModal.tsx | Timer turns red, expiry message shown |
| Oversized image | 2MB limit on decoded base64 | uploadToIPFS.ts | Checked before any Pinata call |
| Invalid JSON body | try/catch on `request.json()` in all endpoints | All endpoints | Returns 400 "Invalid JSON" |
| Missing env vars | Throws on missing API key/profile; 503 on missing JWT | request.ts, prepare.ts | Fail-fast, no silent null |
| SQL injection | All queries use parameterized `.bind()` | All endpoints | No string interpolation in SQL |
| XSS via layer names | Layer names validated against `VALID_LAYER_NAMES` whitelist | prepare.ts | Only 9 known layer names accepted |
| Credit formula wash trading | Asymptotic whale multiplier capped at 1.30 | credit-tracker worker | Max ~1% profit at extreme prices — not viable |

---

## 6. Known Gaps and Accepted Risks

### Resolved Items

| Item | Status | Resolution |
|------|--------|------------|
| Self-fetch in prepare.ts | ✅ **RESOLVED** | FIX 2 — replaced with direct `uploadToIPFS()` import |
| Metadata drift (trait names) | ✅ **RESOLVED** | FIX 1 — `resolveTraitName()` with `TRAIT_NAME_MAP` as single source of truth |
| Weak wallet validation | ✅ **RESOLVED** | FIX 4 — `isValidChiaAddress()` everywhere (prepare, confirm, status, pricing, balance, history) |
| Credit formula wash trade risk | ✅ **RESOLVED** | Credit Formula V2 — asymptotic whale multiplier caps at 1.30 |

### Accepted Risks

| Item | Severity | Description | Why Acceptable |
|------|----------|-------------|----------------|
| Mint number gaps | Low | If IPFS or MintGarden fails after `getNextMintNumber()`, the number is consumed, creating gaps (#1, #2, #5...) | Cosmetic only. NFT numbering doesn't need to be contiguous. Alternative (reserve after success) would reintroduce the metadata-name-mismatch bug. |
| Confirm wallet check is soft | Low | `confirm.ts` only verifies wallet if `walletAddress` is provided in the POST body. Omitting it bypasses the check. | Frontend always sends it. An attacker would need the `mintId` (sequential integer) to target a specific mint. They can confirm it but can't steal the NFT (it's already in the wallet). |
| `audit.ts` / `refund.ts` inline CORS | Low | Admin-only endpoints still use inline `corsHeaders` instead of shared helpers | Not part of the critical mint pipeline. Low traffic. Can migrate later. |
| Audit logging non-blocking | Info | `logMintStep()` catches errors silently — if audit insert fails, the mint still succeeds | Correct behavior. Audit logging failure should never block a user's mint. Errors are still logged to console. |

---

## 7. Bugs Found and Fixed

| Bug | Severity | File | Fix | Commit |
|-----|----------|------|-----|--------|
| Pinata `pinJSONToIPFS` wrong body format: sent raw JSON instead of `{pinataContent}` wrapper | **Critical** | upload.ts:126 | Wrapped metadata in `{pinataContent: metadata}` | `881c6fa` |
| Mint number race condition: `SELECT MAX() + 1` under concurrent mints | **Critical** | prepare.ts | Replaced with atomic `UPDATE...RETURNING` via mintNumberHelper.ts | `c295161` |
| Metadata name mismatch: IPFS name used `mintedCount + 1` instead of actual assigned number | **High** | prepare.ts | Mint number reserved BEFORE building metadata | `c295161` |
| `confirm.ts` still used `SELECT MAX` for numbering | **High** | confirm.ts | Mint number now assigned at prepare time only | `c295161` |
| Upload endpoint publicly accessible | **High** | upload.ts | Added `X-Internal-Mint-Request` header guard | `c295161` |
| Expired offer buttons still clickable | **Medium** | MintFlowModal.tsx | Added `isExpired` state; buttons hidden at 0:00 | `c295161` |
| `request.ts` silently returned null on missing config | **Medium** | request.ts | Now throws descriptive error | `c295161` |
| Layer path traversal accepted | **Medium** | prepare.ts | Added path validation (max segments, no `..`) | `c295161` |
| Wallet validation too loose (`startsWith` only) | **Low** | prepare.ts, status.ts | Full bech32m regex via `isValidChiaAddress` | `c295161` |
| CORS/surcharge formula duplicated across 5+ files | **Low** | Multiple | Centralised into `_shared.ts` | `c295161` |
| Unused `corsHeaders` import in upload.ts | **Low** | upload.ts | Removed | `c295161` |
| `tsc -b` strict errors (unused vars, string\|undefined) | **Low** | Multiple | Removed unused vars, narrowed types | `8746fc4` |

---

## 8. Test Plan

Run these tests before announcing launch. Check each box as you go.

### Pre-Test Setup

- [ ] Verify all secrets are set: `npx wrangler pages secret list --project-name=wojak-ink`
- [ ] Verify migrations applied: check tables exist via D1 query
- [ ] Verify mint_counter is seeded: `SELECT * FROM mint_counter`
- [ ] Grant test credits to your wallet (200 credits = 2 free mints):
  ```bash
  npx wrangler d1 execute wojak-users --remote --command \
    "INSERT INTO credit_events (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_timestamp) VALUES ('YOUR_XCH_WALLET', 'test-nft-001', 'test-credit-001', 2.0, 100, 20000, 10000, 'test', datetime('now'));"
  ```
- [ ] Verify credits: `curl "https://wojak.ink/api/credits/balance?wallet=YOUR_XCH_WALLET"`

### Test Cases

| # | Test | Steps | Expected Result | Pass? |
|---|------|-------|-----------------|-------|
| 1 | Credit balance shows | Connect wallet in generator | Leaderboard badge shows free mint count | |
| 2 | Free mint end-to-end | Toggle to Free, design wojak, click Mint | Modal shows progress, then success with MintGarden link | |
| 3 | NFT on chain | Click MintGarden link from success screen | NFT visible with correct name, image, metadata | |
| 4 | Credits deducted | Check balance after free mint | Balance reduced by 100, freeMints reduced by 1 | |
| 5 | Paid mint end-to-end | Toggle to Paid, design different wojak, click Mint | Countdown modal, Accept in Wallet button | |
| 6 | Accept in Sage | Click "Accept in Wallet" | Sage prompt appears, accept offer | |
| 7 | Paid confirmation | After accepting | Modal transitions to success with MintGarden link | |
| 8 | Expired offer UX | Wait for countdown to hit 0:00 (or start and wait) | Timer turns red, buttons disappear, "offer expired" message | |
| 9 | Resume on reload | During paid countdown, reload the page | Countdown resumes from where it was | |
| 10 | Upload guard | `curl -X POST https://wojak.ink/api/mint/upload` (no header) | 401 Unauthorized | |
| 11 | Supply counter | Check generator UI | Shows correct minted/4200 count | |
| 12 | Mint number correct | Check DB after both mints | Sequential numbers, no gaps, match NFT metadata | |

### Surcharge Tests

| # | Test | Expected Result | Pass? |
|---|------|-----------------|-------|
| 13 | `surchargeXch(0, 'Head', 'Crown')` | Returns 0 | |
| 14 | `surchargeXch(105, 'Head', 'Crown')` | Returns ~1.000 (at fair share) | |
| 15 | `surchargeXch(150, 'Head', 'Crown')` | Returns ~2.898 (price wall) | |
| 16 | `surchargeXch(200, 'Head', 'Crown')` | Returns ~8.454 (effectively blocked) | |
| 17 | `surchargeXch(100, 'Mouth', 'Cig')` | Returns 0 (excluded category) | |
| 18 | `surchargeXch(100, 'Face', 'Classic')` | Returns 0 (excluded category) | |
| 19 | `surchargeXch(100, 'Background', 'Moon')` | Returns 0 (excluded category) | |
| 20 | `surchargeXch(100, 'Head', 'No Headgear')` | Returns 0 (exempt trait) | |
| 21 | `surchargeXch(100, 'Face Wear', 'No Face Wear')` | Returns 0 (exempt trait) | |

### Decay Tests

| # | Test | Expected Result | Pass? |
|---|------|-----------------|-------|
| 22 | Trait with `effective_usage=100`, `last_decay_at=30 days ago` | effective_usage decays to ~50 | |
| 23 | Trait with `last_decay_at=now` | effective_usage unchanged | |

### Credit Formula V2 Tests

| # | Test | Expected Result | Pass? |
|---|------|-----------------|-------|
| 24 | `calculateCredits(2.0, 2.0)` | 10000 stored units (100 display = 1 free mint) | |
| 25 | `calculateCredits(4.0, 2.0)` | ~23000 stored units (multiplier ~1.15) | |
| 26 | `calculateCredits(100.0, 2.0)` | multiplier ~1.294 (near 1.30 cap) | |
| 27 | Old constants `CREDITS_PER_FLOOR`, `WHALE_COEFFICIENT` | Not in codebase (grep returns 0 results) | |

### Wallet Validation Tests

| # | Test | Expected Result | Pass? |
|---|------|-----------------|-------|
| 28 | `isValidChiaAddress('xch1short')` | Returns false | |
| 29 | `isValidChiaAddress('xch1' + 58 valid bech32m chars)` | Returns true | |

### Post-Test Cleanup (Optional)

```bash
# Remove test credit event
npx wrangler d1 execute wojak-users --remote --command \
  "DELETE FROM credit_events WHERE event_id = 'test-credit-001';"

# Note: Test mints and NFTs cannot be un-minted. They'll exist on chain permanently.
# To clean DB records (optional):
# DELETE FROM credit_spends WHERE wallet_address = 'YOUR_WALLET';
# DELETE FROM phase2_mints WHERE wallet_address = 'YOUR_WALLET';
```

---

## 9. Rollback Plan

### Disable minting immediately

Set the MintGarden API key to empty. `prepare.ts` -> `request.ts` will throw "MintGarden configuration missing" and return 500.

```bash
npx wrangler pages secret put MINTGARDEN_API_KEY --project-name=wojak-ink
# When prompted, enter an empty string or a dummy value
```

### Check for failed mints

```bash
npx wrangler d1 execute wojak-users --remote --command \
  "SELECT id, mint_number, wallet_address, status, error_message, created_at FROM phase2_mints WHERE status IN ('failed', 'expired') OR refund_needed = 1 ORDER BY created_at DESC LIMIT 20;"
```

### Check audit log

```bash
npx wrangler d1 execute wojak-users --remote --command \
  "SELECT * FROM mint_audit_log WHERE status = 'failed' ORDER BY created_at DESC LIMIT 20;"
```

### Revert to previous deploy

```bash
# List recent deployments
npx wrangler pages deployments list --project-name=wojak-ink

# Roll back to a specific deployment
npx wrangler pages deployments rollback --project-name=wojak-ink
```

---

## 10. Post-Launch Monitoring Queries

Run these in the first hours after launch.

### Mint activity in last hour

```sql
SELECT status, COUNT(*) as count
FROM phase2_mints
WHERE created_at > datetime('now', '-1 hour')
GROUP BY status;
```

### Credit balance sanity (no negative balances)

```sql
SELECT ce.wallet_address,
  SUM(ce.credits_earned) as earned,
  COALESCE((SELECT SUM(cs.credits_spent) FROM credit_spends cs
    WHERE cs.wallet_address = ce.wallet_address), 0) as spent
FROM credit_events ce
GROUP BY ce.wallet_address
HAVING earned < spent;
```

### Failed audit steps

```sql
SELECT mint_id, step, error, created_at
FROM mint_audit_log
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 20;
```

### Mint numbers are sequential (no duplicates)

```sql
SELECT mint_number, COUNT(*) as count
FROM phase2_mints
WHERE status = 'minted'
GROUP BY mint_number
HAVING count > 1;
```

### Stale pending mints (should be auto-expired)

```sql
SELECT id, wallet_address, expires_at, created_at
FROM phase2_mints
WHERE status = 'pending'
AND expires_at < datetime('now');
```

### Supply check

```sql
SELECT
  (SELECT COUNT(*) FROM phase2_mints WHERE status = 'minted') as minted,
  (SELECT next_number - 1 FROM mint_counter WHERE id = 1) as numbers_issued,
  4200 as total;
```

---

## 11. Build Status

```
npm run build (tsc -b && vite build):  PASS
npx tsc --noEmit:                      PASS
npx vite build:                        PASS (3330 modules)
Deploy commit:                         881c6fa
Deploy URL:                            https://wojak.ink
```

---

## 12. Files in the Minting Pipeline

### Backend (Cloudflare Pages Functions)

| File | Role |
|------|------|
| `functions/api/mint/_shared.ts` | CORS helpers, fair-share surcharge formula, decay, internal API header |
| `functions/api/mint/mintNumberHelper.ts` | Atomic mint number allocation (UPDATE...RETURNING) |
| `functions/api/mint/auditHelper.ts` | Audit trail logging, refund tracking |
| `functions/api/mint/prepare.ts` | Main mint endpoint: validate, reserve number, upload, call MintGarden |
| `functions/api/mint/uploadToIPFS.ts` | IPFS upload logic (direct function, not HTTP) |
| `functions/api/mint/upload.ts` | HTTP wrapper for uploadToIPFS (internal-only, header guard) |
| `functions/api/mint/traitResolver.ts` | Trait name resolution using canonical TRAIT_NAME_MAP |
| `functions/api/mint/request.ts` | MintGarden Dynamic Minting API wrapper with retries |
| `functions/api/mint/confirm.ts` | Confirm paid mint after user accepts offer |
| `functions/api/mint/status.ts` | Check for pending mints (resume on reload) |
| `functions/api/mint/pricing.ts` | Trait surcharges (fair-share) and supply count |
| `functions/lib/validation.ts` | Shared `isValidChiaAddress()` bech32m validation |
| `functions/lib/traitNameMap.ts` | Server-side canonical TRAIT_NAME_MAP (synced with src/) |
| `functions/api/credits/balance.ts` | Credit balance for a wallet |

### Frontend (React)

| File | Role |
|------|------|
| `src/contexts/MintContext.tsx` | Mint flow state, startMint, acceptOffer, confirmManual |
| `src/components/generator/MintFlowModal.tsx` | Countdown, Accept/Copy buttons, expired handling, success display |
| `src/components/generator/ActionBar.tsx` | Mint button, free/paid toggle, supply counter |

### Migrations

| File | Role |
|------|------|
| `functions/migrations/030_credit_system.sql` | Core tables: credits, mints, traits, floor prices |
| `functions/migrations/031_mint_counter.sql` | Atomic counter for mint numbering |
| `functions/migrations/032_mint_audit_trail.sql` | Audit log + refund columns |
| `functions/migrations/034_trait_decay.sql` | Trait decay columns (effective_usage, last_decay_at) |

---

## 13. Post-Launch TODO

| Item | Priority | Status |
|------|----------|--------|
| ~~Extract upload logic to shared function~~ | ~~Low~~ | ✅ Done (uploadToIPFS.ts) |
| ~~Update balance.ts to use isValidChiaAddress~~ | ~~Low~~ | ✅ Done (FIX 4) |
| ~~Harden confirm.ts wallet check~~ | ~~Low~~ | ✅ Done (FIX 3) |
| Migrate `audit.ts`, `refund.ts` to shared CORS helpers | Low | Open |
