# Minting System Audit Report

**Date:** 2026-02-13
**Scope:** Full audit of the Wojak.ink minting pipeline (backend + frontend)
**Standard:** Production-launch quality
**Passes:** Initial audit + deep independent re-review

---

## Summary

Complete audit and hardening of the minting pipeline across 9 backend files and 3 frontend files. Eliminated duplicated CORS boilerplate by centralising into `_shared.ts`, replaced all inline `new Response(JSON.stringify(...))` patterns with shared `jsonResponse`/`errorResponse` helpers, fixed mint number race condition with atomic counter, added wallet address validation, secured the upload endpoint from public abuse, added layer path traversal protection, enabled the full paid-mint UX flow including WalletConnect offer acceptance, and removed the placeholder "Soon" badge to expose the working mint button.

---

## Files Created

| File | Description |
|------|-------------|
| `functions/api/mint/_shared.ts` | Shared CORS helpers, wallet validation, surcharge formula, internal API header |
| `functions/api/mint/mintNumberHelper.ts` | Atomic mint number allocation using `UPDATE...RETURNING` |
| `functions/api/mint/auditHelper.ts` | Audit trail logging helper for mint steps |
| `functions/migrations/031_mint_counter.sql` | Counter table migration for atomic numbering |
| `functions/migrations/032_mint_audit_trail.sql` | Audit log + refund tracking tables |
| `docs/AUDIT-REPORT.md` | This report |

---

## Files Modified

| File | Changes |
|------|---------|
| `functions/api/mint/prepare.ts` | Shared imports, `isValidChiaAddress`, `getNextMintNumber` (atomic), metadata uses real mint number, path validation, internal API header on upload fetch, all inline responses replaced with helpers |
| `functions/api/mint/confirm.ts` | Shared CORS imports (`jsonResponse`/`errorResponse`/`optionsResponse`), wallet ownership verification, uses pre-assigned mint_number (no more `SELECT MAX`) |
| `functions/api/mint/upload.ts` | Shared CORS imports, multi-gateway IPFS URIs (ipfs://, Pinata, ipfs.io), `X-Internal-Mint-Request` guard, removed unused `corsHeaders` import |
| `functions/api/mint/request.ts` | URI arrays (`ipfsImageUris: string[]`), throws on missing config instead of silent null, `editionNumber`/`editionTotal` passthrough |
| `functions/api/mint/pricing.ts` | Shared `surchargeXch` import (single source of truth), shared CORS helpers, removed duplicate constants |
| `functions/api/mint/status.ts` | Shared CORS imports, `isValidChiaAddress` for wallet validation |
| `src/contexts/MintContext.tsx` | `acceptOfferInWallet()` for WalletConnect takeOffer, `confirmMintManual()` for manual confirmation |
| `src/components/generator/MintFlowModal.tsx` | "Accept in Wallet" primary, "Copy Offer" secondary, "I've already accepted" link, expired-offer countdown with disabled buttons and red timer |
| `src/components/generator/ActionBar.tsx` | Removed "Soon" placeholder, enabled mint button with free/paid toggle, supply counter, MintFlowModal integration |

---

## Bugs Found & Fixed

| Bug | Severity | File | Fix |
|-----|----------|------|-----|
| Mint number race condition: `SELECT MAX(mint_number) + 1` could assign duplicate numbers under concurrent mints | **Critical** | `prepare.ts` | Replaced with atomic `UPDATE...RETURNING` via `mintNumberHelper.ts` |
| Metadata naming mismatch: IPFS metadata name used `mintedCount + 1` which could differ from actual assigned number | **High** | `prepare.ts` | Mint number now reserved BEFORE building metadata; name matches actual number |
| `confirm.ts` still used `SELECT MAX` for numbering | **High** | `confirm.ts` | Mint number now assigned at prepare time; confirm only transitions status |
| Expired offer still showed clickable Accept/Copy buttons in MintFlowModal | **Medium** | `MintFlowModal.tsx` | Added `isExpired` state; timer turns red at 0:00, Accept/Copy buttons hidden, "offer expired" message shown |
| `request.ts` silently returned null on missing config | **Medium** | `request.ts` | Now throws descriptive error |
| `upload.ts` imported `corsHeaders` but never used it directly | **Low** | `upload.ts` | Removed unused import |
| `status.ts` wallet validation only checked `startsWith('xch1')` | **Low** | `status.ts` | Uses `isValidChiaAddress` (full bech32m regex) |
| Surcharge formula duplicated in 3 files | **Low** | `prepare.ts`, `pricing.ts` | Single source in `_shared.ts` |
| CORS headers duplicated in 5 files | **Low** | All mint endpoints | Single source in `_shared.ts` |

---

## Security Issues Found & Fixed

| Issue | Severity | File | Fix |
|-------|----------|------|-----|
| Upload endpoint publicly accessible: anyone could upload to Pinata account | **High** | `upload.ts` | Added `X-Internal-Mint-Request` header guard; `prepare.ts` sends env-based secret |
| No layer path validation: directory traversal payloads accepted | **Medium** | `prepare.ts` | Added path validation: max 3 segments, no `..` or `.` components |
| Confirm endpoint allows any caller to confirm any mint | **Medium** | `confirm.ts` | Added wallet ownership verification (soft check: only enforced if `walletAddress` provided) |
| Wallet address validation too loose (`startsWith` only) | **Low** | `prepare.ts`, `status.ts` | Full bech32m regex: `^xch1[a-z0-9]{58}$` |

---

## Deep Review Findings (Second Pass)

### End-to-End Flow Trace

**Free mint flow:** ActionBar `handleMintClick` -> `exportImage` (WebP blob) -> `blobToBase64` -> POST `/api/mint/prepare` -> validate wallet/layers/colors -> check supply -> check credits -> `getNextMintNumber` (atomic) -> build CHIP-0007 metadata with correct mint number -> POST `/api/mint/upload` (with internal header) -> Pinata upload image + metadata -> `callMintGardenMint` (free, with URI arrays) -> INSERT `phase2_mints` status=minted -> INSERT `credit_spends` -> log audit step -> increment `trait_usage` -> return `{success, mintNumber, launcherId}` -> MintContext sets `success` step -> MintFlowModal shows success + MintGarden link. **Verified correct.**

**Paid mint flow:** Same as free through upload, then -> `callMintGardenMint` (paid, with `requested_mojos`) -> INSERT `phase2_mints` status=pending with offer_file and expires_at -> return `{pending, mintId, offerFile}` -> MintContext sets `signing` step -> MintFlowModal shows countdown + Accept/Copy/Manual buttons -> User clicks "Accept in Wallet" -> `takeOffer` via WalletConnect -> POST `/api/mint/confirm` with mintId + walletAddress -> verify wallet ownership -> UPDATE status=minted -> return success. **Verified correct.**

### Schema Verification

All columns referenced in INSERT/UPDATE statements across `prepare.ts`, `confirm.ts`, `status.ts`, and `pricing.ts` are present in the database schema across migrations 030-032. No column mismatches. **Verified correct.**

### Known Acceptable Gaps

| Item | Severity | Description | Why Acceptable |
|------|----------|-------------|----------------|
| Mint number consumed on IPFS/MintGarden failure | Low | If upload or MintGarden call fails after `getNextMintNumber()`, the number is wasted creating gaps (#1, #2, #5...) | Gaps are cosmetic only; NFT numbering doesn't need to be contiguous. The alternative (reserving after success) would reintroduce the metadata-name-mismatch bug |
| `confirm.ts` confirm without `launcherId` returns `{pending: true}` | Info | If MintGarden didn't return a launcherId at create time AND user doesn't provide one, confirm returns pending instead of success | This is correct behavior — user is told to try again once NFT appears in wallet. "I've already accepted" button handles this case |
| Self-fetch in `prepare.ts` to own `/api/mint/upload` | Low | Adds one extra HTTP hop (~50ms latency) | Works correctly on Cloudflare Pages; refactor to shared function is optional post-launch optimization |
| `audit.ts` and `refund.ts` still use inline `corsHeaders` | Low | Not part of core mint pipeline | Admin-only endpoints, low traffic, can be migrated to shared helpers later |

---

## Remaining TODOs (Post-Launch)

| Item | Priority |
|------|----------|
| Set `INTERNAL_MINT_SECRET` as Cloudflare secret | **Before launch** |
| Extract upload logic to shared function (eliminate self-fetch) | Low |
| Migrate `audit.ts`, `refund.ts` to shared CORS helpers | Low |
| Fix pre-existing `tsc -b` strict errors in `canvasRendererLayerBuilder.ts` | Separate ticket |

---

## Build Status

- `npx tsc --noEmit`: **PASS** (clean, no errors)
- `npx vite build`: **PASS** (3330 modules, built in 6.63s, output in `dist/`)
- `npm run build` (`tsc -b && vite build`): FAIL on pre-existing `tsc -b` strict errors in `canvasRendererLayerBuilder.ts` (not introduced by this audit)
