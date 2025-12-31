# 🚀 Wojak Ink - Windows 98 Style NFT Showcase

> **A special gift from [Bullish0xCrypto](https://x.com/Bullish0xCrypto) to Abit for his upcoming Wojak NFT collection on Chia** 🎁

Welcome to **Wojak Ink** - a retro Windows 98-style web application that showcases your Wojak NFT collection with style, memes, and pure Tang Gang energy. This app brings together the best of both worlds: nostalgic Windows 98 aesthetics and modern web3 functionality for the Chia blockchain.

Built with React, Vite, and a whole lot of memetic energy. Let's get you set up, Abit! 💪

> **📝 Note:** This README is actively maintained and updated as features are added. If you're reading this and something doesn't match, check the latest version or reach out!

---

## 📋 Table of Contents

- [What is This?](#-what-is-this)
- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Running Locally](#-running-locally)
  - [Option 1: Standard Development](#option-1-standard-development-recommended)
  - [Option 2: Docker Development](#option-2-docker-development-alternative)
- [Testing](#-testing)
- [QA Testing Guide](#-qa-testing-guide)
  - [Quick Start QA Scripts](#quick-start-qa-scripts)
  - [iPhone-Sized Viewport Testing](#-iphone-sized-viewport-testing)
  - [Android Testing](#-android-testing)
  - [iPad Testing](#-ipad-testing)
  - [Desktop Testing](#️-desktop-testing)
  - [Keyboard Navigation Testing](#️-keyboard-navigation-testing)
  - [Bottom Sheet Behavior Testing](#-bottom-sheet-behavior-testing)
  - [Lighthouse Performance Testing](#-lighthouse-performance-testing)
- [Using the App](#-using-the-app)
- [Development with Cursor](#-development-with-cursor)
- [Building for Production](#-building-for-production)
- [Deployment](#-deployment)
- [Docker Setup](#-docker-setup)
- [Project Structure](#-project-structure)
- [Troubleshooting](#-troubleshooting)
- [Credits & Community](#-credits--community)
- [Wojak Creator Internals Reference](#-wojak-creator-internals-reference)

---

## 🎯 What is This?

Wojak Ink is a full-featured NFT showcase application that:

- **Displays your Wojak NFT collection** in a nostalgic Windows 98 interface
- **Creates custom wojaks** using the Wojak Creator with smart layer rules
- **Manages P2P offers** for your NFTs via Chia offer files
- **Integrates with MintGarden and Dexie** APIs for real-time NFT data
- **Includes a built-in Paint app** (JS Paint) for meme editing
- **Shows marketplace listings** with offer file management

Perfect for showcasing your collection, managing sales, and creating memes - all with that classic Windows 98 vibe that hits different. 🔥

---

## ✨ Features

### Core Features

- **🪟 Windows 98 UI**: Authentic retro interface using [98.css](https://github.com/jdan/98.css)
- **🎨 Wojak Creator**: Layer-based wojak creator with real-time preview and smart rules
- **🍊 Big Pulp Intelligence**: Explore the collection through Big Pulp’s Q&A. Static answers include **up to 10 clickable NFT previews** you can jump to in the Rarity Explorer.
- **✨ Tangify Feature**: Transform your wojak into a realistic AI-generated version using OpenAI's DALL-E 3
- **🛒 Marketplace Integration**: P2P offer file management with MintGarden/Dexie APIs
- **🖼️ Gallery**: Browse your NFT collection with hover effects
- **🎨 Paint Window**: Full JS Paint integration for meme editing
- **📋 Offer File Management**: Copy, view, and manage Chia offer files
- **🔔 Toast Notifications**: Windows 98-style popup notifications
- **📱 Responsive Windows**: Draggable, resizable windows with proper z-index stacking
- **👥 Tang Gang Window**: Community information and links
- **⚙️ Admin Panel**: Administrative features (accessible via route)
- **🍊 TangGang Smash Mini-Game**: Drag the TangGang window to spawn oranges that accumulate on the ground. Smash them with the window to create epic juice splashes! Score resets on refresh, and the Treasure message is just a joke.
- **💤 Windows 98 Screensaver**: Activates after 2 minutes of idle time with orange-themed emojis and Tang Gang branding. Automatically disables during CyberTang generation, when typing in inputs, or when windows are open. Features fade-out animation, responsive emoji count (8/12/20 based on screen size), and pauses when browser tab is hidden.
- **🔊 Sound Effects**: Authentic Windows 98-style sound effects for button clicks, window operations, drag-and-drop, and actions. Includes mute toggle in the system tray with localStorage persistence.
- **🚀 Startup Sequence**: Classic Windows 98 startup screen with Tang Gang branding, animated logo, and loading bar. Shows once per session (can be skipped with any key).
- **🖱️ Right-Click Context Menu**: Windows 98-style context menus on desktop icons, desktop background, and recycle bin with options for Open, Download, Delete, and Properties.
- **📋 Properties Window**: View detailed properties of desktop icons including file size, creation date, and trait information (for wojak images) in a tabbed interface.
- **🔲 Selection Box (Marquee)**: Click and drag on the desktop to create a selection box and select multiple icons at once. Works seamlessly with keyboard shortcuts.
- **⌨️ Keyboard Shortcuts**: Full keyboard navigation support - Delete to move to recycle bin, Ctrl+A to select all, F5 to refresh, Enter to open selected, Ctrl+Z to undo, F2 to rename, and Escape to deselect.
- **🎯 Enhanced Drag Animations**: Smooth drag animations with ghost icons, fade effects, and recycle bin shake animation when dragging items over it.
- **🖼️ Wallpaper Selector**: Customize your desktop background with various wallpapers through the Display Properties window.
- **🥚 Easter Eggs**: Fun hidden features including Konami code, orange rain effect, and Clippy-style helper. Try clicking the clock 10 times or typing "tang" or "orange"!
- **🔊 Windows 98 Sound Effects**: Authentic retro sound effects for button clicks, window operations, system events, and user actions. Includes mute toggle in the system tray with localStorage persistence.

### Technical Features

- **React 19** with modern hooks and context API
- **Vite** for lightning-fast development
- **React Router** for navigation
- **Intersection Observer** for lazy loading
- **Error Boundaries** for graceful error handling
- **IPFS Integration** for image hosting
- **Meme Manifest Generation**: Automated manifest generation for wojak creator layers
- **Smart Layer Rules**: Extensible rules system that prevents incompatible layer combinations
- **Docker Support**: Full Docker setup with Cloudflare tunnel integration

---

## 📦 Prerequisites

Before you start, make sure you have these installed:

### Required

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** - [Download here](https://git-scm.com/)

### Recommended

- **Cursor IDE** - [Download here](https://cursor.sh/) (for AI-powered development)
- **Chia Wallet** - For testing offer files (optional)

### Verify Installation

Open **Terminal** (press `Cmd + Space`, type "Terminal", press Enter) and run:

```bash
node --version  # Should show v18.x.x or higher
npm --version   # Should show 9.x.x or higher
git --version   # Should show git version
```

If any of these fail, install the missing tool first!

**Mac Tip:** If you don't have Node.js, you can install it via Homebrew:
```bash
# Install Homebrew first (if you don't have it)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Then install Node.js
brew install node
```

---

## 🚀 Installation

### Step 1: Get the Project Files

```bash
# Option 1: Clone the repo (if you have a git URL)
git clone <your-repo-url>
cd wojak-ink

# Option 2: Extract from zip file
# If you received a zip file, extract it and navigate to the folder:
cd ~/Downloads/wojak-ink  # or wherever you extracted it
cd wojak-ink
```

**Mac Tip:** You can drag and drop the folder into Terminal to get the path automatically!

### Step 2: Set Up Environment Variables (Optional)

If you plan to use Docker with Cloudflare tunnel:

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your Cloudflare tunnel token (if using Docker deployment)
# For local development, you can skip this step
```

### Step 3: Install Dependencies

```bash
# Install all required packages
npm install
```

This will install all the dependencies listed in `package.json`. It might take a minute or two - grab a coffee! ☕

**What gets installed:**
- React and React DOM
- Vite (build tool)
- 98.css (Windows 98 UI library)
- React Router
- html2canvas (for meme export)
- bech32 libraries (for Chia address encoding)
- React Error Boundary
- And more...

**Installation time:** Usually takes 1-2 minutes depending on your internet connection.

### Step 4: Verify Installation

```bash
# Check if everything installed correctly
npm list --depth=0
```

You should see all your dependencies listed without errors.

**Optional:** Generate the wojak creator manifest to ensure everything is set up:
```bash
npm run generate-meme-manifest
```

### Step 5: Configuration Files (Optional)

The project includes configuration files that help with development:

- **`.gitignore`** - Tells Git which files to ignore (already configured)
- **`.prettierignore`** - Tells Prettier which files to skip formatting (already configured)
- **`.env`** - Environment variables (create from `.env.example` if using Docker)

**For local development:** You don't need to modify these files - they're already set up! Just focus on coding. 🚀

---

## 🏃 Running Locally

### Option 1: Standard Development (Recommended)

#### Start the Development Server

```bash
npm run dev
```

You should see output like:

```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

#### Open in Browser

1. Open your browser (Safari, Chrome, Firefox - all work great on Mac)
2. Navigate to `http://localhost:5173`
3. You should see the Windows 98 desktop with your app! 🎉

**Mac Tip:** You can press `Cmd + Click` on the URL in Terminal to open it automatically!

#### Hot Module Replacement (HMR)

One of the best parts of Vite - **changes update instantly** without page refresh! 

- Edit any file in `src/`
- Save the file (`Cmd + S`)
- Watch the browser update automatically ✨

#### Stop the Server

Press `Ctrl + C` in your terminal to stop the dev server.

**Mac Note:** On Mac Terminal, `Ctrl + C` works to stop processes (not `Cmd + C`).

### Option 2: Docker Development (For Production Testing)

**Note:** The Docker setup is primarily designed for **production deployment**, not active development. For development, use Option 1 (standard npm dev server) for faster hot-reload.

However, you can use Docker to test the production build locally:

#### Prerequisites for Docker

1. **Install Docker Desktop for Mac**: [Download here](https://www.docker.com/products/docker-desktop/)
2. **Start Docker Desktop** (make sure it's running - check the menu bar)

#### Test Production Build with Docker

```bash
# First, build the production dist
npm run build

# Then build and start Docker containers
docker-compose build
docker-compose up -d

# The app will be available at http://localhost:3000 (not 5173)
```

**Important:** This serves the production build, not the development server. Changes to source files won't hot-reload - you need to rebuild and restart containers.

#### Docker Commands for Testing

```bash
# View logs
docker-compose logs -f

# Stop containers
docker-compose down

# Restart containers
docker-compose restart

# Rebuild after changes
npm run build
docker-compose build --no-cache
docker-compose up -d
```

**When to use Docker for development:**
- Testing production build locally
- Verifying Docker configuration
- Testing Cloudflare tunnel setup
- Ensuring production environment works correctly

**For active development:** Stick with `npm run dev` (Option 1) for faster iteration!

### Option 3: Local Development with Tangify Feature (Wrangler)

**Note:** The CyberTang/Tangify feature uses a Cloudflare Pages Function (`/api/tangify`). To test it locally, you need to use Wrangler instead of the standard Vite dev server.

#### Prerequisites

1. **Create `.dev.vars` file** with your OpenAI API key:
   ```bash
   # Create .dev.vars file in project root (for Wrangler Pages Functions)
   echo "OPENAI_API_KEY=your-api-key-here" > .dev.vars
   ```
   
   **Important:** 
   - Replace `your-api-key-here` with your actual OpenAI API key
   - Get your API key from: https://platform.openai.com/api-keys
   - The `.dev.vars` file is gitignored, so your key is safe!
   - **Note:** For Wrangler Pages Functions, use `.dev.vars` (not `.env`) - Wrangler uses this file to populate the `env` context for Functions

2. **Verify your `.dev.vars` file:**
   ```bash
   # Check that the file exists and has the key
   cat .dev.vars
   # Should show: OPENAI_API_KEY=sk-...
   ```

#### Start Development Server with Wrangler

**Quick Start (Recommended):**

```bash
# This builds the project and starts Wrangler in one command
npm run dev:tangify
```

**Or manually:**

```bash
# Step 1: Build the project first
npm run build

# Step 2: Start Wrangler dev server (runs Cloudflare Pages Functions locally)
npx wrangler pages dev dist --compatibility-date=2024-01-01
```

You should see output like:
```
⬣ Wrangler v4.x.x
⎔ Starting local server...
[wrangler:inf] Ready on http://localhost:8788
```

#### Access the App

1. Open your browser
2. Navigate to `http://localhost:8788`
3. Open the Wojak Generator window
4. Click the **"CyberTang"** button - it should now work! 🎉

**Troubleshooting:**

- ❌ **"OpenAI API key not configured" error?**
  - Make sure your `.dev.vars` file exists: `cat .dev.vars`
  - Make sure it contains: `OPENAI_API_KEY=sk-...`
  - **Important:** Use `.dev.vars` (not `.env`) for Wrangler Pages Functions
  - Restart Wrangler after creating/editing `.dev.vars`

- ❌ **"Failed to load resource: 500" error?**
  - Check that Wrangler is running (you should see the terminal output)
  - Check that `OPENAI_API_KEY` is set correctly in `.dev.vars`
  - Try restarting Wrangler: Press `Ctrl+C` and run `npm run dev:tangify` again

- ❌ **"CyberTang API endpoint not found" error?**
  - Make sure you're using `http://localhost:8788` (Wrangler), not `http://localhost:5173` (Vite)
  - Make sure Wrangler is running in a terminal

**Important Notes:**
- ⚠️ **CyberTang only works with Wrangler dev server** - the standard `npm run dev` won't work for CyberTang because it doesn't run Cloudflare Pages Functions
- The `.dev.vars` file must contain `OPENAI_API_KEY` for local development (Wrangler Pages Functions use `.dev.vars`, not `.env`)
- Wrangler automatically loads environment variables from `.dev.vars` for Pages Functions
- For production, set `OPENAI_API_KEY` in Cloudflare Pages dashboard (see Deployment section)
- Changes to source code require rebuilding: Stop Wrangler (`Ctrl+C`), then run `npm run dev:tangify` again

#### When to Use Each Option

- **`npm run dev`** (Option 1): Use for general development (faster, hot-reload, but CyberTang won't work)
- **`npm run dev:tangify`** (Option 3): Use when you need to test the CyberTang feature locally
- **Docker** (Option 2): Use for testing production builds

**Pro Tip:** You can run both servers simultaneously if you want:
- Terminal 1: `npm run dev` (for general development at `http://localhost:5173`)
- Terminal 2: `npm run dev:tangify` (for testing CyberTang at `http://localhost:8788`)

Just remember to use the Wrangler URL (`http://localhost:8788`) when testing CyberTang!

---

## 🧪 Testing

### Manual Testing Checklist

Since this is a visual/interactive app, here's what to test:

#### ✅ Basic Functionality

- [ ] App loads without errors
- [ ] Windows can be dragged around
- [ ] Windows can be minimized/maximized
- [ ] Multiple windows stack correctly (z-index)
- [ ] Taskbar shows active windows

#### ✅ Wojak Creator

- [ ] Open "WOJAK_CREATOR.EXE" window
- [ ] Select different layers (Background, Base, Clothes, Eyes, Head, Mouth(Base), Mouth(Item), Facial Hair, Mask)
- [ ] Preview updates in real-time
- [ ] Test layer rules (e.g., select Astronaut clothes - Head layer should be disabled)
- [ ] Export as PNG works
- [ ] Copy to clipboard works

#### ✅ TangGang Smash Mini-Game

- [ ] Drag TangGang window to spawn oranges
- [ ] Oranges fall and accumulate on the ground (do not fade out)
- [ ] Oranges can be picked up and thrown with mouse
- [ ] Smashing oranges with TangGang window creates juice splashes
- [ ] Spawn pauses when too many oranges on ground (80+), resumes when below threshold
- [ ] Score resets on page refresh
- [ ] Treasure window message is a joke (hard-coded text)

#### ✅ Marketplace

- [ ] Marketplace window opens
- [ ] NFT cards load (if you have offer files)
- [ ] Filter by token group works
- [ ] "Show only NFTs with offers" filter works
- [ ] Clicking NFT shows offer file modal
- [ ] Copy offer file button works

#### ✅ Paint Window

- [ ] Paint window opens from taskbar
- [ ] JS Paint loads correctly
- [ ] Can insert images from Wojak Creator library
- [ ] Paint tools work

#### ✅ Other Windows

- [ ] Gallery window displays NFTs
- [ ] FAQ window shows content
- [ ] Readme window displays correctly
- [ ] Mint Info window works
- [ ] Tang Gang window displays correctly
- [ ] Admin Panel accessible (via `/admin-enable` route)

### Testing Offer Files

If you have offer files in `src/data/offerFiles.csv` or `public/offerFiles.csv`:

1. The marketplace should automatically load them
2. NFTs should appear in the marketplace window
3. Clicking an NFT should show the offer file modal
4. Copying the offer file should work

Supported CSV formats:

- **Simple (recommended):**
  - With header: `offerFile` on the first line, then one offer string per line
  - Or without header: one offer string per line
- **Legacy (still supported):**
  - `nftId,offerFile,group`

### Browser Console

Always check the browser console (F12 → Console tab) for errors:

- Red errors = problems to fix
- Yellow warnings = usually okay, but worth checking

---

## 🔍 QA Testing Guide

This section provides detailed steps for testing the app across different devices and viewports. Use the QA scripts to start the dev server with appropriate context.

### Quick Start QA Scripts

```bash
# Mobile QA testing (iPhone/Android viewport)
npm run qa:mobile

# Desktop QA testing
npm run qa:desktop

# Lighthouse performance testing
npm run qa:lighthouse
```

**Note:** These scripts start the dev server. You'll need to open the browser and follow the testing steps below.

### 📱 iPhone-Sized Viewport Testing

**Viewport Size:** 390px × 844px (iPhone 12/13/14 Pro)

#### Setup Steps:

1. **Start the dev server:**
   ```bash
   npm run qa:mobile
   ```

2. **Open Chrome DevTools:**
   - Press `Cmd + Option + I` (Mac) or `F12` (Windows/Linux)
   - Or right-click → "Inspect"

3. **Enable Device Toolbar:**
   - Click the device icon (📱) in the top-left of DevTools
   - Or press `Cmd + Shift + M` (Mac) / `Ctrl + Shift + M` (Windows/Linux)

4. **Select iPhone preset:**
   - Click the device dropdown (top toolbar)
   - Select "iPhone 12 Pro" or "iPhone 13 Pro"
   - Or enter custom: `390 × 844`

5. **Set zoom level:**
   - Ensure zoom is set to 100% (not scaled)
   - Check "Show device frame" if you want visual reference

#### Testing Checklist:

##### ✅ Layout & Responsiveness
- [ ] App loads without horizontal scroll
- [ ] Taskbar is visible at bottom with safe-area padding
- [ ] Windows are properly sized (not cut off)
- [ ] Text is readable (not too small)
- [ ] Buttons are tappable (min 44px touch target)

##### ✅ Bottom Sheet (Wojak Creator)
- [ ] Open Wojak Creator window
- [ ] Bottom sheet appears at bottom of screen
- [ ] Collapsed state shows 3 primary buttons (Base, Head, Clothes)
- [ ] Collapsed state shows trait summary
- [ ] Tap "View All Traits" to expand
- [ ] Expanded sheet shows full trait list
- [ ] Search input works
- [ ] Can scroll trait list
- [ ] Drag handle works (drag down to close)
- [ ] Tap close button (✕) closes sheet
- [ ] Background page doesn't scroll when sheet is open
- [ ] Safe-area padding respects notch (if applicable)

##### ✅ Touch Interactions
- [ ] All buttons respond to tap (no 300ms delay)
- [ ] Windows can be dragged by title bar
- [ ] Taskbar buttons are tappable
- [ ] Long-press shows tooltips (500ms)
- [ ] No accidental scrolling when interacting

##### ✅ Keyboard Navigation
- [ ] Focus trait selector (tap a dropdown)
- [ ] Arrow Up/Down navigates options
- [ ] Enter selects current option
- [ ] Esc closes bottom sheet
- [ ] Keyboard doesn't interfere with input fields

##### ✅ Performance
- [ ] Trait switching is smooth (debounced)
- [ ] Canvas preview updates without lag
- [ ] No jank during interactions
- [ ] FPS stays above 55 (check FPS debug toggle in dev mode)

---

### 🤖 Android Testing

**Viewport Sizes to Test:**
- **Small:** 360px × 640px (Android small)
- **Medium:** 412px × 915px (Pixel 5)
- **Large:** 428px × 926px (Pixel 6 Pro)

#### Setup Steps:

1. **Start the dev server:**
   ```bash
   npm run qa:mobile
   ```

2. **Open Chrome DevTools** (`Cmd + Option + I`)

3. **Enable Device Toolbar** (`Cmd + Shift + M`)

4. **Select Android preset:**
   - Choose "Pixel 5" (412 × 915)
   - Or "Samsung Galaxy S20" (360 × 800)
   - Or enter custom dimensions

#### Testing Checklist:

##### ✅ All iPhone Tests (Same as above)
- [ ] Layout & Responsiveness
- [ ] Bottom Sheet behavior
- [ ] Touch Interactions
- [ ] Keyboard Navigation
- [ ] Performance

##### ✅ Android-Specific
- [ ] Safe-area insets work (if device has notch)
- [ ] Back button behavior (if testing on real device)
- [ ] System UI doesn't overlap content
- [ ] Status bar doesn't cover content

---

### 📱 iPad Testing

**Viewport Sizes:**
- **iPad Mini:** 768px × 1024px
- **iPad Air/Pro:** 820px × 1180px
- **iPad Pro 12.9":** 1024px × 1366px

#### Setup Steps:

1. **Start the dev server:**
   ```bash
   npm run qa:mobile
   ```

2. **Open Chrome DevTools** (`Cmd + Option + I`)

3. **Enable Device Toolbar** (`Cmd + Shift + M`)

4. **Select iPad preset:**
   - Choose "iPad Air" (820 × 1180)
   - Or "iPad Pro 12.9"" (1024 × 1366)
   - Or enter custom dimensions

#### Testing Checklist:

##### ✅ Tablet Layout
- [ ] App uses tablet layout (not mobile bottom sheet)
- [ ] Windows are properly sized
- [ ] Side-by-side layout works (if applicable)
- [ ] Text is appropriately sized
- [ ] Touch targets are adequate

##### ✅ Orientation
- [ ] Test portrait mode (768 × 1024)
- [ ] Test landscape mode (1024 × 768)
- [ ] Layout adapts correctly
- [ ] No content cut off

##### ✅ Touch & Gestures
- [ ] Multi-touch works (if applicable)
- [ ] Pinch-to-zoom disabled (if intended)
- [ ] Scroll gestures work smoothly

---

### 🖥️ Desktop Testing

**Viewport Sizes:**
- **Small Desktop:** 1024px × 768px
- **Standard:** 1920px × 1080px
- **Large:** 2560px × 1440px

#### Setup Steps:

1. **Start the dev server:**
   ```bash
   npm run qa:desktop
   ```

2. **Open browser** at `http://localhost:5173`

3. **Resize browser window** to test different sizes:
   - Use DevTools device toolbar
   - Or manually resize browser window

#### Testing Checklist:

##### ✅ Layout & Windows
- [ ] Windows can be dragged freely
- [ ] Windows stack correctly (z-index)
- [ ] Multiple windows can be open simultaneously
- [ ] Taskbar shows all open windows
- [ ] Start menu works
- [ ] Window controls (minimize/maximize/close) work

##### ✅ Keyboard Navigation
- [ ] Tab key navigates between interactive elements
- [ ] Enter activates buttons/links
- [ ] Esc closes modals/windows
- [ ] Arrow keys navigate trait lists (when focused)
- [ ] Keyboard shortcuts work:
  - [ ] Delete key moves selected icons to Recycle Bin
  - [ ] Ctrl+A selects all icons
  - [ ] F5 refreshes the page
  - [ ] Enter opens selected icon
  - [ ] Ctrl+Z undoes last action
  - [ ] F2 renames selected icon
  - [ ] Escape deselects all icons

##### ✅ Mouse Interactions
- [ ] Hover effects work (tooltips, button states)
- [ ] Click interactions are responsive
- [ ] Drag and drop works (windows, oranges)
- [ ] Right-click context menus work on desktop icons, desktop background, and recycle bin
- [ ] Context menu items are accessible and clickable

##### ✅ Performance
- [ ] Smooth animations (60fps)
- [ ] No lag when switching traits rapidly
- [ ] Canvas preview updates smoothly
- [ ] No memory leaks (check DevTools Memory tab)

---

### ⌨️ Keyboard Navigation Testing

Test keyboard accessibility across all viewports:

#### Setup:

1. **Start dev server:**
   ```bash
   npm run qa:desktop  # or qa:mobile
   ```

2. **Open browser** and navigate to app

3. **Disable mouse** (or just don't use it)

#### Testing Checklist:

##### ✅ Focus Management
- [ ] Tab key moves focus between elements
- [ ] Focus indicator is visible (outline)
- [ ] Focus order is logical
- [ ] Focus doesn't get trapped

##### ✅ Trait Panel Navigation
- [ ] Focus a trait selector (Tab to it)
- [ ] Arrow Up/Down navigates options
- [ ] Enter selects current option
- [ ] Esc closes bottom sheet (mobile) or blurs (desktop)
- [ ] Tab moves to next selector

##### ✅ Window Navigation
- [ ] Tab navigates window controls
- [ ] Enter activates buttons
- [ ] Esc closes windows/modals
- [ ] Arrow keys don't interfere with window dragging

##### ✅ Form Elements
- [ ] Input fields are keyboard accessible
- [ ] Select dropdowns work with keyboard
- [ ] Search inputs work with keyboard
- [ ] Buttons are keyboard accessible

---

### 📋 Bottom Sheet Behavior Testing

**Mobile Only** (≤ 640px viewport width)

#### Setup:

1. **Start mobile QA:**
   ```bash
   npm run qa:mobile
   ```

2. **Set viewport to mobile** (390px × 844px)

3. **Open Wojak Creator** window

#### Testing Checklist:

##### ✅ Collapsed State
- [ ] Shows 3 primary buttons (Base, Head, Clothes)
- [ ] Buttons show selection indicator (✓) when trait selected
- [ ] Trait summary shows selected traits (up to 3)
- [ ] "View All Traits" button visible
- [ ] Safe-area padding applied (notch/gesture bar)

##### ✅ Expanded State
- [ ] Tap "View All Traits" expands sheet
- [ ] Sheet animates smoothly (max-height: 70dvh)
- [ ] Draggable handle visible at top
- [ ] Header shows "Select Traits" title
- [ ] Close button (✕) visible
- [ ] Search input visible and functional
- [ ] Trait list scrolls smoothly
- [ ] Background page is locked (no scroll)

##### ✅ Interactions
- [ ] Drag handle down closes sheet (threshold: 100px)
- [ ] Tap close button closes sheet
- [ ] Tap outside sheet (if implemented) closes sheet
- [ ] Esc key closes sheet
- [ ] Search filters traits correctly
- [ ] Selecting trait updates preview
- [ ] Primary button tap scrolls to trait in expanded view

##### ✅ Performance
- [ ] Sheet opens/closes without jank
- [ ] Scrolling is smooth (60fps)
- [ ] No layout shifts
- [ ] Touch interactions are responsive

##### ✅ Edge Cases
- [ ] Very long trait names don't break layout
- [ ] Many traits scroll correctly
- [ ] Empty search shows "No results" message
- [ ] Disabled traits are visually distinct
- [ ] Safe-area insets work on notched devices

---

### 🔍 Lighthouse Performance Testing

**Automated performance, accessibility, and best practices audit.**

#### Setup:

1. **Install Lighthouse** (if not already installed):
   ```bash
   npm install -g lighthouse
   ```

2. **Start the dev server:**
   ```bash
   npm run qa:lighthouse
   ```

3. **In a new terminal, run Lighthouse:**
   ```bash
   # Basic audit
   npx lighthouse http://localhost:5173 --view

   # Mobile audit
   npx lighthouse http://localhost:5173 --view --preset=mobile

   # Desktop audit
   npx lighthouse http://localhost:5173 --view --preset=desktop

   # Generate HTML report
   npx lighthouse http://localhost:5173 --output=html --output-path=./lighthouse-report.html
   ```

#### What to Check:

##### ✅ Performance Score
- [ ] Score ≥ 90 (aim for 95+)
- [ ] First Contentful Paint < 1.8s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Time to Interactive < 3.8s
- [ ] Cumulative Layout Shift < 0.1

##### ✅ Accessibility Score
- [ ] Score ≥ 90
- [ ] All images have alt text
- [ ] Color contrast meets WCAG AA
- [ ] Interactive elements are keyboard accessible
- [ ] ARIA labels are used correctly

##### ✅ Best Practices Score
- [ ] Score ≥ 90
- [ ] No console errors
- [ ] HTTPS (in production)
- [ ] No deprecated APIs
- [ ] Images are optimized

##### ✅ SEO Score
- [ ] Score ≥ 90
- [ ] Meta tags present
- [ ] Descriptive titles
- [ ] Proper heading structure

---

### 🐛 Common Issues & Solutions

#### Issue: Bottom sheet doesn't appear on mobile
**Solution:** Check viewport width is ≤ 640px. Clear browser cache and reload.

#### Issue: Keyboard navigation doesn't work
**Solution:** Ensure trait panel has focus. Check browser console for errors.

#### Issue: Horizontal scroll on mobile
**Solution:** Check safe-area CSS. Verify `overflow-x: hidden` is applied.

#### Issue: Performance issues
**Solution:** Enable FPS debug toggle (dev mode). Check for memory leaks. Verify debouncing is working.

#### Issue: Lighthouse scores low
**Solution:** Run production build (`npm run build && npm run preview`). Check image optimization. Verify lazy loading is working.

---

### 📝 QA Report Template

When reporting issues, include:

```markdown
**Device/Viewport:** iPhone 12 Pro (390 × 844)
**Browser:** Chrome 120
**Issue:** [Description]
**Steps to Reproduce:**
1. Step one
2. Step two
3. Step three
**Expected:** [What should happen]
**Actual:** [What actually happens]
**Screenshots:** [If applicable]
**Console Errors:** [If any]
```

---

## 🎮 Using the App

### Screensaver 💤

The app includes a Windows 98-style screensaver that activates after 2 minutes of idle time:

- **Activation**: Screensaver appears automatically after 2 minutes (120 seconds) of idle time with no mouse movement, keyboard input, or touch
- **Dismissal**: 
  - Move mouse anywhere
  - Click anywhere on the screen
  - Press any key (except modifier keys: Ctrl, Alt, Shift, Meta)
  - Touch the screen (mobile)
  - A dismiss hint appears after 2 seconds: "Click or press any key to return"
  - Plays click sound on dismiss (if sounds are enabled)
- **Visual**: 
  - Full-screen overlay with Windows 98 blue background (#000080)
  - Floating animated orange-themed emojis (🍊, 🍋, 🥤, 🌴, ☀️, 🧡, 🔶, 🟠, 🌅, 🏝️)
  - Bouncing "Tang Gang" text with Windows 98 font styling
  - Smooth animations using CSS and requestAnimationFrame
- **Auto-Disable**: Screensaver automatically disables when:
  - CyberTang generation is in progress (`isTangifying`)
  - Any window is open and focused (`hasActiveWindows`)
  - User is typing in an input or textarea field (`isInputFocused`)
  - A modal or dialog is open (`isModalOpen`)

**Important Notes:**
- The idle timer tracks: `mousedown`, `mousemove`, `keydown`, `touchstart` events
- The timer does NOT reset on: `scroll` or `visibilitychange` (tab switching doesn't reset the timer)
- Screensaver has `aria-hidden="true"` for accessibility (screen readers ignore it)
- Idle timeout is configurable (default: 120000ms / 2 minutes)

### Sound Effects 🔊

The app includes Windows 98-style sound effects that enhance the nostalgic experience:

- **Startup Sound**: Plays when the app loads (after user interaction, per browser audio policy)
- **Button Clicks**: Play a click sound when clicking any button
- **Window Operations**: 
  - `window-open.mp3` plays when opening windows
  - `window-close.mp3` plays when closing windows
- **System Events**:
  - `success.mp3` plays when CyberTang generation succeeds
  - `error.mp3` plays when CyberTang generation fails
  - `trash.mp3` plays when moving items to the recycle bin
  - `empty-trash.mp3` plays when emptying the recycle bin
- **Mute Toggle**: Click the speaker icon (🔊/🔇) in the system tray to mute/unmute all sounds
- **Persistence**: Mute preference is saved in localStorage and persists across sessions

**Adding Sound Files:**

Sound files should be placed in the `public/sounds/` directory:
- `click.mp3` - Short click sound (~50ms)
- `success.mp3` - Success chime (~500ms)
- `error.mp3` - Error bonk (~300ms)
- `trash.mp3` - Trash/crumple sound (~400ms)
- `empty-trash.mp3` - Empty recycle bin sound (~600ms)
- `startup.mp3` - Windows 98 startup sound (~3s)
- `window-open.mp3` - Window opening whoosh (~200ms)
- `window-close.mp3` - Window closing sound (~200ms)

**Note:** If sound files are missing, the app will continue to work normally - sounds simply won't play. You can use free Windows 98 sound files or create custom retro sounds. The sound manager handles missing files gracefully.

**Troubleshooting:**
- If sounds don't play, check that:
  - Sound files exist in `public/sounds/`
  - Browser audio isn't muted at the system level
  - Mute toggle isn't enabled in the system tray
  - Browser allows audio playback (some browsers require user interaction first)

### Startup Sequence

- On first load, you'll see a Windows 98-style startup sequence with Tang Gang branding
- **Press any key** to skip the startup sequence
- The sequence shows once per browser session (uses sessionStorage)
- After startup, the desktop appears with all your icons and windows

### Keyboard Shortcuts ⌨️

The app supports Windows 98-style keyboard shortcuts that work when the desktop is focused (no windows are active):

- **`Delete`** - Delete selected icons (moves to Recycle Bin)
- **`Ctrl+A` / `Cmd+A`** - Select all desktop icons
- **`F5`** - Refresh page
- **`Enter`** - Open first selected icon
- **`Ctrl+Z` / `Cmd+Z`** - Undo last deletion (restores last deleted icon)
- **`F2`** - Rename selected icon (single selection only, placeholder - TODO)
- **`Escape`** - Deselect all icons

**Important Notes:**
- Shortcuts only work when the desktop is focused (no windows are active)
- Shortcuts are disabled when typing in input fields or textareas
- Selection state is lost when page refreshes
- Undo only supports single undo (last deleted icon)
- Multi-select is supported via `Ctrl+Click` / `Cmd+Click` and `Shift+Click` on icons

### Opening Windows

- **Click window titles** in the taskbar to open/close windows
- **Drag windows** by clicking and holding the title bar
- **Minimize/Maximize** using the window controls
- **Close windows** with the X button
- **Select desktop icons** by clicking them (hold `Ctrl`/`Cmd` or `Shift` for multi-select)
- Windows play sounds when opening and closing (if sounds are enabled)

### Desktop Icons & Selection

- **Double-click** desktop icons to open applications or view images
- **Right-click** icons for context menu with options:
  - Open (or double-click)
  - Download - Save the image to your computer
  - Rename (F2) - Rename the icon (coming soon)
  - Delete (Del key or drag to Recycle Bin) - Move to Recycle Bin
  - Properties - View file details, size, creation date, and traits
- **Click and drag** on empty desktop space to create a selection box (marquee) for selecting multiple icons
- **Shift+Click** or **Ctrl+Click** (Cmd+Click on Mac) to add icons to selection
- Selected icons show a blue highlight - use keyboard shortcuts to perform batch operations
- **Escape** key deselects all icons

### Keyboard Shortcuts ⌨️

The app supports Windows 98-style keyboard shortcuts for desktop operations:

- **`Delete`** - Delete selected icons (moves to Recycle Bin)
- **`Ctrl+A` / `Cmd+A`** - Select all icons
- **`F5`** - Refresh page
- **`Enter`** - Open first selected icon
- **`Ctrl+Z` / `Cmd+Z`** - Undo last deletion (restores last deleted icon)
- **`F2`** - Rename selected icon (single selection only, placeholder - TODO)
- **`Escape`** - Deselect all icons

**Important Notes:**
- Shortcuts only work when the desktop is focused (no windows are active)
- Shortcuts are disabled when typing in input fields or textareas
- Selection state is lost when page refreshes
- Undo only supports single undo (last deleted icon)
- Multi-select is supported via `Ctrl+Click` / `Cmd+Click` and `Shift+Click` on icons

### Sound Effects

The app includes authentic Windows 98-style sound effects:

- **Button clicks** - Plays on all button interactions
- **Window open/close** - Plays when opening or closing windows
- **System events** - Success/error sounds for operations
- **Drag and drop** - Trash sound when deleting items
- **Mute toggle** - Click the speaker icon (🔊/🔇) in the system tray to mute/unmute
- Mute state is saved in localStorage and persists across sessions

**Note:** Sound files need to be placed in `public/sounds/` directory. If sounds are missing, the app works normally but silently fails (graceful degradation).

### Properties Window

- Right-click any desktop icon and select **"Properties"**
- View detailed information:
  - **General tab**: Icon preview, filename, file size, creation date
  - **Traits tab**: Detailed trait information (for wojak images)
- Click **OK** to close the properties window

### Wallpaper Selector

- Access through the **Start menu** → Settings (or right-click desktop → Properties → Display)
- Choose from various wallpapers or solid colors
- Preview your selection before applying
- Click **Apply** to see changes without closing
- Click **OK** to apply and close
- Wallpaper choice is saved in localStorage and persists across sessions

### Drag and Drop

- **Drag icons** on the desktop to move them
- **Drag icons to Recycle Bin** to delete them
- The Recycle Bin animates (shakes) when you drag items over it
- Icons fade slightly while dragging for visual feedback

### Wojak Creator

1. Open the **"WOJAK_CREATOR.EXE"** window
2. Select layers from the dropdowns:
   - **Background** - Choose from scenes, plain backgrounds, or $CASHTAG backgrounds
   - **Base** - Select the base wojak body
   - **Clothes** - Choose clothing/outfits (some may disable other layers)
   - **Eyes** - Select eye accessories (glasses, shades, etc.)
   - **Head** - Choose head traits (may be disabled by certain clothes)
   - **Mouth(Base)** - Select base mouth traits
   - **Mouth(Item)** - Select mouth items (cigarettes, joints, etc.)
   - **Facial Hair** - Choose facial hair options
   - **Mask** - Select mask overlays
3. **Smart Rules**: The creator automatically enforces compatibility rules to prevent incompatible layer combinations. Disabled layers show a reason message, and previously selected items are automatically cleared when rules apply.
4. Preview updates automatically as you select layers
5. Export your creation:
   - Click **"Export as PNG"** to download
   - Click **"Copy to Clipboard"** to copy
6. **Tangify your wojak** (AI transformation):
   - Click the **"Tangify"** button (between Download and Mint)
   - Watch the Windows 98-style progress bar as your wojak is transformed
   - Toggle between **"Show Original"** and **"Show Tangified"** to compare views
   - The original canvas is preserved - you can always switch back
   - Note: Requires OpenAI API key configured in Cloudflare Pages (see Deployment section)

### Marketplace

The marketplace UI is gated behind an admin-controlled flag:

1. Open the **"MARKETPLACE - P2P OFFERS"** window (when enabled)
2. Filter by token group using the buttons
3. Toggle **"Show only NFTs with offers"** to filter
4. Click any NFT card to view details and offer file
5. Copy offer files to use in Chia wallet

If the marketplace is **not enabled**:

- Clicking **MARKETPLACE** in the Start menu will show a Windows 98-style dialog saying **"Marketplace not active yet."**
- The main marketplace window will not open from the Start menu while disabled.

To enable the marketplace as an admin:

1. Navigate to `/admin-enable` in your browser and log in with the admin password  
2. Or, click **MARKETPLACE** in the Start menu while it is disabled, then use the admin login + toggle in the dialog window  
3. Once enabled, the marketplace entry point in the Start menu will open the marketplace window normally

### Paint Window

1. Click **"Paint"** in the taskbar
2. Use JS Paint tools to edit images
3. Click images in the sidebar to insert into Paint
4. Save your creations!

### Tang Gang Window

1. The **Tang Gang** window displays community information
2. Shows links and resources for the Tang Gang community
3. Automatically visible on desktop (not minimized on startup)

### Wojak Creator Rules System

The Wojak Creator includes a smart rules system that prevents incompatible layer combinations. Rules are defined in `src/utils/wojakRules.js` and are automatically enforced when selecting layers. Disabled layers show a reason message, and previously selected items in disabled layers are automatically cleared when rules apply.

---

## 🧠 Wojak Creator Internals Reference

If you need to understand or change how the **Wojak Creator** works under the hood (layer order, rules, virtual layers, randomization, etc.), see:

- `WOJAK_CREATOR_LOGIC.md`
  - Explains where each part of the system lives:
    - Window + layout: `src/components/windows/WojakCreator.jsx`
    - State + rendering: `src/hooks/useMemeGenerator.js` and `MemeCanvas`
    - Layer order and virtual layers: `src/lib/memeLayers.js`
    - Image manifest and trait options: `src/lib/memeImageManifest.js`
    - Rules engine: `src/utils/wojakRules.js`
  - Includes guidelines for:
    - Adding new traits
    - Changing trait compatibility rules
    - Adjusting draw order / visual stacking

Treat `WOJAK_CREATOR_LOGIC.md` as the **canonical map** of how the Wojak Creator logic fits together so you never lose track of the important pieces.

### Admin Panel

1. Navigate to `/admin-enable` in your browser
2. Access administrative features
3. Use for managing the application settings

---

## 💻 Development with Cursor

Cursor is an AI-powered IDE that makes development way easier. This project is set up with Cursor-specific rules and commands to help you (and Abit) build features quickly and consistently.

**What's included:**
- Custom Cursor rules for creating windows and features
- Commands for updating README and creating components
- Mac-focused development guidelines
- Tang Gang vibes built into the AI context

Here's how to use it with this project:

### Opening Project in Cursor

1. **Install Cursor** from [cursor.sh](https://cursor.sh/)
2. **Open Cursor**
3. **File → Open Folder** → Select the `wojak-ink` folder
4. That's it! Cursor will index your project

### Using Cursor AI Features

#### Adding New Features

1. **Open Cursor Chat** (`Cmd + L` on Mac)
2. **Describe what you want to add**, for example:
   ```
   Add a new window that shows NFT statistics
   ```
3. Cursor will generate the code for you
4. Review and test the code
5. Commit your changes

**Pro Tip:** Use the `/create-window` command in Cursor Chat to quickly scaffold new windows!

#### Editing Existing Code

1. **Select the code** you want to modify
2. **Open Cursor Chat** (`Cmd + L`)
3. **Ask for changes**, for example:
   ```
   Make the marketplace window wider and add pagination
   ```
4. Cursor will suggest edits
5. Accept or modify as needed

#### Best Practices with Cursor

- ✅ **Be specific** in your requests
- ✅ **Review generated code** before committing
- ✅ **Test everything** Cursor creates
- ✅ **Use Cursor for boilerplate** - saves tons of time
- ✅ **Ask Cursor to explain code** if you're confused

#### Example: Adding a New Window

```bash
# 1. Ask Cursor: "Create a new window component called StatsWindow"
# 2. Cursor creates: src/components/windows/StatsWindow.jsx
# 3. Add it to App.jsx:
import StatsWindow from './components/windows/StatsWindow'

# 4. Add to JSX:
<StatsWindow />

# 5. Test it!
```

### Cursor Keyboard Shortcuts (Mac)

- `Cmd + L` - Open Cursor Chat
- `Cmd + K` - Inline edit
- `Cmd + Shift + L` - Composer (multi-file edits)

### Cursor Commands

This project includes custom Cursor commands to help with development:

- **`/update-readme`** - Updates README.md following project guidelines
  - Use after adding features, changing dependencies, or modifying setup
  - Automatically ensures Mac-focused instructions
  - Maintains Tang Gang vibes and beginner-friendly tone

- **`/create-window`** - Creates a new window component
  - Generates boilerplate code using the base Window component
  - Provides integration code for App.jsx
  - Includes taskbar integration template

- **`/readme`** - Quick README update command
  - Fast way to update README after changes

**How to use:** Type the command in Cursor Chat (e.g., `/update-readme`) and Cursor will guide you through the process!

### Common Cursor Tasks

**"Add a new feature to filter NFTs by price"**
- Cursor will modify MarketplaceWindow.jsx
- Add filter logic
- Update UI
- **Remember:** Use `/update-readme` after to document the change!

**"Fix the window dragging bug"**
- Cursor will check Window.jsx
- Fix z-index or event handling
- Test the fix

**"Add error handling to the Wojak Creator"**
- Cursor will add try-catch blocks
- Add user-friendly error messages
- Update error boundaries

**"Create a new settings window"**
- Use `/create-window` command
- Cursor will generate the component
- Add to App.jsx automatically
- **Remember:** Update README with `/update-readme`!

---

## 🏗️ Building for Production

### Create Production Build

```bash
npm run build
```

This creates an optimized production build in the `dist/` folder.

**What happens:**
- Wojak creator manifest is generated automatically (runs `generate-meme-manifest` script)
- Code is minified and optimized
- Assets are processed and optimized
- Source maps are generated (for debugging)
- Build output is ready for deployment

**Note:** The build script automatically runs `generate-meme-manifest` before building. This ensures the wojak creator layer manifest is up-to-date.

### Preview Production Build

Before deploying, test the production build locally:

```bash
npm run preview
```

This serves the `dist/` folder at `http://localhost:4173` so you can test the production version.

### Build Output

After building, you'll have:

```
dist/
├── index.html          # Main HTML file
├── assets/
│   ├── index-xxx.js   # Bundled JavaScript
│   ├── index-xxx.css  # Bundled CSS
│   └── ...            # Other assets (images, fonts)
└── ...                # Other static files
```

**Important:** The `dist/` folder is what you deploy, NOT the `src/` folder!

---

## 🚀 Deployment

### Option 1: Vercel (Recommended - Easiest)

Vercel is perfect for React apps and has great free tier:

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```
   Follow the prompts - Vercel will detect it's a Vite app automatically!

4. **Production Deploy:**
   ```bash
   vercel --prod
   ```

**That's it!** Vercel gives you a URL like `wojak-ink.vercel.app`

### Option 2: Netlify

1. **Install Netlify CLI:**
   ```bash
   npm i -g netlify-cli
   ```

2. **Login:**
   ```bash
   netlify login
   ```

3. **Build and Deploy:**
   ```bash
   npm run build
   netlify deploy --prod --dir=dist
   ```

### Option 3: GitHub Pages

1. **Install gh-pages:**
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Add to package.json:**
   ```json
   "scripts": {
     "deploy": "npm run build && gh-pages -d dist"
   }
   ```

3. **Update vite.config.js:**
   ```js
   export default defineConfig({
     base: '/wojak-ink/', // Your repo name
     // ... rest of config
   })
   ```

4. **Deploy:**
   ```bash
   npm run deploy
   ```

### Option 4: Docker Production Deployment (Recommended for Self-Hosting)

See the [Docker Setup](#-docker-setup) section for complete instructions on deploying with Docker Compose and Cloudflare tunnel.

### Option 5: Cloudflare Pages (Recommended for Tangify Feature)

Cloudflare Pages is recommended if you want to use the **Tangify feature** (AI-generated realistic wojak transformations).

1. **Install Wrangler CLI:**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare:**
   ```bash
   wrangler login
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

4. **Deploy to Cloudflare Pages:**
   ```bash
   wrangler pages deploy dist
   ```

5. **Set OpenAI API Key:**
   - Go to your Cloudflare Pages dashboard
   - Navigate to your project → Settings → Environment Variables
   - Add environment variable:
     - **Name:** `OPENAI_API_KEY`
     - **Value:** Your OpenAI API key (starts with `sk-`)
   - Save the environment variable

6. **Verify the Tangify function:**
   - The Cloudflare Pages Function at `functions/api/tangify.js` will automatically be deployed
   - Test by using the Tangify button in the Wojak Creator

**Important Notes:**
- ⚠️ **REQUIRED:** After deploying to Cloudflare Pages, you MUST add the `OPENAI_API_KEY` environment variable:
  1. Go to your Cloudflare Pages dashboard
  2. Navigate to your project → Settings → Environment Variables
  3. Add a new environment variable:
     - **Name:** `OPENAI_API_KEY`
     - **Value:** Your OpenAI API key (starts with `sk-`)
     - **Environment:** Production (and Preview if you want to test)
  4. Save and redeploy if necessary
- The Tangify feature requires a valid OpenAI API key with DALL-E 3 access
- API calls are made server-side through the Cloudflare Pages Function (your API key stays secure)
- The function handles CORS automatically
- Each Tangify operation uses one DALL-E 3 API call (check OpenAI pricing)

### Option 6: Traditional Hosting (cPanel, etc.)

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Upload `dist/` folder contents** to your web server's `public_html` or `www` folder

3. **Configure your server** to serve `index.html` for all routes (SPA routing)

### Environment Variables

**For Docker Deployment:**
- Required: `CLOUDFLARE_TUNNEL_TOKEN` (see Docker Setup section)
- Optional: `ENABLE_NO_CACHE` (for no-cache headers)

**For Cloudflare Pages (Tangify Feature):**
- Required: `OPENAI_API_KEY` - Your OpenAI API key for DALL-E 3 image generation
  - Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
  - **For local development:** Create a `.env` file in the project root with:
    ```env
    OPENAI_API_KEY=your-api-key-here
    ```
    Wrangler will automatically load this when running `wrangler pages dev`
  - **For production:** Set in Cloudflare Pages dashboard → Settings → Environment Variables
  - The key is used server-side only (never exposed to the browser)

**For Vite Build-Time Variables:**
If you need environment variables in your code (for API URLs, etc.):

1. **Create `.env` file** (or `.env.local` for local-only vars):
   ```env
   VITE_API_URL=https://api.example.com
   VITE_CHAIN_ID=mainnet
   ```

2. **Access in code:**
   ```js
   const apiUrl = import.meta.env.VITE_API_URL
   ```

3. **Important:** 
   - Variables must start with `VITE_` to be exposed to the browser
   - `.env` files are gitignored (use `.env.example` as template)
   - For production, set these in your hosting platform's environment variable settings

**Note:** Currently, the app doesn't require any Vite environment variables - all APIs are hardcoded. This section is here for future use!

### Post-Deployment Checklist

- [ ] Site loads without errors
- [ ] All images load correctly
- [ ] Windows can be dragged
- [ ] Wojak Creator works
- [ ] Marketplace loads (if you have offer files)
- [ ] Mobile responsive (test on phone)
- [ ] HTTPS is enabled
- [ ] Domain is configured (if using custom domain)

---

## 🐳 Docker Setup

### Docker Configuration

The project includes Docker support for easy development and production deployment.

#### Docker Files

- `Dockerfile` - Production build configuration for web container (nginx:alpine)
- `docker-compose.yml` - Container orchestration (web + Cloudflare tunnel)
- `nginx.conf` - Nginx configuration template with optional no-cache headers
- `docker-entrypoint.d/20-envsubst-no-cache.sh` - Script to enable/disable no-cache headers
- `.dockerignore` - Files to exclude from Docker builds
- `deploy.sh` - Automated deployment script
- `.env.example` - Environment variables template

#### Docker Production Deployment (Recommended)

This setup uses Docker Compose with two containers:
- **Web container** (`wojak-web`): Serves the `dist/` folder using nginx:alpine on port 3000 (maps to container port 80)
- **Tunnel container** (`wojak-tunnel`): Cloudflare tunnel for secure public access

**Container Details:**
- Web container includes health checks and auto-restart
- Both containers use a shared bridge network (`wojak-network`)
- Tunnel container depends on web container (waits for web to be ready)

##### Prerequisites

1. **Docker Desktop for Mac**: [Download here](https://www.docker.com/products/docker-desktop/)
2. **Cloudflare Tunnel Token**: Get from your Cloudflare Zero Trust dashboard

##### Quick Start

1. **Set up environment variables:**
   ```bash
   # Copy the example file
   cp .env.example .env
   
   # Edit .env and add your Cloudflare tunnel token
   # Required: CLOUDFLARE_TUNNEL_TOKEN=your-token-here
   # Optional: ENABLE_NO_CACHE=true (to enable no-cache headers)
   ```

2. **Make deploy script executable (first time only):**
   ```bash
   chmod +x deploy.sh
   ```

3. **Deploy using the script:**
   ```bash
   ./deploy.sh
   ```

   The script will:
   - Build the production `dist/` folder (includes meme manifest generation)
   - Stop existing containers
   - Rebuild Docker images
   - Start containers in detached mode
   - Show status and logs

4. **Access your app:**
   - Local: `http://localhost:3000`
   - Public: Via your Cloudflare tunnel URL (check Cloudflare dashboard)

**What the deploy script does:**
1. ✅ Checks for `.env` file and `CLOUDFLARE_TUNNEL_TOKEN`
2. ✅ Builds production `dist/` folder (runs `npm run build`)
3. ✅ Stops existing containers
4. ✅ Rebuilds Docker images from scratch
5. ✅ Starts containers in detached mode
6. ✅ Shows container status and recent logs

##### Manual Docker Commands

If you prefer to run commands manually (instead of using `deploy.sh`):

```bash
# Step 1: Build production dist
npm run build

# Step 2: Build Docker images
docker-compose build

# Step 3: Start containers in background
docker-compose up -d

# Or combine build and start:
docker-compose up -d --build
```

**Useful Docker Commands:**

```bash
# View all logs (both containers)
docker-compose logs -f

# View logs for specific container
docker-compose logs -f web
docker-compose logs -f tunnel

# Check container status
docker-compose ps

# Stop containers
docker-compose down

# Restart containers (without rebuilding)
docker-compose restart

# Rebuild from scratch (useful after dependency changes)
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

##### Environment Variables

Configure in `.env` file:

- **`CLOUDFLARE_TUNNEL_TOKEN`** (required): Your Cloudflare tunnel token
- **`ENABLE_NO_CACHE`** (optional): Set to `true` to enable no-cache headers for all files (default: `false`)

##### No-Cache Headers

By default, no-cache headers are **disabled** (browsers cache files for 1 year). To enable them:

1. Edit `.env` file
2. Set `ENABLE_NO_CACHE=true`
3. Restart containers: `docker-compose restart`

**What this does:**
- Enables no-cache headers for all files (HTML, CSS, JS, images)
- Disables default 1-year caching for static assets
- Ensures browsers always fetch the latest files
- Useful during active development/testing when you want fresh files every time

**How it works:**
- The `docker-entrypoint.d/20-envsubst-no-cache.sh` script modifies nginx config at container startup
- If `ENABLE_NO_CACHE=true`, it uncomments no-cache headers in `nginx.conf`
- If `ENABLE_NO_CACHE=false` or unset, default caching behavior is used

##### Troubleshooting Docker Deployment

**Containers won't start:**
```bash
# Check logs
docker-compose logs

# Verify .env file exists and has CLOUDFLARE_TUNNEL_TOKEN
cat .env

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

**Tunnel container fails:**
- Verify your `CLOUDFLARE_TUNNEL_TOKEN` is correct
- Check Cloudflare dashboard for tunnel status
- View tunnel logs: `docker-compose logs tunnel`

**Web container not serving files:**
- Verify `dist/` folder exists: `ls -la dist/`
- Check web container logs: `docker-compose logs web`
- Test locally: `curl http://localhost:3000`

**Port 3000 already in use:**
```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process (if safe to do so)
lsof -ti:3000 | xargs kill -9

# Or change port in docker-compose.yml
# Edit the ports section: "3001:80" instead of "3000:80"
# Then access at http://localhost:3001
```

**Deploy script fails:**
```bash
# Check if deploy.sh is executable
ls -l deploy.sh

# Make it executable if needed
chmod +x deploy.sh

# Verify .env file exists and has correct format
cat .env

# Run deploy script with bash explicitly
bash deploy.sh
```

**Health check fails:**
- Check web container logs: `docker-compose logs web`
- Verify nginx is running: `docker-compose exec web ps aux`
- Test health endpoint: `curl http://localhost:3000`
- Increase health check timeout if needed (edit docker-compose.yml)

#### Development with Docker (Not Recommended)

**Note:** Docker setup is optimized for production, not active development. For development, use `npm run dev` instead.

However, if you want to test the production build locally with Docker:

```bash
# Build production dist first
npm run build

# Start containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

**Why not use Docker for development?**
- No hot module replacement (HMR) - changes require full rebuild
- Slower iteration cycle (rebuild → restart containers)
- Standard `npm run dev` is much faster for active development

**Use Docker for:**
- ✅ Production deployment
- ✅ Testing production build locally
- ✅ Verifying Docker configuration
- ✅ Testing Cloudflare tunnel

#### Docker Benefits

- ✅ **Production-ready containerization** - Consistent environment across deployments
- ✅ **Easy Cloudflare tunnel integration** - Secure public access without port forwarding
- ✅ **Automated deployment workflow** - One script (`deploy.sh`) handles everything
- ✅ **Health checks** - Web container includes automatic health monitoring
- ✅ **Auto-restart** - Containers restart automatically if they crash
- ✅ **Optional no-cache headers** - Easy toggle for development vs production caching
- ✅ **Nginx optimization** - Gzip compression, proper MIME types, SPA routing
- ✅ **Security headers** - X-Frame-Options, X-Content-Type-Options, X-XSS-Protection

---

## 📁 Project Structure

```
wojak-ink/
├── public/                 # Static assets (served as-is)
│   ├── assets/            # Images, logos, etc.
│   ├── sounds/            # Sound effect files (click.mp3, window-open.mp3, etc.)
│   ├── wallpapers/        # Desktop wallpaper images
│   ├── wojak-creator/    # Wojak creator layer images (BACKGROUND, BASE, CLOTHES, EYE, HEAD, MOUTH, FACIAL_HAIR, MASK)
│   ├── jspaint/           # JS Paint application
│   └── fonts/             # MS Sans Serif fonts
├── src/                    # Source code
│   ├── components/        # React components
│   │   ├── ui/            # Reusable UI components (Button, ContextMenu, Toast, etc.)
│   │   ├── windows/       # Window components (PropertiesWindow, DisplayPropertiesWindow, etc.)
│   │   ├── desktop/       # Desktop-specific components (SelectionBox)
│   │   ├── effects/       # Visual effects (OrangeRain, Clippy)
│   │   ├── meme/          # Wojak creator components (LayerSelector, LayerPanel, etc.)
│   │   └── paint/         # Paint window components
│   ├── contexts/          # React contexts (state management)
│   ├── hooks/             # Custom React hooks (useContextMenu, useKeyboardShortcuts, etc.)
│   ├── lib/               # Library code (configs, manifests)
│   ├── services/          # API services (MintGarden, Dexie)
│   ├── utils/             # Utility functions (soundManager, easterEggs, wojakRules, etc.)
│   ├── data/              # Data files (CSV, etc.)
│   ├── App.jsx            # Main app component
│   ├── main.jsx           # Entry point
│   └── index.css          # Global styles
├── scripts/               # Utility scripts
│   ├── generate-meme-manifest.js  # Generates meme layer manifest
│   ├── download-wojak-images.js  # Downloads wojak images
│   └── discover-wojak-images.js   # Discovers wojak images
├── .cursor/               # Cursor IDE configuration
│   ├── commands/          # Custom Cursor commands
│   │   ├── update-readme.md      # README update command
│   │   ├── create-window.md      # Window creation command
│   │   └── readme.md             # Quick README command
│   └── rules/             # Cursor AI rules
│       ├── update-rules.mdc           # Main project rules
│       ├── project-context.mdc       # Project context
│       └── create-windows-features.mdc # Window/feature creation rules
├── dist/                  # Production build (generated)
├── docker-compose.yml     # Docker Compose configuration
├── Dockerfile             # Web container build file
├── nginx.conf             # Nginx configuration template
├── docker-entrypoint.d/   # Docker entrypoint scripts
│   └── 20-envsubst-no-cache.sh  # Script to enable/disable no-cache headers
├── deploy.sh              # Automated deployment script
├── .env.example           # Environment variables template
├── .env                   # Environment variables (create from .env.example)
├── .dockerignore          # Docker build exclusions
├── .gitignore             # Git ignore patterns
├── .prettierignore        # Prettier ignore patterns
├── index.html             # HTML template
├── vite.config.js         # Vite configuration
├── package.json           # Dependencies and scripts
└── README.md              # This file!
```

### Key Files Explained

- **`src/App.jsx`** - Main app component, renders all windows
- **`src/components/windows/Window.jsx`** - Base window component (dragging, z-index)
- **`src/components/windows/MarketplaceWindow.jsx`** - Marketplace functionality
- **`src/components/windows/WojakCreator.jsx`** - Wojak creator/meme generator
- **`src/components/windows/TangGangWindow.jsx`** - Tang Gang community window
- **`src/services/mintgardenApi.js`** - MintGarden API integration
- **`src/data/offerFiles.csv`** - Offer file data (one offer per line; legacy multi-column format also supported)
- **`scripts/generate-meme-manifest.js`** - Generates wojak creator layer manifest (runs before build)
- **`src/utils/wojakRules.js`** - Rules system for layer compatibility (prevents incompatible combinations)
- **`vite.config.js`** - Build configuration
- **`deploy.sh`** - Automated Docker deployment script
- **`docker-compose.yml`** - Docker Compose configuration for production
- **`.cursor/commands/`** - Custom Cursor commands (`/update-readme`, `/create-window`, `/readme`)
- **`.cursor/rules/`** - Cursor AI rules for consistent development (always applied)
- **`.cursor/commands/`** - Custom Cursor commands (`/update-readme`, `/create-window`)
- **`.cursor/rules/`** - Cursor AI rules for consistent development

---

## 🔧 Troubleshooting

### Sound Effects Not Playing

- Sound effects require audio files in `public/sounds/` directory
- If sound files are missing, the app will work but silently fail (graceful degradation)
- Check the mute toggle in the system tray (speaker icon) - sounds are muted if the icon shows 🔇
- Mute state is saved in localStorage and persists across sessions
- To add sounds, place `.mp3` files in `public/sounds/` with these names:
  - `click.mp3` - Button clicks
  - `window-open.mp3` - Window opening
  - `window-close.mp3` - Window closing
  - `trash.mp3` - Deleting items
  - `empty-trash.mp3` - Emptying recycle bin
  - `success.mp3` - Successful operations
  - `error.mp3` - Error notifications
  - `startup.mp3` - Startup sequence

### Selection Box Not Working

- Make sure you're clicking directly on the desktop background (not on icons or windows)
- Selection box only activates on empty desktop space
- Try clicking and dragging from a clear area of the desktop
- Selection is disabled while the gallery is loading

### Keyboard Shortcuts Not Working

- Keyboard shortcuts don't work when typing in input fields or text areas
- Make sure no window is focused that might be capturing keyboard events
- Some shortcuts require icons to be selected first (Delete, Enter, F2)

### Startup Sequence Showing Every Time

- Startup sequence should only show once per browser session
- If it shows every time, clear your browser's sessionStorage
- You can skip the startup sequence by pressing any key

### Common Issues

#### "Module not found" errors

```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Port 5173 already in use

```bash
# Find and kill the process using port 5173
lsof -ti:5173 | xargs kill -9

# Or use a different port:
npm run dev -- --port 3000
```

**Mac Tip:** If you get "permission denied", you might need to use `sudo` (not recommended) or check what's using the port:
```bash
lsof -i :5173  # See what's using the port
```

#### Build fails with memory error

```bash
# Increase Node memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

#### Windows don't drag properly

- Check browser console for errors
- Ensure `useDraggable` hook is working
- Verify z-index stacking in WindowContext

#### Images not loading

- Check that images exist in `public/` folder
- Verify image paths in code match actual file locations
- Check browser console for 404 errors

#### Marketplace not showing NFTs

- Verify `src/data/offerFiles.csv` or `public/offerFiles.csv` exists and has data
- For the **simple format**, ensure each non-empty line contains a valid offer string (with optional `offerFile` header)
- For the **legacy format**, use `nftId,offerFile,group`
- Ensure MarketplaceContext is loading the CSV correctly
- Check browser console for errors

#### Wojak Creator not working

- Verify images exist in `public/wojak-creator/`
- Check layer configuration in `src/lib/memeLayers.js`
- Ensure canvas is rendering (check browser console)
- Run `npm run generate-meme-manifest` to regenerate manifest if layers aren't showing
- Check that layer rules are working (e.g., Astronaut clothes should disable Head layer)
- Verify rules in `src/utils/wojakRules.js` if layer combinations aren't working as expected

#### Docker container health check fails

```bash
# Check web container logs
docker-compose logs web

# Test if nginx is responding
curl http://localhost:3000

# Check container status
docker-compose ps

# Restart web container
docker-compose restart web
```

#### Deploy script permission denied

```bash
# Make script executable
chmod +x deploy.sh

# Or run with bash explicitly
bash deploy.sh
```

**Mac Tip:** If `chmod +x` doesn't work, check file permissions:
```bash
ls -l deploy.sh  # Check current permissions
```

### Getting Help

1. **Check browser console** (F12) for errors
2. **Check terminal** for build errors
3. **Search the codebase** for similar issues
4. **Ask Cursor AI** - it's great at debugging!
5. **Check GitHub Issues** (if you have a repo)

---

## 🙏 Credits & Community

### Special Thanks

- **Bullish0xCrypto** - For gifting this project to Abit and the Tang Gang community 🚀
- **Abit** - The chad getting into AI development - you got this! 💪
- **Tang Gang** - For the culture, memes, and vibes that make this project special 🔥

### Resources

- **Chia Blockchain**: [chia.net](https://www.chia.net/)
- **MintGarden API**: [mintgarden.io](https://mintgarden.io/)
- **Dexie API**: [dexie.space](https://dexie.space/)
- **98.css**: [jdan.github.io/98.css](https://jdan.github.io/98.css/)
- **JS Paint**: [jspaint.app](https://jspaint.app/)

### Community Links

- Follow **Bullish0xCrypto** on X: [@Bullish0xCrypto](https://x.com/Bullish0xCrypto)
- Join the **Tang Gang** conversation
- Check out the **Chia NFT** community

---

## 📝 License

This project is a gift from Bullish0xCrypto. Use it, modify it, make it yours! 

(Add your license here - MIT, Apache, etc.)

---

## 🎉 You're All Set!

Abit, you've got everything you need to:
- ✅ Run the app locally
- ✅ Test all features
- ✅ Build for production
- ✅ Deploy to the web (with Docker + Cloudflare tunnel)
- ✅ Add new features with Cursor
- ✅ Manage your Wojak NFT collection
- ✅ Update the README as you develop (use `/update-readme` command!)

**Remember:** This is your project now. Break things, fix things, add things. That's how you learn! The Tang Gang has your back. 🔥

**Questions?** 
- Use Cursor AI (`Cmd + L` in Cursor)
- Check the code (it's well-commented)
- Use `/update-readme` to keep docs current
- Reach out to the community

**Quick Commands Reference:**
```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production
npm run preview                # Preview production build

# Docker (if using)
./deploy.sh                    # Deploy with Docker
docker-compose logs -f         # View logs
docker-compose down            # Stop containers

# Utilities
npm run generate-meme-manifest # Generate meme manifest

# QA Testing
npm run qa:mobile      # Start dev server for mobile QA testing
npm run qa:desktop    # Start dev server for desktop QA testing
npm run qa:lighthouse # Start dev server for Lighthouse audit
```

---

*Built with ❤️ for the Tang Gang and the Chia community. Keep building, keep vibing, keep winning.* 🚀

**Now go make some memes and show off those Wojaks!** 🎨✨
