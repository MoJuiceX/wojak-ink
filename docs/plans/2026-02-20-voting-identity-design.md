# Voting & Identity Design — Launch Week

**Date:** 2026-02-20
**Status:** Approved
**Scope:** Everything needed for mint → vote → leaderboard flow at launch. Battle system excluded (next week).

---

## Goals

Users mint a Wojak → anyone can vote on it → votes drive a public leaderboard. Users appear on the leaderboard whether or not they have a Chia DID.

---

## Decision Log

### 1. Anyone Can Vote (No Holder / DID Requirement)

**Decision:** Any user can cast a vote. No wallet required. No DID required. No daily cap.

**What changes:**
- Vote power (`combat_fighters.vote_power`) now updates from ALL votes, not just holder votes
- Previously only `phase1_verified` holders moved the vote_power needle

**What stays the same:**
- Credits are ONLY earned by Farmers Plot holders (`phase1_verified = 1`)
- The credit economy is untouched — non-holders vote but earn no credits

**Rationale:** Small community at launch. Restricting vote_power to holders meant most votes had zero effect on rankings. The leaderboard would be frozen for non-holders.

---

### 2. Wallet Address as Primary Identity (DID is Opt-In)

**Decision:** Drop DID as hard requirement for fighter ownership. Every minted fighter stores the minter's wallet address (`owner_address`) at creation time.

**What changes:**
- New column: `combat_fighters.owner_address TEXT DEFAULT ''`
- Mint process stores wallet address at INSERT time
- DID remains the preferred display identity when present

**What stays the same:**
- `owner_did` column unchanged — still used when populated
- Users with a DID still group under their DID on the players leaderboard
- DID = opt-in multi-wallet aggregation (one DID → multiple wallets' Wojaks combined)

**Rationale:** Most new minters at launch won't have a DID set up. Without `owner_address`, their Wojaks would have `owner_did = ''` and be invisible on the players leaderboard. The wallet address is always available at mint time.

---

### 3. Leaderboard Shows Both DID and Wallet-Address Users

**Decision:** The players leaderboard groups by DID when present, falls back to wallet address.

**SQL pattern:**
```sql
GROUP BY COALESCE(NULLIF(owner_did, ''), owner_address)
```

**Two leaderboard views (already exist, just need fixes):**

| View | Endpoint | Shows |
|------|----------|-------|
| **Individual Wojaks** | `GET /api/combat/power-leaderboard?type=wojaks` | Every fighter by power_score |
| **Players** | `GET /api/combat/power-leaderboard?type=players` | Grouped by DID or wallet address |

The "Players" view currently filters `owner_did != ''` — this filter must be removed.

**Display name fallback:**
- Has DID profile with name → show name
- Has DID, no name → show truncated DID
- No DID → show truncated wallet address (xch1...xxxx)

---

### 4. DID as Incentive (Not Enforced)

**Decision:** Users are incentivized to register a DID to combine their multi-wallet Wojak collection under one identity and get a higher aggregated power score. Never enforced. Never required.

**Incentives to add a DID:**
- Players leaderboard shows combined power of ALL Wojaks under their DID
- Higher power score visibility = competitive bragging rights
- Future: DID-gated credit multipliers (not in launch scope)

---

## Power Score Flow (Post-Launch)

```
Mint → combat_fighters row created
         owner_address = minter's wallet
         owner_did = '' (or DID if they have one)
         power_score = 0

↓

Any user votes like/dislike
→ wojak_scores updated (all votes)
→ combat_fighters.vote_power updated (all votes)
→ combat_fighters.power_score = vote_power + battle_power
→ Credits awarded ONLY if voter is phase1_verified holder

↓

Leaderboard queries combat_fighters
→ wojaks: rank by power_score
→ players: group by COALESCE(NULLIF(owner_did,''), owner_address), rank by SUM(power_score)
```

---

## Out of Scope (Next Week)

- Battle system (auto-resolve async MVP)
- Battle power accumulation
- ELO / level changes
- DID aggregation UI (connecting DID to existing Wojaks)

---

## Implementation Specs

Two specs for Claude CLI, in order:

1. `docs/plans/2026-02-20-vote-power-all-voters-spec.md` — wire all votes to update vote_power
2. `docs/plans/2026-02-20-wallet-identity-leaderboard-spec.md` — migration + mint update + leaderboard fix
