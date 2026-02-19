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

function TypeMatchupSection() {
  return (
    <CollapsibleSection title="Type Matchups" icon={<Swords size={18} />}>
      <p className="text-secondary text-sm">Coming soon...</p>
    </CollapsibleSection>
  );
}

function NaturesSection() {
  return (
    <CollapsibleSection title="Natures" icon={<Zap size={18} />}>
      <p className="text-secondary text-sm">Coming soon...</p>
    </CollapsibleSection>
  );
}

function AbilitiesSection() {
  return (
    <CollapsibleSection title="Abilities" icon={<Shield size={18} />}>
      <p className="text-secondary text-sm">Coming soon...</p>
    </CollapsibleSection>
  );
}

function HowBattlesWorkSection() {
  return (
    <CollapsibleSection title="How Battles Work" icon={<Swords size={18} />}>
      <p className="text-secondary text-sm">Coming soon...</p>
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
