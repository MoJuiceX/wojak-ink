# SPEC: Phase 2 — Generator Info Panel / How It Works

> **For Claude CLI:** Read this entire spec, then read every file listed in "Files to Read First" before writing any code. Follow `docs/BRAND-VOICE.md` for ALL user-facing copy — tone, word choices, and formatting. Follow `CLAUDE.md` for CSS conventions.

---

## Context

The generator needs an information panel that explains what Your Wojak is, how to create one, how pricing works, how free mints work, and what makes the collection special. This is both documentation and a sales pitch — it needs to inform AND excite.

The target audience is someone who has never used the generator before. They may or may not know what a Wojak is. They may or may not know Chia. Clear beats clever, always.

---

## Files to Read First

1. `docs/BRAND-VOICE.md` — **critical**: tone, word choices, error framework
2. `CLAUDE.md` — CSS architecture, component patterns
3. `src/components/common/InfoButton.tsx` — existing info button pattern
4. `src/components/common/PageInfoContent.tsx` — existing info content pattern
5. `src/pages/Generator.tsx` — page layout (where to add the info trigger)
6. `src/components/generator/ActionBar.tsx` — mint button area (info trigger placement)
7. `src/styles/theme.css` — available CSS classes

---

## Architecture Decision

Use the existing `InfoButton` / `PageInfoContent` pattern if it fits (modal or slide-out panel). If the existing pattern doesn't support collapsible sections, create a new component in `src/components/generator/GeneratorInfo.tsx` that uses a modal or overlay.

**Do NOT:**
- Create a new page route
- Add a sidebar that's always visible
- Use a tooltip (too much content)
- Add external dependencies

---

## Content Sections

Each section has a heading and bullet points. Write the final copy following `BRAND-VOICE.md` tone — meme-native, playful but trustworthy, clear over clever. The content below is the factual basis; rewrite it in brand voice.

### Section 1: "What is Your Wojak?"

**Facts to convey:**
- Your Wojak is a collection of up to 4,200 unique Wojak NFTs on the Chia blockchain
- Each Wojak is created by YOU using this generator — you pick the traits, the colors, the vibe. It's your creation, minted on-chain forever.
- Your Wojak is the companion collection to Wojak Farmers Plot (the OG 4,200 collection). Same trait types, same universe, but this time YOU are the artist.

**Tone:** Enthusiastic, empowering. Make the user feel like they're creating something meaningful.

### Section 2: "How to Create"

**Facts to convey:**
- Pick one trait from each of the 7 categories: Face, Mouth, Face Wear, Head, Clothes, Background, and Base
- Customize colors on supported traits
- Preview your Wojak in real-time
- When you're happy, hit Mint

**Tone:** Instructional but casual. Short steps, not a user manual.

### Section 3: "Pricing"

**Facts to convey:**
- Base price: 0.20 XCH
- Popular traits cost more. The more a trait gets used, the higher its surcharge. This keeps the collection diverse — if everyone picked Crown, every Wojak would look the same.
- Only Head, Clothes, and Face Wear traits have surcharges. Mouth, Face, and Background are always free (base price only).
- The surcharge is based on the single most expensive trait you picked. You're not charged for all 7 — just the priciest one.
- Prices heal over time. If a trait stops being popular, its surcharge gradually drops back toward zero.

**Tone:** Clear and honest about money. Use the BRAND-VOICE.md format: "0.45 XCH (base 0.20 + 0.25 Crown surcharge)". No jargon. No "fair share" or "formula" language.

**Things NOT to say:**
- Don't mention "fair share", "effective usage", "decay half-life", or formula details
- Don't say "penalty" — say "surcharge"
- Don't explain the math — explain the outcome

### Section 4: "Free Mints"

**Facts to convey:**
- Trade Wojak Farmers Plot NFTs on secondary markets and earn credits
- OG holders of Wojak Farmers Plot (5+ NFTs) also received bonus credits
- 100 credits = 1 free mint (no XCH needed)
- Trading credits are tracked automatically from your marketplace activity
- Check your credit balance in the leaderboard

**Tone:** Exciting — this is a bonus feature. Make it feel like a reward.

### Section 5: "Why It's Special"

**Facts to convey (this is the USP / sales pitch):**
- Every Wojak is unique — your combination of 7 traits, your color choices, minted by you
- On-chain forever. IPFS-hosted image and metadata, minted via MintGarden on Chia
- The surcharge system means rare combinations stay rare. The first person to mint with Crown pays less than the 100th. Early creativity is rewarded.
- Royalties go to the creator (that's you). You earn royalties on your Wojak forever.

**Tone:** Pride and ownership. This section should make someone want to create a Wojak RIGHT NOW.

---

## UI / UX Requirements

### Trigger Button

- Place an info icon/button near the mint button in `ActionBar` OR in the generator page header
- Use a recognizable icon (ℹ️ or question mark circle)
- Label: "How It Works" or just the icon with tooltip "How It Works"
- Should not interfere with the mint flow

### Panel Layout

- **Modal or overlay** that appears on top of the generator
- Each section has a **collapsible heading** (accordion style) OR use a **tabbed layout**
- Sections default to collapsed (user opens what they want)
- OR: Show all sections in a scrollable modal with section headings

### Responsive

- Full-width modal on mobile (bottom sheet or full screen)
- Centered modal with max-width on desktop (e.g., `max-w-lg` or `max-w-xl`)
- Close button clearly visible

---

## CSS and Styling Rules

1. Use `card-static` for the modal/panel container
2. Use `text-secondary` for body text
3. Use `text-accent` for emphasis (prices, important terms)
4. Use `badge` for pricing examples
5. Tailwind for layout only (`flex`, `gap`, `p-`, responsive classes)
6. **No new CSS files**
7. **No `!important`**
8. Follow all `CLAUDE.md` conventions

---

## Component Structure

Suggested (adapt as needed):

```
src/components/generator/
  GeneratorInfo.tsx        ← the modal/panel component
  GeneratorInfoSection.tsx ← reusable collapsible section (optional)
```

Or extend the existing `InfoButton` + `PageInfoContent` pattern.

---

## Verification

After all changes:

```bash
npm run typecheck && npm run build
```

Both must pass with zero errors.

### Manual Checks

1. Open the generator page
2. Find and click the info trigger (icon/button)
3. Verify all 5 sections render with correct content
4. Verify sections are collapsible or tabbed
5. Verify pricing examples use correct format from BRAND-VOICE.md
6. Test on mobile viewport — verify responsive layout
7. Close the panel — verify generator is still functional
