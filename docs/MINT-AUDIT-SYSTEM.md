# Mint Audit System - Your Wojak

Complete audit trail and refund management for the Your Wojak minting system.

---

## Purpose

Track every step of the mint process to:
- ✅ Identify who paid but didn't receive NFT
- ✅ Issue refunds with proof
- ✅ Troubleshoot failed mints
- ✅ Prevent fraud (no refunds without proof)
- ✅ Download audit reports anytime

---

## Components

### 1. Database Schema

**New Tables:**
- `mint_audit_log` - Step-by-step log of every mint action
- Enhanced `phase2_mints` - Added audit columns:
  - Timestamps for each step (IPFS upload, MintGarden call, etc.)
  - Error tracking (error_message, error_code)
  - Refund tracking (refund_needed, refund_issued, refund_txid)
  - Payment verification (payment_verified, payment_amount_xch)

**Migration:** `functions/migrations/032_mint_audit_trail.sql`

### 2. API Endpoints

#### `/api/mint/audit` (GET)
Download complete audit report in JSON or CSV format.

**Query Params:**
- `format=json` (default) or `csv`
- `status=all | pending | failed | needs_refund`
- `since=2026-01-01` (optional date filter)

**Authentication:**
Requires `Authorization: Bearer YOUR_ADMIN_SECRET` header.

**Response (JSON):**
```json
{
  "generated_at": "2026-02-11T12:00:00Z",
  "summary": {
    "total_mints": 150,
    "minted": 142,
    "pending": 5,
    "failed": 3,
    "needs_refund": 2,
    "refunds_issued": 1
  },
  "categories": {
    "successful": [...],
    "needs_refund": [...],
    "failed_mints": [...],
    "paid_not_confirmed": [...]
  },
  "all_mints": [...]
}
```

**CSV Export:**
Download as Excel-compatible CSV with all mint details.

#### `/api/mint/refund` (POST)
Mark refunds needed and record issued refunds.

**Actions:**

**Mark Refund Needed:**
```bash
curl -X POST https://wojak.ink/api/mint/refund \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "mark",
    "mintId": 123,
    "reason": "Payment received but NFT mint failed"
  }'
```

**Record Refund Issued:**
```bash
curl -X POST https://wojak.ink/api/mint/refund \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "issue",
    "mintId": 123,
    "txid": "abc123...",
    "notes": "Refunded via Chia wallet"
  }'
```

### 3. Admin Dashboard

**URL:** `https://wojak.ink/mint-admin.html`

**Features:**
- 📊 Summary statistics (total, successful, pending, refunds)
- 📋 Filterable tables (all mints, needs refund, failed, pending)
- 📥 Download JSON/CSV reports
- ⚡ One-click mark/issue refunds
- 🔐 Password-protected (ADMIN_SECRET)

**Screenshot of Dashboard:**
- Stats cards showing key metrics
- Tabs for filtering mints by status
- Table with all mint details
- Action buttons for refund management

---

## Setup

### 1. Run Migration

Apply the audit trail migration to production D1:

```bash
cd /Users/abit_hex/wojak-ink
npx wrangler d1 execute wojak-users --remote --file=functions/migrations/032_mint_audit_trail.sql
```

### 2. Set Admin Secret

Create a secure admin password for accessing audit tools:

```bash
# Generate secure password
openssl rand -base64 32

# Set as Cloudflare secret
npx wrangler pages secret put ADMIN_SECRET --project-name=wojak-ink
```

**Save this password securely!** You'll need it to access the admin dashboard.

### 3. Update Code

The audit system is automatically integrated when you:
- Run prepare.ts (logs each step)
- Run confirm.ts (logs confirmation)
- Any errors are captured in phase2_mints table

---

## Usage

### Scenario 1: Daily Audit

Every day, download the audit report to review:

```bash
# Via browser
https://wojak.ink/mint-admin.html

# Via API
curl https://wojak.ink/api/mint/audit?format=json \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  > audit-$(date +%Y-%m-%d).json
```

### Scenario 2: User Reports Issue

User: "I paid but didn't receive my NFT!"

**Steps:**
1. Go to `https://wojak.ink/mint-admin.html`
2. Enter ADMIN_SECRET
3. Click "Pending" tab
4. Search for user's wallet address
5. Check status:
   - **Pending + Expired Offer** → User didn't accept offer in time (no refund)
   - **Pending + Offer File + No Launcher ID** → User claims they accepted (verify payment)
   - **Failed + Error Message** → System error (mark refund)

### Scenario 3: Issue Refund

1. Go to admin dashboard
2. Click "Needs Refund" tab
3. Review the mint:
   - Check error_message
   - Verify payment_txid (if paid)
   - Confirm they didn't receive NFT (no launcher_id)
4. Send refund via Chia wallet to user's wallet_address
5. Copy Chia transaction ID
6. Click "Issue Refund" button
7. Paste transaction ID
8. Add notes (e.g., "Manual refund for failed MintGarden API call")

**Proof stored in database:**
- `refund_issued = 1`
- `refund_issued_at = timestamp`
- `refund_txid = blockchain transaction ID`
- `admin_notes = your notes`

### Scenario 4: Prevent Fraud

User: "I never received my NFT, I need a refund!"

**Verification:**
1. Search user's wallet in admin dashboard
2. Check `mintgarden_launcher_id`:
   - **Has launcher_id** → NFT was minted! Check on MintGarden/blockchain
   - **No launcher_id + status=minted** → Error (should not happen)
   - **No launcher_id + status=pending** → Offer not accepted yet
3. Check `refund_issued`:
   - **Already refunded** → Show user refund_txid as proof
4. Never refund without verification!

---

## Data You Can Track

For each mint, you have:

**User Info:**
- `wallet_address` - Who created/paid
- `created_at` - When they started mint

**Payment (Paid Mints):**
- `mint_type` - 'paid' or 'free'
- `total_price_xch` - Amount charged
- `payment_verified` - Whether payment confirmed
- `payment_txid` - Blockchain payment transaction ID

**IPFS Upload:**
- `ipfs_image_uri` - Where image is stored
- `ipfs_metadata_uri` - Where metadata is stored
- `ipfs_upload_started_at` - When upload started
- `ipfs_upload_completed_at` - When upload finished
- `image_hash` - SHA-256 of image
- `metadata_hash` - SHA-256 of metadata

**MintGarden:**
- `mintgarden_launcher_id` - NFT ID on blockchain (proof of mint)
- `mintgarden_called_at` - When we called MintGarden API
- `mintgarden_completed_at` - When MintGarden responded
- `offer_file` - Offer string (for paid mints)

**Status:**
- `status` - pending | minted | expired | failed
- `error_message` - What went wrong (if anything)
- `error_code` - Error code for categorization

**Refunds:**
- `refund_needed` - Flagged for refund
- `refund_reason` - Why refund is needed
- `refund_issued` - Refund sent
- `refund_issued_at` - When refund was sent
- `refund_txid` - Blockchain refund transaction ID
- `admin_notes` - Your notes

**Audit Trail:**
- Detailed step-by-step log in `mint_audit_log` table

---

## Categories in Audit Report

The audit API automatically categorizes mints:

1. **successful** - Minted with launcher_id ✅
2. **pending_paid** - Paid offer waiting for user to accept
3. **expired_offers** - User didn't accept offer in time
4. **failed_mints** - System errors during mint
5. **needs_refund** - Flagged for refund, not yet issued
6. **paid_not_confirmed** - Paid but no launcher_id (investigate)
7. **ipfs_upload_failed** - IPFS upload didn't complete
8. **mintgarden_call_failed** - MintGarden API didn't respond

Use these categories to quickly identify issues!

---

## Best Practices

### Daily Routine
1. Download JSON audit report every day
2. Review "needs_refund" category
3. Issue refunds within 24 hours
4. Archive audit reports for compliance

### When User Reports Issue
1. **Never refund immediately** - always verify first
2. Check audit dashboard for their wallet
3. Verify payment_txid on blockchain
4. Verify launcher_id (or absence) on MintGarden
5. Only refund if verified + no NFT received

### Record Keeping
- Keep all audit JSON files
- Store refund_txid for every refund
- Add detailed admin_notes for unusual cases
- Download CSV monthly for accounting

### Security
- **Never share ADMIN_SECRET**
- Only access admin dashboard from secure device
- Use HTTPS only (never HTTP)
- Rotate ADMIN_SECRET quarterly

---

## Troubleshooting

### "Unauthorized" Error
- Check ADMIN_SECRET is set in Cloudflare
- Verify you're using correct password
- Re-set secret: `wrangler pages secret put ADMIN_SECRET`

### "No mints found"
- Check database migration ran successfully
- Verify D1 binding is correct
- Run: `wrangler d1 execute wojak-users --remote --command "SELECT COUNT(*) FROM phase2_mints"`

### Missing launcher_id
- Check `mintgarden_completed_at` - did API respond?
- Check `error_message` - what failed?
- For paid mints: Did user accept offer? Check `payment_txid`
- May need manual investigation on MintGarden

---

## Example Queries

**Get all pending paid mints:**
```sql
SELECT id, wallet_address, created_at, total_price_xch, expires_at
FROM phase2_mints
WHERE status = 'pending' AND mint_type = 'paid'
ORDER BY created_at DESC;
```

**Get all refunds needed:**
```sql
SELECT id, wallet_address, refund_reason, created_at
FROM phase2_mints
WHERE refund_needed = 1 AND refund_issued = 0;
```

**Get all successful mints today:**
```sql
SELECT COUNT(*) as mints_today
FROM phase2_mints
WHERE status = 'minted' AND DATE(minted_at) = DATE('now');
```

---

## Summary

You now have:
- ✅ Complete audit trail of every mint
- ✅ Admin dashboard to view/manage mints
- ✅ Downloadable reports (JSON/CSV)
- ✅ Refund tracking with blockchain proof
- ✅ Fraud prevention (verify before refund)
- ✅ Categorized mint states for quick review

**Access:** `https://wojak.ink/mint-admin.html` with your ADMIN_SECRET

This system ensures you can always audit, verify, and refund with confidence!
