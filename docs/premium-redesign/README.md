# Premium Redesign Documentation

## Files Created

### CSS (in src/styles/)
- `premium-tokens.css` - CSS variables for glassmorphism, glows, etc.
- `premium-effects.css` - Utility classes (.glass, .hover-lift, .glow-*)
- `ambient-background.css` - Floating gradient orbs styles

### Components (in src/components/)
- `AmbientBackground.tsx` - Gradient orbs component

### Hooks (in src/hooks/)
- `useUISound.ts` - Sound hook (adjust to your settings)

---

## Implementation Steps

### Step 1: Import CSS
In your main CSS file (src/index.css), add at the END:
```css
@import './styles/premium-tokens.css';
@import './styles/premium-effects.css';
@import './styles/ambient-background.css';
```

### Step 2: Add Ambient Background
In App.tsx, add before your main content:
```tsx
import { AmbientBackground } from './components/AmbientBackground';

function App() {
  return (
    <>
      <AmbientBackground />
      {/* rest of your app */}
    </>
  );
}
```

### Step 3: Apply Glass Classes
Add classes to your existing cards:
```tsx
// Before
<div className="nft-card">

// After
<div className="nft-card glass hover-lift glow-orange">
```

### Step 4: Add Section Attributes
On each page root element:
```tsx
<div data-section="bigpulp">  // Uses cyan glow
<div data-section="games">     // Uses purple glow
<div data-section="treasury">  // Uses green glow
```

---

## Class Reference

| Class | Effect |
|-------|--------|
| `glass` | Frosted glass background |
| `glass-strong` | More opaque glass |
| `hover-lift` | Lifts 4px on hover |
| `glow-orange` | Orange glow on hover |
| `glow-cyan` | Cyan glow on hover |
| `glow-purple` | Purple glow on hover |
| `glow-green` | Green glow on hover |
| `glow-section` | Auto-glow based on data-section |
| `premium-card` | Combined glass + lift + glow |

---

## Verification Checklist

- [ ] CSS imports added to main CSS file
- [ ] AmbientBackground added to App.tsx
- [ ] Gradient orbs visible behind content
- [ ] Glass classes applied to cards
- [ ] Hover effects working
- [ ] All routes still work
- [ ] Theme switching still works
