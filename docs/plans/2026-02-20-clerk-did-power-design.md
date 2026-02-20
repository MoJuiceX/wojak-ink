# Clerk-first DID, Power Level, and Rankings Design

**Date:** 2026-02-20

**Goal:** Users sign in with Clerk (Google/X), link their DID (where they hold Wojak Farmers Plot + Your Wojaks), set a display name, and see power levels. Players = DIDs on the ranking; Wojaks = individual NFTs. On the voting side, show DIDs with power level and the NFTs in each DID.

---

## 1. Model (as you described)

- **DID** = player identity. User puts Wojak Farmers Plot NFT and all their Your Wojak NFTs into one DID.
- **Power level** = derived from: how many NFTs in that DID + votes those NFTs received + battles those NFTs won. (Already computed today: `game_players.power_level`, `combat_fighters.vote_power` + `battle_power`.)
- **Login:** User logs in with **Clerk** (Google or X). Then they **link their DID** (one-time). They can set an **individual (display) name** for that DID.
- **Ranking:** Two lists — **Players** = DIDs (with power level); **Wojaks** = individual NFTs (by votes/battles). The app already has these as two tabs; we keep and clarify the labels.
- **Voting side:** Show **power levels of DIDs** that have signed in and linked their DID, and show **all NFTs in that DID**.

---

## 2. Current state (brief)

- **Clerk:** Already on the site (ClerkProvider, Sign In / Sign Out). Used for Account, Shop, some APIs (e.g. display-name PUT).
- **Game registration today:** Wallet-first. User connects **Sage wallet** → SwipeAutoRegister gets DIDs from wallet → `POST /api/game/register` with `did` + `walletAddress`. Session stored in sessionStorage (did, walletAddress). No Clerk in this path.
- **game_players:** `did_id` (PK), `wallet_address`, `power_level`, `phase1_verified`, and **`clerk_user_id`** (from migration 053) — **currently unused**. Unique index on `clerk_user_id` when not null.
- **did_profiles:** `did_id`, `display_name`, `name_source`. Display name is per DID. PUT `/api/profile/display-name` requires auth and expects JWT to have a `did` claim (so today it only works if the token somehow carries DID — e.g. custom claim — or we need to change this to “Clerk user + DID in body, verify DID is linked to this Clerk user”).
- **Leaderboard:** `/api/game/leaderboard` returns **players** (DIDs) by power level, with `displayName` from `did_profiles`. Only `phase1_verified = 1` and `power_level > 0`. No filter by “signed in” or `clerk_user_id`.
- **Top Wojaks:** `/api/game/top-wojaks` returns **individual NFTs** by net score. Already used as “Wojaks” tab.
- **Voting left panel:** MiniLeaderboard = top 10 from `/api/game/leaderboard` (DIDs + power level). No “NFTs in this DID” list yet.

---

## 3. Desired flow

1. User **signs in with Clerk** (Google or X). No wallet required to see the app.
2. On first visit to Fight Club / Swipe (or a dedicated “Game identity” area), if no DID is linked to this Clerk user:
   - Show **“Link your DID”**: input DID (did:chia:1...). Optional: “Link wallet later” for Phase 1 verification.
   - On submit: call **link-DID** API (Clerk auth required). Backend creates or updates `game_players` with `did_id` and `clerk_user_id`, and optionally `wallet_address` if provided.
3. After linking, user can **set a display name** for their DID (existing did_profiles + display-name API; we adjust so it works with “Clerk auth + DID in body, backend verifies DID belongs to this Clerk user”).
4. **Phase 1 (Wojak Farmers Plot):** Either keep wallet connect for verification (user connects wallet, we detect DID from wallet and match to linked DID; or user pastes NFT launcher ID). Or we can verify Phase 1 by DID alone (MintGarden profile/DID holdings) without wallet — already supported by verify-phase1 and refresh-did.
5. **Voting side:** Left panel shows **DIDs with power level** (already MiniLeaderboard). Add or expand so we can show **NFTs in that DID** (e.g. expand row or second section). Data: `did_holdings` + phase2 mints for that DID.
6. **Ranking:** Keep two tabs. **Players** = DIDs (from leaderboard API) — clarify label “Players (DIDs)”. **Wojaks** = individual NFTs — label “Wojaks (NFTs)”. Optionally show only DIDs that have linked Clerk (`clerk_user_id IS NOT NULL`) if you want “only signed-in players” on the board.

---

## 4. API and data changes

### 4.1 Link DID (new)

- **POST /api/game/link-did**  
  - **Auth:** Clerk required (Bearer token).  
  - **Body:** `{ did: string, walletAddress?: string }`.  
  - **Logic:**
    - Validate DID format.
    - Get Clerk `userId` from JWT.
    - If `walletAddress` provided, validate Chia address.
    - If a row exists with `clerk_user_id = userId`, update that row: set `did_id = body.did`, optionally `wallet_address = body.walletAddress`. (One Clerk user → one DID.)
    - Else if a row exists with `did_id = body.did`, update it: set `clerk_user_id = userId`, optionally `wallet_address`.
    - Else insert new `game_players` row: `did_id`, `clerk_user_id = userId`, `wallet_address` (or placeholder if not provided).
  - **Response:** Same shape as register (player with did, powerLevel, phase1Verified, onboarding).
  - **Rate limit:** Reuse register-like limit per Clerk user.

### 4.2 Get player by Clerk (new)

- **GET /api/game/me** (or **GET /api/game/player?by=clerk**)  
  - **Auth:** Clerk required.  
  - **Logic:** Select from `game_players` where `clerk_user_id = auth.userId`. Return player (did, powerLevel, phase1Verified, onboarding, walletAddress if any). If no row, return `{ player: null }`.
  - Used by frontend when user is signed in with Clerk to load game state without wallet.

### 4.3 Register (existing)

- **POST /api/game/register**  
  - Keep for **wallet-first** path: no Clerk, just `did` + `walletAddress`. Used when user connects wallet and we don’t have Clerk (or as fallback). Optionally: if request includes a valid Clerk token, also set `clerk_user_id` so the same DID is tied to Clerk.

### 4.4 Display name PUT (adjust)

- **PUT /api/profile/display-name**  
  - Today: expects `did` in JWT (`callerDid`).  
  - **Change:** Accept Clerk auth. Body: `{ did, name, source }`. Backend: ensure `game_players.did_id = body.did` and `game_players.clerk_user_id = auth.userId`. Then update `did_profiles` for that `did_id`. So “only the DID linked to this Clerk user can be named.”

### 4.5 Leaderboard (optional filter)

- **GET /api/game/leaderboard**  
  - Optional query: `?signedInOnly=1` to restrict to rows where `clerk_user_id IS NOT NULL`. Default: show all (current behavior). Lets you later show “only DIDs that signed in with Clerk” if desired.

### 4.6 NFTs in a DID (for voting left panel)

- **GET /api/game/did-nfts?did=...**  
  - Returns list of NFTs (Your Wojaks) in that DID: from `did_holdings` joined with phase2 mints / wojak_scores so each item has edition, nftId, imageUri, vote stats. Used to show “all NFTs in this DID” on the voting side.

---

## 5. Frontend changes

### 5.1 GameContext and session

- **When Clerk signed in:**
  - On mount (or when Clerk userId appears), call **GET /api/game/me** (with Clerk token). If `player` is returned, set that as game player (did, powerLevel, etc.). No wallet or sessionStorage needed for identity.
  - If `player` is null, treat as “not linked”: show **Link DID** flow (no wallet required to open the page).
- **When Clerk signed out:**
  - Clear game player. Optionally keep guest voting with `guestId` only.
- **Wallet:**
  - Keep Sage wallet for Phase 1 verification (and optional “link wallet” when linking DID). SwipeAutoRegister can stay for wallet-first users; for Clerk-first users we don’t depend on it for identity.

### 5.2 Link-DID flow (new or reuse GateChecklist)

- **Place:** Fight Club / Swipe, or a “Game identity” section in Account/Settings.
- **UI:** If Clerk signed in and GET /api/game/me returns null:
  - “Link your DID” — input DID (did:chia:1...).
  - Optional: “Link wallet” (Chia address) for Phase 1 verification later.
  - Submit → POST /api/game/link-did with Clerk token. On success, refresh /api/game/me and show display name + power level.
- **Display name:** After DID is linked, show existing DisplayNameEditor (Settings or Fight Club). It will call PUT display-name with `did` in body; backend will verify DID is linked to current Clerk user.

### 5.3 Voting side — left panel

- **Current:** MiniLeaderboard = top 10 DIDs with power level (from leaderboard API).
- **Add:** For each DID (or on expand), show **NFTs in that DID**. Call GET /api/game/did-nfts?did=... and render a compact list (thumbnail + edition or name). So “DIDs with power level” + “NFTs in that DID” are both visible.

### 5.4 Ranking page

- **Labels:** Rename or clarify: **“Players”** = DIDs (people/identities with power level). **“Wojaks”** = individual NFTs. Optional subtitle: “Players = DIDs · Wojaks = NFTs” so the distinction is clear.

---

## 6. Phase 1 (Wojak Farmers Plot) and power level

- **Verification:** Keep existing verify-phase1 and refresh-did: they check MintGarden for Wojak Farmers Plot in the DID. No need for wallet for verification if we index by DID (refresh-did is called with DID and fetches holdings).
- **Power level:** Already computed from votes + battles for NFTs in that DID (recalc-power-levels, vote.ts, battle-resolve). No change needed; just ensure DIDs that are “linked” via Clerk are the same ones we show on leaderboard and voting panel.

---

## 7. Summary of implementation order

1. **Backend**
   - Add **POST /api/game/link-did** (Clerk auth, body: did + optional wallet). Set `clerk_user_id` and `did_id` (and optionally `wallet_address`) on `game_players`.
   - Add **GET /api/game/me** (Clerk auth, return player by `clerk_user_id`).
   - Adjust **PUT /api/profile/display-name**: allow Clerk auth and verify DID in body is linked to `clerk_user_id`; then update `did_profiles`.
   - Add **GET /api/game/did-nfts?did=...** (return NFTs in that DID for voting panel).
   - Optional: leaderboard `?signedInOnly=1`.

2. **Frontend**
   - **GameContext:** When Clerk signed in, call GET /api/game/me; set player from response. When signed out, clear player. Keep guestId for non-signed-in voting.
   - **Link-DID UI:** If signed in and no player, show “Link your DID” + optional wallet; call POST /api/game/link-did.
   - **Display name:** Ensure it’s available after linking (same DisplayNameEditor; backend now accepts Clerk + DID in body).
   - **Voting left panel:** Keep MiniLeaderboard; add “NFTs in this DID” (expand or section) using GET /api/game/did-nfts.
   - **Ranking:** Clarify tab labels (Players = DIDs, Wojaks = NFTs).

3. **Optional**
   - Allow **POST /api/game/register** to accept optional Clerk token and set `clerk_user_id` when provided (so wallet connect also binds to Clerk if user is signed in).
   - Gate “Link DID” so only Clerk signed-in users see it; wallet-only users keep current register flow.

---

## 8. Files to touch (reference)

| Area | Files |
|------|--------|
| Link-DID API | New: `functions/api/game/link-did.ts` |
| Get player by Clerk | New: `functions/api/game/me.ts` (or extend `player.ts` with `?by=clerk`) |
| Display name | `functions/api/profile/display-name.ts` (PUT: Clerk + verify DID linked) |
| DID NFTs | New: `functions/api/game/did-nfts.ts` |
| Leaderboard | `functions/api/game/leaderboard.ts` (optional `signedInOnly`) |
| GameContext | `src/contexts/GameContext.tsx` (Clerk + /api/game/me, link-DID flow) |
| Link DID UI | New component or extend `GateChecklist` / Fight Club |
| Voting left panel | `src/components/game/MiniLeaderboard.tsx` (+ did-nfts) |
| Ranking labels | `src/pages/GameLeaderboard.tsx` |
| Fight Club gate | `src/pages/FightClub.tsx` (allow access when Clerk signed in + DID linked, even without wallet for “view” mode; wallet still for Phase 1 verify if needed) |

This design gives you: **Clerk login → link DID → display name → power levels of DIDs on voting and ranking; Players = DIDs, Wojaks = NFTs; voting side shows DIDs and their NFTs.**
