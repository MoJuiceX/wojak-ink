# Phase 2 Collection — Branding Brief

Branding for the user-created Wojak NFT collection (Generator → Mint). Use this to set **collection name**, **description**, **logo**, and **banner** on MintGarden and in metadata.

---

## 1. Collection name

### YourWojak / Your Wojak (current)

**Pros**
- Already used in code and manifest; no refactor needed.
- Clearly signals “yours” / user-created.
- Short and easy to say.

**Cons**
- “Your X” is a common pattern (Your PFP, etc.) and can feel generic.
- Doesn’t tie explicitly to Wojak.Ink or the Farmers Plot universe.

**Verdict:** Solid and safe. If you want something more distinctive and platform-linked, consider the alternatives below.

---

### Alternative names (shortlist)

| Name | Vibe | Notes |
|------|------|--------|
| **Wojak.Ink Originals** | Platform-first, “official” user creations | Strong link to wojak.ink; “Originals” = created here. |
| **Wojak Workshop** | Where you build your Wojak | Memorable, implies creation/craft. |
| **Plot Customs** | Tied to Farmers Plot | Short; “Plot” = same world, “Customs” = custom mints. |
| **Wojak Forge** | Creation / crafting | Short, strong metaphor. |
| **Ink Mints** | Short, site tie-in | “Ink” = wojak.ink; very compact. |
| **Wojak Creator Collection** | Literal | Clear but a bit long. |
| **Your Wojak** (keep) | Personal, simple | Already in use; minimal change. |

**Recommendation**
- **Keep “Your Wojak”** if you want zero confusion and minimal changes.
- **Prefer “Wojak.Ink Originals”** if you want a stronger, platform-branded name that still reads as “user-created originals from wojak.ink.”
- **Prefer “Wojak Workshop”** if you want a creative, memorable name that’s still clearly about building your own Wojak.

---

## 2. Collection description

Use one of these (or a mix) for MintGarden and CHIP-0007.

### Option A — Short (for marketplace UI)

```
Custom Wojaks created on wojak.ink. Design your own using the same layers behind the Wojak Farmers Plot — then mint on Chia. One of one by you.
```

### Option B — Community + platform

```
Your Wojak, your design. Create and mint unique Wojaks at wojak.ink using the official layer set. Part of the Wojak Farmers Plot universe on Chia.
```

### Option C — Emphasize “one of one”

```
One-of-one Wojaks created by the community on wojak.ink. Use the Generator to pick base, clothes, face, and more — then mint your design on Chia. No two alike.
```

### Option D — Tie to 4,200 (Farmers Plot)

```
The same layers that made 4,200 Wojak Farmers Plot NFTs — now in your hands. Design your Wojak at wojak.ink and mint it on Chia. Your character, your mint.
```

**Recommendation:** Option A or B for clarity and length. Use C or D if you want to stress uniqueness or the 4,200 connection.

---

## 3. Collection logo

**Role:** Small icon (e.g. 200×200–512×512) for MintGarden, wallets, and shares.

**Guidelines**
- **Recognizable at small size:** Single Wojak face or a clear “W”/ink drop so it reads even as a tiny avatar.
- **Match Wojak.Ink:** Dark background (#0a0a0f / #12121a), orange accent (#ff6b00), same style as site.
- **Different from Farmers Plot:** If the main collection uses a “group of farmers” or full-body, use a single classic Wojak face or a simple “created here” mark (e.g. pen/ink + Wojak silhouette) so this reads as “Generator / your creation” not “original 4,200.”
- **Format:** Square, PNG with transparency or WebP; 512×512 safe for all platforms.

**Concrete ideas**
1. **Classic Wojak face** (sad/neutral) on dark with orange glow — “the face you customize.”
2. **Wojak + pen/brush** — “you create it.”
3. **Orange “W” or “ink” drop** with a tiny Wojak silhouette — abstract but on-brand.
4. **Same logo as wojak.ink** with a small “Creator” or “Originals” badge — if you keep “Wojak.Ink Originals.”

---

## 4. Collection banner

**Role:** Wide header (e.g. 1400×400 or 1920×480) on MintGarden and maybe Generator page.

**Guidelines**
- **Wide and readable:** Text and key art visible on desktop and mobile (safe zone in center).
- **Same world as Farmers Plot:** Same art style (line work, colors) so it feels like one ecosystem.
- **“You create”:** Show a mix of user-created Wojaks (e.g. 3–5 different designs from your layers) so it’s clear this is the custom collection.
- **Brand:** wojak.ink + collection name + “Create & mint on Chia” or similar.
- **Colors:** Dark base, orange accents, avoid clashing with existing site/marketplace.

**Layout idea**
- **Left:** 2–3 example custom Wojaks (different clothes/faces).
- **Center/right:** Collection name + one-line tagline (e.g. “Design your Wojak. Mint on Chia.”) + wojak.ink.
- **Background:** Dark gradient (#0a0a0f → #12121a), subtle orange glow or grid so it’s not flat.

---

## 5. Quick reference

| Item | Suggested default |
|------|-------------------|
| **Collection name** | Your Wojak (keep) or Wojak.Ink Originals |
| **Short description** | Option A or B above |
| **Logo** | Classic Wojak face on dark + orange, or W/ink + Wojak; 512×512 |
| **Banner** | 1400×400 or 1920×480; 3–5 custom Wojaks + name + “Create & mint on Chia” |

---

## 6. Where it’s used in code

- **Mint metadata:** `functions/api/mint/prepare.ts` — `metadata.collection.name`, `metadata.name`, `metadata.description`.
- **Manifest:** `public/assets/wojak-layers/YourWojak-layers/manifest.json` — `"collection": "YourWojak"` (internal; can stay as-is for assets).
- **MintGarden:** Set collection name, description, logo, and banner in the MintGarden dashboard for the Phase 2 collection UUID (`PHASE2_COLLECTION_UUID`).

After you lock the final name and description, update `prepare.ts` (and any Phase 4 placeholder copy) so on-chain metadata and the site stay in sync.
