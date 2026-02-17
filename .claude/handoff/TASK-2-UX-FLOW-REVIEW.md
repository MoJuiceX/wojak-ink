# Task 2: UX Flow Review — Wojak Generator Minting Pipeline

## Your Role

You are a UX expert reviewing an NFT minting flow for Wojak.ink, a Chia blockchain NFT project. Your job is to walk through every user scenario, identify friction points, confusion, and failure states, and propose specific improvements.

You do NOT have access to the codebase. Everything you need is in this document.

---

## System Overview

The Wojak Generator lets users build custom NFT characters by selecting visual layers (head, clothes, face wear, eyes, mouth, background). Users can mint their creation as an NFT in two ways:

1. **Paid mint** — User pays XCH (Chia cryptocurrency) via an offer file signed in their Sage wallet
2. **Free mint** — User spends earned "free mint credits" (earned by trading Wojak Farmers Plot NFTs)

The minting button is currently **disabled** ("Coming Soon") while we finalize the pipeline.

---

## Technical Context

### Wallet Connection
- Users connect via **WalletConnect v2** protocol to **Sage Wallet** (Chia wallet)
- Connection persists across pages via `localStorage` key `sage-wallet-session`
- Wallet button appears in the site header (green when connected, grey when not)
- Users can connect from any page — connection is site-wide

### Pricing
- **Base price:** 0.2 XCH per mint
- **Surcharge:** Dynamic, based on trait popularity. Only 3 categories have surcharges: Head, Clothes, Face Wear
- **Surcharge formula:** `surcharge = ratio + 8 × max(0, ratio - 1)²` where `ratio = usage / fair_share`
- Popular traits cost more; unpopular traits are just the base price
- Surcharges decay 50% every 30 days (so prices drop if a trait falls out of fashion)

### Free Mint Credits
- 100 credits = 1 standard free mint
- Credits earned by trading Wojak Farmers Plot NFTs on marketplace
- **Premium tier:** Top 3 most popular traits per category cost scaled credits
  - Formula: `credits = 100 × (0.2 + surcharge) / 0.2`
  - Example: A trait with 0.8 XCH surcharge costs 500 credits instead of 100
- Bottom 75%+ of traits are included at the standard 100 credit rate

### Supply
- Total supply: 4,200 NFTs
- Minting stops when supply is reached

---

## Mint Flow States

The UI uses a modal (`MintFlowModal`) that transitions through these states:

```
idle → submitting → signing → accepting → success
                                        → error
```

### State Details

| State | Title | Message | Icon |
|-------|-------|---------|------|
| idle | Mint | Preparing... | Spinner |
| submitting | Submitting | Submitting your mint... | Spinner |
| signing | Accept Offer | Accept the offer in your Sage wallet to complete the mint. | Spinner |
| accepting | Accepting | Waiting for wallet approval... | Wallet icon (pulsing) |
| success | Minted! | Your Wojak has been minted successfully. | Green checkmark |
| error | Mint failed | Something went wrong. Try again or use a different wallet. | Red alert |

---

## Scenario 1: New User — No Wallet

**Context:** User visits the generator, builds a wojak, wants to mint.

**Current behavior:**
- The mint button says "Coming Soon" (disabled)
- When enabled, conditions to mint: wallet connected + 7 traits selected + not sold out
- If wallet not connected, button would be disabled with no clear explanation

**Questions to answer:**
- What should the user see if they click "Mint" without a wallet?
- How do we guide them to install Sage Wallet and connect?
- Is there onboarding for first-time users who don't know what WalletConnect is?

---

## Scenario 2: Paid Mint — Happy Path

**Context:** Wallet connected, sufficient XCH, user clicks mint.

**Flow:**
1. User clicks mint button
2. Modal opens: "Submitting your mint..." (spinner)
3. Backend: validates layers → reserves mint number → uploads to IPFS → creates offer via MintGarden
4. Modal changes: "Accept Offer" with countdown timer (15 minutes)
   - Shows offer actions: "Accept in Wallet" button + "Copy Offer (Manual)" + "I've Already Accepted" link
5. User clicks "Accept in Wallet"
6. WalletConnect sends offer to Sage Wallet → user approves in wallet
7. Modal: "Accepting — Waiting for wallet approval..."
8. Backend confirms offer accepted → traits tracked → status = minted
9. Modal: "Minted! Your Wojak #42" + link to MintGarden

**Price display (in ActionBar before minting):**
```
0.25 XCH
base 0.20 + 0.05 Crown surcharge
```

**Questions to answer:**
- Is the 15-minute countdown clearly visible and understandable?
- What if the user doesn't have Sage Wallet open? Do they know they need to switch apps?
- On mobile, how does the wallet switching work? (WalletConnect deep link?)
- Is the price breakdown clear enough before they commit?
- After success, is there a clear call-to-action? (View NFT, share, mint another?)

---

## Scenario 3: Free Mint — Happy Path

**Context:** Wallet connected, user has 150 credits, selects standard traits (100 credits needed).

**Flow:**
1. User toggles to "free mint" mode (currently hidden toggle)
2. Clicks mint button
3. Modal: "Submitting..."
4. Backend: calculates credit cost → checks balance → reserves number → IPFS → MintGarden → deducts credits
5. Modal: "Minted!" (no wallet signing needed — instant)

**Questions to answer:**
- How does the user know they have free mints available? Where is this displayed?
- How do they switch between paid and free mint?
- Is the credit cost shown before they commit? (Especially for premium traits)
- After minting, do they see their updated credit balance?
- Is it clear that free mints are instant (no wallet approval needed)?

---

## Scenario 4: Offer Expires (15-minute timeout)

**Context:** User created a paid mint, got the offer, but didn't accept in time.

**Current behavior:**
- Timer counts down in the modal
- When expired, red text: "This offer has expired. Close and mint again."
- Mint stays as `status='pending'` in the database
- If user calls prepare again, they get back their existing pending mint (even if expired)

**Questions to answer:**
- Is the expiry consequence clear BEFORE they start? (i.e., "You'll have 15 minutes to accept")
- Can they extend the timer?
- What happens to their mint number? (It's reserved and wasted)
- If they close the modal and come back, can they resume?
- What if they accidentally close the browser tab?

---

## Scenario 5: MintGarden Is Slow

**Context:** User initiates mint but MintGarden API takes 10-30 seconds to respond.

**Current behavior:**
- Modal shows spinner with "Submitting your mint..."
- No progress indication of which step is happening
- Backend has 3 retries with exponential backoff (1s, 2s, 4s)
- If all retries fail, error: "MintGarden API failed to create NFT. Please try again or contact support."

**Questions to answer:**
- Should we show step-by-step progress? ("Uploading to IPFS... Creating offer...")
- How long is too long to wait? At what point do users give up?
- If they close the modal during submission, what happens? (Mint number already reserved)
- Is the retry behavior invisible to the user? Should they know retries are happening?

---

## Scenario 6: Insufficient Credits for Premium Trait

**Context:** User has 80 credits, selects a Crown (top-3 premium trait costing 500 credits).

**Current API response:**
```json
{
  "error": "Insufficient credits",
  "balance": 80,
  "requiredCredits": 500,
  "isPremiumTrait": true
}
```

**Questions to answer:**
- When should the user be told about the premium cost? Before they click mint, or after?
- Should the generator show credit costs per trait in real time?
- Should premium traits be visually marked in the trait selector?
- How do we explain the premium tier system to the user? ("The 3 most popular items cost more credits")
- Can the user easily see which traits are currently in the premium tier?
- What's the call-to-action? "You need 420 more credits — earn them by trading NFTs"

---

## Scenario 7: Mobile Experience

**Context:** User is on a phone, building and minting a wojak.

**Known constraints:**
- Generator has a mobile layout with layer tabs, preview, and trait grid
- Wallet connection uses WalletConnect deep links on mobile
- MintFlowModal is a full-screen overlay on mobile

**Questions to answer:**
- Does the mint flow modal work well on small screens?
- How does "Accept in Wallet" work on mobile? (Need to switch to Sage Wallet app)
- Can users copy the offer file on mobile?
- Is the countdown timer visible while the user is in the wallet app?
- After accepting in the wallet app, how do they get back to Wojak.ink?

---

## Error Messages (Current)

| Situation | Error Message |
|-----------|---------------|
| No wallet | "Wallet not connected" |
| Not enough XCH | (MintGarden handles this at offer acceptance) |
| Not enough credits | "Insufficient credits" |
| Sold out | "Sold out" |
| IPFS down | Error from Pinata (technical, not user-friendly) |
| MintGarden down | "MintGarden API failed to create NFT. Please try again or contact support." |
| Offer expired | "This offer has expired. Close and mint again." |
| Wrong wallet | "Wallet address does not match this mint" |
| Rate limited | "Too many mint requests. Please wait a moment." |
| Concurrent credit spend | "Insufficient credits (concurrent request)" |

**Questions to answer:**
- Are these messages understandable to non-technical users?
- Which errors need more context or guidance?
- Should any errors offer automatic retry?

---

## Deliverable

For each scenario above, provide:

1. **Current UX assessment** — What works, what doesn't
2. **Friction points** — Where users get confused, stuck, or frustrated
3. **Failure recovery** — Can the user recover? How?
4. **Recommended improvements** — Specific, actionable changes (not vague "make it better")
5. **Priority** — Critical (blocks minting), High (causes confusion), Medium (nice to have)

Format as a numbered list of findings, each with: Description, Impact, Recommendation, Priority.
