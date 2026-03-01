# Mood-Aware Name Randomizer — Design Doc

**Date:** 2026-03-01
**Status:** Approved
**Author:** Claude CLI + User

---

## Problem

The current name randomizer only uses **clothing** as a signal for which name pool to draw from. This means a Wojak with middle finger + beer hat + screaming expression wearing a T-shirt gets names like "Comfy Fren" — completely wrong for what the picture actually expresses.

## Solution

Replace clothing-only theming with a **mood-tag resolution system** that reads ALL equipped traits, weights them by visual dominance, resolves a primary + secondary mood, and generates names from mood-specific pools with deep cultural references.

## Design Decisions

1. **Approach A (Mood-Tag Resolution)** chosen over Trait-Category Voting and Hybrid approaches
2. **Deep cultural references** — crypto, gaming, internet culture, Wojak lore, Tang Gang, Chia lore
3. **Fully random** every click (no seeded determinism)
4. **No external dependencies** — pure TypeScript, no libraries
5. **15-character max** constraint preserved

---

## Architecture

```
All Traits (Face, Clothes, Head, Face Wear, Mouth, Extras, Background)
       │
       ▼
  Mood Tagger ─── maps each trait → MoodTag[], weighted by tier
       │
       ▼
  Mood Resolver ── counts weighted tags, returns primary + secondary mood
       │
       ▼
  Pool Selector ── MOOD_POOLS[primary] + MOOD_COMBOS[primary][secondary]
       │
       ▼
  Name Generator ── random pattern selection, cross-mood blending
       │
       ▼
  "Rekt Em All" (fits the actual picture)
```

---

## 1. Mood Tag Vocabulary (16 tags)

| Mood Tag | Vibe | Culture Region |
|----------|------|---------------|
| `aggressive` | Rage, violence, war, destruction | Gaming (FPS, PvP), internet rage |
| `rebellious` | Middle fingers, anarchy, anti-establishment | Internet culture, punk |
| `degen` | Gambling, risk, YOLO, ape-in | Crypto, trading |
| `chill` | Relaxed, comfy, zen, unbothered | Wojak "comfy" lore |
| `goofy` | Clown, meme, absurd, honk | Internet humor, shitposting |
| `elite` | Power, wealth, boss, alpha | Crypto whales, gaming ranked |
| `dark` | Edgy, villain, doom, shadow | Gaming villains, doomer lore |
| `mystical` | Magic, arcane, ancient, wizard | Fantasy gaming, RPG |
| `warrior` | Military, tactical, honor, combat | FPS, strategy games, military |
| `cosmic` | Space, galaxy, transcendence | Sci-fi, "to the moon" crypto |
| `wholesome` | Kind, farmer, community, faith | Chia farming, Tang Gang community |
| `nerdy` | Tech, data, analysis, big brain | Dev culture, "galaxy brain" meme |
| `chaotic` | Unpredictable, cursed, unhinged | Shitposting, "this is fine" |
| `spooky` | Horror, undead, nightmare | Halloween culture, horror games |
| `party` | Drinking, celebration, hype, LFG | Party culture, "wagmi" energy |
| `grinder` | Hustle, speedrun, no-life, sweat | Gaming grind culture |

---

## 2. Trait Dominance Weights

| Tier | Categories | Weight | Rationale |
|------|-----------|--------|-----------|
| Tier 1 (3x) | Clothes, Extras | 3 | Full-body coverage or hand actions define the picture |
| Tier 2 (2x) | Head, Face Wear, Face | 2 | Strong personality/identity signal |
| Tier 3 (1x) | Mouth, Background | 1 | Flavor/scene details |

---

## 3. Complete Trait-to-Mood Mappings

### Face (Expression) — Tier 2
| Trait | Mood Tags |
|-------|-----------|
| Classic | `chill`, `degen` |
| Rekt | `dark`, `degen` |
| Rugged | `grinder`, `warrior` |
| Bleeding Bags | `dark`, `degen` |
| Terminator | `aggressive`, `dark` |
| NPC | `goofy`, `nerdy` |

### Head — Tier 2
| Trait | Mood Tags |
|-------|-----------|
| Beer Hat | `party`, `rebellious` |
| Crown | `elite`, `warrior` |
| Wizard Hat | `mystical`, `dark` |
| Devil Horns | `dark`, `chaotic` |
| Tin Foil Hat | `nerdy`, `chaotic` |
| Military Beret | `warrior`, `grinder` |
| Propeller Hat | `goofy`, `nerdy` |
| Clown | `goofy`, `chaotic` |
| Viking Helmet | `warrior`, `aggressive` |
| Cowboy Hat | `rebellious`, `chill` |
| Centurion | `warrior`, `elite` |
| Comrade Hat | `rebellious`, `chaotic` |
| Construction Helmet | `grinder`, `wholesome` |
| Fedora | `nerdy`, `dark` |
| Field Cap | `warrior`, `grinder` |
| Firefighter Helmet | `wholesome`, `warrior` |
| Hard Hat | `grinder`, `wholesome` |
| Headphones | `chill`, `nerdy` |
| Cap | `chill`, `degen` |
| Pirate Hat | `rebellious`, `chaotic` |
| Ronin Helmet | `warrior`, `dark` |
| Standard Cut | `chill`, `degen` |
| Super Wojak Hat | `goofy`, `cosmic` |
| Super Saiyan | `aggressive`, `cosmic` |
| SWAT Helmet | `warrior`, `aggressive` |
| Trump Wave | `elite`, `chaotic` |
| Piccolo Turban | `mystical`, `warrior` |
| Beanie | `chill`, `degen` |
| 2Pac Bandana | `rebellious`, `grinder` |
| Spikes | `rebellious`, `aggressive` |

### Face Wear — Tier 2
| Trait | Mood Tags |
|-------|-----------|
| Laser Eyes | `aggressive`, `cosmic`, `degen` |
| 3D Glasses | `nerdy`, `goofy` |
| Alpha Shades | `elite`, `degen` |
| Aviators | `chill`, `elite` |
| Cool Glasses | `chill`, `party` |
| Cyber Shades | `nerdy`, `cosmic` |
| Eye Patch | `dark`, `warrior` |
| Matrix Lenses | `nerdy`, `dark` |
| MOG Glasses | `degen`, `goofy` |
| Ninja Turtle Mask | `goofy`, `warrior` |
| Shades | `chill`, `elite` |
| Tyson Tattoo | `aggressive`, `rebellious` |
| Wizard Glasses | `mystical`, `nerdy` |
| Night Vision | `warrior`, `grinder` |
| VR Headset | `nerdy`, `cosmic` |
| Fake It Mask | `dark`, `spooky` |
| MedievalBepe Cowboy | `rebellious`, `goofy` |
| MedievalBepe Emo | `dark`, `chaotic` |
| MedievalBepe Wizard | `mystical`, `goofy` |
| Tanginium King | `elite`, `wholesome` |
| Tanginium Sad | `dark`, `wholesome` |

### Mouth — Tier 3
| Trait | Mood Tags |
|-------|-----------|
| Numb | `chill`, `dark` |
| Smile | `chill`, `wholesome` |
| Screaming | `aggressive`, `chaotic` |
| Teeth | `aggressive`, `goofy` |
| Gold Teeth | `elite`, `degen` |
| Pizza | `party`, `goofy` |
| Stunned | `chaotic`, `degen` |
| Sexy Lip Bite | `party`, `goofy` |
| Glossed Lips | `party`, `elite` |
| Cig | `rebellious`, `grinder` |
| Cohiba | `elite`, `chill` |
| Joint | `chill`, `party` |
| Pipe | `nerdy`, `chill` |
| Bubble Gum | `goofy`, `chill` |
| Bandana Mask | `rebellious`, `warrior` |
| Hannibal Mask | `dark`, `spooky` |
| Copium Mask | `degen`, `chaotic` |
| Neckbeard | `nerdy`, `degen` |
| Stache | `grinder`, `elite` |

### Clothes — Tier 1
| Trait | Mood Tags |
|-------|-----------|
| Astronaut | `cosmic`, `grinder` |
| Bathrobe | `chill`, `degen` |
| Bepe Army | `warrior`, `wholesome` |
| Bepe Suit | `elite`, `wholesome` |
| Born to Ride | `rebellious`, `aggressive` |
| Chia Farmer | `wholesome`, `grinder` |
| Drac | `dark`, `spooky` |
| El Presidente | `elite`, `warrior` |
| Firefighter Uniform | `wholesome`, `warrior` |
| God's Robe | `mystical`, `elite` |
| Goose Suit | `goofy`, `chaotic` |
| Gopher Suit | `goofy`, `nerdy` |
| Leather Jacket | `rebellious`, `dark` |
| Ninja Turtle Fit | `goofy`, `warrior` |
| Pepe Suit | `goofy`, `degen` |
| Pickle Suit | `goofy`, `chaotic` |
| Proof of Prayer | `wholesome`, `mystical` |
| Roman Drip | `warrior`, `elite` |
| Ronin | `warrior`, `dark` |
| Sonic Suit | `goofy`, `grinder` |
| Sports Jacket | `elite`, `chill` |
| Straitjacket | `chaotic`, `dark` |
| Suit | `elite`, `grinder` |
| Super Saiyan Uniform | `aggressive`, `cosmic` |
| SWAT Gear | `warrior`, `aggressive` |
| Tank Top | `chill`, `aggressive` |
| Tee | `chill`, `degen` |
| Topless | `chill`, `rebellious` |
| Viking Armor | `warrior`, `aggressive` |
| Wizard Drip | `mystical`, `dark` |

### Extras — Tier 1
| Trait | Mood Tags |
|-------|-----------|
| GFY Right | `rebellious`, `aggressive` |
| GFY Left | `rebellious`, `aggressive` |
| Diamond | `elite`, `degen` |
| Handgun | `aggressive`, `dark` |
| Orange | `wholesome`, `party` |
| TangTalk | `nerdy`, `wholesome` |
| Coffee | `grinder`, `chill` |
| Goose | `goofy`, `chaotic` |
| Seedling | `wholesome`, `grinder` |
| Wings | `cosmic`, `mystical` |

### Background — Tier 3
| Trait | Mood Tags |
|-------|-----------|
| Hell | `dark`, `spooky` |
| Moon | `cosmic`, `degen` |
| Casino | `degen`, `party` |
| Wizard Tower | `mystical`, `dark` |
| Matrix | `nerdy`, `dark` |
| Moms Basement | `nerdy`, `degen` |
| NYSE Pump | `elite`, `degen` |
| NYSE Dump | `dark`, `degen` |
| NYSE Rug | `chaotic`, `degen` |
| Chia Farm | `wholesome`, `grinder` |
| Orange Grove | `wholesome`, `party` |
| Bepe Barracks | `warrior`, `wholesome` |
| Ronin Dojo | `warrior`, `dark` |
| Space Station | `cosmic`, `nerdy` |
| White House | `elite`, `chaotic` |
| Spell Room | `mystical`, `dark` |
| Nesting Grounds | `wholesome`, `chill` |
| Route 66 | `rebellious`, `chill` |
| Silicon Data Center | `nerdy`, `grinder` |
| One Market | `elite`, `grinder` |
| Padded Cell | `chaotic`, `dark` |
| Circus | `goofy`, `chaotic` |
| Bunker | `warrior`, `dark` |
| Home Office | `grinder`, `chill` |
| Swamp | `dark`, `goofy` |
| Tavern | `party`, `chill` |
| Vaporwave | `chill`, `cosmic` |
| Viking Ship | `warrior`, `aggressive` |
| Volcano | `aggressive`, `dark` |
| Cash-tag backgrounds | `degen`, `chill` (default) |
| Solid color backgrounds | `chill`, `degen` (default) |

---

## 4. Mood Resolution Algorithm

```
1. Collect all equipped traits (Face, Head, Face Wear, Mouth, Clothes, Extras, Background)
2. For each trait, look up its mood tags from TRAIT_MOODS map
3. Multiply each tag's count by the tier weight:
   - Clothes/Extras tags × 3
   - Head/Face Wear/Face tags × 2
   - Mouth/Background tags × 1
4. Sum all weighted tags across all traits
5. Primary mood = highest scoring tag
6. Secondary mood = second highest scoring tag
7. Tiebreaker: alphabetical order of mood tag name
```

### Example: Middle Finger + Beer Hat + Tee + Screaming

| Trait | Tier | Tags (weighted) |
|-------|------|-----------------|
| GFY Right (Extra) | 1 (×3) | rebellious=3, aggressive=3 |
| Beer Hat (Head) | 2 (×2) | party=2, rebellious=2 |
| Tee (Clothes) | 1 (×3) | chill=3, degen=3 |
| Screaming (Mouth) | 3 (×1) | aggressive=1, chaotic=1 |

**Totals:** rebellious=5, aggressive=4, chill=3, degen=3, party=2, chaotic=1
**Result:** Primary=`rebellious`, Secondary=`aggressive`
**Names:** "Anon Rage", "1v1 Me Bro", "Mad Lad", "No Rules", "F This"

---

## 5. Name Pool Structure

### Per-Mood Pools (16 pools)

Each mood gets:
- **~18 adjectives** (first-word options)
- **~18 nouns** (second-word options)
- **~10 titles** (rank/title prefixes)
- **~25 curated full names** (hand-crafted iconic names)
- **1 hint** (placeholder example)

### Mood Combo Bonus Pools (~50 combos)

When primary + secondary mood match a known combo, ~5 bonus full names unlock.

### Culture Regions Represented

All name pools draw from these regions:
- **Crypto:** HODL, degen, ape, rug pull, moon, bags, whale, floor price, mint, seed phrase
- **Gaming:** GG, speedrun, boss fight, rage quit, loot, XP, nerf, buff, AFK, respawn
- **Internet culture:** NPC, touch grass, ratio, copium, sussy, bruh moment, skill issue
- **Wojak lore:** doomer, bloomer, coomer, zoomer, feels guy, comfy, "this is fine"
- **Tang Gang:** tang, honk, bepe, pulp, citrus, zesty, orange, juice, grove
- **Chia:** farmer, seed, plot, harvest, proof of space, node, fork

---

## 6. Name Generation Patterns

| Chance | Pattern | Example |
|--------|---------|---------|
| 25% | Combo bonus name (if available) | "Hold My Beer" |
| 25% | Curated full name from primary pool | "Rage Quit" |
| 25% | Adjective (primary) + Noun (primary or secondary) | "Savage Warlord" |
| 15% | Title (primary) + Noun (secondary) | "Sgt Degen" |
| 10% | Full name from secondary pool | "Moon Soon" |

If combo bonus not available, redistributes to other patterns.

---

## 7. 16 Mood Pools — Full Name Database

### `aggressive` — Rage, PvP, destruction
- **Adjectives:** Rekt, Savage, Brutal, Feral, Raw, Merciless, Lethal, Wicked, Rabid, Ruthless, Mad, Primal, Bloody, Grim, Iron, Hellfire, Nuclear, Unhinged
- **Nouns:** Rage, Fury, Hands, Beast, Mode, Fist, Storm, Pain, Carnage, Strike, Havoc, Wreck, Doom, Rush, Blitz, Force, Sweat, Push
- **Titles:** Warlord, General, Sgt, Cpt, Killer, Slayer, Berserker, Boss, Conqueror, Reaper
- **Full Names:** Rekt Em All, Mad Lad, No Mercy, Rage Quit, Git Gud, 1v1 Me Bro, Uninstall Pls, Salt Mine, Tryhard Andy, Double Kill, Spawn Kill, Feral Mode, Zero Chill, Iron Fist, Raw Dawg, Total Rekt, Overkill, Pain Train, GG No Re, Final Boss, Wreck It, Tilt Mode, Blood Moon, Brute Force, Pure Rage

### `rebellious` — Anarchy, anti-establishment, middle fingers
- **Adjectives:** Rogue, Based, Punk, Wild, Feral, Outlaw, Untamed, Defiant, Rebel, Reckless, Bold, Brazen, Raw, Loose, Free, Lone, Stray, Foul
- **Nouns:** Anon, Rebel, Wolf, Outlaw, Riot, Punk, Rogue, Menace, Cannon, Maverick, Exile, Pirate, Raider, Vandal, Flame, Spirit, Fury, Storm
- **Titles:** Don, Capo, Chief, Baron, Kingpin, OG, Bandit, Outlaw, Rogue, Pirate
- **Full Names:** No Rules, Send It, Cope Harder, Anon Rage, Rules R Fake, Stay Mad, Touch Grass, Honk Honk, Not Ur Fren, Cry More, Talk Is Cheap, Seethe Cope, Flip Table, GFY King, Mad Online, Born Wild, Fk Ur Meta, Lone Wolf, Exit Scam, Road Rage, Bail Out, On Sight, Foul Play, Not Sorry, Ratio'd

### `degen` — Crypto gambling, YOLO, ape-in culture
- **Adjectives:** Diamond, Paper, Rekt, HODL, Degen, Whale, Rug, Pump, Based, Moon, Bull, Bear, Ape, Shrimp, Bag, Toxic, Broke, Rich
- **Nouns:** Hands, Bags, Maxi, Trader, Ape, HODL, Whale, Pump, Dump, Moon, Stack, Vault, Coin, Pool, Mine, Yield, Farm, Sats
- **Titles:** CEO, Whale, Shark, Alpha, Sigma, OG, Degen, Maxi, Bull, Baron
- **Full Names:** Rug Pulled, Ape In, Moon Soon, HODL Gang, Bag Holder, Send Nodes, In It 4 Tech, Ngmi Fren, Wagmi Mode, 1 More Trade, Rekt Again, Paper Hands, Pump N Pray, All In, Floor Price, Mint Fren, Gas Fee, Whale Alert, Seed Phrase, No Ragrets, Tang Maxi, Pulp Gang, Citrus Peel, Bepe Maxi, Honk Bag

### `chill` — Relaxed, comfy, zen, unbothered
- **Adjectives:** Comfy, Chill, Zen, Mellow, Cozy, Smooth, Sleepy, Easy, Warm, Soft, Calm, Lazy, Quiet, Bliss, Gentle, Slow, Still, Peace
- **Nouns:** Fren, Vibes, Mode, Zone, Life, Soul, Wave, Dream, Cloud, Breeze, Flow, Mood, Sage, Brain, Spirit, Aura, Haven, Rest
- **Titles:** Master, Guru, Sensei, Elder, Sage, Chief, Captain, Saint, Blessed, Pure
- **Full Names:** Comfy Fren, Vibe Check, Feels Good, Easy Mode, No Stress, All Good, Stay Comfy, Zen Mode, Chill Pill, Good Vibes, Smooth Brain, Nap King, AFK Life, Idle Mode, Low Effort, Zero Rush, Just Vibin, Stay Cozy, Pillow Fort, Snooze King, Tea Time, Slow Roll, Soft Hands, Inner Peace, Cloud Nine

### `goofy` — Clown world, absurd, meme, honk
- **Adjectives:** Honk, Turbo, Mega, Giga, Ultra, Wacky, Cursed, Weird, Clown, Meme, Rare, Epic, Super, Cringe, Bruh, Sussy, Smol, Chonk
- **Nouns:** Goblin, NPC, Clown, Brain, Hands, Lord, Fiend, Maniac, Enjoyer, Moment, Vibes, Gang, Unit, Legend, Bot, Creature, Honk, Fren
- **Titles:** King, Lord, Chief, Supreme, Grand, Mega, Ultra, Emperor, Captain, Mayor
- **Full Names:** Honk Pilled, Clown World, This Is Fine, Rare Pepe, NPC Brain, Weird Flex, Skill Issue, Bruh Moment, Copium Max, Sussy Baka, Giga Brain, Goose Loose, Down Bad, Sneed Mode, OK Boomer, Meme Lord, Turbo Honk, Epic Fail, Smooth Move, Big If True, Trust Me Bro, No Cap, L + Ratio, Deez Nuts, 404 Brain

### `elite` — Wealth, power, alpha, boss
- **Adjectives:** Alpha, Sigma, Prime, Grand, Royal, Top, Big, Whale, Shark, Bull, Boss, Chief, Gold, Lux, Rich, Noble, High, Peak
- **Nouns:** Fund, Stack, Bags, Money, Class, Suite, Club, Gang, Mode, Mogul, Throne, Empire, Crown, Power, Maxi, Titan, Chad, King
- **Titles:** CEO, CFO, Don, Duke, Baron, Lord, Prince, Count, Mogul, Tycoon
- **Full Names:** Wolf of Wall, CEO of Bags, Bull Chad, Whale Alert, Big Money, Top Trader, Stack King, Sigma Male, Alpha Gains, Old Money, New Money, Power Move, Boss Mode, Royal Flush, Profit King, Market Cap, Blue Chip, Early Bird, Smart Money, Tang Baron, Bepe Elite, Pump King, Bag Secured, Net Worth, Rank One

### `dark` — Edgy, villain, doom, shadow, doomer
- **Adjectives:** Dark, Shadow, Void, Grim, Doom, Dread, Fell, Bleak, Ashen, Black, Hollow, Pale, Ghost, Dead, Lost, Faded, Numb, Cold
- **Nouns:** Lord, Knight, Walker, King, Reaper, Shade, Wraith, Phantom, Bane, Soul, Edge, Doom, Night, Abyss, Crypt, Husk, Echo, End
- **Titles:** Lord, Baron, Count, Overlord, Master, Regent, Archon, Prince, Warden, Tyrant
- **Full Names:** Void Walker, Dark Lord, Doom Mode, Edge Lord, Shadow Fren, Dead Inside, Doomer Mode, No Hope, Its Over, Black Pill, Final Form, Dark Soul, Game Over, You Died, Hollow Man, Grim Fren, Night King, Fade Away, Gone Dark, Cold Hands, Lost Cause, Soul Rekt, The End, No Return, Dark Wojak

### `mystical` — Magic, arcane, wizard, ancient lore
- **Adjectives:** Arcane, Mystic, Elder, Ancient, Rune, Crystal, Frost, Flame, Storm, Shadow, Astral, Ether, Chaos, Blood, Iron, Stone, Spell, Fey
- **Nouns:** Wizard, Mage, Sage, Seer, Monk, Oracle, Druid, Shaman, Walker, Blade, Eye, Born, Master, Guard, Ward, Weaver, Binder, Cast
- **Titles:** Archmage, Elder, Sage, Oracle, High, Grand, Ancient, Seer, Keeper, Lore
- **Full Names:** Arcane Chad, Rune Master, Mana Burn, Cast Fren, Spell Slap, Wizard OG, Dark Magic, Ice Wizard, Fire Sage, Moon Druid, Soul Reaver, Mind Blast, Potion Lord, Ether Fren, Chaos Mage, XP Farm, Loot Drop, Magic Find, Buff Stack, Heal Bot, Nerf This, Mana Pool, Crit Hit, Spell Book, Rune Chad

### `warrior` — Military, tactical, honor, combat
- **Adjectives:** Iron, Steel, Brave, True, Sworn, Battle, War, Siege, Field, Recon, Delta, Bravo, Grunt, Heavy, Sharp, Hard, Rough, Grit
- **Nouns:** Squad, Force, Guard, Arms, Chief, Six, Actual, Dog, Shield, Blade, Sword, Helm, Spear, Wall, Gate, Tower, Front, March
- **Titles:** Sgt, Cpt, Major, Colonel, General, Pvt, Cmdr, Lt, Warlord, Marshal
- **Full Names:** Sgt Degen, Iron Hands, Bravo Six, Tank Chad, Shell Shock, Trench Fren, Boot Camp, War Ape, Delta OG, Foxhound, Hawk Eye, Dog Tag, Lead Rain, Stealth OG, Honor Bound, Front Line, No Retreat, Hold Fast, War Paint, Battle Cry, Spartan OG, Ronin Path, Viking OG, Shield Wall, Last Stand

### `cosmic` — Space, galaxy, transcendence, "to the moon"
- **Adjectives:** Astro, Cosmo, Lunar, Solar, Nebula, Orbit, Star, Nova, Void, Plasma, Comet, Cosmic, Zero G, Mars, Pulsar, Quasar, Dark, Hyper
- **Nouns:** Pilot, Cadet, Walker, Rider, Naut, Core, Sage, Base, Force, Bound, Born, Light, Flare, Dust, Wave, Rift, Gate, Jump
- **Titles:** Astro, Cosmo, Star, Cmdr, Captain, Pilot, Navigator, Admiral, Chief, Zero
- **Full Names:** Moon Boy, Space Cadet, Star Born, Dark Matter, Moon Soon, Zero G Chad, Galaxy Brain, Solar Flare, Void Pilot, Nova Burst, Orbit Mode, Cosmic Fren, Light Speed, Warp Drive, Mars Degen, Star Dust, Moon Fren, Deep Space, Final Front, Hyper Jump, To The Moon, Rocket Fren, Pulsar OG, Nebula King, Event Hrzn

### `wholesome` — Farmer, community, faith, Chia/Tang Gang heart
- **Adjectives:** Good, True, Noble, Brave, Kind, Pure, Honest, Warm, Bright, Sweet, Fresh, Green, Rich, Full, Ripe, Golden, Blessed, Sacred
- **Nouns:** Fren, Heart, Soul, Hand, Seed, Farm, Hope, Faith, Light, Guard, Crew, Guild, Folk, Root, Bloom, Grove, Field, Home
- **Titles:** Farmer, Chief, Elder, Saint, Guardian, Captain, Steward, Keeper, Warden, Pastor
- **Full Names:** Chia Farmer, Seed Sower, Tang Fren, Good Vibes, Fren Zone, Kind Heart, Farm Life, Plot Gang, Green Thumb, Grow Mode, Harvest OG, Honk Love, Orange Fren, Pulp Heart, True Fren, Fren Chain, Block Fren, Proof of Fk, Full Bloom, Fresh Seed, Pure Heart, Fren Gang, Home Grown, Tang Heart, Grove King

### `nerdy` — Tech, data, galaxy brain, dev culture
- **Adjectives:** Big, Mega, Giga, Nano, Hyper, Turbo, Pixel, Cyber, Data, Code, Tech, Hash, Node, Stack, Debug, Root, Core, Sync
- **Nouns:** Brain, Stack, Node, Bot, Byte, Chip, Core, Code, Hash, Grid, Net, Link, Port, Drive, Cache, Loop, Fork, Merge
- **Titles:** Admin, Root, Dev, Mod, Sys, Arch, Lead, Chief, Master, Sudo
- **Full Names:** Big Brain, Stack Fren, Node Runner, Git Push, 404 Fren, Sudo Mode, Giga Brain, Debug King, Fork It, Merge Chad, Hash Rate, Dev Mode, Code Monk, Pixel Fren, Neuro Link, Based Node, Loop King, Ctrl Alt, Full Stack, Root Admin, Core Dump, Byte Size, Tech Debt, No Bugs, Ship It

### `chaotic` — Cursed, unhinged, unpredictable, "this is fine" energy
- **Adjectives:** Cursed, Toxic, Unhinged, Wild, Feral, Chaos, Rogue, Loose, Broke, Fried, Cooked, Scuffed, Janky, Raw, Glitch, Bug, Lag, Warp
- **Nouns:** Mode, Goblin, Gremlin, Fiend, Hands, Brain, Logic, Sense, Plan, Luck, Move, Play, Take, Shot, Bet, Call, Flip, Twist
- **Titles:** Lord, King, Chief, Captain, Master, Agent, Chaos, Mad, Wild, Dr
- **Full Names:** This Is Fine, Chaos Mode, Im Fine, Totally Fine, Not Great, Just Vibin, Cooked Mode, Fried Brain, Wild Card, Bad Idea, Yolo Mode, Oops Mode, My Bad, Scuffed OG, Glitch Fren, Its A Feature, Lag Spike, Skill Issue, Down Bad, Cope Mode, Trust Me, Just Mint, Why Not, Full Send, No Plan

### `spooky` — Horror, undead, nightmare, halloween
- **Adjectives:** Ghost, Dead, Pale, Hollow, Grim, Dread, Wicked, Haunted, Cursed, Shadow, Bone, Skull, Dark, Eerie, Fell, Creep, Night, Rot
- **Nouns:** Reaper, Wraith, Shade, Phantom, Ghoul, Specter, Bane, Fang, Crypt, Tomb, Husk, Haunt, Dread, Fiend, Lurker, Stalker, Creep, Howl
- **Titles:** Lord, Baron, Count, Overlord, Master, Warden, Keeper, Dr, Grave, Bone
- **Full Names:** Dead Inside, Ghost Fren, Skull Mode, No Pulse, Game Over, You Died, Boo Fren, Crypt King, Bone Zone, Grim Vibes, Haunted OG, Night Mode, Sleep Tight, RIP Fren, Cold Body, Fade Black, Soul Gone, Void Born, Tomb Raider, Pale King, Grave Yard, Rest In Rip, Dead Mint, Specter OG, Bone Broth

### `party` — Drinking, celebration, hype, WAGMI, LFG
- **Adjectives:** Turbo, Hyper, Lit, Hype, Wild, Loud, Mad, Hot, Live, Wasted, Drunk, Fizzy, Fresh, Juicy, Tangy, Zesty, Crispy, Spicy
- **Nouns:** Mode, King, Gang, Squad, Crew, Fren, Chad, OG, Vibes, Life, Zone, Hour, Night, Time, Bash, Rave, Fest, Wave
- **Titles:** DJ, MC, King, Chief, Captain, Mayor, Boss, Don, Host, Legend
- **Full Names:** LFG Mode, Wagmi Fren, Party Fren, Up Only, Pump It, Happy Hour, Moon Juice, Tang Party, OJ Gang, Zest Fest, Citrus King, Juice Box, Pulp Mode, Tangy OG, Honk Party, Hold My Beer, Full Send, Lets Go, LFG!, Good Times, Hot Streak, Night Owl, Hype Beast, Lit Mode, Dance Floor

### `grinder` — Hustle, speedrun, sweat, no-life dedication
- **Adjectives:** Hard, Fast, Non Stop, True, Grit, Hustle, Sweat, Sharp, Keen, Driven, Steady, Tireless, Core, Deep, Dense, Locked, Solid, Raw
- **Nouns:** Mode, Grind, Hustle, Hours, Sweat, Work, Push, Focus, Drive, Edge, Lock, Pace, Run, Sprint, Climb, Stack, Gain, Rep
- **Titles:** Master, Pro, Veteran, OG, Ace, Captain, Chief, Lead, Boss, Coach
- **Full Names:** No Sleep, Grind Mode, Speed Run, Sweat Lord, Pro Gamer, Try Hard, AFK? Never, One More Run, Max Level, Farm Life, Loot Grind, XP Boost, Boss Rush, Hard Core, No Days Off, All Grind, Late Night, First Clear, World First, Rank Grind, Rep Max, The Hustle, Non Stop, Eyes Open, Time Attack

---

## 8. Mood Combo Bonus Names (~50 combos)

| Primary | Secondary | Bonus Names |
|---------|-----------|-------------|
| rebellious | aggressive | F This, No Cap OG, Flip Table, 1v1 Me Bro, Mad Online |
| rebellious | party | Hold My Beer, Bad Choices, YOLO King, Party Foul, No Regrets |
| rebellious | degen | Exit Scam, Rug Rebel, Pump Pirate, Rogue Trade, Tang Bandit |
| rebellious | chill | Dont Care, Zero Fks, Muted Chat, Laid Back, Stay Based |
| aggressive | degen | Ape Rage, Rekt Fury, Margin Call, Liquidated, Panic Sell |
| aggressive | warrior | War Machine, Iron Storm, Brute Squad, Total War, No Quarter |
| aggressive | chaotic | War Crime, Scorched, No Chill, Tilt God, Rage Quit |
| aggressive | dark | Grim Reaper, Death Wish, Soul Crush, Doom Fist, Kill Shot |
| aggressive | cosmic | Star Wars, Nova Bomb, Solar Flare, Meteor OG, Death Star |
| degen | chill | Zen Trader, HODL Zen, Numb Bags, Comfy Degen, AFK Gains |
| degen | party | Pump N Dump, Casino Fren, Lucky Degen, Jackpot OG, All In |
| degen | goofy | Ape Brain, Smooth Ape, Meme Coin, Degen Honk, Rare Honk |
| degen | elite | Whale Mode, Smart Money, Alpha Leak, Insider OG, Stack Chad |
| degen | dark | Bag Rekt, Rug Victim, Bear Fren, Down Only, Cope Bag |
| degen | wholesome | Tang Degen, Farm Ape, Seed Maxi, Chia Chad, Green Degen |
| elite | dark | Dark Baron, Shadow CEO, Void Mogul, Night Fund, Grim Stack |
| elite | warrior | King Slayer, Iron Duke, War Baron, Throne Room, Crown Chad |
| elite | degen | Whale Mode, Tang Baron, Bepe Mogul, Stack Empire, Bag Lord |
| elite | chill | Old Money, Smooth Boss, Zen CEO, Easy Stack, Chill Duke |
| elite | wholesome | Tang King, Bepe Baron, Kind Duke, Green Baron, Noble Fren |
| goofy | chaotic | Honk Chaos, NPC Moment, Clown Fiesta, Brain Worm, Spaghetti |
| goofy | degen | Ape Brain, Smooth Ape, Meme Coin, Degen Honk, Rare Honk |
| goofy | chill | Vibes Only, Goofy Ahh, Silly Goose, Honk Chill, Soft Honk |
| goofy | nerdy | Bug Report, 404 Brain, Stack Over, Copy Paste, Sudo Honk |
| goofy | party | Honk Fest, Meme Party, Clown Hour, Goose Gang, Fun Mode |
| dark | mystical | Void Mage, Death Magic, Soul Drain, Dark Ritual, Fell Sage |
| dark | spooky | Dead Mall, Bone Lord, Night Fren, Pale Rider, Ghost Walk |
| dark | degen | Bear Market, Rug Night, Dark Pool, Dump Lord, Grave Bag |
| dark | chaotic | Asylum OG, Mad World, Chaos Void, Cursed Fren, Broke Brain |
| mystical | warrior | Spell Blade, Rune Knight, War Mage, Battle Sage, Mana Tank |
| mystical | dark | Shadow Mage, Void Cast, Necro Fren, Death Rune, Fell Magic |
| mystical | elite | Grand Mage, Arch Sage, Lore Baron, Spell King, Mana Lord |
| mystical | goofy | Honk Magic, Meme Spell, Goose Mage, Silly Sage, Bonk Wand |
| wholesome | grinder | Farm OG, Seed Gang, Plot Fren, Grow Stack, Field Day |
| wholesome | degen | Tang Degen, Farm Ape, Seed Maxi, Chia Chad, Green Degen |
| wholesome | party | Tang Party, OJ Fest, Grove Bash, Harvest Ale, Fren Fest |
| wholesome | warrior | Shield Fren, Guard Duty, Brave Fren, Tank Fren, Iron Guard |
| wholesome | mystical | Seed Prayer, Soul Farm, Sacred Plot, Green Light, Bless Fren |
| cosmic | degen | Moon Ape, Astro Degen, Space Bag, Star Mint, Launch Pad |
| cosmic | aggressive | Star Wars, Nova Bomb, Solar Flare, Meteor OG, Death Star |
| cosmic | chill | Star Gazer, Float Mode, Orbit Zen, Space Chill, Void Calm |
| cosmic | mystical | Star Sage, Moon Druid, Astral Mage, Ether Sage, Cosmo Sage |
| nerdy | degen | Hash Fren, Node Degen, Stack Maxi, Git Rekt, Dev Ape |
| nerdy | goofy | Bug Report, 404 Brain, Stack Over, Copy Paste, Sudo Honk |
| nerdy | grinder | Code Monk, Stack Grind, Hash Grind, Dev Hours, Ship Fast |
| nerdy | dark | Dark Code, Void Stack, Dead Code, Null Fren, Ghost Bug |
| party | chill | Juice Bar, Tang Chill, Smooth OJ, Sunset OG, Easy Night |
| party | degen | Casino Fren, Lucky Mint, Moon Juice, Pump Fest, Wagmi Bash |
| party | rebellious | Riot Fest, Punk Show, Wild Night, Mosh Pit, Stage Dive |
| chaotic | dark | Asylum OG, Mad World, Chaos Void, Cursed Fren, Broke Brain |
| chaotic | goofy | Honk Chaos, Brain Rot, Spaghetti, Glitch Art, Bug Feature |
| grinder | warrior | Iron Grind, War Sweat, Battle Rep, Hard March, Siege Mode |
| grinder | degen | Farm Stack, Mine Mode, Yield Grind, Pool Sweat, DCA Robot |
| warrior | dark | Dark Knight, Shadow Ops, Night Raid, Grim March, Fell Blade |
| warrior | wholesome | Shield Fren, Guard Duty, Brave Fren, Tank Fren, Iron Guard |
| spooky | dark | Grave Lord, Death King, Bone Baron, Night Shade, Fell Haunt |
| spooky | goofy | Boo Honk, Spooky Honk, Ghost Honk, Skull Meme, Dead Meme |

---

## 9. Integration

### MintFlowModal.tsx — One change

```typescript
// Before: passes only clothing
const clothingAttr = metadataAttributes.find(a => a.trait_type === 'Clothes');
const clothingName = clothingAttr?.value || '';
const name = generateRandomName(clothingName);

// After: passes all traits
const name = generateRandomName(metadataAttributes);
```

### Placeholder hint — becomes mood-aware

```typescript
// Before
const hint = getPlaceholderHint(clothingName);

// After
const hint = getPlaceholderHint(metadataAttributes);
```

---

## 10. Scale Summary

| Component | Count |
|-----------|-------|
| Mood tags | 16 |
| Trait-to-mood mappings | ~179 trait values |
| Words per mood pool | ~71 (18 adj + 18 noun + 10 titles + 25 full) |
| Total words across all pools | ~1,136 |
| Mood combo bonus names | ~57 combos x ~5 = ~285 |
| Prefix+suffix combos per mood | ~324 |
| Total unique prefix+suffix combos | ~5,184 |
| Cross-mood combos | ~5,184 more |
| Hand-crafted full names | ~685 |
| **Total possible unique names** | **~11,000+** |

30x increase from current ~350 per theme.

---

## 11. Files to Create/Modify

| File | Action | Est. Lines |
|------|--------|------------|
| `src/lib/moodMap.ts` | **New** — trait→mood mappings, tier weights, resolveMoods() | ~300 |
| `src/lib/moodPools.ts` | **New** — 16 mood pools + 57 combo bonus pools | ~500 |
| `src/lib/nameGenerator.ts` | **Evolve** — new generateRandomName(traits) + mood-based gen | ~60 |
| `src/lib/nameThemes.ts` | **Keep** — deprecated but not deleted (backward compat) | 0 |
| `src/components/generator/MintFlowModal.tsx` | **Small edit** — pass full traits | ~5 |
| `src/lib/nameGenerator.test.ts` | **Update** — test mood resolution + new generation | ~100 |
