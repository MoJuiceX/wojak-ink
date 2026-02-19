/**
 * How It Works - Combat Guide Page
 *
 * In-app guide explaining the combat system: 18 types, type matchups,
 * natures, abilities, battle mechanics, and power scoring.
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Swords, Zap, Shield, Sparkles } from 'lucide-react';
import { PageTransition } from '@/components/layout/PageTransition';
import { useLayout } from '@/hooks/useLayout';
import { COMBAT_TYPES, type CombatType } from '@/lib/combat/types';
import { TYPE_COLORS, DARK_TEXT_TYPES } from '@/lib/combat/data/type-colors';
import { TYPE_CHART } from '@/lib/combat/data/type-chart';
import { NATURES } from '@/lib/combat/data/natures';
import { ABILITIES } from '@/lib/combat/data/abilities';
import type { StatName } from '@/lib/combat/types';

// Human-readable stat names
const STAT_DISPLAY: Record<StatName, string> = {
  attack: 'Attack',
  defense: 'Defense',
  sp_atk: 'Sp. Atk',
  sp_def: 'Sp. Def',
  speed: 'Speed',
};

// Abbreviated type names for the chart (3-4 chars)
const TYPE_ABBREV: Record<CombatType, string> = {
  NEUTRAL: 'NOR',
  FIRE: 'FIR',
  WATER: 'WAT',
  ELECTRIC: 'ELE',
  GRASS: 'GRS',
  ICE: 'ICE',
  MARTIAL: 'MAR',
  VENOM: 'VEN',
  EARTH: 'ERT',
  AIR: 'AIR',
  PSYCHE: 'PSY',
  INSECT: 'INS',
  STONE: 'STN',
  GHOST: 'GHO',
  DRAGON: 'DRG',
  SHADOW: 'SHD',
  METAL: 'MTL',
  MYSTIC: 'MYS',
};

// Type descriptions for the combat types section
const TYPE_DESCRIPTIONS: Record<CombatType, string> = {
  NEUTRAL: 'Balanced all-rounder. No major strengths or weaknesses.',
  FIRE: 'High special attack. Strong vs Grass, Ice, Insect, Metal.',
  WATER: 'Tanky with good special defense. Strong vs Fire, Earth, Stone.',
  ELECTRIC: 'Blazing fast. Strong vs Water, Air.',
  GRASS: 'Defensive with drain moves. Strong vs Water, Earth, Stone.',
  ICE: 'Glass cannon. Strong vs Grass, Earth, Air, Dragon.',
  MARTIAL: 'Physical powerhouse. Strong vs Neutral, Ice, Stone, Metal, Shadow.',
  VENOM: 'Status specialist. Strong vs Grass, Mystic.',
  EARTH: 'Sturdy tank. Strong vs Fire, Electric, Venom, Stone, Metal.',
  AIR: 'Evasive and fast. Strong vs Grass, Martial, Insect.',
  PSYCHE: 'Special attack specialist. Strong vs Martial, Venom.',
  INSECT: 'Swarm tactics. Strong vs Grass, Psyche, Shadow.',
  STONE: 'Raw physical power. Strong vs Fire, Ice, Air, Insect.',
  GHOST: 'Tricky and evasive. Strong vs Psyche, Ghost.',
  DRAGON: 'Elite powerhouse. Strong vs Dragon.',
  SHADOW: 'Sneaky and manipulative. Strong vs Psyche, Ghost.',
  METAL: 'Heavily armored. Strong vs Ice, Stone, Mystic.',
  MYSTIC: 'Dragon slayer. Strong vs Martial, Dragon, Shadow.',
};

// Collapsible section helper component
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

// Combat Types Section - displays all 18 types with colors and descriptions
function CombatTypesSection() {
  return (
    <CollapsibleSection title="18 Combat Types" icon={<Sparkles size={18} />} defaultOpen>
      <p className="text-secondary text-sm mb-4">
        Your Wojak's type is determined by the traits and colors you choose in the Generator.
        Each type has different strengths and weaknesses in battle.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {COMBAT_TYPES.map((type) => {
          const color = TYPE_COLORS[type];
          const useDarkText = DARK_TEXT_TYPES.includes(type);
          return (
            <div key={type} className="card-static p-3">
              <div
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold mb-1"
                style={{
                  background: `${color}20`,
                  color: useDarkText ? color : color,
                }}
              >
                {type}
              </div>
              <p className="text-xs text-secondary">{TYPE_DESCRIPTIONS[type]}</p>
            </div>
          );
        })}
      </div>
    </CollapsibleSection>
  );
}

// Get cell styling based on effectiveness multiplier
function getEffectivenessStyle(value: number): { bg: string; text: string; display: string } {
  if (value === 0) return { bg: '#1a1a1a', text: '#666', display: '✕' };
  if (value === 0.25) return { bg: '#4a1515', text: '#ff6b6b', display: '¼' };
  if (value === 0.5) return { bg: '#3d2020', text: '#ff8888', display: '½' };
  if (value === 2) return { bg: '#1a3d1a', text: '#4ade80', display: '2×' };
  return { bg: 'transparent', text: '#666', display: '' }; // 1.0 = neutral
}

// Type Matchup Chart - 18x18 grid showing effectiveness
function TypeMatchupSection() {
  return (
    <CollapsibleSection title="Type Matchups" icon={<Swords size={18} />}>
      <p className="text-secondary text-sm mb-4">
        Type matchups determine damage multipliers in battle.
        Green = super effective (2×), red = not very effective (0.5×), black = immune (0×).
      </p>

      {/* Scrollable type chart table */}
      <div className="overflow-x-auto" style={{ maxWidth: '100%' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '10px' }}>
          <thead>
            <tr>
              <th style={{ padding: '4px', textAlign: 'left', position: 'sticky', left: 0, background: 'var(--color-surface)', zIndex: 1 }}>
                <span className="text-muted">ATK↓ DEF→</span>
              </th>
              {COMBAT_TYPES.map((defType) => (
                <th
                  key={defType}
                  style={{
                    padding: '4px 2px',
                    textAlign: 'center',
                    color: TYPE_COLORS[defType],
                    fontWeight: 600,
                    minWidth: '28px',
                  }}
                >
                  {TYPE_ABBREV[defType]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMBAT_TYPES.map((atkType) => (
              <tr key={atkType}>
                <td
                  style={{
                    padding: '4px 6px',
                    fontWeight: 600,
                    color: TYPE_COLORS[atkType],
                    position: 'sticky',
                    left: 0,
                    background: 'var(--color-surface)',
                    zIndex: 1,
                  }}
                >
                  {TYPE_ABBREV[atkType]}
                </td>
                {COMBAT_TYPES.map((defType) => {
                  const value = TYPE_CHART[atkType][defType];
                  const style = getEffectivenessStyle(value);
                  return (
                    <td
                      key={defType}
                      style={{
                        padding: '3px',
                        textAlign: 'center',
                        background: style.bg,
                        color: style.text,
                        fontWeight: value !== 1 ? 600 : 400,
                        minWidth: '28px',
                      }}
                    >
                      {style.display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted mt-2">
        Scroll horizontally to see all matchups. Attacker is on the left, defender on top.
      </p>
    </CollapsibleSection>
  );
}

// Natures Section - displays all 25 natures with boost/reduce stats
function NaturesSection() {
  // Separate balanced natures (no boost/reduce) from stat-modifying ones
  const balancedNatures = NATURES.filter((n) => n.boost === null && n.reduce === null);
  const modifyingNatures = NATURES.filter((n) => n.boost !== null || n.reduce !== null);

  return (
    <CollapsibleSection title="Natures" icon={<Zap size={18} />}>
      <p className="text-secondary text-sm mb-4">
        Every Wojak has a Nature that boosts one stat by 10% and reduces another by 10%.
        Natures are determined by the color balance of your Wojak.
      </p>

      {/* Stat-modifying natures */}
      <div className="flex flex-col gap-1 mb-3">
        {modifyingNatures.map((nature) => (
          <div
            key={nature.name}
            className="flex items-center justify-between p-2 rounded"
            style={{ background: 'var(--color-white-5)' }}
          >
            <span className="text-sm font-medium">{nature.name}</span>
            <div className="flex gap-3 text-xs">
              <span className="text-success">+{nature.boost ? STAT_DISPLAY[nature.boost] : ''}</span>
              <span className="text-error">-{nature.reduce ? STAT_DISPLAY[nature.reduce] : ''}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Balanced natures */}
      <div className="flex flex-wrap gap-2 mb-3">
        {balancedNatures.map((nature) => (
          <span
            key={nature.name}
            className="px-2 py-1 rounded text-xs text-secondary"
            style={{ background: 'var(--color-white-5)' }}
          >
            {nature.name} <span className="text-muted">(neutral)</span>
          </span>
        ))}
      </div>

      <div className="card-static p-3" style={{ borderLeft: '3px solid var(--color-primary)' }}>
        <p className="text-xs text-secondary">
          <strong className="text-primary">Tip:</strong> Warm colors (red, orange) tend toward Attack.
          Cool colors (blue, purple) tend toward Special Defense. Bright neon colors boost Speed.
        </p>
      </div>
    </CollapsibleSection>
  );
}

// Abilities Section - displays all 36 abilities grouped by type
function AbilitiesSection() {
  // Group abilities by type
  const abilitiesByType = COMBAT_TYPES.map((type) => ({
    type,
    abilities: ABILITIES.filter((a) => a.type === type),
  }));

  return (
    <CollapsibleSection title="Abilities" icon={<Shield size={18} />}>
      <p className="text-secondary text-sm mb-4">
        Each type has two possible abilities — one offensive (A) and one defensive (B).
        Your Wojak gets the one that matches its stat profile.
      </p>

      <div className="flex flex-col gap-3">
        {abilitiesByType.map(({ type, abilities }) => (
          <div key={type} className="flex flex-col gap-1">
            <div
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold w-fit"
              style={{
                background: `${TYPE_COLORS[type]}20`,
                color: TYPE_COLORS[type],
              }}
            >
              {type}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {abilities.map((ability) => (
                <div
                  key={ability.name}
                  className="flex flex-col p-2 rounded"
                  style={{ background: 'var(--color-white-5)' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{ability.name}</span>
                    <span
                      className="text-xs px-1 rounded"
                      style={{
                        background: ability.variant === 'A' ? 'var(--color-error-15)' : 'var(--color-cyan-15)',
                        color: ability.variant === 'A' ? 'var(--color-error)' : 'var(--color-cyan)',
                      }}
                    >
                      {ability.variant === 'A' ? 'Off' : 'Def'}
                    </span>
                  </div>
                  <p className="text-xs text-secondary mt-1">{ability.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}

// How Battles Work Section - explains battle mechanics
function HowBattlesWorkSection() {
  return (
    <CollapsibleSection title="How Battles Work" icon={<Swords size={18} />}>
      <div className="flex flex-col gap-3 text-sm text-secondary">
        <p>
          <strong className="text-primary">Turn-Based Combat</strong> — Each turn, both fighters pick a move. Moves resolve based on speed stat.
        </p>
        <p>
          <strong className="text-primary">4 Moves</strong> — Each Wojak has 3 attack moves and 1 skill move (heal, buff, debuff, status effect).
        </p>
        <p>
          <strong className="text-primary">Type Matchups</strong> — Super effective moves deal 2× damage. Not very effective moves deal ½ damage.
        </p>
        <p>
          <strong className="text-primary">Status Effects</strong> — Burns halve attack, paralysis may skip turns, sleep prevents action, poison deals chip damage.
        </p>
        <p>
          <strong className="text-primary">Critical Hits</strong> — Random 1.25× damage multiplier. Some moves have higher crit rates.
        </p>
        <p>
          <strong className="text-primary">Winner</strong> — First fighter to reach 0 HP loses. Winner gains XP, ELO, and Power.
        </p>
      </div>
    </CollapsibleSection>
  );
}

function PowerScoringSection() {
  return (
    <CollapsibleSection title="Power & Rankings" icon={<Zap size={18} />}>
      <p className="text-secondary text-sm">Coming soon...</p>
    </CollapsibleSection>
  );
}

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
