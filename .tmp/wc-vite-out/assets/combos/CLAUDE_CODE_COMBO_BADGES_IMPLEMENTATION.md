# Claude Code: Implement Combo Badges System

## Task

Update the website to display combo badges when a user searches for an NFT. Also update the BigPulp "Ask" tab to show all available combos with their lore.

---

## New Data File

Add this file to your project:

**Location:** `public/assets/BigPulp/combos_badges.json`

---

## Part 1: Badge Display on NFT Search

When a user enters an NFT ID and views it, check if that NFT qualifies for any badges. Display earned badges prominently.

### Badge Logic Types

The JSON has 4 logic types. Here's how to check each:

```typescript
interface NftTraits {
  Base: string;
  Head: string;
  Clothes: string;
  'Face Wear': string;
  Mouth: string;
  Background: string;
  [key: string]: string;
}

function checkBadge(combo: Combo, nftTraits: NftTraits): boolean {
  switch (combo.logic) {
    
    case 'exact':
      // Must have ALL traits in requirements
      return Object.entries(combo.requirements).every(
        ([category, trait]) => nftTraits[category] === trait
      );
    
    case 'any_two':
      // Must have 2+ traits from the pool
      const matchCount = combo.requirementPool.filter(req => {
        const [category, trait] = Object.entries(req)[0];
        return nftTraits[category] === trait;
      }).length;
      return matchCount >= 2;
    
    case 'trait_plus_base':
      // Must have the trait AND one of the required bases
      const hasTraits = Object.entries(combo.requirements).every(
        ([category, trait]) => nftTraits[category] === trait
      );
      const hasBase = combo.requiredBases.includes(nftTraits.Base);
      return hasTraits && hasBase;
    
    case 'single':
      // Just needs the one trait
      return Object.entries(combo.requirements).every(
        ([category, trait]) => nftTraits[category] === trait
      );
    
    default:
      return false;
  }
}
```

### Get All Badges for an NFT

```typescript
function getEarnedBadges(nftTraits: NftTraits, allCombos: Combo[]): Combo[] {
  return allCombos.filter(combo => checkBadge(combo, nftTraits));
}
```

### Display Badges

When NFT has earned badges, show them:

```tsx
{earnedBadges.length > 0 && (
  <div className="badges-container">
    <div className="badges-header">🏆 Badges Earned</div>
    <div className="badges-list">
      {earnedBadges.map(badge => (
        <div key={badge.id} className="badge-chip">
          <span className="badge-emoji">{badge.emoji}</span>
          <span className="badge-name">{badge.name}</span>
        </div>
      ))}
    </div>
  </div>
)}
```

### Badge Chip Styling

```css
.badges-container {
  margin: 16px 0;
  padding: 12px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 12px;
}

.badges-header {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
  color: #92400e;
}

.badges-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.badge-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: white;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.badge-emoji {
  font-size: 16px;
}

.badge-name {
  color: #1f2937;
}
```

### Optional: Expandable Badge Details

When user taps a badge, show the lore:

```tsx
const [expandedBadge, setExpandedBadge] = useState<string | null>(null);

{earnedBadges.map(badge => (
  <div key={badge.id}>
    <div 
      className="badge-chip" 
      onClick={() => setExpandedBadge(expandedBadge === badge.id ? null : badge.id)}
    >
      <span className="badge-emoji">{badge.emoji}</span>
      <span className="badge-name">{badge.name}</span>
    </div>
    {expandedBadge === badge.id && (
      <div className="badge-lore">{badge.lore}</div>
    )}
  </div>
))}
```

---

## Part 2: Combos in BigPulp Ask Tab

Add a section in the Ask tab showing all available combos/badges with their requirements and lore.

### Suggested Layout

```
┌─────────────────────────────────────────────────┐
│ 🏆 COMBO BADGES                                 │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ LEGENDARY (3)                               │ │
│ ├─────────────────────────────────────────────┤ │
│ │ 🟢 Namekian Royalty                         │ │
│ │ Piccolo Turban + Piccolo Uniform            │ │
│ │ The rarest named combo in the collection.   │ │
│ │ Only 7 exist. Namekian royalty for those    │ │
│ │ who understand the DBZ reference.           │ │
│ ├─────────────────────────────────────────────┤ │
│ │ 👑 Royal Neckbeard                          │ │
│ │ Crown + Neckbeard                           │ │
│ │ Two Tang Gang titans collide. Bullish0x's   │ │
│ │ Crown meets DegenWaffle's Winners Win.      │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ SIGNATURE (5)                               │ │
│ │ ...                                         │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Using Ionic Accordion

```tsx
import { IonAccordion, IonAccordionGroup, IonItem, IonLabel } from '@ionic/react';

const categories = [
  { id: 'legendary', name: 'Legendary Combos', emoji: '🏆' },
  { id: 'signature', name: 'Signature Combos', emoji: '✍️' },
  { id: 'military', name: 'Military Combos', emoji: '🪖' },
  { id: 'character', name: 'Character Combos', emoji: '🎭' },
  { id: 'divine', name: 'Divine Combos', emoji: '✨' },
  { id: 'location', name: 'Location Combos', emoji: '📍' },
  { id: 'single_trait', name: 'Single Trait Badges', emoji: '🎖️' },
];

<IonAccordionGroup>
  {categories.map(cat => {
    const combosInCategory = combos.filter(c => c.category === cat.id);
    return (
      <IonAccordion key={cat.id} value={cat.id}>
        <IonItem slot="header">
          <IonLabel>
            {cat.emoji} {cat.name} ({combosInCategory.length})
          </IonLabel>
        </IonItem>
        <div slot="content" className="combo-list">
          {combosInCategory.map(combo => (
            <div key={combo.id} className="combo-card">
              <div className="combo-header">
                <span className="combo-emoji">{combo.emoji}</span>
                <span className="combo-name">{combo.name}</span>
              </div>
              <div className="combo-requirements">
                {formatRequirements(combo)}
              </div>
              <div className="combo-lore">{combo.lore}</div>
            </div>
          ))}
        </div>
      </IonAccordion>
    );
  })}
</IonAccordionGroup>
```

### Format Requirements Helper

```typescript
function formatRequirements(combo: Combo): string {
  switch (combo.logic) {
    case 'exact':
      return Object.values(combo.requirements).join(' + ');
    
    case 'any_two':
      const traits = combo.requirementPool.map(req => Object.values(req)[0]);
      return `Any 2 of: ${traits.join(', ')}`;
    
    case 'trait_plus_base':
      const trait = Object.values(combo.requirements)[0];
      return `${trait} + ${combo.requiredBases.join('/')} base`;
    
    case 'single':
      return Object.values(combo.requirements)[0] + ' (single trait)';
    
    default:
      return '';
  }
}
```

### Combo Card Styling

```css
.combo-card {
  padding: 12px;
  border-bottom: 1px solid var(--ion-color-light);
}

.combo-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.combo-emoji {
  font-size: 20px;
}

.combo-name {
  font-weight: 600;
  font-size: 16px;
}

.combo-requirements {
  font-size: 13px;
  color: var(--ion-color-primary);
  margin-bottom: 8px;
  font-style: italic;
}

.combo-lore {
  font-size: 14px;
  line-height: 1.5;
  color: var(--ion-color-dark);
}
```

---

## Part 3: TypeScript Interfaces

```typescript
interface ComboRequirement {
  [category: string]: string;
}

interface Combo {
  id: string;
  name: string;
  emoji: string;
  category: 'legendary' | 'signature' | 'military' | 'character' | 'divine' | 'location' | 'single_trait';
  logic: 'exact' | 'any_two' | 'trait_plus_base' | 'single';
  requirements?: ComboRequirement;
  requirementPool?: ComboRequirement[];
  requiredBases?: string[];
  lore: string;
}

interface CombosData {
  combos: Combo[];
  categories: {
    [key: string]: {
      name: string;
      description: string;
    };
  };
}
```

---

## Part 4: Loading the Data

```typescript
const [combosData, setCombosData] = useState<CombosData | null>(null);

useEffect(() => {
  fetch('/assets/BigPulp/combos_badges.json')
    .then(res => res.json())
    .then(data => setCombosData(data))
    .catch(err => console.error('Failed to load combos:', err));
}, []);
```

---

## The 26 Badges (Quick Reference)

### Legendary (3)
- 🟢 **Namekian Royalty** - Piccolo Turban + Piccolo Uniform
- 👑 **Royal Neckbeard** - Crown + Neckbeard
- 👑 **Royal MOG** - Crown + MOG Glasses

### Signature (5)
- 🎩 **Classic Neckbeard** - Fedora + Neckbeard
- 🎖️ **Tang Gang Commander** - El Presidente + Military Beret
- ⚔️ **Full Ronin** - Any 2 of: Ronin Helmet, Ronin, Ronin Dojo
- 🧙 **High Council** - Any 2 of: Wizard Hat, Wizard Drip, Wizard Glasses, Spell Room
- 🍊 **Full Bepe** - Bepe Suit + Bepe base

### Military (5)
- 🪖 **Bepe Army** - Any 2 of: Bepe Army, Field Cap, Hard Hat, Bepe Barracks
- 🛡️ **Full SWAT** - SWAT Helmet + SWAT Gear
- 🔥 **Full Firefighter** - Firefighter Helmet + Firefighter Uniform
- ⚔️ **Full Viking** - Viking Helmet + Viking Armor
- 🏛️ **Full Roman** - Centurion + Roman Drip

### Character (7)
- 🧛 **Full Vampire** - Drac + Vampire Teeth
- ⚡ **Full Super Saiyan** - Super Saiyan + Super Saiyan Uniform
- 🤡 **Full Clown** - Clown + Clown Nose
- 🏴‍☠️ **Full Pirate** - Pirate Hat + Eye Patch
- 🐢 **Full Ninja Turtle** - Ninja Turtle Mask + Ninja Turtle Fit
- 😷 **Asylum Patient** - Straitjacket + Hannibal Mask

### Divine (3)
- 😇 **Divine Loadout** - Halo + God's Robe
- 😇 **Angel in Heaven** - Halo + Heaven background
- 😈 **Devil in Hell** - Devil Horns + Hell background

### Location (2)
- 🚀 **Lunar Landing** - Astronaut + Moon background
- 🌾 **Plot Secured** - Chia Farmer + Chia Farm background

### Single Trait (1)
- 🪿 **Honk Gang** - Goose Suit

---

## Testing Checklist

After implementation, verify:

### NFT Search Badge Display
- [ ] NFT #49 shows "Asylum Patient" badge (has Straitjacket + Hannibal Mask)
- [ ] NFT with Crown + Neckbeard shows "Royal Neckbeard" badge
- [ ] NFT with just Goose Suit shows "Honk Gang" badge
- [ ] NFT with Wizard Hat + Wizard Drip shows "High Council" badge
- [ ] NFT with no combos shows no badges section
- [ ] Tapping badge shows lore (if expandable implemented)

### Ask Tab Combos Section
- [ ] All 7 categories display
- [ ] Each category shows correct count
- [ ] All 26 combos display with emoji, name, requirements, lore
- [ ] Accordion expands/collapses properly
- [ ] Requirements format correctly for each logic type

---

## Files to Add/Update

1. **Add** `public/assets/BigPulp/combos_badges.json`
2. **Update** NFT display component to check for and show earned badges
3. **Update** BigPulp Ask tab to show all available combos
4. **Remove** any old hardcoded combo lists

🍊
