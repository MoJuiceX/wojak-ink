# How It Works — In-App Combat Guide

---

## Overview

Users need to understand how the combat system works: 18 types, type matchups, natures, abilities, and how battles play out. This is a browsable in-app page accessible from Fight Club.

---

## Task 1: Create How It Works Page

**File:** `src/pages/HowItWorks.tsx` (NEW)

A scrollable page with collapsible sections explaining the combat system.

### Page Structure:

```tsx
import { useState } from 'react';
import { ChevronDown, ChevronUp, Swords, Zap, Shield, Sparkles, Info } from 'lucide-react';
import { PageTransition } from '@/components/layout/PageTransition';
import { useLayout } from '@/hooks/useLayout';
import { COMBAT_TYPES } from '@/lib/combat/types';

export default function HowItWorks() {
  const { contentPadding } = useLayout();

  return (
    <PageTransition>
      <div style={{ padding: contentPadding }} className="flex flex-col gap-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">How Combat Works</h1>
          <p className="text-secondary mt-1">
            Everything you need to know about Wojak battles.
          </p>
        </div>

        <CombatTypesSection />
        <TypeMatchupSection />
        <NaturesSection />
        <AbilitiesSection />
        <HowBattlesWorkSection />
        <PowerScoringSection />
      </div>
    </PageTransition>
  );
}
```

---

## Task 2: Combat Types Section

Display all 18 types in a visual grid. Each type gets a colored badge.

```tsx
function CombatTypesSection() {
  // Use the TYPE_COLOR_MAP (same as FighterRevealCard) or import from shared location
  const types = [
    { name: 'NEUTRAL', color: '#a0a0b0', desc: 'Balanced all-rounder. No major strengths or weaknesses.' },
    { name: 'FIRE', color: '#ef4444', desc: 'High special attack. Strong vs Grass, Ice, Insect, Metal.' },
    { name: 'WATER', color: '#3b82f6', desc: 'Tanky with good special defense. Strong vs Fire, Earth, Stone.' },
    { name: 'ELECTRIC', color: '#eab308', desc: 'Blazing fast. Strong vs Water, Air.' },
    { name: 'GRASS', color: '#22c55e', desc: 'Defensive with drain moves. Strong vs Water, Earth, Stone.' },
    { name: 'ICE', color: '#67e8f9', desc: 'Glass cannon. Strong vs Grass, Earth, Air, Dragon.' },
    { name: 'MARTIAL', color: '#f97316', desc: 'Physical powerhouse. Strong vs Neutral, Ice, Stone, Metal, Shadow.' },
    { name: 'VENOM', color: '#a855f7', desc: 'Status specialist. Strong vs Grass, Mystic.' },
    { name: 'EARTH', color: '#a16207', desc: 'Sturdy tank. Strong vs Fire, Electric, Venom, Stone, Metal.' },
    { name: 'AIR', color: '#7dd3fc', desc: 'Evasive and fast. Strong vs Grass, Martial, Insect.' },
    { name: 'PSYCHE', color: '#ec4899', desc: 'Special attack specialist. Strong vs Martial, Venom.' },
    { name: 'INSECT', color: '#84cc16', desc: 'Swarm tactics. Strong vs Grass, Psyche, Shadow.' },
    { name: 'STONE', color: '#78716c', desc: 'Raw physical power. Strong vs Fire, Ice, Air, Insect.' },
    { name: 'GHOST', color: '#6366f1', desc: 'Tricky and evasive. Strong vs Psyche, Ghost.' },
    { name: 'DRAGON', color: '#7c3aed', desc: 'Elite powerhouse. Strong vs Dragon.' },
    { name: 'SHADOW', color: '#1e293b', desc: 'Sneaky and manipulative. Strong vs Psyche, Ghost.' },
    { name: 'METAL', color: '#94a3b8', desc: 'Heavily armored. Strong vs Ice, Stone, Mystic.' },
    { name: 'MYSTIC', color: '#f9a8d4', desc: 'Dragon slayer. Strong vs Martial, Dragon, Shadow.' },
  ];

  return (
    <CollapsibleSection title="18 Combat Types" icon={<Sparkles size={18} />} defaultOpen>
      <p className="text-secondary text-sm mb-4">
        Your Wojak's type is determined by the traits and colors you choose in the Generator.
        Each type has different strengths and weaknesses in battle.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {types.map(t => (
          <div key={t.name} className="card-static p-3">
            <div
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold mb-1"
              style={{ background: `${t.color}20`, color: t.color }}
            >
              {t.name}
            </div>
            <p className="text-xs text-secondary">{t.desc}</p>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}
```

---

## Task 3: Type Matchup Chart

An interactive grid showing effectiveness multipliers. This is the most important reference.

```tsx
function TypeMatchupSection() {
  // Import the type chart data
  // import { TYPE_CHART } from '@/lib/combat/data/type-chart';

  return (
    <CollapsibleSection title="Type Matchups" icon={<Swords size={18} />}>
      <p className="text-secondary text-sm mb-4">
        Type matchups determine damage multipliers in battle.
        Green = super effective (2×), red = not very effective (0.5×), black = immune (0×).
      </p>

      {/* Scrollable type chart table */}
      <div className="overflow-x-auto" style={{ maxWidth: '100%' }}>
        {/* Build a table from TYPE_CHART data */}
        {/* Attacker types on rows, Defender types on columns */}
        {/* Color cells: 2.0 = green, 1.0 = gray, 0.5 = red, 0.25 = dark red, 0 = black */}
      </div>

      <p className="text-xs text-muted mt-2">
        Scroll horizontally to see all matchups. Attacker is on the left, defender on top.
      </p>
    </CollapsibleSection>
  );
}
```

Build the actual chart from `src/lib/combat/data/type-chart.ts`. The data is a 18×18 matrix. Each cell should be color-coded:
- `2.0` → green background, shows "2×"
- `1.0` → no color, shows "1×" or just blank
- `0.5` → red-ish background, shows "½"
- `0.25` → darker red, shows "¼"
- `0` → black, shows "✕" or "0"

Type names should be abbreviated to 3-4 chars in the header for space (FIR, WAT, ELE, GRS, etc.)

---

## Task 4: Natures Section

Explain what natures do with a simple table.

```tsx
function NaturesSection() {
  // Import natures data
  // import { NATURES } from '@/lib/combat/data/natures';

  return (
    <CollapsibleSection title="Natures" icon={<Zap size={18} />}>
      <p className="text-secondary text-sm mb-4">
        Every Wojak has a Nature that boosts one stat by 10% and reduces another by 10%.
        Natures are determined by the color balance of your Wojak.
      </p>

      {/* Table of natures */}
      <div className="flex flex-col gap-1">
        {/* For each nature: Name | +Stat | -Stat */}
        {/* Use the natures data from natures.ts */}
        {/* Show boost stat in green, reduce stat in red */}
        {/* "Balanced" nature has no boost/reduce */}
      </div>

      <div className="card-static p-3 mt-3" style={{ borderLeft: '3px solid var(--color-primary)' }}>
        <p className="text-xs text-secondary">
          <strong className="text-primary">Tip:</strong> Warm colors (red, orange) tend toward Attack.
          Cool colors (blue, purple) tend toward Special Defense. Bright neon colors boost Speed.
        </p>
      </div>
    </CollapsibleSection>
  );
}
```

---

## Task 5: Abilities Section

Brief explanation of how abilities work, grouped by type.

```tsx
function AbilitiesSection() {
  return (
    <CollapsibleSection title="Abilities" icon={<Shield size={18} />}>
      <p className="text-secondary text-sm mb-4">
        Each type has two possible abilities — one offensive and one defensive.
        Your Wojak gets the one that matches its stat profile.
      </p>
      {/* List abilities from abilities.ts, grouped by type */}
      {/* Each ability: name, brief description, offensive/defensive tag */}
    </CollapsibleSection>
  );
}
```

---

## Task 6: How Battles Work Section

High-level explanation of the battle system.

```tsx
function HowBattlesWorkSection() {
  return (
    <CollapsibleSection title="How Battles Work" icon={<Swords size={18} />}>
      <div className="flex flex-col gap-3 text-sm text-secondary">
        <p><strong className="text-primary">Turn-Based Combat</strong> — Each turn, both fighters pick a move. Moves resolve based on speed stat.</p>
        <p><strong className="text-primary">4 Moves</strong> — Each Wojak has 3 attack moves and 1 skill move (heal, buff, debuff, status effect).</p>
        <p><strong className="text-primary">Type Matchups</strong> — Super effective moves deal 2× damage. Not very effective moves deal ½ damage.</p>
        <p><strong className="text-primary">Status Effects</strong> — Burns halve attack, paralysis may skip turns, sleep prevents action, poison deals chip damage.</p>
        <p><strong className="text-primary">Critical Hits</strong> — Random 1.25× damage multiplier. Some moves have higher crit rates.</p>
        <p><strong className="text-primary">Winner</strong> — First fighter to reach 0 HP loses. Winner gains XP, ELO, and Power.</p>
      </div>
    </CollapsibleSection>
  );
}
```

---

## Task 7: Power Scoring Section

Explain what Power means and how it works.

```tsx
function PowerScoringSection() {
  return (
    <CollapsibleSection title="Power & Rankings" icon={<Zap size={18} />}>
      <div className="flex flex-col gap-2 text-sm text-secondary">
        <p>Every Wojak accumulates <strong className="text-primary">Power</strong> from votes and battles:</p>
        <div className="grid grid-cols-2 gap-2 mt-1">
          <div className="card-static p-2 text-center">
            <p className="text-lg font-bold text-success">+30</p>
            <p className="text-xs">Battle Win</p>
          </div>
          <div className="card-static p-2 text-center">
            <p className="text-lg font-bold text-error">-10</p>
            <p className="text-xs">Battle Loss</p>
          </div>
          <div className="card-static p-2 text-center">
            <p className="text-lg font-bold text-secondary">+5</p>
            <p className="text-xs">Draw</p>
          </div>
          <div className="card-static p-2 text-center">
            <p className="text-lg font-bold text-accent">±1</p>
            <p className="text-xs">Per Vote</p>
          </div>
        </div>
        <p className="mt-2">The <strong>Rankings</strong> tab shows both individual Wojak power and total power per player (sum of all their Wojaks).</p>
      </div>
    </CollapsibleSection>
  );
}
```

---

## Task 8: Collapsible Section Helper

Create a reusable collapsible section component used throughout the page:

```tsx
function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="card-static overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center gap-3 p-4 text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        {icon}
        <span className="font-semibold flex-1">{title}</span>
        {isOpen ? <ChevronUp size={18} className="text-muted" /> : <ChevronDown size={18} className="text-muted" />}
      </button>
      {isOpen && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}
```

---

## Task 9: Add Route and Navigation Link

**File:** `src/App.tsx` (or routes config)

Add the route:
```tsx
<Route path="/fight-club/guide" element={<HowItWorks />} />
```

**File:** `src/pages/FightClub.tsx`

Add a small "?" or "How It Works" link in the Fight Club header area, near the tab bar:

```tsx
<Link
  to="/fight-club/guide"
  className="btn btn-ghost text-xs flex items-center gap-1"
  style={{ padding: '6px 10px', minWidth: 'auto' }}
>
  <Info size={14} />
  Guide
</Link>
```

Place it next to the RefreshButton in the tab bar header.

---

## Rules
- Run `npm run build` after each task
- Commit and `git push origin main` after each task
- Visual styles in `src/styles/theme.css`
- No `!important`
- Import real data from `src/lib/combat/data/` — don't hardcode type chart values
- The page should be fully functional with real data, not placeholder text
- Keep sections collapsible to avoid overwhelming users
- The type matchup chart must be scrollable on mobile
- Use existing card-static and badge classes from theme.css
