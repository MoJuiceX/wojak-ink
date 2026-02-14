# SPEC: Phase 6 — Monitoring & Admin Dashboard (Optional)

> **For Claude CLI:** Read this entire spec, then read every file listed in "Files to Read First" before writing any code. This is an optional internal tool — functional over pretty. Follow `CLAUDE.md` for CSS conventions.

---

## Context

After launch, the team needs visibility into trait distribution, mint activity, and credit system health. This phase creates a simple admin/stats page that pulls from existing endpoints and shows operational data.

This is an **internal tool** — not a public-facing feature. Prioritize function over form.

---

## Files to Read First

1. `CLAUDE.md` — CSS architecture, component patterns, routes
2. `src/pages/` — existing page patterns (pick a simple one as template)
3. `src/styles/theme.css` — available CSS classes
4. `functions/api/mint/pricing.ts` — trait usage data source
5. `functions/api/mint/_shared.ts` — surcharge constants and categories

---

## Access Control

For now, use a simple query parameter: `/admin?key=true` or similar.

**Do NOT:**
- Create a login system
- Store admin credentials
- Add complex auth middleware

This is a temporary measure. Real auth comes later.

Suggested: Check for a query param `?admin=true` or check if the connected wallet matches a hardcoded admin address constant.

---

## Page Location

Add a new page at route `/admin` (not listed in navigation — access by URL only).

Or: Add an "Admin" tab to the existing `/settings` page if that's simpler.

Follow existing page patterns in `src/pages/`.

---

## Section 1: Trait Distribution Table

### Data Source
- Fetch `GET /api/mint/pricing` — returns all trait data

### Display

For each surcharge category (**Head**, **Clothes**, **Face Wear**):

| Trait | Used | Effective | Surcharge | Status |
|-------|------|-----------|-----------|--------|
| Crown | 87 | 82.3 | 0.784 XCH | 🟡 83% |
| Cap | 45 | 42.1 | 0.401 XCH | 🟢 40% |
| No Headgear | 200 | 190.5 | — | exempt |

### Column Details

- **Trait**: Display name
- **Used**: `usageCount` (raw integer)
- **Effective**: `effectiveUsage` (after decay, float to 1 decimal)
- **Surcharge**: `surchargeXch` in XCH (2 decimal places). Show "—" for exempt traits.
- **Status**: Color-coded percentage of fair share
  - 🟢 Green: < 50% of fair share
  - 🟡 Yellow: 50–100% of fair share
  - 🔴 Red: > 100% of fair share (over-used)

Sort by `usageCount` descending within each category.

### Internal Data (OK to show on admin page)

Unlike the public-facing UI, the admin page CAN show:
- Fair share values
- Effective usage (decayed)
- Percentage of fair share
- All formula details

---

## Section 2: Supply Progress

### Display

```
Minted: 312 / 4,200 (7.4%)
[████████░░░░░░░░░░░░░░░░░░░░░░] 7.4%
```

- Use a simple progress bar (CSS `background` with `width: N%`)
- Show minted count, total, percentage
- Data from `supply.minted` and `supply.total` in pricing response

---

## Section 3: Recent Mints

### Data Source

Create a new API endpoint OR query the existing database:
- If creating endpoint: `GET /api/admin/recent-mints?limit=20`
- If not: Fetch from an existing endpoint that returns recent mints

### Display

| # | Wallet | Traits | Price | When |
|---|--------|--------|-------|------|
| 312 | xch1q2w...e4r5 | Crown, Suit, Aviators, ... | 0.98 XCH | 2 min ago |
| 311 | xch1a3s...d4f5 | Cap, Hoodie, No Face Wear, ... | 0.20 XCH | 5 min ago |

### Column Details

- **#**: `mint_number`
- **Wallet**: First 6 + last 4 chars of wallet address
- **Traits**: Comma-separated trait names (just the surcharge categories or all 7)
- **Price**: `totalPriceXch` in XCH
- **When**: Relative time (e.g., "2 min ago", "1 hour ago")

Show last 20 mints, ordered by most recent first.

---

## Section 4: Credit System Health

### Data Source

May need a new API endpoint: `GET /api/admin/credit-stats`

Or calculate from existing data:
- `SELECT SUM(credits_earned) FROM credit_events` — total earned
- `SELECT SUM(credits_spent) FROM credit_events WHERE credits_spent > 0` — total spent (if tracked this way)
- Count of free mints from `phase2_mints WHERE mint_type = 'free'`
- Count of distinct wallets with credits

### Display

| Metric | Value |
|--------|-------|
| Total Credits Earned | 45,230 |
| Total Credits Spent | 12,000 |
| Free Mints Used | 12 |
| Wallets with Credits | 87 |
| Avg Credits / Wallet | 520 |

---

## CSS and Styling Rules

1. Use `card-static` for each section container
2. Use `badge` for status indicators
3. Use `text-secondary` for secondary text
4. Use `text-muted` for less important data
5. Tables: Use a simple HTML table with basic styling. If `theme.css` has table styles, use them. If not, add minimal table styles to theme.css.
6. Tailwind for layout (`flex`, `gap`, `grid`, `p-`, responsive)
7. **No new CSS files**
8. **No `!important`**
9. Follow `CLAUDE.md` conventions

---

## New API Endpoints (If Needed)

If the existing endpoints don't provide the admin data, create:

### `GET /api/admin/recent-mints`

```typescript
// Query: SELECT mint_number, wallet_address, layers_json, total_price_xch, minted_at
//        FROM phase2_mints WHERE status = 'minted'
//        ORDER BY minted_at DESC LIMIT 20
```

### `GET /api/admin/credit-stats`

```typescript
// Query: SELECT
//   SUM(credits_earned) as total_earned,
//   COUNT(DISTINCT wallet_address) as wallet_count
//   FROM credit_events
// Plus: SELECT COUNT(*) FROM phase2_mints WHERE mint_type = 'free' AND status = 'minted'
```

These are admin-only endpoints. Keep them simple. No need for pagination or complex filtering.

---

## Verification

After all changes:

```bash
npm run typecheck && npm run build
```

Both must pass with zero errors.

### Manual Checks

1. Navigate to `/admin?admin=true` (or whatever access method)
2. Verify trait distribution table loads with correct data
3. Verify supply progress bar shows current count
4. Verify recent mints table shows data (may be empty if no mints yet)
5. Verify credit stats section shows data (may be zero if no credits yet)
6. Test responsive layout on mobile
