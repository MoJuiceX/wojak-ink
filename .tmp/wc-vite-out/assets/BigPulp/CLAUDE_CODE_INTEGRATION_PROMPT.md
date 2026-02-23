# 🍊 Big Pulp Integration Guide for Claude Code

## What This Is

Big Pulp is an AI-powered NFT analyst that provides unique commentary for each of the 4,200 Wojak Farmers Plot NFTs. Every paragraph includes:

- **Personality** - Witty, friendly, knowledgeable voice
- **Alpha** - Stats, positions, counts, and facts the user couldn't easily find themselves
- **Lore** - Creator shoutouts, community references, cultural context
- **Catchphrases** - Tang Gang community phrases like "Winners win, baby!" and "The beret stays on"

---

## File Details

**File:** `nft_takes.json` (1.13 MB)  
**Location:** `public/assets/BigPulp/nft_takes.json`  
**Entries:** 4,200 unique paragraphs

---

## Data Structure

```typescript
interface NftTake {
  take: string;                              // Main commentary (3-6 sentences, ~200 chars avg)
  mood: 'bullish' | 'neutral' | 'bearish';   // For UI styling
  didYouKnow?: string;                       // Optional special fact (~12% have this)
}

type NftTakesMap = Record<string, NftTake>;  // Key is edition number as string ("1" to "4200")
```

---

## Example Entries

```json
{
  "1": {
    "take": "Edition #1. The genesis piece. Where it all began. Crown AND Neckbeard AND MOG Glasses—Bullish and DegenWaffle on this one. 140 Crowns in the collection. Bullish0x psyoped the entire community into believing Crown is the most valuable trait. Guess what? It worked. Only 10 Crown + Neckbeard exist—you're #7. Only 184 Neckbeards exist. Royal Club energy 👑",
    "mood": "bullish",
    "didYouKnow": "Edition #1 is the genesis piece—the first Wojak Farmer ever minted. Tang Gang history."
  },
  "49": {
    "take": "Asylum Patient. 17 exist in the collection, you're #4. Top 4.4%. You've seen things. Red candles that don't stop. Rugs that came out of nowhere. 90% drawdowns. You're still here—but you're not okay. And that's okay. Too degen for therapy. Plus Laser Eyes—only 149 exist. Multiple high provenance traits stacking 🍊",
    "mood": "bullish",
    "didYouKnow": "You're #4 of 17 Asylum Patient holders."
  },
  "52": {
    "take": "Let's see... no headgear, no face wear. This one showed up like it forgot there was a mint happening. But someone has to hold the floor. Still farmed. Still counts. Plot secured 🍊",
    "mood": "bearish",
    "didYouKnow": "Edition #52 was an early mint but ended up near the bottom. Early doesn't always mean rare."
  }
}
```

---

## Loading the Data

```typescript
const [takes, setTakes] = useState<NftTakesMap>({});
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch('/assets/BigPulp/nft_takes.json')
    .then(res => res.json())
    .then(data => {
      setTakes(data);
      setLoading(false);
    })
    .catch(err => console.error('Failed to load Big Pulp takes:', err));
}, []);

// Lookup by edition number
const currentTake = takes[nftId];  // nftId is string: "1", "420", "4200", etc.
```

---

## UI Implementation

### 1. Main Take (Speech Bubble)
Display `take` in a speech bubble coming from Big Pulp character. The text already includes the emoji at the end (👑 for Crown holders, 🍊 for everyone else).

### 2. Mood Styling

| Mood | Count | Meaning | Suggested Styling |
|------|-------|---------|-------------------|
| `bullish` | 91% | High provenance, good rank, special edition | Green accent, positive vibe |
| `neutral` | 5% | Mid-tier, solid but not flashy | Orange/yellow accent |
| `bearish` | 4% | Bottom tier roasts (always ends positive) | Subtle red accent, friendly tone |

**Note:** Even `bearish` takes end on a positive note. They're friendly roasts, not insults.

### 3. "Did You Know?" Callout
Only ~12% of NFTs have this field. Render conditionally:

```tsx
{currentTake?.didYouKnow && (
  <div className="did-you-know">
    <span className="label">💡 Did You Know?</span>
    <p>{currentTake.didYouKnow}</p>
  </div>
)}
```

---

## What the Takes Contain

### Alpha (Value-Add Stats)
- **Position in combo:** "Only 10 Crown + Neckbeard exist—you're #7"
- **Percentile rank:** "Top 4.4%"
- **Trait counts:** "Only 149 Laser Eyes exist"
- **Base type count:** "Only 42 Bepe Waifus exist"
- **Partial combos:** "1 of 2 Full Viking pieces"

### Lore (Community Context)
- Creator names: Bullish0x, DegenWaffle, OrangeGooey, TheStakerClass, Tom Bepe
- Community phrases: "Winners win, baby!", "The beret stays on", "Accept cookies"
- Collection stories and cultural references

### Special Editions
Editions #1, #7, #77, #777, #420, #666, #4200 have special opener text acknowledging their significance.

---

## Error Handling

```typescript
// Loading state
if (loading) {
  return "Big Pulp is thinking... 🍊";
}

// Invalid NFT ID
if (!currentTake) {
  return "Enter a valid NFT ID (1-4200) to get Big Pulp's take.";
}
```

---

## Integration Checklist

1. [ ] Add `nft_takes.json` to `public/assets/BigPulp/`
2. [ ] Load JSON on BigPulp page mount
3. [ ] Display `take` in speech bubble when user enters NFT ID
4. [ ] Style based on `mood` (bullish/neutral/bearish)
5. [ ] Conditionally render "Did You Know?" callout
6. [ ] Handle loading and error states

---

## Key Points

- **Key format:** Edition number as string ("1" not 1)
- **File size:** 1.13 MB, loads once, instant lookups after
- **Every take has:** `take` and `mood`
- **Some takes have:** `didYouKnow` (~12%)
- **Emoji included:** 👑 for Crown, 🍊 for everyone else (already in the text)
