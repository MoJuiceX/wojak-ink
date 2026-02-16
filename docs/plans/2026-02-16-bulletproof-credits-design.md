# Bulletproof Credit Pipeline Design

## Problem

The credit pipeline has gaps that require manual intervention: duplicates can slip through, CAT token whitelist requires redeployment to change, no self-healing, no integrity validation.

## Solution: Three Layers of Defense

### Layer 1: Prevention
- Move CAT whitelist from hardcoded `Set` to `cat_credit_whitelist` D1 table
- Same-path + cross-path dedup checks (already implemented)
- Skip crediting if CAT rate is stale (>7 days old)

### Layer 2: Detection (every cron run)
- Scan for duplicate wallet+edition entries
- Check CAT rates were refreshed in last 24h
- Verify floor price snapshot exists for today
- Store health summary in KV

### Layer 3: Self-Healing
- Auto-delete duplicate credit entries (keep earliest)
- Force floor snapshot refresh if missing
- Log all auto-fixes for audit trail

## Changes

### 1. Migration: `cat_credit_whitelist` table
```sql
CREATE TABLE cat_credit_whitelist (
  token_code TEXT PRIMARY KEY,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  added_by TEXT NOT NULL DEFAULT 'migration'
);
```
Seeded with current hardcoded whitelist.

### 2. Admin API: `GET/PUT /api/admin/cat-whitelist`
- GET: returns current whitelist
- PUT: add/remove tokens (ADMIN_SECRET auth)

### 3. Credit-tracker refactor
- Load whitelist from D1 at start of each run
- Post-processing integrity check + auto-dedup
- Write health summary to KV key `credit_health`

### 4. Credits-alert enhancement
- Read `credit_health` from KV
- Alert on: duplicates auto-fixed, rates stale, floor missing, zero events

## What stays the same
- Credit formula, leaderboard API, frontend, fetch-sales worker
