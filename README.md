# Wojak.ink

> Tang Gang OS — where memes become NFTs on Chia

[![Live Site](https://img.shields.io/badge/Live-wojak.ink-orange?style=for-the-badge)](https://wojak.ink)
[![Chia Blockchain](https://img.shields.io/badge/Blockchain-Chia-green?style=for-the-badge)](https://www.chia.net/)
[![Wojak Farmers Plot](https://img.shields.io/badge/Wojak_Farmers_Plot-4,200_NFTs-blue?style=for-the-badge)](https://mintgarden.io/collections/wojak-farmers-plot)
[![Your Wojak](https://img.shields.io/badge/Your_Wojak-Create_%26_Mint-purple?style=for-the-badge)](https://wojak.ink/generator)

---

## What is this?

The community hub for two NFT collections on the Chia blockchain:

**[Wojak Farmers Plot](https://mintgarden.io/collections/wojak-farmers-plot)** — 4,200 hand-crafted NFTs. The original collection. Browse them, analyze their traits, track their market.

**Your Wojak** — A new kind of NFT collection. You create your own art using the layers from Wojak Farmers Plot. Full artistic control over what you're making — and you earn **10% royalty on your creation forever**, enforced on-chain by the Chia blockchain.

Browse, create, analyze, compete. All of it on-chain, all of it community-built.

**Live at** [wojak.ink](https://wojak.ink)

---

## Wojak Generator

The main event. Build your own Wojak layer-by-layer, preview it in real-time, and mint it as a **Your Wojak** NFT.

- **Full artistic control** — You're the artist. Pick every layer, every detail
- **Multi-layer composition** — Base, head, eyes, mouth, clothing, background + extras
- **14 character types** — Wojak, Soyjak, Waifu, Baddie, Papa Tang, Chad, Bepe, and more
- **Smart layer rules** — Masks hide mouths, hats adjust to heads, combinations just work
- **Mood-aware naming** — Every Wojak gets a generated name based on its traits
- **On-chain minting** — Connect your Sage wallet, mint your creation as a Chia NFT
- **10% creator royalty** — Earn royalties on every resale, enforced on-chain forever
- **Favorites** — Save and revisit your best builds

## BigPulp Intelligence

AI-powered NFT analysis that actually knows things about Wojaks.

- **NFT lookup** — Search any Wojak by number or hit "Surprise Me"
- **Trait analysis** — Rarity rankings, attribute breakdowns, high provenance detection
- **Market insights** — Floor price, listings, price distribution heatmap
- **Named combos** — Discover trait combinations with community-given names
- **Sales history** — 750+ trades tracked with CAT token support

## Gallery

Browse all 4,200 Wojaks with filtering, infinite scroll, and detailed trait views.

- **14 character type filters** — Find your favorite variant fast
- **Tap to inspect** — Traits, rarity score, sales history, current listings
- **Desktop enhanced** — Preview cards with thumbnail strip navigation
- **Smart preloading** — Images load before you need them

## Arcade

16 mini-games with leaderboards, sound effects, haptic feedback, and in-game currency.

- **Easy** — Memory Match, Color Reaction, Orange Snake, Citrus Drop, Wojak Whack
- **Medium** — Orange Pong, Merge 2048, Block Puzzle, Brick Breaker, Orange Wordle
- **Hard** — Flappy Orange, Wojak Runner, Orange Stack, Knife Game, Orange Juggle, Combat Arena
- **Leaderboards** — Server-side scoring, daily/weekly/monthly payouts
- **Economy** — Earn oranges and gems, spend them in the shop

## More Features

- **Treasury** — Community wallet visualization with interactive crypto bubbles
- **Economy System** — Dual-currency (oranges + gems) with anti-cheat protection
- **Social** — Friends, guilds, profiles, achievements
- **Shop** — Cosmetic items and avatar customization

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript |
| Build | Vite |
| State | TanStack Query + Zustand |
| Animation | Framer Motion |
| Styling | Tailwind CSS v4 + custom theme |
| Auth | Clerk |
| Hosting | Cloudflare Pages |
| API | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| Blockchain | MintGarden, Dexie, SpaceScan APIs |

---

## Development

```bash
# Install
npm install

# Dev server (accessible on local network for phone testing)
npm run dev -- --host

# Lint
npm run lint:scoped

# Build
npm run build

# Deploy
npx wrangler pages deploy dist --project-name=wojak-ink
```

---

## Links

- [wojak.ink](https://wojak.ink) — Live app
- [@MoJuiceX](https://twitter.com/MoJuiceX) — Twitter
- [Wojak Farmers Plot](https://mintgarden.io/collections/wojak-farmers-plot) — Collection on MintGarden

---

*Built with memes and XCH by the Tang Gang*
