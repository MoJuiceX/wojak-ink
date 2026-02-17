# Phase 4: Mint Pipeline Error Logging

## What This Is

When the mint pipeline fails in production, you currently have no visibility. Errors go to `console.error()` which disappears into the void on Cloudflare Workers. You need a persistent error log so you can see what's failing and why, especially on launch day.

## Before You Start

1. Read `CLAUDE.md` for project conventions
2. Read `functions/api/mint/process.ts` — the main processor with `handleJobFailure()`
3. Read `functions/api/mint/cleanup.ts` — the cleanup with error logging
4. Read `functions/api/mint/auditHelper.ts` — existing `logMintStep()` function
5. Read `functions/api/mint/errors.ts` — the `MintError` class with error codes
6. Read `functions/migrations/032_mint_audit_trail.sql` — the existing `mint_audit_log` table
7. Read `functions/api/admin/` — check what admin endpoints exist

## Architecture Context

- **Existing audit table:** `mint_audit_log` already exists with columns: `id`, `mint_id`, `step`, `status`, `data` (JSON), `error` (TEXT), `created_at`
- **Existing helper:** `logMintStep(db, mintId, step, status, data?, error?)` in `auditHelper.ts` — writes to `mint_audit_log` silently (catches errors)
- **Existing error class:** `MintError` with typed codes like `SUPPLY_EXHAUSTED`, `IPFS_UPLOAD_FAILED`, `MINTGARDEN_API_ERROR`, etc.
- **Current logging:** `console.error()` calls scattered through process.ts, cleanup.ts, submit.ts

## What to Build

Use `/brainstorm` to explore the approach, then `/write-plan`, then `/execute-plan`.

### 1. Admin Error Dashboard Endpoint

Create `functions/api/admin/mint-errors.ts`:

```
GET /api/admin/mint-errors?hours=24&severity=error
```

Returns recent errors from `mint_audit_log` where `status = 'error'` or `status = 'failed'`, ordered by `created_at DESC`, limited to last N hours.

Response:
```json
{
  "errors": [
    {
      "id": 123,
      "mintId": 45,
      "step": "uploading_ipfs",
      "error": "Pinata API timeout after 30s",
      "errorCode": "IPFS_UPLOAD_FAILED",
      "wallet": "xch1...",
      "mintType": "free",
      "createdAt": "2026-02-16T10:30:00Z"
    }
  ],
  "summary": {
    "total": 5,
    "byStep": { "uploading_ipfs": 3, "calling_mintgarden": 2 },
    "byCode": { "IPFS_UPLOAD_FAILED": 3, "MINTGARDEN_API_ERROR": 2 }
  }
}
```

Auth: Use the same admin Bearer token pattern as `functions/api/mint/cron.ts`.

### 2. Ensure All Failure Paths Log to mint_audit_log

Audit every `console.error` in the mint pipeline and ensure there's a corresponding `logMintStep()` call. Key places to check:

**process.ts:**
- `handleJobFailure()` — should log with status='failed', include error message and code
- Each step failure (validating, reserving_number, uploading_ipfs, calling_mintgarden) — should log step-specific errors
- `finalizeJob()` failure — should log with step='finalizing', status='error'

**submit.ts:**
- Credit deduction failure — log if INSERT...SELECT returns 0 changes unexpectedly
- Job INSERT failure (non-wallet-lock) — log unexpected INSERT errors
- General catch block — log the error

**cleanup.ts:**
- Auto-finalize failure — already has console.error, ensure logMintStep too
- Retry failure — log which job failed and why
- IPFS unpin failure — log the CID that failed to unpin

**confirm-payment.ts:**
- MintGarden verification failure — log the launcherId and response

### 3. Add Error Summary to Existing Status Endpoint

If there's a `/api/admin/status` or similar health check endpoint, add a `recentErrors` count to its response so you can see at a glance if things are failing.

### 4. Optional: Mint Pipeline Health Check

Create or extend a health endpoint that returns:
- Jobs in each step (queued, processing, awaiting_payment, etc.)
- Failed jobs in last hour
- Average processing time
- IPFS upload success rate
- MintGarden API success rate

This gives you a dashboard view for launch day.

## What NOT to Do

- Do NOT add Sentry or any external error tracking service — D1 is sufficient for now
- Do NOT add new npm dependencies
- Do NOT modify the `mint_audit_log` schema — it already has everything you need
- Do NOT expose error details to non-admin users — admin endpoints only
- Do NOT remove `console.error` calls — keep them AND add `logMintStep`
- Do NOT use `!important` in CSS

## Constraints

- Admin endpoints must check Bearer token: `request.headers.get('Authorization') === 'Bearer ' + env.MINT_CRON_SECRET`
- Use the existing `logMintStep()` helper — don't create a new logging function
- Log silently (don't let logging errors crash the mint flow — `logMintStep` already handles this)
- Keep error messages useful but don't log sensitive data (no full image base64, no wallet private keys)
- Place new endpoints in `functions/api/admin/`
