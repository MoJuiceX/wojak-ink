# AI Wizard Guided Presets — Design Document

**Date:** 2026-03-08
**Status:** Approved
**Scope:** Replace free-text AI prompt input with a fully guided click-through wizard. Add enhance vs create-new mode choice. Expand preset catalog to 64 families / 384 options.

---

## Goal

Transform the AI enhance flow from "pick category → type a prompt" into a fully guided wizard where every step is click-based. Users never write prompts — they click through: **Category → Mode → Family → Option → Confirm → Enhance**.

## Key Decisions

1. **No free-text input.** All prompts are pre-crafted presets.
2. **Two modes for Clothes, Head, Facewear:** "Enhance existing" (modify the current layer) vs "Create new" (replace with AI-generated item).
3. **Background is always "Create new"** (replace).
4. **Mode choice is conditional:** only shown if the user has a layer selected in that category. Otherwise auto-selects create-new.
5. **All families have exactly 6 options.** Uniform grid.
6. **🎲 Surprise Me** at the family level — picks random family + random option, jumps to confirm.
7. **Wizard stays at 4 top-level steps.** The "prompt" step manages sub-navigation internally.

---

## Wizard Flow

```
Step 1: Category (clothes / head / facewear / background)     ← AICategoryPicker (unchanged)
Step 2: Prompt  ← AIPromptBuilder (rewritten, manages sub-steps internally)
  ├─ 2a: Mode choice   — "✨ Enhance my [Crown]" vs "🆕 Create new headwear"
  │                       (skipped if no layer selected, or if background)
  ├─ 2b: Family grid   — style families + 🎲 Surprise Me
  ├─ 2c: Option grid   — 6 specific options within the selected family
  └─ 2d: Confirm card  — summary + "Enhance — 1 credit" button
Step 3: Loading                                                ← AILoadingState (unchanged)
Step 4: Result                                                 ← AIResultComparison (unchanged)
```

Back button: confirm → option → family → mode → category.

---

## Data Structure

### Types

```ts
type AIMode = 'enhance' | 'create_new';

interface AIPresetOption {
  label: string;     // User-facing label: "Tiger stripes"
  prompt: string;    // Descriptive prompt sent to Reve API
}

interface AIStyleFamily {
  label: string;              // "🐾 Animal Prints"
  options: AIPresetOption[];  // Always 6
}

interface AICategoryPresets {
  enhance?: AIStyleFamily[];    // undefined for background
  create_new: AIStyleFamily[];
}

type AIPresetCatalog = Record<AICategory, AICategoryPresets>;
```

### File: `src/config/aiEnhancePresets.ts`

Universal enhance families are defined once and spread into clothes, head, and facewear enhance arrays. Category-specific families are appended after.

---

## Prompt Templates

`_shared.ts` expands from 4 templates to 7. `buildConstrainedPrompt` accepts a mode parameter.

```ts
PROMPT_TEMPLATES: Record<AICategory, Partial<Record<AIMode, string>>>
```

| Category | Mode | Template core |
|----------|------|---------------|
| Clothes | enhance | "Edit ONLY the clothing: {prompt}. Keep the same shape and structure." |
| Clothes | create_new | "Replace the clothing entirely with: {prompt}. Keep pose, face, skin, head, background unchanged." |
| Head | enhance | "Edit ONLY the headwear: {prompt}. Keep the same shape and structure." |
| Head | create_new | "Replace the headwear entirely with: {prompt}. Keep face, clothing, skin, background unchanged." |
| Facewear | enhance | "Edit ONLY the face accessory: {prompt}. Keep the same shape and structure." |
| Facewear | create_new | "Add face accessory: {prompt}. Position naturally on the face." |
| Background | create_new | Current background template (unchanged). |

All prefixed with the STYLE constant. All suffixed with preservation instructions.

---

## Mode Detection Logic

```ts
const CATEGORY_TO_LAYERS: Record<AICategory, string[]> = {
  clothes: ['Clothes'],
  head: ['Head'],
  facewear: ['Eyes', 'Mask'],
  background: ['Background'],
};

// Check if ANY mapped layer slot has a selection
const hasLayer = CATEGORY_TO_LAYERS[category].some(
  key => !isSelectionPathEmpty(selectedLayers[key])
);
```

- `hasLayer === true` → show both mode cards ("Enhance my [layer name]" / "Create new")
- `hasLayer === false` → auto-select create_new, skip mode step
- `category === 'background'` → always skip mode step, always create_new

Gallery "Continue Enhancing" flow: show both modes with generic labels ("Enhance current image" / "Create new").

---

## Complete Preset Catalog

### ENHANCE — Universal Families (clothes + head + facewear)

| Family | Options |
|--------|---------|
| 🐾 Animal Prints | Tiger stripes · Leopard spots · Zebra stripes · Snake skin · Crocodile leather · Cow print |
| 🔥 Elemental | Flame pattern · Ice frost · Lightning bolts · Lava cracks · Smoke & ash · Sandstorm grit |
| ✨ Precious Metals | Gold plating · Chrome mirror · Diamond encrusted · Copper patina · Obsidian black glass · Brushed titanium |
| ⚔️ Battle Worn | Dented & scratched · Rusty corroded · Arrow pierced · Blood splattered · Wrapped in bandages · Cracked with light leaking |
| 🎨 Art & Paint | Graffiti spray · Splatter paint · Watercolor wash · Neon paint · Comic halftone dots · Stained glass mosaic |
| 👾 Digital & Glitch | 8-bit pixelated · Glitch artifact · VHS distortion · Circuit board · Hologram flicker · RGB chromatic split |
| 🌿 Nature Overgrowth | Ivy vines · Moss covered · Flower blooms · Coral growth · Mushroom sprouts · Bird nest |

### ENHANCE — Clothes-Only Families

| Family | Options |
|--------|---------|
| 💎 Luxury & Bling | Gold embroidery · Diamond studs · Velvet texture · Fur trim · Sequin sparkle · Silk satin sheen |
| 🎖️ Tactical & Combat | Woodland camo · Desert camo · Tactical vest webbing · Ammunition belt wraps · Military medal patches · Dog tag chains |
| 🎸 Street & Punk | Punk patches · Graffiti paint · Torn distressed · Safety pins & studs · Studded leather · Skateboard graphics |
| 🌈 Patterns | Tie-dye spiral · Hawaiian floral · Optical illusion · Mandala geometric · Racing stripes · Checkerboard |
| ⚡ Sci-Fi & Tech | Tron circuit lines · Holographic shimmer · Carbon fiber · LED strips · Matrix code · Wireframe mesh |
| ⚔️ Medieval & Fantasy | Chainmail armor · Plate armor · Dragon scales · Rune inscriptions · Royal crest · Elven leaf embroidery |
| 🍕 Weird & Fun | Pizza pattern · Blood splatter · Candy sprinkles · Bacon weave · Duct tape wrapped · Bubblewrap texture |
| ⚡ Energy & Power | Energy aura crackling · Power-up glow · Divine golden light · Ki blast sparks · Magical particles · Lightning surge |
| 👴 Worn & Aged | Sun-bleached faded · Moth-eaten holes · Blood stained · Patched & repaired · Dust covered · Sweat stained |

### ENHANCE — Head-Only Families

| Family | Options |
|--------|---------|
| ⚙️ Steampunk | Brass gears & cogs · Copper pipe network · Steam vents · Tesla coil sparks · Pressure gauge dials · Leather & rivet binding |
| 🔮 Magical | Glowing runes · Crystal embedded · Starfield pattern · Ancient spell pages wrapped · Phoenix feather crown · Shadow tendrils |
| 🧢 Patches & Pins | Embroidered logo · Iron-on patches · Enamel pin collection · Sewn-on badges · Screen-printed design · Bleach-dye splash |
| 🤠 Weathered & Adventure | Sun-bleached & faded · Rain-soaked wet · Dust & sand coated · Bullet hole through brim · Feather & bone decoration · Sweat-stained band |
| 🍬 Food & Candy | Chocolate coated · Candy cane stripes · Gummy bear texture · Donut glaze & sprinkles · Caramel dripping · Frosting & fondant |
| 🧊 Material Swap | Carved wood · Marble stone · Glass transparent · Paper origami · Bone & ivory · Clay ceramic |

### ENHANCE — Facewear-Only Families

| Family | Options |
|--------|---------|
| 🔍 Lens Effects | Mirror reflective · Holographic shift · Gradient tint · Frosted glass · Cracked & shattered · Night vision green glow |
| 🖼️ Frame & Structure | Gold wire frame · Bamboo wood frame · Bone & skull frame · Neon LED frame · Chain link frame · Crystal frame |
| ⛓️ Chains & Attachments | Hanging chain drops · Feather side attachment · Dangling charms · Pearl strand drape · Spike protrusions · Flower garland wrap |
| 🎭 Mask Patterns | Day of the Dead sugar skull · Kintsugi gold crack repair · Tribal carved relief · Geometric facets · Camouflage painted · Henna mehndi design |

### CREATE NEW — Clothes (10 families)

| Family | Options |
|--------|---------|
| ⚔️ Armor & Warriors | Knight plate armor · Samurai yoroi armor · Gladiator chest plate · Viking chain armor · Spartan battle gear · Dark lord shadow armor |
| 👔 Formal & Elegant | Royal tuxedo with tails · Victorian frock coat · White dinner jacket · Velvet smoking jacket · Military dress uniform · Maharaja sherwani |
| 🧪 Sci-Fi & Future | Space marine power suit · Cyberpunk neon jacket · Holographic bodysuit · Robot exoskeleton · Alien symbiote suit · Tron light suit |
| 🧙 Fantasy & Magical | Wizard grand robe · Druid leaf cloak · Necromancer dark robes · Elven silver tunic · Alchemist coat · Enchanted crystal armor |
| 🎭 Costumes & Characters | Superhero spandex suit · Ninja stealth outfit · Pirate captain coat · Cowboy duster jacket · Detective trench coat · Jungle explorer vest |
| 👷 Uniforms & Work | Chef double-breasted coat · Doctor lab coat · Pilot flight suit · Racing driver jumpsuit · Construction hi-vis vest · Prison jumpsuit |
| 🏋️ Sports & Athletic | Boxing robe & gloves · Basketball jersey · Football pads & jersey · Martial arts gi · Wrestling singlet · Hockey jersey & pads |
| 🌍 Cultural & Traditional | Japanese kimono · Scottish kilt & jacket · Hawaiian lei & shirt · Mexican poncho · Indian kurta · Egyptian pharaoh tunic |
| 💀 Dark & Horror | Zombie torn rags · Vampire cape & vest · Mummy wrappings · Skeleton bone armor · Werewolf torn shirt · Ghostly translucent robes |
| 🤪 Absurd & Meme | Banana costume · Inflatable T-Rex suit · Cardboard box robot · Bubble wrap bodysuit · Trash bag couture · Barrel & suspenders |

### CREATE NEW — Head (10 families)

| Family | Options |
|--------|---------|
| ⚔️ Helmets & Armor | Knight great helm · Spartan corinthian helmet · Samurai kabuto · Space marine helmet · Gladiator helm · Barbarian skull helm |
| 👒 Hats & Classic | Top hat · Sombrero · Ushanka fur hat · Safari pith helmet · Straw farmer hat · Bowler derby hat |
| 👑 Crowns & Royalty | Jeweled royal crown · Golden laurel wreath · Pharaoh nemes headdress · Ice queen tiara · Dark lord iron crown · Flower wreath crown |
| 🐉 Fantasy & Creature | Dragon horns · Angel halo · Demon skull helmet · Unicorn horn · Antler deer rack · Ram curved horns |
| 🤖 Sci-Fi & Tech | Robot dome head · Cyberpunk neural implant · Astronaut fish bowl · Antenna headband · Mech pilot helmet · AI brain chip visor |
| 🎪 Wild & Absurd | Bucket on head · Traffic cone · Pineapple hat · Fish head hat · Shark fin · Toilet plunger |
| 🌍 Cultural & Traditional | Native war bonnet · Turkish fez · Russian ushanka · Viking horned helm · Chinese conical hat · Scottish tam o'shanter |
| 💀 Dark & Horror | Skull bone helmet · Witch pointed hat · Plague doctor hood · Ghostly floating crown · Spider web veil · Pumpkin head carved |
| 🏋️ Sport & Activity | Football helmet · Boxing headguard · Cycling aero helmet · Ski helmet with goggles · Scuba diving mask · Baseball batting helmet |
| 🍔 Food & Object | Cheese wheel hat · Watermelon helmet · Spaghetti bowl hat · Birthday cake hat · Popcorn bucket hat · Ice cream cone hat |

### CREATE NEW — Facewear (9 families)

| Family | Options |
|--------|---------|
| 🕶️ Glasses & Shades | Aviator gold · Cat-eye rhinestone · Oversized designer · Heart-shaped pink · Round Lennon · Wrap-around sport |
| 🤖 Cyber & Tech | Cyberpunk visor · AR smart glasses · HUD display lens · Scanner eyepiece · Bionic eye implant · Laser targeting reticle |
| ⚙️ Goggles & Industrial | Steampunk brass goggles · Welding goggles · Gas mask · Night vision tubes · Ski goggles mirrored · Pilot flight goggles |
| 🎭 Masks & Theatrical | Phantom opera mask · Butterfly masquerade · Venetian carnival · Kabuki half-mask · Luchador mask · Samurai mempo |
| 🎨 Face Paint & Markings | War paint streaks · Skull face paint · Tribal markings · Mime face · Sports fan paint · Teardrop tattoo |
| 🤡 Novelty & Fun | Clown nose · Star-shaped shades · Googly eyes · Nose & mustache disguise · 3D red-blue glasses · Fake arrow through head |
| 🔥 Supernatural | Laser beam eyes · Glowing demon eyes · Cyborg red eye · Crystal shard visor · Hollow ghost eyes · Third eye forehead |
| 👑 Luxury & Elegant | Diamond monocle · Gold spectacles · Rose-tinted round frames · Crystal-studded cat-eye · Platinum aviators · Jeweled opera mask |
| 🩹 Medical & Horror | Surgical mask · Eye bandage wrapping · Plague doctor beak · Stitches across face · Oxygen mask & tubes · Cracked porcelain face |

### CREATE NEW — Background (9 families)

| Family | Options |
|--------|---------|
| 🌆 City & Urban | Tokyo neon alley · Cyberpunk rain street · NYC rooftop sunset · London fog alley · Paris rooftop café · Las Vegas strip |
| 🏝️ Nature & Wild | Tropical beach sunset · Coral reef underwater · Dense jungle · Cherry blossom garden · Waterfall cave · Northern lights tundra |
| 🏰 Historical & Fantasy | Castle throne room · Egyptian temple · Greek ruins · Viking longhouse · Wizard library · Samurai dojo |
| 🚀 Sci-Fi & Space | Spaceship cockpit · Moon surface · Mars colony · Space nebula · Asteroid field · Alien planet jungle |
| 🏠 Indoor Scenes | Cozy cabin fireplace · Trading desk monitors · Retro arcade room · Grand library · Jazz lounge · Ramen shop kitchen |
| ⚡ Action & Extreme | Volcano eruption · Thunderstorm · Boxing ring · Gladiator arena · Zombie apocalypse street · Pirate battle at sea |
| 🌀 Abstract & Surreal | Vaporwave grid · Floating island · Crystal cave · Neon tunnel · Geometric void · Infinite mirror room |
| 💰 Crypto & Meme | Stonks trading floor · Mining rig warehouse · Lambo garage · Diamond vault · Dumpster fire alley · NFT gallery hall |
| 🎪 Entertainment | Concert stage · Movie theater · Sports stadium · Theme park · Bowling alley · Rooftop pool party |

---

## Totals

| Section | Families | Options |
|---------|----------|---------|
| Enhance — Universal (clothes+head+facewear) | 7 | 42 |
| Enhance — Clothes only | 9 | 54 |
| Enhance — Head only | 6 | 36 |
| Enhance — Facewear only | 4 | 24 |
| Create New — Clothes | 10 | 60 |
| Create New — Head | 10 | 60 |
| Create New — Facewear | 9 | 54 |
| Create New — Background | 9 | 54 |
| **Grand Total** | **64** | **384** |

Plus 🎲 Surprise Me at the family level for each category+mode combination.

---

## Component Changes

| File | Change |
|------|--------|
| `src/config/aiEnhancePresets.ts` | Complete rewrite — nested structure, 64 families, 384 options with full prompts |
| `src/components/generator/ai/AIPromptBuilder.tsx` | Major rewrite — remove textarea, add sub-step navigation (mode → family → option → confirm) |
| `functions/api/ai/_shared.ts` | Add mode-aware prompt templates (7 total), update `buildConstrainedPrompt(category, mode, prompt)` |
| `src/contexts/AIEnhanceContext.tsx` | Add `selectedMode` state, pass mode through `submitEnhance` |
| `src/components/generator/ai/AIEnhanceLightbox.tsx` | Update title logic for sub-steps, add ℹ️ info tooltip |
| `src/types/aiEnhance.ts` | Add `AIMode` type, updated preset interfaces |
| `functions/api/ai/enhance.ts` | Accept mode parameter, select correct prompt template |
| `src/styles/theme.css` | Add tooltip styles for AI disclaimer |

No changes to: `AICategoryPicker.tsx`, `AILoadingState.tsx`, `AIResultComparison.tsx`, `AICreditsDisplay.tsx`.

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| No layer selected in category | Skip mode choice → auto create_new |
| Suit blocks head | Already handled by AICategoryPicker |
| Headwear blocks facewear | Already handled by AICategoryPicker |
| Mask vs Eye layer detection | Check both layer slots for facewear |
| Gallery "Continue Enhancing" | Show both modes with generic labels |
| Zero credits at confirm | "No credits — Buy more" button |
| API failure | Existing error/retry handling unchanged |
| Bad AI result | Existing discard/retry unchanged |

---

## AI Disclaimer

**ℹ️ Info icon** in wizard header (next to credits). On hover/tap shows tooltip:

> "AI enhancements are generated by artificial intelligence. Each prompt has been carefully crafted, but results may vary — AI can interpret instructions differently each time. If the result isn't what you expected, try again or pick a different style. No credits are charged for results you discard."

**Confirm card** also shows subtle text below the button:

> *Results may vary — no charge if you discard*

---

## Constraints

- No `!important` in CSS
- All visual styles in `theme.css`
- Tailwind for layout only
- No new dependencies
- No schema changes (existing `ai_enhancements` table unchanged)
- Mode is NOT persisted to DB — it only affects which prompt template is used

## Out of Scope

- Per-layer preset filtering (showing only relevant families based on specific layer)
- Prompt A/B testing infrastructure
- User-created custom presets
- Preset favorites or history
