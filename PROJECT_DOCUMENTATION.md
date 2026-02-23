# Wojak.ink - Complete Project Documentation

> Generated: 2026-01-14 | For LLM context transfer
>
> This document contains everything an AI assistant needs to understand and work on this project.

---

## 1. Executive Summary

### What is Wojak.ink?
A production web application for the Wojak Farmers Plot NFT collection on the Chia blockchain. It serves real NFT collectors with:
- NFT browsing and discovery (4,200 NFTs)
- Real-time market data and sales tracking
- AI-powered trait analysis (BigPulp Intelligence)
- Custom avatar generator
- Portfolio visualization
- 6 arcade-style mini-games

### Who uses it?
- NFT collectors browsing and tracking their collection
- Traders analyzing market trends and pricing
- Community members engaging with games and media
- Prospective buyers discovering the collection

### Live URLs
- **Production:** https://wojak.ink
- **GitHub:** https://github.com/MoJuiceX/wojak-ink
- **Twitter:** https://twitter.com/MoJuiceX

### Project Path
`/Users/abit_hex/wojak-ink`

---

## 2. Features (Exhaustive)

### 2.1 Gallery Page
**File:** `src/pages/Gallery.tsx`

**Purpose:** Browse and discover NFTs from the collection.

**User Flow:**
1. User lands on Gallery page
2. Page loads first 100 NFTs (paginated)
3. User can filter by 14 character types via tabs
4. Infinite scroll loads more NFTs as user scrolls
5. Tapping an NFT opens the NFT Explorer modal
6. Explorer shows: image, all traits, rarity rankings, sales history
7. Desktop: Enhanced preview panel with thumbnail navigation

**Character Types (14):**
- Wojak, Soyjak, Waifu, Baddie, Papa Tang
- Alien Wojak, Monkey Zoo, Chad, Bepe
- NPC, Doomer, Bloomer, Zoomer, Coomer

**Data Sources:**
- `public/assets/nft-data/metadata.json` - Static NFT attributes (4,200 entries)
- MintGarden API - Current marketplace listings

**Caching:**
- PreloadCoordinator preloads first 50 images per character
- TanStack Query caches listings (1-10 min TTL)
- Frozen grid state prevents re-sorting while explorer is open

**Key Files:**
- `src/pages/Gallery.tsx` - Main page (42,580 bytes)
- `src/services/galleryService.ts` - Filtering, sorting logic
- `src/components/NFTPreviewCard.tsx` - Individual NFT display
- `src/components/DesktopExplorerPanel.tsx` - Desktop-specific preview

**Edge Cases:**
- Large images can delay first paint on slow connections
- Character filter persists during session via GalleryContext

---

### 2.2 BigPulp Intelligence Page
**File:** `src/pages/BigPulp.tsx`

**Purpose:** AI-powered NFT analysis and market intelligence.

**Tabs:**

**Ask Tab:**
- Interactive question tree for NFT lookup
- Animated BigPulp character with orange grove background
- "Surprise Me" random NFT selection
- NFT ID search with validation
- BigPulp commentary for each NFT (tone: hype, chill, roast, etc.)

**Attributes Tab:**
- Trait rarity table with sorting (by count, by average sale price)
- Clicking a trait shows all NFTs with that trait
- Sales analysis per attribute
- High Provenance (HP) trait indicators

**Market Tab:**
- Current listings from marketplace
- Floor price display
- Price distribution heatmap (visual bubble map)
- Top 10 highest sales analysis
- Rarest finds detection

**Data Sources:**
- `public/assets/BigPulp/nft_takes_v2.json` - Commentary (token_id → {take, tone})
- `public/assets/BigPulp/combo_database.json` - Named trait combinations
- `public/assets/BigPulp/question_tree_v2.json` - Question tree structure
- Dexie API - Sales history (750+ trades cached locally)
- MintGarden API - Current listings

**Business Logic:**
- Top 10 sales: Use `getRecentSales(10000)` to get ALL sales, sort by `xchEquivalent` descending
- NFT names: Use `getNftName()` helper which extracts "Base" attribute from metadata
- Display format: "Alien Wojak #3666" not "Wojak #3666"

**Key Files:**
- `src/pages/BigPulp.tsx` - Main page (80,280 bytes)
- `src/services/bigpulpService.ts` - Analysis logic, getNftName()
- `src/components/AskBigPulp.tsx` - Ask tab content
- `src/components/TraitValues.tsx` - Attributes table
- `src/components/MarketHeatmap.tsx` - Price visualization
- `src/components/BigPulpCharacter.tsx` - Animated character

---

### 2.3 Treasury Page
**File:** `src/pages/Treasury.tsx`

**Purpose:** Display community wallet/treasury holdings.

**Features:**
- Portfolio value card (XCH + USD conversion)
- Interactive crypto bubbles (physics-based, pop with sound)
- Large token holdings (visual cards)
- Small token holdings (list format)
- NFT collections owned
- Wallet address with copy button

**Data Sources:**
- SpaceScan API - Wallet balances
- CoinGecko API - XCH/USD price

**Rate Limit Warning (CRITICAL):**
SpaceScan is EXTREMELY strict: 1 request per 20 seconds!
- Always use cached data when available
- 30-second backoff on 429 errors
- localStorage fallback prevents empty states

**Caching:**
- `wojak_treasury_data` in localStorage (30 min cache)
- TanStack Query (6 hour TTL due to rate limits)
- Never shows $0 - has fallback defaults

**Key Files:**
- `src/pages/Treasury.tsx` - Main page
- `src/services/treasuryApi.ts` - SpaceScan integration
- `src/components/CryptoBubbles.tsx` - Bubble physics

---

### 2.4 Wojak Generator Page
**File:** `src/pages/Generator.tsx`

**Purpose:** Create custom Wojak avatars by combining layers.

**Layers (6, in render order):**
1. **Base** - Head/character type
2. **Head Accessory** - Hats, crowns, etc.
3. **Eyes** - Eye styles
4. **Mouth** - Mouth styles (special handling for masks)
5. **Clothing** - Outfits
6. **Background** - Scene backgrounds

**User Flow:**
1. User selects layers via tabbed interface
2. Live preview updates in real-time
3. Can save to favorites (localStorage)
4. Can export/download final image

**Special Logic:**
- Some layer combinations are incompatible (defined in `wojakRules.ts`)
- Mouth layer has special handling for mask overlays
- Mobile: Sticky mini-preview follows scroll

**Data Sources:**
- `public/assets/wojak-layers/` - Layer images organized by folder
- `src/lib/wojakRules.ts` - Compatibility rules

**Key Files:**
- `src/pages/Generator.tsx` - Main page (76,440 bytes)
- `src/services/generatorService.ts` - Layer composition
- `src/contexts/GeneratorContext.tsx` - Selection state
- `src/lib/wojakRules.ts` - Layer compatibility rules

**Credits & free mints:** Users earn credits by buying Wojak Farmers Plot NFTs with XCH; 100 credits = 1 free Your Wojak mint. Balance from `/api/credits/balance`; leaderboard from `/api/credits/leaderboard`. Full system (workers, formula, APIs, runbooks): **docs/CREDIT-LEADERBOARD-SYSTEM.md**.

**Full handoff (Generator + mint + IPFS + MintGarden + Chia):** **docs/GENERATOR-MINT-HANDOFF.md** — user journey, layer selection, mint flow, IPFS (Pinata), MintGarden dynamic minting, paid vs free, confirm API.

---

### 2.5 Media Hub Page
**File:** `src/pages/Media.tsx`

**Purpose:** Entertainment center with games, videos, music.

**Sections:**
- Games grid - Links to 6 mini-games
- Videos grid - Community videos filtered by category
- Music player - Background audio

**Features:**
- Floating video player (draggable, resizable via `react-rnd`)
- Video queue with auto-play next
- Category filtering for videos
- Game modal lightbox for full-screen gameplay

**Key Files:**
- `src/pages/Media.tsx` - Main page
- `src/contexts/MediaContext.tsx` - Video queue, player state
- `src/contexts/AudioContext.tsx` - Background audio
- `src/components/FloatingVideoPlayer.tsx` - Draggable player

---

### 2.6 Mini-Games (6)

**All games share:**
- Sound effects via `useGameSounds()` hook
- Haptic feedback on mobile via `useHaptic()` hook
- Leaderboards stored in localStorage
- Score persistence

**Games:**

1. **Brick by Brick** (`src/pages/OrangeStack.tsx`)
   - Block stacking puzzle (Tetris-like)
   - 3 difficulty levels
   - Scoring: perfect, near-perfect, speed, combo bonuses
   - Sad images on game over

2. **Memory Match** (`src/pages/MemoryMatch.tsx`)
   - Tile-flipping memory game
   - Match NFT images

3. **Orange Pong** (`src/pages/OrangePong.tsx`)
   - Classic Pong paddle game

4. **Wojak Runner** (`src/pages/WojakRunner.tsx`)
   - Side-scrolling endless runner

5. **Orange Juggle** (`src/pages/OrangeJuggle.tsx`)
   - Juggling mechanics game

6. **Knife Game** (`src/pages/KnifeGame.tsx`)
   - Knife throwing precision game

---

### 2.7 Settings Page
**File:** `src/pages/Settings.tsx`

**Features:**
- Theme selector (multiple themes via CSS custom properties)
- Background music volume slider + toggle
- Sound effects volume slider + toggle
- Wallet settings (mobile only)
- About/credits section
- Accessibility settings

**Persistence:**
- Zustand store with localStorage (`settings-storage`)

---

## 3. Technical Architecture

### 3.1 Tech Stack
| Layer | Technology | Version |
|-------|------------|---------|
| Framework | React | 19.2.0 |
| UI Library | Ionic React | 8.7.16 |
| Language | TypeScript | 5.9.3 |
| Build Tool | Vite | 7.2.4 |
| Data Fetching | TanStack Query | 5.90.16 |
| State Management | Zustand | 5.0.9 |
| Animation | Framer Motion | 12.25.0 |
| Styling | Tailwind CSS | 4.1.18 |
| Icons | Lucide React | 0.562.0 |
| Hosting | Cloudflare Pages | - |
| Backend | Cloudflare Workers | - |

### 3.2 API Integrations

| API | Base URL | Rate Limit | Purpose |
|-----|----------|------------|---------|
| MintGarden | `api.mintgarden.io` | 2 req/s | NFT listings, marketplace |
| Dexie.space | `api.dexie.space` | 2 req/s | Sales history, trades |
| SpaceScan | `api.spacescan.io` | **1 req/20s** | Wallet balances (STRICT!) |
| CoinGecko | `api.coingecko.com` | 1 req/2s | XCH/USD price |
| Parse.bot | `api.parse.bot` | Paid | Fallback scraper |

### 3.3 API Fallback System (3-Tier)

```
Request → Primary (Dexie free API)
              │
              ├─ Success → Return data
              │
              └─ Failure → Check localStorage cache
                              │
                              ├─ Cache < 24h old → Return cached
                              │
                              └─ Cache stale → Parse.bot (paid)
```

### 3.4 Caching Strategy

**localStorage (Persistent):**
| Key | Content | TTL |
|-----|---------|-----|
| `salesDatabank` | 750+ sales with XCH equivalent | 6 hours (auto-sync) |
| `wojak_xch_price` | Last XCH/USD price | 30 min |
| `wojak_treasury_data` | Wallet snapshot | 30 min |
| `wojak_nft_history_cache_v1` | Per-NFT history | 30 min |
| `favorites-storage` | User favorites | Permanent |
| `settings-storage` | User preferences | Permanent |

**TanStack Query (In-Memory):**
| Query Key | Stale Time | Cache Time |
|-----------|------------|------------|
| NFT metadata | 30 min | 1 hour |
| Market listings | 1 min | 10 min |
| Trait sales | 1 min | 10 min |
| Treasury data | 6 hours | 12 hours |
| Token prices | 6 hours | 12 hours |

### 3.5 Rate Limiter
**File:** `src/utils/rateLimiter.ts` (450 lines)

Features:
- Per-domain request queuing
- Automatic retry with exponential backoff (up to 3 retries)
- 429 error handling with 60-second cooldown
- In-flight request deduplication (same URL = same promise)
- Response caching with configurable TTL
- Timeout handling (30 second default)

Domain-specific config:
```typescript
MintGarden: 2 req/s, 500ms delay
Dexie: 2 req/s, 500ms delay
SpaceScan: 0.05 req/s (1 per 20s), 30s backoff
CoinGecko: 0.5 req/s, 2000ms delay
```

---

## 4. Business Logic

### 4.1 CAT Token Conversions

Dexie API returns raw token amounts without conversion rates. We must convert manually.

**File:** `src/services/historicalPriceService.ts`

```typescript
const TOKEN_RATES: Record<string, number> = {
  'PIZZA': 0.00000286,    // 550,000 PIZZA = ~1.57 XCH
  'SPROUT': 0.00000932,   // 110,000 SPROUT = ~1.02 XCH
  '$SPROUT': 0.00000932,  // Alternative symbol
  'G4M': 0.00000175,      // 366,666 G4M = ~0.64 XCH
  'BEPE': 0.0000204,      // 70,000 BEPE = ~1.43 XCH
  'HOA': 0.000318,        // 6,300 HOA = ~2 XCH
  'NeckCoin': 3.006,      // High-value token
};
```

### 4.2 Suspicious Sales Auto-Fix
**File:** `src/services/salesDatabank.ts`

`fixSuspiciousSales()` detects and corrects miscalculated CAT token sales:
- Triggered: Sales with amount > 50,000 AND xchEquivalent > 2 XCH
- Uses amount-based rate estimation when token not in TOKEN_RATES
- **CRITICAL:** Must run AFTER sync completes, not before

### 4.3 NFT Naming Convention
- NFTs have a "Base" attribute in metadata (e.g., "Alien Wojak", "Papa Tang")
- Use `getNftName()` from `bigpulpService.ts`
- Display: "Alien Wojak #3666" not "Wojak #3666"

### 4.4 Sales Data Sync
**File:** `src/providers/SalesProvider.tsx`

Workflow:
1. On app load: Load from localStorage
2. Check last sync timestamp
3. If > 6 hours: Trigger async sync (3-second delay to not block render)
4. After sync: Run `fixSuspiciousSales()`

---

## 5. Data Models

### 5.1 NFT Metadata
**File:** `public/assets/nft-data/metadata.json`

```typescript
interface NFTMetadata {
  edition: number;        // 1-4200
  attributes: Array<{
    trait_type: string;   // "Base", "Head", "Eyes", etc.
    value: string;        // Trait value
  }>;
}
```

### 5.2 Sale Record
**File:** `src/services/salesDatabank.ts`

```typescript
interface Sale {
  nftId: string;
  timestamp: number;
  amount: number;         // Raw token amount
  currency: string;       // "XCH" or CAT token name
  xchEquivalent: number;  // Converted XCH value
  usdEquivalent?: number;
  buyer?: string;
  seller?: string;
}
```

### 5.3 BigPulp Commentary
**File:** `public/assets/BigPulp/nft_takes_v2.json`

```typescript
interface NFTTake {
  [tokenId: string]: {
    take: string;   // Commentary text
    tone: string;   // "hype", "chill", "roast", etc.
  }
}
```

---

## 6. File Map

### Pages
| File | Purpose |
|------|---------|
| `src/pages/Gallery.tsx` | NFT browsing with filters |
| `src/pages/BigPulp.tsx` | AI analysis dashboard |
| `src/pages/Treasury.tsx` | Portfolio visualization |
| `src/pages/Generator.tsx` | Avatar creator |
| `src/pages/Media.tsx` | Entertainment hub |
| `src/pages/Settings.tsx` | App configuration |
| `src/pages/OrangeStack.tsx` | Block stacking game |
| `src/pages/MemoryMatch.tsx` | Memory game |
| `src/pages/OrangePong.tsx` | Pong game |
| `src/pages/WojakRunner.tsx` | Runner game |
| `src/pages/OrangeJuggle.tsx` | Juggling game |
| `src/pages/KnifeGame.tsx` | Knife game |

### Services
| File | Purpose |
|------|---------|
| `src/services/bigpulpService.ts` | NFT analysis, getNftName() |
| `src/services/marketApi.ts` | MintGarden/Dexie integration |
| `src/services/treasuryApi.ts` | SpaceScan integration |
| `src/services/salesDatabank.ts` | Sales storage, fixSuspiciousSales() |
| `src/services/historicalPriceService.ts` | TOKEN_RATES, XCH prices |
| `src/services/dexieSalesService.ts` | Dexie API fetching |
| `src/services/generatorService.ts` | Layer composition |
| `src/services/galleryService.ts` | NFT filtering/sorting |
| `src/utils/rateLimiter.ts` | API rate limiting (450 lines) |

### Providers/Contexts
| File | Purpose |
|------|---------|
| `src/providers/SalesProvider.tsx` | Sales sync on load |
| `src/contexts/GalleryContext.tsx` | Gallery filter state |
| `src/contexts/GeneratorContext.tsx` | Layer selections |
| `src/contexts/MediaContext.tsx` | Video queue |
| `src/contexts/AudioContext.tsx` | Background music |
| `src/contexts/ThemeContext.tsx` | Theme switching |

### Static Data
| File | Purpose |
|------|---------|
| `public/assets/nft-data/metadata.json` | All 4,200 NFT attributes |
| `public/assets/BigPulp/nft_takes_v2.json` | BigPulp commentary |
| `public/assets/BigPulp/combo_database.json` | Named trait combos |
| `public/assets/wojak-layers/` | Generator layer images |

### Config
| File | Purpose |
|------|---------|
| `vite.config.ts` | Build config, dev proxies |
| `wrangler.toml` | Cloudflare Workers config |
| `CLAUDE.md` | Project memory for Claude |
| `LEARNINGS.md` | Session learnings log |

---

## 7. Development Workflow

### Commands
```bash
npm run dev -- --host    # Dev server with network access
npm run build            # Production build
npx wrangler pages deploy dist --project-name=wojak-ink
```

### Local Testing
1. Run dev server with `--host` flag
2. Note Network URL (e.g., `192.168.1.143:5177`)
3. Open on phone (same WiFi)
4. Test, iterate, repeat

### Deployment
```bash
npm run build && npx wrangler pages deploy dist --project-name=wojak-ink
```

### Custom Skills (in `~/.claude/skills/`)
| Skill | Command | Purpose |
|-------|---------|---------|
| deploy | `/deploy` | Build + deploy to Cloudflare |
| dev | `/dev` | Start dev server |
| sync-sales | `/sync-sales` | Debug sales issues |
| add-token | `/add-token` | Add CAT token rate |
| status | `/status` | System health check |
| analyze | `/analyze [id]` | NFT lookup |
| sync-docs | `/sync-docs` | Update documentation |

---

## 8. Known Issues & Gotchas

| Issue | Cause | Fix |
|-------|-------|-----|
| Sales showing wrong XCH | Missing CAT token rate | Add to TOKEN_RATES in historicalPriceService.ts |
| "No sales data" | localStorage cleared | Wait for auto-sync or run `syncDexieSales()` |
| NFT shows "Wojak #XXXX" | Not using getNftName() | Use `getNftName()` with metadata |
| fixSuspiciousSales no effect | Ran before sync | Must run AFTER sync completes |
| SpaceScan 429 errors | Rate limit exceeded | Wait 30s, use cached data |
| XCH price wrong | Hardcoded value | Use `useXchPrice()` hook |

---

## 9. Recent Changes

<!-- FROM LEARNINGS.md -->

### 2026-01-14 (Latest)
- Fixed BigPulp "No sales available" bug
  - Issue: TanStack Query cached empty result before sync completed
  - Fix: SalesProvider now invalidates BigPulp queries after sync
  - File: `src/providers/SalesProvider.tsx`

### 2026-01-14
- Full codebase exploration (59,810 lines documented)
- Created 7 custom Claude Code skills (/deploy, /dev, /sync-sales, /add-token, /status, /analyze, /sync-docs)
- Added API architecture documentation
- Built automated docs pipeline (/sync-docs)

### 2026-01-14
- Fixed CAT token rates (SPROUT, PIZZA, G4M)
- Fixed fixSuspiciousSales() timing (must run AFTER sync)
- Fixed NFT naming (use Base attribute)

### 2026-01-14
- Created context management system
- Added LEARNINGS.md for session capture
- Made pre-compression capture mandatory

### 2026-01-14
- Git workflow: branches not folders
- Cleaned up duplicate project folders
- Standardized on `/Users/abit_hex/wojak-ink`

---

## 10. Nightshift Automation

### What is Nightshift?

Wojak.ink uses a **nightshift automation system** for autonomous, unattended code quality improvements. This allows high-value maintenance tasks to run during off-hours without human monitoring.

**Key Feature:** Human-guided autonomous execution - not "set and forget", but continuously fed work via git every 30 minutes.

### How It Works

1. **Task Queue** (`.nightshift/tasks.json`)
   - Human writes tasks describing what to do
   - Nightshift loads and executes in order
   - Each task has clear success criteria

2. **Autonomous Execution**
   - Nightshift runs for 8-hour cycle
   - Executes one task at a time
   - Tests after each change
   - Auto-commits successful tasks

3. **Human Guidance Loop**
   - Every 30 mins: Human reviews progress
   - Enables next batch of tasks
   - Nightshift pulls new tasks via git
   - Continues with new work

### Current Implementation

**Runner Script:** `scripts/nightshift.mjs`

**Configuration:**
```
.nightshift/
├── tasks.json          ← Task queue (what to do)
├── policy.json         ← Safety rules (what NOT to do)
├── CODEX-INSTRUCTIONS.md
├── state/              ← Run state (for resume)
└── README.md
```

**Commands:**
```bash
npm run nightshift:dry-run   # Preview without changes
npm run nightshift:run       # Execute for real
npm run nightshift:report    # Audit only, no fixes
npm run nightshift:resume    # Resume from interruption
```

### Why Nightshift Improves Quality

Traditional approach: AI implements → Human reviews → Iterate
**Nightshift approach:**
- Run 50+ quality checks automatically
- Generate comprehensive reports
- Fix low-risk issues autonomously
- Present curated results to human

Results in:
- ✅ Better test coverage
- ✅ Fewer linting issues
- ✅ Consistent code style
- ✅ Faster iteration cycles
- ✅ 24/7 maintenance without fatigue

### Phase Structure

Nightshift typically runs 5-7 phases:

1. **Security** - Patch vulnerabilities
2. **Linting** - Code style cleanup
3. **Bundle** - Dead code removal
4. **Testing** - Coverage improvements
5. **Quality** - CSS, TypeScript, docs
6. **Integration** - Build validation
7. **Publishing** - PR preparation

Each phase gates on previous: Phase 2 waits for Phase 1 ✅

### Documentation

See `docs/NIGHTSHIFT-GUIDE.md` for complete automation documentation including:
- Detailed task structure
- Running examples
- Monitoring & debugging
- Recovery procedures
- Best practices

---

## 10. For AI Assistants

### Quick Start
1. Read `CLAUDE.md` for conventions and gotchas
2. Check `LEARNINGS.md` for recent session context
3. Use custom skills for common tasks

### Critical Rules
- **Never hardcode XCH price** - use `useXchPrice()` hook
- **SpaceScan is strict** - 1 req/20s, always use cache
- **CAT tokens need manual rates** - check TOKEN_RATES
- **fixSuspiciousSales() timing** - AFTER sync, not before
- **Everything local until push** - don't auto-commit

### File Paths
- Project: `/Users/abit_hex/wojak-ink`
- Skills: `~/.claude/skills/`
- Live: https://wojak.ink

---

*Generated by /sync-docs pipeline*
