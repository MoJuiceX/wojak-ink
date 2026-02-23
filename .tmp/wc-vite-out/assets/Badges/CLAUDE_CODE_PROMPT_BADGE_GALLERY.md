# Claude Code Task: Badge Gallery Tab for askBigPulp

## Overview

Create a new tab in the askBigPulp section called "Badge Gallery" that displays all NFTs organized by their badge category. This will help visualize and validate the badge system.

## Requirements

### 1. New Tab: "Badge Gallery"

Add a new tab alongside existing askBigPulp tabs. When clicked, it opens a gallery view of all badged NFTs.

### 2. Badge Categories (Ranked by Rarity - Fewest First)

Display badges in this order (rarest at top):

1. 💚 Namekian (7 NFTs)
2. 🪿 Honk Gang (31 NFTs)
3. 🤪 Unhinged (38 NFTs)
4. 🧔 Neckbeard (57 NFTs)
5. 🚒 First Responder (60 NFTs)
6. 🥷 Ronin (80 NFTs)
7. 😈 Hellspawn (91 NFTs)
8. ⚡ Super Saiyan (99 NFTs)
9. 🏴‍☠️ Pirate (115 NFTs)
10. 👽 Alien (147 NFTs)
11. 👑 Royal Club (164 NFTs)
12. 🏆 Winners Win (164 NFTs)
13. 🐸 Bepe Army (171 NFTs)
14. 🧙 High Council (172 NFTs)
15. 🤡 Phunky (176 NFTs)

### 3. Gallery Layout

For each badge section:
- **Header**: Badge name + emoji + count (e.g., "💚 Namekian (7)")
- **Grid**: Show all NFT thumbnails that qualify for that badge
- **Collapsible**: Each badge section should be expandable/collapsible
- **NFT Card**: Each thumbnail should show:
  - NFT image
  - Edition number
  - Qualification type (e.g., "2 Primaries" or "Primary + Secondary")

### 4. Data Source

Use the `nft_badge_mapping.json` file which contains:
```json
{
  "version": "2.2",
  "rule": "1 Primary + 1 Secondary OR 2 Primaries",
  "total_nfts_with_badges": 1438,
  "badge_counts": {...},
  "nft_badges": {
    "1": {
      "badges": [
        {
          "badge": "Royal Club",
          "qualification": "primary_only",
          "matched": ["Head:Crown"]
        }
      ],
      "flags": ["HOAMI Edition"]
    }
  }
}
```

### 5. Filtering & Interaction

- Click on badge header to expand/collapse that section
- Click on NFT thumbnail to open full NFT detail view
- Optional: Add filter to show only NFTs with multiple badges
- Optional: Add search by edition number

### 6. Styling

- Use Windows 98 aesthetic consistent with the rest of the app
- Badge headers should have distinct colors or icons per badge
- Rarest badges (top) should feel more prestigious visually

### 7. Files to Reference

- `/mnt/user-data/outputs/nft_badge_mapping.json` - NFT to badge mapping
- `/mnt/user-data/outputs/badge_system.json` - Badge definitions and rules
- `/mnt/user-data/outputs/BADGE_SYSTEM_SPEC.md` - Full specification

## Badge Qualification Rules Summary

### Standard Rule: Primary + Secondary
**1 PRIMARY trait + 1 SECONDARY trait = badge**
OR
**2 PRIMARY traits from the same badge = badge**

### Exceptions
- **Royal Club**: Crown OR Tiara alone = badge (Primary only)
- **Namekian**: Must have BOTH Piccolo Turban AND Piccolo Uniform

### All Badge Definitions

| Badge | Primary Traits | Secondary Traits |
|-------|----------------|------------------|
| Namekian | Piccolo Turban + Piccolo Uniform (both required) | — |
| Honk Gang | Goose Suit | $HONK, Nesting Grounds, Orange Grove, Screaming |
| Unhinged | Straitjacket | Hannibal Mask, Crazy Room, NYSE Dump, NYSE Rug, Tin Foil Hat, Bleeding Bags, Rugged |
| Neckbeard | Neckbeard (mouth) | Fedora, Tank Top, Born to Ride, Cyber Shades, MOG Glasses, Cig, $NECKCOIN |
| First Responder | Firefighter Helmet, Firefighter Uniform | Everythings Fine, Hell, Night Vision |
| Ronin | Ronin Helmet, Ronin (clothes) | Ninja Turtle Mask, Bandana Mask, Ronin Dojo, Hannibal Mask |
| Hellspawn | Devil Horns, Drac | Hell, Vampire Teeth, Bleeding Bags |
| Super Saiyan | Super Saiyan (head) | Super Saiyan Uniform, Sky Shock Blue, Price Up, Price Down |
| Pirate | Pirate Hat, Viking Helmet | Viking Armor, Eye Patch, Pirate Ship, Gold Teeth |
| Alien | Alien Wojak/Soyjak/Baddie/Waifu | No Headgear, Astronaut, Cyber Shades, Laser Eyes, Moon, Signal Lost, Matrix, Stunned |
| Royal Club | Crown, Tiara | — (Primary only) |
| Winners Win | Monkey Zoo, Papa Tang | Crown, Chia Farmer, Alpha Shades, Rainforest, Orange Grove, Tangerine Pop, Chia Farm, Gold Teeth, Cohiba |
| Bepe Army | Bepe Army, Bepe Suit, Bepe Wojak/Soyjak/Waifu/Baddie | Field Cap, Hard Hat, Bepe Barracks, $BEPE, Orange Grove, $HOA |
| High Council | Wizard Hat, Wizard Drip | Wizard Glasses, Spell Room, $PIZZA, $CASTER, $LOVE, Pizza |
| Phunky | Military Beret, Clown, Propeller Hat, El Presidente | Clown Nose, VR Headset, Green Candle, $CHIA |

## Expected Outcome

A functional gallery tab that lets users:
1. See all 15 badge categories at a glance
2. Understand which badges are rarest (top) vs most common (bottom)
3. Browse NFTs within each badge category
4. Click through to individual NFT details
5. Validate that the badge system is working correctly
