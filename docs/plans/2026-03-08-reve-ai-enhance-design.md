# Reve AI Enhance — Design Document

**Date:** 2026-03-08
**Status:** Approved
**Author:** User + Claude (MacOS app)

---

## 1. Purpose

Add an optional "AI Enhance" step to the Wojak Generator that lets users customize their Wojak beyond the predefined layer library. Users select a category, describe what they want (or pick a preset), and the Reve Edit API modifies the composited Wojak image. AI-enhanced images are saved to R2 and available for export or minting.

---

## 2. User journey

### 2.1 Placement in flow

After layer selection, before mint. The existing layer workflow is unchanged. "AI Enhance" is an optional step.

```
Build Wojak (layers + colors) → [✨ AI Enhance] → Export / Mint
                                   (optional)
```

### 2.2 Entry point

"✨ Enhance with AI" button in the ActionBar, next to Export/Mint. Enabled when user has AI credits; shows "Buy AI Credits" link when balance is 0.

### 2.3 Lightbox wizard flow

**Step 1 — Category picker:**
User sees their composited Wojak canvas and 4 category buttons:
- 👕 Clothes (enhance existing only)
- 🎩 Head (enhance existing only)
- 🎭 Facewear (full creative freedom)
- 🖼 Background (full creative freedom)

Face and Mouth are NOT available — they are core Wojak identity.

**Step 2 — Prompt builder:**
After picking a category, user sees:
- **Preset suggestion buttons** (category-specific, clickable — fills the text input)
- **Freeform text input** (200 character max, with character counter)
- **🎲 Randomizer button** (picks a random prompt from a curated pool, fills the input)
- **"✨ Enhance — 1 credit" button** (disabled until text input has content)

Clicking a preset, randomizing, or typing all populate the same text input. User can always edit before sending.

**Step 3 — Side-by-side result:**
Shows Original vs AI Enhanced side by side, with the prompt that was sent.

Four actions:
- **✓ Accept & Done** — saves AI version, closes lightbox, returns to generator with enhanced image ready to export/mint
- **✨ Accept & Continue** — saves AI version, returns to category picker to enhance another category (next edit builds on the already-enhanced image)
- **🔄 Retry** — same prompt, new generation (costs 1 more credit; Reve gives diverse outputs)
- **✗ Reject** — discards result, returns to Step 2 to try a different prompt (no additional credit spent for prompt entry)

**Step 4 — Continue or done:**
After accepting, category picker shows checkmarks on enhanced categories. User can enhance more categories or click "Done — Use Enhanced Wojak."

"Reset to Original Layers" discards all AI edits and returns to the layer-based composite.

---

## 3. Category freedom levels

| Category | Freedom | AI can do | AI cannot do |
|----------|---------|-----------|--------------|
| **Clothes** | Enhance only | Add patterns, textures, badges, embroidery, material changes to existing garment | Replace with entirely different clothing |
| **Head** | Enhance only | Add wear/damage, change material, add emblems/details to existing headwear | Swap to a different hat type |
| **Facewear** | Full freedom | Generate any eyewear, masks, face accessories (even items not in the layer library) | — |
| **Background** | Full freedom | Generate any background scene the user describes (complete replacement) | — |

---

## 4. Prompt engineering (per category)

Each category has a prompt template. The user's input is inserted into `{user_prompt}`.

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

## 5. Presets and randomizer pools

Each category has a curated set of presets (shown as clickable buttons) and a larger randomizer pool.

### Clothes presets (enhance-only examples)
- Flame pattern
- Tiger print
- Gold embroidery
- Tie-dye
- Diamond studs
- Camouflage
- Racing stripes
- Vintage wash

### Head presets (enhance-only examples)
- Battle-worn dents
- Gold plating
- Diamond encrusted
- Rusty metal
- Neon glow trim
- Fur-lined
- Graffiti paint

### Facewear presets (full freedom examples)
- Steampunk goggles
- Diamond monocle
- Cyberpunk visor
- Aviator sunglasses
- Opera phantom mask
- AR holographic display
- Gold-rimmed spectacles

### Background presets (full freedom examples)
- Tokyo neon alley at night
- Underwater coral reef
- Medieval castle throne room
- Spaceship cockpit
- On top of a skyscraper at sunset
- Cyberpunk city rain
- Cozy cabin fireplace

Randomizer button picks one from the full pool (presets + additional options not shown as buttons) and populates the text input.

---

## 6. AI credits system

### 6.1 Separate credit pool

AI credits are a separate economy from the existing free-mint credits (which are earned by trading Farmers Plot NFTs). AI credits are purchased with XCH on the site.

### 6.2 Pricing (fixed XCH, capped at 50)

| Bundle | Per credit | Total XCH | Discount |
|--------|-----------|----------|----------|
| 1 credit | 0.08 XCH | 0.08 XCH | — |
| 5 credits | 0.07 XCH | 0.35 XCH | 12.5% |
| 15 credits | 0.06 XCH | 0.90 XCH | 25% |
| 30 credits | 0.05 XCH | 1.50 XCH | 37.5% |
| 50 credits | 0.04 XCH | 2.00 XCH | 50% |

**Unit economics:** Reve API costs ~$0.04 per edit. At XCH = $2.50, the base price (0.08 XCH = $0.20) gives 5x margin. The deepest discount (0.04 XCH = $0.10) gives 2.5x margin, which stays profitable even if XCH drops 50%.

### 6.3 Purchase flow

Same Chia offer pattern as paid mints:
1. User selects bundle → POST /api/ai/credits/buy → returns offer file
2. User accepts offer in Sage wallet → XCH transferred
3. POST /api/ai/credits/confirm → credits added to balance

### 6.4 Spending

1 AI edit = 1 credit. Credit deducted only on successful Reve API response. Failed calls or content violations do not cost credits.

---

## 7. Image persistence

### 7.1 Storage strategy: R2 now, IPFS at mint

- **On accept:** AI-enhanced image saved immediately to Cloudflare R2
- **Path pattern:** `ai-edits/{wallet_address}/{enhancement_id}.webp`
- **At mint time:** R2 image is pinned to IPFS via Pinata (same as existing mint flow)
- **"My AI Creations" gallery:** Users can view, load, export, or mint any saved AI creation

### 7.2 Sequential edits

When user does "Accept & Continue," the next category edit receives the already-enhanced image from R2 (not the original layer composite). Edits stack. The `parent_enhancement_id` column tracks the chain.

---

## 8. Architecture

### 8.1 New frontend components

| Component | Role |
|-----------|------|
| `AIEnhanceLightbox` | Main lightbox wrapper (wizard state machine) |
| `AICategoryPicker` | Step 1: 4 category buttons + canvas preview |
| `AIPromptBuilder` | Step 2: presets + freeform input + randomizer |
| `AIResultComparison` | Step 3: side-by-side + accept/reject/retry/continue |
| `AICreditsDisplay` | Balance badge + buy link |
| `AICreditsShop` | Bundle selection + purchase flow |

### 8.2 New context

`AIEnhanceContext` — manages AI credit balance, enhancement history, wizard state. Separate from GeneratorContext and MintContext.

### 8.3 New API endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ai/enhance` | POST | Send image + prompt to Reve, save result to R2, deduct credit |
| `/api/ai/balance` | GET | AI credit balance for wallet |
| `/api/ai/creations` | GET | List saved AI creations for wallet |
| `/api/ai/credits/buy` | POST | Initiate XCH purchase for AI credits |
| `/api/ai/credits/confirm` | POST | Confirm purchase after wallet acceptance |

### 8.4 Enhance endpoint flow

```
POST /api/ai/enhance
Body: { walletAddress, imageBase64, category, prompt }

1. Validate wallet (isValidChiaAddress)
2. Check ai_credit_purchases - ai_credit_usage balance >= 1
3. Build category-aware constrained prompt (see section 4)
4. POST https://api.reve.com/v1/image/edit
   { edit_instruction: constrainedPrompt, reference_image: imageBase64 }
5. On success:
   - Upload result to R2
   - INSERT into ai_enhancements
   - INSERT into ai_credit_usage
   - Return { imageUrl, enhancementId, creditsRemaining }
6. On failure / content_violation:
   - Do NOT deduct credit
   - Return error with reason
```

### 8.5 System diagram

```
Frontend (Generator)
  ActionBar → "Enhance with AI"
       ↓
  AIEnhanceLightbox
  ├── AICategoryPicker
  ├── AIPromptBuilder
  └── AIResultComparison
       ↓
  AIEnhanceContext
       ↓
  POST /api/ai/enhance
       ↓
  ┌────────────────────────────────────┐
  │ enhance.ts (Pages Function)        │
  │  1. Validate + check balance       │
  │  2. Build constrained prompt       │
  │  3. Call Reve Edit API             │
  │  4. Save to R2                     │
  │  5. Record in D1                   │
  └──────┬────────┬────────┬───────────┘
         ↓        ↓        ↓
    Reve API    R2 Bucket  D1 Database
    (edit)      (images)   (credits +
                            enhancements)
```

---

## 9. Data model

### 9.1 New tables

```sql
-- AI credit purchases (buying credits with XCH)
CREATE TABLE ai_credit_purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  credits_purchased INTEGER NOT NULL,
  xch_paid_mojos INTEGER NOT NULL,
  bundle_tier TEXT NOT NULL,          -- '1', '5', '15', '30', '50'
  offer_file TEXT,
  status TEXT DEFAULT 'pending',      -- pending, confirmed, failed, expired
  created_at TEXT DEFAULT (datetime('now')),
  confirmed_at TEXT
);

-- AI credit usage (one row per edit)
CREATE TABLE ai_credit_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  enhancement_id INTEGER REFERENCES ai_enhancements(id),
  credits_spent INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- AI enhanced images (persisted creations)
CREATE TABLE ai_enhancements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  category TEXT NOT NULL,             -- clothes, head, facewear, background
  prompt TEXT NOT NULL,
  reve_request_id TEXT,
  reve_version TEXT,
  parent_enhancement_id INTEGER,      -- NULL if first edit, else chains
  base_layers_json TEXT,              -- snapshot of selected layers at time of edit
  created_at TEXT DEFAULT (datetime('now'))
);
```

### 9.2 Balance calculation

```sql
SELECT
  COALESCE(SUM(p.credits_purchased), 0) -
  COALESCE(SUM(u.credits_spent), 0) AS balance
FROM ai_credit_purchases p
LEFT JOIN ai_credit_usage u ON u.wallet_address = p.wallet_address
WHERE p.wallet_address = ? AND p.status = 'confirmed';
```

### 9.3 Migration file

`functions/migrations/NNN_ai_enhance_system.sql` — follows existing migration pattern.

---

## 10. Error handling

| Scenario | User sees | Credit charged? |
|----------|-----------|----------------|
| Reve API timeout | "Edit failed. Try again." | No |
| Reve content violation | "This edit was blocked by content policy. Try a different prompt." | No |
| Insufficient credits | "Not enough AI credits. Buy more to continue." + shop link | No |
| R2 upload failure | "Failed to save your edit. Try again." | No (rolled back) |
| Reve 429 rate limit | "Too many requests. Wait a moment and try again." | No |
| Wallet not connected | "Connect your Sage wallet to use AI Enhance." | No |

Credits are only deducted AFTER both the Reve call succeeds AND the R2 save succeeds.

---

## 11. Env vars and secrets

| Name | Type | Purpose |
|------|------|---------|
| `REVE_API_KEY` | Secret | Bearer token for Reve API (format: papi.xxxxx) |
| `AI_EDITS_R2_BUCKET` | Binding | R2 bucket for storing AI-enhanced images |
| `AI_CREDITS_PRICING` | Var (optional) | JSON pricing config; defaults to hardcoded tiers |

---

## 12. What is NOT in scope

- Remix endpoint (multi-image blending) — future phase
- Video generation — not planned
- AI editing of Face (Base) or Mouth layers — locked to layer system
- Generating entirely new Clothes or Head items — enhance-only for these categories
- Real-time preview while typing — edit happens on button click only
- AI credits earned from trading (only purchased with XCH)

---

## 13. Success criteria

- [ ] User can open AI Enhance lightbox from generator ActionBar
- [ ] 4 categories available: Clothes, Head, Facewear, Background
- [ ] Presets + freeform input + randomizer work for each category
- [ ] Reve Edit API called server-side with category-constrained prompts
- [ ] Side-by-side comparison with Accept & Done / Accept & Continue / Retry / Reject
- [ ] Credits only deducted on successful edits
- [ ] AI-enhanced images saved to R2 and accessible via "My AI Creations"
- [ ] Credit purchase flow works (XCH offer → confirm → balance updated)
- [ ] Sequential edits stack (Accept & Continue sends enhanced image to next edit)
- [ ] Enhanced image can be exported and minted through existing flows
