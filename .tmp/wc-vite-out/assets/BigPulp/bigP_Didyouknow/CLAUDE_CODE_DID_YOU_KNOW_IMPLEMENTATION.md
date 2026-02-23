# 💡 Did You Know? - Claude Code Implementation Guide

## Overview

The "Did You Know?" system is a **separate JSON file** containing interesting facts for ~33% of NFTs (1,390 out of 4,200). These are bonus facts that appear below or alongside the main Big Pulp take.

**Key principle:** Not every NFT gets a "Did You Know?" – only those with genuinely interesting facts deserve one.

---

## File Details

**File:** `did_you_know.json`  
**Location:** `public/assets/BigPulp/did_you_know.json`  
**Entries:** 1,390 (33.1% of collection)  
**Size:** ~200 KB

---

## JSON Structure

```typescript
interface DidYouKnow {
  token_id: number;
  didYouKnow: string;
}

type DidYouKnowMap = Record<string, DidYouKnow>;  // Key is edition number as string
```

**Example:**
```json
{
  "1": {
    "token_id": 1,
    "didYouKnow": "Edition #1 is the genesis piece – the very first Wojak Farmer ever minted. Tang Gang history starts here."
  },
  "420": {
    "token_id": 420,
    "didYouKnow": "Edition #420 – the meme number immortalized on-chain. This edition will never not be funny."
  }
}
```

**Important:** If an NFT ID is NOT in this file, it doesn't have a "Did You Know?" fact. This is intentional.

---

## Loading the Data

Load separately from the main takes:

```typescript
const [didYouKnow, setDidYouKnow] = useState<DidYouKnowMap>({});

useEffect(() => {
  fetch('/assets/BigPulp/did_you_know.json')
    .then(res => res.json())
    .then(data => setDidYouKnow(data))
    .catch(err => console.error('Failed to load Did You Know:', err));
}, []);
```

---

## Displaying Did You Know

Only render if the NFT has a fact:

```tsx
const nftId = "420";
const dykEntry = didYouKnow[nftId];

// Only show if fact exists
{dykEntry && (
  <div className="did-you-know-container">
    <div className="dyk-label">💡 Did You Know?</div>
    <div className="dyk-text">{dykEntry.didYouKnow}</div>
  </div>
)}
```

---

## UI Placement Options

### Option A: Below Big Pulp Take (Current)
```
┌─────────────────────────────────────┐
│ Big Pulp Speech Bubble              │
│ [Main take text here...]            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 💡 Did You Know?                    │
│ [Fact text here...]                 │
└─────────────────────────────────────┘
```

### Option B: Separate Callout Box
```
┌─────────────────────────────────────┐
│ Big Pulp Speech Bubble              │
│ [Main take text here...]            │
└─────────────────────────────────────┘

      ┌───────────────────────┐
      │ 💡 [Fact text...]     │
      └───────────────────────┘
```

### Option C: Expandable/Collapsible
```
┌─────────────────────────────────────┐
│ Big Pulp Take                       │
│                                     │
│ [💡 Did You Know?] ▼                │ ← Click to expand
└─────────────────────────────────────┘
```

---

## Styling Suggestions

```css
.did-you-know-container {
  margin-top: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-left: 4px solid #f59e0b;
  border-radius: 0 8px 8px 0;
  font-size: 14px;
}

.dyk-label {
  font-weight: 600;
  color: #92400e;
  margin-bottom: 4px;
}

.dyk-text {
  color: #78350f;
  line-height: 1.5;
}
```

Or with Tailwind:
```tsx
<div className="mt-3 p-3 bg-gradient-to-r from-amber-100 to-yellow-100 border-l-4 border-amber-500 rounded-r-lg">
  <div className="font-semibold text-amber-800 text-sm">💡 Did You Know?</div>
  <div className="text-amber-900 text-sm mt-1">{dykEntry.didYouKnow}</div>
</div>
```

---

## What Gets a Did You Know?

Facts are only generated for NFTs that have something genuinely interesting:

| Category | Example |
|----------|---------|
| **Special Editions** | #1, #7, #69, #77, #100, #420, #666, #777, #1000, #2100, #4200 |
| **Rare Combos** | "Only 6 Classic Neckbeards exist – you're #4" |
| **#1 in Combo/Base** | "You're #1 out of all 47 Full Vampire holders" |
| **Trait Exclusivity** | "Piccolo Turban can ONLY appear on Alien Wojak bases" |
| **Trait Affinities** | "69% of Headphones landed on Monkey Zoo" |
| **Ultra-Rare Traits** | "Only 9 Piccolo Turbans exist" |
| **Rare Base Characters** | "Only 35 Alien Waifus exist" |
| **Top Rankings** | "Rank 42 puts you in the top 1%" |
| **Interesting Contrasts** | "Early mint but bottom rank – traits determine destiny" |
| **Special Lore** | "Gene Hoffman promised to honk on Joe Rogan" |

---

## Example Integration

Full component combining both takes and DYK:

```tsx
interface BigPulpFullProps {
  nftId: string;
  takes: NftTakesMap;
  didYouKnow: DidYouKnowMap;
}

const BigPulpFull: React.FC<BigPulpFullProps> = ({ nftId, takes, didYouKnow }) => {
  const take = takes[nftId];
  const dyk = didYouKnow[nftId];
  
  if (!take) {
    return <div>Enter NFT ID (1-4200)</div>;
  }
  
  return (
    <div className="bigpulp-wrapper">
      {/* Main Take */}
      <div className={`bigpulp-take tone-${take.tone}`}>
        <div className="take-header">
          #{take.token_id} • Rank {take.open_rarity_rank}
        </div>
        <div className="take-body">
          {take.take}
        </div>
      </div>
      
      {/* Did You Know - Only if exists */}
      {dyk && (
        <div className="did-you-know">
          <span className="dyk-icon">💡</span>
          <span className="dyk-label">Did You Know?</span>
          <p className="dyk-text">{dyk.didYouKnow}</p>
        </div>
      )}
    </div>
  );
};
```

---

## Sample Facts

| Edition | Did You Know? |
|---------|---------------|
| **#1** | "Edition #1 is the genesis piece – the very first Wojak Farmer ever minted. Tang Gang history starts here." |
| **#69** | "Edition #69. Nice. The internet's favorite number, permanently on-chain." |
| **#420** | "Edition #420 – the meme number immortalized on-chain. This edition will never not be funny." |
| **#666** | "Edition #666 carries the devil's number. Some say MoJuice curated this one with extra chaos." |
| **#2** | "Only 6 complete Classic Neckbeard sets exist in the entire collection. You're #6 of them." |
| **#52** | "Edition #52 was an early mint but landed near the bottom. Early doesn't always mean rare – traits determine destiny." |
| **#3843** | "Only 35 Alien Waifus exist – one of the rarest base characters. Cosmic queen energy." |

---

## Checklist

1. [ ] Add `did_you_know.json` to `public/assets/BigPulp/`
2. [ ] Create state for DYK data: `useState<DidYouKnowMap>({})`
3. [ ] Load DYK on mount (separate from main takes)
4. [ ] Conditionally render DYK only when `didYouKnow[nftId]` exists
5. [ ] Style the DYK container distinctly from the main take
6. [ ] Test with: #1, #420, #666 (should have DYK) and #100, #500 (may not)

---

## Tips

1. **Don't show empty state** – If no DYK exists, render nothing. Don't say "No fact available."

2. **Keep it separate** – DYK is bonus content, not essential. The main take should stand alone.

3. **Distinct styling** – Make DYK visually different from the main take so users understand it's supplementary.

4. **Light background** – Amber/yellow works well for "fun fact" energy.

5. **Small file** – At ~200KB, you can load this alongside the main takes without performance concern.

🍊
