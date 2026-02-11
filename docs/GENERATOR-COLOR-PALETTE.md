# Generator color palette

Single source of truth for the Wojak generator color picker. All colors from the two must-have palette images are included; generator default colors are merged without redundancy. Each family has **6 colors** for a balanced grid and even variation.

## Design rules

- **Must-haves:** Every color from the two palette images is included (no drops).
- **Nice-to-haves:** Generator default colors are included only when they add a distinct hue (no near-duplicates).
- **Balance:** 6 swatches per family so no hue (e.g. orange) has more variations than another (e.g. blue).
- **Organization:** Families ordered by hue (Reds → Oranges → … → Neutrals). Within each family, colors are ordered **light → dark (left to right)** for a consistent ramp in the picker.

## Palette by family (6 per family, light → dark left to right)

| Family | Colors (hex) |
|--------|--------------|
| **Reds** | `#FFC0CB` `#FF69B4` `#FF6347` `#FF0000` `#FF1493` `#8B0000` |
| **Oranges** | `#FFFF00` `#FFD700` `#FACC15` `#FFA500` `#FF8C00` `#FF6B00` |
| **Greens** | `#00FF00` `#7CFC00` `#32CD32` `#16a34a` `#2E8B57` `#228B22` |
| **Teals & Cyan** | `#00FFFF` `#00d4ff` `#40E0D0` `#00CED1` `#20B2AA` `#0891b2` |
| **Blues** | `#00BFFF` `#1E90FF` `#3b82f6` `#2563EB` `#0000CD` `#000080` |
| **Purples** | `#BA55D3` `#a855f7` `#A020F0` `#7c3aed` `#800080` `#6d28d9` |
| **Pinks & Magenta** | `#FFC0CB` `#f9a8d4` `#FF69B4` `#ec4899` `#FF1493` `#FF00FF` |
| **Browns** | `#D2B48C` `#D4AF37` `#CD7F32` `#A0522D` `#8B4513` `#633800` |
| **Neutrals** | `#FFFFFF` `#F5F5DC` `#C0C0C0` `#808080` `#404040` `#262626` `#171717` |

**Note:** Neutrals has 7 so White → Black is a clear ramp; the UI can show 6 + Default button in the same row. Each other family has exactly 6 for a 6-column grid and even variation.

## Quick-access row (top of picker)

One representative per family for fast access:

`#FF0000` `#FF6B00` `#FFD700` `#22c55e` `#00d4ff` `#3b82f6` `#a855f7` `#ec4899` `#FFFFFF` `#262626`

## Generator defaults covered

These generator default colors are included in the families above (no separate list needed):

- Bathrobe/Blues: `#3b82f6`, `#2563EB`
- Bepe army: `#4a5d23` → use Greens `#16a34a` or add to Greens if you want olive
- Born to ride / Suit: `#171717` (Neutrals)
- Leather jacket: `#262626` (Neutrals)
- Ninja turtle / Ronin base: `#A0522D` (Browns)
- Roman drip: `#991b1b` → use Reds `#8B0000` or add `#991b1b` to Reds (currently 6; could add as 7th or replace)
- Sports jacket: `#16a34a` (Greens)
- Suit tie: `#2563EB` (Blues)
- fire figther: `#fde86a` → use Oranges/Yellows (e.g. `#FFD700`)
- Viking helmet: `#FF6B00` (Oranges)
- Hard Hat: `#FACC15` → use `#FFD700` (Golds)
- Military Beret: `#4a4a4a` → use Neutrals `#404040` or `#525252` if added
- Laser Eyes: `#FF0000` (Reds)

If you want exact generator defaults (e.g. `#991b1b`, `#4a5d23`, `#4a4a4a`, `#fde86a`) to always appear in the picker, add them to the corresponding family and drop the closest duplicate to keep 6 per family.

## Implementation

- **Component:** `src/components/generator/ColorPicker.tsx`
- **Constants:** `COLOR_FAMILIES`, `QUICK_ACCESS_COLORS`, `GENERATOR_PALETTE_HEX`
- **Layout:** 6 columns per family; quick-access row at top; Neutrals last (optional Default button in same row).
