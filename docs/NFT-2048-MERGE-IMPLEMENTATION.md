# NFT 2048 Merge Game - Implementation Guide

## Overview

This document provides comprehensive instructions for Claude CLI to create a new NFT-themed 2048 game based on **Bram Cohen's clean implementation** (https://github.com/bramcohen/2048).

**Why Bram Cohen's implementation?**
- Clean, simple, self-contained single HTML file
- Public domain license
- Simple UI with minimal buttons
- Working tile positioning using absolute positioning
- Created by the founder of BitTorrent

---

## PART 1: SOURCE IMPLEMENTATION ANALYSIS

### Repository: bramcohen/2048

**URL**: https://github.com/bramcohen/2048
**License**: Public Domain
**Description**: A trainer to help you play perfect 2048 on small boards

### File Structure

```
bramcohen/2048/
├── 2048-2x3.html          # Standalone 2x3 game (USE THIS AS BASE)
├── 2048-3x3-client.html   # 3x3 game (needs server)
├── src/main.rs            # Rust server (not needed)
├── run-server.sh          # Server launcher (not needed)
├── Cargo.toml             # Rust dependencies (not needed)
└── README.md
```

### Key Implementation Details (from 2048-2x3.html)

**Tech Stack:**
- Single HTML file with embedded CSS and JavaScript
- No frameworks, no dependencies
- ~1010 lines total

**Grid Configuration (Original):**
```javascript
const ROWS = 2;
const COLS = 3;
const NUM_CELLS = 6;
const WIN_VALUE = 128;
```

**For 4x4 NFT Version, change to:**
```javascript
const ROWS = 4;
const COLS = 4;
const NUM_CELLS = 16;
const WIN_VALUE = 2048;
```

### UI Structure (Simple & Clean)

```html
<body>
  <h1>2048</h1>
  <p class="subtitle">2x3 Edition</p>

  <div class="header">
    <div class="score-container">Accuracy</div>
    <div class="score-container">Win Prob</div>
    <button>Hints</button>
    <button>Undo</button>
    <button>New</button>
  </div>

  <div class="game-container">
    <div class="grid"><!-- cells --></div>
    <div id="tiles"><!-- tiles --></div>
    <div class="game-over-overlay"><!-- game over --></div>
  </div>

  <p class="instructions">Use arrow keys to move tiles.</p>
</body>
```

### Tile Positioning System (WORKING!)

**Key difference from broken wojak-ink version:**
- Uses **absolute positioning** with calculated `top`/`left`
- NOT CSS Grid placement (which was buggy)

```javascript
function getPosition(row, col) {
  return {
    top: PADDING + row * (CELL_SIZE + GAP),
    left: PADDING + col * (CELL_SIZE + GAP)
  };
}

function createTile(row, col, value, isNew = false) {
  const pos = getPosition(row, col);
  tile.element.style.position = 'absolute';  // KEY!
  tile.element.style.top = pos.top + 'px';
  tile.element.style.left = pos.left + 'px';
  // ...
}
```

### CSS Tile Colors (Original)

```css
.tile-2 { background: #eee4da; color: #776e65; }
.tile-4 { background: #ede0c8; color: #776e65; }
.tile-8 { background: #f2b179; color: #f9f6f2; }
.tile-16 { background: #f59563; color: #f9f6f2; }
.tile-32 { background: #f67c5f; color: #f9f6f2; }
.tile-64 { background: #f65e3b; color: #f9f6f2; }
.tile-128 { background: #edcf72; color: #f9f6f2; }
.tile-256 { background: #edcc61; color: #f9f6f2; }
```

### Game Logic Functions

| Function | Purpose |
|----------|---------|
| `init()` | Initialize game state |
| `createTile(row, col, value, isNew)` | Create and render a tile |
| `move(direction)` | Handle tile movement and merging |
| `addRandomTile()` | Spawn new tile (90% = 2, 10% = 4) |
| `checkWin()` | Check if WIN_VALUE reached |
| `checkGameOver()` | Check if no moves possible |
| `newGame()` | Reset and start new game |

---

## PART 2: NFT TRANSFORMATION

### Available NFT Headwear Assets

**Location**: `/public/assets/wojak-layers/HEAD/`

| Value | Asset | Filename |
|-------|-------|----------|
| 2 | Cap | `HEAD_Cap_orange.png` |
| 4 | Fedora | `HEAD_Fedora_brown.png` |
| 8 | **[USER TO SPECIFY]** | |
| 16 | Ronin Helmet | `HEAD_Ronin-Helmet.png` |
| 32 | Crown | `HEAD_Crown_.png` |
| 64 | **[USER TO SPECIFY]** | |
| 128 | **[USER TO SPECIFY]** | |
| 256 | **[USER TO SPECIFY]** | |
| 512 | **[USER TO SPECIFY]** | |
| 1024 | **[USER TO SPECIFY]** | |
| 2048 | **[USER TO SPECIFY]** | |

### Full Asset List Available

```
HEAD_Cap_blue.png
HEAD_Cap_green.png
HEAD_Cap_orange.png
HEAD_Cap_McD.png
HEAD_Fedora_brown.png
HEAD_Fedora_orange.png
HEAD_Fedora_purple.png
HEAD_Beanie_.png
HEAD_Ronin-Helmet.png
HEAD_Crown_.png
HEAD_Cowboy-Hat_.png
HEAD_Vikings-Hat_.png
HEAD_Centurion_.png
HEAD_Super-Saiyan.png
HEAD_Wizard-Hat_man.png
HEAD_Clown_.png
HEAD_Construction-Helmet_.png
HEAD_Devil-Horns.png
HEAD_Pirate-Hat_.png
HEAD_Military-Beret.png
HEAD_SWAT-Helmet.png
HEAD_Trump-Wave_.png
HEAD_Tin-Foil_.png
HEAD_Propeller-Hat_.png
HEAD_Piccolo-Hat_.png
HEAD_Hard-Hat_.png
HEAD_Firefigther-Helmet_.png
HEAD_Field-Cap_.png
HEAD_Comrade-Cap_.png
HEAD_Anarchy-Spikes_pink.png
HEAD_2Pac-Bandana_red.png
```

### NFT Tile Configuration

**Replace number display with images:**

```javascript
const NFT_TILES = {
  2:    { image: '/assets/wojak-layers/HEAD/HEAD_Cap_orange.png', name: 'Cap' },
  4:    { image: '/assets/wojak-layers/HEAD/HEAD_Fedora_brown.png', name: 'Fedora' },
  8:    { image: '[TBD]', name: '[TBD]' },
  16:   { image: '/assets/wojak-layers/HEAD/HEAD_Ronin-Helmet.png', name: 'Ronin' },
  32:   { image: '/assets/wojak-layers/HEAD/HEAD_Crown_.png', name: 'Crown' },
  64:   { image: '[TBD]', name: '[TBD]' },
  128:  { image: '[TBD]', name: '[TBD]' },
  256:  { image: '[TBD]', name: '[TBD]' },
  512:  { image: '[TBD]', name: '[TBD]' },
  1024: { image: '[TBD]', name: '[TBD]' },
  2048: { image: '[TBD]', name: '[TBD]' },
};
```

### Modified createTile Function

```javascript
function createTile(row, col, value, isNew = false) {
  const tile = {
    id: tileId++,
    row,
    col,
    value,
    element: document.createElement('div')
  };

  const pos = getPosition(row, col);
  const nftConfig = NFT_TILES[value] || { image: null, name: value };

  tile.element.className = `tile tile-${value}`;
  tile.element.style.width = `${CELL_SIZE}px`;
  tile.element.style.height = `${CELL_SIZE}px`;
  tile.element.style.top = pos.top + 'px';
  tile.element.style.left = pos.left + 'px';

  // NFT Image instead of number
  if (nftConfig.image) {
    const img = document.createElement('img');
    img.src = nftConfig.image;
    img.alt = nftConfig.name;
    img.className = 'tile-image';
    img.draggable = false;
    tile.element.appendChild(img);
  } else {
    tile.element.textContent = value;
  }

  if (isNew) {
    tile.element.classList.add('tile-new');
  }

  document.getElementById('tiles').appendChild(tile.element);
  tiles.push(tile);
  return tile;
}
```

### CSS for NFT Tiles

```css
.tile {
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  transition: top 0.15s ease-in-out, left 0.15s ease-in-out;
  background: rgba(238, 228, 218, 0.9);
}

.tile-image {
  width: 85%;
  height: 85%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
}

/* Optional: Different backgrounds per tier */
.tile-2 { background: #eee4da; }
.tile-4 { background: #ede0c8; }
.tile-8 { background: #f2b179; }
.tile-16 { background: #f59563; }
.tile-32 { background: #f67c5f; }
.tile-64 { background: #f65e3b; }
.tile-128 { background: #edcf72; }
.tile-256 { background: #edcc61; }
.tile-512 { background: #edc850; }
.tile-1024 { background: #edc53f; }
.tile-2048 { background: #ff6b00; }
```

---

## PART 3: SIMPLIFIED UI FOR WOJAK-INK

### Remove Training Features (Keep it Simple)

**REMOVE from Bram Cohen's code:**
- Win probability calculation and display
- Move hints panel
- Accuracy tracking
- Undo functionality (optional - can keep)
- `computeWinProbabilities()` function (~100 lines)
- All `WIN_PROBS` related code

**KEEP:**
- Title
- Score display
- Best score display
- New Game button
- Grid with tiles
- Simple game over overlay
- Arrow key + touch controls

### Target UI Structure

```html
<body>
  <h1>2048</h1>
  <p class="subtitle">NFT Merge</p>

  <div class="header">
    <div class="score-container">
      <div class="score-label">Score</div>
      <div class="score-value" id="score">0</div>
    </div>
    <div class="score-container">
      <div class="score-label">Best</div>
      <div class="score-value" id="bestScore">0</div>
    </div>
    <button class="header-btn" onclick="newGame()">New Game</button>
  </div>

  <div class="game-container">
    <div class="grid">
      <!-- 16 cells for 4x4 -->
    </div>
    <div id="tiles"></div>
    <div class="game-over-overlay" id="gameOver">
      <div class="game-over-text" id="gameOverText">Game Over!</div>
      <div class="final-score">Score: <span id="finalScore">0</span></div>
      <button class="header-btn" onclick="newGame()">Try Again</button>
    </div>
  </div>

  <p class="instructions">Swipe or use arrow keys to merge NFTs!</p>
</body>
```

---

## PART 4: INTEGRATION WITH WOJAK-INK

### Option A: Standalone HTML (Simplest)

Create `/public/games/nft-2048.html` as a standalone game, similar to Bram Cohen's approach.

**Pros:**
- Simple, self-contained
- Easy to test and debug
- No React complexity

**Cons:**
- Not integrated with existing game system
- No leaderboard integration

### Option B: React Component (Recommended)

Convert to React component at `/src/games/NFT2048/NFT2048Game.tsx`

**Changes needed:**
1. Convert DOM manipulation to React state
2. Use `useState` for `tiles`, `score`, `isGameOver`
3. Use `useEffect` for keyboard/touch listeners
4. Use `useCallback` for game functions
5. Integrate with existing `useLeaderboard` hook

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/games/NFT2048/NFT2048Game.tsx` | CREATE - Main game component |
| `src/games/NFT2048/NFT2048Game.css` | CREATE - Styles |
| `src/config/games.ts` | MODIFY - Add game entry |
| `src/pages/GamesHub.tsx` | VERIFY - Auto-picks up from config |

### Game Config Entry

```typescript
// In src/config/games.ts

{
  id: 'nft-2048',
  name: 'NFT Merge',
  emoji: '🎩',
  description: 'Merge Wojak NFT headwear to reach the ultimate piece!',
  shortDescription: 'Swipe to merge NFT headwear!',
  status: 'available',
  route: '/media/games/nft-2048',
  accentColor: '#ff6b00',
  hasHighScores: true,
  difficulty: 'medium',
  estimatedPlayTime: '5-15 min',
  // ...
}
```

---

## PART 5: IMPLEMENTATION STEPS FOR CLAUDE CLI

### Step 1: Get Bram Cohen's Code

```bash
# Clone the repo (or copy the HTML file)
curl -o /tmp/2048-base.html https://raw.githubusercontent.com/bramcohen/2048/main/2048-2x3.html
```

### Step 2: Create New Game Component

1. Create `src/games/NFT2048/` directory
2. Create `NFT2048Game.tsx` based on Bram Cohen's logic
3. Create `NFT2048Game.css` with styling

### Step 3: Modify for 4x4 Grid

```javascript
// Change these constants:
const ROWS = 4;
const COLS = 4;
const NUM_CELLS = 16;
const WIN_VALUE = 2048;
```

### Step 4: Add NFT Tile Images

1. Define `NFT_TILES` configuration
2. Modify tile rendering to show images
3. Add `.tile-image` CSS class

### Step 5: Remove Training Features

Delete all code related to:
- `WIN_PROBS`
- `computeWinProbabilities()`
- `getMoveExpectedProb()`
- `updateMoveHintsWithData()`
- Accuracy tracking
- Hints toggle

### Step 6: Add Score Tracking

```javascript
let score = 0;
let bestScore = localStorage.getItem('nft2048-best') || 0;

// In merge logic:
score += newValue;
if (score > bestScore) {
  bestScore = score;
  localStorage.setItem('nft2048-best', bestScore);
}
```

### Step 7: Register Game

Add entry to `src/config/games.ts` with `status: 'available'`

### Step 8: Test

1. Run dev server
2. Navigate to game
3. Verify:
   - Tiles position correctly
   - Swipe/keyboard works
   - Merging works
   - NFT images display
   - Game over triggers
   - Score saves

---

## PART 6: AWAITING USER INPUT

**Before implementation, please provide:**

1. **Complete NFT tile mapping** for all 11 tiers (2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048)

2. **Game name**: "NFT Merge", "Wojak Merge", "Hat Merge", or other?

3. **Integration preference**:
   - Standalone HTML file?
   - React component integrated with existing system?

4. **Features to include**:
   - Undo button? (Yes/No)
   - Sound effects? (Yes/No)
   - Leaderboard integration? (Yes/No)

---

## APPENDIX: Bram Cohen's Full 2048-2x3.html Code

The complete source code is available at:
https://raw.githubusercontent.com/bramcohen/2048/main/2048-2x3.html

Key sections:
- Lines 1-200: CSS styles
- Lines 201-250: HTML structure
- Lines 251-1010: JavaScript game logic

---

*Document created for Claude CLI implementation*
*Based on bramcohen/2048 (Public Domain)*
*Last updated: January 2026*
