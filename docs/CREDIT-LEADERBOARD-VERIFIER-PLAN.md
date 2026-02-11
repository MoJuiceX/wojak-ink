# Credit Leaderboard Verifier — Plan

## Goal

Standalone HTML page to verify all wallets on the credit leaderboard, with drill-down into each wallet's purchase history. Transparency without overload.

---

## What to Show

### 1. Header / Context (small, scannable)

- **Title**: "Credit Leaderboard Verification"
- **One-liner**: "Wallets ranked by credit balance. Click a row to see purchase history."
- **Transparency note**: "Data from MintGarden Events (XCH trades only). CAT token purchases are not included."
- **Optional**: Link to audit guide / formula doc

### 2. Leaderboard Table (primary view)

| Column       | Purpose                                         |
|--------------|--------------------------------------------------|
| Rank         | #1, #2, …                                       |
| Wallet       | Truncated (xch1...xyz) with copy button         |
| Credits      | Balance (earned − spent)                         |
| Free mints   | floor(balance / 100)                             |
| XCH spent    | Total XCH (from history when expanded)          |
| Expand       | Chevron / "View purchases"                      |

- Rows expand on click
- Sparse, readable layout
- Top 3 rows can have subtle accent (gold/silver/bronze or similar)

### 3. Expanded Row (details on demand)

When a row is expanded:

- **Purchase history** for that wallet
- Each row: NFT (link to MintGarden), Price (XCH), Credits earned, Date
- Optional: "View wallet on Spacescan" link
- Optional: Show totals (X purchases, Y.XCH total)

### 4. What to Avoid

- Don’t show whale multiplier or event IDs unless user explicitly asks
- Don’t load all histories upfront (only on expand)
- Don’t pack too much info into the main table

---

## Data Source

**Option A — Live API (production)**

- `GET /api/credits/leaderboard?limit=100` → leaderboard
- `GET /api/credits/history?wallet=xch1...&limit=100` → per-wallet history

**Option B — Static JSON (offline / testing)**

- Load `scripts/audit-credits-report.json` (from `node scripts/audit-credits.mjs`)
- No backend required; works with `file://` or local server

**Hybrid**: Try API first; fall back to JSON if API unavailable.

---

## File Placement

- `public/credit-leaderboard-verifier.html` — deployable with the site, served at `/credit-leaderboard-verifier.html`
- Or `scripts/credit-leaderboard-verifier.html` — for local use only

Recommendation: `public/` so it’s accessible in production.

---

## UX Flow

1. Page loads → fetch leaderboard (API or JSON)
2. Render table; show loading skeleton if needed
3. User clicks wallet row → expand, fetch history (if not cached)
4. Show purchase list with MintGarden links
5. Click same row again → collapse

---

## Design Notes

- Dark theme (match wojak-ink)
- Orange accent for primary actions / highlights
- Responsive: table scrolls horizontally on small screens
