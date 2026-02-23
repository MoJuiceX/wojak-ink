# Claude Code: Update High Provenance Traits

## Task

Update the BigPulp "Ask" tab to display High Provenance (HP) traits with their lore explanations. Replace the existing HP traits list with this new definitive list of 43 traits.

---

## New Data File

Add this file to your project:

**Location:** `public/assets/BigPulp/hp_traits.json`

The file contains 43 HP traits organized by category (head, clothes, faceWear, mouth). Each trait has:
- `count` - How many exist in the collection
- `creator` - Who created or inspired this trait
- `lore` - 1-2 sentence explanation of WHY this trait is High Provenance

---

## JSON Structure

```typescript
interface HpTrait {
  count: number;
  creator: string;
  lore: string;
}

interface HpTraitsData {
  head: Record<string, HpTrait>;
  clothes: Record<string, HpTrait>;
  faceWear: Record<string, HpTrait>;
  mouth: Record<string, HpTrait>;
}
```

---

## Implementation Requirements

### 1. Load the HP Traits Data

```typescript
const [hpTraits, setHpTraits] = useState<HpTraitsData | null>(null);

useEffect(() => {
  fetch('/assets/BigPulp/hp_traits.json')
    .then(res => res.json())
    .then(data => setHpTraits(data))
    .catch(err => console.error('Failed to load HP traits:', err));
}, []);
```

### 2. Display in BigPulp Ask Tab

When showing HP traits, display:
- Trait name
- Count (e.g., "140 exist")
- Creator attribution
- **Lore explanation** (the WHY - this is important!)

### 3. Suggested UI Layout

```
┌─────────────────────────────────────────────────┐
│ 👑 HIGH PROVENANCE TRAITS                       │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ HEAD (14)                                   │ │
│ ├─────────────────────────────────────────────┤ │
│ │ Crown                           140 exist   │ │
│ │ Creator: Bullish0x                          │ │
│ │ Bullish0x convinced the entire Tang Gang    │ │
│ │ community that Crown is the most valuable   │ │
│ │ trait. Royal Club members don't sell.       │ │
│ ├─────────────────────────────────────────────┤ │
│ │ Piccolo Turban                    9 exist   │ │
│ │ Creator: MoJuice                            │ │
│ │ The rarest head trait, ONLY on Alien Wojak  │ │
│ │ bases. The Green Connection: Chia green,    │ │
│ │ Piccolo green, money green.                 │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ CLOTHES (18)                                │ │
│ │ ...                                         │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 4. Alternative: Expandable/Accordion Style

For mobile, consider an accordion where:
- Category headers (HEAD, CLOTHES, etc.) are tappable
- Traits expand to show lore on tap
- Collapsed view shows just trait name + count

```tsx
<IonAccordionGroup>
  <IonAccordion value="head">
    <IonItem slot="header">
      <IonLabel>HEAD (14 traits)</IonLabel>
    </IonItem>
    <div slot="content">
      {Object.entries(hpTraits.head).map(([name, trait]) => (
        <div key={name} className="hp-trait-card">
          <div className="hp-trait-header">
            <span className="hp-trait-name">{name}</span>
            <span className="hp-trait-count">{trait.count} exist</span>
          </div>
          <div className="hp-trait-creator">Creator: {trait.creator}</div>
          <div className="hp-trait-lore">{trait.lore}</div>
        </div>
      ))}
    </div>
  </IonAccordion>
  {/* ... more categories */}
</IonAccordionGroup>
```

---

## Styling Suggestions

```css
.hp-trait-card {
  padding: 12px;
  border-bottom: 1px solid var(--ion-color-light);
}

.hp-trait-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.hp-trait-name {
  font-weight: 600;
  font-size: 16px;
}

.hp-trait-count {
  font-size: 14px;
  color: var(--ion-color-medium);
}

.hp-trait-creator {
  font-size: 13px;
  color: var(--ion-color-primary);
  margin-bottom: 6px;
}

.hp-trait-lore {
  font-size: 14px;
  line-height: 1.5;
  color: var(--ion-color-dark);
}
```

---

## The 43 HP Traits (Quick Reference)

### Head (14)
Crown, Piccolo Turban, Tiara, Headphones, Military Beret, Fedora, Wizard Hat, Ronin Helmet, Pirate Hat, Clown, Trump Wave, Spikes, Super Saiyan, Centurion

### Clothes (18)
Piccolo Uniform, El Presidente, Bepe Suit, Straitjacket, Drac, Viking Armor, Ronin, Roman Drip, Wizard Drip, Bepe Army, Chia Farmer, Super Saiyan Uniform, SWAT Gear, Astronaut, Pickle Suit, Goose Suit, Gopher Suit, Proof of Prayer, Leather Jacket

### Face Wear (7)
VR Headset, Wizard Glasses, Laser Eyes, Clown Nose, MOG Glasses, Fake It Mask, Cyber Shades

### Mouth (4)
Hannibal Mask, Vampire Teeth, Neckbeard, Gold Teeth

---

## IMPORTANT: Traits REMOVED from HP

These traits are NO LONGER High Provenance - remove them if they exist in current implementation:

- God's Robe ❌
- SWAT Helmet ❌
- Firefighter Helmet ❌
- Cowboy Hat ❌
- Viking Helmet ❌
- Devil Horns ❌
- Halo ❌
- Eye Patch ❌
- Ninja Turtle Mask ❌

---

## Files to Update

1. Add `public/assets/BigPulp/hp_traits.json` (new file)
2. Update BigPulp Ask tab component to load and display HP traits with lore
3. Remove any hardcoded HP trait lists and use the JSON instead
4. Ensure the lore is displayed prominently - it explains WHY each trait matters

---

## Testing

After implementation, verify:
- [ ] All 43 traits display correctly
- [ ] Lore shows for each trait
- [ ] Creator attribution is visible
- [ ] Removed traits (God's Robe, etc.) no longer appear as HP
- [ ] Mobile layout works well (accordion recommended)
- [ ] Category counts are correct (14 + 18 + 7 + 4 = 43)

🍊
