# NFT Layer-Swap Platform — Design Document

**Date:** 2026-02-27
**Status:** Draft
**Author:** User + Claude (brainstorm)

---

## Why Build This

The Wojak generator proves that layer-swap NFT collections are compelling — users love customizing and minting their own avatar. But every artist who wants to launch a similar collection must either code their own generator from scratch or hire developers. There's no turnkey solution.

This platform fills that gap: an artist uploads their layer art, toggles a few settings, and gets a fully working generator + minting + gallery + marketplace at their own subdomain. The platform handles all technical complexity — IPFS, blockchain minting, royalty splits, hosting.

---

## Product Vision

**One-stop shop for artists to launch layer-swap NFT collections with minimum effort.**

### Artist Experience (Target UX)
1. Sign up → create collection
2. Upload layers organized by category (Body, Head, Clothes, etc.)
3. Set layer order (z-index) via drag-and-drop
4. Toggle settings: mint price, supply cap, royalty %, royalty split
5. Preview & test the generator
6. Launch → collection goes live at `artist-name.platform.com`

### End-User Experience
- Visit collection subdomain
- Generate avatar by swapping layers (same UX as Wojak generator)
- Mint NFT (pay in XCH)
- Browse gallery of minted NFTs
- Trade on marketplace
- Leaderboards & community features

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Target customer | Artists/creators (non-technical) | Biggest unserved market |
| Blockchain | Chia first, multi-chain later | Existing minting infra + ecosystem |
| Onboarding model | White-glove initially | Learn what artists need before automating |
| Revenue | Setup fee + rev share per mint | Aligns incentives, covers platform costs |
| Branding | New brand (not Wojak) | Positions as a broader platform |
| Wojak.ink relationship | Separate project | Protects live revenue, no coupling risk |
| Collection hosting | Subdomains (`artist.platform.com`) | Artist identity without DNS complexity |
| Scope | Full experience (gen + mint + gallery + marketplace + leaderboard) | Competitive differentiator |
| Timeline | 6+ months, build it right | Proper platform architecture |
| Tech stack | React + Vite + Cloudflare (same as Wojak) | Known stack, ideal infra for this use case |

---

## Architecture

### Three Layers

```
┌─────────────────────────────────────┐
│         Artist Dashboard            │  ← Artists manage collections
│  (upload layers, configure rules,   │
│   set pricing, view analytics)      │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│          Platform API               │  ← Shared backend
│  (Cloudflare Workers + D1 + R2)     │
│  Auth, minting, IPFS, configs       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│       Collection Frontend           │  ← Per-collection user-facing site
│  (artist.platform.com)              │
│  Generator, gallery, marketplace    │
└─────────────────────────────────────┘
```

### Data Flow

```
Artist uploads PNGs → R2 storage → manifest generated →
  Collection config saved to D1 →
  Subdomain resolves → Frontend loads config →
  User generates avatar → Canvas renders from R2 images →
  User mints → API: validate → reserve number → render final →
  Upload to IPFS (Pinata) → MintGarden dynamic mint →
  NFT on Chia with SplitXCH royalty
```

---

## Collection Config Schema

Each collection is defined by a config that drives everything:

```
Collection {
  // Identity
  id: UUID
  slug: string (subdomain)
  name: string
  description: string
  artist_id: UUID

  // Layer manifest
  manifest: {
    version: number
    resolution: { width: number, height: number }  // e.g., 1000x1000
    basePath: string  // R2 bucket path
    categories: [{
      name: string          // "Body", "Head", "Clothes"
      layerName: string     // internal key
      zIndex: number        // render order
      required: boolean     // must have a selection
      colorable: boolean    // supports fill colors
    }]
    traits: [{
      id: string
      name: string
      category: string
      files: {
        outline: string       // main outline PNG
        fill?: string         // colorable fill layer
        detail?: string       // fixed detail overlay
        detailOptions?: [{ file, name }]  // selectable details
      }
      colorable: boolean
      defaultColor?: string
      composite?: boolean     // multi-layer trait
      layers?: [{ file, zIndex, type }]  // for composite traits
    }]
  }

  // Rules (declarative)
  rules: [{
    when: { category: string, trait?: string }
    action: "disable" | "force" | "disableOption"
    target: { category: string, trait?: string }
    reason?: string  // shown to user
  }]

  // Minting
  minting: {
    supply: number          // max NFTs
    price_xch: number       // base mint price
    surcharge: {
      enabled: boolean
      categories: string[]  // which categories have surcharges
      halfLife_days: number  // usage decay rate
      exponent: number      // price curve steepness
    }
    royalty_percent: number        // total on-chain royalty
    splits: {
      artist_address: string      // artist's XCH address
      artist_percent: number      // e.g., 80
      platform_percent: number    // e.g., 15
      minter_percent: number      // e.g., 5
    }
    mintgarden_profile_id: string
    offer_expiry_minutes: number
  }

  // Branding / Theme
  theme: {
    primaryColor: string
    primaryHoverColor: string
    bgColor: string
    surfaceColor: string
    textColor: string
    logo: string          // R2 path
    favicon: string       // R2 path
    borderRadius: string  // card styling
  }

  // Feature flags
  features: {
    gallery: boolean
    marketplace: boolean
    leaderboard: boolean
    favorites: boolean
    export: boolean
  }

  // Status
  status: "draft" | "testing" | "live" | "paused"
}
```

---

## Layer System

### Upload Requirements (Enforced by Platform)

- **All PNGs must be the same resolution** (set once per collection, e.g., 1000×1000)
- **Transparent backgrounds** (PNG with alpha)
- **Consistent positioning** — layers stack on the same canvas, so a "hat" must be positioned where it would sit on the "head"
- **File naming convention** — platform generates trait IDs from filenames but artist can rename in dashboard

### Upload Flow (Artist Dashboard)

1. Artist creates a new category (e.g., "Hats")
2. Sets z-index via drag-and-drop ordering of categories
3. Uploads PNGs for that category — each PNG becomes a trait
4. Platform validates: resolution matches, alpha channel present, file size reasonable
5. Artist names each trait, marks colorable (yes/no), sets default color
6. Repeat for each category
7. Platform auto-generates manifest.json and stores in D1

### Resolution Validation

On first upload, platform detects resolution from the first image and locks it for the collection. All subsequent uploads must match. If an artist uploads a 500×500 PNG to a 1000×1000 collection, the platform rejects it with a clear error: "This image is 500×500 but your collection uses 1000×1000. Please resize and re-upload."

### Layer Storage

- **R2 bucket per collection:** `collections/{collection_id}/layers/`
- **Structure:** `{category}/{trait_id}_outline.png`, `{category}/{trait_id}_fill.png`
- **CDN:** Cloudflare R2 with public bucket + caching headers
- **No git storage** — unlike Wojak, layers live in R2, not the repo

---

## Rules Engine

### Declarative Rule Format

Artists define rules through a simple UI. Each rule follows this pattern:

**"When [condition], then [action] on [target]"**

| Action | Example | Effect |
|--------|---------|--------|
| **Disable category** | When Clothes = Spacesuit → disable Head | Head options grayed out |
| **Force trait** | When Head = Crown → force Base = Royal | Auto-select a specific trait |
| **Disable specific trait** | When Base = Male → disable Lipstick in Mouth | Single option removed |

### Rule UI (Dashboard)

Simple form with dropdowns:
```
When [Category ▼] is [Trait ▼]
Then [Disable ▼] [Category ▼] / [Trait ▼]
(optional) Reason: [text input]
```

Artists can add multiple rules. Each rule shows as a card they can reorder or delete.

### Rule Execution

Rules execute in order. The platform's rule engine is generic — it receives the rule list from collection config and applies them against the current selection. No hardcoded trait knowledge.

```typescript
function evaluateRules(rules: Rule[], currentSelection: Selection): DisabledResult {
  // For each rule, check if condition matches current selection
  // Accumulate disabled categories, disabled traits, forced selections
  // Return merged result
}
```

### Limitations (Handled via White-Glove)

Some complex patterns (like Wojak's mouth subcategory folding or multi-layer composite interactions) can't be expressed in simple when/then rules. For the initial version, these edge cases are handled during white-glove onboarding — you help the artist restructure their layers to avoid needing complex rules.

---

## Minting Infrastructure

### Flow

```
User clicks "Mint" →
  Frontend validates selection completeness →
  POST /api/collections/{id}/mint/submit { wallet, layers, colors } →
  Server: validate wallet (bech32m) →
  Server: validate all trait IDs exist in collection manifest →
  Server: check supply not exceeded →
  Server: calculate price (base + surcharges) →
  Server: create mint_job (queued) →
  Background: reserve mint_number (atomic counter per collection) →
  Background: render final image on server (canvas) →
  Background: upload image + metadata to IPFS (Pinata) →
  Background: call MintGarden /mint/dynamic →
  Background: return offer (paid) or launcher_id (free) →
  User completes payment (if paid) →
  mint_job.step = 'completed'
```

### MintGarden Credits

The platform holds a pool of MintGarden dynamic minting credits. Each mint from any collection burns one credit.

**Cost absorption model:**
- Platform buys credits in bulk (cheaper per-unit)
- Credit cost is factored into the platform's rev share percentage
- Artists don't need to know about or manage credits
- If credit pool runs low, platform buys more (operational cost)

### Royalty Splits (SplitXCH)

When a collection launches, the platform automatically creates a SplitXCH address with the negotiated split:

```
Collection "CoolCats" royalty: 5%
├── Artist wallet:    80% → xch1artist...
├── Platform treasury: 15% → xch1platform...
└── Minter reward:     5% → (per-mint, embedded in metadata)
```

The SplitXCH address is generated once and stored in the collection config. The artist provides their XCH address during setup; the platform treasury address is fixed.

**Flexible splits:** Each collection stores its own split percentages. Defaults are configurable, and individual artists can negotiate different terms during white-glove onboarding.

### Per-Collection Database

Each collection gets isolated minting state:

```sql
-- Per collection (in shared D1 or separate D1 per collection)
CREATE TABLE mint_counter (id INTEGER PRIMARY KEY, next_number INTEGER);
CREATE TABLE mint_jobs (...collection_id, wallet, layers_json, step, mint_number...);
CREATE TABLE trait_usage (...collection_id, trait_category, usage_count...);
```

---

## Artist Dashboard

### Pages

1. **Collection Setup** — Name, description, slug (subdomain), resolution
2. **Layer Manager** — Upload PNGs, organize into categories, set z-index order
3. **Trait Editor** — Name traits, mark colorable, set defaults, upload detail options
4. **Rules Builder** — Add when/then rules via dropdown UI
5. **Minting Config** — Price, supply, royalty %, split addresses
6. **Theme Editor** — Pick colors, upload logo/favicon, preview branding
7. **Preview & Test** — Live generator preview with their actual layers. Test all combinations before launch
8. **Analytics** — Mints over time, revenue, popular traits, wallet stats
9. **Settings** — Collection status (draft/testing/live/paused), danger zone

### Preview & Testing (Gap #5 Solution)

Before launching, artists MUST test their generator:
- "Preview" mode loads the generator with their layers
- Artist can try all combinations, verify alignment, test rules
- Collection stays in "testing" status until artist clicks "Go Live"
- Platform runs automated checks: all layer resolutions match, at least one trait per required category, rules don't create impossible states

---

## Tech Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Frontend framework | React + Vite + TypeScript | Known stack, proven at scale with Wojak |
| CSS | Tailwind (layout) + CSS variables (theming) | Dynamic theming via CSS vars per collection |
| Hosting | Cloudflare Pages | Subdomain support, edge-cached |
| API | Cloudflare Workers | Serverless, global edge, D1 bindings |
| Database | Cloudflare D1 (SQLite) | Per-collection isolation or shared with FK |
| File storage | Cloudflare R2 | Layer PNGs, logos, exported images. No egress fees |
| Auth | Clerk | Already know it, handles artist + user auth |
| IPFS | Pinata | Proven with Wojak minting |
| Minting | MintGarden Dynamic API | Proven with Wojak, Chia-native |
| Wallet | WalletConnect (Chia) | Proven with Wojak |

### Dynamic Theming

Each collection's theme is loaded as CSS variables:
```css
:root {
  --color-primary: var(--collection-primary, #ff6b00);
  --color-bg: var(--collection-bg, #0a0a0f);
  /* etc. */
}
```

On page load, the collection config is fetched and CSS variables are injected. The entire UI adapts without code changes.

### Subdomain Routing

```
Request: coolcats.platform.com →
  Cloudflare Worker: parse subdomain "coolcats" →
  Lookup collection by slug →
  If found: serve collection frontend with config injected →
  If not found: 404 page
```

Special subdomains:
- `www.platform.com` / `platform.com` → Platform landing page
- `dashboard.platform.com` → Artist dashboard
- `api.platform.com` → Platform API

---

## Revenue Model

### Setup Fee
- One-time payment when collection launches
- Covers white-glove onboarding time
- Negotiable per artist (higher for larger/more complex collections)
- Paid in XCH or fiat (Stripe for fiat if desired)

### Rev Share on Mints
- Platform takes X% of every mint (default 15%, negotiable)
- Enforced on-chain via SplitXCH — artist can't bypass
- Platform's cut covers: hosting, R2 storage, MintGarden credits, IPFS pinning, maintenance

### Rev Share on Secondary Sales
- On-chain royalty set by artist (e.g., 5%)
- Platform takes a portion of that royalty (default 20% of royalty)
- Also enforced via SplitXCH

### Example Economics
```
Collection: CoolCats
Supply: 5,000 NFTs
Mint price: 0.2 XCH
Royalty: 5%

If 3,000 minted:
  Total mint revenue: 600 XCH
  Artist (80%): 480 XCH
  Platform (15%): 90 XCH
  Minters (5%): 30 XCH

Secondary sales (assume 1,000 trades at avg 0.5 XCH):
  Total royalty: 25 XCH
  Artist (80%): 20 XCH
  Platform (20%): 5 XCH
```

---

## Phased Delivery

### Phase 1: Foundation (Months 1-2)
- New repo + project skeleton
- Cloudflare setup (Workers, D1, R2, Pages)
- Collection config schema + CRUD API
- Multi-tenant subdomain routing
- R2 layer upload + storage
- Basic canvas renderer (ported from Wojak, config-driven)
- Dynamic theming system

### Phase 2: Minting & Gallery (Months 3-4)
- Minting queue (ported from Wojak, parameterized per collection)
- IPFS upload + MintGarden integration
- SplitXCH royalty address generation
- Gallery page (browse minted NFTs)
- Flexible pricing + surcharge system
- Revenue split enforcement

### Phase 3: Artist Dashboard (Months 4-5)
- Artist auth + accounts
- Layer upload UI (drag & drop, validation)
- Manifest builder (categories, z-order, colorable toggles)
- Rule builder (when/then dropdowns)
- Theme customizer
- Preview & testing mode

### Phase 4: Community Features (Months 5-6)
- Marketplace / trading
- Leaderboards
- Collection analytics dashboard
- Platform landing page + collection showcase

### Phase 5: Scale (Month 6+)
- Multi-chain (Ethereum, Solana)
- Self-serve onboarding (reduce white-glove)
- Advanced rule types
- Custom domain support
- API/SDK for developer integrations

---

## Open Questions

1. **Platform name / domain** — Needs a brand name and domain before Phase 1 starts
2. **D1 strategy** — One shared database with `collection_id` FK, or separate D1 per collection? Shared is simpler; separate is more isolated
3. **Server-side rendering** — Gallery/collection pages may benefit from SSR for SEO. Worth adding Cloudflare Workers SSR for meta tags at minimum
4. **Image rendering location** — Canvas rendering for minting: client-side (like Wojak) or server-side (Node.js canvas in Worker)? Server-side is more reliable but harder in Workers
5. **Free mints** — Support credit-based free minting like Wojak? Or paid-only for v1?
6. **Existing Chia artists** — Who are the first 2-3 artists you'd onboard? Their specific needs will shape Phase 1 priorities
