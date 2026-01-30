# NFT 2048 Merge Game - Implementation Guide

## Overview

This document provides comprehensive instructions for Claude CLI to create an NFT-themed 2048 game where **actual Wojak NFTs** represent the tiles instead of numbers.

**Core Concept:**
- Each tile shows a **real NFT image** from the Wojak collection
- NFTs are grouped by **badge categories** (rarity tiers)
- Merging two tiles of the same badge → produces an NFT from the next rarer badge
- Ultimate goal: Reach **Namekian** (only 7 NFTs exist!) 💚

---

## PART 1: TILE MAPPING (Final)

| Tile Value | Badge | NFT Count | Emoji | Rarity |
|------------|-------|-----------|-------|--------|
| **2** | Phunky | 176 | 🤡 | Common |
| **4** | High Council | 172 | 🧙 | Common |
| **8** | Bepe Army | 171 | 🐸 | Common |
| **16** | Royal Club | 164 | 👑 | Uncommon |
| **32** | Pirate | 115 | 🏴‍☠️ | Uncommon |
| **64** | Super Saiyan | 99 | ⚡ | Rare |
| **128** | Hellspawn | 91 | 😈 | Rare |
| **256** | Ronin | 80 | 🥷 | Epic |
| **512** | Neckbeard | 57 | 🧔 | Epic |
| **1024** | Honk Gang | 31 | 🪿 | Legendary |
| **2048** | Namekian | 7 | 💚 | ULTRA LEGENDARY |

---

## PART 2: GAME MECHANICS

### How It Works

1. **Start**: Two random tiles spawn (Phunky NFTs - value 2)
2. **Swipe**: All tiles slide in that direction
3. **Merge**: Two tiles of same badge combine → Next rarer badge appears
4. **Goal**: Keep merging until you reach a **Namekian NFT** (2048)

### Merge Progression

```
🤡 Phunky + 🤡 Phunky = 🧙 High Council
🧙 High Council + 🧙 High Council = 🐸 Bepe Army
🐸 Bepe Army + 🐸 Bepe Army = 👑 Royal Club
👑 Royal Club + 👑 Royal Club = 🏴‍☠️ Pirate
🏴‍☠️ Pirate + 🏴‍☠️ Pirate = ⚡ Super Saiyan
⚡ Super Saiyan + ⚡ Super Saiyan = 😈 Hellspawn
😈 Hellspawn + 😈 Hellspawn = 🥷 Ronin
🥷 Ronin + 🥷 Ronin = 🧔 Neckbeard
🧔 Neckbeard + 🧔 Neckbeard = 🪿 Honk Gang
🪿 Honk Gang + 🪿 Honk Gang = 💚 NAMEKIAN (WIN!)
```

### Random NFT Selection

When a tile is created or merged:
1. Look up the badge category for that tile value
2. Get the list of NFT IDs that have that badge
3. Randomly select one NFT ID
4. Display that NFT's image

---

## PART 3: DATA FILES

### Badge System JSON

**File**: `/public/assets/Badges/badge_system.json`

Contains badge definitions with:
- Badge name, emoji, count
- Primary traits (required)
- Secondary traits (optional)
- Lore/description

### NFT Badge Mapping JSON

**File**: `/public/assets/Badges/nft_badge_mapping.json`

Contains mapping of every NFT to its badges (large file, ~408KB).

### Pre-Extracted Badge NFTs (READY TO USE!)

**File**: `src/games/NFT2048/badgeNfts.json` ✅ **ALREADY GENERATED**

Contains the exact NFT IDs for each of the 11 game badges:
```json
{
  "Phunky": [24, 35, 71, 94, 133, ...],      // 176 NFTs
  "High Council": [9, 10, 12, 13, 28, ...],  // 172 NFTs
  "Bepe Army": [4, 11, 31, 173, 175, ...],   // 171 NFTs
  "Royal Club": [1, 15, 30, 86, 105, ...],   // 164 NFTs
  "Pirate": [7, 65, 68, 69, 70, ...],        // 115 NFTs
  "Super Saiyan": [58, 96, 97, 370, ...],    // 99 NFTs
  "Hellspawn": [15, 33, 36, 87, 106, ...],   // 91 NFTs
  "Ronin": [21, 83, 84, 85, 393, ...],       // 80 NFTs
  "Neckbeard": [1, 2, 8, 17, 27, ...],       // 57 NFTs
  "Honk Gang": [14, 53, 200, 206, ...],      // 31 NFTs
  "Namekian": [3703, 3704, 3705, 3706, 3707, 3728, 3729]  // 7 NFTs
}
```

### NFT Images

**Location**: NFT images should be accessible via URL pattern:
- Format: `https://wojak.ink/nft/{id}.png` or similar
- Or local: `/public/assets/nfts/{id}.png`

---

## PART 4: IMPLEMENTATION

### Step 1: Import Badge-to-NFT Lookup

Simply import the pre-generated JSON file:

```javascript
// Import the pre-extracted badge NFT mapping
import BADGE_NFTS from './badgeNfts.json';

// BADGE_NFTS is ready to use:
// {
//   "Phunky": [24, 35, 71, ...],      // 176 NFTs
//   "High Council": [9, 10, 12, ...], // 172 NFTs
//   ... etc
// }
```

### Step 2: Tile Value to Badge Mapping

```javascript
const TILE_BADGES = {
  2: "Phunky",
  4: "High Council",
  8: "Bepe Army",
  16: "Royal Club",
  32: "Pirate",
  64: "Super Saiyan",
  128: "Hellspawn",
  256: "Ronin",
  512: "Neckbeard",
  1024: "Honk Gang",
  2048: "Namekian",
};

const BADGE_EMOJIS = {
  "Phunky": "🤡",
  "High Council": "🧙",
  "Bepe Army": "🐸",
  "Royal Club": "👑",
  "Pirate": "🏴‍☠️",
  "Super Saiyan": "⚡",
  "Hellspawn": "😈",
  "Ronin": "🥷",
  "Neckbeard": "🧔",
  "Honk Gang": "🪿",
  "Namekian": "💚",
};
```

### Step 3: Get Random NFT for Tile

```javascript
function getRandomNftForTile(tileValue) {
  const badge = TILE_BADGES[tileValue];
  const nftIds = BADGE_NFTS[badge];
  const randomId = nftIds[Math.floor(Math.random() * nftIds.length)];
  return {
    id: randomId,
    badge: badge,
    emoji: BADGE_EMOJIS[badge],
    imageUrl: `/assets/nfts/${randomId}.png`, // Adjust path as needed
  };
}
```

### Step 4: Modified Tile Structure

```javascript
// Each tile now stores:
const tile = {
  id: tileId++,
  row: row,
  col: col,
  value: 2,           // The tile value (2, 4, 8, etc.)
  nftId: 1234,        // The specific NFT ID being displayed
  badge: "Phunky",    // The badge category
  emoji: "🤡",        // Badge emoji
  element: document.createElement('div'),
};
```

### Step 5: Render Tile with NFT Image

```javascript
function createTile(row, col, value, isNew = false) {
  const nftData = getRandomNftForTile(value);

  const tile = {
    id: tileId++,
    row,
    col,
    value,
    nftId: nftData.id,
    badge: nftData.badge,
    emoji: nftData.emoji,
    element: document.createElement('div')
  };

  const pos = getPosition(row, col);

  tile.element.className = `tile tile-${value}`;
  tile.element.style.width = `${CELL_SIZE}px`;
  tile.element.style.height = `${CELL_SIZE}px`;
  tile.element.style.top = pos.top + 'px';
  tile.element.style.left = pos.left + 'px';

  // NFT Image
  const img = document.createElement('img');
  img.src = nftData.imageUrl;
  img.alt = `${nftData.badge} #${nftData.id}`;
  img.className = 'tile-nft-image';
  img.draggable = false;
  tile.element.appendChild(img);

  // Badge emoji overlay (optional)
  const badgeOverlay = document.createElement('span');
  badgeOverlay.className = 'tile-badge';
  badgeOverlay.textContent = nftData.emoji;
  tile.element.appendChild(badgeOverlay);

  if (isNew) {
    tile.element.classList.add('tile-new');
  }

  document.getElementById('tiles').appendChild(tile.element);
  tiles.push(tile);
  return tile;
}
```

### Step 6: CSS for NFT Tiles

```css
.tile {
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  transition: top 0.15s ease-in-out, left 0.15s ease-in-out;
  overflow: hidden;
  background: #1a1a2e;
  border: 2px solid rgba(255, 255, 255, 0.1);
}

.tile-nft-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  user-select: none;
}

.tile-badge {
  position: absolute;
  bottom: 4px;
  right: 4px;
  font-size: 16px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 4px;
  padding: 2px 4px;
}

/* Rarity glow effects */
.tile-2, .tile-4, .tile-8 {
  border-color: rgba(255, 255, 255, 0.2);
}

.tile-16, .tile-32 {
  border-color: #4ade80;
  box-shadow: 0 0 10px rgba(74, 222, 128, 0.3);
}

.tile-64, .tile-128 {
  border-color: #f59e0b;
  box-shadow: 0 0 15px rgba(245, 158, 11, 0.4);
}

.tile-256, .tile-512 {
  border-color: #8b5cf6;
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
}

.tile-1024 {
  border-color: #ec4899;
  box-shadow: 0 0 25px rgba(236, 72, 153, 0.6);
}

.tile-2048 {
  border-color: #10b981;
  box-shadow: 0 0 30px rgba(16, 185, 129, 0.8),
              0 0 60px rgba(16, 185, 129, 0.4);
  animation: namekianGlow 2s ease-in-out infinite;
}

@keyframes namekianGlow {
  0%, 100% { box-shadow: 0 0 30px rgba(16, 185, 129, 0.8); }
  50% { box-shadow: 0 0 50px rgba(16, 185, 129, 1), 0 0 80px rgba(16, 185, 129, 0.6); }
}
```

---

## PART 5: BASE CODE (Bram Cohen's 2048)

### Source Repository

**URL**: https://github.com/bramcohen/2048
**License**: Public Domain
**File**: `2048-2x3.html` (standalone, ~1010 lines)

### Key Modifications Needed

1. **Grid Size**: Change from 2x3 to 4x4
   ```javascript
   const ROWS = 4;
   const COLS = 4;
   const WIN_VALUE = 2048;
   ```

2. **Remove Training Features**: Delete win probability, hints, accuracy tracking

3. **Add NFT Tile System**: Implement the badge-to-NFT mapping

4. **Add Score System**: Track score based on merged values

5. **Tile Positioning**: Uses absolute positioning (this works correctly!)
   ```javascript
   function getPosition(row, col) {
     return {
       top: PADDING + row * (CELL_SIZE + GAP),
       left: PADDING + col * (CELL_SIZE + GAP)
     };
   }
   ```

---

## PART 6: FILES TO CREATE

| File | Purpose | Status |
|------|---------|--------|
| `src/games/NFT2048/NFT2048Game.tsx` | Main React game component | ❌ To create |
| `src/games/NFT2048/NFT2048Game.css` | Styles with NFT/rarity theming | ❌ To create |
| `src/games/NFT2048/badgeNfts.json` | Pre-extracted badge → NFT ID mapping | ✅ **DONE** |
| `src/config/games.ts` | Add game entry (modify existing) | ❌ To modify |

---

## PART 7: GAME CONFIG ENTRY

```typescript
// In src/config/games.ts

{
  id: 'nft-2048',
  name: 'NFT Merge',
  emoji: '💚',
  description: 'Merge Wojak NFTs to reach the legendary Namekian!',
  shortDescription: 'Merge NFTs from Phunky to Namekian!',
  status: 'available',
  route: '/media/games/nft-2048',
  accentColor: '#10b981',
  hasHighScores: true,
  difficulty: 'medium',
  estimatedPlayTime: '5-15 min',
  accessibilityFeatures: {
    keyboardPlayable: true,
    screenReaderSupport: false,
    colorBlindMode: true,
    reducedMotionSupport: true,
    audioDescriptions: false,
    pauseAnytime: true,
  },
  instructions: [
    { step: 1, text: 'Swipe to move all NFT tiles in one direction' },
    { step: 2, text: 'Matching NFTs merge into rarer badges' },
    { step: 3, text: 'Reach the legendary Namekian (💚) to win!' },
    { step: 4, text: 'Game ends when no moves are left' },
  ],
  controls: [
    { input: 'Swipe / Arrow Keys', action: 'Move tiles' },
  ],
}
```

---

## PART 8: WIN CELEBRATION

When player reaches **Namekian (2048)**:

1. Show confetti animation
2. Display the specific Namekian NFT they created
3. Show message: "You reached NAMEKIAN! 💚 Only 7 exist!"
4. Option to continue playing or share

---

## SUMMARY

**What Claude CLI needs to do:**

1. ✅ Use Bram Cohen's 2048 as base (clean, working code)
2. ✅ Modify for 4x4 grid
3. ✅ Load badge → NFT ID mapping from JSON
4. ✅ Display actual NFT images on tiles
5. ✅ Add rarity-based visual effects (glows, borders)
6. ✅ Implement merge progression (Phunky → Namekian)
7. ✅ Add win condition for Namekian
8. ✅ Register game in config

**Data files:**
- `/public/assets/Badges/badge_system.json` ✅ (exists)
- `/public/assets/Badges/nft_badge_mapping.json` ✅ (exists)
- `src/games/NFT2048/badgeNfts.json` ✅ **PRE-GENERATED & READY!**

---

*Document created for Claude CLI implementation*
*NFT 2048: From Phunky 🤡 to Namekian 💚*
*Last updated: January 2026*
