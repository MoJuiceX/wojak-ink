# 🚀 Wojak Ink - Windows 98 Style NFT Showcase

> **A special gift from [Bullish0xCrypto](https://x.com/Bullish0xCrypto) to Abit for his upcoming Wojak NFT collection on Chia** 🎁

Welcome to **Wojak Ink** - a retro Windows 98-style web application that showcases your Wojak NFT collection with style, memes, and pure Tang Gang energy. This app brings together the best of both worlds: nostalgic Windows 98 aesthetics and modern web3 functionality for the Chia blockchain.

> **🔒 Wallet Note:** This site is **Chia-only** and does **not** use MetaMask or any EVM wallet providers. All NFT interactions are through the Chia blockchain.

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
- **🛒 Marketplace Integration**: P2P offer file management with MintGarden/Dexie APIs
- **🖼️ Gallery**: Browse your NFT collection with hover effects
- **🎨 Paint Window**: Full JS Paint integration for meme editing
- **📋 Offer File Management**: Copy, view, and manage Chia offer files
- **🔔 Toast Notifications**: Windows 98-style popup notifications
- **📱 Responsive Windows**: Draggable, resizable windows with proper z-index stacking
- **👥 Tang Gang Window**: Community information and links
- **⚙️ Admin Panel**: Administrative features (accessible via route)
- **🍊 TangGang Smash Mini-Game**: Drag the TangGang window to spawn oranges that accumulate on the ground. Smash them with the window to create epic juice splashes! Score resets on refresh, and the Treasure message is just a joke.

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

If you have offer files in `src/data/offerFiles.csv`:

1. The marketplace should automatically load them
2. NFTs should appear in the marketplace window
3. Clicking an NFT should show the offer file modal
4. Copying the offer file should work

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
- [ ] Keyboard shortcuts work (if any)

##### ✅ Mouse Interactions
- [ ] Hover effects work (tooltips, button states)
- [ ] Click interactions are responsive
- [ ] Drag and drop works (windows, oranges)
- [ ] Right-click context menus (if any)

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

### Opening Windows

- **Click window titles** in the taskbar to open/close windows
- **Drag windows** by clicking and holding the title bar
- **Minimize/Maximize** using the window controls
- **Close windows** with the X button

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

### Marketplace

1. Open the **"MARKETPLACE - P2P OFFERS"** window
2. Filter by token group using the buttons
3. Toggle **"Show only NFTs with offers"** to filter
4. Click any NFT card to view details and offer file
5. Copy offer files to use in Chia wallet

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

### Option 5: Traditional Hosting (cPanel, etc.)

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
│   ├── wojak-creator/    # Wojak creator layer images (BACKGROUND, BASE, CLOTHES, EYE, HEAD, MOUTH, FACIAL_HAIR, MASK)
│   ├── jspaint/           # JS Paint application
│   └── fonts/             # MS Sans Serif fonts
├── src/                    # Source code
│   ├── components/        # React components
│   │   ├── ui/            # Reusable UI components
│   │   ├── windows/       # Window components
│   │   ├── meme/          # Wojak creator components (LayerSelector, LayerPanel, etc.)
│   │   └── paint/         # Paint window components
│   ├── contexts/          # React contexts (state management)
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Library code (configs, manifests)
│   ├── services/          # API services (MintGarden, Dexie)
│   ├── utils/             # Utility functions (wojakRules.js for layer compatibility rules)
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
- **`src/data/offerFiles.csv`** - Offer file data (NFT IDs and offer files)
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

- Verify `src/data/offerFiles.csv` exists and has data
- Check CSV format: `nftId,offerFile,group`
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
