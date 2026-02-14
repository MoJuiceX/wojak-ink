# Credits Formula V2 — Revenue-Neutral with Capped Whale Bonus

How free-mint credits are calculated from XCH spent on Wojak Farmers Plot NFTs. This is the canonical reference for the formula and constants used by the worker, backfill, and APIs.

---

## Economic Model

| Fact | Value |
|------|-------|
| Royalty rate on Farmers Plot sales | **10%** |
| Your Wojak mint price | **0.2 XCH** |
| Royalty earned on a 2 XCH floor buy | **0.2 XCH** |

At floor, 1 purchase generates exactly enough royalty to fund 1 free mint. The credit formula is designed to be **revenue-neutral**: credits earned are proportional to the royalty income from that sale.

---

## Constants

| Constant | Value | Meaning | Where used |
|----------|-------|---------|------------|
| `CREDITS_PER_XCH` | 50 | Credits per 1 XCH spent (before whale bonus) | Worker, backfill |
| `MAX_WHALE_BONUS` | 0.30 | Whale multiplier cap (max 1.30x) | Worker, backfill |
| `MIN_EFFECTIVE_FLOOR` | 0.5 (XCH) | Prevents division by tiny/zero floors | Worker, backfill |
| `FLOOR_FALLBACK_XCH` | 100 (= 1.0 XCH x100) | When no floor snapshot exists | Worker |
| Free mint cost | 100 credits = 10,000 stored units | | Leaderboard, balance, mint/prepare |

---

## Formula

Credits earned per trade (stored in hundredths; divide by 100 for display):

```
effectiveFloor  = max(0.5, floorXch)
priceRatio      = max(1, priceXch / effectiveFloor)
whaleMultiplier = 1 + 0.30 * (1 - 1 / priceRatio)
rawCredits      = 50 * priceXch * whaleMultiplier
credits_earned  = round(rawCredits * 100)   // stored units
```

- **priceXch** -- XCH paid for the NFT (from trade event).
- **floorXch** -- Floor price at time of purchase: from `floor_price_snapshots` for the event's date; backfill uses fixed 1.0 XCH.
- **whaleMultiplier** -- Asymptotic: approaches 1.30 but never exceeds it. At floor (priceRatio=1), multiplier is exactly 1.0.

---

## Examples

### At floor (2 XCH, floor = 2 XCH)

```
priceRatio = 1, whaleMultiplier = 1.0
rawCredits = 50 * 2 * 1.0 = 100
-> 100 credits = 1 free mint
Royalty: 0.2 XCH. Free mint value: 0.2 XCH. Revenue-neutral.
```

### Above floor (4 XCH, floor = 2 XCH)

```
priceRatio = 2, whaleMultiplier = 1.15
rawCredits = 50 * 4 * 1.15 = 230
-> 230 credits = 2.3 free mints
```

### Whale purchase (20 XCH, floor = 2 XCH)

```
priceRatio = 10, whaleMultiplier = 1.27
rawCredits = 50 * 20 * 1.27 = 1270
-> 1270 credits = 12.7 free mints
```

### Wash trade safety (100 XCH, floor = 2 XCH)

```
priceRatio = 50, whaleMultiplier = 1.294
rawCredits = 50 * 100 * 1.294 = 6470
-> 6470 credits = 64.7 free mints = 12.94 XCH value
Attacker cost: 12 XCH (10% royalty + 2% marketplace fee)
Net profit: ~0.94 XCH (~1% of capital). Not economically viable.
```

For the full wash trade analysis table, see `docs/SPEC-CREDIT-FORMULA-V2.md`.

---

## Data flow

1. **Earned:** Trade events (type=2, XCH or CAT with xch_equivalent) -> credit-tracker worker or backfill -> `credit_events` (with floor-at-time for new events).
2. **Spent:** Free mints -> `credit_spends` (10,000 units per mint).
3. **Balance:** `earned - spent` (in units); 10,000 units = 1 free mint.

---

## See also

- **[SPEC-CREDIT-FORMULA-V2.md](./SPEC-CREDIT-FORMULA-V2.md)** -- Full derivation, wash trade analysis table, and implementation spec.
- **[CREDIT-LEADERBOARD-BULLETPROOF.md](./CREDIT-LEADERBOARD-BULLETPROOF.md)** -- Alerting, reconciliation, health endpoint, and ops.
- **[CREDITS-AUDIT-GUIDE.md](./CREDITS-AUDIT-GUIDE.md)** -- How to audit and reconcile with MintGarden.
