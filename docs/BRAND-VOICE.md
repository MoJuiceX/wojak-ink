# Wojak Ink Brand Voice Guide

## Who We Are

Wojak Ink is an NFT minting platform on the Chia blockchain where meme culture meets digital art meets blockchain technology. We let people create custom Wojaks — layered, colorable, expressive — and mint them as on-chain NFTs.

We're the intersection of internet culture and real ownership. We take the art seriously. We take the tech seriously. We don't take ourselves too seriously.

---

## Personality

### Meme-Native
We know what a Wojak is. We know the variants. We don't explain memes like a corporate brand trying to be relatable. We just *are* relatable.

### Playful but Trustworthy
Jokes are welcome. Wordplay is encouraged. But the moment money, transactions, or wallet security is involved, we're dead serious. Nobody wants a joke when their XCH is on the line.

### Community-First
This is a community project. We say "we" not "the platform." We say "community" not "users." Decisions are transparent. Code is auditable.

### Accessible
No gatekeeping. If someone doesn't know what a wallet is, we help them. We don't mock. We don't assume prior knowledge. Clear beats clever, always.

---

## Tone Spectrum

| Context | Tone | Example |
|---------|------|---------|
| Social media / Discord | Casual, meme-friendly | "Your Wojak is coping harder than the market" |
| Feature announcements | Enthusiastic, clear | "Create your Wojak. Mint it on-chain. It's yours forever." |
| Generator UI labels | Concise, friendly | "Pick a vibe" / "Looking good" |
| Transaction states | Clear, reassuring | "Minting your Wojak..." / "Minted! View on MintGarden" |
| Error states | Honest, helpful | "Mint failed. Your credits haven't been charged. Try again." |
| Security / wallet | Professional, precise | "Connect your Sage wallet to mint" |
| Documentation | Direct, technical | Standard technical writing — no jokes needed |

---

## Copy Examples

### Success States

**Good:**
- "Minted! Your Wojak #42 is on-chain."
- "Saved to favorites."
- "Copied to clipboard."
- "Credits loaded. You have 2 free mints."

**Bad:**
- "Congratulations! Your NFT has been successfully created on the Chia blockchain!" (too corporate)
- "WAGMI! You just minted a sick Wojak bro!" (trying too hard)
- "Transaction complete." (too cold for a creative platform)

### Error States

**Good:**
- "Mint failed. Your credits weren't charged. Try again or switch wallets."
- "Offer expired. Close and mint again."
- "Not enough credits. You need 100 credits for a free mint."
- "Wallet not connected. Connect your Sage wallet to mint."

**Bad:**
- "Error 500: Internal server error" (never show raw errors)
- "Oopsie! Something went wrong!" (don't be cute with failures)
- "Transaction failed. Please try again later." (no explanation, no actionable step)

### Wallet / Transaction Language

**Good:**
- "Accept the offer in your Sage wallet to complete the mint."
- "0.23 XCH (base 0.20 + 0.03 trait surcharge)"
- "Waiting for wallet approval..."

**Bad:**
- "Please sign the transaction in your cryptocurrency wallet application." (too formal)
- "Send 0.23 Chia coins to complete purchase." (wrong terminology)

---

## Error Message Framework

Every error message should answer three questions:

1. **What happened** — State the problem clearly
2. **Why** — Brief explanation if it helps (optional for obvious cases)
3. **What you can do** — Give the user a concrete next step

### Template
```
[What happened]. [Why, if helpful]. [What to do].
```

### Examples
```
Mint failed. The MintGarden API didn't respond. Try again in a few minutes.

Not enough credits. You need 100 credits for a free mint. Trade Wojaks to earn more.

Offer expired. The 15-minute window has passed. Close this and mint again.

Wallet not connected. Connect your Sage wallet to continue.
```

---

## Word Choices

Use these terms consistently across all UI, docs, and communications.

| Use This | Not This | Why |
|----------|----------|-----|
| Mint | Purchase, Buy, Create NFT | Minting is the action. It's specific to what we do. |
| Wojak | NFT, Token, Asset | It's a Wojak. That's what makes us different. |
| On-chain | On the blockchain | Shorter, more natural. |
| Credits | Points, Tokens, Coins | Credits are earned from trading. They're not a currency. |
| Wallet | Account, Profile | It's a blockchain wallet. Be precise. |
| XCH | Chia coins, Chia tokens | XCH is the ticker. Use it. |
| Community | Users, Customers | We're a community, not a customer base. |
| Create | Configure, Set up, Design | People create Wojaks. It's creative. |
| Accept (offer) | Sign, Approve, Confirm | Chia uses offer files. You accept an offer. |
| Free mint | Complimentary mint, Reward mint | Simple. Clear. |
| Trait | Layer, Option, Feature | Traits are the building blocks of a Wojak. |

---

## The Golden Rule

**When in doubt, be clear over clever. Especially with money.**

A confused user who lost XCH will never come back. A user who understood exactly what happened — even if it was bad news — will trust you and try again.
