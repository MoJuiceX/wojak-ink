# Reve AI Enhance — Full Design Document

**Date:** 2026-03-08
**Status:** Approved
**Author:** User + Claude (MacOS app)

---

## 1. Purpose

Add an optional "AI Enhance" step to the Wojak Generator that lets users customize their Wojak beyond the predefined layer library using the Reve Edit API. Users pick a category, describe what they want (via presets, freeform text, or randomizer), and get a modified image back. AI-enhanced images are persisted to R2, mintable as NFTs, and accessible in a "My AI Creations" gallery.

---

## 2. User journey

### 2.1 Placement in flow

After layer selection, before mint/export. The existing layer workflow is unchanged. AI Enhance is optional.

```
Build Wojak (layers + colors) → [✨ AI Enhance] → Export / Mint
                                   (optional)
```

### 2.2 Entry point

"✨ Enhance with AI" button in ActionBar, next to Export/Mint. Enabled when user has AI credits. When balance is 0, button shows "Buy AI Credits" and opens the credit shop modal.

### 2.3 Lightbox wizard flow

#### Step 1 — Category picker

User sees their composited Wojak canvas and 4 category buttons:

- 👕 **Clothes** (enhance existing only)
- 🎩 **Head** (enhance existing only)
- 🎭 **Facewear** (full creative freedom)
- 🖼 **Background** (full creative freedom)

Face (Base) and Mouth are NOT available — they are core Wojak identity and locked to the layer system.

Previously enhanced categories show a ✓ checkmark. User can re-enhance the same category (edits stack on each other).

#### Step 2 — Prompt builder

After picking a category, user sees:

- **Preset suggestion buttons** — category-specific, clickable. Clicking fills the text input (user can modify before sending).
- **Freeform text input** — 200 character max, live character counter.
- **🎲 Randomizer button** — picks a random prompt from a curated pool, fills the input. Can re-roll.
- **"✨ Enhance — 1 credit" button** — disabled until text input has content.

All three input methods (preset click, freeform type, randomize) populate the same text field. User always sees and can edit what will be sent.

#### Step 3 — Loading state

While the Reve API processes (3-8 seconds):

- Original image shown on the left for reference
- Right side: **shimmer skeleton placeholder** (same pattern as existing trait card loading)
- **Rotating community messages** (cycle every 2-3 seconds) — configurable pool of messages promoting ecosystem features (Voject coin, Fight Club, Big Pulp, Farmers Plot credits, etc.). Exact messages curated together before launch.
- Close button (X) **disabled** during generation
- If call takes > 15 seconds: show "Taking longer than usual..." fallback message
- On success: shimmer crossfades into the result image
- On error: shimmer replaced with error message + "Try Again" button

#### Step 4 — Side-by-side result

Shows Original vs AI Enhanced side by side (desktop) or stacked (mobile), with the prompt displayed.

Four actions:

- **✓ Accept & Done** — saves AI version to R2, closes lightbox, generator enters AI Enhanced Mode
- **✨ Accept & Continue** — saves AI version to R2, returns to category picker to enhance another category. Next edit uses the already-enhanced image.
- **🔄 Retry** — same prompt, new Reve generation (costs 1 more credit; Reve gives diverse outputs)
- **✗ Reject** — discards result, returns to Step 2 to try a different prompt. No credit charged for the rejected result (credit was already charged for the API call that produced it).

#### Step 5 — Continue or done

After accepting, category picker shows ✓ on enhanced categories. User can:

- Enhance more categories
- Re-enhance an already-enhanced category (stacking)
- Click **"Done — Use Enhanced Wojak"** to close lightbox

---

## 3. Generator state after AI enhancement ("AI Enhanced Mode")

When user accepts an AI edit and clicks Done, the generator enters a locked state:

- **Layer tabs:** DISABLED (greyed out, not clickable)
- **Trait grid / color picker:** HIDDEN
- **Preview:** Shows the flat AI-enhanced image (not layer composite)
- **Banner:** "✨ AI Enhanced Wojak" with list of enhanced categories

**ActionBar in AI Enhanced Mode:**

- **✨ Edit More with AI** — reopens lightbox to enhance/re-enhance categories
- **⬇ Export** — exports the AI-enhanced image
- **🪙 Mint** — mints the AI-enhanced image
- **↩ Reset to Original Layers** — discards AI enhancements, re-enables layer editing, restores layer composite. AI creation still saved in "My AI Creations."

**Rationale:** Changing layers after an AI edit would invalidate the flat AI image. Clean separation: you're either in layer-editing mode or AI-enhanced mode, never both.

---

## 4. Category freedom levels

| Category | Freedom | AI can do | AI cannot do |
|----------|---------|-----------|--------------|
| **Clothes** | Enhance only | Add patterns, textures, badges, embroidery, material changes to the existing garment | Replace with entirely different clothing |
| **Head** | Enhance only | Add wear/damage, change material, add emblems/details to existing headwear | Swap to a different hat type |
| **Facewear** | Full freedom | Generate any eyewear, masks, face accessories — including items not in the layer library | — |
| **Background** | Full freedom | Generate any background scene the user describes — complete replacement allowed | — |

---

## 5. Prompt engineering (per category)

Each category has a prompt template. The user's input `{user_prompt}` is inserted and constraints appended.

### Clothes (enhance-only)

```
Modify only the clothing in this illustration: {user_prompt}. Keep the same garment type and shape. Do not change the face, head, background, or illustration style.
```

### Head (enhance-only)

```
Modify only the headwear in this illustration: {user_prompt}. Keep the same hat type and shape. Do not change the face, clothing, background, or illustration style.
```

### Facewear (full freedom)

```
Add to the character's face area: {user_prompt}. Maintain the line-art illustration style of the character.
```

### Background (full freedom)

```
Replace the background of this illustration: {user_prompt}. Keep the character in the foreground exactly as-is. Do not modify the character.
```

---

## 6. Presets and randomizer

### 6.1 Presets (shown as clickable buttons)

Each category shows 6-8 curated presets. Clicking a preset fills the text input.

**Clothes:** Flame pattern, Tiger print, Gold embroidery, Tie-dye, Diamond studs, Camouflage, Racing stripes, Vintage wash

**Head:** Battle-worn dents, Gold plating, Diamond encrusted, Rusty metal, Neon glow trim, Fur-lined, Graffiti paint

**Facewear:** Steampunk goggles, Diamond monocle, Cyberpunk visor, Aviator sunglasses, Opera phantom mask, AR holographic display, Gold-rimmed spectacles

**Background:** Tokyo neon alley at night, Underwater coral reef, Medieval castle throne room, Spaceship cockpit, On top of a skyscraper at sunset, Cyberpunk city rain, Cozy cabin fireplace

### 6.2 Randomizer (🎲 button)

Each category has a larger pool (presets + 20-30 additional options not shown as buttons). Randomizer picks one at random and populates the text input. User can re-roll or edit before sending.

### 6.3 Freeform

Text input, 200 character max, live character counter. No client-side content filtering — Reve handles content moderation server-side via `content_violation` detection.

---

## 7. AI credits system

### 7.1 Separate credit pool

AI credits are a separate economy from the existing free-mint credits (earned by trading Farmers Plot NFTs). AI credits are purchased with XCH directly on the site.

### 7.2 Pricing (fixed XCH, max 50 credits per bundle)

| Bundle | Per credit | Total XCH | Discount |
|--------|-----------|----------|----------|
| 1 credit | 0.08 XCH | 0.08 XCH | — |
| 5 credits | 0.07 XCH | 0.35 XCH | 12.5% |
| 15 credits | 0.06 XCH | 0.90 XCH | 25% |
| 30 credits | 0.05 XCH | 1.50 XCH | 37.5% |
| 50 credits | 0.04 XCH | 2.00 XCH | 50% |

**Unit economics:** Reve API costs ~$0.04 per edit. At XCH = $2.50, base price (0.08 XCH = $0.20) gives 5x margin. Deepest discount (0.04 XCH = $0.10) gives 2.5x margin, which stays profitable even at 50% XCH price drop.

### 7.3 Credit shop modal

Accessed from ActionBar ("Buy AI Credits" button or when user has 0 credits). Opens as a modal within the Generator page (same pattern as Favorites).

**Layout:**
- Current balance displayed at top
- Radio-button list of 5 bundle tiers with price and discount percentage
- 15-credit tier pre-selected and marked "POPULAR"
- 50-credit tier marked "BEST VALUE"
- "Buy [N] credits — [X] XCH" button

**Purchase flow (same as paid mint):**
1. User selects bundle → clicks Buy
2. POST /api/ai/credits/buy → returns offer file
3. Modal shows "Accept the offer in your Sage wallet" + "Copy Offer File"
4. User accepts offer in Sage wallet
5. POST /api/ai/credits/confirm → credits added to balance
6. Modal shows "✓ [N] credits added! Balance: [total]"

### 7.4 Spending

1 AI edit = 1 credit. Credit deducted only on successful Reve API response AND successful R2 save. Failed API calls, content violations, and R2 failures do not cost credits.

---

## 8. Image persistence

### 8.1 Storage strategy: R2 now, IPFS at mint

- **On accept:** AI-enhanced image saved immediately to Cloudflare R2
- **Path pattern:** `ai-edits/{wallet_address}/{enhancement_id}.webp`
- **At mint time:** R2 image pinned to IPFS via Pinata (same as existing mint flow)
- **Accessible via:** "My AI Creations" gallery in the Generator

### 8.2 Sequential edits

When user does "Accept & Continue," the next edit sends the already-enhanced image from R2 (not the original layer composite). Edits stack. The `parent_enhancement_id` column tracks the chain.

### 8.3 Image format and quality

- **Sent to Reve:** 1024×1024 WebP (full canvas export, no downscaling)
- **Received from Reve:** Base64 PNG
- **Stored in R2:** Converted to WebP for consistency and size
- **No upscaling or postprocessing** — the 1024px Reve output is the final image

---

## 9. "My AI Creations" gallery

### 9.1 Location

Inside the Generator page as a modal, accessed from a button in ActionBar (like Favorites). Badge shows creation count.

### 9.2 Layout

- **Top:** Grid of thumbnails, most recent first
- **Selected:** Larger preview + metadata (category enhanced, prompt used, date, edit chain count)
- **Actions per creation:**
  - **Load in Generator** — closes modal, enters AI Enhanced Mode with this image
  - **⬇ Export** — downloads the image
  - **🪙 Mint** — enters mint flow with this image
  - **🗑 Delete** — removes from R2 and D1 (with confirmation dialog)

### 9.3 Data source

GET /api/ai/creations?wallet=... returns all ai_enhancements rows for the wallet, with R2 URLs for thumbnails.

---

## 10. AI-enhanced mint metadata

When minting an AI-enhanced Wojak, the CHIP-0007 metadata includes both original layer attributes and AI enhancement attributes:

```json
{
  "format": "CHIP-0007",
  "name": "Your Wojak #42",
  "description": "A custom Wojak created on wojak.ink",
  "collection": { "name": "Your Wojak", "id": "..." },
  "attributes": [
    { "trait_type": "Base", "value": "Classic" },
    { "trait_type": "Clothes", "value": "Tee Blue" },
    { "trait_type": "Head", "value": "Cap Red" },
    { "trait_type": "MouthBase", "value": "Numb" },
    { "trait_type": "AI Enhanced", "value": "Yes" },
    { "trait_type": "AI Clothes", "value": "Flame pattern" },
    { "trait_type": "AI Head", "value": "Battle-worn dents" },
    { "trait_type": "AI Edits Count", "value": "2" }
  ]
}
```

**Rules:**
- `AI Enhanced: Yes` present on all AI-enhanced mints; absent on non-AI mints
- One `AI [Category]` attribute per enhanced category; value = user's prompt (truncated to 64 chars)
- `AI Edits Count` = total number of AI edits applied (includes re-edits of same category)
- Original layer attributes preserved — they describe the base Wojak
- Non-AI mints unchanged

---

## 11. Mobile responsiveness

### 11.1 Lightbox

On mobile (< 768px), the lightbox goes **full-screen** (no overlay margins).

### 11.2 Category picker (mobile)

- Canvas preview: smaller but prominent at top
- Category buttons: **full-width, stacked vertically**
- Credits display: below buttons

### 11.3 Prompt builder (mobile)

- Preset buttons: **2-column grid** (instead of flowing inline)
- Text input: full width
- Randomizer 🎲 button: inline with character counter, right-aligned

### 11.4 Side-by-side result (mobile)

- Images **stacked vertically** (original on top, AI below) instead of side-by-side
- Action buttons: 2×2 grid (Accept Done / Accept Continue / Retry / Reject)

### 11.5 Navigation

- **← Back arrow** replaces desktop breadcrumb navigation
- Swipe to go back: not implemented (button only, matches existing app patterns)

---

## 12. Architecture

### 12.1 New frontend components

| Component | Role |
|-----------|------|
| `AIEnhanceLightbox` | Main lightbox wrapper; wizard state machine (step 1-4) |
| `AICategoryPicker` | Step 1: 4 category buttons + canvas preview + credits display |
| `AIPromptBuilder` | Step 2: presets + freeform input + randomizer + enhance button |
| `AIResultComparison` | Step 3: side-by-side (or stacked on mobile) + 4 action buttons |
| `AILoadingState` | Loading shimmer + rotating community messages |
| `AICreditsDisplay` | Balance badge shown in lightbox and ActionBar |
| `AICreditsShop` | Bundle selection modal + Chia offer purchase flow |
| `AICreationsGallery` | "My AI Creations" modal with grid + preview + actions |

### 12.2 New context

`AIEnhanceContext` — manages:
- AI credit balance (fetch on wallet connect)
- Enhancement history (list of creations for gallery)
- Wizard state (current step, selected category, current prompt, current result)
- Loading/error states

Separate from GeneratorContext and MintContext.

### 12.3 New API endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /api/ai/enhance` | POST | Send image + prompt to Reve, save to R2, deduct credit |
| `GET /api/ai/balance` | GET | AI credit balance for wallet |
| `GET /api/ai/creations` | GET | List saved AI creations for wallet |
| `POST /api/ai/credits/buy` | POST | Initiate XCH purchase (returns offer file) |
| `POST /api/ai/credits/confirm` | POST | Confirm purchase after wallet acceptance |

### 12.4 Enhance endpoint flow

```
POST /api/ai/enhance
Body: { walletAddress, imageBase64, category, prompt }

1. Validate wallet (isValidChiaAddress)
2. Check balance: ai_credit_purchases - ai_credit_usage >= 1
3. Build category-aware constrained prompt (section 5)
4. POST https://api.reve.com/v1/image/edit
   Headers: { Authorization: Bearer REVE_API_KEY }
   Body: { edit_instruction: constrainedPrompt, reference_image: imageBase64 }
5. Check response:
   - If content_violation: return error, do NOT deduct credit
   - If API error/timeout: return error, do NOT deduct credit
6. On success:
   - Convert result to WebP
   - Upload to R2: ai-edits/{wallet}/{id}.webp
   - INSERT into ai_enhancements
   - INSERT into ai_credit_usage
   - Return { imageUrl, enhancementId, creditsRemaining }
7. On R2 failure:
   - Do NOT insert credit_usage (rollback)
   - Return error
```

### 12.5 System diagram

```
Frontend (Generator)
  ActionBar
  ├── "✨ Enhance with AI" → AIEnhanceLightbox
  ├── "🎨 My AI Creations" → AICreationsGallery
  └── "🪙 Buy AI Credits"  → AICreditsShop
       ↓
  AIEnhanceContext
  ├── balance (GET /api/ai/balance)
  ├── creations (GET /api/ai/creations)
  └── enhance (POST /api/ai/enhance)
       ↓
  ┌────────────────────────────────────────┐
  │ Pages Functions (functions/api/ai/)     │
  │                                        │
  │ enhance.ts  → Reve API + R2 + D1      │
  │ balance.ts  → D1 query                │
  │ creations.ts → D1 query + R2 URLs     │
  │ credits/buy.ts → MintGarden offer      │
  │ credits/confirm.ts → D1 insert        │
  └──────┬─────────┬─────────┬────────────┘
         ↓         ↓         ↓
    Reve API    R2 Bucket   D1 Database
    (edit)      (images)    (credits +
                             enhancements)
```

---

## 13. Data model

### 13.1 New tables

```sql
-- Migration: functions/migrations/NNN_ai_enhance_system.sql

-- AI credit purchases (buying credits with XCH)
CREATE TABLE ai_credit_purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  credits_purchased INTEGER NOT NULL,
  xch_paid_mojos INTEGER NOT NULL,
  bundle_tier TEXT NOT NULL,            -- '1', '5', '15', '30', '50'
  offer_file TEXT,
  status TEXT DEFAULT 'pending',        -- pending, confirmed, failed, expired
  created_at TEXT DEFAULT (datetime('now')),
  confirmed_at TEXT,
  expires_at TEXT
);

CREATE INDEX idx_ai_credit_purchases_wallet ON ai_credit_purchases(wallet_address);
CREATE INDEX idx_ai_credit_purchases_status ON ai_credit_purchases(status);

-- AI credit usage (one row per successful edit)
CREATE TABLE ai_credit_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  enhancement_id INTEGER NOT NULL REFERENCES ai_enhancements(id),
  credits_spent INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_ai_credit_usage_wallet ON ai_credit_usage(wallet_address);

-- AI enhanced images (persisted creations)
CREATE TABLE ai_enhancements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  r2_key TEXT NOT NULL,                 -- R2 object path
  category TEXT NOT NULL,               -- clothes, head, facewear, background
  prompt TEXT NOT NULL,                 -- user's original prompt (max 200 chars)
  constrained_prompt TEXT,              -- full prompt sent to Reve (with template)
  reve_request_id TEXT,                 -- Reve X-Reve-Request-Id header
  reve_version TEXT,                    -- Reve model version used
  parent_enhancement_id INTEGER,        -- NULL if first edit; references previous in chain
  base_layers_json TEXT,                -- JSON snapshot of selectedLayers at time of edit
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_ai_enhancements_wallet ON ai_enhancements(wallet_address);
CREATE INDEX idx_ai_enhancements_parent ON ai_enhancements(parent_enhancement_id);
```

### 13.2 Balance calculation

```sql
SELECT
  COALESCE(
    (SELECT SUM(credits_purchased) FROM ai_credit_purchases
     WHERE wallet_address = ? AND status = 'confirmed'), 0
  ) -
  COALESCE(
    (SELECT SUM(credits_spent) FROM ai_credit_usage
     WHERE wallet_address = ?), 0
  ) AS balance;
```

### 13.3 Pricing constants

```typescript
export const AI_CREDIT_BUNDLES = [
  { tier: '1',  credits: 1,  priceXch: 0.08, mojos: 80000000000n },
  { tier: '5',  credits: 5,  priceXch: 0.35, mojos: 350000000000n },
  { tier: '15', credits: 15, priceXch: 0.90, mojos: 900000000000n },
  { tier: '30', credits: 30, priceXch: 1.50, mojos: 1500000000000n },
  { tier: '50', credits: 50, priceXch: 2.00, mojos: 2000000000000n },
] as const;
```

---

## 14. Error handling

| Scenario | User sees | Credit charged? |
|----------|-----------|----------------|
| Reve API timeout (> 30s) | "Edit timed out. Try again." | No |
| Reve content violation | "This edit was blocked by content policy. Try a different prompt." | No |
| Reve 429 rate limit | "Too many requests. Wait a moment and try again." | No |
| Reve 500 server error | "Reve is having issues. Try again in a minute." | No |
| Insufficient credits | "Not enough AI credits." + Buy button | No |
| R2 upload failure | "Failed to save your edit. Try again." | No (rolled back) |
| Wallet not connected | "Connect your Sage wallet to use AI Enhance." | No |
| Image too large | "Image too large to process. This shouldn't happen — try refreshing." | No |
| Credit purchase expired | "Offer expired. Try purchasing again." | No |

**Rule:** Credits are deducted ONLY after BOTH the Reve API call succeeds (no content_violation) AND the R2 save completes.

---

## 15. Loading screen messages

Configurable array of community messages shown during Reve API processing. Rotate every 2-3 seconds. Content curated by the project owner before launch.

```typescript
export const AI_LOADING_MESSAGES: string[] = [
  // Examples — final list TBD with community input:
  "Have you considered providing liquidity with the Voject coin?",
  "Did you know about the Voject Fight Club?",
  "Buy Wojak Farmers Plot NFTs to earn free mint credits!",
  "Check out Big Pulp's analysis on the Gallery page!",
  "Your Wojak, your royalties. You earn on every resale.",
  // ... 15-25 messages total
];
```

---

## 16. Env vars and secrets

| Name | Type | Purpose |
|------|------|---------|
| `REVE_API_KEY` | Secret | Bearer token for Reve API (format: papi.xxxxx) |
| `AI_EDITS_BUCKET` | R2 Binding | R2 bucket for AI-enhanced images |
| `AI_CREDITS_PRICING` | Var (optional) | JSON pricing override; defaults to hardcoded tiers |

---

## 17. What is NOT in scope

- Reve Remix endpoint (multi-image blending) — future phase
- Reve Create endpoint (text-to-image from scratch) — future phase
- Video generation — not planned
- AI editing of Face (Base) or Mouth layers — locked to layer system
- Generating entirely new Clothes or Head items — enhance-only for these categories
- Real-time preview while typing — edit happens on button click only
- AI credits earned from trading (only purchased with XCH)
- Client-side prompt filtering — Reve handles content moderation
- Reve postprocessing (upscale, remove background, effects) — future phase
- Reve test_time_scaling — always use default (1) initially

---

## 18. Future phases (out of scope now, noted for reference)

1. **Remix integration** — let users upload reference images (photos, logos) and blend them into their Wojak
2. **Reve upscale** — optional 2x/4x upscale for premium exports (extra credit cost)
3. **AI credits from trading** — extend the existing credit system to also grant AI credits
4. **Community presets** — let users share and vote on prompt presets
5. **Prompt history** — show the user their past prompts for re-use
6. **Batch enhance** — enhance multiple categories in one API call (Approach C from brainstorming)

---

## 19. Success criteria

- [ ] User can open AI Enhance lightbox from Generator ActionBar
- [ ] 4 categories available: Clothes (enhance), Head (enhance), Facewear (free), Background (free)
- [ ] Presets + freeform input (200 chars) + randomizer work for each category
- [ ] Reve Edit API called server-side with category-constrained prompts at 1024px
- [ ] Loading state shows shimmer + rotating community messages
- [ ] Side-by-side comparison (desktop) or stacked (mobile)
- [ ] Accept & Done / Accept & Continue / Retry / Reject all work correctly
- [ ] Sequential edits stack (Accept & Continue chains on previous result)
- [ ] Re-enhancing same category works (stacking)
- [ ] Credits only deducted on successful Reve + R2 save
- [ ] AI-enhanced images saved to R2 immediately on accept
- [ ] "My AI Creations" gallery accessible from Generator (like Favorites)
- [ ] Gallery supports Load / Export / Mint / Delete per creation
- [ ] Credit purchase flow works (bundle selection → XCH offer → confirm → balance updated)
- [ ] Generator enters "AI Enhanced Mode" after accepting (layers locked)
- [ ] "Reset to Original Layers" exits AI mode and restores layer editing
- [ ] AI-enhanced mints include AI attributes in CHIP-0007 metadata
- [ ] Mobile: full-screen lightbox, stacked images, vertical buttons
- [ ] All error states handled gracefully (no credit charged on failure)
