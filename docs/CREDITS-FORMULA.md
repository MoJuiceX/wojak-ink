# Credits Formula — Single Source of Truth

How free-mint credits are calculated from XCH spent on Wojak Farmers Plot NFTs. This is the canonical reference for the formula and constants used by the worker, backfill, and APIs.

---

## Constants

| Constant | Value | Where used |
|----------|--------|------------|
| `CREDITS_PER_FLOOR` | 50 | Worker, backfill |
| `MIN_EFFECTIVE_FLOOR` | 0.5 (XCH) | Worker, backfill |
| `WHALE_COEFFICIENT` | 0.2 | Worker, backfill |
| Free mint cost | 100 credits = 10,000 stored units | Leaderboard, balance, mint/prepare |

---

## Formula

Credits earned per XCH trade (stored in hundredths; divide by 100 for display):

```
effectiveFloor = max(0.5, floorXch)
priceRatio     = max(1, priceXch / effectiveFloor)
whaleMultiplier = 1 + 0.2 × ln(priceRatio)
rawCredits     = 50 × priceRatio × whaleMultiplier
credits_earned = round(rawCredits × 100)   // stored units
```

- **priceXch** — XCH paid for the NFT (from MintGarden event).
- **floorXch** — Floor price at time of purchase: from `floor_price_snapshots` for the event’s date; backfill uses fixed 1.0 XCH.
- **ln** — Natural log. Above-floor buys get a whale bonus.

---

## Examples

- At floor (price = floor): `priceRatio = 1`, `whaleMultiplier = 1` → **50 credits** (5,000 stored units).
- At 10× floor: `priceRatio = 10`, `whaleMultiplier ≈ 1.46` → **~730 credits** (73,000 stored units).

---

## Data flow

1. **Earned:** MintGarden trade events (type=2, XCH) → credit-tracker worker or backfill → `credit_events` (with floor-at-time for new events).
2. **Spent:** Free mints → `credit_spends` (10,000 units per mint).
3. **Balance:** `earned - spent` (in units); 10,000 units = 1 free mint.

---

## See also

- **[CREDIT-LEADERBOARD-BULLETPROOF.md](./CREDIT-LEADERBOARD-BULLETPROOF.md)** — Alerting, reconciliation, health endpoint, and ops.
- **[CREDITS-AUDIT-GUIDE.md](./CREDITS-AUDIT-GUIDE.md)** — How to audit and reconcile with MintGarden.
