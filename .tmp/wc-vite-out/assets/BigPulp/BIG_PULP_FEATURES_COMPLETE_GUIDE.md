# "Hang with BigPulp" - Complete Feature Documentation

## Overview

"Hang with BigPulp" is a comprehensive NFT intelligence and exploration system that provides users with AI-powered commentary, collection insights, trait analysis, combo discovery, and value estimation for the Wojak Farmers Plot NFT collection. BigPulp acts as an intelligent guide that helps users understand their NFTs, discover rare combinations, learn about provenance, and make informed decisions.

**Entry Point:** Users click "Hang with Big Pulp 🍊" button in the Rarity Explorer window.

---

## Table of Contents

1. [Main Features Overview](#main-features-overview)
2. [Feature 1: Question Tree Window](#feature-1-question-tree-window)
3. [Feature 2: BigPulp Commentary Window](#feature-2-bigpulp-commentary-window)
4. [Feature 3: BigPulp Intelligence Window](#feature-3-bigpulp-intelligence-window)
5. [Data Sources & APIs](#data-sources--apis)
6. [Code Locations](#code-locations)
7. [Implementation Details](#implementation-details)

---

## Main Features Overview

When users click "Hang with Big Pulp," they access three main interfaces:

1. **Question Tree Window** - Interactive Q&A system with pre-written answers
2. **BigPulp Commentary Window** - Personalized commentary for specific NFTs
3. **BigPulp Intelligence Window** - Advanced exploration tools (Combo Explorer, Citrus Value, High Provenance, Learn tab)

---

## Feature 1: Question Tree Window

**File:** `src/components/windows/BigPulpQuestionTreeWindow.jsx`

### What It Is

A conversational interface where users can ask BigPulp questions about the collection. BigPulp responds with pre-written answers that include clickable NFT IDs linking to the Rarity Explorer.

### Key Features

#### 1. Category-Based Question Organization

**What:** Questions are organized into categories (Topics) displayed in a left sidebar.

**Categories:**
- 🏆 Top by Base Type
- 👑 Top with S-Tier Traits
- 🔥 Legendary Combos
- 🌍 Top by Background
- 📊 Collection Stats
- 🎓 Learn About Provenance
- 💎 Rarest Finds

**Reasoning:** Organizing questions by category helps users find relevant information quickly. Instead of scrolling through 50+ questions, they can focus on what interests them.

**User Value:** 
- Faster discovery of relevant information
- Better understanding of collection structure
- Educational pathway for new users

**Implementation:**
- Categories defined in `/assets/BigPulp/question tree/big_pulp_question_tree.json`
- Left sidebar displays category cards with icons and descriptions
- Clicking a category filters questions and shows category description

#### 2. Search Functionality

**What:** Search bar allows users to search questions and answers by keywords.

**Reasoning:** Some users know what they're looking for (e.g., "Crown" or "Straitjacket") and want to find it quickly without browsing categories.

**User Value:**
- Instant access to specific information
- Find questions containing specific trait names or concepts
- Search works across question text, short descriptions, and answer content

**Implementation:**
- Search input filters questions in real-time
- Disables category selection when active
- Shows "Search Results (N)" header
- Max 8 suggestions displayed at once

#### 3. Clickable NFT ID Links

**What:** Answers contain NFT IDs (e.g., "#3729") that are rendered as clickable links.

**Reasoning:** When BigPulp mentions specific NFTs, users want to see them immediately. Clickable links provide instant navigation to the Rarity Explorer.

**User Value:**
- Seamless navigation from answer to NFT details
- Visual confirmation of mentioned NFTs
- No need to manually search for NFT IDs

**Implementation:**
- NFT IDs detected via regex pattern: `/#(\d+)/g`
- Links styled with `.nft-id-link` class
- Click handler validates ID (1-4200 range)
- Dispatches `navigateToNft` event to Rarity Explorer
- Falls back to clipboard copy if Rarity Explorer not open

#### 4. Typing Animation

**What:** When a question is selected, BigPulp shows a typing indicator before displaying the answer.

**Reasoning:** Creates a conversational feel, making BigPulp feel more alive and responsive. The delay is proportional to answer length (400-800ms).

**User Value:**
- More engaging user experience
- Clear feedback that action was registered
- Builds anticipation for the answer

**Implementation:**
- `isTyping` state controls typing indicator
- Delay calculated: `Math.min(800, Math.max(400, question.answer.length * 15))`
- Typing indicator shows animated dots
- Plays "ding" sound when answer appears

#### 5. Dynamic BigPulp Character Images

**What:** BigPulp's character image changes randomly (30% chance per answer) from 9 different variants.

**Variants:**
- Big-Pulp_Crown.png
- Big-Pulp_Beret.png
- Big-Pulp_Fedora.png
- Big-Pulp_Wiz.png
- Big-Pulp_Clown.png
- Big-Pulp_Tin.png
- Big-Pulp_Cowboy.png
- Big-Pulp_Cap.png
- Big-Pulp_Propella.png

**Reasoning:** Visual variety keeps the interface fresh and engaging. Different "hats" represent different aspects of BigPulp's personality.

**User Value:**
- Visual interest and variety
- Personality expression
- Memorable interactions

**Implementation:**
- Random selection on window open
- 30% chance to change after each answer
- Image displayed in left sidebar and message bubbles

#### 6. Conversation History

**What:** All questions and answers are stored in a conversation array, creating a chat-like history.

**Reasoning:** Users can see their conversation history, making it feel like a real chat with BigPulp. Helps users remember what they've already asked.

**User Value:**
- Reference previous questions/answers
- Chat-like experience
- Easy to see what's been covered

**Implementation:**
- `conversation` state array stores all messages
- Each message has: `type` ('user'|'pulp'), `content`, `question`, `timestamp`, `nftIds`
- Auto-scrolls to bottom when new messages arrive
- Welcome message added on load

#### 7. Welcome Message

**What:** On window open, BigPulp greets the user with a welcome message.

**Message:** "Hey! I'm Big Pulp. Ask me anything about the collection. Want to know about the best NFTs, legendary combos, or collection stats? I've got the knowledge. 🍊"

**Reasoning:** Sets expectations and guides users on what they can ask. Creates a friendly first impression.

**User Value:**
- Clear introduction to functionality
- Sets conversational tone
- Guides user on what to ask

---

## Feature 2: BigPulp Commentary Window

**File:** `src/components/windows/BigPulpWindow.jsx`

### What It Is

A popup window that displays BigPulp's personalized commentary for a specific NFT. Shows BigPulp's character image with a speech bubble containing the commentary text.

### Key Features

#### 1. Three Commentary Versions (A, B, C)

**What:** Each NFT has three different commentary versions:
- **Version A (🔥 Hype Mode)**: Energetic, hype-focused commentary
- **Version B (😎 Street Smart)**: Casual, street-smart commentary
- **Version C (📖 Storyteller)**: Narrative, story-focused commentary

**Reasoning:** Different users prefer different tones. Some want hype, others want stories. Three versions provide variety and personality.

**User Value:**
- Multiple perspectives on the same NFT
- Find the commentary style that resonates
- Share different "takes" on social media

**Implementation:**
- Data loaded from `/data/bigPulpA.json`, `/data/bigPulpB.json`, `/data/bigPulpC.json`
- Version indicator shows current version label
- "Ask Big Pulp Again 🔄" button rotates through versions
- Version stored per NFT window (multiple windows can have different versions)

#### 2. Trait-Based Image Selection

**What:** BigPulp's character image is automatically selected based on the NFT's traits.

**Trait Priority (highest first):**
1. Crown → Big-Pulp_Crown.png
2. Military Beret → Big-Pulp_Beret.png
3. Wizard Hat / Wizard Drip → Big-Pulp_Wiz.png
4. Clown / Clown Nose → Big-Pulp_Clown.png
5. Fedora / Neckbeard → Big-Pulp_Fedora.png
6. Tin Foil Hat → Big-Pulp_Tin.png
7. Cowboy Hat → Big-Pulp_Cowboy.png
8. Propeller Hat → Big-Pulp_Propella.png
9. Cap / Beer Hat → Big-Pulp_Cap.png

**Reasoning:** Visual connection between the NFT and BigPulp creates a more personalized experience. If the NFT has a Crown, BigPulp wears a Crown too.

**User Value:**
- Visual connection to their NFT
- Personalized experience
- Memorable interactions

**Implementation:**
- `selectBigPulpImage(nftTraits)` function checks traits in priority order
- Falls back to random if no match
- Image updates when NFT changes

#### 3. Dynamic Font Sizing

**What:** Font size automatically adjusts to fit commentary text without scrollbars.

**Reasoning:** Commentary length varies significantly. Some NFTs have short commentary, others have long stories. Dynamic sizing ensures all text is visible without scrolling.

**User Value:**
- All text always visible
- No scrollbars needed
- Optimal reading experience

**Implementation:**
- Starts at 21px font size
- Checks for overflow using `scrollHeight > clientHeight`
- Reduces by 1px increments until text fits
- Minimum size: 10px
- Recalculates when commentary or image changes

#### 4. Share on X (Twitter)

**What:** "Share on 𝕏" button generates a shareable image and opens Twitter with pre-filled text.

**Reasoning:** Users want to share BigPulp's commentary on social media. A visual image is more engaging than plain text.

**User Value:**
- Easy social media sharing
- Visual content (more engaging)
- Pre-filled tweet text saves time

**Implementation:**
- Creates 800×1200 canvas
- Draws BigPulp character image
- Draws commentary text in speech bubble area (matches CSS positioning)
- Uses dynamic font size from display
- Adds NFT ID badge (bottom right)
- Downloads image as PNG
- Opens Twitter with pre-filled text: "Big Pulp's take on my Wojak Farmers Plot #[nftId] 🍊\n\nCheck yours at wojak.ink"

#### 5. Speech Bubble Layout

**What:** Commentary text is displayed in a speech bubble overlay on top of BigPulp's image.

**Layout:**
- Image: 800×1200px (aspect ratio maintained)
- Speech bubble: 9% left, 9.5% top, 82% width, 36% height
- Text: Justified alignment, Comic Sans MS font
- Padding: 8px

**Reasoning:** Speech bubble creates a conversational feel. Comic Sans MS adds personality and matches the meme aesthetic.

**User Value:**
- Clear visual hierarchy
- Easy to read
- Memorable design

**Implementation:**
- CSS positioning with percentages
- Text rendered in overlay div
- Font family: "Comic Sans MS", "Comic Sans", cursive, sans-serif
- Text-align: justify

#### 6. Version Rotation

**What:** "Ask Big Pulp Again 🔄" button cycles through the three commentary versions.

**Reasoning:** Users want to see different perspectives. Rotation provides variety without closing/reopening the window.

**User Value:**
- Quick access to all versions
- Compare different takes
- Find favorite version

**Implementation:**
- `onRotate` callback cycles through A → B → C → A
- Brief rotation animation (150ms)
- Version indicator updates
- Orange click sound plays

#### 7. Multiple Windows Support

**What:** Users can open multiple BigPulp windows for different NFTs simultaneously.

**Reasoning:** Users may want to compare commentary for multiple NFTs side-by-side.

**User Value:**
- Compare multiple NFTs
- Keep commentary visible while browsing
- Multi-tasking capability

**Implementation:**
- `openBigPulpWindows` state array tracks all open windows
- Each window has: `nftId`, `nftData`, `currentVersion`, `currentImage`
- Windows positioned with auto-stacking
- Independent version/image state per window

---

## Feature 3: BigPulp Intelligence Window

**File:** `src/components/windows/BigPulpIntelligenceWindow.jsx`

This is the most complex feature with multiple sub-features. It provides advanced exploration and analysis tools.

### Main Tabs/Categories

1. **Citrus Value** (Default First Tab)
2. **High Provenance** (Traits category)
3. **Top NFTs**
4. **Collection Stats**
5. **Combo Explorer** (Discovery category)
6. **Learn** (Education category)

---

### Sub-Feature 3.1: Citrus Value (Trait Sale Averages + Trait Values)

**What:** Two-tab system for analyzing trait values based on sales data.

#### Tab 1: Trait Sale Averages

**What:** Shows average sale prices for traits, sorted by premium (how much more they sell for vs. average).

**Reasoning:** Users want to know which traits are valuable. Sale averages provide real market data, not just rarity.

**User Value:**
- Understand which traits command premium prices
- Make informed buying/selling decisions
- Discover undervalued traits

**Features:**
- **Category Filter:** Filter by trait category (Base, Head, Clothes, Face, Mouth, Background)
- **Search:** Search for specific traits
- **Sort Options:**
  - Premium (default) - Traits with highest price premium
  - Sales Count - Most frequently sold traits
  - Recency - Recently sold traits
- **Table View:** Shows trait name, average sale price (XCH + USD), premium %, sales count
- **Click to View Details:** Clicking a trait opens detailed view

**Implementation:**
- Data computed from `salesIndexV1` (sales events)
- Aggregates sales by trait
- Calculates premium: `(trait_avg_price / collection_avg_price - 1) * 100`
- Cached in localStorage for performance
- Updates when sales data refreshes

#### Tab 2: Trait Values

**What:** Advanced trait value calculator using sales data, rarity, and market signals.

**Reasoning:** Sale averages are historical. Trait Values provide forward-looking estimates based on multiple factors.

**User Value:**
- Estimate NFT value based on traits
- Find undervalued NFTs
- Understand trait value drivers

**Features:**
- **Trait Inspector:** Hover or click traits to see detailed value breakdown
- **Value Components:**
  - Base value (rarity-based)
  - Sales premium (historical performance)
  - Market signals (current listings, demand)
  - Confidence score
- **Sort Options:**
  - Premium Desc/Asc
  - Confidence Desc
  - Sales Desc
  - Recency Desc
  - Alphabetical
- **CTA Modes:** Filter by value signals (Sleepy, Delusion, Hot, Undervalued)
- **Detail Tabs:** Overview, Listed NFTs, Sales History

**Implementation:**
- Uses `valueModelV1` or `valueModelV2` (pre-computed value models)
- Calculates trait values from sales index
- Combines rarity, sales history, and market data
- Updates in real-time as sales data refreshes

---

### Sub-Feature 3.2: High Provenance Explorer

**What:** Explorer for S-tier traits (High Provenance traits) that have cultural significance beyond rarity.

**Reasoning:** Some traits are valuable not because they're rare, but because the community values them. Crown, Neckbeard, MOG Glasses, etc. have cultural provenance.

**User Value:**
- Discover culturally significant traits
- Understand provenance vs. rarity
- Find NFTs with high provenance

**Features:**
- **Category Selection:** Choose trait category (Head, Clothes, Face, Mouth)
- **Trait Selection:** Choose specific High Provenance trait
- **NFT List:** Shows all NFTs with that trait
- **Quick Stats:** Count, average rank, top holders
- **NFT Previews:** Clickable NFT cards with images
- **MintGarden Links:** Direct links to MintGarden listings (MG button)

**High Provenance Traits:**
- **Head:** Crown, Military Beret, Wizard Hat, Fedora, Clown, Ronin Helmet, Tin Foil Hat, Devil Horns
- **Clothes:** Straitjacket, Goose Suit, Wizard Drip, Bepe Army, Ronin, El Presidente, Pepe Suit, Pickle Suit
- **Face:** MOG Glasses, Cyber Shades, Wizard Glasses, VR Headset, Fake It Mask
- **Mouth:** Neckbeard (only S-tier mouth trait)

**Implementation:**
- Trait list defined in component
- Filters NFTs from analysis data
- Displays in grid with preview images
- Links to Rarity Explorer on click

---

### Sub-Feature 3.3: Top NFTs Explorer

**What:** Browse the highest-ranked NFTs in the collection.

**Reasoning:** Users want to see the "best" NFTs. Top NFTs provides curated lists by base type, S-tier traits, backgrounds, etc.

**User Value:**
- Discover elite NFTs
- Understand what makes NFTs valuable
- Find inspiration for collection goals

**Features:**
- **Category Selection:** Top by Base, Top with S-Tier Traits, Top by Background
- **NFT Grid:** Displays top NFTs with preview images
- **Quick Stats:** Rank, base type, S-tier count
- **BigPulp Button:** Click to get BigPulp's commentary for that NFT
- **Rarity Explorer Link:** Click NFT to view in Rarity Explorer

**Implementation:**
- Uses `all_nft_analysis.json` for ranking data
- Filters and sorts by category
- Displays top 10-20 NFTs per category
- Lazy loads analysis data when category selected

---

### Sub-Feature 3.4: Collection Stats

**What:** Statistical overview of the collection.

**Reasoning:** Users want to understand collection composition, rarity distribution, and key metrics.

**User Value:**
- Understand collection structure
- Learn rarity distribution
- Get key metrics at a glance

**Features:**
- **Total Supply:** 4,200 NFTs
- **Base Type Distribution:** Count and percentage for each base
- **S-Tier Trait Counts:** How many NFTs have each High Provenance trait
- **Legendary Combo Counts:** Named combo frequencies
- **Rarity Tiers:** Distribution across tiers (Legendary, Epic, Rare, Common)

**Implementation:**
- Computed from analysis data
- Static questions provide pre-written stats
- Can be expanded with dynamic calculations

---

### Sub-Feature 3.5: Combo Explorer

**What:** Advanced tool for discovering rare trait combinations (pairs, families, combos).

**Reasoning:** Some trait combinations are extremely rare and valuable. Users want to find these combos and see all NFTs that have them.

**User Value:**
- Discover rare combinations
- Find "family" NFTs (same combo)
- Understand combo rarity
- Bookmark favorite combos

**Features:**

#### 5.1. Category Selection

**What:** Select two trait categories to explore combinations between them.

**Categories:** Base, Head, Clothes, Face, Mouth, Background

**Reasoning:** Users want to explore specific category pairs (e.g., Head + Clothes) to find rare combos.

**User Value:**
- Focused exploration
- Discover category-specific patterns
- Find rare cross-category combos

#### 5.2. Primary & Drilldown Selection

**What:** 
- **Primary Category:** First category (e.g., "Head")
- **Primary Group:** Specific trait in primary category (e.g., "Crown")
- **Drilldown Category:** Second category (e.g., "Clothes")
- **Drilldown Group:** Specific trait in drilldown (e.g., "Straitjacket")

**Reasoning:** Two-level selection allows users to drill down from broad to specific. First pick a trait, then see what it pairs with.

**User Value:**
- Progressive discovery
- Understand trait relationships
- Find specific rare pairs

#### 5.3. Pair Results Display

**What:** Shows all trait pairs (combinations) between selected categories, sorted by rarity.

**Display:**
- **Pair Label:** e.g., "Crown + Straitjacket"
- **Global Count:** How many NFTs have this combo in entire collection
- **In-Group Count:** How many NFTs have this combo within the selected primary group
- **BigPulp Quip:** Fun commentary about the pair rarity
- **Family View Button:** Click to see all NFTs with this combo

**Reasoning:** Users want to see rarity at a glance. Global vs. in-group counts show different perspectives.

**User Value:**
- Understand combo rarity
- Compare global vs. local rarity
- Quick access to family view

#### 5.4. Family View

**What:** Shows all NFTs that have a specific trait combination.

**Display:**
- **NFT List:** All NFT IDs with the combo
- **NFT Grid:** Visual preview grid with images
- **Random Family Member Button:** Quick navigation to random NFT
- **Back Button:** Return to pair list

**Reasoning:** Once users find a rare combo, they want to see all NFTs that have it. Family view provides complete visibility.

**User Value:**
- See all NFTs with a combo
- Visual preview of family
- Easy navigation to specific NFTs

#### 5.5. Hunter Mode

**What:** Filter to show only extremely rare pairs (≤5 or ≤3 NFTs).

**Options:**
- Off (show all pairs)
- ≤5 (show pairs with 5 or fewer NFTs)
- ≤3 (show pairs with 3 or fewer NFTs)

**Reasoning:** Some users only care about ultra-rare combos. Hunter mode filters out common pairs.

**User Value:**
- Focus on ultra-rare finds
- Save time browsing
- Discover hidden gems

**Implementation:**
- Stored in localStorage: `bigpulp_hunter_mode_v1`
- Filters pair results by count
- Persists across sessions

#### 5.6. Pairing Favorites / Bookmarks

**What:** Bookmark favorite trait pairs for quick access.

**Reasoning:** Users discover rare combos they want to track. Bookmarks provide quick access without re-searching.

**User Value:**
- Track interesting combos
- Quick access to favorites
- Build personal collection of rare finds

**Implementation:**
- Stored in localStorage: `bigpulp_pairing_favorites_v1`
- Array of `pair_key` strings
- "Show Only Bookmarks" filter
- Star icon indicates bookmarked pairs

#### 5.7. MintGarden Links (MG Button)

**What:** Each NFT in family view has an "MG" button that opens MintGarden listing page.

**Reasoning:** Users want to check listings, prices, and availability. Direct links save time.

**User Value:**
- Quick access to marketplace
- Check prices and availability
- One-click navigation

**Implementation:**
- Uses `mintgardenLauncherMap` to get launcher_bech32 for each NFT ID
- Opens: `https://mintgarden.io/nfts/{launcher_bech32}`
- Falls back gracefully if map unavailable

#### 5.8. Sold Status Validation

**What:** Validates if listed NFTs are actually sold by checking sales data.

**Reasoning:** Some listings may be stale (already sold). Validation prevents showing incorrect data.

**User Value:**
- Accurate listing information
- Avoid wasted clicks on sold NFTs
- Real-time status updates

**Implementation:**
- Checks `salesIndexV1` for recent sales
- Compares sale timestamp to listing creation date
- Marks as "sold" if sale occurred after listing
- Updates in background as data refreshes

#### 5.9. Combo Index System

**What:** Optimized data structure for fast combo lookups.

**Files:**
- `/assets/BigPulp/combo_index_v1/inverted_index.json` - Fast trait → NFT lookups
- `/assets/BigPulp/combo_index_v1/pair_counts.json` - Combo frequency counts
- `/assets/BigPulp/combo_index_v1/partner_index.json` - Trait pairing relationships
- `/assets/BigPulp/combo_index_v1/trait_catalog.json` - Trait metadata
- `/assets/BigPulp/combo_index_v1/traits_by_nft_XXXX_YYYY.json` - Sharded NFT trait data (42 shards)

**Reasoning:** With 4,200 NFTs and thousands of trait combinations, efficient data structures are essential for performance.

**User Value:**
- Fast loading times
- Smooth interactions
- Scalable to large collections

**Implementation:**
- Inverted index: `trait_key → [nft_ids]`
- Pair counts: `pair_key → count`
- Partner index: `trait_key → [partner_traits]`
- Sharded by NFT ID ranges (100 NFTs per shard)
- Lazy loads shards as needed

---

### Sub-Feature 3.6: Learn Tab

**What:** Educational accordion with 10+ Q&A pairs about provenance, S-tier traits, legendary combos, and collection lore.

**Reasoning:** New users need education about provenance, rarity vs. culture, and collection history. Learn tab provides structured learning.

**User Value:**
- Understand collection concepts
- Learn about provenance
- Discover collection lore
- Educational pathway for beginners

**Features:**
- **Accordion UI:** Click question to expand answer
- **10+ Questions:** Pre-written educational content
- **Topics Covered:**
  - What is provenance?
  - What are S-tier traits?
  - What are legendary combos?
  - What makes Monkey Zoo/Papa Tang special?
  - Collection history and culture

**Implementation:**
- Questions defined in `question_tree_v2.json` with `category: 'learn'`
- Accordion state: `openLearnQuestionId` tracks which question is open
- Auto-closes when leaving Learn tab
- Static content (no dynamic calculations)

---

### Sub-Feature 3.7: Context Mode (NFT-Specific Analysis)

**What:** When an NFT is selected in Rarity Explorer, BigPulp Intelligence shows NFT-specific analysis.

**Reasoning:** Users want to understand their specific NFT. Context mode provides personalized insights.

**User Value:**
- Understand their NFT's value
- Get personalized commentary
- See NFT-specific stats
- Ask NFT-specific questions

**Features:**

#### 7.1. Commentary Card

**What:** Displays BigPulp's commentary for the selected NFT.

**Reasoning:** Users want to know what makes their NFT special. Commentary provides narrative context.

**User Value:**
- Understand NFT's story
- Get personalized take
- Share commentary on social media

**Implementation:**
- Loads from `all_nft_sentences.json`
- Supports multiple variants (rotates with "Another Take" button)
- Falls back to `analysis.story_hook` or `analysis.highlight` if no sentences

#### 7.2. Smart Questions

**What:** Dynamic questions specific to the selected NFT.

**Examples:**
- "What makes this NFT special?"
- "Show me similar NFTs"
- "What's this NFT's value?"

**Reasoning:** NFT-specific questions provide deeper insights than generic collection questions.

**User Value:**
- Deeper understanding of their NFT
- Discover related NFTs
- Get value estimates

**Implementation:**
- Questions from `question_tree_v2.json` with `requires_context: true`
- Filtered to show only relevant questions
- Answers computed dynamically from NFT analysis

#### 7.3. Quick Stats

**What:** Four stat boxes showing key metrics:
- Overall Rank
- Base Rank (rank within base type)
- High Provenance Count (S-tier traits)
- 1-of-1 Count (unique combos)

**Reasoning:** Quick visual summary helps users understand their NFT's position in the collection.

**User Value:**
- Quick metric overview
- Understand rarity position
- Compare to collection averages

**Implementation:**
- Data from `all_nft_analysis.json`
- Computed on-the-fly from analysis object
- Updates when NFT selection changes

#### 7.4. Highlight Card

**What:** Shows the NFT's highlight (key selling point or unique feature).

**Reasoning:** Each NFT has a highlight that makes it special. Displaying it prominently helps users understand value.

**User Value:**
- Understand key selling points
- Quick value proposition
- Shareable information

**Implementation:**
- From `analysis.highlight` field
- Falls back to "No highlight available" if missing

---

### Sub-Feature 3.8: Global Market Map

**What:** Visual heatmap/histogram of the entire collection's market (listings, prices, floor).

**Reasoning:** Users want to see the big picture of the market. Visual representation makes patterns obvious.

**User Value:**
- Understand market distribution
- See price patterns
- Identify market trends
- Find floor prices by category

**Features:**
- **Heat Map Mode:** Color-coded grid showing price distribution
- **Histogram Mode:** Bar chart showing price distribution
- **Scale Options:** Floor price or XCH amount
- **Tooltips:** Hover to see detailed stats for each cell
- **Market Stats:** Total listed, floor price, average price

**Implementation:**
- Uses `mintgardenOffersIndex` for listing data
- Groups NFTs by rank ranges or trait categories
- Calculates floor/average prices per group
- Renders as SVG or canvas visualization

---

### Sub-Feature 3.9: Deals Scanner

**What:** Finds NFTs that are listed below their estimated fair value.

**Reasoning:** Users want to find good deals. Deals Scanner identifies undervalued NFTs based on trait values.

**User Value:**
- Find undervalued NFTs
- Make informed purchases
- Discover hidden value

**Features:**
- **Fair Value Calculation:** Based on trait values from Citrus Value
- **Discount %:** Shows how much below fair value
- **Sort Options:** By discount %, by fair value, by listing price
- **NFT Previews:** Clickable cards with images
- **MintGarden Links:** Direct links to listings

**Implementation:**
- Computes fair value from trait values
- Compares to current listing prices
- Filters to show only NFTs with discount > threshold
- Updates as offers data refreshes

---

## Data Sources & APIs

### Static Data Files

All data files are in `/public/assets/BigPulp/`:

1. **`manifest.json`** - Schema version and required files list
2. **`question_tree_v2.json`** - Question tree structure (categories, static questions, dynamic questions)
3. **`all_nft_analysis.json`** - Analysis data for all 4,200 NFTs (rank, tier, highlights, stats)
4. **`all_nft_sentences.json`** - Commentary sentences/variants for each NFT
5. **`trait_insights.json`** - Trait-specific insights and metadata
6. **`combo_database.json`** - Combo frequency and relationship data
7. **`rare_pairings_index_v1_part*.json`** - Rare pairing index (sharded across multiple files)
8. **`combo_index_v1/`** - Optimized combo lookup indexes (inverted_index, pair_counts, partner_index, trait_catalog, traits_by_nft shards)
9. **`mintgarden_launcher_map_v1.json`** - Mapping from NFT ID to MintGarden launcher_bech32
10. **`mintgarden_offers_index_v1.json`** - Pre-computed offers/listings index
11. **`mintgarden_sales_index_v1.json`** - Pre-computed sales history index
12. **`value_model_v1.json`** / **`value_model_v2.json`** - Pre-computed trait value models

### Commentary Data Files

In `/public/data/`:
- **`bigPulpA.json`** - Version A (Hype Mode) commentary
- **`bigPulpB.json`** - Version B (Street Smart) commentary
- **`bigPulpC.json`** - Version C (Storyteller) commentary

### Live APIs

1. **MintGarden API** (`src/services/mintgardenApi.js`)
   - Fetches NFT details by launcher_bech32
   - Gets NFT thumbnail URLs
   - Used for validation and image loading

2. **Treasury API** (`src/services/treasuryApi.js`)
   - Fetches XCH/USD price from CoinGecko
   - Used for USD conversions in value displays

3. **Sales Data Sync** (`src/services/salesDataSync.js`)
   - Syncs sales data from backend
   - Updates sales index in real-time

4. **Offers APIs** (3-tier system):
   - **MintGarden Offers** (`src/services/mintgardenOffersApi.js`)
   - **Space Scan Offers** (`src/services/spacescanOffersApi.js`)
   - **Dexie Offers** (`src/services/dexieOffersApi.js`)
   - Merged into unified offers map

### Data Caching

**Module-Level Cache:** `DataCache` object in `BigPulpIntelligenceWindow.jsx`
- Persists across component unmounts
- Shared across all BigPulp windows
- Lazy loads data on demand

**localStorage Cache:**
- `wojak_ink_trait_sale_averages_cache` - Trait sale averages
- `wojak_ink_spacescan_offers_cache` - Space Scan offers
- `bigpulp_hunter_mode_v1` - Hunter mode preference
- `bigpulp_pairing_favorites_v1` - Bookmarked pairs
- `bigpulp_combo_bookmarks_v1` - Combo bookmarks

---

## Code Locations

### Main Components

1. **Question Tree Window**
   - Component: `src/components/windows/BigPulpQuestionTreeWindow.jsx`
   - Styles: `src/components/windows/BigPulpQuestionTreeWindow.css`
   - Data: `/public/assets/BigPulp/question tree/big_pulp_question_tree.json`

2. **BigPulp Commentary Window**
   - Component: `src/components/windows/BigPulpWindow.jsx`
   - Styles: `src/components/windows/BigPulpWindow.css`
   - Commentary Data: `/public/data/bigPulpA.json`, `bigPulpB.json`, `bigPulpC.json`
   - Images: `/public/images/BigPulp/*.png`

3. **BigPulp Intelligence Window**
   - Component: `src/components/windows/BigPulpIntelligenceWindow.jsx`
   - Styles: `src/components/windows/BigPulpIntelligenceWindow.css`
   - Data: `/public/assets/BigPulp/*.json`

### Services & Utilities

1. **MintGarden API**
   - File: `src/services/mintgardenApi.js`
   - Functions: `fetchNFTDetails()`, `getNFTThumbnailUrl()`

2. **Treasury API**
   - File: `src/services/treasuryApi.js`
   - Functions: `fetchXCHPrice()`, `fetchTibetSwapPairs()`, `fetchWalletBalances()`

3. **Sales Data Sync**
   - File: `src/services/salesDataSync.js`
   - Functions: `salesDataSync()`

4. **Offers APIs**
   - Files: 
     - `src/services/mintgardenOffersApi.js`
     - `src/services/spacescanOffersApi.js`
     - `src/services/dexieOffersApi.js`
   - Functions: `fetchAllActiveOffers()`, `buildOffersMap()`, `extractPriceFromOffer()`

5. **Trait Value Calculator**
   - File: `src/utils/traitValueCalculator.js`
   - Functions: `calculateTraitValue()`

6. **Trait Sales Mapper**
   - File: `src/utils/traitSalesMapper.js`
   - Functions: `buildTraitSalesMap()`

### Integration Points

1. **Rarity Explorer Integration**
   - File: `src/components/WojakRarityExplorer.jsx`
   - Button: "Hang with Big Pulp 🍊" (lines 1037, 1195)
   - Handler: `handleBigPulpQuestionTreeClick()` opens Question Tree Window
   - Handler: `handleBigPulpClick()` opens BigPulp Commentary Window for specific NFT

2. **Window Context**
   - File: `src/contexts/WindowContext.jsx`
   - Used for: Window management, z-index stacking, navigation events

3. **Toast Context**
   - File: `src/contexts/ToastContext.jsx`
   - Used for: User notifications (errors, success messages)

---

## Implementation Details

### Data Loading Strategy

**Lazy Loading:** Data is loaded on-demand, not all at once.

1. **Core Data (Always Loaded):**
   - `manifest.json` - Required for validation
   - `question_tree_v2.json` - Required for Question Tree Window

2. **Context Data (Loaded When Needed):**
   - `all_nft_analysis.json` - Loaded when Top NFTs or Context Mode accessed
   - `all_nft_sentences.json` - Loaded when Commentary needed
   - `combo_database.json` - Loaded when Combo Explorer accessed

3. **Advanced Data (Loaded On-Demand):**
   - `rare_pairings_index_v1_part*.json` - Loaded when Rare Pairings Explorer opened
   - `combo_index_v1/` shards - Loaded as needed (lazy shard loading)
   - `value_model_v1.json` / `v2.json` - Loaded when Citrus Value accessed
   - `sales_index_v1.json` - Loaded when trait values computed

**Caching Strategy:**
- Module-level `DataCache` object persists across unmounts
- localStorage caches expensive computations (trait sale averages, offers)
- Cache validation checks structure and timestamps
- Automatic cache invalidation on data updates

### Performance Optimizations

1. **Sharded Data:** Combo index split into 42 shards (100 NFTs each) for faster loading
2. **Memoization:** React `useMemo` for expensive calculations
3. **Debouncing:** Search and filter inputs debounced to prevent excessive re-renders
4. **Intersection Observer:** Lazy load NFT preview images when scrolled into view
5. **Request Queuing:** Offers API requests queued to prevent rate limiting
6. **Background Updates:** Sales/offers data updates in background without blocking UI

### Error Handling

1. **Graceful Degradation:** Features work with partial data (shows "Loading..." or "Data unavailable")
2. **Fallback Values:** XCH/USD price has 4-tier fallback (Treasury API → Value Model → Offers Index → Hardcoded)
3. **User-Friendly Messages:** Errors shown as toast notifications with actionable guidance
4. **Retry Logic:** API calls use `fetchWithRetry` utility with exponential backoff

### State Management

1. **Local State:** React `useState` for component-specific state
2. **Shared Cache:** Module-level `DataCache` for cross-component data sharing
3. **localStorage:** User preferences and computed caches
4. **Window Context:** Window management and navigation events
5. **Toast Context:** User notifications

---

## User Value Summary

### Why Users Want This Feature

1. **Discovery:** Find rare NFTs, combos, and traits they didn't know existed
2. **Education:** Learn about provenance, rarity, and collection culture
3. **Value Assessment:** Understand what their NFTs are worth and why
4. **Social Sharing:** Share BigPulp's commentary and insights on social media
5. **Decision Making:** Make informed buying/selling decisions based on data
6. **Entertainment:** Enjoy BigPulp's personality and engaging commentary
7. **Efficiency:** Save time by having answers pre-written instead of researching manually

### Key Benefits

- **Time Savings:** Pre-written answers vs. manual research
- **Accuracy:** Data-driven insights vs. guesswork
- **Engagement:** Fun, personality-driven interface vs. dry data tables
- **Accessibility:** Beginner-friendly explanations vs. technical jargon
- **Completeness:** Comprehensive coverage of collection vs. partial information
- **Real-Time:** Live market data vs. stale information
- **Visual:** Images, previews, and visualizations vs. text-only

---

## Reusable Code Patterns

### API Fetching Pattern

```javascript
// Pattern used across all BigPulp data loading
const loadData = async () => {
  if (DataCache.loaded.dataName) return DataCache.dataName
  if (DataCache.loadingPromises.dataName) return DataCache.loadingPromises.dataName
  
  DataCache.loadingPromises.dataName = (async () => {
    try {
      const response = await fetch('/assets/BigPulp/dataFile.json')
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`)
      const data = await response.json()
      DataCache.dataName = data
      DataCache.loaded.dataName = true
      DataCache.loadingPromises.dataName = null
      return data
    } catch (err) {
      DataCache.error = err
      DataCache.loadingPromises.dataName = null
      throw err
    }
  })()
  
  return DataCache.loadingPromises.dataName
}
```

### NFT ID Navigation Pattern

```javascript
// Pattern for navigating to NFT in Rarity Explorer
const handleNftIdClick = (nftId) => {
  const rarityExplorerWindow = getWindow('rarity-explorer')
  if (rarityExplorerWindow) {
    window.dispatchEvent(new CustomEvent('navigateToNft', { 
      detail: { nftId: String(nftId) }
    }))
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(nftId)
  }
}
```

### MintGarden Link Pattern

```javascript
// Pattern for generating MintGarden links
const getMintGardenUrl = (nftId) => {
  const launcherBech32 = mintgardenLauncherMap?.[nftId]
  if (launcherBech32) {
    return `https://mintgarden.io/nfts/${launcherBech32}`
  }
  return null
}
```

### XCH/USD Conversion Pattern

```javascript
// Pattern for converting XCH to USD with fallbacks
const xchUsdFallback = useMemo(() => {
  // Priority: 1) Treasury API, 2) Value Model, 3) Offers Index, 4) Hardcoded
  if (xchPriceUSD != null && xchPriceUSD > 0) return xchPriceUSD
  if (valueModel?.market?.xch_usd_at_build) return valueModel.market.xch_usd_at_build
  if (offersIndex?.xch_usd_at_build) return offersIndex.xch_usd_at_build
  return 4.7 // Hardcoded fallback
}, [xchPriceUSD, valueModel, offersIndex])
```

---

## Summary

"Hang with BigPulp" is a comprehensive NFT intelligence system that provides:

1. **Question Tree Window** - Interactive Q&A with clickable NFT links
2. **BigPulp Commentary Window** - Personalized commentary with 3 versions and social sharing
3. **BigPulp Intelligence Window** - Advanced tools:
   - Citrus Value (trait sale averages + trait values)
   - High Provenance Explorer
   - Top NFTs Explorer
   - Collection Stats
   - Combo Explorer (rare pairings, families, bookmarks)
   - Learn Tab (educational content)
   - Context Mode (NFT-specific analysis)
   - Global Market Map
   - Deals Scanner

All features are designed to help users discover, understand, and value their NFTs through data-driven insights, engaging commentary, and intuitive exploration tools.

The system is built with performance in mind (lazy loading, caching, sharding) and provides a beginner-friendly interface while offering advanced features for power users.

