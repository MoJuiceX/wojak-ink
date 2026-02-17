# Task 3: Edge Case Matrix — Wojak Generator Minting Pipeline

## Your Role

You are a QA engineer building a comprehensive failure matrix for an NFT minting pipeline. Your job is to enumerate every combination of failure mode, timing, and concurrent access, then determine the system state after each failure.

You do NOT have access to the codebase. Everything you need is in this document.

---

## System Architecture

### External Dependencies

| Service | What It Does | Can Fail? | Retry? |
|---------|-------------|-----------|--------|
| **D1 Database** (Cloudflare SQLite) | Stores mints, credits, trait usage, audit logs | Yes (network, rate limits) | No auto-retry |
| **Pinata (IPFS)** | Stores NFT images and metadata permanently | Yes (downtime, rate limits, JWT expiry) | No auto-retry |
| **MintGarden API** | Creates NFTs on Chia blockchain | Yes (downtime, API errors) | Yes (3 retries, exponential backoff: 1s, 2s, 4s) |
| **Sage Wallet** (via WalletConnect) | User signs offers / provides address | Yes (user rejection, timeout, network) | Manual retry by user |

### Database Tables Involved

**`mint_counter`** — Single row, `next_number` field. Atomic UPDATE...RETURNING.

**`phase2_mints`** — Main mint records.
- Statuses: `pending` → `minted` | `expired` | `failed`
- Key fields: `mint_number` (unique), `wallet_address`, `layers_json`, `offer_file`, `status`, `expires_at`

**`credit_events`** — Credits earned (from trading NFTs).
- Immutable (only inserts, never updated)

**`credit_spends`** — Credits spent (on free mints).
- Inserted atomically via INSERT...SELECT with balance check

**`trait_usage`** — Trait popularity counts with time-decay.
- Updated on successful mints via batch upsert

**`mint_audit_log`** — Append-only audit trail.
- Never fails the mint if logging fails

---

## Paid Mint Flow — Step by Step

```
Step 1: Rate limit check (5/min per IP)
Step 2: Input validation (wallet, layers, colors, image)
Step 3: Expire stale pending mints (UPDATE WHERE expires_at < now)
Step 4: Check existing pending mint for this wallet
Step 5: Supply check (count minted < 4200)
Step 6: Build consolidated trait map
Step 7: Reserve mint number (UPDATE mint_counter RETURNING)
Step 8: Build CHIP-0007 metadata JSON
Step 9: Upload image to Pinata IPFS
Step 10: Upload metadata to Pinata IPFS
Step 11: Query trait_usage for surcharge calculation
Step 12: Calculate max surcharge across selected traits
Step 13: Call MintGarden API to create offer (3 retries)
Step 14: INSERT phase2_mints with status='pending', offer_file, expires_at
Step 15: Log to mint_audit_log
Step 16: Return {pending, mintId, offerFile, expiresAt, totalPriceXch}

--- USER ACCEPTS OFFER IN WALLET ---

Step 17: POST /api/mint/confirm with mintId + walletAddress + launcherId
Step 18: Rate limit check (10/min)
Step 19: Fetch pending mint, verify wallet ownership
Step 20: Verify launcherId provided
Step 21: BATCH TRANSACTION:
         - trait_usage upserts (all selected traits)
         - UPDATE phase2_mints status='minted', payment_verified=1
Step 22: Log to mint_audit_log
Step 23: Return {success, mintNumber, launcherId, mintgardenUrl}
```

---

## Free Mint Flow — Step by Step

```
Step 1: Rate limit check (5/min per IP)
Step 2: Input validation (wallet, layers, colors, image)
Step 3: Expire stale pending mints
Step 4: Check existing pending mint for this wallet
Step 5: Supply check (count minted < 4200)
Step 6: Build consolidated trait map
Step 7: Query ALL trait_usage for surcharge categories
Step 8: Calculate surcharges for all traits per category
Step 9: Identify top 3 premium traits per category
Step 10: Calculate credit cost (100 base, or scaled for premium)
Step 11: Credit balance pre-check (SELECT earned - spent >= cost)
Step 12: Reserve mint number (UPDATE mint_counter RETURNING)
Step 13: Build CHIP-0007 metadata JSON
Step 14: Upload image to Pinata IPFS
Step 15: Upload metadata to Pinata IPFS
Step 16: Call MintGarden API to create NFT directly (3 retries)
Step 17: INSERT phase2_mints with status='minted'
Step 18: BATCH TRANSACTION:
         - INSERT credit_spends (conditional WHERE balance >= cost)
         - trait_usage upserts (all selected traits)
Step 19: Check credit deduction result (row inserted?)
         - If 0 rows: mark mint as 'failed', return 409
Step 20: Log to mint_audit_log
Step 21: Return {success, mintNumber, launcherId, creditsSpent}
```

---

## Key Constants

```
SUPPLY_TOTAL = 4200
BASE_PRICE_XCH = 0.2
FREE_MINT_CREDITS = 10000  (100 credits in x100 units)
OFFER_EXPIRY_MINUTES = 15
PREMIUM_TOP_N = 3
DECAY_HALF_LIFE_DAYS = 30
```

---

## Failure Matrix Instructions

For EACH scenario below, determine:

| Column | Description |
|--------|-------------|
| **Scenario** | What fails and when |
| **DB State** | What records exist in the database after failure |
| **NFT Created?** | Is an NFT on the Chia blockchain? |
| **Money/Credits Lost?** | Did the user lose XCH or credits without getting an NFT? |
| **Mint # Wasted?** | Is a mint number consumed without a successful mint? |
| **Trait Usage Accurate?** | Is trait_usage correct, over-counted, or under-counted? |
| **User Recovery** | Can the user retry? How? What do they see? |
| **Severity** | Critical (money lost), High (stuck state), Medium (wasted resource), Low (cosmetic) |

---

## Scenarios to Analyze

### A. Paid Mint — Prepare Phase Failures

| # | Scenario |
|---|----------|
| A1 | Database unavailable at step 3 (expire stale mints) |
| A2 | mint_counter UPDATE fails at step 7 (mint number reservation) |
| A3 | Pinata image upload fails at step 9 (after mint number reserved) |
| A4 | Pinata metadata upload fails at step 10 (after image uploaded) |
| A5 | MintGarden API fails at step 13 (all 3 retries exhausted) |
| A6 | MintGarden returns 200 but no offer_file in response |
| A7 | phase2_mints INSERT fails at step 14 (after MintGarden created offer) |
| A8 | User's request times out after step 9 but before step 16 (Cloudflare 524) |

### B. Paid Mint — Confirm Phase Failures

| # | Scenario |
|---|----------|
| B1 | User never accepts offer (15 min expires) |
| B2 | User accepts offer in wallet but never calls /confirm |
| B3 | User calls /confirm but provides wrong walletAddress |
| B4 | User calls /confirm but launcherId is wrong/fake |
| B5 | Batch transaction fails at step 21 (trait_usage + status update) |
| B6 | User calls /confirm twice (double confirmation) |
| B7 | Network error between user accepting offer and /confirm call |

### C. Free Mint Failures

| # | Scenario |
|---|----------|
| C1 | Credit balance check passes at step 11, but concurrent request spends credits before step 18 |
| C2 | Pinata upload fails at step 14 (after mint number reserved) |
| C3 | MintGarden API fails at step 16 (NFT not created) |
| C4 | MintGarden returns 200 but no launcherId |
| C5 | phase2_mints INSERT fails at step 17 (after MintGarden created NFT) |
| C6 | Batch transaction fails at step 18 (credits not deducted, traits not counted) |
| C7 | User sends two free mint requests simultaneously from same wallet |
| C8 | User has exactly 100 credits, selects a premium trait costing 500 credits |

### D. Concurrent Access

| # | Scenario |
|---|----------|
| D1 | Two users reserve mint numbers at the exact same time |
| D2 | Same wallet sends paid prepare + free prepare simultaneously |
| D3 | User A calls confirm on User B's mintId with User A's wallet |
| D4 | 100 users all try to mint the last remaining NFT (#4200) simultaneously |
| D5 | User sends prepare, then immediately sends another prepare before first completes |

### E. Data Integrity

| # | Scenario |
|---|----------|
| E1 | MintGarden creates NFT but our database INSERT fails — NFT exists on-chain but not in our DB |
| E2 | trait_usage has stale data due to previous batch failure — surcharges are under-priced |
| E3 | mint_counter gets out of sync with actual max mint_number in phase2_mints |
| E4 | credit_events has a duplicate event_id (same trade recorded twice by credit tracker worker) |
| E5 | User's credits show balance of 100 but credit_spends has a row with mint_id pointing to a failed mint |

### F. External Service Recovery

| # | Scenario |
|---|----------|
| F1 | Pinata is down for 1 hour — what happens to all mint attempts during that window? |
| F2 | MintGarden is down for 1 hour — what happens? |
| F3 | Cloudflare D1 has a regional outage — what happens? |
| F4 | WalletConnect relay is down — users can't sign offers |
| F5 | Chia blockchain mempool is congested — offers take 30+ minutes to confirm |

---

## Deliverable

### Part 1: Failure Matrix Table

Create a table with ALL scenarios (A1-F5) and these columns:
- Scenario
- DB State After Failure
- NFT On-Chain?
- Money/Credits Lost?
- Mint # Wasted?
- Trait Accuracy
- User Recovery Path
- Severity

### Part 2: Critical Findings

List any scenarios where:
1. **User loses money/credits** without getting their NFT
2. **System gets into an unrecoverable state** (stuck records, broken sequences)
3. **Security vulnerability** (unauthorized access, manipulation)

For each critical finding, propose a specific fix.

### Part 3: Missing Safeguards

Identify any protections that should exist but don't:
- Missing database constraints
- Missing retry logic
- Missing cleanup jobs
- Missing user notifications
- Missing admin tools

### Part 4: Recommended Priority

Rank all findings by:
1. **P0 — Must fix before launch:** User can lose money or system breaks
2. **P1 — Fix soon after launch:** Degraded experience but no money lost
3. **P2 — Nice to have:** Edge cases that are unlikely but worth covering
