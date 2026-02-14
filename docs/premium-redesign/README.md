# Premium Visual Upgrade — Handoff Plan

## Overview

Transform Wojak.ink from amateur-looking to premium/high-end dark UI through **coherence and restraint**. The core problem is that each page was styled independently — BigPulp uses inline styles, Leaderboard has custom glass morphism, Shop has custom gradients. The fix is theme-first: establish the design system in `theme.css`, then align every page.

## Phase Files

Execute in order. Each phase is independent and can be committed separately.

| Phase | File | Scope | Impact |
|-------|------|-------|--------|
| **A** | `PART-A-THEME-FOUNDATION.md` | `theme.css` global variables | HIGHEST — cascades to all pages |
| **B** | `PART-B-NAVIGATION.md` | Header, Sidebar, MobileNav | HIGH — affects every page's chrome |
| **C** | `PART-C-PAGE-ALIGNMENT.md` | All pages individually | MEDIUM — page-by-page coherence |
| **D** | `PART-D-COHERENCE-CHECK.md` | Cross-page verification | FINAL — ensure everything matches |

## Supporting Files

| File | Purpose |
|------|---------|
| `DESIGN-REFERENCE.md` | Premium dark UI design principles, research-backed CSS values |

## How to Hand Off to Claude CLI

For each phase, give Claude CLI:
```
Read docs/premium-redesign/PART-A-THEME-FOUNDATION.md and implement all changes described. After each section, run the dev server and verify visually. Commit after each part.
```

## Key Rules for Implementation
- ALL visual styles go in `src/styles/theme.css` (not new CSS files)
- Tailwind is for layout ONLY (flex, grid, gap, padding, margin, width)
- NEVER use `!important`
- NEVER add new CSS files for styling — edit theme.css or replace inline styles with CSS variables
- Keep the BigPulp character/speech bubble white (user preference)
- Keep NFT art and orange grove scenes bright (character identity)
- Generator is the visual benchmark — other pages should match its polish level
