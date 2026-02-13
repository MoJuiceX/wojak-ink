# Your Wojak Minting — Launch Readiness

**Date:** 2026-02-13
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

### Verification command

```bash
npx wrangler d1 execute wojak-users --remote --command \
  "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

Expected tables: `credit_events`, `credit_spends`, `floor_price_snapshots`, `mint_audit_log`, `mint_counter`, `phase2_mints`, `trait_usage`

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
  10. POST /api/mint/upload (with INTERNAL_MINT_SECRET header)

upload.ts:
  11. Verify X-Internal-Mint-Request header
  12. Decode base64 -> WebP bytes, enforce 2MB limit
  13. SHA256(image) -> dataHash
  14. Pinata pinFileToIPFS (FormData) -> ipfsHash -> 3 gateway URIs
  15. SHA256(metadata JSON) -> metadataHash
  16. Pinata pinJSONToIPFS ({pinataContent: metadata}) -> metaIpfsHash -> 3 gateway URIs
  17. Return {dataHash, dataUris, metadataHash, metadataUris}

prepare.ts (continued):
  18. callMintGardenMint(free, no mojos) -> MintGarden mints NFT to wallet
  19. If no launcherId returned -> error 500
  20. INSERT phase2_mints (status='minted', minted_at=now)
  21. INSERT credit_spends (wallet, mintId, 10000)
  22. Log audit step
  23. INCREMENT trait_usage for each selected layer
  24. Return {success: true, mintNumber, launcherId, mintgardenUrl}

MintContext:
  25. Sets mintStep='success'
  26. MintFlowModal shows success + MintGarden link
```

### Paid Mint

```
Steps 1-17: Same as free mint

prepare.ts (continued):
  18. Calculate surcharge from trait_usage (highest single trait)
  19. totalPrice = 0.2 XCH + surcharge
  20. callMintGardenMint(paid, requested_mojos) -> MintGarden returns offer_file
  21. INSERT phase2_mints (status='pending', offer_file, expires_at=now+15min)
  22. Log audit step
  23. Return {pending: true, mintId, offerFile, expiresAt, totalPriceXch}

MintContext:
  24. Sets mintStep='signing', stores pendingMint
  25. MintFlowModal shows countdown + Accept/Copy buttons

User clicks "Accept in Wallet":
  26. MintContext.acceptOfferInWallet()
  27. takeOffer(offerFile, 0) via WalletConnect to Sage
  28. Sage wallet processes the offer
  29. POST /api/mint/confirm {mintId, walletAddress}

confirm.ts:
  30. Look up pending mint by ID
  31. Verify wallet matches (if provided)
  32. Get launcherId (from body or existing record)
  33. If no launcherId -> return {pending: true} (try again later)
  34. INCREMENT trait_usage for each layer
  35. UPDATE phase2_mints SET status='minted', payment_verified=1
  36. Log audit step
  37. Return {success: true, mintNumber, launcherId, mintgardenUrl}

MintContext:
  38. Sets mintStep='success'
  39. MintFlowModal shows success + MintGarden link
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

## 4. Security Audit Results

| Vector | Protection | File | Notes |
|--------|-----------|------|-------|
| Public upload abuse | `X-Internal-Mint-Request` header + `INTERNAL_MINT_SECRET` | upload.ts:57-59 | Only prepare.ts knows the secret |
| Directory traversal | Path validation: max 3 segments, no `..` or `.` | prepare.ts:107-111 | Blocks `../../etc/passwd` style payloads |
| Wallet spoofing | Full bech32m regex: `^xch1[a-z0-9]{58}$` | _shared.ts:30 | Used in prepare.ts, status.ts |
| Mint number race condition | Atomic `UPDATE...RETURNING` on mint_counter | mintNumberHelper.ts:20-27 | Replaced `SELECT MAX() + 1` |
| Double-spend credits | Balance check before number reservation; atomic credit deduction | prepare.ts:154-166 | Credits deducted after successful mint only |
| Confirm another wallet's mint | Wallet ownership check | confirm.ts:77-79 | Soft check: only if walletAddress provided |
| Supply bypass | `COUNT(*) WHERE status='minted'` checked before every mint | prepare.ts:145-151 | Pending mints don't count toward supply |
| Expired offer clickable | `isExpired` state hides Accept/Copy buttons | MintFlowModal.tsx:165,177 | Timer turns red, expiry message shown |
| Oversized image | 2MB limit on decoded base64 | upload.ts:86-88 | Checked before any Pinata call |
| Invalid JSON body | try/catch on `request.json()` in all endpoints | All endpoints | Returns 400 "Invalid JSON" |
| Missing env vars | Throws on missing API key/profile; 503 on missing JWT | request.ts:92-94, upload.ts:63-65 | Fail-fast, no silent null |
| SQL injection | All queries use parameterized `.bind()` | All endpoints | No string interpolation in SQL |
| XSS via layer names | Layer names validated against `VALID_LAYER_NAMES` whitelist | prepare.ts:49-51, 101-104 | Only 9 known layer names accepted |

---

## 5. Known Gaps and Accepted Risks

| Item | Severity | Description | Why Acceptable |
|------|----------|-------------|----------------|
| Mint number gaps | Low | If IPFS or MintGarden fails after `getNextMintNumber()`, the number is consumed, creating gaps (#1, #2, #5...) | Cosmetic only. NFT numbering doesn't need to be contiguous. Alternative (reserve after success) would reintroduce the metadata-name-mismatch bug. |
| Confirm wallet check is soft | Low | `confirm.ts` only verifies wallet if `walletAddress` is provided in the POST body. Omitting it bypasses the check. | Frontend always sends it. An attacker would need the `mintId` (sequential integer) to target a specific mint. They can confirm it but can't steal the NFT (it's already in the wallet). |
| `balance.ts` loose validation | Low | Uses `startsWith('xch1')` instead of full bech32m regex | Read-only endpoint. Worst case: someone queries balance for a malformed address and gets 0. |
| Self-fetch to upload | Low | `prepare.ts` calls `/api/mint/upload` via HTTP instead of a direct function call. Adds ~50ms latency. | Works correctly on Cloudflare Pages. Refactor to shared function is optional post-launch. |
| `audit.ts` / `refund.ts` inline CORS | Low | Admin-only endpoints still use inline `corsHeaders` instead of shared helpers | Not part of the critical mint pipeline. Low traffic. Can migrate later. |
| Audit logging non-blocking | Info | `logMintStep()` catches errors silently — if audit insert fails, the mint still succeeds | Correct behavior. Audit logging failure should never block a user's mint. Errors are still logged to console. |

---

## 6. Bugs Found and Fixed

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

## 7. Test Plan

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

## 8. Rollback Plan

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

## 9. Post-Launch Monitoring Queries

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

## 10. Build Status

```
npm run build (tsc -b && vite build):  PASS
npx tsc --noEmit:                      PASS
npx vite build:                        PASS (3330 modules)
Deploy commit:                         881c6fa
Deploy URL:                            https://wojak.ink
```

---

## 11. Files in the Minting Pipeline

### Backend (Cloudflare Pages Functions)

| File | Role |
|------|------|
| `functions/api/mint/_shared.ts` | CORS helpers, wallet validation, surcharge formula, internal API header |
| `functions/api/mint/mintNumberHelper.ts` | Atomic mint number allocation (UPDATE...RETURNING) |
| `functions/api/mint/auditHelper.ts` | Audit trail logging, refund tracking |
| `functions/api/mint/prepare.ts` | Main mint endpoint: validate, reserve number, upload, call MintGarden |
| `functions/api/mint/upload.ts` | IPFS upload via Pinata (image + metadata), internal-only |
| `functions/api/mint/request.ts` | MintGarden Dynamic Minting API wrapper with retries |
| `functions/api/mint/confirm.ts` | Confirm paid mint after user accepts offer |
| `functions/api/mint/status.ts` | Check for pending mints (resume on reload) |
| `functions/api/mint/pricing.ts` | Trait surcharges and supply count |
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

---

## 12. Post-Launch TODO

| Item | Priority |
|------|----------|
| Extract upload logic to shared function (eliminate self-fetch in prepare.ts) | Low |
| Migrate `audit.ts`, `refund.ts` to shared CORS helpers | Low |
| Harden `confirm.ts` wallet check (make walletAddress required) | Low |
| Update `balance.ts` to use `isValidChiaAddress` | Low |
